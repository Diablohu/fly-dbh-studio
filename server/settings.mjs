const currentSettings = {
    autoToggleCams: true,
};

export const update = async (type, value) => {
    currentSettings[type] = value;
};

export const get = async (type) => {
    return currentSettings[type];
};
