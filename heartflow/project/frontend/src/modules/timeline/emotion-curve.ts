// ============================================================
// 时间长廊 · 情感曲线可视化（P18-1）
// 情感时序数据、曲线平滑、波动分析、转折点检测
// ============================================================

import { getLocalDateKey, getLocalMonthKey } from '../../utils/time'
null
import type { RiverItem } from './river'

// ============================================================
// 类型定义
// ============================================================

/** 情感数据点 */
export interface EmotionDataPoint {
  date: string
  label: string
  /** 情感值映射 */
  values: Record<string, number>
  /** 主导情感 */
  dominant: string
  /** 情感强度 0-1 */
  intensity: number
  /** 是否有记录 */
  hasData: boolean
}

/** 情感曲线 */
export interface EmotionCurve {
  /** 曲线 ID */
  id: string
  /** 曲线名称 */
  name: string
  /** 时间粒度 */
  granularity: 'daily' | 'weekly' | 'monthly'
  /** 数据点 */
  dataPoints: EmotionDataPoint[]
  /** 平滑后的数据点 */
  smoothed: EmotionDataPoint[]
  /** 曲线统计 */
  stats: EmotionCurveStats
  /** 趋势 */
  trend: EmotionTrend
  /** 转折点 */
  turningPoints: TurningPoint[]
}

/** 情感曲线统计 */
export interface EmotionCurveStats {
  /** 平均情感强度 */
  avgIntensity: number
  /** 情感波动幅度 */
  volatility: number
  /** 正向情感占比 */
  positiveRatio: number
  /** 负向情感占比 */
  negativeRatio: number
  /** 主导情感 */
  dominantEmotion: string
  /** 情感多样性 */
  emotionDiversity: number
  /** 最积极的一天 */
  bestDay: { date: string; label: string; dominant: string }
  /** 最消极的一天 */
  worstDay: { date: string; label: string; dominant: string }
}

/** 情感趋势 */
export interface EmotionTrend {
  /** 趋势方向 */
  direction: 'improving' | 'declining' | 'stable' | 'volatile'
  /** 趋势强度 0-1 */
  strength: number
  /** 趋势描述 */
  description: string
  /** 线性回归斜率 */
  slope: number
}

/** 转折点 */
export interface TurningPoint {
  date: string
  label: string
  /** 转折类型 */
  type: 'peak' | 'valley' | 'inflection'
  /** 转折前情感 */
  before: string
  /** 转折后情感 */
  after: string
  /** 变化幅度 */
  magnitude: number
  /** 可能原因（基于当天事件） */
  possibleCauses: string[]
}

/** 情感曲线配置 */
export interface EmotionCurveConfig {
  /** 平滑窗口大小 */
  smoothWindow: number
  /** 转折点检测阈值 */
  turningPointThreshold: number
  /** 正向情感标签 */
  positiveEmotions: string[]
  /** 负向情感标签 */
  negativeEmotions: string[]
}

/** 情感对比 */
export interface EmotionComparison {
  /** 时间段 A */
  periodA: { start: string; end: string; label: string }
  /** 时间段 B */
  periodB: { start: string; end: string; label: string }
  /** 各情感变化 */
  changes: { emotion: string; before: number; after: number; diff: number; trend: 'up' | 'down' | 'same' }[]
  /** 相似度 */
  similarity: number
  /** 总结 */
  summary: string
}

/** 情感洞察 */
export interface EmotionInsight {
  /** 洞察类型 */
  type: 'pattern' | 'anomaly' | 'correlation' | 'trend'
  /** 描述 */
  description: string
  /** 置信度 0-1 */
  confidence: number
  /** 相关日期 */
  relatedDates: string[]
  /** 建议 */
  suggestion?: string
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: EmotionCurveConfig = {
  smoothWindow: 3,
  turningPointThreshold: 0.3,
  positiveEmotions: ['happy', 'joy', 'excited', 'grateful', 'calm', 'hopeful', 'proud', 'loved'],
  negativeEmotions: ['sad', 'angry', 'anxious', 'frustrated', 'tired', 'stressed', 'disappointed', 'lonely'],
}

// ============================================================
// 情感映射
// ============================================================

const EMOTION_VALUE_MAP: Record<string, number> = {
  happy: 1.0, joy: 1.0, excited: 0.9, grateful: 0.8, proud: 0.8, loved: 0.9, hopeful: 0.7, calm: 0.5,
  peaceful: 0.5, content: 0.5, motivated: 0.7, inspired: 0.8, confident: 0.7, relieved: 0.6, curious: 0.5,
  neutral: 0.0, bored: -0.2, tired: -0.3, confused: -0.3, stressed: -0.5, anxious: -0.6,
  worried: -0.5, disappointed: -0.5, frustrated: -0.6, lonely: -0.5, sad: -0.7, angry: -0.8,
  overwhelmed: -0.7, guilty: -0.6, ashamed: -0.7, fearful: -0.8,
}

// ============================================================
// useEmotionCurve
// ============================================================

export function useEmotionCurve() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<EmotionCurveConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 数据提取 ----

  /**
   * 从 RiverItem 中提取情感数据点
   */
  function extractEmotionData(
    items: RiverItem[],
    granularity: EmotionCurve['granularity'] = 'daily',
  ): EmotionDataPoint[] {
    if (items.length === 0) return []

    // 按日期分组
    const dateGroups = new Map<string, RiverItem[]>()
    for (const item of items) {
      if (item.type !== 'emotion' || !item.emotion) continue
      const date = getLocalDateKey(new Date(item.ts))
      if (!dateGroups.has(date)) dateGroups.set(date, [])
      dateGroups.get(date)!.push(item)
    }

    const points: EmotionDataPoint[] = []

    for (const [date, dayItems] of dateGroups) {
      const values: Record<string, number> = {}
      let maxVal = 0
      let dominant = 'neutral'

      // 统计当天情感
      for (const item of dayItems) {
        const emotion = item.emotion?.type || 'neutral'
        const val = EMOTION_VALUE_MAP[emotion] ?? 0
        values[emotion] = (values[emotion] || 0) + 1

        if (values[emotion] > maxVal || (values[emotion] === maxVal && val > 0)) {
          maxVal = values[emotion]
          dominant = emotion
        }
      }

      const hasData = Object.keys(values).length > 0
      const totalEmotions = Object.values(values).reduce((s, v) => s + v, 0)
      const intensity = totalEmotions > 0
        ? Math.min(1, totalEmotions / 5)
        : 0

      points.push({
        date,
        label: date,
        values,
        dominant,
        intensity,
        hasData,
      })
    }

    // 按粒度聚合
    if (granularity === 'weekly') {
      return aggregateByWeek(points)
    }
    if (granularity === 'monthly') {
      return aggregateByMonth(points)
    }

    return points
  }

  // ---- 平滑处理 ----

  /**
   * 移动平均平滑
   */
  function smoothPoints(points: EmotionDataPoint[], windowSize: number = config.smoothWindow): EmotionDataPoint[] {
    if (points.length <= windowSize) return points

    const half = Math.floor(windowSize / 2)
    const smoothed: EmotionDataPoint[] = []

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - half)
      const end = Math.min(points.length, i + half + 1)
      const window = points.slice(start, end)

      const smoothedValues: Record<string, number> = {}
      const allEmotions = new Set(window.flatMap(p => Object.keys(p.values)))

      for (const emotion of allEmotions) {
        const sum = window.reduce((s, p) => s + (p.values[emotion] || 0), 0)
        smoothedValues[emotion] = Math.round(sum / window.length * 100) / 100
      }

      // 找主导情感
      let maxVal = 0
      let dominant = 'neutral'
      for (const [e, v] of Object.entries(smoothedValues)) {
        if (v > maxVal) { maxVal = v; dominant = e }
      }

      smoothed.push({
        date: points[i].date,
        label: points[i].label,
        values: smoothedValues,
        dominant,
        intensity: points[i].intensity, // 保持原始强度
        hasData: points[i].hasData,
      })
    }

    return smoothed
  }

  // ---- 趋势分析 ----

  /**
   * 计算情感趋势
   */
  function calculateTrend(points: EmotionDataPoint[]): EmotionTrend {
    const validPoints = points.filter(p => p.hasData)
    if (validPoints.length < 3) {
      return { direction: 'stable', strength: 0, description: '数据不足，无法判断趋势', slope: 0 }
    }

    // 计算情感值（正向为正，负向为负）
    const scores = validPoints.map(p => {
      let score = 0
      for (const [emotion, count] of Object.entries(p.values)) {
        const val = EMOTION_VALUE_MAP[emotion] ?? 0
        score += val * count
      }
      return score
    })

    // 线性回归
    const n = scores.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    for (let i = 0; i < n; i++) {
      sumX += i
      sumY += scores[i]
      sumXY += i * scores[i]
      sumX2 += i * i
    }

    const slope = n * sumX2 - sumX * sumX
    const trendSlope = slope !== 0 ? (n * sumXY - sumX * sumY) / slope : 0
    const avgAbs = scores.reduce((s, v) => s + Math.abs(v), 0) / n
    const strength = avgAbs > 0 ? Math.min(1, Math.abs(trendSlope * n) / avgAbs) : 0

    let direction: EmotionTrend['direction'] = 'stable'
    let description = ''

    if (trendSlope > 0.05) {
      direction = 'improving'
      description = strength > 0.5 ? '情感状态明显改善，呈上升趋势' : '情感状态略有改善'
    } else if (trendSlope < -0.05) {
      direction = 'declining'
      description = strength > 0.5 ? '情感状态持续下降，需要关注' : '情感状态略有下降'
    } else {
      const variance = scores.reduce((s, v) => s + Math.pow(v - scores.reduce((ss, vv) => ss + vv, 0) / n, 2), 0) / n
      if (variance > 2) {
        direction = 'volatile'
        description = '情感波动较大，不够稳定'
      } else {
        direction = 'stable'
        description = '情感状态保持稳定'
      }
    }

    return {
      direction,
      strength: Math.round(strength * 100) / 100,
      description,
      slope: Math.round(trendSlope * 1000) / 1000,
    }
  }

  // ---- 转折点检测 ----

  /**
   * 检测情感转折点
   */
  function detectTurningPoints(
    points: EmotionDataPoint[],
    threshold: number = config.turningPointThreshold,
  ): TurningPoint[] {
    const validPoints = points.filter(p => p.hasData)
    if (validPoints.length < 3) return []

    const turningPoints: TurningPoint[] = []

    for (let i = 1; i < validPoints.length - 1; i++) {
      const prev = validPoints[i - 1]
      const curr = validPoints[i]
      const next = validPoints[i + 1]

      // 计算情感得分
      const prevScore = calculateEmotionScore(prev)
      const currScore = calculateEmotionScore(curr)
      const nextScore = calculateEmotionScore(next)

      const change = (currScore - prevScore) + (nextScore - currScore)
      const magnitude = Math.abs(change)

      if (magnitude < threshold) continue

      let type: TurningPoint['type'] = 'inflection'
      if (currScore > prevScore && currScore > nextScore) type = 'peak'
      else if (currScore < prevScore && currScore < nextScore) type = 'valley'

      turningPoints.push({
        date: curr.date,
        label: curr.label,
        type,
        before: prev.dominant,
        after: next.dominant,
        magnitude: Math.round(magnitude * 100) / 100,
        possibleCauses: inferCauses(validPoints, i),
      })
    }

    return turningPoints.sort((a, b) => b.magnitude - a.magnitude).slice(0, 10)
  }

  // ---- 统计 ----

  /**
   * 计算情感曲线统计
   */
  function calculateStats(points: EmotionDataPoint[]): EmotionCurveStats {
    const validPoints = points.filter(p => p.hasData)
    if (validPoints.length === 0) {
      return {
        avgIntensity: 0,
        volatility: 0,
        positiveRatio: 0,
        negativeRatio: 0,
        dominantEmotion: 'neutral',
        emotionDiversity: 0,
        bestDay: { date: '', label: '', dominant: '' },
        worstDay: { date: '', label: '', dominant: '' },
      }
    }

    // 平均强度
    const avgIntensity = validPoints.reduce((s, p) => s + p.intensity, 0) / validPoints.length

    // 波动率
    const intensities = validPoints.map(p => p.intensity)
    const mean = intensities.reduce((s, v) => s + v, 0) / intensities.length
    const variance = intensities.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / intensities.length
    const volatility = Math.sqrt(variance)

    // 正负向比例
    let positiveCount = 0, negativeCount = 0
    for (const p of validPoints) {
      const score = calculateEmotionScore(p)
      if (score > 0) positiveCount++
      else if (score < 0) negativeCount++
    }
    const total = positiveCount + negativeCount || 1
    const positiveRatio = positiveCount / total
    const negativeRatio = negativeCount / total

    // 主导情感
    const emotionCounts: Record<string, number> = {}
    for (const p of validPoints) {
      emotionCounts[p.dominant] = (emotionCounts[p.dominant] || 0) + 1
    }
    const dominantEmotion = Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral'

    // 情感多样性
    const allEmotions = new Set(validPoints.flatMap(p => Object.keys(p.values)))
    const emotionDiversity = allEmotions.size / Object.keys(EMOTION_VALUE_MAP).length

    // 最好/最差的一天
    let bestScore = -Infinity, worstScore = Infinity
    let bestDay = { date: '', label: '', dominant: '' }
    let worstDay = { date: '', label: '', dominant: '' }

    for (const p of validPoints) {
      const score = calculateEmotionScore(p)
      if (score > bestScore) {
        bestScore = score
        bestDay = { date: p.date, label: p.label, dominant: p.dominant }
      }
      if (score < worstScore) {
        worstScore = score
        worstDay = { date: p.date, label: p.label, dominant: p.dominant }
      }
    }

    return {
      avgIntensity: Math.round(avgIntensity * 100) / 100,
      volatility: Math.round(volatility * 100) / 100,
      positiveRatio: Math.round(positiveRatio * 100) / 100,
      negativeRatio: Math.round(negativeRatio * 100) / 100,
      dominantEmotion,
      emotionDiversity: Math.round(emotionDiversity * 100) / 100,
      bestDay,
      worstDay,
    }
  }

  // ---- 构建完整曲线 ----

  /**
   * 构建完整的情感曲线
   */
  function buildCurve(
    name: string,
    items: RiverItem[],
    granularity: EmotionCurve['granularity'] = 'daily',
  ): EmotionCurve {
    const raw = extractEmotionData(items, granularity)
    const smoothed = smoothPoints(raw)
    const stats = calculateStats(raw)
    const trend = calculateTrend(raw)
    const turningPoints = detectTurningPoints(raw)

    return {
      id: `curve_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      granularity,
      dataPoints: raw,
      smoothed,
      stats,
      trend,
      turningPoints,
    }
  }

  // ---- 情感对比 ----

  /**
   * 对比两个时间段的情感
   */
  function comparePeriods(
    allItems: RiverItem[],
    periodA: { start: string; end: string; label: string },
    periodB: { start: string; end: string; label: string },
  ): EmotionComparison {
    const filterByPeriod = (items: RiverItem[], start: string, end: string) =>
      items.filter(s => {
        const date = getLocalDateKey(new Date(s.ts))
        return date >= start && date <= end
      })
    const pointsA = extractEmotionData(
      filterByPeriod(allItems, periodA.start, periodA.end),
    )
    const pointsB = extractEmotionData(
      filterByPeriod(allItems, periodB.start, periodB.end),
    )

    const allEmotions = new Set<string>()
    const countsA: Record<string, number> = {}
    const countsB: Record<string, number> = {}

    for (const p of pointsA) {
      for (const [e, c] of Object.entries(p.values)) {
        allEmotions.add(e)
        countsA[e] = (countsA[e] || 0) + c
      }
    }
    for (const p of pointsB) {
      for (const [e, c] of Object.entries(p.values)) {
        allEmotions.add(e)
        countsB[e] = (countsB[e] || 0) + c
      }
    }

    const changes = [...allEmotions].map(emotion => {
      const before = countsA[emotion] || 0
      const after = countsB[emotion] || 0
      const diff = after - before
      let trend: 'up' | 'down' | 'same' = 'same'
      if (diff > 0.5) trend = 'up'
      else if (diff < -0.5) trend = 'down'

      return { emotion, before, after, diff: Math.round(diff * 100) / 100, trend }
    }).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))

    // 相似度
    const vecA = changes.map(c => c.before)
    const vecB = changes.map(c => c.after)
    const similarity = cosineSimilarity(vecA, vecB)

    const improved = changes.filter(c => c.trend === 'up').length
    const declined = changes.filter(c => c.trend === 'down').length

    return {
      periodA,
      periodB,
      changes,
      similarity: Math.round(similarity * 100) / 100,
      summary: `与「${periodA.label}」相比，「${periodB.label}」有 ${improved} 类情感上升、${declined} 类情感下降，整体相似度 ${Math.round(similarity * 100)}%`,
    }
  }

  // ---- 情感洞察 ----

  /**
   * 生成情感洞察
   */
  function generateInsights(curve: EmotionCurve): EmotionInsight[] {
    const insights: EmotionInsight[] = []

    // 趋势洞察
    if (curve.trend.direction !== 'stable') {
      insights.push({
        type: 'trend',
        description: curve.trend.description,
        confidence: curve.trend.strength,
        relatedDates: curve.dataPoints.slice(-7).map(p => p.date),
        suggestion: curve.trend.direction === 'declining'
          ? '建议增加休息和放松活动，尝试正念冥想或户外运动'
          : curve.trend.direction === 'improving'
            ? '保持当前的积极状态，可以尝试记录成功经验'
            : '建议建立规律的情感记录习惯，帮助稳定情绪',
      })
    }

    // 转折点洞察
    if (curve.turningPoints.length > 0) {
      const top = curve.turningPoints[0]
      insights.push({
        type: 'anomaly',
        description: `在 ${top.label} 检测到${top.type === 'peak' ? '情感高峰' : top.type === 'valley' ? '情感低谷' : '情感转折'}，情感从「${top.before}」变为「${top.after}」`,
        confidence: Math.min(1, top.magnitude / 2),
        relatedDates: [top.date],
        suggestion: top.type === 'valley'
          ? '回顾当天发生了什么，识别触发因素有助于未来预防'
          : '记住这个积极时刻，建立情感韧性储备',
      })
    }

    // 多样性洞察
    if (curve.stats.emotionDiversity < 0.3) {
      insights.push({
        type: 'pattern',
        description: '情感表达较为单一，可以尝试更多类型的情感体验',
        confidence: 0.7,
        relatedDates: [],
        suggestion: '尝试新活动、新环境，丰富情感体验的多样性',
      })
    }

    // 波动性洞察
    if (curve.stats.volatility > 0.5) {
      insights.push({
        type: 'pattern',
        description: '情感波动较大，可能存在不稳定的影响因素',
        confidence: 0.6,
        relatedDates: [],
        suggestion: '尝试建立规律的生活节奏，减少情绪波动',
      })
    }

    return insights
  }

  // ---- 辅助函数 ----

  function calculateEmotionScore(point: EmotionDataPoint): number {
    let score = 0
    for (const [emotion, count] of Object.entries(point.values)) {
      const val = EMOTION_VALUE_MAP[emotion] ?? 0
      score += val * count
    }
    return score
  }

  function aggregateByWeek(points: EmotionDataPoint[]): EmotionDataPoint[] {
    const weeks = new Map<string, EmotionDataPoint[]>()
    for (const p of points) {
      const d = new Date(p.date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      // ⚠️ weekStart 由 setDate 逐日回退构造（本地分量），取本地日历日
      const key = getLocalDateKey(weekStart)
      if (!weeks.has(key)) weeks.set(key, [])
      weeks.get(key)!.push(p)
    }

    const result: EmotionDataPoint[] = []
    for (const [key, weekPoints] of weeks) {
      const merged: Record<string, number> = {}
      for (const p of weekPoints) {
        for (const [e, v] of Object.entries(p.values)) {
          merged[e] = (merged[e] || 0) + v
        }
      }
      let maxVal = 0, dominant = 'neutral'
      for (const [e, v] of Object.entries(merged)) {
        if (v > maxVal) { maxVal = v; dominant = e }
      }
      const avgIntensity = weekPoints.reduce((s, p) => s + p.intensity, 0) / weekPoints.length
      result.push({
        date: key,
        label: `第${Math.ceil(new Date(key).getDate() / 7)}周`,
        values: merged,
        dominant,
        intensity: avgIntensity,
        hasData: true,
      })
    }
    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  function aggregateByMonth(points: EmotionDataPoint[]): EmotionDataPoint[] {
    const months = new Map<string, EmotionDataPoint[]>()
    for (const p of points) {
      const key = getLocalMonthKey(p.date)
      if (!months.has(key)) months.set(key, [])
      months.get(key)!.push(p)
    }

    const result: EmotionDataPoint[] = []
    for (const [key, monthPoints] of months) {
      const merged: Record<string, number> = {}
      for (const p of monthPoints) {
        for (const [e, v] of Object.entries(p.values)) {
          merged[e] = (merged[e] || 0) + v
        }
      }
      let maxVal = 0, dominant = 'neutral'
      for (const [e, v] of Object.entries(merged)) {
        if (v > maxVal) { maxVal = v; dominant = e }
      }
      const avgIntensity = monthPoints.reduce((s, p) => s + p.intensity, 0) / monthPoints.length
      result.push({
        date: key,
        label: `${key.split('-')[1]}月`,
        values: merged,
        dominant,
        intensity: avgIntensity,
        hasData: true,
      })
    }
    return result.sort((a, b) => a.date.localeCompare(b.date))
  }

  function inferCauses(points: EmotionDataPoint[], index: number): string[] {
    const causes: string[] = []
    const p = points[index]
    const prev = points[Math.max(0, index - 1)]

    if (p.intensity > prev.intensity + 0.3) {
      causes.push('情感强度显著变化')
    }
    if (p.dominant !== prev.dominant) {
      causes.push(`主导情感从「${prev.dominant}」切换为「${p.dominant}」`)
    }

    return causes
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) return 0
    let dot = 0, normA = 0, normB = 0
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1)
  }

  return {
    config,
    setConfig,
    extractEmotionData,
    smoothPoints,
    buildCurve,
    calculateTrend,
    calculateStats,
    detectTurningPoints,
    comparePeriods,
    generateInsights,
    EMOTION_VALUE_MAP,
  }
}