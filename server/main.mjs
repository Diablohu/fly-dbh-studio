import fs from "node:fs";
import path from "node:path";
import express from "express";
import fileUrl from "file-url";
import debug from "debug";

import { port } from "./config.mjs";
import startObsServer from "./obs/index.mjs";
import startSimConnectServer from "./sim-connect/index.mjs";
import startWebSocketServer from "./websocket/index.mjs";

// Configuration ==============================================================

// ============================================================================

const astroServerEntryFile = path.resolve(
    import.meta.dirname,
    "../dist/server/entry.mjs"
);

if (!fs.existsSync(astroServerEntryFile)) {
    throw new Error("Astro server entry not found! Run `build` command first!");
}

debug.enable(
    [
        "OBS",
        "MSFS",
        "Server",
        "obs-websocket-js:*",
        "FLY-DBH Studio",
        // "node-simconnect",
    ].join(",")
);
const apiServerDebug = debug("Server");
const serverApp = express();

await startObsServer();
await startSimConnectServer();
await startWebSocketServer(serverApp);

await (async () => {
    if (process.env.NODE_ENV === "production") {
        const astroServerModule = await import(fileUrl(astroServerEntryFile));
        // Change this based on your astro.config.mjs, `base` option.
        // They should match. The default value is "/".
        const base = "/";
        serverApp.use(
            base,
            express.static(path.resolve(import.meta.dirname, "../dist/client"))
        );
        serverApp.use(astroServerModule.handler);
    }

    serverApp.listen(port, function (err) {
        if (err) apiServerDebug("Error in server setup");
        apiServerDebug("Server listening on Port %o", port);
    });
})();
