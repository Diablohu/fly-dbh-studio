# Companion Server

由 _Electron_ 主进程（Main）启动的本地 HTTP 服务器——**Companion Server**。

---

**Companion Server** 的源代码会在 _Koot.js_ 的 `afterBuild` 生命周期中被打包，并输出文件。这一生命周期会在 _Koot.js_ 内置的打包流程结束后执行。

**Companion Server** 会在 _Electron_ 主进程（Main）运行时以 _Electron Utility Process_ 的方式自动运行。

在开发环境中，_Koot.js_ 打包流程结束后，_Electron_ 主进程（Main）便会自动启动。在其流程开始时，会等待 **Companion Server** 的打包完成，之后会自动运行启动流程。

在生产环境中，**Companion Server** 会被打包到项目的 `dist` 目录下的子目录中，并在 _Pack_ 过程中封装入 `asar` 包中。
