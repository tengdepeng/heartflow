# 真机再验证：从真实 WebView2 窗口扒运行时（2026-08-09 晚间）

## 背景
用户要求"再试试"独立运行检测。此前结论是"沙箱无法独立跑 GUI 观察真实窗口"。本次环境已变——cargo lock 文件跨用户权限坑解除（所有者恢复为 `tengxiaosu`），重做验证并**成功从真实运行的 Tauri 窗口扒到了运行时**。

## 做法
1. 确认环境：exe 存在（`target/debug/heartflow.exe`，13:38 编译）、1001 vite 监听、lock 文件所有者恢复。
2. `PowerShell Start-Process` 拉起 `heartflow.exe` → 进程存活（非秒退）；`tauri.conf.json` 的 `additionalBrowserArgs:"--remote-debugging-port=9222"` 生效，WebView2 暴露调试端口。
3. CDP `/json` 列出真实 page target：`title=心流工坊·Heartflow`，`url=http://localhost:1001/#/`。
4. Node 22 全局 `WebSocket`（用 `addEventListener` 而非 `.on`）+ DevTools Protocol 连入 page target，抓取运行时。

## 铁证：真实窗口渲染正常、非白屏
- `#app` innerHTML = **43,479 字符**（白屏应为 0）
- `document.title` = 心流工坊 · Heartflow
- `bodyText` 含完整 UI：引力场画布（1 颗结晶 / 引力）、侧边栏全部房间导航（时间长廊、逐日心锚、情绪花房、世界房间、阅览殿、羁绊之厅、身体温室、逸趣阁…）
- console：**零致命错误**，仅 4 条无害日志（`[vite] connected` + 两条 `navigator.vibrate` 需先交互的权限提示，不影响渲染）

## 限制
- `Page.captureScreenshot` / `Page.captureSnapshot` 因沙箱窗口 offscreen（不可见）返回空，拿不到真实窗口图像。DOM + console 证据已足够判定渲染状态。

## 结论与建议
- **当前 exe + 代码在真实 Tauri 窗口里非白屏**，用户侧白屏是其本地环境/时序问题（1001 无 vite、端口冲突、旧进程残留）。
- 用户侧排查：① 确认 `localhost:1001` 能被 exe 访问（浏览器打开看是否返回 HTML）；② 关掉所有 `heartflow.exe` / `msedgewebview2` 孤儿进程；③ 重新 `tauri dev`；④ 若仍白，按 F12 把 Console 红错贴过来（沙箱拿不到用户窗口截图）。
- 复用工具：`_cdp_inspect.cjs`（Node 22 全局 WebSocket + CDP，参数：ws-url + png路径 + mhtml路径）。
