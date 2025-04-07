import _expressWs from "express-ws";
import dbg from "debug";

import { update as updateSetting } from "../settings.mjs";
import { setCamState } from "../obs/index.mjs";

// ============================================================================

export const debug = dbg("WebSocket");
const route = "/api/ws";
let expressWs;

// ============================================================================

async function main(app) {
    expressWs = _expressWs(app);
    expressWs.app.ws(route, (ws, req) => {
        // console.log(ws, req);
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
    });

    setInterval(() => {
        broadcast("ping");
    }, 1000);
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
    const thisMessage = {
        type,
        data: msg,
    };
    for (const client of clients) {
        client.send(JSON.stringify(thisMessage));
    }
}
