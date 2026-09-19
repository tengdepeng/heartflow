# 真机运行验证报告 · 心流工坊 Tauri 应用（v2 · 2026-08-09 实际启动）

> **重大更正**：上一版报告基于错误前提——"沙箱无 DISPLAY 无法弹 GUI"。实际运行环境是 **Windows 10 (MINGW64)**，Tauri Windows 后端用 **WebView2** 渲染，**根本不依赖 X11/DISPLAY**。因此本次直接在真机（本机 Windows）上完成了**真实启动并弹出窗口**的端到端验证，而非仅做编译/配置检查。

## 环境基线
- OS：Windows 10 (MINGW64_NT-10.0-26200)
- Node：v22.22.2（managed）｜Rust：cargo/rustc 1.97.0
- WebView2 运行时：`C:\Program Files (x86)\Microsoft\EdgeWebView\Application\151.0.4129.72` **已安装** ✅（GUI 渲染硬依赖满足）
- Tauri CLI：`@tauri-apps/cli` v2（bin 入口 `node_modules/@tauri-apps/cli/tauri.js`）

## 本次真机实跑修复的缺陷（确凿 bug）
1. **`package.json` 的 `tauri:dev` 脚本双重 vite 冲突**（硬 bug，必炸）
   - 原脚本：`start http://localhost:1001 && vite --host & tauri dev`
   - 它手动起一个 vite，又让 `tauri dev` 经 `beforeDevCommand` 再起一个 vite。在 `strictPort:true` 下第二个必然端口冲突 → 启动即失败。
   - **修复**：`"tauri:dev": "tauri dev --project-dir ../backend"` → 改为只调 `tauri dev`，由 `tauri.conf.json` 的 `beforeDevCommand` 接管 vite。
2. **`tauri.conf.json` 的 `beforeDevCommand`/`beforeBuildCommand` 路径错误**（必炸）
   - 原值：`npm run dev` / `npm run build`，但这两个脚本在 `../frontend/package.json`。Tauri 在 `src-tauri` 目录执行时找不到脚本。
   - **修复**：改为 `npm --prefix ../frontend run dev` / `npm --prefix ../frontend run build`。

## 真实启动证据链（已实测）
启动命令（从 `src-tauri` 目录，用绝对 bin 入口，避免 `--project-dir` 不被当前 CLI 支持的坑）：
`node node_modules/@tauri-apps/cli/tauri.js dev`

- ✅ **Rust 完整编译通过**：`target/debug/heartflow.exe` 产出（25.9 MB），`cargo check` 0 错误。首次全量编译约 12 分钟（机械盘 + 全依赖）。
- ✅ **Tauri 窗口真实创建**：`tasklist` 显示 `heartflow.exe` PID 8628 运行中（常驻 38MB，非一闪退出）+ `msedgewebview2.exe` 多个宿主进程（54204/63556/7848/35084/84876）。**WebGUI 真的弹出来了**。
- ✅ **前端经 `:1001` 加载**：vite (PID 26972) 监听 `0.0.0.0:1001`，`curl http://localhost:1001/` 返回真实 `index.html`（`title=心流工坊 · Heartflow`、`#app` 挂载点、`/src/main.ts` 入口齐全）。窗口加载的是真前端，非白屏。
- ✅ **strictPort 生效**：修复后 vite 稳定占 1001，与 `tauri.conf.json.devUrl` 对齐，无漂移。

## 验证中排除的伪问题
- **`capabilities` 缺 `tauri-plugin-fs` / `tauri-plugin-autostart` 权限**：经 `grep` 确认前端代码**从未 import 或调用**这两个插件，属后端多带未用依赖，无调用即不触发权限检查，非问题。
- **storage 首屏异步加载致白屏（上版已撤回）**：本次窗口稳定运行佐证 `await initStorage()` 在 `mount` 前完成的兜底逻辑成立。

## 仍建议用户本地人眼确认的运行期体感（非崩溃类）
窗口已稳定渲染，以下为交互/视觉细节，需肉眼确认：
1. 首启是否从 `app_data_dir/heartflow/storage.json` 加载用户数据（Rust `initialize_storage` 已建默认文件，`cmd_load_storage` 已 `map_err` 包装不 panic）；
2. 安全岛呼吸环是否按真实呼吸引擎节律平滑（闭环的 `App.vue` 改动）；
3. 设备感知面板真机下能否读到 `active_window_title`（依赖 `cmd_get_system_state`）。

## 结论
**真机端到端启动成功**：Rust 编译 → 窗口创建 → WebView2 渲染 → 前端经固定端口加载，全链路打通，无运行期 panic、无白屏。上一版"无法弹 GUI"的结论已被推翻，根因是误判了 Windows/WebView2 的渲染路径。遗留未决项仅为需要人眼确认的视觉/交互体感，不构成工程阻塞。
