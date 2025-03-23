import dbg from "debug";
import { MSFS_API, SystemEvents } from "msfs-simconnect-api-wrapper";

import { retryInterval } from "../config.mjs";
import { setCamState } from "../obs/index.mjs";

// ============================================================================

export const debug = dbg("MSFS");
export const app = new MSFS_API();
/**
 * 当前是否为暂停状态
 * - 不是动态暂停
 */
let pauseState = 0;

// ============================================================================

async function simConnect1Sec() {
    // OBS WebSocket 未连接时，不执行
    // if (!obsApp.connected) return;

    // 2020: https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Simulation_Variables.htm
    // 2024: https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Simulation_Variables.htm

    const vars = await app.get(
        "AUTOPILOT_MASTER",
        // "AUTOPILOT_DISENGAGED",
        // "PMDG_NG3_Data",
        // "PMDG_NG3_DATA_NAME",
        // "PMDG_NG3_MCP_FDSw2",
        "AIRSPEED_INDICATED",
        "GPS_GROUND_SPEED",
        "BRAKE_PARKING_POSITION", // boolean
        // "IS_SLEW_ACTIVE",
        // "IS_USER_SIM",
        "ON_ANY_RUNWAY",
        "PLANE_ALT_ABOVE_GROUND",
        "PLANE_ALT_ABOVE_GROUND_MINUS_CG",
        "SIM_ON_GROUND",
        "TITLE",
        "CAMERA_STATE"
    );

    const IS_GAMEPLAY =
        [
            2, 3,
            // 4,
            // 5,
            6, 7, 8,
            // 9, 10,
        ].includes(vars.CAMERA_STATE) && !pauseState;
    const IS_ON_GROUND =
        vars.ON_ANY_RUNWAY === 1 ||
        vars.SIM_ON_GROUND === 1 ||
        vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG < 0.5;
    const AGL = Math.min(
        vars.PLANE_ALT_ABOVE_GROUND,
        vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG
    );

    const state = {
        isGameplay: IS_GAMEPLAY,
        isOnRunway: vars.ON_ANY_RUNWAY === 1,
        isOnGround: IS_ON_GROUND,
        /** 指示空速，单位 `knot` */
        IAS: vars.AIRSPEED_INDICATED,
        /** 地速，单位 `m/s` */
        GS: vars.GPS_GROUND_SPEED,
        /** 离地高度，单位 `ft` */
        AGL: AGL,
        AP: vars.AUTOPILOT_MASTER === 1,
        ParkingBrake: [1, true].includes(vars.BRAKE_PARKING_POSITION),
        overlay: {
            control: false,
            throttle: false,
            rudder: false,
        },
    };

    if (!state.isGameplay || state.ParkingBrake) {
        state.overlay.control = false;
        state.overlay.throttle = false;
        state.overlay.rudder = false;
    } else if (state.isOnRunway) {
        if (state.GS >= 2.572 || state.IAS >= 5) {
            state.overlay.control = true;
            state.overlay.throttle = false;
            state.overlay.rudder = true;
        } else {
            state.overlay.control = true;
            state.overlay.throttle = true;
            state.overlay.rudder = false;
        }
    } else if (state.isOnGround) {
        if (state.GS >= 2.572) {
            // 5kt
            state.overlay.control = false;
            state.overlay.throttle = false;
            state.overlay.rudder = true;
        } else if (state.GS >= 1.0288) {
            // 2kt
            state.overlay.control = false;
            state.overlay.throttle = true;
            state.overlay.rudder = false;
        } else {
            state.overlay.control = false;
            state.overlay.throttle = false;
            state.overlay.rudder = false;
        }
    } else {
        // airborne
        if (state.AP || state.AGL >= 2000) {
            state.overlay.control = false;
            state.overlay.throttle = false;
            state.overlay.rudder = false;
        } else if (state.AGL >= 20) {
            state.overlay.control = true;
            state.overlay.throttle = true;
            state.overlay.rudder = false;
        } else {
            state.overlay.control = true;
            state.overlay.throttle = false;
            state.overlay.rudder = true;
        }
    }

    debug("%o", state);

    try {
        await setCamState(state.overlay);
    } catch (e) {
        console.log(e);
    }
}

async function connect() {
    let removeAppListeners = [];

    // console.log(app)
    app.connect({
        retries: Infinity,
        retryInterval,
        autoReconnect: true,
        onConnect: (handle) => {
            debug("Connected!");
            // debug("Connected!", Object.keys(SystemEvents));

            for (const r of removeAppListeners) r?.();
            removeAppListeners = [];

            // https://docs.flightsimulator.com/html/Programming_Tools/Event_IDs/Event_IDs.htm
            [
                ["1_SEC", simConnect1Sec],
                [
                    "PAUSE",
                    (state) => {
                        pauseState = state === 1;
                    },
                ],
            ].forEach(([sysEventName, eventHandler]) => {
                // 如果 `app` 实例有残存的事件，解绑
                const eventDefinition = SystemEvents[sysEventName];
                const { name: eventName } = eventDefinition;
                const { eventListeners: e } = app;
                // console.log("___", e[eventName], e[eventName]?.eventID);
                if (e[eventName]) {
                    handle.unsubscribeFromSystemEvent(e[eventName].eventID);
                    delete e[eventName];
                    debug("Removed existing event handlers.");
                }

                // 绑定事件
                removeAppListeners.push(app.on(eventDefinition, eventHandler));
            });
        },
        onRetry: (_, interval) => {
            for (const r of removeAppListeners) r?.();
            removeAppListeners = [];
            setCamState({ control: false, throttle: false, rudder: false });

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
