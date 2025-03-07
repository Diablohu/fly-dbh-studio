import { Service } from "node-windows";

// Create a new service object
const svc = new Service({
    name: "FLY-DBH Studio Server",
    description: "FLY-DBH Studio Server.",
    script: "./start.js",
    //, workingDirectory: '...'
    //, allowServiceLogon: true
});

// Listen for the "install" event, which indicates the
// process is available as a service.
svc.on("install", function () {
    svc.start();
});

svc.install();
