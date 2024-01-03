const path = require('path');

const createConfig = () => {
    /** 当前是否是开发环境 */
    const isEnvDevelopment = process.env.WEBPACK_BUILD_ENV === 'dev';

    const config = {
        mode: isEnvDevelopment ? 'development' : 'production',
        devtool: isEnvDevelopment ? 'cheap-module-source-map' : 'source-map',
        target: 'async-node',
        watch: isEnvDevelopment ? true : false,
        output: {
            filename: '[name].cjs',
            path: process.env.KOOT_DIST_DIR,
        },
        plugins: [],
        entry: {
            main: [path.resolve(__dirname, 'main.js')],
        },
        module: {
            rules: [
                {
                    test: /\.(js|mjs|cjs|ts)$/,
                    use: {
                        loader: 'babel-loader',
                    },
                },
            ],
        },
        optimization: {
            splitChunks: false,
            removeAvailableModules: false,
            mergeDuplicateChunks: false,
            concatenateModules: false,
        },
        resolve: {
            modules: ['__modules', 'node_modules'],
            extensions: ['.js', '.ts', '.mjs', '.cjs', '.json'],
        },
        stats: {
            preset: 'minimal',
            // copied from `'minimal'`
            all: false,
            modules: false,
            // maxModules: 0,
            errors: true,
            warnings: false,
            // our additional options
            moduleTrace: true,
            errorDetails: true,
            performance: false,
        },
        performance: {
            maxEntrypointSize: 100 * 1024 * 1024,
            maxAssetSize: 100 * 1024 * 1024,
        },
    };

    return config;
};

module.exports = createConfig();
