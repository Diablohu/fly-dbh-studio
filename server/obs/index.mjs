import dbg from "debug";
import { OBSWebSocket } from "obs-websocket-js";
import { Easing } from "@tweenjs/tween.js";

import { retryInterval } from "../config.mjs";
import { broadcast } from "../websocket/index.mjs";

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
let broadcastInterval;

// ============================================================================

export const debug = dbg("OBS");
export const app = new OBSWebSocket();

// ============================================================================

const connect = async () => {
    try {
        /*const obs = */ await app.connect(
            "ws://127.0.0.1:4455",
            "okYhFKkByp1AlSqO"
        );
        debug("Connected!");

        app.connected = true;
        broadcast("obs", { connected: true });

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

        broadcastInterval = setInterval(async () => {
            try {
                const [cam_control, cam_throttle, cam_rudder] =
                    await Promise.all([
                        app?.call?.("GetSceneItemEnabled", {
                            sceneName: targetSceneName,
                            sceneItemId: sourceObjs["cam_control"].sceneItemId,
                        }),
                        app?.call?.("GetSceneItemEnabled", {
                            sceneName: targetSceneName,
                            sceneItemId: sourceObjs["cam_throttle"].sceneItemId,
                        }),
                        app?.call?.("GetSceneItemEnabled", {
                            sceneName: targetSceneName,
                            sceneItemId: sourceObjs["cam_rudder"].sceneItemId,
                        }),
                    ]);
                broadcast("obs", {
                    connected: true,
                    cam_control: cam_control.sceneItemEnabled,
                    cam_throttle: cam_throttle.sceneItemEnabled,
                    cam_rudder: cam_rudder.sceneItemEnabled,
                });
            } catch (e) {}
        }, 2_000);

        app.on("ConnectionClosed", () => {
            if (broadcastInterval) clearInterval(broadcastInterval);
            app.connected = false;
            broadcast("obs", { connected: false });
            setTimeout(connect, retryInterval * 1000);
        });
    } catch (err) {
        app.connected = false;
        broadcast("obs", { connected: false });
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
                // const camControlTransform = await app?.call?.(
                //     "GetSceneItemTransform",
                //     {
                //         sceneName: targetSceneName,
                //         sceneItemId: sourceObjs.cam_control.sceneItemId,
                //     }
                // );
                // const camControlHeight =
                //     camControlTransform.sceneItemTransform.height;
                const camControlHeight = 399;
                const avatarTransform = await app?.call?.(
                    "GetSceneItemTransform",
                    {
                        sceneName: targetSceneName,
                        sceneItemId: sourceObjs.avatar.sceneItemId,
                    }
                );
                // const { positionY, height } = sourceObjs.avatar.sceneItemTransform;
                const fromY =
                    1440 -
                    // Math.floor(height) -
                    (!toEnable ? camControlHeight - 15 : -1);
                const newY =
                    1440 -
                    // Math.floor(height) -
                    (toEnable ? camControlHeight - 15 : -1);

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
                                ...avatarTransform,
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
