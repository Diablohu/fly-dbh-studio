import dbg from "debug";
import { MSFS_API, SystemEvents } from "msfs-simconnect-api-wrapper";

import { retryInterval } from "../config.mjs";
import { get as getSetting } from "../settings.mjs";
import { setCamState } from "../obs/index.mjs";
import { broadcast } from "../websocket/index.mjs";

// ============================================================================

export const debug = dbg("MSFS");
export const app = new MSFS_API();
/**
 * 当前是否为暂停状态
 * - 不是动态暂停
 */
let pauseState = 0;
let connected = false;
let lastSimState = {};
let lastOverlayState = {};

// ============================================================================

async function simConnect1Sec() {
    // OBS WebSocket 未连接时，不执行
    // if (!obsApp.connected) return;

    // 2020: https://docs.flightsimulator.com/html/Programming_Tools/SimVars/Simulation_Variables.htm
    // 2024: https://docs.flightsimulator.com/msfs2024/html/6_Programming_APIs/SimVars/Simulation_Variables.htm

    const vars = await app.get(
        "TITLE",
        "CATEGORY", // Airplane, Helicopter, Boat, GroundVehicle, ControlTower, SimpleObject, Viewer
        "CONTROLLABLE",

        "CAMERA_STATE",
        "SIM_ON_GROUND",
        "ON_ANY_RUNWAY",

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
        "PLANE_ALT_ABOVE_GROUND",
        "PLANE_ALT_ABOVE_GROUND_MINUS_CG"
    );

    const IS_GAMEPLAY =
        [
            2, 3,
            // 4,
            // 5,
            6, 7, 8,
            // 9, 10,
        ].includes(vars.CAMERA_STATE) && !pauseState;

    const simState = {
        connected,

        isGameplay: IS_GAMEPLAY,
        isOnRunway: vars.ON_ANY_RUNWAY === 1,
        isOnGround:
            vars.ON_ANY_RUNWAY === 1 ||
            vars.SIM_ON_GROUND === 1 ||
            vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG < 0.5,

        /** 指示空速，单位 `knot` */
        IAS: vars.AIRSPEED_INDICATED,
        /** 地速，单位 `m/s` */
        GS: vars.GPS_GROUND_SPEED,
        /** 离地高度，单位 `ft` */
        AGL: Math.min(
            vars.PLANE_ALT_ABOVE_GROUND,
            vars.PLANE_ALT_ABOVE_GROUND_MINUS_CG
        ),

        AP: vars.AUTOPILOT_MASTER === 1,
        ParkingBrake: [1, true].includes(vars.BRAKE_PARKING_POSITION),
    };
    const overlayState = {
        control: false,
        throttle: false,
        rudder: false,
    };
    const overlayStateChanged = {};

    if (!simState.isGameplay || simState.ParkingBrake) {
        overlayState.control = false;
        overlayState.throttle = false;
        overlayState.rudder = false;
    } else if (simState.isOnRunway) {
        overlayState.control = true;
        // 5 knots = 2.572 m/s
        if (simState.GS >= 2.572) {
            overlayState.throttle = false;
            overlayState.rudder = true;
        } else {
            overlayState.throttle = true;
            overlayState.rudder = false;
        }
    } else if (simState.isOnGround) {
        // 30 knots = 15.432 m/s
        // 5 knots = 2.572 m/s
        // 2 knots = 1.0288 m/s
        if (simState.GS >= 15.432) {
            overlayState.control = true;
            overlayState.throttle = false;
            overlayState.rudder = true;
        } else if (simState.GS >= 2.572) {
            // 5kt
            overlayState.control = false;
            overlayState.throttle = false;
            overlayState.rudder = true;
        } else if (simState.GS >= 1.0288) {
            // 2kt
            overlayState.control = false;
            overlayState.throttle = true;
            overlayState.rudder = false;
        } else {
            overlayState.control = false;
            overlayState.throttle = false;
            overlayState.rudder = false;
        }
    } else {
        // airborne
        if (simState.AP || simState.AGL >= 2000) {
            overlayState.control = false;
            overlayState.throttle = false;
            overlayState.rudder = false;
        } else if (simState.AGL >= 20) {
            overlayState.control = true;
            overlayState.throttle = true;
            overlayState.rudder = false;
        } else {
            overlayState.control = true;
            overlayState.throttle = false;
            overlayState.rudder = true;
        }
    }

    debug("%o", {
        TITLE: vars.TITLE,
        CATEGORY: vars.CATEGORY,
        CONTROLLABLE: vars.CONTROLLABLE,
    });

    for (const [key, value] of Object.entries(overlayState)) {
        if (value !== lastOverlayState[key]) overlayStateChanged[key] = value;
    }

    lastSimState = simState;
    lastOverlayState = overlayState;

    try {
        broadcast("simconnect", { ...simState, overlay: overlayState });
        if (await getSetting("autoToggleCams")) {
            // debug("autoToggleCams", await getSetting("autoToggleCams"));
            await setCamState(overlayStateChanged);
        }
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

            connected = true;
        },
        onRetry: (_, interval) => {
            connected = false;
            broadcast("simconnect", { connected });

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
