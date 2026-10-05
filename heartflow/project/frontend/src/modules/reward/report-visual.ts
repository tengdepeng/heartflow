// ============================================================
// 劳酬 · 报表可视化引擎（INCR-29）
// 同比环比 + 分类占比/趋势/排行榜 + 年度热力图
// 全纯函数：基于 r.at（YYYY-MM-DD…）实时聚合，不落中间态。
// 类别配色/标签通过可选 resolver 注入（面板传自定义分类解析），
// 保证引擎与自定义分类解耦、可独立测试。
// ============================================================
import type { RewardRecord } from './reward-list'
import { getLocalDateKey } from '../../utils/time'

export type Kind = 'income' | 'expense'

export interface MetaResolver {
  (key: string): { label: string; color: string }
}

/** 回退配色（按 key 哈希稳定取色） */
const FALLBACK_PALETTE = [
  '#8a9a7a', '#6b9fc4', '#f0c040', '#d98c7a', '#e0a96d',
  '#a083c9', '#7ac4b0', '#c9a06b', '#94a3b8', '#d98c5a',
]
function hashColor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length]
}
const DEFAULT_RESOLVE: MetaResolver = (key) => ({ label: key, color: hashColor(key) })

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** 某记录所属月 key（YYYY-MM） */
function monthOf(r: RewardRecord): string {
  return r.at.slice(0, 7)
}

// ============================================================
// 1) 周期同比环比
// ============================================================

export interface RangeStat {
  key: string
  label: string
  income: number
  expense: number
  balance: number
}

/** 聚合单个周期（月）的收支结余 */
export function monthStat(records: RewardRecord[], month: string): RangeStat {
  let income = 0
  let expense = 0
  for (const r of records) {
    if (monthOf(r) !== month) continue
    if (r.type === 'income') income += r.amount
    else expense += r.amount
  }
  const [, m] = month.split('-').map(Number)
  return { key: month, label: `${m}月`, income, expense, balance: income - expense }
}

export interface Compare {
  current: RangeStat
  prev: RangeStat | null
  lastYear: RangeStat | null
  mom: { income: number | null; expense: number | null; balance: number | null }
  yoy: { income: number | null; expense: number | null; balance: number | null }
}

/** 变化率：cur 相对 base，base<=0 时为 null */
function delta(cur: number, base: number): number | null {
  if (base <= 0) return null
  return (cur - base) / base
}

/** 给定月的前一月（跨年回绕） */
function prevMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

/** 给定月的去年同期 */
function prevYearMonthKey(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return `${y - 1}-${pad2(m)}`
}

/** 本月同比（去年同期）+ 环比（上月）对比 */
export function compareMonth(records: RewardRecord[], month: string): Compare {
  const current = monthStat(records, month)
  const prevKey = prevMonthKey(month)
  const lastKey = prevYearMonthKey(month)
  const prev = prevKey === month ? null : monthStat(records, prevKey)
  const lastYear = lastKey === month ? null : monthStat(records, lastKey)

  const mom = prev
    ? {
        income: delta(current.income, prev.income),
        expense: delta(current.expense, prev.expense),
        balance: delta(current.balance, prev.balance),
      }
    : { income: null, expense: null, balance: null }
  const yoy = lastYear
    ? {
        income: delta(current.income, lastYear.income),
        expense: delta(current.expense, lastYear.expense),
        balance: delta(current.balance, lastYear.balance),
      }
    : { income: null, expense: null, balance: null }

  return { current, prev, lastYear, mom, yoy }
}

// ============================================================
// 2) 分类占比
// ============================================================

export interface ShareItem {
  key: string
  label: string
  color: string
  amount: number
  count: number
  /** 占总金额比例 0-1 */
  ratio: number
}

export interface CategoryShare {
  items: ShareItem[]
  total: number
}

export function categoryShare(
  records: RewardRecord[],
  kind: Kind,
  resolve: MetaResolver = DEFAULT_RESOLVE,
  topN = 8,
): CategoryShare {
  const map = new Map<string, { amount: number; count: number }>()
  let total = 0
  for (const r of records) {
    if (r.type !== kind) continue
    const e = map.get(r.category) ?? { amount: 0, count: 0 }
    e.amount += r.amount
    e.count += 1
    map.set(r.category, e)
    total += r.amount
  }
  const items: ShareItem[] = [...map.entries()]
    .sort((a, b) => b[1].amount - a[1].amount)
    .slice(0, topN)
    .map(([key, e]) => {
      const meta = resolve(key)
      return {
        key,
        label: meta.label,
        color: meta.color,
        amount: e.amount,
        count: e.count,
        ratio: total > 0 ? e.amount / total : 0,
      }
    })
  return { items, total }
}

// ============================================================
// 3) 分类趋势
// ============================================================

export interface MonthlyTrendPoint {
  key: string
  label: string
  income: number
  expense: number
  balance: number
}

export interface CategoryTrendSeries {
  key: string
  label: string
  color: string
  /** 与 months 对齐的逐月金额 */
  data: number[]
}

export interface TrendResult {
  months: MonthlyTrendPoint[]
  series: CategoryTrendSeries[]
  /** 全部月份支出最大值，用于缩放 */
  maxValue: number
}

/** 近 N 月收支趋势 + 支出 TopN 分类逐月序列 */
export function categoryTrend(
  records: RewardRecord[],
  months = 12,
  topN = 4,
  resolve: MetaResolver = DEFAULT_RESOLVE,
): TrendResult {
  const now = new Date()
  const keys: string[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    keys.push(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`)
  }
  const keySet = new Set(keys)

  // 逐月收支 + 分类累计
  const monthAgg = new Map<string, { income: number; expense: number }>()
  const catAgg = new Map<string, { total: number; byMonth: Map<string, number> }>()
  for (const r of records) {
    const k = monthOf(r)
    if (!keySet.has(k)) continue
    const m = monthAgg.get(k) ?? { income: 0, expense: 0 }
    if (r.type === 'income') m.income += r.amount
    else m.expense += r.amount
    monthAgg.set(k, m)
    if (r.type === 'expense') {
      const c = catAgg.get(r.category) ?? { total: 0, byMonth: new Map<string, number>() }
      c.total += r.amount
      c.byMonth.set(k, (c.byMonth.get(k) ?? 0) + r.amount)
      catAgg.set(r.category, c)
    }
  }

  const topCats = [...catAgg.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, topN)
    .map(([key]) => ({ key, meta: resolve(key) }))

  const monthsArr: MonthlyTrendPoint[] = keys.map((k, i) => {
    const [y, m] = k.split('-').map(Number)
    const agg = monthAgg.get(k) ?? { income: 0, expense: 0 }
    return {
      key: k,
      label: i === 0 ? `${y}年${m}月` : `${m}月`,
      income: agg.income,
      expense: agg.expense,
      balance: agg.income - agg.expense,
    }
  })

  const series: CategoryTrendSeries[] = topCats.map(({ key, meta }) => ({
    key,
    label: meta.label,
    color: meta.color,
    data: keys.map((k) => catAgg.get(key)?.byMonth.get(k) ?? 0),
  }))

  let maxValue = 0
  for (const p of monthsArr) maxValue = Math.max(maxValue, p.expense, p.income)
  for (const s of series) for (const v of s.data) maxValue = Math.max(maxValue, v)

  return { months: monthsArr, series, maxValue: maxValue || 1 }
}

// ============================================================
// 4) 分类排行榜
// ============================================================

export interface RankItem {
  key: string
  label: string
  color: string
  amount: number
  count: number
  /** 单笔均值 */
  avg: number
  /** 相对榜首金额比例 0-1，用于条形宽 */
  ratio: number
}

export function categoryRanking(
  records: RewardRecord[],
  kind: Kind,
  resolve: MetaResolver = DEFAULT_RESOLVE,
): RankItem[] {
  const map = new Map<string, { amount: number; count: number }>()
  for (const r of records) {
    if (r.type !== kind) continue
    const e = map.get(r.category) ?? { amount: 0, count: 0 }
    e.amount += r.amount
    e.count += 1
    map.set(r.category, e)
  }
  const arr = [...map.entries()]
    .map(([key, e]) => {
      const meta = resolve(key)
      return {
        key,
        label: meta.label,
        color: meta.color,
        amount: e.amount,
        count: e.count,
        avg: e.count > 0 ? e.amount / e.count : 0,
        ratio: 0,
      }
    })
    .sort((a, b) => b.amount - a.amount)
  const top = arr[0]?.amount ?? 0
  for (const it of arr) it.ratio = top > 0 ? it.amount / top : 0
  return arr
}

// ============================================================
// 5) 年度热力图（GitHub 风格：周列 × 周日行）
// ============================================================

export interface HeatCell {
  date: string | null
  /** 是否属于查询年份（补位格为 false） */
  inYear: boolean
  amount: number
  month: number
}

export interface HeatWeek {
  /** 该周首个属年内日的月份（1-12），用于月份标注 */
  month: number
  /** 一行 7 格（周一到周日），可能含补位 */
  cells: HeatCell[]
}

export interface YearHeatmap {
  year: number
  weeks: HeatWeek[]
  max: number
  total: number
  activeDays: number
}

/** 年度热力图：逐日金额强度（可选 income/expense） */
export function yearHeatmap(records: RewardRecord[], year: number, kind: Kind = 'expense'): YearHeatmap {
  const dayMap = new Map<string, number>()
  for (const r of records) {
    if (r.type !== kind) continue
    if (r.at.slice(0, 4) !== String(year)) continue
    const day = getLocalDateKey(new Date(r.at))
    dayMap.set(day, (dayMap.get(day) ?? 0) + r.amount)
  }

  const jan1 = new Date(year, 0, 1)
  // 周一为一周之首的偏移
  const mondayOffset = (jan1.getDay() + 6) % 7
  const cursor = new Date(year, 0, 1 - mondayOffset)
  const yearEnd = new Date(year, 11, 31)

  const weeks: HeatWeek[] = []
  let max = 0
  let total = 0
  let activeDays = 0

  while (cursor.getTime() <= yearEnd.getTime()) {
    const cells: HeatCell[] = []
    let firstInYearMonth = 1
    let has = false
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      const inYear = d.getFullYear() === year
      const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
      const amt = inYear ? (dayMap.get(iso) ?? 0) : 0
      if (inYear && amt > 0) {
        max = Math.max(max, amt)
        total += amt
        activeDays++
      }
      if (inYear && !has) {
        firstInYearMonth = d.getMonth() + 1
        has = true
      }
      cells.push({ date: inYear ? iso : null, inYear, amount: amt, month: d.getMonth() + 1 })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push({ month: firstInYearMonth, cells })
  }

  return { year, weeks, max, total, activeDays }
}