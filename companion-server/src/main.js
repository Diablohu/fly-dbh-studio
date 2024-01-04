const { debug } = require('../index.js');

async function main() {
    debug('Listening on port 8081');
    debug('Hello~~~');
}

main().catch((err) => {
    console.error(err);
});
