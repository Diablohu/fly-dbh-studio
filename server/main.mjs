import fs from "node:fs";
import path from "node:path";
import express from "express";
import fileUrl from "file-url";
import debug from "debug";
import { MSFS_API } from "msfs-simconnect-api-wrapper";
import { OBSWebSocket } from "obs-websocket-js";

// Configuration ==============================================================

const port = 4321;
const retryInterval = 60; // seconds

// ============================================================================

const astroServerEntryFile = path.resolve(
    import.meta.dirname,
    "../dist/server/entry.mjs"
);

if (!fs.existsSync(astroServerEntryFile)) {
    throw new Error("Astro server entry not found! Run `build` command first!");
}

debug.enable(["OBS", "MSFS", "AstroServer", "obs-websocket-js:*"].join(","));
const obsDebug = debug("OBS");
const msfsDebug = debug("MSFS");
const astroServerDebug = debug("AstroServer");

const obsApp = new OBSWebSocket();
const msfsApp = new MSFS_API();
const serverApp = express();

await (async () => {
    const connect = async () => {
        try {
            const obs = await obsApp.connect(
                "ws://192.168.0.4:4455",
                "password",
                {
                    rpcVersion: 1,
                }
            );
            obsDebug("Connected!", obs);
        } catch (err) {
            obsDebug(
                `Connection failed: retrying in %o seconds. %O`,
                retryInterval,
                {
                    code: err.code,
                    message: err.message,
                }
            );
            // obsDebug(`Reason: [${err.code}] ${err.message}`);
            setTimeout(connect, retryInterval * 1000);
        }
    };
    connect();
})();

await (async () => {
    msfsApp.connect({
        retries: Infinity,
        retryInterval,
        onConnect: (...args) => {
            msfsDebug("Connected!", ...args);
        },
        onRetry: (_, interval) => {
            msfsDebug(`Connection failed: retrying in %o seconds.`, interval);
        },
    });
})();

await (async () => {
    const astroServerModule = await import(fileUrl(astroServerEntryFile));
    // Change this based on your astro.config.mjs, `base` option.
    // They should match. The default value is "/".
    const base = "/";
    serverApp.use(
        base,
        express.static(path.resolve(import.meta.dirname, "../dist/client"))
    );
    serverApp.use(astroServerModule.handler);

    serverApp.listen(port, function (err) {
        if (err) astroServerDebug("Error in server setup");
        astroServerDebug("Server listening on Port %o", port);
    });
})();
