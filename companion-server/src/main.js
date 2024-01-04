const { debug, portTypes } = require('../index.js');

// ============================================================================

/**
 * 操作用户本地存储数据
 * - 通过与主进程通信，执行 `electron-json-storage` Module 的方法
 * @param {*} method
 * @param {...any} params
 * @returns
 */
const storage = async (method, ...params) =>
    new Promise((resolve, reject) => {
        if (!storage.__BIND_PORT_MESSAGE__) {
            process.parentPort.on('message', async ({ data, ports }) => {
                if (
                    typeof data === 'object' &&
                    !!data.timestamp &&
                    !!storage.resolvers[data.timestamp]
                ) {
                    if (!!data.error) {
                        console.error(data.error);
                        storage.rejectors[data.timestamp](data.error);
                    } else {
                        storage.resolvers[data.timestamp](data.value);
                    }
                    delete storage.resolvers[data.timestamp];
                    delete storage.rejectors[data.timestamp];
                }
            });
            storage.__BIND_PORT_MESSAGE__ = true;
        }

        const time = Date.now();

        storage.resolvers[time] = resolve;
        storage.rejectors[time] = reject;

        process.parentPort.postMessage({
            type: portTypes.storage,
            method,
            params,
            timestamp: time,
        });
    });
storage.__BIND_PORT_MESSAGE__ = false;
storage.resolvers = {};
storage.rejectors = {};

// ============================================================================

async function main() {
    debug('Listening on port 8081');
    debug('Hello~~~');

    debug(await storage('getAll'));
    await storage('set', 'AAA', new Date().toLocaleString());
    debug(await storage('getAll'));
}

main().catch((err) => {
    console.error(err);
});
