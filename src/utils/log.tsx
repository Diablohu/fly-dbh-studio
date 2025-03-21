import dbg from "debug";

const debug = dbg("FLY-DBH Studio");
// debug.color = "#FE8DE6";

if (import.meta.env.DEV || import.meta.env.MODE === "test") {
    debug.enabled = true;
}

export default debug;
