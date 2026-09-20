// ============================================================
// 心流工坊 · 宪法效果消费映射（A2.1 · 单一事实源）
// 枚举全部 45 个 EffectTarget，逐条标注「是否被运行时真实消费」及消费位置。
// 与 engine/constitution-effects.ts 的 CONSUMED_TARGETS 保持一致的「真实消费」语义，
// 本表为可审计、可 grep 的权威清单：宪法编辑器据此给每条条款标
// 「生效中 / 声明式·不影响运行时」，避免用户误以为所有开关都会改变产品。
//
// 消费机制（mechanism）说明：
// - css-var：引擎 applyConstitutionVisualEffects() 写入 --hf-* 全局变量，组件/CSS 读取
// - composable：独立 composable 订阅 isTargetActive 后驱动 overlay/class
// - compliance-override：引擎 EFFECT_TO_OVERRIDE_MAP 推导 complianceOverride，由治理门控/say() 消费
// - module-gate：业务模块直接 isTargetActive 门控关键路径
// - pending：DEFAULT_EFFECT_MAP 已声明效果，但暂无组件/override 读取（声明式，开关不改运行时）
// - declared：经诚实审计「无对应可门控运行时特征/逻辑」，确认不影响运行时，账本封口；
//   与 pending 区别——pending 表示「尚未审计/接线」，declared 表示「已审计、确认无门控、诚实声明式」。
//   declared 在状态层恒渲染为「声明式」，永不显示「生效中」（名实诚实，不伪造宪法之实）。
//
// 现状（2026-08-18 任务②持续翻转）：42 个目标全部已解析（consumed:true）——其中 28 个经运行时真实消费
// （css-var/composable/compliance-override/module-gate），14 个经诚实审计确认无真实门控可接、标 declared
// （scene:preset / timer:pause-interval / gesture:haptic / focus:interrupt / focus:return /
// data:unfinished / behavior:tracking / emotion:neutral / relation:unbounded / note:auto-categorize /
// note:fragment / stats:comparison / sanctuary:enable / sanctuary:auto-exit）；pending（待审计）计数归零。
// ============================================================

import type { EffectTarget } from '../../engine/constitution-effects'
import { getTargetLabel } from '../../engine/constitution-effect'

/** 效果作用形态（用于分类与文档） */
export type EffectForm =
  | 'visual'      // 视觉/氛围（CSS 变量 / overlay）
  | 'behavior'    // 行为/交互
  | 'data'        // 数据/记录呈现
  | 'identity'    // 幕僚身份/表达
  | 'sharing'     // 传递/分享边界

/** 运行时消费机制 */
export type EffectMechanism =
  | 'css-var'
  | 'composable'
  | 'compliance-override'
  | 'module-gate'
  | 'pending'
  | 'declared'

/** 单条消费记录 */
export interface EffectConsumer {
  target: EffectTarget
  /** 中文标签（复用引擎 getTargetLabel，避免标签重复定义） */
  label: string
  form: EffectForm
  /** 是否已被运行时真实消费（决定「宪法之实」诚实度） */
  consumed: boolean
  mechanism: EffectMechanism
  /** 实际消费位置（文件），pending 时为占位 */
  consumer: string
  /** 备注：接线批次 / 待办说明 */
  note?: string
}

// ---- 已消费（运行时真实消费）----
// 视觉：CSS 变量
// 氛围：composable
// 治理：compliance-override
// 模块：module-gate

export const EFFECT_CONSUMER_MAP: EffectConsumer[] = [
  // ===== 视觉 / 氛围（css-var / composable）=====
  { target: 'ui:particle-density', label: getTargetLabel('ui:particle-density'), form: 'visual', consumed: true, mechanism: 'composable', consumer: 'components/CanvasParticles.vue（--hf-particle-density css-var）+ modules/canvas/CanvasRoom.vue（getEffectMultiplier composable）', note: 'A2.3 批1 已接线' },
  { target: 'ui:animate-speed', label: getTargetLabel('ui:animate-speed'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'assets/animations.css', note: 'A2.3 批1 已接线' },
  { target: 'ui:breathing-speed', label: getTargetLabel('ui:breathing-speed'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'views/HomeSpace.vue + modules/breathing/breathing-core.ts', note: 'A2.3 批1 已接线' },
  { target: 'ui:silence', label: getTargetLabel('ui:silence'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'components/CanvasParticles.vue', note: 'A2.3 批1 已接线' },
  { target: 'ui:empty-space', label: getTargetLabel('ui:empty-space'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'views/HomeSpace.vue', note: 'A2.3 批1 已接线' },
  { target: 'scene:transition', label: getTargetLabel('scene:transition'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'views/HomeSpace.vue', note: 'A2.3 批1 已接线' },
  { target: 'scene:night-dim', label: getTargetLabel('scene:night-dim'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'engine/constitution-effect.ts(applyConstitutionVisualEffects→:root) + views/App.vue(.night-dim-overlay.active opacity)', note: '死接线已修复：宪法引擎注入强度倍率，App.vue 叠层 opacity 消费之' },
  { target: 'scene:sabbath', label: getTargetLabel('scene:sabbath'), form: 'visual', consumed: true, mechanism: 'css-var', consumer: 'engine/constitution-effect.ts(applyConstitutionVisualEffects→:root) + views/App.vue(.sabbath-overlay.active opacity)', note: '死接线已修复：宪法引擎注入强度倍率，App.vue 叠层 opacity 消费之' },
  { target: 'scene:preset', label: getTargetLabel('scene:preset'), form: 'visual', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：场景预设切换无对应可门控运行时特征——经实测场景预设特性已存在（装修工坊背景预设 CRUD：engine/storage/scene-preset.ts + CraftScenePresets.vue，scene-preset.test 全绿），本质为用户主动操作（保存/应用预设）、非宪法效果目标，无 isTargetActive 门控点；故永久诚实声明式·不影响宪法运行时·不伪造宪法之实【已存在特性·用户操作·非宪法效果目标·永久诚实声明】' },

  // ===== 幕僚身份 / 表达（compliance-override / module-gate）=====
  { target: 'advisor:enabled', label: getTargetLabel('advisor:enabled'), form: 'identity', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → advisorEnabled', note: 'A2.3 治理门控已消费' },
  { target: 'advisor:forbidden-patterns', label: getTargetLabel('advisor:forbidden-patterns'), form: 'identity', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → forbiddenPatterns', note: 'A2.3 治理门控已消费' },
  { target: 'advisor:comparative', label: getTargetLabel('advisor:comparative'), form: 'identity', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → comparativePhrases', note: 'A2.3 治理门控已消费' },
  { target: 'advisor:personification', label: getTargetLabel('advisor:personification'), form: 'identity', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → personification', note: 'A2.3 治理门控已消费' },
  { target: 'advisor:long-dormancy', label: getTargetLabel('advisor:long-dormancy'), form: 'identity', consumed: true, mechanism: 'composable', consumer: 'modules/advisor/longDormancy.ts + composables/useLongDormancy.ts', note: 'A2.3 已接线' },

  // ===== 行为 / 交互（compliance-override / pending）=====
  { target: 'timer:auto-start', label: getTargetLabel('timer:auto-start'), form: 'behavior', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → autoStartOverwrite', note: 'A2.3 治理门控已消费' },
  { target: 'timer:pause-interval', label: getTargetLabel('timer:pause-interval'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: '决策已定（2026-08-18）：维持诚实声明式、永不建主动微休息提醒——基础 pause/resume 已兑现「允许暂停」宪法承诺（无强制连续走时）；主动提醒违背「心流第一·不主动打扰」且不符「新自动行为默认关闭」纪律。无运行时门控，诚实声明式·不影响运行时【决策已定·永久诚实声明·永不建】' },
  { target: 'haptic:feedback', label: getTargetLabel('haptic:feedback'), form: 'behavior', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → hapticFeedbackOverwrite', note: 'A2.3 治理门控已消费' },
  { target: 'ui:notification', label: getTargetLabel('ui:notification'), form: 'behavior', consumed: true, mechanism: 'compliance-override', consumer: 'engine/constitution-effect.ts (EFFECT_TO_OVERRIDE_MAP) → notificationBlocked + modules/touchpoints/push-channel.ts:356 (getEffectMultiplier)', note: 'A2.3 治理门控 + 推送通道已消费' },
  { target: 'gesture:enable', label: getTargetLabel('gesture:enable'), form: 'behavior', consumed: true, mechanism: 'composable', consumer: 'composables/useGesture.ts (attach 门控 isTargetActive)', note: 'A2.3 批2 已接线（复用 elastic-exploration）' },
  { target: 'gesture:haptic', label: getTargetLabel('gesture:haptic'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：手势触觉反馈无对应可门控运行时特征（haptic:feedback 已由治理门控消费，gesture:haptic 独立无消费点），诚实声明式·不影响运行时·不伪造宪法之实' },
  { target: 'focus:auto-start', label: getTargetLabel('focus:auto-start'), form: 'behavior', consumed: true, mechanism: 'module-gate', consumer: 'stores/timer.ts (setMode 自动开始门控)', note: 'A2 批① 已接线：disable 型默认约束生效→不自动开始；用户关闭约束后 setMode 自动开始计时' },
  { target: 'focus:interrupt', label: getTargetLabel('focus:interrupt'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·基础 UX 已保障·已封口）', note: 'A2 账本封口：interrupt() 始终允许中断，基础 UX 已无条件保障「允许中断」自主权；接入反向门控（关闭即禁止中断）会制造宪法陷阱、剥夺用户中断权，故诚实声明式·不影响运行时【决策已定·永久诚实声明·永不建】' },
  { target: 'focus:return', label: getTargetLabel('focus:return'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·基础 UX 已保障·已封口）', note: 'A2 账本封口：基础 UX 已提供专注返回/再进入入口（resumeFromSanctuary / UI 入口），「返回入口」自主权已由基础交互保障；接入反向门控（关闭即隐藏返回）会剥夺用户返回能力，故诚实声明式·不影响运行时【决策已定·永久诚实声明·永不建】' },

  // ===== 数据 / 记录呈现（pending）=====
  { target: 'data:auto-archive', label: getTargetLabel('data:auto-archive'), form: 'data', consumed: true, mechanism: 'module-gate', consumer: 'modules/archive/auto-archive.ts（runAutoArchive 门控 isTargetActive；默认 elastic-eternal 禁用→零动作）', note: '任务②落地：自动归档特性已建（modules/archive/auto-archive.ts + useAutoArchive.ts）。由默认 elastic-eternal「数据不自动归档」disable 规则门控——仅当用户显式启用 data:auto-archive 才按 90 天阈值自动归档留光阁冥想/释怀 + 笔记（第34条归档而非删除），本地审计日志、可逆、纯本地零网络；默认关闭→绝不静默动数据。mechanism 由 declared→module-gate，与引擎 CONSUMED_TARGETS 同步。' },
  { target: 'data:cleanup', label: getTargetLabel('data:cleanup'), form: 'data', consumed: true, mechanism: 'module-gate', consumer: 'modules/data-sovereignty/manual-cleanup.ts（isCleanupEnabled 门控；默认 elastic-safety 禁用→入口不渲染）', note: '任务② B 类样板落地：手动数据整理特性已建（modules/data-sovereignty/manual-cleanup.ts + components/DataCleanupPanel.vue）。由默认 elastic-safety「不自动清理历史数据」disable 规则门控——仅当用户显式启用 data:cleanup 才出现「逐项勾选+显式确认」入口，列出超期已完成会话、软归档（标记 archived、可还原、非硬删）、纯本地零网络、绝不自动运行；默认关闭→入口不渲染。mechanism 由 declared→module-gate，与引擎 CONSUMED_TARGETS 同步。' },
  { target: 'data:unfinished', label: getTargetLabel('data:unfinished'), form: 'data', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：经诚实审计无对应可门控特征（仅手动 confirmCleanup，无 force-complete/auto-archive 逻辑），诚实声明式·不影响运行时·不伪造宪法之实【决策已定·永久诚实声明·永不建】' },
  { target: 'behavior:tracking', label: getTargetLabel('behavior:tracking'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：行为追踪无对应可门控运行时逻辑（无 tracking 实现），诚实声明式·不影响运行时·不伪造宪法之实' },
  { target: 'behavior:reminder', label: getTargetLabel('behavior:reminder'), form: 'behavior', consumed: true, mechanism: 'module-gate', consumer: 'modules/anchor/celebration.ts (checkReminders 门控默认诱导型提醒 time/idle/streak)', note: 'A2 批② 已接线：isTargetActive 活跃时抑制 App 默认诱导型提醒（固定频率/因间隔/鼓励），用户自建规则不受影响，不造宪法陷阱' },
  { target: 'emotion:visualization', label: getTargetLabel('emotion:visualization'), form: 'data', consumed: true, mechanism: 'composable', consumer: 'views/EmotionGarden.vue (trend/calendar sections v-if 门控 isTargetActive)', note: 'A2.3 批3 已接线（情绪可视化显隐受宪法条款门控，默认启用零行为变化）' },
  { target: 'emotion:neutral', label: getTargetLabel('emotion:neutral'), form: 'data', consumed: true, mechanism: 'composable', consumer: "views/EmotionGarden.vue (ambient mood tint gated by isTargetActive('emotion:neutral')；启用后去除冷暖/明暗倾向性辉光，落实第4条只呈现不评判)", note: '任务②落地：情绪中性呈现特性已建（views/EmotionGarden.vue 根容器 ambient 类受 isTargetActive 门控）。启用宪法条款 emotion:neutral 后，情绪花房以均匀中性辉光呈现，去除 warm/bright/dim 倾向性着色——直接服务第4条「只呈现不评判」。默认关闭→保持原有氛围辉光，零行为变化。mechanism 由 declared→composable，与引擎 CONSUMED_TARGETS 同步。' },
  { target: 'relation:auto-analyze', label: getTargetLabel('relation:auto-analyze'), form: 'data', consumed: true, mechanism: 'composable', consumer: 'modules/relation/bond-bridge.ts (bondRecommendations 门控 isTargetActive；disable 型默认抑制自动分析)', note: 'A2.3 批3 已接线（自动分析推荐受宪法条款门控，默认抑制、用户关闭约束后放开）' },
  { target: 'relation:unbounded', label: getTargetLabel('relation:unbounded'), form: 'data', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：关系留白无对应可门控运行时特征（关系数据未做自动分析即天然留白，relation:auto-analyze 已消费），诚实声明式·不影响运行时·不伪造宪法之实【决策已定·永久诚实声明·永不建】' },
  { target: 'note:auto-categorize', label: getTargetLabel('note:auto-categorize'), form: 'data', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：笔记自动分类无对应可门控运行时逻辑（无 auto-categorize 实现），诚实声明式·不影响运行时·不伪造宪法之实' },
  { target: 'note:fragment', label: getTargetLabel('note:fragment'), form: 'data', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：片段记录无对应可门控运行时特征（笔记已支持片段形式，无宪法门控点），诚实声明式·不影响运行时·不伪造宪法之实' },
  { target: 'stats:comparison', label: getTargetLabel('stats:comparison'), form: 'data', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：统计比较性展示无对应可门控组件（无排行/比较 UI），第51条禁攀比由 elastic-no-comparison 约束，诚实声明式·不影响运行时·不伪造宪法之实【决策已定·永久诚实声明·永不建】' },
  { target: 'stats:show-panel', label: getTargetLabel('stats:show-panel'), form: 'data', consumed: true, mechanism: 'composable', consumer: 'components/StatsPanel.vue (root v-if 门控 isTargetActive)', note: 'A2.3 批3 已接线（统计面板显隐受宪法条款门控，默认启用零行为变化）' },

  // ===== 安全岛（pending）=====
  { target: 'sanctuary:enable', label: getTargetLabel('sanctuary:enable'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·规则级 elastic-sanctuary 门控·非 isTargetActive 运行时）', note: 'A2 账本封口：安全岛可用性由规则级 useRuleEnabled("elastic-sanctuary") 门控（非 isTargetActive 效果目标系统），诚实声明式·不影响「效果目标」运行时；与引擎 CONSUMED_TARGETS 一致（不在其中）【决策已定·永久诚实声明·永不建】' },
  { target: 'sanctuary:auto-exit', label: getTargetLabel('sanctuary:auto-exit'), form: 'behavior', consumed: true, mechanism: 'declared', consumer: '（诚实声明式·无运行时门控·已封口）', note: 'A2 账本封口：安全岛自动退出仅类型联合占位（DEFAULT_EFFECT_MAP 无效果条目、无消费点），诚实声明式·不影响运行时·不伪造宪法之实【决策已定·永久诚实声明·永不建】' },

  // ===== 传递 / 分享边界（module-gate）=====
  { target: 'share:local-only', label: getTargetLabel('share:local-only'), form: 'sharing', consumed: true, mechanism: 'module-gate', consumer: 'modules/share/share-local.ts', note: 'A2.3 已接线' },
  { target: 'seed:inherit', label: getTargetLabel('seed:inherit'), form: 'sharing', consumed: true, mechanism: 'module-gate', consumer: 'modules/play/seed-transfer.ts', note: 'A2.3 已接线' },
  { target: 'seed:scope', label: getTargetLabel('seed:scope'), form: 'sharing', consumed: true, mechanism: 'module-gate', consumer: 'modules/play/seed-transfer.ts', note: 'A2.3 已接线' },
  { target: 'seed:revoke', label: getTargetLabel('seed:revoke'), form: 'sharing', consumed: true, mechanism: 'module-gate', consumer: 'modules/play/seed-transfer.ts', note: 'A2.3 已接线' },

  // ===== v21.3 依蓝图回补的 3 个新目标（待接线·诚实 pending）=====
  { target: 'perception:enabled', label: getTargetLabel('perception:enabled'), form: 'behavior', consumed: true, mechanism: 'module-gate', consumer: 'stores/perception.ts（setEnvironment/patchEnvironment 经 maskUnauthorizedPerception 按 authorizedDimensions 逐项遮蔽未授权维度）', note: 'v21.3 第43条「感知的边界」已接线：感知 store 唯一写入点按时逐项授权遮蔽。设置 UI 经 setDimensionAuthorized 控制授权集' },
  { target: 'advisor:restraint', label: getTargetLabel('advisor:restraint'), form: 'identity', consumed: true, mechanism: 'module-gate', consumer: 'modules/advisor/restraint.ts（advisorActionAllowed）→ commandExecutor.runAction 顶部拦截代执行动作', note: 'v21.3 第44条「幕僚的克制」已接线：commandExecutor 在落地前经 advisorActionAllowed 校验，受限动作(send/trade/external-interact)在克制生效时被拦截' },
  { target: 'data:forget', label: getTargetLabel('data:forget'), form: 'data', consumed: true, mechanism: 'module-gate', consumer: 'modules/data-sovereignty/sovereignty-engine.ts（executeForgetting 顶部 isTargetActive 拦截）', note: 'v21.3 第45条「遗忘的权利」已接线：遗忘引擎 executeForgetting 在遗忘权(data:forget)关闭时早返回 success:false，老化/封存/释放/冬眠/仪式全受控' },
]

/**
 * 运行时真实消费目标集合（与引擎 CONSUMED_TARGETS 语义一致：仅含经 isTargetActive 运行时消费的目标）。
 * 注意：consumed:true 含「运行时消费」与「诚实声明式 declared」两类；declared 项无运行时效果，
 * 故此处排除，使 CONSUMED_TARGET_SET 与引擎 CONSUMED_TARGETS 保持同一「运行时真实消费」语义，
 * 供 ruleHasRuntimeEffect 等诚实判定复用——避免把声明式项误判为「有运行时效果」。
 */
export const CONSUMED_TARGET_SET: ReadonlySet<EffectTarget> = new Set(
  EFFECT_CONSUMER_MAP.filter(c => c.consumed && c.mechanism !== 'declared').map(c => c.target),
)

/** 按 target 取消费记录 */
export function getEffectConsumer(target: EffectTarget): EffectConsumer | undefined {
  return EFFECT_CONSUMER_MAP.find(c => c.target === target)
}

/** 未接线目标（声明式·不影响运行时），供进度跟踪 */
export function getPendingTargets(): EffectConsumer[] {
  return EFFECT_CONSUMER_MAP.filter(c => !c.consumed)
}
