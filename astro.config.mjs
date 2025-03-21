// @ts-check
import { defineConfig } from "astro/config";

import react from "@astrojs/react";

import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
    integrations: [react()],
    adapter: node({
        mode: "middleware",
    }),

    output: 'server',
    server: ({ command }) => ({ port: command === 'dev' ? 4322 : 4321 })
    // site: 'https://fly-dbh.com/',
});
