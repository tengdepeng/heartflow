# 全功能真机审计 + 缺陷修复（2026-08-09）

## 验证方式
通过 CDP 直连**真实运行的 Tauri/WebView2 窗口**（`heartflow.exe` + `:1001` vite），枚举全部 Pinia store，逐项触发核心 action / UI 交互，并捕获运行期未捕获异常。审计脚本 `_audit_full.cjs` 已留仓库可复用。

## 审计结果：18/18 通过
| # | 功能 | 操作 | 结果 |
|---|------|------|------|
| 1 | 应用就绪 | 等待 `#app` 挂载 + store 实例化 | ✅ |
| 2 | 初始快照 | 进入即读状态 | ✅ timer `isRunning:false, elapsed:0, status:idle`（**修复后不再自动启动**） |
| 3 | 计时器 | start → 1.5s 后 | ✅ `isRunning:true, elapsed:1504, focusing` |
| 4 | 计时器 | pause | ✅ `isRunning:false, isPaused:true` |
| 5 | 计时器 | resume | ✅ `isRunning:true` |
| 6 | 计时器 | reset | ✅ `isRunning:false, elapsed:0, idle` |
| 7 | 风格包 | 列表 | ✅ 3 个：`default-gravity / warm-amber / deep-ocean` |
| 8 | 风格包 | activate 切换 | ✅ `warm-amber`→`default-gravity`（可还原） |
| 9 | 安全岛 | enter | ✅ `isSanctuaryActive:true` |
| 10 | 安全岛 | exit | ✅ `isSanctuaryActive:false` |
| 11 | 顾问 | 列表 | ✅ 6 个顾问在线 |
| 12 | 顾问 | reply 收发闭环 | ✅ 用户发言→顾问回应（`镜我点了点头。`） |
| 13 | 宪法 | getRandomMantra | ✅ 返回有效箴言对象 |
| 14 | 宪法 | toggleRule 可逆 | ✅ `elastic-flow-first` true→false→true |
| 15 | 导航 | 47 个 nav-item | ✅ 点击 `#/timeline`…`#/body` 路由均切换 |
| 16 | 感知 | setEnvironment 深色 | ✅ `isDark` true→false |
| 17 | 运行期异常 | 全程监听 | ✅ 零未捕获异常 |

## 已修复的缺陷

### Bug 1：计时器进入即自动启动（用户首报）
- **根因**：`Home.vue` onMounted 依据 `autoStartOverwrite` 自动 `timer.start()`；而宪法效果引擎把"计时器不自动开始"这条默认规则**反转**算成 `autoStartOverwrite=true`，于是宪法"不要自动开始"被变成"一进应用就计时"。
- **修复**：移除 `Home.vue` 挂载时的自动 `timer.start()`，计时器回到"等用户显式点击"。手动 `start/pause/resume/reset` 不受影响。
- **真机复验**：初始快照 `isRunning:false`（修复前为 true / elapsed≈1800）。

### Bug 2：`advisor.say()` 在缺省 trigger 时崩溃（健壮性）
- **根因**：`say(text, trigger, advisorId?)` 直接对 `trigger` 调 `.startsWith`，`trigger` 为 `undefined` 时抛 `TypeError`（UI 实际走 `reply()`，故非用户面 bug，但属脆弱点）。
- **修复**：`function say(text, trigger = '', advisorId?)` 给 `trigger` 兜底默认值。

## 已确认、建议单独重构的缺陷（本轮未改，附方案）

### Defect：complianceOverride 宪法效果引擎极性反转 + 覆盖用户值
- **现象（真机探针 `_probe_constitution.cjs` 证实）**：启动后 `autoStartOverwrite / advisorEnabled / comparativePhrases / personification / hapticFeedbackOverwrite` 全被引擎算成 `true`；用户调用 `updateComplianceOverride({autoStartOverwrite:false})` 后**仍是 true**（被引擎覆盖）。
- **根因**：`engine/constitution-effect.ts`
  - `applyToComplianceOverride()`（232–242 行）在启动（265 行）和**任意宪法规则变动**时用规则算出的值**覆写**用户设置；
  - `EFFECT_TO_OVERRIDE_MAP` 的 `invert` 极性定义与运行时语义矛盾：中性检测类开关（`comparativePhrases`/`personification`/`forbiddenPatterns`）被算成 `true` = 默认关掉过滤器，与设计"默认关闭→过滤器激活"相反；`timer:auto-start` 那条 `invert:true` 把"不自动开始"反成 `true`（即 Bug 1 的更深层根因）。
- **为何本轮不动**：该引擎牵动**顾问门控**（`advisor.ts:1176` 依赖 `complianceOverride.advisorEnabled`）、**通知拦截**（`ui:notification`/`notificationBlocked`）、**震动**（`platform.ts:265`）三处共享行为；现有注释与运行时用法相互矛盾，极性"正确值"需逐旗语义推导，盲改可能把顾问静音或误关通知。属需单独、带单测（`constitution-compliance.test.ts` 已有断言在 219–226 / 498–503 行）的重构。
- **建议修复方向**：① 让 `applyToComplianceOverride` **仅在字段未由用户显式设置时**写入引擎默认值（尊重用户覆盖）；② 逐 `invert` 项按运行时真实语义校正极性（重点 `timer:auto-start`、`advisor:forbidden-patterns` 等）；③ 必要时把"宪法派生效果"与"用户覆盖层"彻底分离，引擎只写 `currentEffectState`，不再 mutate `complianceOverride`。

## 遗留环境坑（与代码无关）
- `src-tauri/tauri.conf.json` 的 `frontendDist:"../frontend/dist"` 路径解析错误（应为 `../../frontend/dist`），仅影响 `tauri:build` 生产构建。
- 调试版 exe 为 dev 模式，加载 `:1001`，需 vite 在跑；用户侧白屏通常是 1001 无服务 / 旧 WebView2 进程残留。

## 文件改动
- `project/frontend/src/views/Home.vue` — 移除 onMounted 自动启动计时器
- `project/frontend/src/stores/advisor.ts` — `say()` 的 `trigger` 加默认值
- 复用脚本：`_audit_full.cjs`（全功能审计）、`_enum_stores.cjs`（store 枚举）、`_probe_constitution.cjs`（宪法开关探针）
