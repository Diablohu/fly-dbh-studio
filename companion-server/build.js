/**
 * 在 Koot `afterBuild` 生命周期执行: 生成 Companion Server JS 文件
 * - 开发环境: 输出文件到临时目录
 * - 生产环境: 输出文件到项目 dist 目录下的子目录
 */
const buildCompanionServer = (appConfig) =>
    new Promise((resolve, reject) => {
        resolve();
    });

module.exports = buildCompanionServer;
