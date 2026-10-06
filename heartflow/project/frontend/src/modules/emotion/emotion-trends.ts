// ============================================================
// 情绪花房 · 情绪趋势分析仪表盘（P16-14）
// 时间序列分析、情绪模式检测、周期识别、预测分析、仪表盘数据
// ============================================================

import { ref, computed } from 'vue'
import { getLocalMonthKey, getLocalDateKey } from '../../utils/time'
import type { EmotionRecord } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 情绪趋势周期 */
export type TrendPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

/** 趋势数据点 */
export interface TrendDataPoint {
  /** 时间标签 */
  label: string
  /** 时间戳 */
  timestamp: number
  /** 各情绪类型计数 */
  counts: Record<string, number>
  /** 总计 */
  total: number
  /** 主导情绪 */
  dominant: string
  /** 情绪多样性指数 */
  diversity: number
  /** 平均情绪强度 */
  avgIntensity: number
}

/** 情绪模式 */
export interface EmotionPattern {
  /** 模式 ID */
  id: string
  /** 模式名称 */
  name: string
  /** 模式描述 */
  description: string
  /** 涉及的情绪类型 */
  emotions: string[]
  /** 模式类型 */
  type: 'cycle' | 'shift' | 'spike' | 'decline' | 'stable' | 'mixed'
  /** 置信度 */
  confidence: number
  /** 检测到的周期（天） */
  cycleDays?: number
  /** 起始时间 */
  startTime: number
  /** 结束时间 */
  endTime: number
  /** 模式强度 */
  intensity: number
}

/** 情绪预测 */
export interface EmotionPrediction {
  /** 预测日期 */
  date: string
  /** 预测的主导情绪 */
  predictedDominant: string
  /** 各情绪预测概率 */
  probabilities: Record<string, number>
  /** 置信度 */
  confidence: number
  /** 基于的历史数据天数 */
  basedOnDays: number
}

/** 情绪趋势摘要 */
export interface TrendSummary {
  /** 总记录数 */
  totalRecords: number
  /** 分析天数 */
  daysAnalyzed: number
  /** 主导情绪 */
  dominantEmotion: string
  /** 主导情绪占比 */
  dominantRatio: number
  /** 情绪多样性指数 */
  diversityIndex: number
  /** 情绪稳定性评分 */
  stabilityScore: number
  /** 积极情绪比例 */
  positiveRatio: number
  /** 消极情绪比例 */
  negativeRatio: number
  /** 情绪变化趋势 */
  overallTrend: 'improving' | 'declining' | 'stable' | 'volatile'
  /** 检测到的模式数量 */
  patternCount: number
  /** 最近的情绪波动 */
  recentVolatility: number
}

/** 仪表盘面板数据 */
export interface DashboardPanel {
  /** 面板 ID */
  id: string
  /** 面板标题 */
  title: string
  /** 面板类型 */
  type: 'chart' | 'metric' | 'list' | 'heatmap' | 'radar'
  /** 图表类型 */
  chartType?: 'line' | 'bar' | 'pie' | 'area' | 'scatter'
  /** 数据 */
  data: unknown
  /** 数据标签 */
  labels?: string[]
  /** 配色方案 */
  colorScheme?: string[]
  /** 面板描述 */
  description?: string
  /** 刷新间隔（秒） */
  refreshInterval?: number
}

/** 情绪仪表盘配置 */
export interface EmotionDashboardConfig {
  /** 默认分析周期 */
  defaultPeriod: TrendPeriod
  /** 最大历史天数 */
  maxHistoryDays: number
  /** 预测天数 */
  predictionDays: number
  /** 模式检测最小置信度 */
  minPatternConfidence: number
  /** 是否启用自动刷新 */
  autoRefresh: boolean
  /** 自动刷新间隔（秒） */
  refreshInterval: number
}

/** 情绪趋势配置 */
export interface EmotionTrendsConfig {
  /** 默认分析周期 */
  defaultPeriod: TrendPeriod
  /** 是否启用预测 */
  enablePrediction: boolean
  /** 预测天数 */
  predictionDays: number
  /** 模式检测灵敏度 */
  patternSensitivity: 'low' | 'medium' | 'high'
  /** 是否启用异常检测 */
  enableAnomalyDetection: boolean
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_TRENDS_CONFIG: EmotionTrendsConfig = {
  defaultPeriod: 'weekly',
  enablePrediction: true,
  predictionDays: 7,
  patternSensitivity: 'medium',
  enableAnomalyDetection: true,
}

export const DEFAULT_DASHBOARD_CONFIG: EmotionDashboardConfig = {
  defaultPeriod: 'weekly',
  maxHistoryDays: 365,
  predictionDays: 7,
  minPatternConfidence: 0.5,
  autoRefresh: false,
  refreshInterval: 300,
}

/** 情绪颜色映射 */
export const EMOTION_COLORS: Record<string, string> = {
  happy: '#e0a96d',
  sad: '#6366f1',
  anxious: '#f97316',
  angry: '#c46a5a',
  calm: '#22c55e',
  excited: '#d98c7a',
  grateful: '#14b8a6',
  tired: '#94a3b8',
  inspired: '#a07c8c',
  neutral: '#6b7280',
}

/** 情绪类型分类 */
export const POSITIVE_EMOTIONS = ['happy', 'excited', 'grateful', 'inspired', 'calm']
export const NEGATIVE_EMOTIONS = ['sad', 'anxious', 'angry', 'tired']

// ============================================================
// useEmotionTrends Composable
// ============================================================

export function useEmotionTrends(config?: Partial<EmotionTrendsConfig>) {
  // ---- 配置 ----
  const trendsConfig = ref<EmotionTrendsConfig>({
    ...DEFAULT_TRENDS_CONFIG,
    ...config,
  })

  // ---- 状态 ----
  const trendData = ref<TrendDataPoint[]>([])
  const patterns = ref<EmotionPattern[]>([])
  const predictions = ref<EmotionPrediction[]>([])
  const summary = ref<TrendSummary | null>(null)
  const isAnalyzing = ref(false)
  const lastAnalyzedAt = ref<number | null>(null)

  // ---- 派生状态 ----
  const hasData = computed(() => trendData.value.length > 0)

  const latestTrend = computed(() =>
    trendData.value.length > 0 ? trendData.value[trendData.value.length - 1] : null,
  )

  const activePatterns = computed(() =>
    patterns.value.filter(p => p.endTime >= Date.now() - 7 * 24 * 60 * 60 * 1000),
  )

  const activePatternCount = computed(() => activePatterns.value.length)

  // ============================================================
  // 时间序列分析
  // ============================================================

  /** 构建趋势数据 */
  function buildTrends(
    records: EmotionRecord[],
    period: TrendPeriod = 'weekly',
    days: number = 30,
  ): TrendDataPoint[] {
    if (records.length === 0) return []

    const now = Date.now()
    const cutoff = now - days * 24 * 60 * 60 * 1000

    // 根据周期确定分组粒度
    let groupBy: (ts: number) => string

    switch (period) {
      case 'daily':
        groupBy = (ts) => getLocalDateKey(new Date(ts))
        break
      case 'weekly':
        groupBy = (ts) => {
          const d = new Date(ts)
          const dayOfWeek = d.getDay()
          const monday = new Date(d)
          monday.setDate(d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1))
          return getLocalDateKey(monday)
        }
        break
      case 'monthly':
        groupBy = (ts) => getLocalMonthKey(ts)
        break
      case 'quarterly':
        groupBy = (ts) => {
          const d = new Date(ts)
          const quarter = Math.floor(d.getMonth() / 3) + 1
          return `${d.getFullYear()}-Q${quarter}`
        }
        break
      case 'yearly':
        groupBy = (ts) => new Date(ts).getFullYear().toString()
        break
    }

    // 筛选时间范围内的记录
    const filtered = records.filter(r => {
      const ts = new Date(r.createdAt).getTime()
      return ts >= cutoff && ts <= now
    })

    // 分组聚合
    const groups: Record<string, EmotionRecord[]> = {}
    for (const r of filtered) {
      const key = groupBy(new Date(r.createdAt).getTime())
      if (!groups[key]) groups[key] = []
      groups[key].push(r)
    }

    // 生成填充全部时间槽
    const points: TrendDataPoint[] = []

    // 填充空白时间段
    let currentSlot = cutoff
    while (currentSlot <= now) {
      const slotKey = groupBy(currentSlot)
      if (!groups[slotKey]) {
        groups[slotKey] = []
      }

      const nextSlot = getNextSlot(currentSlot, period)
      currentSlot = nextSlot
    }

    const allKeys = Object.keys(groups).sort()
    for (const key of allKeys) {
      const groupRecords = groups[key] ?? []
      const counts: Record<string, number> = {}
      let totalIntensity = 0

      for (const r of groupRecords) {
        counts[r.type] = (counts[r.type] ?? 0) + 1
        totalIntensity += 1
      }

      const total = groupRecords.length
      const emotionTypes = Object.keys(counts)
      let dominant = 'neutral'
      let maxCount = 0
      for (const [type, count] of Object.entries(counts)) {
        if (count > maxCount) {
          maxCount = count
          dominant = type
        }
      }

      const diversity = emotionTypes.length > 0
        ? emotionTypes.length / Object.keys(EMOTION_COLORS).length
        : 0

      const avgIntensity = total > 0 ? totalIntensity / total : 0

      // 计算时间戳
      const ts = key.includes('Q')
        ? new Date(key.replace('Q', '')).getTime() // 简化处理
        : new Date(key).getTime()

      points.push({
        label: key,
        timestamp: ts,
        counts,
        total,
        dominant,
        diversity: Math.round(diversity * 100) / 100,
        avgIntensity: Math.round(avgIntensity * 100) / 100,
      })
    }

    trendData.value = points
    return points
  }

  /** 获取趋势摘要 */
  function computeSummary(records: EmotionRecord[], days: number = 30): TrendSummary {
    if (records.length === 0) {
      return {
        totalRecords: 0,
        daysAnalyzed: 0,
        dominantEmotion: 'neutral',
        dominantRatio: 0,
        diversityIndex: 0,
        stabilityScore: 0,
        positiveRatio: 0,
        negativeRatio: 0,
        overallTrend: 'stable',
        patternCount: 0,
        recentVolatility: 0,
      }
    }

    const now = Date.now()
    const cutoff = now - days * 24 * 60 * 60 * 1000
    const filtered = records.filter(r => new Date(r.createdAt).getTime() >= cutoff)

    // 情绪计数
    const typeCounts: Record<string, number> = {}
    for (const r of filtered) {
      typeCounts[r.type] = (typeCounts[r.type] ?? 0) + 1
    }

    const total = filtered.length
    let dominant = 'neutral'
    let maxCount = 0
    for (const [type, count] of Object.entries(typeCounts)) {
      if (count > maxCount) { maxCount = count; dominant = type }
    }

    const emotionTypes = Object.keys(typeCounts)
    const diversityIndex = emotionTypes.length / Object.keys(EMOTION_COLORS).length

    // 积极/消极比例
    let positiveCount = 0
    let negativeCount = 0
    for (const [type, count] of Object.entries(typeCounts)) {
      if (POSITIVE_EMOTIONS.includes(type)) positiveCount += count
      if (NEGATIVE_EMOTIONS.includes(type)) negativeCount += count
    }

    // 稳定性评分：基于情绪类型切换频率
    const sorted = [...filtered].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    let switches = 0
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].type !== sorted[i - 1].type) switches++
    }
    const stabilityScore = sorted.length > 1
      ? Math.round(Math.max(0, 100 - (switches / (sorted.length - 1)) * 100))
      : 100

    // 整体趋势：比较前半段和后半段的积极比例
    const mid = Math.floor(sorted.length / 2)
    const firstHalf = sorted.slice(0, mid)
    const secondHalf = sorted.slice(mid)
    const firstPositive = firstHalf.filter(r => POSITIVE_EMOTIONS.includes(r.type)).length / Math.max(1, firstHalf.length)
    const secondPositive = secondHalf.filter(r => POSITIVE_EMOTIONS.includes(r.type)).length / Math.max(1, secondHalf.length)
    const diff = secondPositive - firstPositive

    let overallTrend: TrendSummary['overallTrend'] = 'stable'
    if (diff > 0.15) overallTrend = 'improving'
    else if (diff < -0.15) overallTrend = 'declining'
    else if (stabilityScore < 40) overallTrend = 'volatile'

    // 最近波动性
    const recentRecords = sorted.slice(-7)
    const recentTypes = new Set(recentRecords.map(r => r.type))
    const recentVolatility = recentRecords.length > 0
      ? recentTypes.size / recentRecords.length
      : 0

    const s: TrendSummary = {
      totalRecords: total,
      daysAnalyzed: days,
      dominantEmotion: dominant,
      dominantRatio: total > 0 ? Math.round(maxCount / total * 100) / 100 : 0,
      diversityIndex: Math.round(diversityIndex * 100) / 100,
      stabilityScore,
      positiveRatio: total > 0 ? Math.round(positiveCount / total * 100) / 100 : 0,
      negativeRatio: total > 0 ? Math.round(negativeCount / total * 100) / 100 : 0,
      overallTrend,
      patternCount: patterns.value.length,
      recentVolatility: Math.round(recentVolatility * 100) / 100,
    }

    summary.value = s
    return s
  }

  // ============================================================
  // 情绪模式检测
  // ============================================================

  /** 检测情绪模式 */
  function detectPatterns(records: EmotionRecord[]): EmotionPattern[] {
    if (records.length < 7) return []

    const results: EmotionPattern[] = []
    const sorted = [...records].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    const sensitivity = trendsConfig.value.patternSensitivity
    const minConfidence = sensitivity === 'high' ? 0.4 : sensitivity === 'medium' ? 0.5 : 0.6

    // 1. 检测周期性模式（寻找重复的情绪序列）
    const cyclePattern = detectCyclePattern(sorted, minConfidence)
    if (cyclePattern) results.push(cyclePattern)

    // 2. 检测情绪转变（shift）
    const shiftPatterns = detectShiftPatterns(sorted, minConfidence)
    results.push(...shiftPatterns)

    // 3. 检测情绪尖峰（spike）
    const spikePatterns = detectSpikePatterns(sorted, minConfidence)
    results.push(...spikePatterns)

    // 4. 检测稳定期
    const stablePattern = detectStablePattern(sorted, minConfidence)
    if (stablePattern) results.push(stablePattern)

    // 5. 检测情绪下降
    const declinePattern = detectDeclinePattern(sorted, minConfidence)
    if (declinePattern) results.push(declinePattern)

    patterns.value = results
    return results
  }

  /** 检测周期性模式 */
  function detectCyclePattern(records: EmotionRecord[], minConfidence: number): EmotionPattern | null {
    if (records.length < 14) return null

    // 将记录按天分组
    const dailyEmotions: Record<string, string[]> = {}
    for (const r of records) {
      const day = getLocalDateKey(new Date(r.createdAt))
      if (!dailyEmotions[day]) dailyEmotions[day] = []
      dailyEmotions[day].push(r.type)
    }

    const days = Object.keys(dailyEmotions).sort()
    if (days.length < 7) return null

    // 检测7天周期
    const weekPatterns: string[][] = []
    for (let i = 0; i < Math.min(4, Math.floor(days.length / 7)); i++) {
      const weekDays = days.slice(i * 7, (i + 1) * 7)
      const weekEmotions = weekDays.map(d => {
        const emotions = dailyEmotions[d]
        const counts: Record<string, number> = {}
        for (const e of emotions) { counts[e] = (counts[e] ?? 0) + 1 }
        let max = 0; let dominant = 'neutral'
        for (const [e, c] of Object.entries(counts)) { if (c > max) { max = c; dominant = e } }
        return dominant
      })
      weekPatterns.push(weekEmotions)
    }

    if (weekPatterns.length < 2) return null

    // 计算周期相似度
    let totalSimilarity = 0
    let comparisons = 0
    for (let i = 0; i < weekPatterns.length - 1; i++) {
      for (let j = i + 1; j < weekPatterns.length; j++) {
        let matches = 0
        const len = Math.min(weekPatterns[i].length, weekPatterns[j].length)
        for (let k = 0; k < len; k++) {
          if (weekPatterns[i][k] === weekPatterns[j][k]) matches++
        }
        const sim = len > 0 ? matches / len : 0
        totalSimilarity += sim
        comparisons++
      }
    }

    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0
    if (avgSimilarity < minConfidence) return null

    const uniqueEmotions = new Set<string>()
    for (const w of weekPatterns) { for (const e of w) uniqueEmotions.add(e) }

    return {
      id: `pattern_cycle_${Date.now().toString(36)}`,
      name: '周情绪周期',
      description: `检测到以7天为周期的情绪模式，相似度 ${Math.round(avgSimilarity * 100)}%`,
      emotions: [...uniqueEmotions],
      type: 'cycle',
      confidence: Math.round(avgSimilarity * 100) / 100,
      cycleDays: 7,
      startTime: new Date(days[0]).getTime(),
      endTime: new Date(days[days.length - 1]).getTime(),
      intensity: avgSimilarity,
    }
  }

  /** 检测情绪转变 */
  function detectShiftPatterns(records: EmotionRecord[], minConfidence: number): EmotionPattern[] {
    if (records.length < 10) return []

    const results: EmotionPattern[] = []
    const sorted = records

    // 使用滑动窗口检测显著的情绪类型变化
    const windowSize = Math.max(5, Math.floor(sorted.length / 4))
    for (let i = windowSize; i < sorted.length - windowSize; i += windowSize) {
      const beforeWindow = sorted.slice(0, i)
      const afterWindow = sorted.slice(i, i + windowSize)

      const beforeCounts: Record<string, number> = {}
      const afterCounts: Record<string, number> = {}
      for (const r of beforeWindow) beforeCounts[r.type] = (beforeCounts[r.type] ?? 0) + 1
      for (const r of afterWindow) afterCounts[r.type] = (afterCounts[r.type] ?? 0) + 1

      // 找出主导情绪变化
      let beforeDominant = 'neutral'
      let beforeMax = 0
      let afterDominant = 'neutral'
      let afterMax = 0
      for (const [t, c] of Object.entries(beforeCounts)) { if (c > beforeMax) { beforeMax = c; beforeDominant = t } }
      for (const [t, c] of Object.entries(afterCounts)) { if (c > afterMax) { afterMax = c; afterDominant = t } }

      if (beforeDominant !== afterDominant) {
        const beforeRatio = beforeMax / beforeWindow.length
        const afterRatio = afterMax / afterWindow.length
        const shiftConfidence = Math.min(beforeRatio, afterRatio) * 1.5

        if (shiftConfidence >= minConfidence) {
          results.push({
            id: `pattern_shift_${Date.now().toString(36)}_${i}`,
            name: `情绪转变：${beforeDominant} → ${afterDominant}`,
            description: `主导情绪从 ${getEmotionLabel(beforeDominant)} 转变为 ${getEmotionLabel(afterDominant)}`,
            emotions: [beforeDominant, afterDominant],
            type: 'shift',
            confidence: Math.round(Math.min(1, shiftConfidence) * 100) / 100,
            startTime: new Date(beforeWindow[0].createdAt).getTime(),
            endTime: new Date(afterWindow[afterWindow.length - 1].createdAt).getTime(),
            intensity: Math.abs(beforeRatio - afterRatio),
          })
        }
      }
    }

    return results.slice(0, 3)
  }

  /** 检测情绪尖峰 */
  function detectSpikePatterns(records: EmotionRecord[], minConfidence: number): EmotionPattern[] {
    if (records.length < 5) return []

    const results: EmotionPattern[] = []
    const sorted = records

    // 按天分组
    const dailyCounts: Record<string, Record<string, number>> = {}
    for (const r of sorted) {
      const day = getLocalDateKey(new Date(r.createdAt))
      if (!dailyCounts[day]) dailyCounts[day] = {}
      dailyCounts[day][r.type] = (dailyCounts[day][r.type] ?? 0) + 1
    }

    const days = Object.keys(dailyCounts).sort()
    if (days.length < 3) return []

    // 计算日平均记录数
    const dailyTotals = days.map(d => Object.values(dailyCounts[d]).reduce((a, b) => a + b, 0))
    const avgDaily = dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length

    // 检测明显高于平均的天数
    const spikeThreshold = avgDaily * 2
    for (let i = 0; i < days.length; i++) {
      if (dailyTotals[i] >= spikeThreshold && dailyTotals[i] >= 3) {
        const dayCounts = dailyCounts[days[i]]
        let maxType = 'neutral'
        let maxCount = 0
        for (const [t, c] of Object.entries(dayCounts)) { if (c > maxCount) { maxCount = c; maxType = t } }

        const spikeRatio = dailyTotals[i] / Math.max(1, avgDaily)
        const confidence = Math.min(1, spikeRatio / 3)

        if (confidence >= minConfidence) {
          results.push({
            id: `pattern_spike_${Date.now().toString(36)}_${i}`,
            name: `情绪尖峰：${getEmotionLabel(maxType)}`,
            description: `${days[i]} 出现 ${getEmotionLabel(maxType)} 情绪高峰，当日记录 ${dailyTotals[i]} 条`,
            emotions: [maxType],
            type: 'spike',
            confidence: Math.round(confidence * 100) / 100,
            startTime: new Date(days[i]).getTime(),
            endTime: new Date(days[i]).getTime() + 24 * 60 * 60 * 1000,
            intensity: spikeRatio,
          })
        }
      }
    }

    return results.slice(0, 3)
  }

  /** 检测稳定期 */
  function detectStablePattern(records: EmotionRecord[], minConfidence: number): EmotionPattern | null {
    if (records.length < 10) return null

    const sorted = records
    const half = Math.floor(sorted.length / 2)
    const recent = sorted.slice(-half)

    // 统计最近一半记录中每个情绪的比例
    const counts: Record<string, number> = {}
    for (const r of recent) counts[r.type] = (counts[r.type] ?? 0) + 1

    let maxType = 'neutral'
    let maxCount = 0
    for (const [t, c] of Object.entries(counts)) { if (c > maxCount) { maxCount = c; maxType = t } }

    const stability = maxCount / recent.length

    if (stability >= minConfidence + 0.1) {
      return {
        id: `pattern_stable_${Date.now().toString(36)}`,
        name: `情绪稳定期：${getEmotionLabel(maxType)}`,
        description: `最近持续以 ${getEmotionLabel(maxType)} 情绪为主，占比 ${Math.round(stability * 100)}%`,
        emotions: [maxType],
        type: 'stable',
        confidence: Math.round(stability * 100) / 100,
        startTime: new Date(recent[0].createdAt).getTime(),
        endTime: new Date(recent[recent.length - 1].createdAt).getTime(),
        intensity: stability,
      }
    }

    return null
  }

  /** 检测情绪下降 */
  function detectDeclinePattern(records: EmotionRecord[], minConfidence: number): EmotionPattern | null {
    if (records.length < 10) return null

    const sorted = records
    const quarter = Math.floor(sorted.length / 4)
    const firstQuarter = sorted.slice(0, quarter)
    const lastQuarter = sorted.slice(-quarter)

    const firstPositive = firstQuarter.filter(r => POSITIVE_EMOTIONS.includes(r.type)).length
    const lastPositive = lastQuarter.filter(r => POSITIVE_EMOTIONS.includes(r.type)).length
    const firstRatio = firstPositive / quarter
    const lastRatio = lastPositive / quarter
    const decline = firstRatio - lastRatio

    if (decline >= 0.3 && decline >= minConfidence) {
      return {
        id: `pattern_decline_${Date.now().toString(36)}`,
        name: '积极情绪下降',
        description: `积极情绪占比从 ${Math.round(firstRatio * 100)}% 下降到 ${Math.round(lastRatio * 100)}%`,
        emotions: [...new Set(sorted.map(r => r.type))],
        type: 'decline',
        confidence: Math.round(Math.min(1, decline) * 100) / 100,
        startTime: new Date(sorted[0].createdAt).getTime(),
        endTime: new Date(sorted[sorted.length - 1].createdAt).getTime(),
        intensity: decline,
      }
    }

    return null
  }

  // ============================================================
  // 情绪预测
  // ============================================================

  /** 预测未来情绪 */
  function predictEmotions(records: EmotionRecord[]): EmotionPrediction[] {
    if (!trendsConfig.value.enablePrediction || records.length < 7) return []

    const predictionDays = trendsConfig.value.predictionDays
    const results: EmotionPrediction[] = []

    // 按天统计情绪分布
    const dailyDistribution: Record<string, Record<string, number>> = {}
    for (const r of records) {
      const day = getLocalDateKey(new Date(r.createdAt))
      if (!dailyDistribution[day]) dailyDistribution[day] = {}
      dailyDistribution[day][r.type] = (dailyDistribution[day][r.type] ?? 0) + 1
    }

    const days = Object.keys(dailyDistribution).sort()
    if (days.length < 7) return []

    // 使用最近7天的加权平均作为预测基础
    const recentDays = days.slice(-7)
    const weightedCounts: Record<string, number> = {}
    let totalWeight = 0

    for (let i = 0; i < recentDays.length; i++) {
      const weight = (i + 1) / recentDays.length // 越近权重越大
      const dayCounts = dailyDistribution[recentDays[i]]
      for (const [type, count] of Object.entries(dayCounts)) {
        weightedCounts[type] = (weightedCounts[type] ?? 0) + count * weight
        totalWeight += weight
      }
    }

    // 计算概率
    const probabilities: Record<string, number> = {}
    for (const [type, weightedCount] of Object.entries(weightedCounts)) {
      probabilities[type] = totalWeight > 0
        ? Math.round(weightedCount / totalWeight * 100) / 100
        : 0
    }

    // 计算近期趋势修正
    const trendCorrection = computeTrendCorrection(recentDays, dailyDistribution)

    // 生成预测
    const today = new Date()
    for (let i = 0; i < predictionDays; i++) {
      const predDate = new Date(today)
      predDate.setDate(predDate.getDate() + i + 1)
      const dateStr = getLocalDateKey(predDate)

      // 应用趋势修正和随机扰动
      const dayProbabilities: Record<string, number> = {}
      let maxProb = 0
      let predictedDominant = 'neutral'

      for (const [type, prob] of Object.entries(probabilities)) {
        const correction = trendCorrection[type] ?? 0
        const jitter = (Math.random() - 0.5) * 0.1
        const adjusted = Math.max(0, Math.min(1, prob + correction * (i + 1) * 0.05 + jitter))
        dayProbabilities[type] = Math.round(adjusted * 100) / 100

        if (adjusted > maxProb) {
          maxProb = adjusted
          predictedDominant = type
        }
      }

      // 置信度随预测天数递减
      const confidence = Math.max(0.3, 0.85 - i * 0.07)

      results.push({
        date: dateStr,
        predictedDominant,
        probabilities: dayProbabilities,
        confidence: Math.round(confidence * 100) / 100,
        basedOnDays: Math.min(records.length, 30),
      })
    }

    predictions.value = results
    return results
  }

  /** 计算趋势修正因子 */
  function computeTrendCorrection(
    recentDays: string[],
    dailyDistribution: Record<string, Record<string, number>>,
  ): Record<string, number> {
    if (recentDays.length < 4) return {}

    const half = Math.floor(recentDays.length / 2)
    const firstHalf = recentDays.slice(0, half)
    const secondHalf = recentDays.slice(half)

    const firstCounts: Record<string, number> = {}
    const secondCounts: Record<string, number> = {}

    for (const day of firstHalf) {
      for (const [type, count] of Object.entries(dailyDistribution[day] ?? {})) {
        firstCounts[type] = (firstCounts[type] ?? 0) + count
      }
    }
    for (const day of secondHalf) {
      for (const [type, count] of Object.entries(dailyDistribution[day] ?? {})) {
        secondCounts[type] = (secondCounts[type] ?? 0) + count
      }
    }

    const firstTotal = Object.values(firstCounts).reduce((a, b) => a + b, 0)
    const secondTotal = Object.values(secondCounts).reduce((a, b) => a + b, 0)

    const correction: Record<string, number> = {}
    const allTypes = new Set([...Object.keys(firstCounts), ...Object.keys(secondCounts)])

    for (const type of allTypes) {
      const firstRatio = firstTotal > 0 ? (firstCounts[type] ?? 0) / firstTotal : 0
      const secondRatio = secondTotal > 0 ? (secondCounts[type] ?? 0) / secondTotal : 0
      correction[type] = secondRatio - firstRatio
    }

    return correction
  }

  // ============================================================
  // 仪表盘数据生成
  // ============================================================

  /** 生成仪表盘面板数据 */
  function generateDashboardPanels(records: EmotionRecord[]): DashboardPanel[] {
    const panels: DashboardPanel[] = []

    // 面板1：趋势折线图
    const trendPoints = buildTrends(records, 'daily', 30)
    panels.push({
      id: 'panel-trend-line',
      title: '情绪趋势',
      type: 'chart',
      chartType: 'line',
      data: trendPoints,
      labels: trendPoints.map(p => p.label),
      description: '过去30天情绪变化趋势',
      colorScheme: Object.values(EMOTION_COLORS),
    })

    // 面板2：情绪分布饼图
    const allCounts: Record<string, number> = {}
    for (const r of records) {
      allCounts[r.type] = (allCounts[r.type] ?? 0) + 1
    }
    panels.push({
      id: 'panel-distribution-pie',
      title: '情绪分布',
      type: 'chart',
      chartType: 'pie',
      data: allCounts,
      labels: Object.keys(allCounts),
      description: '各情绪类型占比',
      colorScheme: Object.keys(allCounts).map(t => EMOTION_COLORS[t] ?? '#6b7280'),
    })

    // 面板3：关键指标
    const s = computeSummary(records)
    panels.push({
      id: 'panel-key-metrics',
      title: '关键指标',
      type: 'metric',
      data: {
        totalRecords: s.totalRecords,
        dominantEmotion: s.dominantEmotion,
        stabilityScore: s.stabilityScore,
        positiveRatio: s.positiveRatio,
        diversityIndex: s.diversityIndex,
      },
      description: '情绪核心指标概览',
    })

    // 面板4：情绪热力图
    const heatmapData = buildWeeklyHeatmap(records)
    panels.push({
      id: 'panel-heatmap',
      title: '周情绪热力图',
      type: 'heatmap',
      data: heatmapData,
      description: '按星期几和时段展示情绪分布',
    })

    // 面板5：检测到的模式
    if (patterns.value.length > 0) {
      panels.push({
        id: 'panel-patterns',
        title: '情绪模式',
        type: 'list',
        data: patterns.value,
        description: '检测到的情绪模式',
      })
    }

    // 面板6：预测
    if (predictions.value.length > 0) {
      panels.push({
        id: 'panel-predictions',
        title: '情绪预测',
        type: 'chart',
        chartType: 'bar',
        data: predictions.value,
        labels: predictions.value.map(p => p.date),
        description: `未来 ${predictions.value.length} 天情绪预测`,
        colorScheme: Object.values(EMOTION_COLORS),
      })
    }

    // 面板7：情绪雷达图
    panels.push({
      id: 'panel-radar',
      title: '情绪雷达',
      type: 'radar',
      data: allCounts,
      labels: Object.keys(allCounts),
      description: '多维度情绪画像',
      colorScheme: Object.keys(allCounts).map(t => EMOTION_COLORS[t] ?? '#6b7280'),
    })

    return panels
  }

  /** 构建周热力图数据 */
  function buildWeeklyHeatmap(records: EmotionRecord[]): Array<{
    day: string
    hour: number
    value: number
    dominant: string
  }> {
    const heatmap: Array<{ day: string; hour: number; value: number; dominant: string }> = []
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

    // 初始化7x24网格
    const grid: Record<string, Record<string, number>> = {}
    for (let d = 0; d < 7; d++) {
      grid[dayNames[d]] = {}
      for (let h = 0; h < 24; h++) {
        grid[dayNames[d]][`${h}`] = 0
      }
    }

    // 填充数据
    const emotionByCell: Record<string, Record<string, Record<string, number>>> = {}
    for (const r of records) {
      const date = new Date(r.createdAt)
      const day = dayNames[date.getDay()]
      const hour = date.getHours()
      const hourKey = `${hour}`

      grid[day][hourKey] = (grid[day][hourKey] ?? 0) + 1

      if (!emotionByCell[day]) emotionByCell[day] = {}
      if (!emotionByCell[day][hourKey]) emotionByCell[day][hourKey] = {}
      emotionByCell[day][hourKey][r.type] = (emotionByCell[day][hourKey][r.type] ?? 0) + 1
    }

    // 转换为输出格式
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const hourKey = `${h}`
        const value = grid[dayNames[d]][hourKey]

        // 确定主导情绪
        let dominant = 'neutral'
        let maxCount = 0
        const cellEmotions = emotionByCell[dayNames[d]]?.[hourKey] ?? {}
        for (const [type, count] of Object.entries(cellEmotions)) {
          if (count > maxCount) { maxCount = count; dominant = type }
        }

        heatmap.push({ day: dayNames[d], hour: h, value, dominant })
      }
    }

    return heatmap
  }

  // ============================================================
  // 高级分析
  // ============================================================

  /** 情绪相关性分析 */
  function analyzeCorrelations(records: EmotionRecord[]): Array<{
    emotionA: string
    emotionB: string
    correlation: number
    direction: 'positive' | 'negative' | 'none'
  }> {
    if (records.length < 10) return []

    // 按天分组
    const dailyCounts: Record<string, Record<string, number>> = {}
    for (const r of records) {
      const day = getLocalDateKey(new Date(r.createdAt))
      if (!dailyCounts[day]) dailyCounts[day] = {}
      dailyCounts[day][r.type] = (dailyCounts[day][r.type] ?? 0) + 1
    }

    const days = Object.keys(dailyCounts).sort()
    const emotionTypes = [...new Set(records.map(r => r.type))]

    const results: Array<{
      emotionA: string
      emotionB: string
      correlation: number
      direction: 'positive' | 'negative' | 'none'
    }> = []

    for (let i = 0; i < emotionTypes.length; i++) {
      for (let j = i + 1; j < emotionTypes.length; j++) {
        const a = emotionTypes[i]
        const b = emotionTypes[j]

        const seriesA: number[] = days.map(d => dailyCounts[d][a] ?? 0)
        const seriesB: number[] = days.map(d => dailyCounts[d][b] ?? 0)

        const correlation = pearsonCorrelation(seriesA, seriesB)

        if (Math.abs(correlation) > 0.3) {
          results.push({
            emotionA: a,
            emotionB: b,
            correlation: Math.round(correlation * 100) / 100,
            direction: correlation > 0 ? 'positive' : 'negative',
          })
        }
      }
    }

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
  }

  /** 异常检测 */
  function detectAnomalies(records: EmotionRecord[]): Array<{
    date: string
    type: string
    count: number
    expectedCount: number
    deviation: number
  }> {
    if (!trendsConfig.value.enableAnomalyDetection || records.length < 14) return []

    // 按天统计
    const dailyCounts: Record<string, Record<string, number>> = {}
    const dailyTotals: Record<string, number> = {}
    for (const r of records) {
      const day = getLocalDateKey(new Date(r.createdAt))
      if (!dailyCounts[day]) dailyCounts[day] = {}
      dailyCounts[day][r.type] = (dailyCounts[day][r.type] ?? 0) + 1
      dailyTotals[day] = (dailyTotals[day] ?? 0) + 1
    }

    const days = Object.keys(dailyCounts).sort()
    if (days.length < 7) return []

    // 计算每种情绪的日均值和标准差
    const emotionStats: Record<string, { mean: number; std: number }> = {}
    for (const r of records) {
      if (!emotionStats[r.type]) {
        emotionStats[r.type] = { mean: 0, std: 0 }
      }
    }

    for (const type of Object.keys(emotionStats)) {
      const values = days.map(d => dailyCounts[d][type] ?? 0)
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
      emotionStats[type] = { mean, std: Math.sqrt(variance) }
    }

    // 检测异常（超过2个标准差）
    const anomalies: Array<{
      date: string
      type: string
      count: number
      expectedCount: number
      deviation: number
    }> = []

    for (const day of days.slice(-14)) {
      for (const type of Object.keys(emotionStats)) {
        const count = dailyCounts[day][type] ?? 0
        const { mean, std } = emotionStats[type]
        if (std > 0 && count > mean + 2 * std) {
          anomalies.push({
            date: day,
            type,
            count,
            expectedCount: Math.round(mean),
            deviation: Math.round((count - mean) / Math.max(1, std) * 100) / 100,
          })
        }
      }
    }

    return anomalies
  }

  // ============================================================
  // 数据导出
  // ============================================================

  /** 导出趋势数据为CSV */
  function exportTrendsCSV(records: EmotionRecord[]): string {
    const points = buildTrends(records, 'daily', 90)
    const emotionTypes = [...new Set(records.map(r => r.type))]

    const header = ['日期', '总计', '主导情绪', '多样性', ...emotionTypes]
    const rows = points.map(p => [
      p.label,
      p.total.toString(),
      getEmotionLabel(p.dominant),
      p.diversity.toString(),
      ...emotionTypes.map(t => (p.counts[t] ?? 0).toString()),
    ])

    return [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  /** 导出模式报告 */
  function exportPatternsReport(): string {
    if (patterns.value.length === 0) return '未检测到情绪模式'

    const lines = ['# 情绪模式检测报告', '', `检测时间：${new Date().toISOString()}`, `检测到 ${patterns.value.length} 个模式`, '']

    for (const p of patterns.value) {
      lines.push(`## ${p.name}`)
      lines.push(`- 类型：${p.type}`)
      lines.push(`- 描述：${p.description}`)
      lines.push(`- 置信度：${Math.round(p.confidence * 100)}%`)
      lines.push(`- 涉及情绪：${p.emotions.map(getEmotionLabel).join(', ')}`)
      if (p.cycleDays) lines.push(`- 周期：${p.cycleDays} 天`)
      lines.push(`- 时间范围：${getLocalDateKey(new Date(p.startTime))} ~ ${getLocalDateKey(new Date(p.endTime))}`)
      lines.push('')
    }

    return lines.join('\n')
  }

  // ============================================================
  // 生命周期
  // ============================================================

  /** 执行完整分析 */
  function analyzeAll(records: EmotionRecord[], days: number = 30): {
    trends: TrendDataPoint[]
    summary: TrendSummary
    patterns: EmotionPattern[]
    predictions: EmotionPrediction[]
    dashboardPanels: DashboardPanel[]
  } {
    isAnalyzing.value = true

    const trends = buildTrends(records, trendsConfig.value.defaultPeriod, days)
    const s = computeSummary(records, days)
    const p = detectPatterns(records)
    const pred = predictEmotions(records)
    const panels = generateDashboardPanels(records)

    isAnalyzing.value = false
    lastAnalyzedAt.value = Date.now()

    return {
      trends,
      summary: s,
      patterns: p,
      predictions: pred,
      dashboardPanels: panels,
    }
  }

  /** 重置 */
  function reset(): void {
    trendData.value = []
    patterns.value = []
    predictions.value = []
    summary.value = null
    isAnalyzing.value = false
    lastAnalyzedAt.value = null
  }

  return {
    // 配置
    trendsConfig,

    // 状态
    trendData,
    patterns,
    predictions,
    summary,
    isAnalyzing,
    lastAnalyzedAt,
    hasData,
    latestTrend,
    activePatterns,
    activePatternCount,

    // 时间序列分析
    buildTrends,
    computeSummary,

    // 模式检测
    detectPatterns,
    detectCyclePattern,
    detectShiftPatterns,
    detectSpikePatterns,
    detectStablePattern,
    detectDeclinePattern,

    // 预测
    predictEmotions,

    // 仪表盘
    generateDashboardPanels,

    // 高级分析
    analyzeCorrelations,
    detectAnomalies,

    // 导出
    exportTrendsCSV,
    exportPatternsReport,

    // 综合
    analyzeAll,

    // 生命周期
    reset,

    // 常量
    DEFAULT_TRENDS_CONFIG,
    DEFAULT_DASHBOARD_CONFIG,
    EMOTION_COLORS,
    POSITIVE_EMOTIONS,
    NEGATIVE_EMOTIONS,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 获取情绪中文标签 */
function getEmotionLabel(type: string): string {
  const labels: Record<string, string> = {
    happy: '开心', sad: '难过', anxious: '焦虑', angry: '愤怒',
    calm: '平静', excited: '兴奋', grateful: '感恩', tired: '疲惫',
    inspired: '灵感', neutral: '中性',
  }
  return labels[type] ?? type
}

/** 获取下一个时间槽 */
function getNextSlot(current: number, period: TrendPeriod): number {
  const d = new Date(current)
  switch (period) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    case 'quarterly': d.setMonth(d.getMonth() + 3); break
    case 'yearly': d.setFullYear(d.getFullYear() + 1); break
  }
  return d.getTime()
}

/** 皮尔逊相关系数 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length)
  if (n === 0) return 0

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
  for (let i = 0; i < n; i++) {
    sumX += x[i]
    sumY += y[i]
    sumXY += x[i] * y[i]
    sumX2 += x[i] * x[i]
    sumY2 += y[i] * y[i]
  }

  const numerator = n * sumXY - sumX * sumY
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))

  if (denominator === 0) return 0
  return numerator / denominator
}