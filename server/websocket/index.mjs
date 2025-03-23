import _expressWs from "express-ws";

// ============================================================================

const route = "/api/ws";
let expressWs;

// ============================================================================

async function main(app) {
    expressWs = _expressWs(app);
    expressWs.app.ws(route, (ws, req) => {
        // console.log(ws, req);
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
