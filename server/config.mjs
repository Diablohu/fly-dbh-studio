import { portProd, apiServerPortDev } from "../app.config.mjs";

export const port =
    process.env.NODE_ENV === "production" ? portProd : apiServerPortDev;
export const retryInterval = 30; // seconds
