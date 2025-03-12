import dbg from "debug";
import { MSFS_API, SystemEvents } from "msfs-simconnect-api-wrapper";

import { retryInterval } from "../config.mjs";
import {
    // app as obsApp,
    showHandCam as obsShowHandCam,
    showNoHandCam as obsShowNoHandCam,
} from "../obs/index.mjs";

// ============================================================================

/*
TODO: 脚舵 <-> 油门
    条件：地面：脚舵？
*/

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
// const varsToWatch = [
//     "AUTOPILOT_MASTER",
//     "GPS_GROUND_SPEED",
//     "IS_SLEW_ACTIVE",
//     "ON_ANY_RUNWAY",
//     // "PLANE_ALT_ABOVE_GROUND",
//     "PLANE_ALT_ABOVE_GROUND_MINUS_CG",
//     "SIM_ON_GROUND",
// ];

// ============================================================================

async function simConnect1Sec(...args) {
    // OBS WebSocket 未连接时，不执行
    // if (!obsApp.connected) return;

    // 2020: https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Simulation_Variables.htm
    // 2024: https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Simulation_Variables.htm

    const vars = await app.get(
        "AUTOPILOT_MASTER",
        "GPS_GROUND_SPEED",
        "IS_SLEW_ACTIVE",
        // "IS_USER_SIM",
        "ON_ANY_RUNWAY",
        // "PLANE_ALT_ABOVE_GROUND",
        "PLANE_ALT_ABOVE_GROUND_MINUS_CG",
        "SIM_ON_GROUND",
        "TITLE",
        "CAMERA_STATE"
    );

    const IS_GAMEPLAY = [
        2, 3,
        // 4,
        // 5,
        6, 7, 8,
        // 9, 10,
    ].includes(vars.CAMERA_STATE);
    const IS_ON_GROUND =
        vars.ON_ANY_RUNWAY === 1 ||
        vars.SIM_ON_GROUND === 1 ||
        vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG < 0.5;

    debug("%o", { ...vars, IS_GAMEPLAY, IS_ON_GROUND });

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
            IS_GAMEPLAY &&
            !vars.IS_SLEW_ACTIVE &&
            ((vars.ON_ANY_RUNWAY === 1 && vars.GPS_GROUND_SPEED > 1) ||
                (IS_ON_GROUND && vars.GPS_GROUND_SPEED > 15) ||
                (!IS_ON_GROUND && vars.AUTOPILOT_MASTER === 0))
        ) {
            await obsShowHandCam();
        } else {
            await obsShowNoHandCam();
        }
    } catch (e) {
        console.log(e);
    }
}

async function connect() {
    let removeAppListener;

    // console.log(app)
    app.connect({
        retries: Infinity,
        retryInterval,
        autoReconnect: true,
        onConnect: (handle) => {
            debug("Connected!");
            // debug("Connected!", Object.keys(SystemEvents));

            removeAppListener?.();

            // 如果 `app` 实例有残存的事件，解绑
            const eventDefinition = SystemEvents["1_SEC"];
            const { name: eventName } = eventDefinition;
            const { eventListeners: e } = app;
            // console.log("___", e[eventName], e[eventName]?.eventID);
            if (e[eventName]) {
                handle.unsubscribeFromSystemEvent(e[eventName].eventID);
                delete e[eventName];
                debug("Removed existing event handlers.");
            }

            // https://docs.flightsimulator.com/html/Programming_Tools/Event_IDs/Event_IDs.htm
            removeAppListener = app.on(eventDefinition, simConnect1Sec);
            // console.log(removeAppListener);
        },
        onRetry: (_, interval) => {
            removeAppListener?.();
            obsShowNoHandCam();

            debug(`Connection failed: retrying in %o seconds.`, interval);
        },
        // onException: (err) => {
        //     removeAppListener?.();
        //     debug(`Error! %o`, err);
        // },
    });
}

// ============================================================================

async function main() {
    await connect();
}

export default main;
