// ============================================================
// 自律工坊 · 多时段提醒（Multi-Period Reminder，INCR-490）
// ------------------------------------------------------------
// 借鉴 96 APK「时光提醒」layouts multi_period / period_app /
// time_progress：一天内可配置多个提醒时段，并以「时间进度条」
// 标出各时段的先后与当前所处位置。
// 纯本地、零网络；配置存 hf:multi_reminder。
// 落点：自律工坊（DisciplineWorkshop.vue）「提醒」页。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:multi_reminder'

export interface ReminderSlot {
  id: string
  /** 时段名，如「晨起」「午间」「睡前」 */
  label: string
  /** 提醒时刻 HH:mm（24 小时制） */
  time: string
  /** 是否启用 */
  enabled: boolean
  /** 展示用图标 emoji */
  icon: string
}

export interface MultiReminderState {
  slots: ReminderSlot[]
}

export const DEFAULT_SLOTS: ReminderSlot[] = [
  { id: 'mr-morning', label: '晨起', time: '07:30', enabled: true, icon: '🌅' },
  { id: 'mr-noon', label: '午间', time: '12:00', enabled: true, icon: '🍚' },
  { id: 'mr-water', label: '补水', time: '15:00', enabled: false, icon: '💧' },
  { id: 'mr-offwork', label: '收工', time: '18:30', enabled: true, icon: '🌇' },
  { id: 'mr-sleep', label: '睡前', time: '22:30', enabled: true, icon: '🌙' },
]

export function defaultMultiReminder(): MultiReminderState {
  return { slots: DEFAULT_SLOTS.map((s) => ({ ...s })) }
}

// ============================================================
// 纯函数（不触碰存储 / 单例，便于单测）
// ============================================================

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidTime(t: string): boolean {
  return TIME_RE.test(t)
}

/** "HH:mm" → 当日分钟数；非法返回 null */
export function parseTime(t: string): number | null {
  const m = TIME_RE.exec(t)
  if (!m) return null
  return Number(m[1]) * 60 + Number(m[2])
}

/** 分钟数 → "HH:mm"（自动对 24h 取模） */
export function formatTime(min: number): string {
  const v = ((Math.floor(min) % 1440) + 1440) % 1440
  const h = Math.floor(v / 60)
  const m = v % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 当日分钟数（含秒的小数） */
export function minutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60
}

/** 按时刻升序排列（非法时刻排最后，保持相对稳定） */
export function sortSlots(slots: ReminderSlot[]): ReminderSlot[] {
  return [...slots].sort((a, b) => {
    const pa = parseTime(a.time)
    const pb = parseTime(b.time)
    if (pa === null && pb === null) return 0
    if (pa === null) return 1
    if (pb === null) return -1
    return pa - pb
  })
}

export type SlotStatus = 'off' | 'passed' | 'next' | 'upcoming'

export interface ClassifiedSlot {
  slot: ReminderSlot
  status: SlotStatus
}

/**
 * 给每个时段打状态（顺序同 sortSlots）：
 * - off：未启用 / 时刻非法
 * - passed：已过（时刻早于现在）
 * - next：下一个待触发
 * - upcoming：更晚的待触发
 */
export function classifySlots(slots: ReminderSlot[], now: Date): ClassifiedSlot[] {
  const nowMin = minutesOfDay(now)
  let nextAssigned = false
  return sortSlots(slots).map((slot) => {
    const min = parseTime(slot.time)
    if (!slot.enabled || min === null) return { slot, status: 'off' as SlotStatus }
    if (min < nowMin) return { slot, status: 'passed' as SlotStatus }
    if (!nextAssigned) {
      nextAssigned = true
      return { slot, status: 'next' as SlotStatus }
    }
    return { slot, status: 'upcoming' as SlotStatus }
  })
}

/** 下一个待触发时段（今日已无则回环到明日首个）；无启用时段返回 null */
export function nextSlot(slots: ReminderSlot[], now: Date): ReminderSlot | null {
  const enabled = sortSlots(slots).filter((s) => s.enabled && parseTime(s.time) !== null)
  if (enabled.length === 0) return null
  const nowMin = minutesOfDay(now)
  return enabled.find((s) => (parseTime(s.time) as number) >= nowMin) ?? enabled[0]
}

/** 距下一提醒毫秒（跨日回环）；无启用时段返回 0 */
export function msUntilNextSlot(slots: ReminderSlot[], now: Date): number {
  const target = nextSlot(slots, now)
  if (!target) return 0
  const targetMin = parseTime(target.time) as number
  const nowMin = minutesOfDay(now)
  const diffMin = targetMin >= nowMin ? targetMin - nowMin : 1440 - nowMin + targetMin
  return Math.round(diffMin * 60_000)
}

/** 当日时间进度 0~1（0:00 → 0，24:00 → 1） */
export function dayProgress(now: Date): number {
  return minutesOfDay(now) / 1440
}

/** 把时刻映射为进度条上的 0~100 位置 */
export function slotPercent(slot: ReminderSlot): number {
  const min = parseTime(slot.time)
  if (min === null) return 0
  return (min / 1440) * 100
}

// ============================================================
// 组合式：模块级单例
// ============================================================

function loadInitial(): MultiReminderState {
  try {
    const saved = storage.getKV<Partial<MultiReminderState> | null>(STORAGE_KEY, null)
    if (saved && Array.isArray(saved.slots)) {
      return { slots: saved.slots.map((s) => ({ ...s })) }
    }
  } catch {
    /* 忽略：使用默认 */
  }
  return defaultMultiReminder()
}

const state = ref<MultiReminderState>(loadInitial())

function persist(): void {
  try {
    storage.setKV(STORAGE_KEY, state.value)
  } catch {
    /* 忽略：持久化失败不影响内存态 */
  }
}

let seq = 0
function makeId(): string {
  seq += 1
  return `mr-${Date.now().toString(36)}-${seq}`
}

export function useMultiReminder() {
  const slots = computed(() => state.value.slots)

  /** 新增时段；label 为空或时刻非法返回 null */
  function addSlot(input: { label: string; time: string; icon?: string }): ReminderSlot | null {
    const label = input.label.trim()
    if (!label || !isValidTime(input.time)) return null
    const slot: ReminderSlot = {
      id: makeId(),
      label,
      time: input.time,
      enabled: true,
      icon: input.icon || '⏰',
    }
    state.value = { slots: sortSlots([...state.value.slots, slot]) }
    persist()
    return slot
  }

  /** 局部更新；传入非法时刻时保留原值 */
  function updateSlot(id: string, patch: Partial<Omit<ReminderSlot, 'id'>>): void {
    state.value = {
      slots: sortSlots(
        state.value.slots.map((s) => {
          if (s.id !== id) return s
          const next = { ...s, ...patch }
          if (patch.time !== undefined && !isValidTime(next.time)) next.time = s.time
          return next
        }),
      ),
    }
    persist()
  }

  function toggleSlot(id: string): void {
    const s = state.value.slots.find((x) => x.id === id)
    if (s) updateSlot(id, { enabled: !s.enabled })
  }

  function removeSlot(id: string): void {
    state.value = { slots: state.value.slots.filter((s) => s.id !== id) }
    persist()
  }

  /** 恢复内置默认时段 */
  function resetSlots(): void {
    state.value = defaultMultiReminder()
    persist()
  }

  return {
    slots,
    addSlot,
    updateSlot,
    toggleSlot,
    removeSlot,
    resetSlots,
    /** 测试：复位单例为默认 */
    _reset: resetSlots,
  }
}
