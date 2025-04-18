import _expressWs from "express-ws";
import dbg from "debug";

import { update as updateSetting } from "../settings.mjs";
import { setCamState } from "../obs/index.mjs";

// ============================================================================

export const debug = dbg("WebSocket");
const route = "/api/ws";
let expressWs;
// let broadcastCache = {};

// ============================================================================

async function main(app) {
    expressWs = _expressWs(app);
    expressWs.app.ws(route, (ws, req) => {
        // broadcastCache = {};
        // console.log(ws, req);
        // ws.on("open", async (...args) => {
        //     console.log("open", ...args);
        // });
        ws.on("message", async (msg) => {
            // console.log(msg);
            const message = JSON.parse(msg);
            switch (message.type) {
                case "UpdateSettings": {
                    const newSettings = message.payload;
                    for (const [key, value] of Object.entries(newSettings)) {
                        await updateSetting(key, value);
                    }
                    break;
                }
                case "ToggleCam": {
                    const { type, show } = message.payload;
                    debug("ToggleCam", type, show);
                    setCamState({
                        [type]: show,
                    });
                    break;
                }
                case "pong": {
                    break;
                }
                default: {
                    debug("Unknown inbound message: %O", message);
                }
            }
            // if (message.type === "ping") {
            //     ws.send(JSON.stringify({ type: "pong" }));
            // } else if (message.type === "disconnect") {
            //     ws.close();
            // } else {
            //     console.log("Unknown message type:", message.type);
            // }
        });
        // ws.on("close", async (...args) => {
        //     console.log("disconnected", ...args);
        // });
    });

    setInterval(() => {
        broadcast("ping");
    }, 15_000);
}

export default main;

// ============================================================================

export function getClients() {
    if (!expressWs) return undefined;
    return expressWs.getWss(route).clients;
}

export function broadcast(type, msg) {
    const clients = getClients();
    if (!clients) return;
    // console.log(clients, expressWs.getWss().clients);

    for (const client of clients) {
        broadcastToClient(client, type, msg);
    }
}
function broadcastToClient(client, type, msg) {
    if (!client.cache) client.cache = {};

    const cache = client.cache;
    const thisMessage = {
        type,
    };

    switch (type) {
        case "obs":
        case "simconnect": {
            if (!cache[type]) {
                thisMessage.data = msg;
            } else {
                const changed = {};
                for (const [key, value] of Object.entries(msg)) {
                    if (value !== cache[type][key]) changed[key] = value;
                }
                thisMessage.data = changed;
            }
            cache[type] = msg;
            break;
        }
        default: {
            thisMessage.data = msg;
        }
    }

    if (
        (typeof thisMessage.data === "object" &&
            Object.keys(thisMessage.data).length) ||
        typeof thisMessage.data !== "object"
    )
        client.send(JSON.stringify(thisMessage));
}
