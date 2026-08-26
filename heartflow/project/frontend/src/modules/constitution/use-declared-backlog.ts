// ============================================================
// A2-EXT-4 · 声明式 backlog 批量知悉（透明度面板深化）
// 16 个目标经诚实审计确认为「声明式·无运行时门控、永不伪造宪法之实」
// （见 effect-consumer-map 的 declared 封口，提交 463a60d）。
// 本组合式提供「用户逐条 / 批量确认已知悉这些声明式项」的本地 KV 持久化，
// 让透明度面板可展示「已读/未读」进度——纯前端、零新数据、不碰引擎账本。
// ============================================================

import { ref, computed } from 'vue'
import { EFFECT_CONSUMER_MAP } from './effect-consumer-map'
import { storage } from '../../engine/storage'

const ACK_KEY = 'hf:constitution:declared_ack'

/** 取全部声明式（诚实封口）目标 target 列表 */
export function getDeclaredTargets(): string[] {
  return EFFECT_CONSUMER_MAP
    .filter(c => c.mechanism === 'declared')
    .map(c => c.target)
}

export function useDeclaredBacklog() {
  const allTargets = getDeclaredTargets()

  const acked = ref<Set<string>>(new Set(storage.getKV<string[]>(ACK_KEY, [])))

  const ackCount = computed(() => allTargets.filter(t => acked.value.has(t)).length)
  const total = computed(() => allTargets.length)
  const remaining = computed(() => total.value - ackCount.value)
  const allAcked = computed(() => total.value > 0 && ackCount.value === total.value)

  function persist(): void {
    storage.setKV(ACK_KEY, [...acked.value])
  }

  function acknowledge(target: string): void {
    if (!allTargets.includes(target)) return
    const next = new Set(acked.value)
    next.add(target)
    acked.value = next
    persist()
  }

  function acknowledgeAll(): void {
    acked.value = new Set(allTargets)
    persist()
  }

  function isAcked(target: string): boolean {
    return acked.value.has(target)
  }

  return {
    allTargets,
    acked,
    ackCount,
    total,
    remaining,
    allAcked,
    acknowledge,
    acknowledgeAll,
    isAcked,
  }
}
