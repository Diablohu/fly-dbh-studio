import dbg from "debug";
import { OBSWebSocket } from "obs-websocket-js";

import { retryInterval } from "../config.mjs";

// Configuration ==============================================================

const targetSceneName = "MSFS／Gaming";
export const targetOverlayGroupName = "MSFS Gaming Overlays Bottom";
const sourceNameNoHandCam = "[Overlay] MSFS";
const sourceNameWithHandCam = "[Overlay] MSFS with Control Cam";

// ============================================================================

export const debug = dbg("OBS");
export const app = new OBSWebSocket();
export const scenes = {};

// ============================================================================

const connect = async () => {
    try {
        /*const obs = */ await app.connect(
            "ws://127.0.0.1:4455",
            "okYhFKkByp1AlSqO"
        );
        debug("Connected!");

        app.connected = true;
        const { sceneItems } = await app.call("GetGroupSceneItemList", {
            sceneName: targetOverlayGroupName,
        });
        for (const scene of sceneItems) {
            switch (scene.sourceName) {
                case sourceNameNoHandCam: {
                    scenes.noHandCam = scene;
                    break;
                }
                case sourceNameWithHandCam: {
                    scenes.withHandCam = scene;
                    break;
                }
            }
        }

        app.on("ConnectionClosed", () => {
            app.connected = false;
            setTimeout(connect, retryInterval * 1000);
        });
    } catch (err) {
        debug(`Connection failed: retrying in %o seconds. %O`, retryInterval, {
            code: err.code,
            message: err.message,
        });
        // debug(`Reason: [${err.code}] ${err.message}`);
        setTimeout(connect, retryInterval * 1000);
    }
};

async function showCam(sceneObj, name) {
    // OBS WebSocket 未连接时，不执行
    if (!app.connected) return;

    // 如果当前已显示，不执行
    if (
        (
            await app?.call?.("GetSceneItemEnabled", {
                sceneName: targetOverlayGroupName,
                sceneItemId: sceneObj.sceneItemId,
            })
        )?.sceneItemEnabled
    )
        return;

    await app?.call?.("SetSceneItemEnabled", {
        sceneName: targetOverlayGroupName,
        sceneItemId: sceneObj.sceneItemId,
        sceneItemEnabled: true,
    });

    debug("Switch to %o", name);
}

export async function showHandCam() {
    return await showCam(scenes.withHandCam, "HandCam");
}

export async function showNoHandCam() {
    return await showCam(scenes.noHandCam, "NoHandCam");
}

// ============================================================================

async function main() {
    await connect();
}

export default main;
