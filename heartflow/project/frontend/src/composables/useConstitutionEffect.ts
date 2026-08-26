// ============================================================
// 心流工坊 · 宪法效果响应式接口
// 供各组件读取宪法效果状态，在规则开关变化时自动更新
// ============================================================

import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useConstitution } from '../resonance/bridges/constitution'
import { useConfig } from '../resonance/bridges/config'
import {
  type ConstitutionEffect,
  type EffectTarget,
  getEffectsByRuleId,
} from '../engine/constitution-effects'
import {
  type EffectEvent,
  getEffectState,
  getTargetLabel,
  getEffectTypeLabel,
  getTargetEffectState,
  isTargetActive,
  onEffectEvent,
  refreshConstitutionEffect,
} from '../engine/constitution-effect'

/**
 * 宪法效果响应式接口
 * 在组件中调用，获取宪法规则对当前产品行为的影响
 */
export function useConstitutionEffect() {
  const { config } = useConfig()

  // ---- 响应式状态 ----

  /** 活跃效果数量 */
  const activeEffectCount = ref(0)
  /** 已启用的规则数量 */
  const enabledRuleCount = ref(0)
  /** 最近的宪法效果事件 */
  const lastEvent = ref<EffectEvent | null>(null)
  /** 效果事件历史（最多保留 20 条） */
  const eventHistory = ref<EffectEvent[]>([])

  // ---- 更新状态 ----

  function updateState() {
    const state = getEffectState()
    activeEffectCount.value = state.activeEffectCount
    enabledRuleCount.value = state.enabledRuleIds.length
  }

  // ---- 效果查询 ----

  /** 获取指定规则的效果列表 */
  function getRuleEffects(ruleId: string): ConstitutionEffect[] {
    return getEffectsByRuleId(ruleId)
  }

  /** 获取指定规则的合规覆盖状态 */
  function getRuleComplianceOverrides(ruleId: string) {
    const effects = getEffectsByRuleId(ruleId)
    const overrides: { key: string; label: string; active: boolean }[] = []

    for (const effect of effects) {
      // 检查 effect 是否映射到 complianceOverride
      const overrideMap: Partial<Record<EffectTarget, keyof typeof config.complianceOverride>> = {
        'advisor:enabled': 'advisorEnabled',
        'advisor:forbidden-patterns': 'forbiddenPatterns',
        'advisor:comparative': 'comparativePhrases',
        'advisor:personification': 'personification',
        'timer:auto-start': 'autoStartOverwrite',
        'haptic:feedback': 'hapticFeedbackOverwrite',
      }

      const overrideKey = overrideMap[effect.target]
      if (overrideKey) {
        overrides.push({
          key: overrideKey,
          label: getTargetLabel(effect.target),
          active: config.complianceOverride[overrideKey],
        })
      }
    }

    return overrides
  }

  /** 检查指定目标是否活跃 */
  const checkTargetActive = (target: EffectTarget): boolean => {
    return isTargetActive(target)
  }

  /** 获取目标的效果详情 */
  const getTargetEffect = (target: EffectTarget) => {
    return getTargetEffectState(target)
  }

  // ---- 事件监听 ----

  function handleEvent(event: EffectEvent) {
    lastEvent.value = event
    eventHistory.value.unshift(event)
    if (eventHistory.value.length > 20) {
      eventHistory.value = eventHistory.value.slice(0, 20)
    }
    updateState()
  }

  let cleanup: (() => void) | null = null

  onMounted(() => {
    updateState()
    cleanup = onEffectEvent(handleEvent)
  })

  onUnmounted(() => {
    cleanup?.()
  })

  // ---- 计算属性 ----

  /** 宪法效果概览文本 */
  const effectSummary = computed(() => {
    const enabled = enabledRuleCount.value
    const effects = activeEffectCount.value
    if (enabled === 0) return '所有弹性条款已关闭，产品以默认行为运行'
    return `${enabled} 条条款生效中，产生 ${effects} 项产品效果`
  })

  /** 按效果目标分组的活跃效果 */
  const activeEffectsByTarget = computed(() => {
    const state = getEffectState()
    const result: { target: EffectTarget; label: string; effects: ConstitutionEffect[]; sources: string[] }[] = []

    for (const [target, info] of state.targetStates) {
      result.push({
        target,
        label: getTargetLabel(target),
        effects: info.effects,
        sources: info.sources,
      })
    }

    return result.sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'))
  })

  return {
    // 状态
    activeEffectCount,
    enabledRuleCount,
    lastEvent,
    eventHistory,
    // 计算属性
    effectSummary,
    activeEffectsByTarget,
    // 方法
    getRuleEffects,
    getRuleComplianceOverrides,
    checkTargetActive,
    getTargetEffect,
    refresh: refreshConstitutionEffect,
  }
}

/**
 * 检查特定宪法规则是否启用
 * 用于在组件中快速判断某个规则的状态
 */
export function useRuleEnabled(ruleId: string) {
  const { mutableRules } = useConstitution()

  const isEnabled = computed(() => {
    const rule = (mutableRules ?? []).find(r => r.id === ruleId)
    return rule?.enabled ?? false
  })

  const rule = computed(() => {
    return (mutableRules ?? []).find(r => r.id === ruleId) ?? null
  })

  return {
    isEnabled,
    rule,
  }
}

/**
 * 宪法规则效果预览
 * 在宪法视图中显示每条规则开启后的效果
 */
export function useRuleEffectPreview(ruleId: string) {
  const effects = getEffectsByRuleId(ruleId)

  const preview = computed(() => {
    return effects.map(e => ({
      target: e.target,
      targetLabel: getTargetLabel(e.target),
      typeLabel: getEffectTypeLabel(e.type, e.value),
      description: e.description,
      scope: e.scope,
    }))
  })

  return {
    effects: preview,
    hasEffects: effects.length > 0,
    effectCount: effects.length,
  }
}