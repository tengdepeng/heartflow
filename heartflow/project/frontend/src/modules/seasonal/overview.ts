// ============================================================
// 岁时阁 · 俯瞰模式
// 蓝图定义：
//   整体时间线俯瞰视角，按年度纵览所有仪式、节气、节日
//   支持年度切换、月度分布热力图、仪式密度统计
// ============================================================

import type { SeasonalRitual, LifeRitual, Ritual, SolarTerm, Festival } from './types'
import { SOLAR_TERMS, FESTIVALS } from './data'

// ---- 俯瞰数据 ----

export interface YearOverview {
  year: number
  /** 月度分布 */
  months: MonthSummary[]
  /** 节气列表 */
  solarTerms: SolarTerm[]
  /** 节日列表 */
  festivals: Festival[]
  /** 四季仪式 */
  seasonalRituals: SeasonalRitual[]
  /** 生命仪礼 */
  lifeRituals: LifeRitual[]
  /** 私人仪式 */
  privateRituals: Ritual[]
  /** 年度统计 */
  stats: YearStats
}

export interface MonthSummary {
  month: number
  label: string
  /** 该月仪式完成次数 */
  ritualCount: number
  /** 该月节气数 */
  termCount: number
  /** 该月节日数 */
  festivalCount: number
  /** 该月生命仪礼 */
  lifeRituals: LifeRitual[]
  /** 该月私人仪式 */
  privateRituals: Ritual[]
  /** 活动密度 0-1 */
  density: number
}

export interface YearStats {
  /** 总仪式完成次数 */
  totalRituals: number
  /** 最活跃月 */
  peakMonth: number
  /** 最活跃月仪式数 */
  peakCount: number
  /** 仪式覆盖月数 */
  activeMonths: number
  /** 生命仪礼数 */
  lifeRitualCount: number
  /** 私人仪式数 */
  privateRitualCount: number
}

// ---- 俯瞰数据构建 ----

const MONTH_LABELS = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
]

/** 构建年度俯瞰视图 */
export function buildYearOverview(
  year: number,
  seasonalRituals: SeasonalRitual[],
  lifeRituals: LifeRitual[],
  privateRituals: Ritual[],
): YearOverview {
  // 月度汇总
  const months: MonthSummary[] = []
  let peakMonth = 1
  let peakCount = 0
  let totalRituals = 0
  let activeMonths = 0

  for (let m = 0; m < 12; m++) {
    const month = m + 1

    // 该月的仪式完成次数
    const ritualCount = seasonalRituals.reduce((sum, r) => {
      if (r.lastCompletedAt) {
        const d = new Date(r.lastCompletedAt)
        if (d.getFullYear() === year && d.getMonth() === m) {
          return sum + r.count
        }
      }
      return sum
    }, 0)

    // 该月的生命仪礼
    const monthLifeRituals = lifeRituals.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === m
    })

    // 该月的私人仪式
    const monthPrivateRituals = privateRituals.filter(r => {
      const d = new Date(r.date)
      return d.getFullYear() === year && d.getMonth() === m
    })

    // 该月节气
    const terms = SOLAR_TERMS.filter(t => t.month === month)
    const festivals = FESTIVALS.filter(f => f.month === month)

    // 密度计算
    const density = Math.min(1, (ritualCount + monthLifeRituals.length + monthPrivateRituals.length) / 10)

    months.push({
      month,
      label: MONTH_LABELS[m],
      ritualCount,
      termCount: terms.length,
      festivalCount: festivals.length,
      lifeRituals: monthLifeRituals,
      privateRituals: monthPrivateRituals,
      density,
    })

    totalRituals += ritualCount
    if (ritualCount > 0 || monthLifeRituals.length > 0 || monthPrivateRituals.length > 0) {
      activeMonths++
    }
    if (ritualCount > peakCount) {
      peakCount = ritualCount
      peakMonth = month
    }
  }

  return {
    year,
    months,
    solarTerms: SOLAR_TERMS,
    festivals: FESTIVALS,
    seasonalRituals: seasonalRituals.filter(r => {
      // 包含该年创建或该年有完成的仪式
      const created = new Date(r.createdAt).getFullYear() === year
      const completed = r.lastCompletedAt && new Date(r.lastCompletedAt).getFullYear() === year
      return created || completed
    }),
    lifeRituals: lifeRituals.filter(r => new Date(r.date).getFullYear() === year),
    privateRituals: privateRituals.filter(r => new Date(r.date).getFullYear() === year),
    stats: {
      totalRituals,
      peakMonth,
      peakCount,
      activeMonths,
      lifeRitualCount: lifeRituals.filter(r => new Date(r.date).getFullYear() === year).length,
      privateRitualCount: privateRituals.filter(r => new Date(r.date).getFullYear() === year).length,
    },
  }
}

/** 获取有数据的年份列表 */
export function getAvailableYears(
  seasonalRituals: SeasonalRitual[],
  lifeRituals: LifeRitual[],
  privateRituals: Ritual[],
): number[] {
  const years = new Set<number>()

  for (const r of seasonalRituals) {
    years.add(new Date(r.createdAt).getFullYear())
    if (r.lastCompletedAt) {
      years.add(new Date(r.lastCompletedAt).getFullYear())
    }
  }
  for (const r of lifeRituals) {
    years.add(new Date(r.date).getFullYear())
  }
  for (const r of privateRituals) {
    years.add(new Date(r.date).getFullYear())
  }

  // 总是包含当前年份
  years.add(new Date().getFullYear())

  return Array.from(years).sort((a, b) => b - a)
}

// ---- 年度对比 ----

export interface YearComparison {
  years: number[]
  rituals: number[]
  lifeRituals: number[]
  privateRituals: number[]
  activeMonths: number[]
}

/** 构建多年对比数据 */
export function buildYearComparison(
  years: number[],
  seasonalRituals: SeasonalRitual[],
  lifeRituals: LifeRitual[],
  privateRituals: Ritual[],
): YearComparison {
  const sorted = [...years].sort((a, b) => a - b)
  const overviews = sorted.map(y =>
    buildYearOverview(y, seasonalRituals, lifeRituals, privateRituals),
  )

  return {
    years: sorted,
    rituals: overviews.map(o => o.stats.totalRituals),
    lifeRituals: overviews.map(o => o.stats.lifeRitualCount),
    privateRituals: overviews.map(o => o.stats.privateRitualCount),
    activeMonths: overviews.map(o => o.stats.activeMonths),
  }
}

/** 温和洞察（≤limit 条）：空库引导 / 完成次数+最活跃月 / 渐成习惯 / 生命仪礼 / 年度对比生长 */
export function yearOverviewInsights(
  overview: YearOverview,
  comparison?: YearComparison,
  limit = 3,
): string[] {
  const { year, stats } = overview
  const total = stats.totalRituals
  if (total === 0 && stats.lifeRitualCount === 0 && stats.privateRitualCount === 0) {
    return ['岁时阁还没有仪式记录。记下第一件想反复做的小仪式，它会落进年度俯瞰的某一格。']
  }

  const out: string[] = []
  const peakLabel = overview.months[stats.peakMonth - 1]?.label ?? `${stats.peakMonth}月`
  out.push(`${year} 年共完成 ${total} 次四季仪式，最活跃月是${peakLabel}。`)

  if (stats.activeMonths >= 6) {
    out.push(`仪式覆盖 ${stats.activeMonths} 个月，岁时渐成习惯。`)
  }
  if (stats.lifeRitualCount > 0) {
    out.push(`这一年有 ${stats.lifeRitualCount} 场生命仪礼被记下。`)
  }
  if (comparison && comparison.years.length >= 2) {
    const cur = comparison.rituals[comparison.rituals.length - 1]
    const prev = comparison.rituals[comparison.rituals.length - 2]
    const diff = cur - prev
    if (diff > 0) out.push(`四季仪式较上年多 ${diff} 次，生长的痕迹清晰可见。`)
    else if (diff < 0) out.push(`四季仪式较上年少 ${-diff} 次，时节还在，慢慢来。`)
  }

  return out.slice(0, limit)
}