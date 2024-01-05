/* eslint-disable no-console */

const fs = require('fs-extra');
const path = require('path');
const { promisify } = require('util');
const { utilityProcess } = require('electron');
const storage = require('electron-json-storage');
const { getElectronFilesFolder } = require('koot-electron');
const sleep = require('koot/utils/sleep');

const { debug, webpackEntryName, portTypes } = require('./index.js');

// ============================================================================

let resolved = false;
let companionServerProcess;

// ============================================================================

const runCompanionServer = async (createWindowOptions) =>
    new Promise(async (resolve, reject) => {
        if (process.env.WEBPACK_BUILD_ENV === 'dev') {
            console.log('');
        }

        // TODO: Main 进程监控 Companion Server 进程，如果 Companion Server 进程退出，自动重启

        const fileToWatch = path.resolve(
            getElectronFilesFolder(),
            `${webpackEntryName}.cjs`,
        );

        const launchCompanionServer = async (type) => {
            if (process.env.WEBPACK_BUILD_ENV === 'dev') {
                switch (type) {
                    case 'update': {
                        console.log('');
                        debug('Updated! Relaunching...');
                        break;
                    }
                    default:
                        debug('Launching...');
                }
            }

            if (companionServerProcess) {
                try {
                    companionServerProcess.kill();
                } catch (e) {}
                await sleep(1000);
            }

            companionServerProcess = utilityProcess.fork(fileToWatch, {
                stdio: 'inherit',
                serviceName: 'fly-dbh-studio-companion-server',
            });
            companionServerProcess.on('exit', () => {
                companionServerProcess = undefined;
            });
            companionServerProcess.on('spawn', async () => {
                if (!resolved) {
                    resolved = true;
                    await sleep(1000);
                    resolve();
                }
            });
            companionServerProcess.on('message', async (msg) => {
                if (typeof msg === 'object' && !!msg.type) {
                    switch (msg.type) {
                        // `electron-json-storage` 相关操作
                        case portTypes.storage: {
                            try {
                                const { method, params, timestamp } = msg;
                                const value = await promisify(storage[method])(
                                    ...params,
                                );
                                companionServerProcess.postMessage({
                                    value,
                                    timestamp,
                                });
                            } catch (error) {
                                companionServerProcess.postMessage({
                                    error,
                                    timestamp: msg.timestamp,
                                });
                            }
                            break;
                        }
                        default: {
                        }
                    }
                }
            });
        };
        let launchCompanionServerTimeout;

        if (fs.existsSync(fileToWatch)) {
            await launchCompanionServer();
        } else {
            if (process.env.WEBPACK_BUILD_ENV === 'dev') {
                // 等待 Companion Server 进程文件生成
                debug('Waiting for building...');
                console.log('');
            }
        }

        fs.watchFile(fileToWatch, { interval: 1000 }, async (curr, prev) => {
            // console.log(curr, prev);
            if (!fs.existsSync(fileToWatch) || !curr.size) return;
            clearTimeout(launchCompanionServerTimeout);
            launchCompanionServerTimeout = setTimeout(
                () => launchCompanionServer(!prev.size ? '' : 'update'),
                100,
            );
        });
    });

module.exports = runCompanionServer;

// ============================================================================
