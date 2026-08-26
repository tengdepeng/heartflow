// ============================================================
// 心流工坊 · 宪法透明度账本（A2-EXT-2a · 聚合原语）
// 遍历 effect-consumer-map 的 42 个 EffectTarget，结合 isTargetActive
// 计算三态：生效中 / 已接线·未启用 / 声明式（零假消费）。
//
// 设计要点：
// - 纯函数 computeConstitutionStatus / computeConstitutionSummary /
//   buildStatusPayload 不依赖 Vue 生命周期，便于单测（mock activeResolver）。
// - useConstitutionStatus 在 setup 内订阅 onEffectEvent，通过 revision 触发
//   computed 重算，保证运行时开关变化后三态实时刷新。
// - 名实诚实度：declarative（consumed:false 或 mechanism:'declared'）永远不显示「生效中」，
//   即便 isTargetActive 因默认基准态返回 true——避免伪造宪法之实。
//   'declared' 表示经诚实审计「无对应可门控运行时特征」、确认不影响运行时，账本封口；
//   与 pending 区别：pending 待审计/接线，declared 已审计确认无门控、恒归声明式。
// ============================================================

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  EFFECT_CONSUMER_MAP,
  type EffectConsumer,
  type EffectForm,
  type EffectMechanism,
} from './effect-consumer-map'
import { isTargetActive, onEffectEvent } from '../../engine/constitution-effect'
import type { EffectTarget } from '../../engine/constitution-effects'
import { storage } from '../../engine/storage'

/** 跨端接续快照键：透明度账本经 B1 通道同步到其他设备（守宪法第1条·本地私有） */
export const CONSTITUTION_STATUS_SNAPSHOT_KEY = 'hf:constitution:status_snapshot'

/** 三态：生效中 / 已接线·未启用 / 声明式 */
export type ConstitutionStatusState = 'active' | 'wired-idle' | 'declarative'

/** 单条账本条目 */
export interface ConstitutionStatusItem {
  target: EffectTarget
  label: string
  form: EffectForm
  mechanism: EffectMechanism
  consumed: boolean
  /** 当前是否由运行时真实启用（仅 consumed 时才有意义） */
  active: boolean
  state: ConstitutionStatusState
  consumer: string
  note?: string
}

/** 汇总计数 */
export interface ConstitutionStatusSummary {
  total: number
  consumedCount: number
  activeCount: number
  wiredIdleCount: number
  declarativeCount: number
}

/** 纯函数：计算三态账本（可注入 activeResolver 便于测试） */
export function computeConstitutionStatus(
  activeResolver: (target: EffectTarget) => boolean = isTargetActive,
): ConstitutionStatusItem[] {
  return EFFECT_CONSUMER_MAP.map((c: EffectConsumer) => {
    // 诚实声明式（declared）或待接线（consumed:false）永不视为 active，名实诚实
    const isDeclarative = !c.consumed || c.mechanism === 'declared'
    const active = isDeclarative ? false : activeResolver(c.target)
    const state: ConstitutionStatusState = isDeclarative
      ? 'declarative'
      : active
        ? 'active'
        : 'wired-idle'
    return {
      target: c.target,
      label: c.label,
      form: c.form,
      mechanism: c.mechanism,
      consumed: c.consumed,
      active,
      state,
      consumer: c.consumer,
      note: c.note,
    }
  })
}

/** 纯函数：由条目计算汇总 */
export function computeConstitutionSummary(
  items: ConstitutionStatusItem[],
): ConstitutionStatusSummary {
  return {
    total: items.length,
    consumedCount: items.filter(i => i.consumed).length,
    activeCount: items.filter(i => i.state === 'active').length,
    wiredIdleCount: items.filter(i => i.state === 'wired-idle').length,
    declarativeCount: items.filter(i => i.state === 'declarative').length,
  }
}

/** 纯函数：构建可导出的账本载荷（本地私有，不触云） */
export function buildStatusPayload(
  items: ConstitutionStatusItem[],
  summary: ConstitutionStatusSummary,
): {
  schema: string
  generatedAt: string
  summary: ConstitutionStatusSummary
  items: Array<{
    target: EffectTarget
    label: string
    form: EffectForm
    mechanism: EffectMechanism
    consumed: boolean
    active: boolean
    state: ConstitutionStatusState
    consumer: string
    note: string | null
  }>
} {
  return {
    schema: 'heartflow.constitution.status/v1',
    generatedAt: new Date().toISOString(),
    summary,
    items: items.map(i => ({
      target: i.target,
      label: i.label,
      form: i.form,
      mechanism: i.mechanism,
      consumed: i.consumed,
      active: i.active,
      state: i.state,
      consumer: i.consumer,
      note: i.note ?? null,
    })),
  }
}

/**
 * 纯函数：重新计算并快照当前透明度账本（不依赖 Vue 生命周期）。
 * 用于跨端接续时在 handoff 时刻嵌入最新状态，使交接包自描述
 * （即便目标端引擎版本不同，也能展示源端记录的宪法之实）。
 */
export function snapshotConstitutionStatus(): ReturnType<typeof buildStatusPayload> {
  const items = computeConstitutionStatus()
  const summary = computeConstitutionSummary(items)
  return buildStatusPayload(items, summary)
}

/** 将当前透明度账本快照持久化到本地 KV（供面板/接续通道读取，守宪法第1条） */
export function persistStatusSnapshot(): void {
  try {
    storage.setKV(CONSTITUTION_STATUS_SNAPSHOT_KEY, snapshotConstitutionStatus())
  } catch {
    // 存储不可用时静默放弃（不影响主流程）
  }
}

/**
 * 响应式聚合原语：组件内调用即可获得实时三态账本 + 汇总 + 导出。
 */
export function useConstitutionStatus() {
  // 引擎广播效果事件时 +1，驱动 computed 重算（isTargetActive 非响应式）
  const revision = ref(0)
  let stop: (() => void) | null = null

  onMounted(() => {
    stop = onEffectEvent(() => {
      revision.value++
    })
    persistStatusSnapshot()
  })
  onUnmounted(() => stop?.())

  const items = computed<ConstitutionStatusItem[]>(() => {
    // 读取 revision 建立响应式依赖
    void revision.value
    return computeConstitutionStatus()
  })

  const summary = computed<ConstitutionStatusSummary>(() =>
    computeConstitutionSummary(items.value),
  )

  // 三态变化时把快照持久化到本地 KV，保证跨端接续包携带最新透明度账本
  watch([items, summary], () => persistStatusSnapshot(), { flush: 'post' })

  function exportConstitutionStatusJSON(): string {
    return JSON.stringify(buildStatusPayload(items.value, summary.value), null, 2)
  }

  return {
    items,
    summary,
    exportConstitutionStatusJSON,
  }
}
