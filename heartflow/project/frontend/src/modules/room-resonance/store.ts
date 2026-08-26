// ============================================================
// 跨房间共鸣联动 · 信号中枢（模块级单例）
// 内存态响应式存储；提供发射 / 读取 / 裁剪 / 清理。
// ============================================================

import { reactive } from 'vue'
import type { RoomKey, RoomSignal } from './types'

/** 每房间保留的最近信号上限，超出裁剪最旧 */
const MAX_PER_ROOM = 20

const state = reactive<{ signals: RoomSignal[] }>({ signals: [] })

/**
 * 发射一条房间共鸣信号。
 * 注意：ts 由调用方传入（房间自身掌握"此刻状态"的权威时刻），此处不覆盖。
 */
export function emitRoomSignal(signal: RoomSignal): void {
  if (!signal || !signal.room) return
  state.signals.push({ ...signal })
  trim()
}

/** 每房间仅保留最近 MAX_PER_ROOM 条，避免内存无限增长 */
function trim(): void {
  const byRoom = new Map<RoomKey, RoomSignal[]>()
  for (const s of state.signals) {
    const arr = byRoom.get(s.room)
    if (arr) arr.push(s)
    else byRoom.set(s.room, [s])
  }
  for (const arr of byRoom.values()) {
    if (arr.length > MAX_PER_ROOM) {
      const drop = new Set(arr.slice(0, arr.length - MAX_PER_ROOM))
      state.signals = state.signals.filter((s) => !drop.has(s))
    }
  }
}

/** 读取全部信号（可选按房间过滤），返回副本 */
export function getSignals(room?: RoomKey): RoomSignal[] {
  const all = state.signals.slice()
  return room ? all.filter((s) => s.room === room) : all
}

/** 读取某房间最新一条信号（无则返回 null） */
export function getLatest(room: RoomKey): RoomSignal | null {
  const arr = getSignals(room)
  return arr.length ? arr[arr.length - 1] : null
}

/** 跨房间信息流：每房间取最新一条，按 ts 倒序 */
export function getCrossRoomFeed(): RoomSignal[] {
  const latest = new Map<RoomKey, RoomSignal>()
  for (const s of state.signals) {
    const prev = latest.get(s.room)
    if (!prev || s.ts >= prev.ts) latest.set(s.room, s)
  }
  return [...latest.values()].sort((a, b) => b.ts - a.ts)
}

/** 清理信号（可选按房间） */
export function clearRoomSignals(room?: RoomKey): void {
  state.signals = room ? state.signals.filter((s) => s.room !== room) : []
}
