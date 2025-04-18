import {
    useEffect,
    useRef,
    useState,
    useCallback,
    type FC,
    type PropsWithChildren,
    type ChangeEventHandler,
    type MouseEventHandler,
} from "react";
import classNames from "classnames";

import { type FlightSimSettingsType, type WebSocketMessageType } from "@/types";
import { baseURL } from "@/utils/request-api";
import log from "@/utils/log";
import { appDefaults } from "@app";

import styles from "./_index.module.less";

// ============================================================================

type ObsState = {
    connected: boolean;

    cam_control: boolean;
    cam_throttle: boolean;
    cam_rudder: boolean;
};

type SimStateType = {
    connected: boolean;

    title: string;
    category: string;

    isGameplay: boolean;
    isOnGround: boolean;
    isOnRunway: boolean;

    IAS: number;
    GS: number;
    AGL: number;

    AP: boolean;
    ParkingBrake: boolean;

    overlayControl: boolean;
    overlayThrottle: boolean;
    overlayRudder: boolean;
};

// ============================================================================

const FlightSimPage = () => {
    const ClientRef = useRef<WebSocket>(null);
    const LastSettingsRef = useRef<undefined | FlightSimSettingsType>(
        undefined
    );

    const [settings, setSettings] = useState<FlightSimSettingsType>({
        ...appDefaults,
    });
    const [clientState, setClientState] = useState<
        "pending" | "closed" | "open"
    >("pending");
    const [obsState, setObsState] = useState<Partial<ObsState>>({
        connected: false,
    });
    const [simState, setSimState] = useState<Partial<SimStateType>>({
        connected: false,
    });

    const updateSettingAutoToggleScenes = useCallback<
        ChangeEventHandler<HTMLInputElement>
    >(
        (evt) => {
            setSettings((settings) => ({
                ...settings,
                autoToggleCams: evt.target.checked,
            }));
        },
        [setSettings]
    );

    const toggleCam = useCallback<MouseEventHandler<HTMLSpanElement>>((evt) => {
        if (!ClientRef.current) return;

        const camName = evt.currentTarget.dataset.cam;
        if (!camName) return;

        const currState = JSON.parse(
            evt.currentTarget.dataset.state || "false"
        ) as boolean;

        log("Toggle cam %s => %O", camName, !currState);

        ClientRef.current.send(
            JSON.stringify({
                type: "ToggleCam",
                payload: {
                    type: camName,
                    show: !currState,
                },
            })
        );
    }, []);

    useEffect(() => {
        if (typeof LastSettingsRef.current === "undefined") {
            LastSettingsRef.current = settings;
            return;
        }

        if (!ClientRef.current) return;

        const valuesChanged = Object.entries(settings).reduce<
            Partial<FlightSimSettingsType>
        >((acc, [key, value]) => {
            const lastValue = (LastSettingsRef.current ?? {})[
                key as keyof FlightSimSettingsType
            ];
            if (lastValue !== value) {
                acc[key as keyof FlightSimSettingsType] = value;
            }
            return acc;
        }, {});

        log("Changed settings %O", valuesChanged);

        ClientRef.current.send(
            JSON.stringify({
                type: "UpdateSettings",
                payload: valuesChanged,
            })
        );

        LastSettingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        log(`${baseURL}/ws`);
        const client = new WebSocket(`${baseURL}/ws`);
        ClientRef.current = client;
        log("WebSocket Client created %O", client);

        client.addEventListener("open", (ev) => {
            if (ev.type === "open") {
                log("WebSocket connection open %O", ev);
                setClientState("open");
            }
        });

        client.addEventListener("close", (ev) => {
            log("WebSocket connection cloded %O", ev);
            setClientState("closed");
        });

        client.addEventListener("error", (ev) => {
            log("WebSocket client error! %O", ev);
        });

        client.addEventListener("message", (ev) => {
            // log("WebSocket incoming message %O", ev.data);

            try {
                const data = JSON.parse(ev.data);
                switch (data.type) {
                    case "obs": {
                        setObsState((prev) => ({
                            ...prev,
                            ...(data.data as ObsState),
                        }));
                        break;
                    }
                    case "simconnect": {
                        setSimState((prev) => ({
                            ...prev,
                            ...(data.data as SimStateType),
                        }));
                        break;
                    }
                    case "ping": {
                        ClientRef.current?.send(
                            JSON.stringify({
                                type: "pong",
                            })
                        );
                        break;
                    }
                }
            } catch (e) {}
        });

        return () => {
            if (ClientRef.current) ClientRef.current.close();
        };
    }, []);

    return (
        <div className={styles["page"]}>
            <Section title="WebSocket" state={clientState}>
                <label>
                    <input
                        type="checkbox"
                        defaultChecked={settings.autoToggleCams}
                        onChange={updateSettingAutoToggleScenes}
                    />{" "}
                    Auto-change Scenes
                </label>
            </Section>
            <Section title="OBS" state={obsState.connected}>
                {[
                    [
                        "当前状态",
                        {
                            control: obsState.cam_control || false,
                            throttle: obsState.cam_throttle || false,
                            rudder: obsState.cam_rudder || false,
                        },
                    ],
                    [
                        "目标状态",
                        {
                            control: simState.overlayControl || false,
                            throttle: simState.overlayThrottle || false,
                            rudder: simState.overlayRudder || false,
                        },
                    ],
                ].map((item) => {
                    const [name, states] = item as [
                        string,
                        { control: boolean; throttle: boolean; rudder: boolean }
                    ];
                    const togglable =
                        name === "当前状态" && !settings.autoToggleCams;
                    return (
                        <dl className={styles["osb-states"]} key={name}>
                            <dt>{name}</dt>
                            <dd>
                                {[
                                    ["控制面", "control"],
                                    ["油门", "throttle"],
                                    ["脚跺", "rudder"],
                                ].map((camItem) => {
                                    const [name, camName] = camItem as [
                                        string,
                                        keyof Exclude<(typeof item)[0], string>
                                    ];
                                    return (
                                        <span
                                            className={classNames([
                                                styles["item"],
                                                {
                                                    [styles["is-active"]]:
                                                        states[camName] ===
                                                        true,
                                                    [styles["is-togglable"]]:
                                                        togglable,
                                                },
                                            ])}
                                            data-cam={camName}
                                            data-state={JSON.stringify(
                                                states[camName] === true
                                            )}
                                            onClick={
                                                togglable
                                                    ? toggleCam
                                                    : undefined
                                            }
                                            key={camName}
                                        >
                                            {name}
                                        </span>
                                    );
                                })}
                            </dd>
                        </dl>
                    );
                })}
            </Section>
            <Section title="SimConnect" state={simState.connected}>
                <div className={styles["simconnect"]}>
                    {clientState === "open" && (
                        <>
                            <section className={styles["mod-full-width"]}>
                                <SimStateItem
                                    title={simState["category"] ?? "未知类型"}
                                    value={simState["title"]}
                                />
                            </section>
                            <section>
                                <SimStateItem
                                    title="正在游戏状态"
                                    value={simState["isGameplay"]}
                                    unit="boolean"
                                />
                                <SimStateItem
                                    title="正在地面上"
                                    value={simState["isOnGround"]}
                                    unit="boolean"
                                />
                                <SimStateItem
                                    title="正在跑道上"
                                    value={simState["isOnRunway"]}
                                    unit="boolean"
                                />
                            </section>
                            <section>
                                <SimStateItem
                                    title="驻机刹车"
                                    value={simState["ParkingBrake"]}
                                    unit="switch"
                                />
                                <SimStateItem
                                    title="自动驾驶"
                                    value={simState["AP"]}
                                    unit="switch"
                                />
                            </section>
                            <section>
                                <SimStateItem
                                    title="指示空速"
                                    value={simState["IAS"]}
                                    unit="kt"
                                    decimal={0}
                                />
                                <SimStateItem
                                    title="地速"
                                    value={simState["GS"]}
                                    unit="m/s"
                                    decimal={0}
                                />
                                <SimStateItem
                                    title="离地高度"
                                    value={
                                        typeof simState["AGL"] === "number"
                                            ? Math.max(0, simState["AGL"])
                                            : undefined
                                    }
                                    unit="ft"
                                    decimal={0}
                                />
                            </section>
                        </>
                    )}
                </div>
            </Section>
        </div>
    );
};

export default FlightSimPage;

// ============================================================================

const Section: FC<
    PropsWithChildren & {
        title: string;
        state?: string | boolean;
    }
> = ({ title, state, children }) => {
    return (
        <section className={styles["section"]}>
            <h3>
                {title}
                {["string", "boolean"].includes(typeof state) && (
                    <span
                        className={classNames([
                            styles["state"],
                            {
                                [styles["is-open"]]:
                                    state === true ||
                                    (typeof state === "string" &&
                                        state?.toLowerCase() &&
                                        ["open", "ok"].includes(state)),
                                [styles["is-closed"]]:
                                    state === false ||
                                    (typeof state === "string" &&
                                        state?.toLowerCase() &&
                                        ["close", "closed"].includes(state)),
                                [styles["is-pending"]]:
                                    typeof state === "string" &&
                                    state?.toLowerCase() &&
                                    ["pending"].includes(state),
                            },
                        ])}
                    >
                        {state === true
                            ? "OPEN"
                            : state === false
                            ? "CLOSED"
                            : state?.toUpperCase()}
                    </span>
                )}
            </h3>
            <div className={styles["section-body"]}>{children}</div>
        </section>
    );
};

// ============================================================================

const SimStateItem: FC<{
    title: string;
    value: unknown;
    unit?: "boolean" | "switch" | "kt" | "ft" | "m/s";
    decimal?: number;
}> = ({ title, value, unit, decimal = 2 }) => {
    return (
        <dl
            className={classNames([
                styles["item"],
                {
                    [styles["is-not-active"]]:
                        value === false ||
                        (unit === "boolean" && !value) ||
                        (unit === "switch" && !value) ||
                        typeof value === "undefined",
                },
            ])}
        >
            <dt>{title}</dt>
            <dd>
                {unit === "boolean"
                    ? value === true
                        ? "YES"
                        : "NO"
                    : unit === "switch"
                    ? value === true
                        ? "ON"
                        : "OFF"
                    : [
                          typeof value === "number"
                              ? value.toFixed(decimal)
                              : typeof value === "undefined"
                              ? "--"
                              : value,
                          unit,
                      ].join(" ")}
            </dd>
        </dl>
    );
};
