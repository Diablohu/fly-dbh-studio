import { spawn, fork } from "node:child_process";
import path from "node:path";
// import { EventLogger } from "node-windows";

// const log = new EventLogger("FLY-DBH Studio Server");
// log.info("Starting...");

console.log("Running on...", process.versions);

async function npmRun(cmd) {
    return new Promise((resolve, reject) => {
        const child = spawn(`npm run ${cmd}`, {
            stdio: "inherit",
            shell: true,
            cwd: path.resolve(import.meta.dirname),
        });
        child.on("close", () => {
            resolve(true);
        });
        child.on("error", (error) => {
            reject(error);
        });
        child.on("exit", (exitCode) => {
            switch (exitCode) {
                case 0:
                    return resolve(true);
                default:
                    return reject(exitCode);
            }
        });

        return child;
    });
}

try {
    npmRun("start");
    // const child = fork("./start.js", {
    //     stdio: "inherit",
    // });

    // child.on("close", () => {
    //     resolve(true);
    // });
    // child.on("error", (error) => {
    //     throw error;
    // });
    // child.on("exit", (exitCode) => {
    //     switch (exitCode) {
    //         case 0:
    //             return resolve(true);
    //         default:
    //             throw new Error(`Process exited with code ${exitCode}`);
    //     }
    // });
} catch (e) {
    console.error(e);
    // log.error(e);
    process.exit(1);
}
