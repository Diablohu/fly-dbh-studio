/* eslint-disable no-console */

const webpack = require('webpack');
const { getElectronFilesFolder } = require('koot-electron');

const { debug } = require('./index.js');
const webpackConfig = require('./src/webpack.config');

// ============================================================================

let resolved = false;

// ============================================================================

/**
 * 在 Koot `afterBuild` 生命周期执行: 生成 Companion Server JS 文件
 * - 开发环境: 输出文件到临时目录
 * - 生产环境: 输出文件到项目 dist 目录下的子目录
 */
const buildCompanionServer = () =>
    new Promise((resolve, reject) => {
        debug('Building...');

        if (process.env.WEBPACK_BUILD_ENV === 'dev') {
            webpackConfig.output.path = getElectronFilesFolder();
        }

        try {
            webpack(webpackConfig, (err, stats) => {
                if (err) return reject(err);

                const info = stats.toJson();

                if (stats.hasWarnings() || stats.hasErrors()) {
                    debug(
                        stats.toString({
                            chunks: false,
                            colors: true,
                        }),
                    );
                    if (stats.hasWarnings()) console.warn(info.warnings);
                    if (stats.hasErrors()) console.warn(info.errors);
                }

                if (!resolved) {
                    debug(
                        `Build complete! Files emitted to ${webpackConfig.output.path}`,
                    );
                    console.log('');
                }
                resolved = true;
                resolve(stats);
            });
        } catch (err) {
            debug(`Build failed!`);
            console.error(err);
            reject(err);
        }
    });

module.exports = buildCompanionServer;
