// ============================================================
// 跨房间共鸣联动 · 聚合（纯函数，无 Vue 依赖，易测）
// ============================================================

import type { RoomClimate, RoomKey, RoomSignal } from './types'
import { ROOM_LABELS } from './types'

/** 默认统计窗口：30 分钟 */
export const DEFAULT_CLIMATE_WINDOW_MS = 30 * 60 * 1000

/**
 * 把信号聚合为跨房间态势。
 * @param signals 信号全集
 * @param windowMs 仅统计窗口内信号（默认 30 分钟）
 * @param now 参考时刻（默认 Date.now()，测试可注入固定值）
 */
export function aggregateClimate(
  signals: RoomSignal[],
  windowMs: number = DEFAULT_CLIMATE_WINDOW_MS,
  now: number = Date.now(),
): RoomClimate {
  const recent = signals.filter((s) => now - s.ts <= windowMs)
  const rooms = [...new Set(recent.map((s) => s.room))] as RoomKey[]
  const latestByRoom: Partial<Record<RoomKey, RoomSignal>> = {}
  for (const s of recent) {
    const prev = latestByRoom[s.room]
    if (!prev || s.ts >= prev.ts) latestByRoom[s.room] = s
  }
  return {
    rooms,
    latestByRoom,
    totalSignals: recent.length,
    windowMs,
  }
}

/**
 * 把态势转成一行人类可读文案，如「情绪花房:平静 · 逐日心锚:专注 #3」。
 * 空态势返回空串。
 */
export function summarizeClimate(climate: RoomClimate): string {
  const parts = climate.rooms.map((room) => {
    const s = climate.latestByRoom[room]
    return s ? `${ROOM_LABELS[room]}：${s.label}` : ROOM_LABELS[room]
  })
  return parts.join(' · ')
}
