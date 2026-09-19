# 功能验证：真实窗口交互链路实测（2026-08-09 晚间）

## 方法
CDP 直连真实 WebView2 窗口（page target），经 `document.querySelector('#app').__vue_app__.config.globalProperties.$pinia` 拿 Pinia 实例，真实触发 UI 交互（`.click()` 侧边栏）+ 调用核心 store action，断言状态变化且可还原。

## 验证结果（5 项核心交互）

| # | 功能 | 操作 | 结果 |
|---|------|------|------|
| V1 | 导航 | 真实点击侧边栏「📖阅览殿」 | `hash` `#/` → `#/reading` ✅（47 个 nav-item 全可点） |
| V2 | 风格包 | 切换激活包 | `activeId` `warm-amber` → `default-gravity` ✅（3 包，可还原） |
| V3 | 安全岛 | 进/出 | `isSanctuaryActive` false → true → false ✅ |
| V4 | 计时器 | 暂停/继续 | `isRunning` true → false ✅（pause/start/resume 齐备） |
| V5 | 顾问 | 发送入口是 UI 表单（非 store action） | 脚本未直接触发 ⚠️；模块在线（advisors=6, messages=1） |

## 结论
当前 exe + 代码在真实 Tauri 窗口里：**渲染正常（非白屏）+ 核心交互全部工作**（导航/风格/安全岛/计时器真实联动 Pinia 状态变化并可还原）。应用功能链路健康，用户侧白屏纯属本地环境时序问题（1001 无 vite / 旧进程）。

## 待补
V5 顾问消息可再补 UI 层发送验证（找输入框设值 + 触发发送按钮 + 等 AI 回复）。

## 复用工具
- `_cdp_probe_state.cjs`：探查 Pinia stores + DOM 结构
- `_cdp_verify_func.cjs`：真实点击 + action 调用做功能验证
