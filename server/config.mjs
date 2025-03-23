import { portProd, apiServerPortDev } from "../app.config.mjs";

export const port =
    process.env.NODE_ENV === "development" ? apiServerPortDev : portProd;
export const retryInterval = 30; // seconds
