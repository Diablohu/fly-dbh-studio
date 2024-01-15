import type {} from 'electron';

import { portTypes } from '../index.js';

/**
 * 操作用户本地存储数据
 * - 通过与主进程通信，执行 `electron-json-storage` Module 的方法
 * @param {*} method
 * @param {...any} params
 * @returns
 */
const storage = async (method, ...params) =>
    new Promise((resolve, reject) => {
        if (!binded) {
            process.parentPort.on('message', async ({ data, ports }) => {
                if (
                    typeof data === 'object' &&
                    !!data.timestamp &&
                    !!resolvers[data.timestamp]
                ) {
                    if (!!data.error) {
                        console.error(data.error);
                        rejectors[data.timestamp](data.error);
                    } else {
                        resolvers[data.timestamp](data.value);
                    }
                    delete resolvers[data.timestamp];
                    delete rejectors[data.timestamp];
                }
            });
            binded = true;
        }

        const time = Date.now();

        resolvers[time] = resolve;
        rejectors[time] = reject;

        process.parentPort.postMessage({
            type: portTypes.storage,
            method,
            params,
            timestamp: time,
        });
    });

export default storage;

// ============================================================================

let binded = false;
const resolvers: Record<number, (value: unknown) => void> = {};
const rejectors: Record<number, (reason?: Error) => void> = {};
