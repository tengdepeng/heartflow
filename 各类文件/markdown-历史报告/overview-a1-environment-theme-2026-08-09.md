# 定音锤 & 环境主题集成修复 — 2026-08-09

## 🔴 重要更正：上轮 A 类差距分析大面积误判
动手前先读源码核实，发现上一轮「蓝图差距分析」对 A 类缺陷的判断大面积过时/误判（与本项目此前 P1/P2 核查「差距报告普遍过时」同构，根因都是只读视图模板、没追 store/引擎实现）：

- **A1「定音锤生成引擎缺失」→ 误判**。`stores/advisor.ts` 的 `getFourActs()` 是**完整的跨模块聚合引擎**（聚合专注/笔记/情绪/锚点/结晶/关系/目标/身体日志/字镜），`DingyinFourActs.vue` 已在 `computed` 中调用它。引擎一直都在。
- **A6「幕僚年度对话缺失」→ 误判**。`getAnnualDialogue()/getQuarterlyDialogue()` 已实现在 advisor store（仅在特定日期触发）。
- **A2「环境/场景编辑器无业务 store、不落盘」→ 半误判**。两视图实际都落盘：`EnvironmentEditor` 写 `storage.setConfig`，`SceneEditor` 写 `storage.setKV('hf:scene_presets')`。误判根因：把"没用独立 Pinia store"等同于"不落盘/引擎缺失"。

## ✅ 真实缺口（本轮修复）

### 1. 环境编辑器「保存设置」改了不生效（A2 真实部分）
- **根因**：`EnvironmentEditor` 把 `accentColor/background/density/fontFamily/transition` 写入 `config`，但全项目**无任何消费点**（grep 命中全是写死的 `--accent-rgb:212,165,116`），改主色/背景/字体后界面毫无变化 —— 正是用户吐槽的"改了不生效"。
- **修复**：
  - `stores/style.ts` 新增 `applyEnvironmentConfig(cfg)`：把上述参数映射到全局 CSS 变量（`--accent`/`--accent-rgb`、字体、`--bg-primary`、过渡、`density-*` class），在 `init()` 与 `activate()` 后调用。
  - `EnvironmentEditor.saveEnvironment()` 保存后调用 `styleStore.applyEnvironmentConfig(updated)` 即时生效。
- **顺带修复隐藏 bug**：`deriveVars` 原先不输出 `--accent-rgb`，导致各风格包的霓虹辉光永远是写死暖琥珀色、与包主色脱节；现输出真实 `--accent-rgb`，辉光随包主色变化。

### 2. 定音锤四幕 reactivity staleness（A1 真实部分）
- **根因**：视图用 `computed(() => advisor.getFourActs())`，但 `getFourActs()` 读**非响应式** `storage`，computed 首次求值后被永久缓存，停留页面期间其他模块新增数据不回流。
- **修复**：改为手动「敲锤」`knock()`（`ref` + `onMounted` 调用），并新增「🔨 重敲定音锤」按钮，用户可随时强制重新聚合跨模块证据。

## ✅ 真机复验（CDP 直连真实 WebView2 窗口）
- 环境编辑器：改主色 `#ff0000` 保存后，全局 `--accent-rgb` 由 `56,189,248`（深海包，顺带证明 `deriveVars` 修复生效）变为 `255,0,0` → `env_apply_ok=true`。
- 定音锤：4 张四幕卡片正常渲染，点「重敲」`knock_error=null`、`acts_after=4` → `dingyin_ok=true`。
- 控制台零报错（仅 vite 连接日志）。

## 验证门禁
- `vue-tsc --noEmit` EXIT=0
- 改动为集成/视图层，未引入新测试（`getFourActs` 聚合逻辑早已在 advisor 测试覆盖）

## 📌 下一步真实缺口（未做，供定序）
- 场景编辑器 `hf:scene_presets` 场景**未应用到任何房间背景**（存了未消费，与 A2 同构）。
- AppSpace 7 维引擎/8 模板/时光回溯、插件安装闭环、家 3D、幕僚调令/互动（A3–A6 真实部分）仍浅/缺。
