// ============================================================
// 岁时阁 · 视图桥接层 (P22-4)
//
// 蓝图定义：
//   聚合所有岁时阁子模块，为视图层提供统一的数据流。
//   将分散的 rituals / cocoons / journal / overview 子模块
//   桥接为视图可直接消费的 computed 属性与方法。
// ============================================================

import { computed, ref } from 'vue'
// ⚠️ 指向真实定义文件，**不要**从 './index' 取符号：
// index.ts 会 re-export 本文件，barrel 自引用会构成 index ↔ bridge 循环依赖
import { useSeasonalRituals, usePrivateRituals, useSolarTerms } from './seasonal-store'
import {
  computeCocoonStats,
} from './cocoon'
import type { Cocoon, CocoonStage } from './cocoon'
import { useCocoonStore } from './cocoon-store'
import {
  createJournalEntry as createJournalEntryFn,
  analyzeSeasonalMood,
  generateMoodTrend,
  generateSeasonTransition,
  generateYearReview as generateYearReviewFn,
  getCurrentSeason,
} from './seasonal-journal'
import type {
  SeasonalJournalEntry,
  SeasonalMood,
  MoodTrend,
  SeasonTransition,
  YearReview,
} from './seasonal-journal'
import type { Season, Festival, SolarTerm } from './types'
import { SEASON_META } from './data'

// ============================================================
// 导出类型
// ============================================================

/** 季节概览 */
export interface SeasonalOverview {
  /** 当前季节 */
  currentSeason: Season
  /** 当前季节标签 */
  currentSeasonLabel: string
  /** 当前季节图标 */
  currentSeasonIcon: string
  /** 下一个节气 */
  nextSolarTerm: SolarTerm
  /** 即将到来的节日（前3个） */
  upcomingFestivals: (Festival & { date: string })[]
  /** 季节进度百分比 0-100 */
  seasonProgress: number
}

/** 仪式统计 */
export interface RitualStats {
  /** 仪式总数 */
  total: number
  /** 已完成（有打卡记录的）仪式数 */
  completed: number
  /** 连续打卡天数 */
  streak: number
  /** 按季节分布 */
  bySeason: { season: Season; label: string; count: number }[]
}

/** 季节推荐 */
export interface SeasonalRecommendation {
  id: string
  /** 推荐类型 */
  type: 'ritual' | 'cocoon' | 'journal' | 'festival' | 'solar_term'
  /** 推荐标题 */
  title: string
  /** 推荐描述 */
  description: string
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 关联操作 */
  action?: string
}

// ============================================================
// 视图桥接 composable
// ============================================================

export function useSeasonalBridge() {
  // ---- 子模块实例 ----
  const {
    rituals,
    stats,
    addRitual: addSeasonalRitual,
    completeRitual: completeSeasonalRitual,
  } = useSeasonalRituals()

  const { lifeRituals } = usePrivateRituals()

  const { upcomingTerm, upcomingFestivals } = useSolarTerms()

  // ---- 响应式状态：光茧 & 日志 ----
  // 光茧改用持久化 store 作为单一数据源（跨会话保留，供岁时阁与蜕变画廊共享）
  const cocoonStore = useCocoonStore()
  const cocoons = cocoonStore.cocoons
  const journalEntries = ref<SeasonalJournalEntry[]>([])

  // ============================================================
  // 1. seasonalOverview — 季节概览
  // ============================================================
  const seasonalOverview = computed<SeasonalOverview>(() => {
    const season = getCurrentSeason()
    const meta = SEASON_META.find(m => m.key === season)!
    const progress = computeSeasonProgress(season)

    return {
      currentSeason: season,
      currentSeasonLabel: meta.label,
      currentSeasonIcon: meta.icon,
      nextSolarTerm: upcomingTerm.value,
      upcomingFestivals: upcomingFestivals.value.slice(0, 3),
      seasonProgress: progress,
    }
  })

  // ============================================================
  // 2. ritualStats — 仪式统计
  // ============================================================
  const ritualStats = computed<RitualStats>(() => {
    const bySeason = SEASON_META.map(m => ({
      season: m.key,
      label: m.label,
      count: rituals.value.filter(r => r.season === m.key).length,
    }))

    return {
      total: stats.value.total,
      completed: stats.value.active,
      streak: stats.value.streak,
      bySeason,
    }
  })

  // ============================================================
  // 3. cocoonProgress — 光茧进度
  // ============================================================
  const cocoonProgress = computed(() => {
    const cs = computeCocoonStats(cocoons.value)

    return {
      /** 完整统计 */
      stats: cs,
      /** 活跃光茧（未完成蜕变的） */
      activeCocoons: cocoons.value.filter(c => c.stage !== 'flying'),
      /** 阶段分布 */
      stageDistribution: cs.byStage,
      /** 完成率 0-1 */
      completionRate: cs.total > 0 ? cs.completed / cs.total : 0,
    }
  })

  // ============================================================
  // 4. moodAnalysis — 当前季节情绪分析
  // ============================================================
  const moodAnalysis = computed<SeasonalMood | null>(() => {
    const season = getCurrentSeason()
    const year = new Date().getFullYear()
    return analyzeSeasonalMood(journalEntries.value, season, year)
  })

  /** 跨季节情绪趋势 */
  const moodTrend = computed<MoodTrend>(() => {
    return generateMoodTrend(journalEntries.value)
  })

  // ============================================================
  // 5. yearReview — 最新年度回顾
  // ============================================================
  const yearReview = computed<YearReview | null>(() => {
    const year = new Date().getFullYear()
    const entries = journalEntries.value.filter(e => e.year === year)
    if (entries.length === 0) return null
    return generateYearReviewFn(year, journalEntries.value, cocoons.value, rituals.value)
  })

  // ============================================================
  // 6. seasonTransition — 季节转换仪式
  // ============================================================
  const seasonTransition = computed<SeasonTransition | null>(() => {
    const current = getCurrentSeason()
    const next = getNextSeason(current)
    const threshold = getSeasonTransitionThreshold(current)

    const now = new Date()
    const daysUntil = Math.ceil((threshold.getTime() - now.getTime()) / 86_400_000)

    // 仅在季节边界前 14 天内展示转换仪式
    if (daysUntil < 0 || daysUntil > 14) return null

    return generateSeasonTransition(
      current,
      next,
      journalEntries.value,
      cocoons.value,
      rituals.value,
    )
  })

  // ============================================================
  // 7. recommendations — 季节性活动建议
  // ============================================================
  const recommendations = computed<SeasonalRecommendation[]>(() => {
    const result: SeasonalRecommendation[] = []
    const season = getCurrentSeason()
    const meta = SEASON_META.find(m => m.key === season)!

    // 获取当前季节的仪式
    const seasonRituals = rituals.value.filter(r => r.season === season)

    // 推荐：若无当前季节仪式，建议创建
    if (seasonRituals.length === 0) {
      result.push({
        id: 'rec_new_ritual',
        type: 'ritual',
        title: `创建${meta.label}季仪式`,
        description: `为${meta.label}季设定一个仪式，记录季节的独特体验`,
        priority: 'high',
        action: 'createRitual',
      })
    }

    // 推荐：有待完成的仪式打卡
    const now = new Date()
    const pendingRituals = seasonRituals.filter(r => {
      if (!r.lastCompletedAt) return true
      const last = new Date(r.lastCompletedAt)
      return now.getTime() - last.getTime() > 7 * 86_400_000
    })
    if (pendingRituals.length > 0) {
      result.push({
        id: 'rec_complete_ritual',
        type: 'ritual',
        title: '完成仪式打卡',
        description: `你有 ${pendingRituals.length} 个仪式等待打卡`,
        priority: 'high',
        action: 'completeRitual',
      })
    }

    // 推荐：当前季节尚无光茧，建议创建
    if (cocoons.value.filter(c => c.season === season).length === 0) {
      result.push({
        id: 'rec_new_cocoon',
        type: 'cocoon',
        title: '创建蜕变光茧',
        description: '记录一个正在成长的蜕变目标，见证自己的变化',
        priority: 'medium',
        action: 'createCocoon',
      })
    }

    // 推荐：当前季节尚未写日志
    const seasonEntries = journalEntries.value.filter(e => e.season === season)
    if (seasonEntries.length === 0) {
      result.push({
        id: 'rec_journal',
        type: 'journal',
        title: `写一篇${meta.label}季日志`,
        description: '记录当下的感受与思考，为季节留痕',
        priority: 'medium',
        action: 'createJournalEntry',
      })
    }

    // 推荐：即将到来的节日
    if (upcomingFestivals.value.length > 0) {
      const nextFestival = upcomingFestivals.value[0]
      result.push({
        id: `rec_festival_${nextFestival.name}`,
        type: 'festival',
        title: `${nextFestival.name}即将到来`,
        description: `${nextFestival.date}，提前准备庆祝活动`,
        priority: 'low',
      })
    }

    // 推荐：下一个节气
    result.push({
      id: 'rec_solar_term',
      type: 'solar_term',
      title: `${upcomingTerm.value.name}将至`,
      description: upcomingTerm.value.desc,
      priority: 'low',
    })

    return result
  })

  // ============================================================
  // 8. 操作方法
  // ============================================================

  /** 添加仪式（自动使用当前季节） */
  function addRitual(name: string, season?: Season, description?: string): void {
    addSeasonalRitual(name, season || getCurrentSeason(), description || '')
  }

  /** 完成仪式打卡 */
  function completeRitual(id: string): void {
    completeSeasonalRitual(id)
  }

  /** 创建光茧 */
  function createCocoon(
    name: string,
    season?: Season,
    lifeRitualId?: string,
    lifeRitualName?: string,
  ): Cocoon {
    return cocoonStore.createCocoon(name, season, lifeRitualId, lifeRitualName)
  }

  /** 推进光茧阶段 */
  function advanceCocoon(
    cocoonId: string,
    to: CocoonStage,
    reason?: string,
  ): Cocoon | null {
    return cocoonStore.advanceCocoon(cocoonId, to, reason)
  }

  /** 创建季节日志 */
  function createJournalEntry(
    title: string,
    content: string,
    mood: SeasonalJournalEntry['mood'],
    season?: Season,
  ): SeasonalJournalEntry {
    const entry = createJournalEntryFn(
      title,
      content,
      mood,
      season || getCurrentSeason(),
    )
    journalEntries.value.unshift(entry)
    return entry
  }

  /** 生成年度回顾 */
  function generateYearReview(year?: number): YearReview {
    const y = year || new Date().getFullYear()
    return generateYearReviewFn(y, journalEntries.value, cocoons.value, rituals.value)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 计算属性
    seasonalOverview,
    ritualStats,
    cocoonProgress,
    moodAnalysis,
    moodTrend,
    yearReview,
    seasonTransition,
    recommendations,
    // 原始响应式数据（供视图层直接消费）
    rituals,
    cocoons,
    journalEntries,
    lifeRituals,
    // 操作
    addRitual,
    completeRitual,
    createCocoon,
    advanceCocoon,
    createJournalEntry,
    generateYearReview,
  }
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 计算季节进度百分比。
 * 季节边界：
 *   春: 3/1 - 5/31
 *   夏: 6/1 - 8/31
 *   秋: 9/1 - 11/30
 *   冬: 12/1 - 次年 2/28
 */
function computeSeasonProgress(season: Season): number {
  const now = new Date()
  const year = now.getFullYear()

  const boundaries: Record<Season, { startMonth: number; startDay: number; endMonth: number; endDay: number }> = {
    spring:  { startMonth: 3,  startDay: 1, endMonth: 5,  endDay: 31 },
    summer:  { startMonth: 6,  startDay: 1, endMonth: 8,  endDay: 31 },
    autumn:  { startMonth: 9,  startDay: 1, endMonth: 11, endDay: 30 },
    winter:  { startMonth: 12, startDay: 1, endMonth: 2,  endDay: 28 },
  }

  const { startMonth, startDay, endMonth, endDay } = boundaries[season]

  let startDate: Date
  let endDate: Date

  if (season === 'winter') {
    // 冬季跨年：若当前在 1-2 月，则开始于去年 12 月
    if (now.getMonth() < 2) {
      startDate = new Date(year - 1, startMonth - 1, startDay)
      endDate = new Date(year, endMonth - 1, endDay)
    } else {
      startDate = new Date(year, startMonth - 1, startDay)
      endDate = new Date(year + 1, endMonth - 1, endDay)
    }
  } else {
    startDate = new Date(year, startMonth - 1, startDay)
    endDate = new Date(year, endMonth - 1, endDay)
  }

  const total = endDate.getTime() - startDate.getTime()
  if (total <= 0) return 0

  const elapsed = now.getTime() - startDate.getTime()
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

/** 获取下一个季节 */
function getNextSeason(season: Season): Season {
  const order: Season[] = ['spring', 'summer', 'autumn', 'winter']
  const idx = order.indexOf(season)
  return order[(idx + 1) % 4]
}

/**
 * 获取季节转换阈值日期。
 * 返回当前季节的结束日期，用于判断距离季节转换还有多少天。
 */
function getSeasonTransitionThreshold(season: Season): Date {
  const now = new Date()
  const year = now.getFullYear()

  switch (season) {
    case 'spring':
      return new Date(year, 4, 31)  // May 31
    case 'summer':
      return new Date(year, 7, 31)  // Aug 31
    case 'autumn':
      return new Date(year, 10, 30) // Nov 30
    case 'winter':
      return new Date(year + 1, 1, 28) // Feb 28 next year
  }
}