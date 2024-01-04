const { contextBridge, ipcRenderer } = require('electron/renderer');

const globals = {
    global: {},
    electronAPI: {
        setTitle: (title) => ipcRenderer.send('set-title', title),
    },
    electronStorage: [
        'getDefaultDataPath',
        'setDataPath',
        'getDataPath',
        'get',
        'getSync',
        'getMany',
        'getAll',
        'set',
        'has',
        'keys',
        'remove',
        'clear',
    ].reduce((result, key) => {
        result[key] = (...args) =>
            ipcRenderer.invoke(`storage:${key}`, ...args);
        return result;
    }, {}),
};

// custom storage calls: get, set, remove, getAll

Object.entries(globals).forEach(([key, value]) => {
    contextBridge.exposeInMainWorld(key, value);
});
