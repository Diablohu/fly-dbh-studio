import { apiServerPortDev } from "../../app.config.mjs";

export const baseURL = import.meta.env.DEV
    ? `http://localhost:${apiServerPortDev}/api`
    : "/api";
