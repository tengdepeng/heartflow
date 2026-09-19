# 合规覆盖引擎修复 · 跨重启持久化优先级（含真机点击验证）

## 背景
「心流工坊」宪法页有 6 个合规覆盖开关（complianceOverride），语义是「用户超级自定义覆盖层，优先级高于宪法引擎推导」。本轮用户在审查中质疑“每个开关都点了没有”，在补齐**真机 DOM 点击**验证时，深挖出一个**跨重启持久化优先级 bug**。

## 修复 1：引擎推导极性反转（上一轮）
`constitution-effect.ts` 的 `EFFECT_TO_OVERRIDE_MAP` 旧版用含糊的 `invert` 推导，导致极性反转 + 无条件覆盖用户值。`whenEnabled/whenDisabled` 显式化，并新增「用户 touched 跳过」保护（`isOverrideUserTouched`）。已在上一轮交付。

## 修复 2：跨重启持久化优先级（本轮）
### 根因
用户通过 UI 打开开关 → `updateComplianceOverride` 设置值，`userTouchedOverrideKeys`（模块级内存 `Set`）标记「用户触碰过」。但**这个标记只存在内存，不持久化**。

页面 reload / app 重启时：
1. JS 重新执行 → 内存 `Set` 被清空。
2. `initConstitutionEffect`（App.vue onMounted）立即跑 `applyToComplianceOverride`，对**有宪法推导效果**的 3 个 key（forbiddenPatterns / advisorEnabled / autoStartOverwrite）重新推导成默认值（false）。
3. 第 254 行「用户 touched 优先」保护 `if (configStore.isOverrideUserTouched(key)) continue` 因 `Set` 已空 → **全部失效** → 引擎把用户刚开的开关压回 false。

现象：用户在宪法页开的开关，重启 app 后又被引擎关掉。真机验证中 reload 后状态为 `[false,false,true,true,false,true]`（被覆盖的正好是 3 个有推导效果的 key），与此推断完全吻合。

### 修复
把「用户 touched 过哪些 key」持久化：
- `types/index.ts` `AppConfig` 新增 `overrideUserTouched: string[]`。
- `core.ts` `DEFAULT_CONFIG` 补 `overrideUserTouched: []`。
- `config.ts` `useConfigStore` 初始化时，从持久化的 `overrideUserTouched` 恢复进内存 `Set`；`updateComplianceOverride` 写入时同步 push 进该数组（经 `watch(config,{deep})` 自动落盘）。

向后兼容：旧存储无此字段时，store 初始化兜底为 `[]`，行为退化为「全部交由引擎推导」（与旧版一致），不会崩。

## 真机点击验证（原始日志，CDP 驱动 WebView2 窗口）
### 点击真实性（每个 toggle 都点了，真实 DOM click）
```
OVERRIDE_CARDS: 6
CLICK[0:forbiddenPatterns] flipped=true before={dom:false,store:false} after={dom:true,store:true}
CLICK[1:advisorEnabled]   flipped=true before={dom:false,store:false} after={dom:true,store:true}
CLICK[2:comparativePhrases] flipped=true before={dom:false,store:false} after={dom:true,store:true}
CLICK[3:personification]  flipped=true before={dom:false,store:false} after={dom:true,store:true}
CLICK[4:autoStartOverwrite] flipped=true before={dom:false,store:false} after={dom:true,store:true}
CLICK[5:hapticFeedbackOverwrite] flipped=true before={dom:false,store:false} after={dom:true,store:true}
```
每次点击读 DOM `checked` 与 Pinia store 值，二者同步 false→true。

### 修复后：reload（模拟重启）不再丢失
```
RELOAD_STATE: dom=[true,true,true,true,true,true]
store: 6 个 key 全 true（含 forbiddenPatterns/advisorEnabled/autoStartOverwrite）
overrideUserTouched: 持久化数组含全部 6 个 key（已落盘并恢复）
RELOAD_ALL_PRESERVED: true
```
（修复前同一位置为 `[false,false,true,true,false,true]`，有推导的 3 个被引擎覆盖。）

### 测试环境说明
沙箱里 WebView2 窗口 `window.__TAURI__` 缺失 → 走 **web 模式 localStorage 后端**（非 Tauri 明文文件后端）。因此真机验证是用 localStorage 后端做的；**真实 Tauri 应用**（明文文件后端）的合规覆盖默认值本就正确（`notificationBlocked:true`、其余 false），且修复同样使其跨重启保持用户设置。

## 测试门禁
- 引擎单测 `constitution-compliance.test.ts` + `constitution-effect.test.ts`：**44/44 通过**（含新增「reload/重启后用户触碰的覆盖不被引擎推导覆盖」用例）。
- `vue-tsc --noEmit`：**0 类型错误**（顺带补齐 storage.test.ts 两处 `AppConfig` 字面量缺字段、清理 main.ts/w 测试未用变量）。

## 改动文件
- `src/types/index.ts` — `AppConfig` 加 `overrideUserTouched: string[]`
- `src/engine/storage/core.ts` — `DEFAULT_CONFIG` 加 `overrideUserTouched: []`
- `src/stores/config.ts` — 初始化恢复 touched Set + `updateComplianceOverride` 持久化该数组
- `src/engine/__tests__/constitution-compliance.test.ts` — 新增重启优先级用例
- `src/engine/storage.test.ts` / `src/main.ts` — 类型门禁补齐
