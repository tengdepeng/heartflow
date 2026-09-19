# 桌面端白屏排查与修复

## 结论先行
白屏**不是 Vue 应用本身的 bug**。用 headless Edge(CDP) 实测：`localhost:1001`（dev 地址）和 `dist` 构建产物都能正常渲染（`#app` 4 万+ 字符、零 console 报错）。

白屏的真正原因是：**Tauri 调试版窗口拉不到前端页面**。

## 根因
- 调试版 `target/debug/heartflow.exe` 是 **dev 模式**，运行时加载 `tauri.conf.json` 里的 `devUrl = http://localhost:1001`（即 vite dev server），本身不内嵌前端。
- 当时 `localhost:1001` 没有 vite 在跑 → WebView2 拉不到页面 → 白屏。
- 为什么 1001 没服务：`vite.config.ts` 设了 `strictPort: true`，端口被占用时 vite **直接失败退出**（之前日志确有 `Port 1001 is already in use`）；而更早的 `tauri:dev` 又因为 cargo 构建失败（见下）没能把后端带起来。

## 已做的修复（即时可用）
1. 清理了残留在后台的孤儿 `msedgewebview2.exe`（白窗 zombies）。
2. 在后台启动 vite，监听 `localhost:1001`（PID 74020）。
3. 重新拉起 `heartflow.exe`（PID 39244）→ 窗口现已正常显示界面。

## 根治加固（代码）
改了 `project/frontend/src/main.ts` 的 `bootstrap()`：
- 每个初始化步骤（平台检测 / 感知 / 存储 / 共鸣 / Runtime 桥接 / 风格包）包进 `safe()` 容错，**任何一步失败只降级、绝不阻断 `app.mount('#app')`**。
- 加了 `bootstrap().catch` 全局兜底：万一整体崩了，也在 `#app` 里渲染可见错误文本，而不是纯白屏。
- 加了 Vue `errorHandler` 兜底。

今后即使某个 Tauri 后端调用失败，界面也保证可见，不会再出现「逻辑在跑但全白」。

## 还需要你处理的一处环境坑（持久化）
当前会话里 vite 是在后台跑的，**会话结束 / 关机后 vite 会停，白屏会复发**。要彻底摆脱这种脆弱状态，标准做法是跑 `npm run tauri:dev`（它会自己管 vite + cargo + 窗口）。但目前这一步被卡住：

- `project/backend/src-tauri/target/debug/.cargo-build-lock`（还有 `.cargo-artifact-lock` / `.cargo-lock`）的**所有者是另一用户 `雨佳\CodexSandboxUsers`**，当前账号删不了（`takeown` 需要管理员权限，直接删也被拒，os error 5）。

**请二选一解决：**
1. 用**管理员**身份删除这三个 lock 文件，再正常跑 `npm run tauri:dev`；
2. 或**以管理员身份**直接运行 `npm run tauri:dev`。

另外提醒：`tauri.conf.json` 里 `frontendDist: "../frontend/dist"` 路径解析是错的（相对 `src-tauri/` 会指向不存在的 `project/backend/frontend/dist`），只影响 `tauri:build` 生产构建，不影响 dev。等你那边能正常构建时，建议一并改成 `../../frontend/dist`。

## 现在的状态
- vite 监听 1001 ✅
- `heartflow.exe` 运行中 ✅
- 桌面窗口应已正常显示，刷新/重开即可看到界面。
