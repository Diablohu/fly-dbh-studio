import Koa from 'koa';

import { debug } from '../index.js';
import storageKeys from '../../storage-keys.js';
import storage from './storage';

// ============================================================================

async function main() {
    const { port } = await storage('get', storageKeys.companionServer);

    const app = new Koa();

    app.use(async (ctx) => {
        ctx.body = 'Hello World';
    });

    app.listen(port);

    debug(`Listening on port ${port}`);
    debug('Hello~~');
}

main().catch((err) => {
    console.error(err);
});
