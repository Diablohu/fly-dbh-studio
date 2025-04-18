# FLY-DBH Studio

_Diablohu_ 自用的模拟飞行直播工具包。

## 当前功能

-   直播覆盖层：等待室
    -   访问 `localhost:4321/stream-overlays/waiting-room`
-   _OBS_ 服务器 & _SimConnect_ 服务器
    -   根据以下条件，控制 **_OBS_ 外设镜头** 的显示与否，优先级从上至下，哪个条件先满足，就执行哪个结果
        -   `非游戏状态` : ⛔ 隐藏
            -   基于 `simvar:CAMERA_STATE`
        -   `自动驾驶正在生效` : ⛔ 隐藏
            -   基于 `simvar:AUTOPILOT_MASTER`，不适用于所有机型
        -   `在跑道上` 且 `地速大于 1 m/s` : ✅ 显示
            -   地速基于 `simvar:GPS_GROUND_SPEED`
        -   `在地面上` 且 `地速大于 15 m/s` : ✅ 显示
        -   `在空中` 且 `离地高度小于 2000 ft` : ✅ 显示
            -   离地高度基于 `simvar:PLANE_ALT_ABOVE_GROUND_MINUS_CG`
        -   其他条件 : ⛔ 隐藏

## 开发

| 命令          |                                                                                                |
| :------------ | :--------------------------------------------------------------------------------------------- |
| `npm install` | 安装 _NPM_ 依赖                                                                                |
| `npm run dev` | 开启网页端的本地开发服务器 `localhost:4322`，支持热更新。仅网页端                              |
| `npm start`   | 打包至 `./dist/` 并自动执行服务器启动脚本，同时启动网页服务器和 _OBS_ 以及 _SimConnect_ 服务器 |
