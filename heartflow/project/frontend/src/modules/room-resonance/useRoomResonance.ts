// ============================================================
// 跨房间共鸣联动 · 组合式（组件入口）
// 返回响应式信息流 + 聚合态势 + 动作。
// ============================================================

import { computed } from 'vue'
import {
  emitRoomSignal,
  getSignals,
  getLatest,
  getCrossRoomFeed,
  clearRoomSignals,
} from './store'
import { aggregateClimate, summarizeClimate } from './aggregator'
import type { RoomClimate, RoomKey, RoomSignal } from './types'

/**
 * 使用跨房间共鸣联动。
 * crossRoomFeed / climate 为 computed，房间状态变化时自动重算。
 */
export function useRoomResonance() {
  const crossRoomFeed = computed<RoomSignal[]>(() => getCrossRoomFeed())
  const climate = computed<RoomClimate>(() => aggregateClimate(getSignals()))

  return {
    // 动作
    emitRoomSignal,
    getSignals,
    getLatest,
    getCrossRoomFeed,
    clearRoomSignals,
    summarizeClimate,
    // 响应式
    crossRoomFeed,
    climate,
  }
}

export type { RoomKey, RoomSignal, RoomClimate }
