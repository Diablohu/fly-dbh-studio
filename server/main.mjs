import fs from "node:fs";
import path from "node:path";
import express from "express";
import fileUrl from "file-url";
import { MSFS_API } from "msfs-simconnect-api-wrapper";
import debug from "debug";

// Configuration ==============================================================

const port = 4321;

// ============================================================================

const astroServerEntryFile = path.resolve(
    import.meta.dirname,
    "../dist/server/entry.mjs"
);

if (!fs.existsSync(astroServerEntryFile)) {
    throw new Error("Astro server entry not found! Run `build` command first!");
}

debug.enable("*");
const simconnectDebug = debug("SimConnect");
const astroServerDebug = debug("AstroServer");

(() => {
    const api = new MSFS_API();
    api.connect({
        retries: Infinity,
        retryInterval: 5,
        onConnect: (...args) => {
            simconnectDebug("Connected!", ...args);
        },
        onRetry: (_, interval) => {
            simconnectDebug(
                `Connection failed: retrying in ${interval} seconds.`
            );
        },
    });
})();

const astroServerModule = await import(fileUrl(astroServerEntryFile));
const app = express();
// Change this based on your astro.config.mjs, `base` option.
// They should match. The default value is "/".
const base = "/";
app.use(
    base,
    express.static(path.resolve(import.meta.dirname, "../dist/client"))
);
app.use(astroServerModule.handler);

app.listen(port, function (err) {
    if (err) astroServerDebug("Error in server setup");
    astroServerDebug("Server listening on Port", port);
});
