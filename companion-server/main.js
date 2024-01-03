// const path = require('path');
const { utilityProcess } = require('electron');
// const webpack = require('webpack');
const getDirDevTmp = require('koot/libs/get-dir-dev-tmp');

const companionServerWebpackConfig = require('./src/webpack.config');

const main = async (createWindowOptions) => {
    // 等待 Companion Server 进程文件生成
    console.log('🛸 Companion Server: Waiting for JS file...');

    console.log('🛸 Companion Server: Starting');

    if (process.env.WEBPACK_BUILD_ENV === 'dev') {
        companionServerWebpackConfig.output.path = getDirDevTmp('electron');

        let child;
        // let launched = false;

        companionServerWebpackConfig.plugins.push({
            // apply: (compiler) => {
            //     compiler.hooks.watchRun.tap(
            //         'CompanionServerPlugin',
            //         (compilation) => {
            //             // console.log('__watchRun');
            //             if (child) {
            //                 // debug('server reloading...');
            //                 child.kill();
            //                 child = undefined;
            //             }
            //         },
            //     );
            //     compiler.hooks.afterEmit.tap(
            //         'CompanionServerPlugin',
            //         (compilation) => {
            //             // console.log('__afterEmit');
            //             if (child) return;
            //             // debug(
            //             //     launched ? 'server started!' : 'server reloaded!'
            //             // );
            //             // launched = true;
            //             // console.log('\n\n');
            //             child = utilityProcess.fork(
            //                 path.resolve(
            //                     companionServerWebpackConfig.output.path,
            //                     'main.cjs',
            //                 ),
            //                 {
            //                     stdio: 'inherit',
            //                     serviceName: 'fly-dbh-studio-companion-server',
            //                 },
            //             );
            //             // child.on('close', (code) => {
            //             //     console.log(
            //             //         `child process exited with code ${code}`
            //             //     );
            //             // });
            //         },
            //     );
            // },
        });
        console.log(companionServerWebpackConfig);
        // webpack(companionServerWebpackConfig);
    } else {
        // config.plugins.push(new CleanWebpackPlugin());
        // config.plugins.push(
        //     new CopyPlugin({
        //         patterns: [path.resolve(__dirname, './build-copy')],
        //     }),
        // );
    }
};

module.exports = main;
