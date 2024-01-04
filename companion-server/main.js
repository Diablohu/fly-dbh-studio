const fs = require('fs-extra');
const path = require('path');
const { utilityProcess } = require('electron');
const getDirDevTmp = require('koot/libs/get-dir-dev-tmp');
const sleep = require('koot/utils/sleep');

const { debug, webpackEntryName } = require('./index.js');

// ============================================================================

let resolved = false;
let companionServerProcess;

// ============================================================================

const main = async (createWindowOptions) =>
    new Promise(async (resolve, reject) => {
        if (process.env.WEBPACK_BUILD_ENV === 'dev') {
            // eslint-disable-next-line no-console
            console.log('');
        }

        const fileToWatch = path.resolve(
            getDirDevTmp('electron'),
            `${webpackEntryName}.cjs`,
        );

        const launchCompanionServer = async (type) => {
            if (process.env.WEBPACK_BUILD_ENV === 'dev') {
                switch (type) {
                    case 'update': {
                        // eslint-disable-next-line no-console
                        console.log('');
                        debug('Updated! Relaunching...');
                        break;
                    }
                    default:
                        debug('Launching...');
                }
            }

            if (companionServerProcess) {
                companionServerProcess.kill();
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
        };
        let launchCompanionServerTimeout;

        if (fs.existsSync(fileToWatch)) {
            await launchCompanionServer();
        } else {
            if (process.env.WEBPACK_BUILD_ENV === 'dev') {
                // 等待 Companion Server 进程文件生成
                debug('Waiting for building...');
                // eslint-disable-next-line no-console
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

module.exports = main;

// ============================================================================
