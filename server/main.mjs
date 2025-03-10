import fs from "node:fs";
import path from "node:path";
import Koa from "koa";
import Static from "koa-static";
// import Router from "@koa/router";
import fileUrl from "file-url";
import { MSFS_API } from "msfs-simconnect-api-wrapper";
import debug from "debug";

// ============================================================================

const astroServerEntryFile = path.resolve(
    import.meta.dirname,
    "../dist/server/entry.mjs"
);

if (!fs.existsSync(astroServerEntryFile)) {
    throw new Error("Astro server entry not found! Run `build` command first!");
}

const astroServerModule = await import(fileUrl(astroServerEntryFile));
const app = new Koa();
// const router = new Router();

(() => {
    const simconnectDebug = debug("SimConnect");
    simconnectDebug.enabled = true;
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

// router.get("/aaa", (ctx, next) => {
//     ctx.body = "bbb";
// });
app.use(Static(path.resolve(import.meta.dirname, "../dist/client")));
app.use(astroServerModule.handler);

// app.listen(4322);
