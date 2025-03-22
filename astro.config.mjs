// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import node from "@astrojs/node";

import { portProd, astroServerDev } from "./app.config.mjs";

// https://astro.build/config
export default defineConfig({
    integrations: [react()],
    adapter: node({
        mode: "middleware",
    }),

    output: "server",
    server: ({ command }) => ({
        port: command === "dev" ? astroServerDev : portProd,
    }),
    // site: 'https://fly-dbh.com/',
});
