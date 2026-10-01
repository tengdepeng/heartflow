// ============================================================
// 小组件 · 日历数据口径
// 月历格 / 热力格 / 每日活跃度，统一在此计算，供 WidgetMiniCalendar 复用。
// 数据源 = 专注会话（engine/storage）+ 快乐/情绪速记（emotion/happy-box），
// 全本地、离线可用，无云端依赖（守宪法第 1 条）。
// ============================================================

import { storage } from '../../engine/storage'
import { HAPPY_BOX_KEY } from '../emotion/happy-box'

export const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 本地日期键 YYYY-MM-DD（用本地时区，不用 toISOString，避免 UTC 偏移把晚间记录算到次日） */
export function toDayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 每日活跃度（专注分钟 + 速记条数），键为 YYYY-MM-DD。
 * - 专注会话：完成/中断态，按分钟计权（至少 1）
 * - 快乐速记：每条计 1
 */
export function activityMarks(): Record<string, number> {
  const marks: Record<string, number> = {}
  const add = (key: string, n: number) => {
    if (!key || n <= 0) return
    marks[key] = (marks[key] || 0) + n
  }
  try {
    for (const s of storage.getSessions()) {
      if (s.status !== 'completed' && s.status !== 'interrupted') continue
      if (!s.startedAt) continue
      add(toDayKey(new Date(s.startedAt)), Math.max(1, Math.round((s.elapsed || 0) / 60000)))
    }
  } catch { /* 存储不可用时静默 */ }
  try {
    const items = storage.getKV<unknown>(HAPPY_BOX_KEY, [])
    if (Array.isArray(items)) {
      for (const it of items as { createdAt?: string }[]) {
        const key = (it?.createdAt || '').slice(0, 10)
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) add(key, 1)
      }
    }
  } catch { /* 静默 */ }
  return marks
}

/** 单月 42 格（周日开头）：1..31 天号，空位为 null */
export function monthMatrix(year: number, month0: number): (number | null)[] {
  const first = new Date(year, month0, 1)
  const offset = first.getDay() // 0 = 周日
  const days = new Date(year, month0 + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < 42; i++) {
    const d = i - offset + 1
    cells.push(d >= 1 && d <= days ? d : null)
  }
  return cells
}

/** 滚动 N 周热力格（列=周，行=星期几，周日开头；含"未来"标记） */
export function heatmapCells(
  weeks: number,
  marks: Record<string, number>,
  base: Date = new Date(),
): { key: string; count: number; inFuture: boolean }[] {
  const today = new Date(base.getFullYear(), base.getMonth(), base.getDate())
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const start = new Date(weekStart)
  start.setDate(weekStart.getDate() - (Math.max(1, weeks) - 1) * 7)
  const cells: { key: string; count: number; inFuture: boolean }[] = []
  for (let w = 0; w < Math.max(1, weeks); w++) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      const key = toDayKey(date)
      cells.push({ key, count: marks[key] || 0, inFuture: date.getTime() > today.getTime() })
    }
  }
  return cells
}

/** 活跃度 → 热力不透明度（0..1）；用于「背景色块 + opacity」方案，兼容任意 accent 变量 */
export function heatIntensity(count: number, max: number): number {
  if (count <= 0) return 0
  const m = Math.max(1, max)
  return Math.min(1, 0.25 + (count / m) * 0.75)
}
