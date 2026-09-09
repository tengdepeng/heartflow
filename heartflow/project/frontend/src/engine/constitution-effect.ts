// ============================================================
// 心流工坊 · 宪法效果引擎
// 监听宪法规则状态变化，自动应用/恢复产品行为效果
// 与 complianceOverride 联动，确保开关真正影响产品
// ============================================================

import { watch } from 'vue'
import { useConstitutionStore, DEFAULT_ELASTIC_RULES } from '../stores/constitution'
import { useConfigStore } from '../stores/config'
import type { MutableRule } from '../types'
import {
  type ConstitutionEffect,
  type EffectTarget,
  getActiveEffects,
  groupEffectsByTarget,
  DEFAULT_EFFECT_MAP,
} from './constitution-effects'

// ---- 事件系统 ----

export type EffectEventType = 'effect-applied' | 'effect-reverted' | 'rule-toggled'

export interface EffectEvent {
  type: EffectEventType
  ruleId: string
  ruleTitle: string
  effects: ConstitutionEffect[]
  timestamp: number
}

type EffectListener = (event: EffectEvent) => void

const listeners = new Set<EffectListener>()

export function onEffectEvent(listener: EffectListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify(event: EffectEvent): void {
  for (const listener of listeners) {
    listener(event)
  }
}

// ---- 效果应用 ----

/** 宪法效果状态快照 */
export interface ConstitutionEffectState {
  /** 按目标分组的效果状态 */
  targetStates: Map<EffectTarget, {
    active: boolean
    effects: ConstitutionEffect[]
    sources: string[]  // 来源规则标题列表
  }>
  /** 活跃效果总数（= 当前激活的 ConstitutionEffect 条数，同 target 多 effect 会分别计数；与 targetStates.size 去重后的目标数语义不同） */
  activeEffectCount: number
  /** 已启用的规则 ID 列表 */
  enabledRuleIds: string[]
  /** 时间戳 */
  updatedAt: number
}

let currentEffectState: ConstitutionEffectState = {
  targetStates: new Map(),
  activeEffectCount: 0,
  enabledRuleIds: [],
  updatedAt: Date.now(),
}

/**
 * 默认生效目标集合：宪法弹性条款默认全启用 → 其映射目标默认处于活跃基准态。
 * 仅在引擎尚未按真实规则初始化（isInitialized=false）时作为 isTargetActive 的回落，
 * 避免默认应开启的运行时功能（如 gesture:enable 手势导航）在 initConstitutionEffect
 * 之前被误判为关闭（子组件 onMounted 早于 App.vue 的引擎初始化）。
 * getEffectValue / getEffectMultiplier 仍保持「未激活即中性」语义，不在此范围。
 */
const defaultActiveTargets: Set<EffectTarget> = new Set(
  getActiveEffects(DEFAULT_ELASTIC_RULES).map((e) => e.target),
)

// 预建「目标 → 效果」索引（DEFAULT_EFFECT_MAP 为静态常量），避免每次规则切换都全量重扫 50+ 映射。
const EFFECTS_BY_TARGET: Map<EffectTarget, ConstitutionEffect[]> = groupEffectsByTarget(DEFAULT_EFFECT_MAP)

// 引擎未初始化时的回落基准：默认弹性条款激活的「目标 → 效果」快照，
// 供 getTargetEffectState 与 isTargetActive 共享同一 fallback 真源（消除两套查询语义分歧）。
const defaultTargetEffects: Map<EffectTarget, ConstitutionEffect[]> = groupEffectsByTarget(
  getActiveEffects(DEFAULT_ELASTIC_RULES),
)

/** 计算宪法效果状态 */
function computeEffectState(rules: MutableRule[]): ConstitutionEffectState {
  // 预建 id→rule 索引，消除下方对每个 effect 做一次 O(n) 线性查找的 O(n²) 开销。
  const ruleMap = new Map(rules.map(r => [r.id, r]))
  const enabledRules = rules.filter(r => r.enabled)
  const enabledRuleIds = enabledRules.map(r => r.id)
  const activeEffects = getActiveEffects(rules)

  // 按目标分组
  const targetStates = new Map<EffectTarget, {
    active: boolean
    effects: ConstitutionEffect[]
    sources: string[]
  }>()

  for (const effect of activeEffects) {
    const existing = targetStates.get(effect.target) ?? {
      active: true,
      effects: [],
      sources: [],
    }
    existing.effects.push(effect)
    // 经预建索引取来源规则标题（O(1)）
    const rule = ruleMap.get(effect.ruleId)
    if (rule && !existing.sources.includes(rule.title)) {
      existing.sources.push(rule.title)
    }
    targetStates.set(effect.target, existing)
  }

  return {
    targetStates,
    activeEffectCount: activeEffects.length,
    enabledRuleIds,
    updatedAt: Date.now(),
  }
}

/** 获取当前效果状态快照 */
export function getEffectState(): ConstitutionEffectState {
  return currentEffectState
}

/** 获取指定目标的效果详情 */
export function getTargetEffectState(target: EffectTarget): {
  active: boolean
  effects: ConstitutionEffect[]
  sources: string[]
} {
  const hit = currentEffectState.targetStates.get(target)
  if (hit) return hit
  // 引擎尚未按真实规则初始化时，回落默认基准态（与 isTargetActive 共用 defaultTargetEffects），
  // 避免两套查询对同一 target 给出矛盾结论（isTargetActive=true 但 getTargetEffectState=空）。
  if (!isInitialized) {
    const effs = defaultTargetEffects.get(target)
    if (effs) return { active: true, effects: effs, sources: [] }
  }
  return { active: false, effects: [], sources: [] }
}

/** 检查指定目标是否活跃 */
export function isTargetActive(target: EffectTarget): boolean {
  if (currentEffectState.targetStates.has(target)) return true
  // 引擎尚未按真实规则初始化时，回落到「宪法弹性条款默认全启用」基准态，
  // 避免默认应开启的运行时功能（如手势导航）在 initConstitutionEffect 前被误判关闭。
  if (!isInitialized) return defaultActiveTargets.has(target)
  return false
}

/** 宪法效果引擎是否已初始化（currentEffectState 已根据规则计算） */
export function isConstitutionEffectReady(): boolean {
  return isInitialized
}

/**
 * 取指定效果目标下的数值参数（来自 set / reduce / increase 类型的活跃效果）
 * - set：直接返回设定的 value（数字）
 * - reduce/increase：返回 value 作为相对系数（reduce<1 表示降低，increase>1 表示提升）
 * - enable/disable：返回 null（无数值参数）
 * 多个效果叠加时取最后一个有效值（宪法编辑器中同目标多规则冲突由用户解决，运行期取最新）
 */
export function getEffectValue(target: EffectTarget): number | null {
  const info = currentEffectState.targetStates.get(target)
  if (!info) return null
  for (let i = info.effects.length - 1; i >= 0; i--) {
    const e = info.effects[i]
    if (typeof e.value === 'number' && (e.type === 'set' || e.type === 'reduce' || e.type === 'increase')) {
      return e.value
    }
  }
  return null
}

/**
 * 取指定目标的多plier（倍率）表示
 * - reduce 类型：value 直接作为倍率（0.5 表示降至 50%）
 * - increase 类型：value 作为倍率（2 表示提升至 200%）
 * - set 类型：value 作为绝对倍率
 * - 未激活 / 无数值：返回 1（不改变基准）
 * 语义统一为「乘法系数」，便于 UI 层直接乘到基准值上。
 */
export function getEffectMultiplier(target: EffectTarget): number {
  const v = getEffectValue(target)
  return v === null ? 1 : v
}

// ---- complianceOverride 联动 ----

/**
 * 宪法效果 → complianceOverride 映射
 * 当宪法规则启用时，自动设置对应的 complianceOverride 值
 * 注意：complianceOverride 是用户显式覆盖，优先级高于宪法规则
 */
/**
 * 宪法效果目标 → complianceOverride 字段映射
 * 显式声明宪法 enable / disable 效果分别推导出的 override 值。
 * 语义：override 字段 = 用户允许「跳过/开启」某项合规检测或默认行为。
 *   - whenEnabled：宪法该目标存在 enable 效果（允许该行为/关闭检测）→ 推导值
 *   - whenDisabled：宪法该目标存在 disable 效果（禁止该行为/开启检测）→ 推导值
 * 推导规则：仅 disable → whenDisabled；仅 enable → whenEnabled；两者皆有 → 取最严格(whenDisabled)；
 *           无对应宪法效果 → 不覆盖（保留 DEFAULT_CONFIG 默认或用户显式值）。
 */
export const EFFECT_TO_OVERRIDE_MAP: Partial<Record<EffectTarget, {
  key: keyof import('../types').AppConfig['complianceOverride']
  whenEnabled: boolean
  whenDisabled: boolean
}>> = {
  'advisor:enabled': {
    key: 'advisorEnabled',
    whenEnabled: true,   // 宪法允许幕僚主动问候 → 开启
    whenDisabled: false, // 宪法禁用主动问候（默认静默）→ 关闭
  },
  'advisor:forbidden-patterns': {
    key: 'forbiddenPatterns',
    whenEnabled: false,  // 宪法启用中立性检测 → 不开 override（检测生效）
    whenDisabled: true,  // 宪法禁用检测 → 允许评价性文案通过
  },
  'advisor:comparative': {
    key: 'comparativePhrases',
    whenEnabled: false,
    whenDisabled: true,
  },
  'advisor:personification': {
    key: 'personification',
    whenEnabled: false,
    whenDisabled: true,
  },
  'timer:auto-start': {
    key: 'autoStartOverwrite',
    whenEnabled: true,   // 宪法允许计时器自动开始 → 开启
    whenDisabled: false, // 宪法禁用自动开始（默认待命）→ 关闭
  },
  'haptic:feedback': {
    key: 'hapticFeedbackOverwrite',
    whenEnabled: true,   // 宪法允许触觉反馈 → 开启
    whenDisabled: false, // 宪法禁用触觉 → 关闭
  },
  'ui:notification': {
    key: 'notificationBlocked',
    whenEnabled: false,  // 宪法允许通知 → 不阻断
    whenDisabled: true,  // 宪法禁用主动推送（无推送）→ 阻断
  },
}

/**
 * 应用宪法规则效果到 complianceOverride
 * 规则启用 → 计算默认 complianceOverride 值
 * 规则禁用 → 恢复默认 complianceOverride 值
 */
function applyToComplianceOverride(
  rules: MutableRule[],
  configStore: ReturnType<typeof useConfigStore>,
): void {
  const complianceOverride = configStore.config?.complianceOverride
  if (!complianceOverride) return

  const enabledIds = new Set(rules.filter(r => r.enabled).map(r => r.id))

  for (const [target, mapping] of Object.entries(EFFECT_TO_OVERRIDE_MAP)) {
    if (!mapping) continue

    // 经预建索引取该目标下的宪法效果（避免每次规则切换全量重扫 DEFAULT_EFFECT_MAP）
    const effects = (EFFECTS_BY_TARGET.get(target as EffectTarget) ?? []).filter(
      e => enabledIds.has(e.ruleId),
    )
    const hasDisable = effects.some(e => e.type === 'disable')
    const hasEnable = effects.some(e => e.type === 'enable')

    // 推导 override 值：仅 enable → whenEnabled；仅 disable → whenDisabled；
    // 两者冲突 → 取最严格（disable 优先）；无对应宪法效果 → 不覆盖默认。
    let overrideValue: boolean | null = null
    if (hasEnable && !hasDisable) overrideValue = mapping.whenEnabled
    else if (hasDisable && !hasEnable) overrideValue = mapping.whenDisabled
    else if (hasEnable && hasDisable) overrideValue = mapping.whenDisabled

    if (overrideValue === null) continue // 无宪法效果：保留默认/用户值

    const currentValue = complianceOverride[mapping.key]
    if (currentValue === overrideValue) continue // 已是推导值，无需改动
    if (configStore.isOverrideUserTouched(mapping.key)) continue // 用户显式设置优先，不覆盖

    // 仅用引擎推导写入（不标记为用户触碰），以便用户后续手动覆盖仍可生效
    configStore.applyDerivedComplianceOverride(mapping.key, overrideValue)
  }
}

// ---- 引擎初始化 ----

let isInitialized = false

/**
 * 初始化宪法效果引擎
 * 在 App.vue 的 onMounted 中调用
 */
export function initConstitutionEffect(): () => void {
  if (isInitialized) {
    return () => {} // 已初始化，返回空清理函数
  }
  isInitialized = true

  const constitutionStore = useConstitutionStore()
  const configStore = useConfigStore()

  // 初始计算效果状态（各步骤独立隔离，单步失败不影响其余，避免畸形规则数据拖垮首屏初始化链）
  try {
    currentEffectState = computeEffectState(constitutionStore.mutableRules)
  } catch (err) {
    console.error('[宪法引擎] 计算效果状态失败', err)
  }
  try {
    applyToComplianceOverride(constitutionStore.mutableRules, configStore)
  } catch (err) {
    console.error('[宪法引擎] 应用 complianceOverride 失败', err)
  }
  try {
    applyConstitutionVisualEffects()
  } catch (err) {
    console.error('[宪法引擎] 应用视觉效果失败', err)
  }

  // 监听宪法规则变化
  const stopWatch = watch(
    () => constitutionStore.mutableRules.map(r => ({
      id: r.id,
      enabled: r.enabled,
      title: r.title,
    })),
    (newRules, oldRules) => {
      // 找出变化了的规则
      const oldMap = new Map(oldRules.map(r => [r.id, r]))
      const changedRules: { id: string; title: string; oldEnabled: boolean; newEnabled: boolean }[] = []

      for (const rule of newRules) {
        const old = oldMap.get(rule.id)
        if (old && old.enabled !== rule.enabled) {
          changedRules.push({
            id: rule.id,
            title: rule.title,
            oldEnabled: old.enabled,
            newEnabled: rule.enabled,
          })
        }
      }

      if (changedRules.length === 0) return

      // 更新效果状态（单步隔离，避免任一环节抛错中断整轮刷新）
      try {
        currentEffectState = computeEffectState(constitutionStore.mutableRules)
      } catch (err) {
        console.error('[宪法引擎] 计算效果状态失败', err)
      }

      // 应用到 complianceOverride
      try {
        applyToComplianceOverride(constitutionStore.mutableRules, configStore)
      } catch (err) {
        console.error('[宪法引擎] 应用 complianceOverride 失败', err)
      }
      try {
        applyConstitutionVisualEffects()
      } catch (err) {
        console.error('[宪法引擎] 应用视觉效果失败', err)
      }

      // 通知事件
      for (const changed of changedRules) {
        const effects = DEFAULT_EFFECT_MAP.filter(e => e.ruleId === changed.id)
        notify({
          type: changed.newEnabled ? 'effect-applied' : 'effect-reverted',
          ruleId: changed.id,
          ruleTitle: changed.title,
          effects,
          timestamp: Date.now(),
        })
      }
    },
    { deep: true },
  )

  // 返回清理函数
  return () => {
    stopWatch()
    isInitialized = false
  }
}

/**
 * 手动刷新宪法效果（当规则被外部修改时调用）
 */
export function refreshConstitutionEffect(): void {
  const constitutionStore = useConstitutionStore()
  const configStore = useConfigStore()

  currentEffectState = computeEffectState(constitutionStore.mutableRules)
  applyToComplianceOverride(constitutionStore.mutableRules, configStore)
  // 同步刷新视觉宪法层（此前遗漏：手动刷新只更新 state + complianceOverride，漏掉 CSS 变量，
  // 导致依赖 --hf-* 的组件在显式 refresh 后视觉陈旧）。与 init / watch 路径保持一致。
  applyConstitutionVisualEffects()
}

// ---- 视觉宪法效果接线层（宪法之实 · 视觉/氛围维度）----

/**
 * 宪法视觉效果 → 全局 CSS 变量接线
 * 把视觉类 EffectTarget 的宪法状态写入 document.documentElement 的 --hf-*
 * 自定义属性，供各组件 / 动画零侵入消费。仅在对应宪法条款启用时偏离默认，
 * 未启用则保持基准行为（各变量默认 1 / 0，见下方语义）。
 *   - ui:particle-density / ui:animate-speed / ui:breathing-speed /
 *     scene:transition：取 getEffectMultiplier（reduce/set 作为倍率，默认 1）
 *   - ui:empty-space / ui:silence：取是否活跃（enable → 1，否则 0）
 *
 * 这是「宪法之实」在视觉维度的最小且低风险接线：集中一处，覆盖多个目标，
 * 不侵入任何组件逻辑，组件只需在 CSS 中读取对应变量。
 */
export function applyConstitutionVisualEffects(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--hf-particle-density', String(getEffectMultiplier('ui:particle-density')))
  root.style.setProperty('--hf-animate-speed', String(getEffectMultiplier('ui:animate-speed')))
  root.style.setProperty('--hf-breathing-speed', String(getEffectMultiplier('ui:breathing-speed')))
  root.style.setProperty('--hf-scene-transition', String(getEffectMultiplier('scene:transition')))
  // 夜静调暗 / 数字安息日：强度倍率（默认 1，宪法 set/reduce/increase 可调）。
  // 由宪法引擎注入为唯一真源；composable 不再用 1/0 覆盖，App.vue 叠层 opacity 消费之。
  root.style.setProperty('--hf-night-dim', String(getEffectMultiplier('scene:night-dim')))
  root.style.setProperty('--hf-sabbath', String(getEffectMultiplier('scene:sabbath')))
  root.style.setProperty('--hf-empty-space', String(isTargetActive('ui:empty-space') ? 1 : 0))
  root.style.setProperty('--hf-silence', String(isTargetActive('ui:silence') ? 1 : 0))
}

// ---- 工具函数 ----

/** 获取效果目标的中文标签 */
export function getTargetLabel(target: EffectTarget): string {
  const labels: Record<EffectTarget, string> = {
    'advisor:enabled': '幕僚问候',
    'advisor:personification': '拟人化表达',
    'advisor:forbidden-patterns': '文案中立性',
    'advisor:comparative': '比较性文案',
    'timer:auto-start': '计时器自动开始',
    'timer:pause-interval': '暂停间隔',
    'haptic:feedback': '触觉反馈',
    'ui:particle-density': '粒子密度',
    'ui:notification': '通知频率',
    'ui:animate-speed': '动画速度',
    'ui:empty-space': '空白余量',
    'ui:silence': '静默留白',
    'ui:breathing-speed': '呼吸速度',
    'sanctuary:enable': '安全岛',
    'sanctuary:auto-exit': '安全岛自动退出',
    'data:auto-archive': '自动归档',
    'data:cleanup': '数据清理',
    'data:unfinished': '未完成状态',
    'behavior:tracking': '行为追踪',
    'behavior:reminder': '行为提醒',
    'emotion:visualization': '情绪可视化',
    'emotion:neutral': '情绪中性',
    'relation:auto-analyze': '关系分析',
    'relation:unbounded': '关系留白',
    'note:auto-categorize': '笔记自动分类',
    'note:fragment': '片段记录',
    'stats:comparison': '统计比较',
    'stats:show-panel': '统计面板',
    'gesture:enable': '手势导航',
    'gesture:haptic': '手势触觉',
    'focus:auto-start': '专注自动开始',
    'focus:interrupt': '允许中断',
    'focus:return': '返回入口',
    'scene:transition': '场景切换',
    'scene:preset': '场景预设',
    'share:local-only': '本地分享边界',
    'seed:inherit': '时间种子·遗传',
    'seed:scope': '时间种子·范围',
    'seed:revoke': '时间种子·收回',
    'scene:night-dim': '夜静调暗',
    'scene:sabbath': '数字安息日',
    'advisor:long-dormancy': '长眠守护',
    'perception:enabled': '感知逐项授权',
    'advisor:restraint': '幕僚克制',
    'data:forget': '遗忘四态',
  }
  return labels[target] ?? target
}

/** 获取效果类型的中文描述 */
export function getEffectTypeLabel(type: string, value?: number | string | boolean): string {
  switch (type) {
    case 'enable': return '启用'
    case 'disable': return '禁用'
    case 'reduce': return `降低至 ${value ?? ''}`
    case 'increase': return `提升至 ${value ?? ''}`
    case 'set': return `设为 ${value ?? ''}`
    default: return type
  }
}