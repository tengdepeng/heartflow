# 计时器「一进应用就自动开始」Bug — 根因与修复

> 审查结论：这是一个**极性反转的真 bug**，不是用户配置问题。已修复并真机复现验证。

## 现象
进入应用首页（Home）瞬间，专注计时器已经处于运行状态（`isRunning:true`），而不是等待用户点击才开始。

## 真机复现（消除 agent 回合延迟）
脚本 `_repro_timer.cjs`：spawn `heartflow.exe` → 等待 9222 调试端口 + page target → 等 2.5s 挂载完成 → 经 `#app.__vue_app__.config.globalProperties.$pinia` 直接读 timer/config store → taskkill 清理。

| 时机 | isRunning | elapsed | status |
|---|---|---|---|
| **修复前** | `true` | `1803` | `focusing` |
| **修复后** | `false` | `0` | `idle` |

`elapsed≈1803` 等于挂载后约 1.8 秒 → 确证是**挂载那一刻被启动**，非遗留会话。

## 根因（极性反转）
1. **默认宪法** `elastic-exploration`（"按需开启"，默认启用，第5条）对 `timer:auto-start` 产生 `type:'disable'`，语义是 *"计时器不自动开始，等待用户触发"*（`engine/constitution-effects.ts:107-113`）。
2. 但 `engine/constitution-effect.ts` 的映射 `'timer:auto-start': { invert: true }` 在 `applyToComplianceOverride()` 里算成 `overrideValue = hasDisableEffect = true` → **`complianceOverride.autoStartOverwrite` 被算成 `true`**。即"不要自动开始"被反转成"允许自动开始"。
3. `views/Home.vue` 旧的 `onMounted` 把 `autoStartOverwrite === true` 当成"允许自动开始"去调用 `timer.start()` → **一进应用就自动计时**。

附带问题：该引擎在初始化时**用宪法规则覆写 `complianceOverride`**，与"complianceOverride 是用户显式覆盖、优先级高于宪法规则"的设计声明相反；且 `constitution-effect.ts:191` 的注释与代码极性也写反了。

## 修复
`views/Home.vue` 移除 `onMounted` 中的自动启动块：

```ts
onMounted(() => {
  attach()
  // 计时器默认不自动开始：必须由用户显式点击才开始。
  // constitution-effect 对 timer:auto-start 的 invert 极性当前是反的，
  // 会把宪法「不自动开始」默认规则算成 autoStartOverwrite=true，故此处不再依赖该标志自动 start。
})
```

计时器回归正确行为：进入首页待命，用户点击才开始；`toggle()` / `start()` / `pause()` / `resume()` 等显式操作完全不受影响。

## 遗留次级问题（已说明，未改）
`autoStartOverwrite` 的极性反转 + 引擎 clobber 仍存在，导致 `Constitution.vue` 的「允许计时器默认自动开始」开关目前**失效/被覆盖**（即便用户勾选，启动也会被引擎覆盖回 `true`）。若要让该开关真正可用，需单独重构：
- (a) 修正 `timer:auto-start` 映射极性，使默认宪法 → `autoStartOverwrite=false`；
- (b) 停止 `applyToComplianceOverride` 覆写 `autoStartOverwrite`，让"用户显式覆盖"语义成立。

该重构涉及 advisor / notification / haptic 共享函数，风险需单独评估，未纳入本次修复。

## 验证脚本
`_repro_timer.cjs`（spawn exe + CDP 直连读 Pinia）可作为计时器自动启动的回归探针复用。
