import {
    useEffect,
    useRef,
    useState,
    type FC,
    type PropsWithChildren,
} from "react";
import classNames from "classnames";

import { baseURL } from "@/utils/request-api";
import log from "@/utils/log";

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

    isGameplay: boolean;
    isOnGround: boolean;
    isOnRunway: boolean;

    AP: boolean;
    ParkingBrake: boolean;

    IAS: number;
    GS: number;
    AGL: number;

    overlay: {
        control: boolean;
        throttle: boolean;
        rudder: boolean;
    };
};

// ============================================================================

const FlightSimPage = () => {
    const ClientRef = useRef<WebSocket>(null);

    const [clientState, setClientState] = useState<
        "pending" | "closed" | "open"
    >("pending");
    const [obsState, setObsState] = useState<Partial<ObsState>>({
        connected: false,
    });
    const [simState, setSimState] = useState<Partial<SimStateType>>({
        connected: false,
    });

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
                        setObsState(data.data as ObsState);
                        break;
                    }
                    case "simconnect": {
                        setSimState(data.data as SimStateType);
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
            <Section title="WebSocket" state={clientState} />
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
                            control: simState.overlay?.control || false,
                            throttle: simState.overlay?.throttle || false,
                            rudder: simState.overlay?.rudder || false,
                        },
                    ],
                ].map((item) => {
                    const [name, states] = item as [
                        string,
                        { control: boolean; throttle: boolean; rudder: boolean }
                    ];
                    return (
                        <dl className={styles["osb-states"]} key={name}>
                            <dt>{name}</dt>
                            <dd>
                                {[
                                    ["控制面", states.control],
                                    ["油门", states.throttle],
                                    ["脚跺", states.rudder],
                                ].map((item) => {
                                    const [name, state] = item as [
                                        string,
                                        boolean
                                    ];
                                    return (
                                        <span
                                            className={classNames([
                                                styles["item"],
                                                {
                                                    [styles["is-active"]]:
                                                        state === true,
                                                },
                                            ])}
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
                                    unit="knot"
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
                                    value={simState["AGL"]}
                                    unit="feet"
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
    unit: "boolean" | "switch" | "knot" | "feet" | "m/s";
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
                    : `${
                          typeof value === "number"
                              ? value.toFixed(decimal)
                              : typeof value === "undefined"
                              ? "--"
                              : value
                      } ${unit}`}
            </dd>
        </dl>
    );
};
