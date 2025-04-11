import { appDefaults } from "../app.config.mjs";

const currentSettings = {
    ...appDefaults,
};

export const update = async (type, value) => {
    currentSettings[type] = value;
};

export const get = async (type) => {
    return currentSettings[type];
};
