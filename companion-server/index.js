const createDebug = require('debug');

const debug = createDebug('🛸 Companion Server');
debug.useColors = true;
debug.color = 13;
debug.enabled = process.env.WEBPACK_BUILD_ENV === 'dev';

module.exports = {
    debug,
    webpackEntryName: 'companion_server',
    portTypes: {
        storage: 'STORAGE',
    },
};
