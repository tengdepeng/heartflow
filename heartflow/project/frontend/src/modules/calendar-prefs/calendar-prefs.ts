// ============================================================
// 时间线 · 日历显示偏好（Calendar Display Prefs，INCR-503）
// ------------------------------------------------------------
// 借鉴 96 APK「万年日历」bool/integer 显示开关矩阵
// （N_showLunar / N_allMonthSixLine / N_stretchCalendarEnable /
//  N_textBold / N_showNumberBackground …）与「知源中医」列表
// 显示偏好（排序/视图/记住上次位置）。
// 纯本地、零网络；状态存 hf:calendar_prefs。
// 落点：时间线「日历」子页（CalendarDisplayPrefsPanel.vue + CalendarView.vue）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const STORAGE_KEY = 'hf:calendar_prefs'

export interface CalendarPrefs {
  /** 每周首日：0=周日，1=周一 */
  weekStart: 0 | 1
  /** 固定六行（全月 42 格，避免月份切换时高度跳动） */
  sixRow: boolean
  /** 显示每日专注时长条 */
  showFocusBar: boolean
  /** 日期数字加粗 */
  boldNumber: boolean
  /** 日期数字背景 */
  numberBackground: boolean
  /** 显示「今天」徽章 */
  showTodayBadge: boolean
  /** 紧凑密度（压缩行高） */
  compact: boolean
}

export const DEFAULT_CALENDAR_PREFS: CalendarPrefs = {
  weekStart: 0,
  sixRow: false,
  showFocusBar: true,
  boldNumber: false,
  numberBackground: false,
  showTodayBadge: true,
  compact: false,
}

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六']

/** 纯函数：按每周首日返回星期表头（周日或周一开头） */
export function weekdaysFor(weekStart: 0 | 1): string[] {
  return weekStart === 1
    ? [...WEEKDAY_LABELS.slice(1), WEEKDAY_LABELS[0]]
    : [...WEEKDAY_LABELS]
}

export interface GridCell {
  date: Date
  isCurrentMonth: boolean
}

/**
 * 纯函数：生成月历网格。
 * weekStart=0 且 sixRow=false 时与 utils/time 的 getMonthDays 完全一致。
 */
export function buildMonthGrid(
  year: number,
  month: number,
  weekStart: 0 | 1 = 0,
  sixRow = false,
): GridCell[] {
  const first = new Date(year, month, 1)
  const lastDate = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() - weekStart + 7) % 7
  const cells: GridCell[] = []
  for (let i = lead; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), isCurrentMonth: false })
  }
  for (let d = 1; d <= lastDate; d++) {
    cells.push({ date: new Date(year, month, d), isCurrentMonth: true })
  }
  const target = sixRow ? 42 : Math.ceil(cells.length / 7) * 7
  while (cells.length < target) {
    const prev = cells[cells.length - 1].date
    const next = new Date(prev)
    next.setDate(next.getDate() + 1)
    cells.push({ date: next, isCurrentMonth: false })
  }
  return cells
}

const state = ref<CalendarPrefs>({ ...DEFAULT_CALENDAR_PREFS })

function normalize(raw: Partial<CalendarPrefs> | null | undefined): CalendarPrefs {
  const d = DEFAULT_CALENDAR_PREFS
  if (!raw) return { ...d }
  const bool = (v: unknown, fb: boolean): boolean => (typeof v === 'boolean' ? v : fb)
  return {
    weekStart: raw.weekStart === 1 ? 1 : raw.weekStart === 0 ? 0 : d.weekStart,
    sixRow: bool(raw.sixRow, d.sixRow),
    showFocusBar: bool(raw.showFocusBar, d.showFocusBar),
    boldNumber: bool(raw.boldNumber, d.boldNumber),
    numberBackground: bool(raw.numberBackground, d.numberBackground),
    showTodayBadge: bool(raw.showTodayBadge, d.showTodayBadge),
    compact: bool(raw.compact, d.compact),
  }
}

function load(): void {
  try {
    state.value = normalize(storage.getKV<Partial<CalendarPrefs> | null>(STORAGE_KEY, null))
  } catch {
    state.value = { ...DEFAULT_CALENDAR_PREFS }
  }
}

function persist(): void {
  storage.setKV(STORAGE_KEY, state.value)
}

load()

export function reloadCalendarPrefs(): void {
  load()
}

export function useCalendarPrefs() {
  const prefs = computed(() => state.value)

  function setPref<K extends keyof CalendarPrefs>(key: K, value: CalendarPrefs[K]): void {
    state.value = { ...state.value, [key]: value }
    persist()
  }

  function reset(): void {
    state.value = { ...DEFAULT_CALENDAR_PREFS }
    persist()
  }

  return { prefs, setPref, reset }
}
