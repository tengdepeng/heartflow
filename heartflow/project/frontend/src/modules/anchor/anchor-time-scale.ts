// ============================================================
// 逐日心锚 · 四种时间尺度
// 蓝图定义：点(日) / 线(周) / 面(月) / 区(年)
// 每种尺度提供：锚点分组、统计摘要、视口导航
// ============================================================

import type { Anchor } from './types'

export type AnchorScale = 'day' | 'week' | 'month' | 'year'

// ---- 日期工具 ----

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ---- 尺度范围计算 ----

export interface ScaleRange {
  start: Date
  end: Date
  label: string
}

/** 获取指定尺度的时间范围 */
export function getScaleRange(scale: AnchorScale, referenceDate: Date = new Date()): ScaleRange {
  const ref = startOfDay(referenceDate)

  switch (scale) {
    case 'day': {
      const end = addDays(ref, 1)
      return {
        start: ref,
        end,
        label: `${ref.getMonth() + 1}月${ref.getDate()}日`,
      }
    }
    case 'week': {
      const dayOfWeek = ref.getDay()
      const start = addDays(ref, -dayOfWeek)
      const end = addDays(start, 7)
      return {
        start,
        end,
        label: `${start.getMonth() + 1}/${start.getDate()} - ${addDays(end, -1).getMonth() + 1}/${addDays(end, -1).getDate()}`,
      }
    }
    case 'month': {
      const start = new Date(ref.getFullYear(), ref.getMonth(), 1)
      const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 1)
      return {
        start,
        end,
        label: `${ref.getFullYear()}年${ref.getMonth() + 1}月`,
      }
    }
    case 'year': {
      const start = new Date(ref.getFullYear(), 0, 1)
      const end = new Date(ref.getFullYear() + 1, 0, 1)
      return {
        start,
        end,
        label: `${ref.getFullYear()}年`,
      }
    }
  }
}

/** 判断锚点是否在指定尺度范围内 */
export function isAnchorInScale(anchor: Anchor, scale: AnchorScale, referenceDate?: Date): boolean {
  if ((anchor.stage ?? 'active') !== 'active' || !anchor.targetDate) return false
  const target = parseDate(anchor.targetDate)
  const { start, end } = getScaleRange(scale, referenceDate)
  return target >= start && target < end
}

// ---- 尺度内分组 ----

export interface AnchorGroup {
  date: string
  label: string
  anchors: Anchor[]
}

/** 按天分组（日尺度内部按小时/优先级分组） */
export function groupByHour(anchors: Anchor[]): { hour: number; label: string; anchors: Anchor[] }[] {
  const groups = new Map<number, Anchor[]>()
  for (const a of anchors) {
    // 默认按优先级分组：must → 上午, can → 下午, float → 晚上
    const hour =
      a.priority === 'must' ? 8 :
      a.priority === 'can' ? 14 : 20
    if (!groups.has(hour)) groups.set(hour, [])
    groups.get(hour)!.push(a)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, anchors]) => ({
      hour,
      label: hour < 12 ? '上午' : hour < 18 ? '下午' : '晚上',
      anchors,
    }))
}

/** 按天分组（周/月尺度） */
export function groupByDay(anchors: Anchor[], range: ScaleRange): AnchorGroup[] {
  const groups = new Map<string, Anchor[]>()
  const dateSet = new Set<string>()

  // 生成范围内的所有日期
  let current = new Date(range.start)
  while (current < range.end) {
    const key = formatDateKey(current)
    dateSet.add(key)
    if (!groups.has(key)) groups.set(key, [])
    current = addDays(current, 1)
  }

  for (const a of anchors) {
    if (a.targetDate && dateSet.has(a.targetDate)) {
      groups.get(a.targetDate)!.push(a)
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, anchors]) => {
      const d = parseDate(date)
      const weekDays = ['日', '一', '二', '三', '四', '五', '六']
      return {
        date,
        label: `${d.getMonth() + 1}/${d.getDate()} 周${weekDays[d.getDay()]}`,
        anchors,
      }
    })
}

/** 按周分组（月尺度） */
export function groupByWeek(anchors: Anchor[], _range: ScaleRange): { weekOfMonth: number; label: string; anchors: Anchor[] }[] {
  const groups = new Map<number, Anchor[]>()

  for (const a of anchors) {
    if (!a.targetDate) continue
    const d = parseDate(a.targetDate)
    const weekOfMonth = Math.ceil(d.getDate() / 7)
    if (!groups.has(weekOfMonth)) groups.set(weekOfMonth, [])
    groups.get(weekOfMonth)!.push(a)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([week, anchors]) => ({
      weekOfMonth: week,
      label: `第${week}周`,
      anchors,
    }))
}

/** 按月分组（年尺度） */
export function groupByMonth(anchors: Anchor[], _range: ScaleRange): { month: number; label: string; anchors: Anchor[] }[] {
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const groups = new Map<number, Anchor[]>()

  for (const a of anchors) {
    if (!a.targetDate) continue
    const d = parseDate(a.targetDate)
    const month = d.getMonth()
    if (!groups.has(month)) groups.set(month, [])
    groups.get(month)!.push(a)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, anchors]) => ({
      month,
      label: monthNames[month],
      anchors,
    }))
}

// ---- 尺度统计摘要 ----

export interface ScaleSummary {
  total: number
  done: number
  pending: number
  must: number
  can: number
  float: number
  completionRate: number
  /** 按优先级分组的完成率 */
  priorityCompletion: {
    must: { total: number; done: number; rate: number }
    can: { total: number; done: number; rate: number }
    float: { total: number; done: number; rate: number }
  }
  /** 按分类统计 */
  byCategory: { category: string; total: number; done: number }[]
}

/** 计算尺度内锚点的统计摘要 */
export function computeScaleSummary(anchors: Anchor[]): ScaleSummary {
  const total = anchors.length
  const done = anchors.filter(a => a.done).length
  const must = anchors.filter(a => a.priority === 'must')
  const can = anchors.filter(a => a.priority === 'can')
  const float = anchors.filter(a => a.priority === 'float')

  // 按分类统计
  const catMap = new Map<string, { total: number; done: number }>()
  for (const a of anchors) {
    const cat = a.category || '未分类'
    if (!catMap.has(cat)) catMap.set(cat, { total: 0, done: 0 })
    const entry = catMap.get(cat)!
    entry.total++
    if (a.done) entry.done++
  }

  return {
    total,
    done,
    pending: total - done,
    must: must.length,
    can: can.length,
    float: float.length,
    completionRate: total > 0 ? Math.round((done / total) * 100) : 0,
    priorityCompletion: {
      must: {
        total: must.length,
        done: must.filter(a => a.done).length,
        rate: must.length > 0 ? Math.round((must.filter(a => a.done).length / must.length) * 100) : 0,
      },
      can: {
        total: can.length,
        done: can.filter(a => a.done).length,
        rate: can.length > 0 ? Math.round((can.filter(a => a.done).length / can.length) * 100) : 0,
      },
      float: {
        total: float.length,
        done: float.filter(a => a.done).length,
        rate: float.length > 0 ? Math.round((float.filter(a => a.done).length / float.length) * 100) : 0,
      },
    },
    byCategory: Array.from(catMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.total - a.total),
  }
}

// ---- 视图导航 ----

export interface ScaleNavigation {
  scale: AnchorScale
  range: ScaleRange
  /** 是否可以导航到上一尺度 */
  canGoPrev: boolean
  /** 是否可以导航到下一尺度 */
  canGoNext: boolean
  /** 导航到上一尺度 */
  goPrev: (currentDate: Date) => Date
  /** 导航到下一尺度 */
  goNext: (currentDate: Date) => Date
}

/** 创建尺度导航 */
export function createScaleNavigation(scale: AnchorScale, referenceDate: Date): ScaleNavigation {
  const range = getScaleRange(scale, referenceDate)

  function goPrev(d: Date): Date {
    switch (scale) {
      case 'day': return addDays(d, -1)
      case 'week': return addDays(d, -7)
      case 'month': return new Date(d.getFullYear(), d.getMonth() - 1, 1)
      case 'year': return new Date(d.getFullYear() - 1, 0, 1)
    }
  }

  function goNext(d: Date): Date {
    switch (scale) {
      case 'day': return addDays(d, 1)
      case 'week': return addDays(d, 7)
      case 'month': return new Date(d.getFullYear(), d.getMonth() + 1, 1)
      case 'year': return new Date(d.getFullYear() + 1, 0, 1)
    }
  }

  const now = new Date()
  return {
    scale,
    range,
    canGoPrev: true,
    canGoNext: scale === 'day' ? goNext(referenceDate) <= now : goNext(referenceDate) <= now,
    goPrev,
    goNext,
  }
}

// ---- 尺度间的锚点分布映射 ----

export interface ScaleDistribution {
  /** 本周每日锚点数 */
  dailyInWeek: { date: string; count: number }[]
  /** 本月每周锚点数 */
  weeklyInMonth: { week: number; count: number }[]
  /** 本年每月锚点数 */
  monthlyInYear: { month: number; count: number }[]
}

/** 计算各尺度的锚点分布（用于热力图/日历视图） */
export function computeScaleDistribution(anchors: Anchor[], referenceDate: Date = new Date()): ScaleDistribution {
  const weekRange = getScaleRange('week', referenceDate)
  const monthRange = getScaleRange('month', referenceDate)
  const yearRange = getScaleRange('year', referenceDate)

  // 本周每日
  const dailyInWeek: { date: string; count: number }[] = []
  let day = new Date(weekRange.start)
  while (day < weekRange.end) {
    const key = formatDateKey(day)
    dailyInWeek.push({
      date: key,
      count: anchors.filter(a => a.targetDate === key && (a.stage ?? 'active') === 'active').length,
    })
    day = addDays(day, 1)
  }

  // 本月每周
  const weeklyInMonth: { week: number; count: number }[] = []
  for (let w = 1; w <= 5; w++) {
    const weekStart = addDays(monthRange.start, (w - 1) * 7)
    const weekEnd = addDays(weekStart, 7)
    weeklyInMonth.push({
      week: w,
      count: anchors.filter(a => {
        if (!a.targetDate || (a.stage ?? 'active') !== 'active') return false
        const d = parseDate(a.targetDate)
        return d >= weekStart && d < weekEnd
      }).length,
    })
  }

  // 本年每月
  const monthlyInYear: { month: number; count: number }[] = []
  for (let m = 0; m < 12; m++) {
    monthlyInYear.push({
      month: m,
      count: anchors.filter(a => {
        if (!a.targetDate || (a.stage ?? 'active') !== 'active') return false
        const d = parseDate(a.targetDate)
        return d.getFullYear() === yearRange.start.getFullYear() && d.getMonth() === m
      }).length,
    })
  }

  return { dailyInWeek, weeklyInMonth, monthlyInYear }
}