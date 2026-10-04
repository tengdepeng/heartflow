// ============================================================
// 时间长廊 · 视图桥接层（P22-3）
// 聚合 timeline 子模块，为视图层提供统一的响应式数据与操作
// ============================================================

import { ref, computed } from 'vue'
import {
  getRiverSource,
  createRiverItems,
  getAllTags,
  filterByTag,
  computeDailySummaries,
  type RiverSource,
  type RiverItem,
  type RiverItemType,
  type DailySummary,
} from './river'
import {
  computeTimelineStats,
  filterByTimeRange,
  filterByTypes,
  searchTimeline,
  advancedSearch,
  type TimelineStats,
  type TimeRange,
  type SearchHit,
  type AdvancedSearchOptions,
} from './timeline-filters'
import { getLocalDateKey } from '../../utils/time'
import {
  discoverPatterns,
  type WeeklyPattern,
  type SeasonalPattern,
  type YearlyTrend,
} from './timeline-patterns'
import {
  generateTimelineRadarReport,
  type RadarChart,
  type DayHourHeatmap,
  type EmotionHeatmap,
  type TagRadar,
  type TimelineRadarReport,
} from './timeline-radar'
import {
  useNarrativeGenerator,
  detectMilestones,
  type NarrativeReport,
  type Milestone,
} from './narrative-generator'
import {
  useEmotionCurve,
  type EmotionCurve,
  type EmotionTrend,
  type TurningPoint,
  type EmotionDataPoint,
} from './emotion-curve'
import {
  useAnnualReview,
  type AnnualReview,
} from './annual-review'
import {
  useExportEngine,
  type ExportResult,
  type ExportFormat,
  type ExportConfig,
} from './export-enhance'

// ============================================================
// 桥接层专用类型
// ============================================================

/** 时间线概览 */
export interface TimelineOverview {
  /** 总条目数 */
  totalItems: number
  /** 日期范围 */
  dateRange: { start: string; end: string }
  /** 活跃天数 */
  activeDays: number
  /** 连续活跃天数 */
  streak: number
  /** 条目类型分布 */
  typeDistribution: { type: RiverItemType; count: number; percentage: number }[]
  /** 日均条目数 */
  dailyAverage: number
  /** 标签分布（前 15） */
  tagDistribution: { tag: string; count: number }[]
  /** 最高产日 */
  mostActiveDay: { date: string; count: number }
  /** 原始统计 */
  rawStats: TimelineStats
}

/** 模式洞察 */
export interface PatternInsights {
  /** 周规律 */
  weeklyPattern: WeeklyPattern
  /** 季节规律 */
  seasonalPatterns: SeasonalPattern[]
  /** 年度趋势 */
  yearlyTrend: YearlyTrend | null
  /** 综合洞察文本 */
  combinedInsights: string
}

/** 时间线改进建议 */
export interface TimelineRecommendation {
  /** 建议类别 */
  category: 'focus' | 'emotion' | 'habit' | 'rest' | 'growth' | 'data'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 可执行操作 */
  action: string
}

/** 情感分析摘要 */
export interface EmotionAnalysisSummary {
  /** 当前情感曲线 */
  curve: EmotionCurve | null
  /** 趋势方向 */
  trendDirection: EmotionTrend['direction']
  /** 趋势强度 */
  trendStrength: number
  /** 趋势描述 */
  trendDescription: string
  /** 转折点列表 */
  turningPoints: TurningPoint[]
  /** 情感数据点 */
  dataPoints: EmotionDataPoint[]
}

/** 叙事摘要 */
export interface NarrativeSummaryBag {
  /** 最新每日叙事 */
  daily: NarrativeReport | null
  /** 最新每周叙事 */
  weekly: NarrativeReport | null
  /** 最新报告列表 */
  recent: NarrativeReport[]
}

/** 过滤条件 */
export interface BridgeFilterOptions {
  timeRange?: TimeRange
  types?: RiverItemType[]
  tag?: string
}

/** 导出选项 */
export interface BridgeExportOptions {
  target: 'narrative' | 'annual_review' | 'emotion_curve' | 'radar' | 'raw_data'
  format: ExportFormat
  narrativeReport?: NarrativeReport
  annualReview?: AnnualReview
  emotionCurve?: EmotionCurve
  radarReport?: TimelineRadarReport
  rawItems?: RiverItem[]
  config?: Partial<ExportConfig>
}

// ============================================================
// 默认活跃过滤器
// ============================================================

const DEFAULT_ACTIVE_FILTERS: RiverItemType[] = [
  'crystal', 'note', 'emotion', 'session', 'anchor',
]

// ============================================================
// useTimelineBridge
// ============================================================

export function useTimelineBridge() {
  // ---- 响应式状态 ----

  /** 当前数据源（可手动刷新） */
  const source = ref<RiverSource>(getRiverSource())

  /** 当前激活的条目类型过滤器 */
  const activeFilters = ref<RiverItemType[]>([...DEFAULT_ACTIVE_FILTERS])

  /** 当前过滤条件 */
  const currentFilter = ref<BridgeFilterOptions>({})

  /** 当前搜索词 */
  const currentSearchQuery = ref<string>('')

  /** 当前搜索命中结果 */
  const searchHits = ref<SearchHit[]>([])

  /** 是否正在加载 */
  const loading = ref<boolean>(false)

  // ---- 子模块实例 ----

  const narrativeGenerator = useNarrativeGenerator()
  const emotionCurveModule = useEmotionCurve()
  const annualReviewModule = useAnnualReview()
  const exportEngine = useExportEngine()

  // ---- 计算属性：基础数据 ----

  /** 所有条目（受 activeFilters 控制） */
  const items = computed<RiverItem[]>(() => {
    const raw = createRiverItems(source.value, activeFilters.value)
    let result = raw

    // 应用标签过滤
    if (currentFilter.value.tag) {
      result = filterByTag(result, currentFilter.value.tag)
    }

    // 应用时间范围过滤
    if (currentFilter.value.timeRange) {
      result = filterByTimeRange(result, currentFilter.value.timeRange)
    }

    // 应用类型过滤
    if (currentFilter.value.types && currentFilter.value.types.length > 0) {
      result = filterByTypes(result, currentFilter.value.types)
    }

    return result
  })

  /** 所有可用标签 */
  const allTags = computed<string[]>(() => getAllTags(source.value))

  // ---- 1. timelineOverview ----

  const timelineOverview = computed<TimelineOverview>(() => {
    const stats = computeTimelineStats(source.value, activeFilters.value)

    const allItems = createRiverItems(source.value, DEFAULT_ACTIVE_FILTERS)
    const daySet = new Set<string>()
    for (const item of allItems) {
      // 与 computeTimelineStats 的 dailyAverage 分母同口径（本地日历日）
      daySet.add(getLocalDateKey(new Date(item.ts)))
    }

    return {
      totalItems: stats.totalItems,
      dateRange: stats.dateRange,
      activeDays: daySet.size,
      streak: stats.streakDays,
      typeDistribution: stats.typeDistribution,
      dailyAverage: stats.dailyAverage,
      tagDistribution: stats.tagDistribution,
      mostActiveDay: stats.mostActiveDay,
      rawStats: stats,
    }
  })

  // ---- 2. patternInsights ----

  const patternInsights = computed<PatternInsights>(() => {
    const result = discoverPatterns(source.value)

    return {
      weeklyPattern: result.weeklyPattern,
      seasonalPatterns: result.seasonalPatterns,
      yearlyTrend: result.yearlyTrend,
      combinedInsights: result.overallInsight,
    }
  })

  // ---- 3. radarCharts ----

  const radarCharts = computed<TimelineRadarReport>(() => {
    return generateTimelineRadarReport(source.value)
  })

  /** 便捷访问：综合雷达图 */
  const radarChart = computed<RadarChart>(() => radarCharts.value.radar)

  /** 便捷访问：日周热力图 */
  const dayHourHeatmap = computed<DayHourHeatmap>(() => radarCharts.value.heatmap)

  /** 便捷访问：情绪热力图 */
  const emotionHeatmap = computed<EmotionHeatmap>(() => radarCharts.value.emotionHeatmap)

  /** 便捷访问：标签雷达 */
  const tagRadar = computed<TagRadar>(() => radarCharts.value.tagRadar)

  // ---- 4. emotionAnalysis ----

  const emotionAnalysis = computed<EmotionAnalysisSummary>(() => {
    const allItems = createRiverItems(source.value, DEFAULT_ACTIVE_FILTERS)

    if (allItems.length === 0) {
      return {
        curve: null,
        trendDirection: 'stable',
        trendStrength: 0,
        trendDescription: '暂无情感数据',
        turningPoints: [],
        dataPoints: [],
      }
    }

    const curve = emotionCurveModule.buildCurve('当前情感曲线', allItems, 'daily')

    return {
      curve,
      trendDirection: curve.trend.direction,
      trendStrength: curve.trend.strength,
      trendDescription: curve.trend.description,
      turningPoints: curve.turningPoints,
      dataPoints: curve.dataPoints,
    }
  })

  // ---- 5. narrativeSummary ----

  /** 叙事摘要缓存（命令式重建，避免在计算属性内调用含副作用的生成函数导致递归） */
  const narrativeSummaryRef = ref<NarrativeSummaryBag>({ daily: null, weekly: null, recent: [] })

  /** 命令式重建叙事摘要（在 refreshSource 中调用） */
  function rebuildNarrativeSummary(): void {
    try {
      narrativeGenerator.loadReports()
    } catch {
      // 忽略加载失败，保持缓存
    }

    const today = new Date().toISOString().slice(0, 10)
    let dailyReport: NarrativeReport | null = null
    try {
      dailyReport = narrativeGenerator.generateDailyNarrative(source.value, today)
    } catch {
      dailyReport = null
    }

    let weeklyReport: NarrativeReport | null = null
    try {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      const monday = new Date(now)
      monday.setDate(now.getDate() - mondayOffset)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)

      const weekStart = monday.toISOString().slice(0, 10)
      const weekEnd = sunday.toISOString().slice(0, 10)
      weeklyReport = narrativeGenerator.generateWeeklyReport(source.value, weekStart, weekEnd)
    } catch {
      weeklyReport = null
    }

    let recent: NarrativeReport[] = []
    try {
      recent = narrativeGenerator.getReportsByType('daily').slice(0, 7)
    } catch {
      recent = []
    }

    narrativeSummaryRef.value = { daily: dailyReport, weekly: weeklyReport, recent }
  }

  const narrativeSummary = computed<NarrativeSummaryBag>(() => narrativeSummaryRef.value)

  // ---- 6. milestones ----

  const milestones = computed<Milestone[]>(() => {
    const allItems = createRiverItems(source.value, DEFAULT_ACTIVE_FILTERS)
    return detectMilestones(allItems)
  })

  // ---- 7. recommendations ----

  const recommendations = computed<TimelineRecommendation[]>(() => {
    const recs: TimelineRecommendation[] = []
    const overview = timelineOverview.value
    const patterns = patternInsights.value
    const emotion = emotionAnalysis.value

    // 1. 数据量建议
    if (overview.totalItems === 0) {
      recs.push({
        category: 'data',
        priority: 'high',
        title: '开始记录时间线',
        description: '当前时间线没有任何数据，建议从记录今天的第一条专注或情绪开始',
        action: '创建第一条专注会话或情绪记录',
      })
      return recs
    }

    // 2. 专注建议
    if (overview.dailyAverage < 2 && overview.activeDays > 3) {
      recs.push({
        category: 'focus',
        priority: 'high',
        title: '提升记录频率',
        description: `日均仅 ${overview.dailyAverage} 条记录，建议增加日常记录频率`,
        action: '每天至少记录 1 次专注和 1 次情绪',
      })
    }

    // 3. 连续活跃建议
    if (overview.streak === 0 && overview.activeDays > 0) {
      recs.push({
        category: 'habit',
        priority: 'medium',
        title: '建立连续记录习惯',
        description: '当前没有连续活跃记录，建议开始每日打卡',
        action: '设定每日提醒，保持连续记录',
      })
    } else if (overview.streak >= 7) {
      recs.push({
        category: 'habit',
        priority: 'low',
        title: '连续活跃表现优秀',
        description: `已连续活跃 ${overview.streak} 天，继续保持！`,
        action: '挑战更长的连续记录',
      })
    }

    // 4. 类型分布建议
    const typeDistribution = overview.typeDistribution
    const hasEmotions = typeDistribution.some(t => t.type === 'emotion' && t.count > 0)
    const hasNotes = typeDistribution.some(t => t.type === 'note' && t.count > 0)
    const hasCrystals = typeDistribution.some(t => t.type === 'crystal' && t.count > 0)

    if (!hasEmotions && overview.totalItems > 5) {
      recs.push({
        category: 'emotion',
        priority: 'high',
        title: '添加情绪记录',
        description: '当前时间线缺少情绪数据，情绪记录有助于自我觉察',
        action: '在记录中添加情绪标注',
      })
    }

    if (!hasNotes && overview.totalItems > 5) {
      recs.push({
        category: 'growth',
        priority: 'medium',
        title: '开始写笔记',
        description: '笔记可以帮助沉淀思考和收获',
        action: '尝试每天写一篇简短笔记',
      })
    }

    if (!hasCrystals && overview.totalItems > 10) {
      recs.push({
        category: 'growth',
        priority: 'medium',
        title: '生成时间结晶',
        description: '时间结晶是专注成果的凝聚，有助于回顾和反思',
        action: '在专注会话结束后生成时间结晶',
      })
    }

    // 5. 周规律建议
    if (patterns.weeklyPattern.bestDayFocusMinutes > 0) {
      const bestDay = patterns.weeklyPattern.bestDayLabel
      const worstDay = patterns.weeklyPattern.worstDayLabel
      recs.push({
        category: 'focus',
        priority: 'low',
        title: `利用周规律优化安排`,
        description: `${bestDay}专注度最高，${worstDay}专注度最低`,
        action: `在${bestDay}安排重要任务，${worstDay}设为休息或轻松日`,
      })
    }

    // 6. 情绪趋势建议
    if (emotion.trendDirection === 'declining' && emotion.trendStrength > 0.3) {
      recs.push({
        category: 'emotion',
        priority: 'high',
        title: '关注情绪下降趋势',
        description: emotion.trendDescription,
        action: '建议增加休息和放松活动，尝试正念冥想或户外运动',
      })
    }

    if (emotion.trendDirection === 'volatile') {
      recs.push({
        category: 'emotion',
        priority: 'medium',
        title: '情绪波动较大',
        description: emotion.trendDescription,
        action: '尝试建立规律的生活节奏，稳定情绪状态',
      })
    }

    // 7. 标签使用建议
    if (overview.tagDistribution.length === 0 && overview.totalItems > 10) {
      recs.push({
        category: 'habit',
        priority: 'medium',
        title: '使用标签分类',
        description: '当前没有使用标签，标签可以帮助分类和检索',
        action: '为记录添加标签，如"工作"、"学习"、"健康"等',
      })
    }

    return recs.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  })

  // ============================================================
  // 操作方法
  // ============================================================

  /** 刷新数据源 */
  function refreshSource(): void {
    loading.value = true
    try {
      source.value = getRiverSource()
      rebuildNarrativeSummary()
    } finally {
      loading.value = false
    }
  }

  /** 添加条目（通过刷新数据源实现） */
  function addItem(): void {
    refreshSource()
  }

  /** 设置活跃过滤器 */
  function setActiveFilters(types: RiverItemType[]): void {
    activeFilters.value = [...types]
  }

  /** 过滤条目 */
  function filterItems(options: BridgeFilterOptions): RiverItem[] {
    currentFilter.value = { ...options }
    return items.value
  }

  /** 清除过滤条件 */
  function clearFilter(): void {
    currentFilter.value = {}
    currentSearchQuery.value = ''
    searchHits.value = []
  }

  /** 基础搜索 */
  function searchItems(
    query: string,
    fields: ('title' | 'content' | 'tags')[] = ['title', 'content', 'tags'],
    caseSensitive: boolean = false,
  ): SearchHit[] {
    currentSearchQuery.value = query
    if (!query.trim()) {
      searchHits.value = []
      return []
    }

    const hits = searchTimeline(items.value, { query, fields, caseSensitive })
    searchHits.value = hits
    return hits
  }

  /** 高级搜索 */
  function advancedSearchItems(options: Partial<AdvancedSearchOptions>): SearchHit[] {
    currentSearchQuery.value = options.query || ''
    const hits = advancedSearch(items.value, options)
    searchHits.value = hits
    return hits
  }

  /** 生成叙事报告 */
  function generateNarrative(
    type: 'daily' | 'weekly' | 'monthly' | 'yearly',
    ...args: any[]
  ): NarrativeReport | null {
    refreshSource()

    try {
      switch (type) {
        case 'daily': {
          const date = (args[0] as string) || new Date().toISOString().slice(0, 10)
          return narrativeGenerator.generateDailyNarrative(source.value, date)
        }
        case 'weekly': {
          const weekStart = args[0] as string
          const weekEnd = args[1] as string
          if (!weekStart || !weekEnd) return null
          return narrativeGenerator.generateWeeklyReport(source.value, weekStart, weekEnd)
        }
        case 'monthly': {
          const year = args[0] as number
          const month = args[1] as number
          if (year == null || month == null) return null
          return narrativeGenerator.generateMonthlyReport(source.value, year, month)
        }
        case 'yearly': {
          const year = args[0] as number
          if (year == null) return null
          return narrativeGenerator.generateYearlyReport(source.value, year)
        }
        default:
          return null
      }
    } catch {
      return null
    }
  }

  /** 导出数据 */
  function exportData(options: BridgeExportOptions): ExportResult | null {
    try {
      switch (options.target) {
        case 'narrative': {
          if (!options.narrativeReport) return null
          return exportEngine.exportNarrativeReport(
            options.narrativeReport,
            options.format,
            options.config,
          )
        }
        case 'annual_review': {
          if (!options.annualReview) return null
          return exportEngine.exportAnnualReview(
            options.annualReview,
            options.format,
            options.config,
          )
        }
        case 'emotion_curve': {
          if (!options.emotionCurve) return null
          return exportEngine.exportEmotionCurve(
            options.emotionCurve,
            options.format,
            options.config,
          )
        }
        case 'radar': {
          if (!options.radarReport) return null
          return exportEngine.exportRadar(
            options.radarReport,
            options.format,
            options.config,
          )
        }
        case 'raw_data': {
          const rawItems = options.rawItems || createRiverItems(
            source.value,
            DEFAULT_ACTIVE_FILTERS,
          )
          return exportEngine.exportRawData(rawItems, options.format, options.config)
        }
        default:
          return null
      }
    } catch {
      return null
    }
  }

  /** 获取每日摘要 */
  function getDailySummaries(): DailySummary[] {
    // 与 computeDailySummaries 的分组键同为本地日历日，勿用 UTC ISO 日期
    const today = getLocalDateKey()
    const yesterday = getLocalDateKey(new Date(Date.now() - 86400000))
    return computeDailySummaries(items.value, today, yesterday)
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    source,
    items,
    activeFilters,
    currentFilter,
    currentSearchQuery,
    searchHits,
    loading,
    allTags,

    // 计算属性
    timelineOverview,
    patternInsights,
    radarCharts,
    radarChart,
    dayHourHeatmap,
    emotionHeatmap,
    tagRadar,
    emotionAnalysis,
    narrativeSummary,
    milestones,
    recommendations,

    // 操作
    refreshSource,
    addItem,
    setActiveFilters,
    filterItems,
    clearFilter,
    searchItems,
    advancedSearchItems,
    generateNarrative,
    exportData,
    getDailySummaries,

    // 子模块实例（供高级用户直接使用）
    narrativeGenerator,
    emotionCurveModule,
    annualReviewModule,
    exportEngine,
  }
}