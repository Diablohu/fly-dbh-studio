/* eslint-disable no-console */

const os = require('node:os');
const { promisify } = require('node:util');
const path = require('node:path');
const { app, BrowserWindow, ipcMain } = require('electron');
const { createWindow } = require('koot-electron');
const storage = require('electron-json-storage');
const createDebug = require('debug');

const storageKeys = require('./storage-keys');
const storageDefaults = require('./storage-defaults');
const runCompanionServer = require('./companion-server/process');

// ============================================================================

// ⚛️
const debug = createDebug('Electron Main');
debug.useColors = true;
debug.color = 6;
debug.enabled = process.env.WEBPACK_BUILD_ENV === 'dev';

// ============================================================================

// const createWindow = (options = {}) => {
//     const { width, height } = screen.getPrimaryDisplay().workAreaSize;
//     const defaults = {
//         width: Math.floor(width * 0.8),
//         height: Math.floor(height * 0.8),
//         webPreferences: {
//             nodeIntegration: true,
//         },
//     };

//     // Create the browser window.
//     const mainWindow = new BrowserWindow({ ...defaults, ...options });

//     // Open the DevTools.
//     if (process.env.WEBPACK_BUILD_ENV === 'dev') {
//         if (typeof __SERVER_PORT__ !== 'undefined') {
//             mainWindow.loadURL(
//                 `http://localhost:${
//                     process.env.SERVER_PORT || __SERVER_PORT__
//                 }`,
//             );
//             mainWindow.webContents.openDevTools();
//         }
//     } else {
//         mainWindow.loadFile('index.html');
//     }

//     return mainWindow;
// };

// ============================================================================

const main = async (createWindowOptions = {}) => {
    console.log('');

    // 确定用户数据存储路径
    debug('Setting storage path to "userData"...');
    storage.setDataPath(path.resolve(app.getPath('userData'), 'settings'));

    debug('Preparing storage defaults...');
    await Promise.all(
        Object.entries(storageDefaults).map(
            ([key, value]) =>
                new Promise((resolve, reject) => {
                    storage.has(key, (error, hasKey) => {
                        if (error) return reject(error);
                        if (!hasKey) {
                            storage.set(key, value, (error) => {
                                if (error) return reject(error);
                                resolve();
                            });
                        } else {
                            resolve();
                        }
                    });
                }),
        ),
    );

    // 启动 Companion Server
    // 相关信息详见 `/companion-server/README.md`
    debug('Launching Companion Server...');
    await runCompanionServer(app, createWindowOptions);

    // 启动 Renderer
    function doCreateWindow() {
        console.log('');
        debug('Launching Renderer...');
        createWindow(createWindowOptions);
    }

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(() => {
        ['getDefaultDataPath', 'setDataPath', 'getDataPath', 'getSync'].forEach(
            (key) => {
                ipcMain.handle(`storage:${key}`, (...args) =>
                    storage[key](...args),
                );
            },
        );
        [
            'get',
            'getMany',
            'getAll',
            'set',
            'has',
            'keys',
            'remove',
            'clear',
        ].forEach((key) => {
            ipcMain.handle(
                `storage:${key}`,
                async (...args) => await promisify(storage[key])(...args),
            );
        });

        doCreateWindow();

        app.on('activate', function () {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) doCreateWindow();
        });
    });

    // Quit when all windows are closed.
    app.on('window-all-closed', function () {
        debug('window-all-closed');
        // On macOS it is common for applications and their menu bar
        // to stay active until the user quits explicitly with Cmd + Q
        if (process.platform !== 'darwin') app.quit();
    });

    // TODO: Main 进程监控 Renderer 进程，在开发环境中，如果 Renderer 进程退出，自动重启

    app.on('child-process-gone', () => {
        console.log('child-process-gone');
        // if (process.env.WEBPACK_BUILD_ENV === 'dev') {
        //     debug('Companion Server process gone');
        // }
    });
    app.on('render-process-gone', () => {
        debug('render-process-gone');
        // if (process.env.WEBPACK_BUILD_ENV === 'dev') {
        //     debug('Companion Server process gone');
        // }
    });
};

main({
    webPreferences: {
        preload: path.join(app.getAppPath(), 'preload.js'),
        // nodeIntegration: true,
        // contextIsolation: false,
    },
});
