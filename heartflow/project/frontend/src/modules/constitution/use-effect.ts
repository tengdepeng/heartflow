// ============================================================
// 心流工坊 · 宪法效果消费原语（A2.2）
// 业务组件通过 useEffect(target) 响应式读取任意 EffectTarget 的
// 生效状态 + 默认值回退，无需各自硬编码默认值，亦不绕过中央引擎。
//
// 设计约定：
// - active：该目标是否被宪法条款启用（默认 false）。
// - multiplier：reduce/set/increase 的乘法系数（默认 1，不改变基准）。
// - value：set/reduce/increase 的数值参数；enable/disable 为 null。
// - state：完整效果快照（活跃效果列表 + 来源规则标题）。
// 引擎在规则开关变化时通过 onEffectEvent 广播，本原语订阅后刷新，
// 与 useConstitutionEffect 同一刷新通道，保证一致。
// ============================================================

import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import type { EffectTarget } from '../../engine/constitution-effects'
import {
  onEffectEvent,
  getTargetEffectState,
  isTargetActive,
  getEffectMultiplier,
  getEffectValue,
  type ConstitutionEffectState,
} from '../../engine/constitution-effect'

export interface UseEffectResult {
  /** 目标标识 */
  target: EffectTarget
  /** 该目标是否处于活跃（宪法条款启用且映射到该目标） */
  active: Ref<boolean>
  /** 乘法系数（reduce/set/increase 的数值；未激活默认 1） */
  multiplier: Ref<number>
  /** 数值参数（set/reduce/increase 的数值；enable/disable 为 null） */
  value: Ref<number | null>
  /** 完整效果状态快照（活跃效果列表 + 来源规则） */
  state: Ref<ConstitutionEffectState['targetStates'] extends Map<unknown, infer V> ? V : never>
  /** 手动刷新（规则被外部修改时调用） */
  refresh: () => void
}

/**
 * 订阅指定 EffectTarget 的响应式生效状态。
 * 组件内调用：const { active, multiplier } = useEffect('ui:particle-density')
 */
export function useEffect(target: EffectTarget): UseEffectResult {
  const active = ref(isTargetActive(target))
  const multiplier = ref(getEffectMultiplier(target))
  const value = ref(getEffectValue(target))
  const state = ref(getTargetEffectState(target))

  function refresh(): void {
    active.value = isTargetActive(target)
    multiplier.value = getEffectMultiplier(target)
    value.value = getEffectValue(target)
    state.value = getTargetEffectState(target)
  }

  let stop: (() => void) | null = null
  onMounted(() => {
    refresh()
    stop = onEffectEvent(() => refresh())
  })
  onUnmounted(() => stop?.())

  return { target, active, multiplier, value, state, refresh }
}
