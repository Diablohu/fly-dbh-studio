import dbg from "debug";
import { MSFS_API, SystemEvents } from "msfs-simconnect-api-wrapper";

import { retryInterval } from "../config.mjs";
import {
    app as obsApp,
    targetOverlayGroupName as obsTargetOverlayGroupName,
    scenes as obsScenes,
} from "../obs/index.mjs";

// ============================================================================

export const debug = dbg("MSFS");
export const app = new MSFS_API();
const states = {
    // IS_SLEW_ACTIVE // 0 | 1
    // ON_ANY_RUNWAY // 0 | 1
    // SIM_ON_GROUND // 0 | 1
    // AUTOPILOT_MASTER // 0 | 1
    // GPS_GROUND_SPEED // Meters/Sec
    // PLANE_ALT_ABOVE_GROUND // ft
    // PLANE_ALT_ABOVE_GROUND_MINUS_CG // ft
};
const varsToWatch = [
    "AUTOPILOT_MASTER",
    "GPS_GROUND_SPEED",
    "IS_SLEW_ACTIVE",
    "ON_ANY_RUNWAY",
    // "PLANE_ALT_ABOVE_GROUND",
    "PLANE_ALT_ABOVE_GROUND_MINUS_CG",
    "SIM_ON_GROUND",
];

// ============================================================================

async function simConnect1Sec() {
    // OBS WebSocket 未连接时，不执行
    if (!obsApp.connected) return;

    // https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Simulation_Variables.htm

    const vars = await app.get(
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

    // debug("%o", { ...vars, IS_ON_GROUND });

    try {
        // console.log(
        //     { obsScenes },
        //     await obsApp.call("GetSceneItemEnabled", {
        //         sceneName: obsTargetOverlayGroupName,
        //         sceneItemId: obsScenes.withHandCam.sceneItemId,
        //     })
        // );
        // await obsApp.call("SetSceneItemEnabled", {
        //     sceneName: obsTargetOverlayGroupName,
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
                sceneName: obsTargetOverlayGroupName,
                sceneItemId: obsScenes.withHandCam.sceneItemId,
                sceneItemEnabled: true,
            });
        } else {
            await obsApp.call("SetSceneItemEnabled", {
                sceneName: obsTargetOverlayGroupName,
                sceneItemId: obsScenes.noHandCam.sceneItemId,
                sceneItemEnabled: true,
            });
        }
    } catch (e) {
        console.log(e);
    }
}

async function connect() {
    app.connect({
        retries: Infinity,
        retryInterval,
        onConnect: (...args) => {
            // debug("Connected!", Object.keys(SystemEvents));
            // https://docs.flightsimulator.com/html/Programming_Tools/Event_IDs/Event_IDs.htm
            app.on(SystemEvents["1_SEC"], simConnect1Sec);
            app.addEventListener("AP_MASTER", (...args) => {
                console.log("AP_MASTER FIRED!", ...args);
            });
        },
        onRetry: (_, interval) => {
            debug(`Connection failed: retrying in %o seconds.`, interval);
        },
    });
}

// ============================================================================

async function main() {
    await connect();
}

export default main;
