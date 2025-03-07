import { exec } from "node:child_process";

exec("npx --yes http-server ./dist -p 4321");
// exec("npm run start");
