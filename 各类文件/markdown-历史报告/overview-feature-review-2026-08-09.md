# 运行 App · 全功能模块审查（2026-08-09）

## 用户诉求
「运行 app 仔细审查每一个功能模块，逐一验证是否按预期工作，检查用户交互流程、数据处理逻辑、边界情况及错误处理完整性，记录异常/缺陷/不合规行为并标注具体功能名称与现象。」

## 执行环境（本会话）
- 沙箱**有桌面会话**，WebView2 可创建窗口，`:9222` CDP 正常通气。
- 启动链：`vite` dev server 于 `:1001`（strictPort）→ `PowerShell Start-Process` 拉起 `target/debug/heartflow.exe`（PID 51920）→ CDP 暴露真实 page target（title=心流工坊·Heartflow，加载 :1001）。
- 审计方式：CDP 直连真实 WebView2 窗口，读取 Pinia stores（`$pinia._s.get(id)`）与 Vue Router（`$router.getRoutes()`），真实导航 + 状态断言 + 异常/console.error 监听。

## 一、基线功能审计：18/18 PASS（`_audit_full.cjs`）
计时器 start/pause/resume/reset、风格包列表+切换、安全岛 enter/exit、顾问列表+reply 闭环、宪法 getRandomMantra + toggleRule 可逆、47 导航项点击切换、感知 setEnvironment 深色切换、**全程零未捕获异常**。

## 二、扩展审查：逐路由冒烟 + 边界/错误处理（`_audit_extended.cjs`）
### 2.1 全路由冒烟（PART A）—— 67/67 PASS
通过 `router.getRoutes()` 枚举全部 67 条路由，逐条 `location.hash` 跳转并等待懒加载组件挂载，检查：挂载内容非空（innerHTML > 200、有子节点）、跳转期间无 `Runtime.exceptionThrown`、无新增 `console.error`。
- **结果：67 条路由全部正常挂载，零渲染崩溃 / 零路由级异常。**
- 覆盖模块（含之前未逐一点测的）：timeline / anchor / garden / goals / reading / relations / body / play / map / bookmarks / vault / guard / word-mirror / seasonal / movement / roots / wisdom / parallel / carrier-editor / plugin-market / style-market / template-market / worklog / archive / touchpoints / unfinished / dictionary / knowledge / cognition / body-wisdom / sanctuary / constitution / settings / advisors / home 等。

### 2.2 边界 & 错误处理（PART B）—— 15/15 PASS（修复后）
| # | 功能 | 边界/错误场景 | 结果 |
|---|------|------|------|
| B1 | 计时器 | 快速连点 12 次 `start()` | ✅ 单运行态，无竞态 |
| B2 | 计时器 | 空闲态 `pause()` | ✅ 不崩溃 |
| B3 | 计时器 | `setMode('非法值')` | 🔴→✅ 修复后回落 `focus` |
| B4 | 计时器 | `elapsed` 设为 99999999ms | ✅ 无 NaN |
| B5 | 风格包 | `activate('非法id')` | ✅ 保持原 activeId |
| B6 | 顾问 | `reply(空消息)` | ✅ 不崩溃 |
| B7 | 顾问 | 快速连发 6 条 | ✅ 不崩溃，消息追加 |
| B8 | 设置/主题 | `updateTheme('非法值')` 及数字 | 🔴→✅ 修复后钳制为上一有效值 `system` |
| B9 | 宪法 | 关闭全部 44 条规则 + reload | ✅ 仍全部关闭（用户优先级持久化） |
| B10 | 存储 | localStorage 写入非法 JSON 后 reload | ✅ 仍正常挂载（容错恢复） |
| — | 运行期 | 全程异常/console.error 监听 | ✅ 零 |

## 三、发现并修复的缺陷（已真机复验）
### 缺陷 1：`计时器.setMode()` 接受非法模式值（边界/错误处理缺失）
- **功能名称**：计时器模块 `useTimerStore.setMode(mode, minutes)`
- **现象**：传入非 `'focus'|'nap'|'free'` 的字符串（如 `'not-a-real-mode'`）时，该脏值被直接写入会话 `session.mode` 并可用于后续 `start()`，无校验/无兜底。属输入边界保护缺失。
- **修复**：`src/stores/timer.ts` 增加 `VALID_MODES` 校验，非法 `mode` 回落 `'focus'`，非法 `minutes` 回落配置默认时长。
- **复验**：真机 `setMode('not-a-real-mode')` → `mode:'focus', valid:true` ✅

### 缺陷 2：`设置.updateTheme()` 接受非法主题值（边界/错误处理缺失）
- **功能名称**：设置模块 `useConfigStore.updateTheme(theme)`
- **现象**：仅有编译期类型约束，运行时可被写入任意字符串/数字（如 `'invalid-theme'`、`12345`），该脏值落入 `config.theme` 并经 watch 持久化。同属输入边界保护缺失。
- **修复**：`src/stores/config.ts` 增加 `VALID_THEMES` 校验，非法值回落当前有效值（无则默认 `'system'`）。
- **复验**：真机 `updateTheme('totally-bogus')`/`updateTheme(12345)` → 钳制为 `'system'`；合法 `light/dark/system` 切换正常 ✅

> 两处缺陷在正常 UI 路径下不可触发（按钮仅发射合法值），但已按"错误处理完整性"要求做了防御性加固，并已通过 `vue-tsc --noEmit` 类型检查（EXIT=0）。

## 四、结论
- **67 个路由模块全部可正常挂载与交互**，无渲染崩溃、无路由级异常。
- **核心交互功能**（计时/风格/安全岛/幕僚/宪法/导航/感知/设置/存储）逻辑正确，**运行期零未捕获异常、零 console.error**。
- **2 个输入边界缺陷**已发现、修复并真机复验通过；源码改动仅 2 处防御性校验，无功能回归。
- 历史痛点「宪法开关跨重启被引擎覆盖」经验证已稳定保留（`fix_ok=true`，本轮再次复验 44/44 关闭规则 reload 仍保留）。

## 五、用户本机复跑
- `npm run tauri:dev` 启动 exe + vite :1001。
- 全功能审计：`node _audit_extended.cjs <wsUrl>`（仓库内 `_audit_extended.cjs`）；`<wsUrl>` 取 `http://localhost:9222/json/list` 中 type=page 的 `webSocketDebuggerUrl`。
- 基线审计：`_audit_full.cjs`；历史宪法复验：`_verify_reload_fix.cjs`（在 `$TEMP/heartflow_diag/`）。

## 六、已知限制
- 沙箱偶发无桌面会话 → exe 挂起、9222 不通（环境限制，非应用 bug）；遇此重开会话重试。
- 沙箱真机为 web 存储模式（localStorage，origin `localhost:1001`），非 Tauri 文件落盘；真实落盘以 `AppData/Roaming/com.tengxiaosu.heartflow/heartflow/storage.json` 为准。
- 真机窗口 offscreen，截图/快照拿不到，但 DOM / console 可探，足以判定渲染与运行时状态。
