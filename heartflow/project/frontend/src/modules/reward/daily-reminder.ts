// ============================================================
// 劳酬 · 每日记账提醒 + 记账习惯（INCR-30）
// 纯函数：今日是否记账 / 连续记账天数 / 月活动度；useDailyReminder 持久化配置。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'
import type { RewardRecord } from './reward-list'
import { getLocalDateKey } from '../../utils/time'

export interface DailyReminderConfig {
  enabled: boolean
  /** 提醒时刻 HH:mm，例如 "20:00" */
  time?: string
  updatedAt?: string
}

const KEY = REWARD_STORAGE_KEYS.DAILY_REMINDER

export const DEFAULT_REMINDER_TIME = '20:00'

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function prevDay(d: Date): Date {
  const c = new Date(d)
  c.setDate(c.getDate() - 1)
  return c
}

/** 已有记账记录的天集合（按本地日期去重） */
export function recordedDays(records: RewardRecord[]): Set<string> {
  return new Set(records.map(r => getLocalDateKey(new Date(r.at))))
}

/** 今日是否已记账 */
export function hasRecordToday(records: RewardRecord[], today?: string): boolean {
  const t = today ?? getLocalDateKey()
  return recordedDays(records).has(t)
}

/**
 * 连续记账天数：从今天（今天未记账则从昨天）往回数连续有记录的天数，
 * 用于「已连续 X 天记账」的习惯打卡展示。
 */
export function recordStreak(records: RewardRecord[], today?: string): number {
  const base = today ? (() => {
    const [y, m, d] = today.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  })() : new Date()
  const days = recordedDays(records)
  let cursor = base
  if (!days.has(dayKey(cursor))) cursor = prevDay(cursor)
  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor = prevDay(cursor)
  }
  return streak
}

export interface MonthActivity {
  count: number
  activeDays: number
  /** yyyy-mm-dd → 当日收支净额 */
  byDay: Record<string, number>
}

/** 某月记账活动度：笔数 / 活跃天数 / 逐日净额 */
export function monthActivity(records: RewardRecord[], month: string): MonthActivity {
  const inMonth = records.filter(r => r.at.slice(0, 7) === month)
  const byDay: Record<string, number> = {}
  for (const r of inMonth) {
    const day = getLocalDateKey(new Date(r.at))
    byDay[day] = (byDay[day] ?? 0) + (r.type === 'income' ? r.amount : -r.amount)
  }
  return { count: inMonth.length, activeDays: Object.keys(byDay).length, byDay }
}

// ---- 存储读写（记账提醒配置）----
export function useDailyReminder() {
  const config = ref<DailyReminderConfig>(storage.getKV<DailyReminderConfig>(KEY, { enabled: false }))

  function persist(): void {
    storage.setKV(KEY, config.value)
  }
  function load(): void {
    config.value = storage.getKV<DailyReminderConfig>(KEY, { enabled: false })
  }
  function update(patch: Partial<DailyReminderConfig>): void {
    config.value = { ...config.value, ...patch, updatedAt: new Date().toISOString() }
    persist()
  }

  return { config, update, load }
}