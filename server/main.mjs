import fs from "node:fs";
import path from "node:path";
import express from "express";
import fileUrl from "file-url";
import debug from "debug";
import { MSFS_API, SystemEvents } from "msfs-simconnect-api-wrapper";
import { OBSWebSocket } from "obs-websocket-js";

// Configuration ==============================================================

const port = 4321;
const retryInterval = 30; // seconds
const obsSceneName = "MSFS／Gaming";
const obsOverlayGroupName = "MSFS Gaming Overlays Bottom";
const obsOverlayNameNoHandCam = "[Overlay] MSFS";
const obsOverlayNameWithHandCam = "[Overlay] MSFS with Control Cam";
const obsScenes = {};

// ============================================================================

const astroServerEntryFile = path.resolve(
    import.meta.dirname,
    "../dist/server/entry.mjs"
);

if (!fs.existsSync(astroServerEntryFile)) {
    throw new Error("Astro server entry not found! Run `build` command first!");
}

debug.enable(
    [
        "OBS",
        "MSFS",
        "AstroServer",
        "obs-websocket-js:*",
        // "node-simconnect",
    ].join(",")
);
const obsDebug = debug("OBS");
const msfsDebug = debug("MSFS");
const astroServerDebug = debug("AstroServer");

const obsApp = new OBSWebSocket();
const msfsApp = new MSFS_API();
const serverApp = express();

await (async () => {
    const connect = async () => {
        try {
            const obs = await obsApp.connect(
                "ws://127.0.0.1:4455",
                "okYhFKkByp1AlSqO"
            );
            obsDebug("Connected!");

            obsApp.connected = true;
            const { sceneItems } = await obsApp.call("GetGroupSceneItemList", {
                sceneName: obsOverlayGroupName,
            });
            for (const scene of sceneItems) {
                switch (scene.sourceName) {
                    case obsOverlayNameNoHandCam: {
                        obsScenes.noHandCam = scene;
                        break;
                    }
                    case obsOverlayNameWithHandCam: {
                        obsScenes.withHandCam = scene;
                        break;
                    }
                }
            }

            obsApp.on("ConnectionClosed", () => {
                obsApp.connected = false;
                setTimeout(connect, retryInterval * 1000);
            });
        } catch (err) {
            obsDebug(
                `Connection failed: retrying in %o seconds. %O`,
                retryInterval,
                {
                    code: err.code,
                    message: err.message,
                }
            );
            // obsDebug(`Reason: [${err.code}] ${err.message}`);
            setTimeout(connect, retryInterval * 1000);
        }
    };
    connect();
})();

await (async () => {
    async function simConnect1Sec() {
        // OBS WebSocket 未连接时，不执行
        if (!obsApp.connected) return;

        // https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Simulation_Variables.htm
        // IS_SLEW_ACTIVE // 0 | 1
        // ON_ANY_RUNWAY // 0 | 1
        // SIM_ON_GROUND // 0 | 1
        // AUTOPILOT_MASTER // 0 | 1
        // GPS_GROUND_SPEED // Meters/Sec
        // PLANE_ALT_ABOVE_GROUND // ft
        // PLANE_ALT_ABOVE_GROUND_MINUS_CG // ft
        const vars = await msfsApp.get(
            "AUTOPILOT_MASTER",
            "GPS_GROUND_SPEED",
            "IS_SLEW_ACTIVE",
            "ON_ANY_RUNWAY",
            // "PLANE_ALT_ABOVE_GROUND",
            "PLANE_ALT_ABOVE_GROUND_MINUS_CG",
            "SIM_ON_GROUND"
        );
        const IS_ON_GROUND =
            vars.ON_ANY_RUNWAY === 1 ||
            vars.SIM_ON_GROUND === 1 ||
            vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG < 0.5;

        // msfsDebug("%o", { ...vars, IS_ON_GROUND });

        try {
            // console.log(
            //     { obsScenes },
            //     await obsApp.call("GetSceneItemEnabled", {
            //         sceneName: obsOverlayGroupName,
            //         sceneItemId: obsScenes.withHandCam.sceneItemId,
            //     })
            // );
            // await obsApp.call("SetSceneItemEnabled", {
            //     sceneName: obsOverlayGroupName,
            //     sceneItemId: obsScenes.withHandCam.sceneItemId,
            //     sceneItemEnabled: true,
            // });
            if (
                !vars.IS_SLEW_ACTIVE &&
                ((vars.ON_ANY_RUNWAY === 1 && vars.GPS_GROUND_SPEED > 1) ||
                    (IS_ON_GROUND && vars.GPS_GROUND_SPEED > 15) ||
                    (!IS_ON_GROUND && vars.AUTOPILOT_MASTER === 0))
            ) {
                await obsApp.call("SetSceneItemEnabled", {
                    sceneName: obsOverlayGroupName,
                    sceneItemId: obsScenes.withHandCam.sceneItemId,
                    sceneItemEnabled: true,
                });
            } else {
                await obsApp.call("SetSceneItemEnabled", {
                    sceneName: obsOverlayGroupName,
                    sceneItemId: obsScenes.noHandCam.sceneItemId,
                    sceneItemEnabled: true,
                });
            }
        } catch (e) {
            console.log(e);
        }
    }

    msfsApp.connect({
        retries: Infinity,
        retryInterval,
        onConnect: (...args) => {
            // msfsDebug("Connected!", Object.keys(SystemEvents));
            // https://docs.flightsimulator.com/html/Programming_Tools/Event_IDs/Event_IDs.htm
            msfsApp.on(SystemEvents["1_SEC"], simConnect1Sec);
        },
        onRetry: (_, interval) => {
            msfsDebug(`Connection failed: retrying in %o seconds.`, interval);
        },
    });
})();

await (async () => {
    const astroServerModule = await import(fileUrl(astroServerEntryFile));
    // Change this based on your astro.config.mjs, `base` option.
    // They should match. The default value is "/".
    const base = "/";
    serverApp.use(
        base,
        express.static(path.resolve(import.meta.dirname, "../dist/client"))
    );
    serverApp.use(astroServerModule.handler);

    serverApp.listen(port, function (err) {
        if (err) astroServerDebug("Error in server setup");
        astroServerDebug("Server listening on Port %o", port);
    });
})();
