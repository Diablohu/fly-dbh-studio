import { spawn } from "node:child_process";

process.env.NODE_ENV = "development";

const apiServer = spawn("npm.cmd", ["run", "dev:api"], {
    shell: true,
    stdio: "inherit",
});

const astroServer = spawn("npm.cmd", ["run", "dev:astro"], {
    shell: true,
    stdio: "inherit",
});
