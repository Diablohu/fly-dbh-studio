import dbg from "debug";
import { OBSWebSocket } from "obs-websocket-js";
import { Easing } from "@tweenjs/tween.js";

import { retryInterval } from "../config.mjs";

// Configuration ==============================================================

const targetSceneName = "[Overlay] MSFS";
const sources = {
    avatar: "Video Capture: Magewell USB VSeeFace",
    cam_control: "FlightSim ControlCam Control",
    cam_throttle: "FlightSim ControlCam Throttle",
    cam_rudder: "FlightSim ControlCam Rudder",
};
const sourceObjs = Object.keys(sources).reduce((obj, key) => {
    obj[key] = undefined;
    return obj;
}, {});

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
        const { sceneItems } = await app.call("GetSceneItemList", {
            sceneName: targetSceneName,
        });
        for (const scene of sceneItems) {
            Object.entries(sources).find(([key, value]) => {
                if (value === scene.sourceName) {
                    sourceObjs[key] = scene;
                    return true;
                }
                return false;
            });
        }

        // debug(sourceObjs);

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

export async function setCamState(state) {
    // OBS WebSocket 未连接时，不执行
    if (!app.connected) return;

    await Promise.allSettled(
        Object.entries(state).map(async ([name, toEnable]) => {
            const sceneItem = sourceObjs[`cam_${name}`];
            if (!sceneItem) return;

            const isEnabled = (
                await app?.call?.("GetSceneItemEnabled", {
                    sceneName: targetSceneName,
                    sceneItemId: sceneItem.sceneItemId,
                })
            ).sceneItemEnabled;

            // debug({
            //     name,
            //     toEnable,
            //     isEnabled,
            //     // sceneName: sceneItem.sourceName
            // });

            // 如果当前状态和目标状态一致，不执行
            if (toEnable === isEnabled) return;

            await app?.call?.("SetSceneItemEnabled", {
                sceneName: targetSceneName,
                sceneItemId: sceneItem.sceneItemId,
                sceneItemEnabled: toEnable,
            });

            debug(`Scene %s changed to %s`, name, toEnable);

            // 如果更改的是“Control”摄像头，同时更改avatar的transform
            if (name === "control" && sourceObjs.avatar) {
                // const { positionY, height } = sourceObjs.avatar.sceneItemTransform;
                const fromY =
                    1440 -
                    // Math.floor(height) -
                    (!toEnable
                        ? sourceObjs.cam_control.sceneItemTransform.height - 15
                        : -1);
                const newY =
                    1440 -
                    // Math.floor(height) -
                    (toEnable
                        ? sourceObjs.cam_control.sceneItemTransform.height - 15
                        : -1);

                debug(`Avatar Y transforming from %s to %s`, fromY, newY);

                await animate(
                    fromY,
                    newY,
                    300,
                    async (currentValue) =>
                        await app?.call?.("SetSceneItemTransform", {
                            sceneName: targetSceneName,
                            sceneItemId: sourceObjs.avatar.sceneItemId,
                            sceneItemTransform: {
                                ...sourceObjs.avatar.sceneItemTransform,
                                positionY: currentValue,
                            },
                        }),
                    Easing.Linear.Out
                );
            }
        })
    );
}

async function animate(
    startVal,
    endVal,
    duration,
    onFrame = async () => {},
    tweener = Easing.Linear.None
) {
    function getCurrentValue(currentTime) {
        var delta = endVal - startVal;
        var percentComplete = currentTime / duration;
        return tweener(percentComplete) * delta + startVal;
    }

    const startTime = Date.now();
    let now = Date.now();

    while (now - startTime < duration) {
        await onFrame(getCurrentValue(now - startTime));
        now = Date.now();
    }
}

// ============================================================================

async function main() {
    await connect();
}

export default main;
