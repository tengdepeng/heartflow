// ============================================================
// 藏象阁 · 经络可视化引擎（P21-1）
// 蓝图定义：
//   子午流注时钟图（12时辰环形布局）
//   经络健康热力图（12经络 × 7天）
//   五脏五行关系图（生克乘侮网络）
//   经络趋势图（健康率时间序列）
//   时辰养生提醒
// ============================================================

import { ref, computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import type { MeridianType, MeridianRecord, MeridianFeeling } from './types'
import { MERIDIAN_HOURS, ORGAN_ELEMENT_MAP } from './types'

// ---- 类型定义 ----

/** 经络时钟节点 */
export interface MeridianClockNode {
  hour: number
  startTime: string
  endTime: string
  meridian: MeridianType
  organ: string
  element: string
  /** 角度（0-360） */
  angle: number
  /** 内圈半径偏移 */
  innerRadius: number
  /** 健康率 0-100 */
  healthRate: number
  /** 记录数 */
  recordCount: number
  /** 颜色 */
  color: string
  /** 是否为当前时辰 */
  isCurrent: boolean
  /** 养生建议 */
  advice: string
}

/** 经络热力图数据 */
export interface MeridianHeatmapData {
  meridian: MeridianType
  organ: string
  element: string
  /** 7天感受数据 */
  dailyFeelings: { date: string; feeling: MeridianFeeling | null; score: number }[]
  /** 7天评分均值 */
  averageScore: number
  /** 趋势 */
  trend: 'improving' | 'stable' | 'declining'
  color: string
}

/** 五行关系数据 */
export interface FiveElementRelation {
  source: string
  target: string
  type: 'generating' | 'controlling' | 'insulting' | 'overacting'
  label: string
  strength: number
}

/** 经络趋势点 */
export interface MeridianTrendPoint {
  date: string
  goodRate: number
  recordCount: number
}

/** 时辰养生提醒 */
export interface MeridianHourReminder {
  hour: number
  timeRange: string
  meridian: MeridianType
  organ: string
  advice: string
  isActive: boolean
  color: string
}

/** 可视化配置 */
export interface MeridianVisualizationConfig {
  /** 时钟半径 */
  clockRadius: number
  /** 节点半径 */
  nodeRadius: number
  /** 是否显示标签 */
  showLabels: boolean
  /** 是否显示动画 */
  animate: boolean
  /** 选中经络 */
  selectedMeridian: MeridianType | null
}

// ---- 常量 ----

/** 五行生克关系 */
const FIVE_ELEMENT_RELATIONS: FiveElementRelation[] = [
  { source: '木', target: '火', type: 'generating', label: '木生火', strength: 0.8 },
  { source: '火', target: '土', type: 'generating', label: '火生土', strength: 0.8 },
  { source: '土', target: '金', type: 'generating', label: '土生金', strength: 0.8 },
  { source: '金', target: '水', type: 'generating', label: '金生水', strength: 0.8 },
  { source: '水', target: '木', type: 'generating', label: '水生木', strength: 0.8 },
  { source: '木', target: '土', type: 'controlling', label: '木克土', strength: 0.6 },
  { source: '土', target: '水', type: 'controlling', label: '土克水', strength: 0.6 },
  { source: '水', target: '火', type: 'controlling', label: '水克火', strength: 0.6 },
  { source: '火', target: '金', type: 'controlling', label: '火克金', strength: 0.6 },
  { source: '金', target: '木', type: 'controlling', label: '金克木', strength: 0.6 },
]

/** 经络映射颜色 */
const MERIDIAN_COLORS: Record<MeridianType, string> = {
  lung: '#e4e6ed',
  'large-intestine': '#d4d6dd',
  stomach: '#f0c040',
  spleen: '#e8c030',
  heart: '#ef4444',
  'small-intestine': '#f06060',
  bladder: '#6b9fc4',
  kidney: '#1e3a5f',
  pericardium: '#d98c7a',
  'triple-burner': '#f0a0c0',
  gallbladder: '#5ab8a0',
  liver: '#22c55e',
}

/** 感受评分映射 */
const FEELING_SCORES: Record<MeridianFeeling, number> = {
  good: 100,
  ok: 60,
  bad: 20,
}

// ============================================================
// useMeridianVisualization — 经络可视化引擎
// ============================================================

export function useMeridianVisualization() {
  const config = ref<MeridianVisualizationConfig>({
    clockRadius: 200,
    nodeRadius: 24,
    showLabels: true,
    animate: true,
    selectedMeridian: null,
  })

  // ---- 子午流注时钟 ----

  /** 计算12时辰节点位置 */
  function computeClockNodes(records: MeridianRecord[]): MeridianClockNode[] {
    const now = new Date()
    const currentHour = now.getHours()
    const currentMeridianIndex = Math.floor(((currentHour + 23) % 24) / 2)

    // 统计各经络健康率
    const meridianHealth = new Map<MeridianType, { good: number; total: number }>()
    for (const r of records) {
      const mh = meridianHealth.get(r.meridian) || { good: 0, total: 0 }
      if (r.feeling === 'good') mh.good++
      mh.total++
      meridianHealth.set(r.meridian, mh)
    }

    return MERIDIAN_HOURS.map((mh, index) => {
      const angle = (index / 12) * 360 - 90 // 从12点方向开始
      const health = meridianHealth.get(mh.meridian)
      const healthRate = health && health.total > 0
        ? Math.round((health.good / health.total) * 100)
        : 0

      return {
        ...mh,
        angle,
        innerRadius: 0,
        healthRate,
        recordCount: health?.total ?? 0,
        color: MERIDIAN_COLORS[mh.meridian] ?? '#6b9fc4',
        isCurrent: index === currentMeridianIndex,
      }
    })
  }

  /** 获取当前时辰节点 */
  const currentClockNode = computed(() => {
    const nodes = computeClockNodes([])
    const now = new Date()
    const currentHour = now.getHours()
    const currentMeridianIndex = Math.floor(((currentHour + 23) % 24) / 2)
    return nodes[currentMeridianIndex] ?? null
  })

  /** 获取时辰养生提醒 */
  function getHourReminders(): MeridianHourReminder[] {
    const now = new Date()
    const currentHour = now.getHours()
    // 与 computeClockNodes 保持同一套时辰索引（跨天子时由 +23 取模兜底）
    const currentMeridianIndex = Math.floor(((currentHour + 23) % 24) / 2)

    return MERIDIAN_HOURS.map((mh, index) => {
      const organInfo = ORGAN_ELEMENT_MAP[mh.organ as keyof typeof ORGAN_ELEMENT_MAP]
      return {
        hour: mh.hour,
        timeRange: `${mh.startTime}-${mh.endTime}`,
        meridian: mh.meridian,
        organ: mh.organ,
        advice: mh.advice,
        isActive: index === currentMeridianIndex,
        color: organInfo?.color ?? '#6b9fc4',
      }
    })
  }

  // ---- 经络热力图 ----

  /** 计算经络热力图数据 */
  function computeHeatmapData(records: MeridianRecord[]): MeridianHeatmapData[] {
    const result: MeridianHeatmapData[] = []
    const now = new Date()

    for (const mh of MERIDIAN_HOURS) {
      const meridianRecords = records.filter(r => r.meridian === mh.meridian)
      const dailyFeelings: { date: string; feeling: MeridianFeeling | null; score: number }[] = []

      // 最近7天
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const dateKey = getLocalDateKey(d)
        const dayRecord = meridianRecords.find(r => getLocalDateKey(new Date(r.recordedAt)) === dateKey)
        dailyFeelings.push({
          date: dateKey.slice(5),
          feeling: dayRecord?.feeling ?? null,
          score: dayRecord ? FEELING_SCORES[dayRecord.feeling] : 0,
        })
      }

      const scores = dailyFeelings.filter(d => d.score > 0).map(d => d.score)
      const averageScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0

      // 趋势判断
      const mid = Math.floor(dailyFeelings.length / 2)
      const firstHalf = dailyFeelings.slice(0, mid).reduce((s, d) => s + d.score, 0)
      const secondHalf = dailyFeelings.slice(mid).reduce((s, d) => s + d.score, 0)
      let trend: 'improving' | 'stable' | 'declining' = 'stable'
      if (secondHalf > firstHalf + 30) trend = 'improving'
      else if (firstHalf > secondHalf + 30) trend = 'declining'

      const organInfo = ORGAN_ELEMENT_MAP[mh.organ as keyof typeof ORGAN_ELEMENT_MAP]

      result.push({
        meridian: mh.meridian,
        organ: mh.organ,
        element: mh.element,
        dailyFeelings,
        averageScore,
        trend,
        color: organInfo?.color ?? '#6b9fc4',
      })
    }

    return result.sort((a, b) => a.averageScore - b.averageScore)
  }

  /** 获取需要关注的经络 */
  const attentionHeatmap = computed(() => {
    return computeHeatmapData([]).filter(h => h.averageScore < 50)
  })

  // ---- 五行生克关系图 ----

  /** 获取五行关系数据 */
  function getFiveElementRelations(): FiveElementRelation[] {
    return FIVE_ELEMENT_RELATIONS
  }

  /** 根据经络健康数据调整生克强度 */
  function computeElementRelations(records: MeridianRecord[]): FiveElementRelation[] {
    // 五行中文名 → 英文键（FIVE_ELEMENT_RELATIONS 用中文，MERIDIAN_HOURS 用英文）
    const ELEMENT_KEY: Record<string, string> = {
      木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water',
    }
    // 统计各元素的健康率
    const elementHealth = new Map<string, { good: number; total: number }>()

    for (const mh of MERIDIAN_HOURS) {
      const meridianRecords = records.filter(r => r.meridian === mh.meridian)
      const good = meridianRecords.filter(r => r.feeling === 'good').length
      const total = meridianRecords.length

      const existing = elementHealth.get(mh.element) || { good: 0, total: 0 }
      existing.good += good
      existing.total += total
      elementHealth.set(mh.element, existing)
    }

    // 调整关系强度
    return FIVE_ELEMENT_RELATIONS.map(rel => {
      const sourceHealth = elementHealth.get(ELEMENT_KEY[rel.source] ?? rel.source)
      const targetHealth = elementHealth.get(ELEMENT_KEY[rel.target] ?? rel.target)

      const sourceRate = sourceHealth && sourceHealth.total > 0
        ? sourceHealth.good / sourceHealth.total
        : 0.5
      const targetRate = targetHealth && targetHealth.total > 0
        ? targetHealth.good / targetHealth.total
        : 0.5

      // 生克关系受影响
      let adjustedStrength = rel.strength
      if (rel.type === 'generating' && sourceRate > 0.7) {
        adjustedStrength = Math.min(1, rel.strength + 0.15)
      } else if (rel.type === 'controlling' && targetRate < 0.3) {
        adjustedStrength = Math.min(1, rel.strength + 0.2)
      }

      return {
        ...rel,
        strength: adjustedStrength,
      }
    })
  }

  /** 五行动态节点位置 */
  function getElementPositions(): { element: string; x: number; y: number; color: string }[] {
    const elements = ['木', '火', '土', '金', '水']
    const colors: Record<string, string> = {
      '木': '#5ab8a0', '火': '#ef4444', '土': '#f0c040', '金': '#e4e6ed', '水': '#1e3a5f',
    }
    const centerX = 250
    const centerY = 250
    const radius = 150

    // 生克环形布局
    return elements.map((el, i) => {
      const angle = (i / 5) * 360 - 90
      const rad = (angle * Math.PI) / 180
      return {
        element: el,
        x: centerX + radius * Math.cos(rad),
        y: centerY + radius * Math.sin(rad),
        color: colors[el] ?? '#6b9fc4',
      }
    })
  }

  // ---- 经络趋势图 ----

  /** 计算经络趋势数据 */
  function computeTrendData(records: MeridianRecord[], meridian?: MeridianType): MeridianTrendPoint[] {
    const filtered = meridian
      ? records.filter(r => r.meridian === meridian)
      : records

    const trend: MeridianTrendPoint[] = []
    const now = new Date()

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateKey = getLocalDateKey(d)
      const dayRecords = filtered.filter(r => getLocalDateKey(new Date(r.recordedAt)) === dateKey)
      const good = dayRecords.filter(r => r.feeling === 'good').length

      trend.push({
        date: dateKey.slice(5),
        goodRate: dayRecords.length > 0 ? Math.round((good / dayRecords.length) * 100) : 0,
        recordCount: dayRecords.length,
      })
    }

    return trend
  }

  /** 获取所有经络的聚合趋势 */
  function computeAggregateTrend(records: MeridianRecord[]): {
    labels: string[]
    datasets: { meridian: MeridianType; organ: string; color: string; data: number[] }[]
  } {
    const labels: string[] = []
    const now = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(getLocalDateKey(d).slice(5))
    }

    const datasets = MERIDIAN_HOURS.map(mh => {
      const meridianRecords = records.filter(r => r.meridian === mh.meridian)
      const data = labels.map(mmdd => {
        const dayRecords = meridianRecords.filter(r => getLocalDateKey(new Date(r.recordedAt)).slice(5) === mmdd)
        const good = dayRecords.filter(r => r.feeling === 'good').length
        return dayRecords.length > 0 ? Math.round((good / dayRecords.length) * 100) : 0
      })

      return {
        meridian: mh.meridian,
        organ: mh.organ,
        color: MERIDIAN_COLORS[mh.meridian] ?? '#6b9fc4',
        data,
      }
    })

    return { labels, datasets }
  }

  // ---- 经络健康摘要 ----

  /** 经络健康摘要 */
  function computeHealthSummary(records: MeridianRecord[]): {
    totalRecords: number
    overallGoodRate: number
    bestMeridian: { meridian: MeridianType; organ: string; rate: number } | null
    worstMeridian: { meridian: MeridianType; organ: string; rate: number } | null
    coveredMeridians: number
    totalMeridians: number
    recentTrend: 'up' | 'down' | 'flat'
  } {
    const total = records.length
    const good = records.filter(r => r.feeling === 'good').length
    const overallGoodRate = total > 0 ? Math.round((good / total) * 100) : 0

    // 各经络健康率
    const meridianHealth = new Map<MeridianType, { good: number; total: number }>()
    for (const r of records) {
      const mh = meridianHealth.get(r.meridian) || { good: 0, total: 0 }
      if (r.feeling === 'good') mh.good++
      mh.total++
      meridianHealth.set(r.meridian, mh)
    }

    let best: { meridian: MeridianType; organ: string; rate: number } | null = null
    let worst: { meridian: MeridianType; organ: string; rate: number } | null = null

    for (const [meridian, health] of meridianHealth) {
      const rate = health.total > 0 ? Math.round((health.good / health.total) * 100) : 0
      const mh = MERIDIAN_HOURS.find(m => m.meridian === meridian)

      if (!best || rate > best.rate) {
        best = { meridian, organ: mh?.organ ?? meridian, rate }
      }
      if (!worst || (rate < worst.rate && health.total >= 3)) {
        worst = { meridian, organ: mh?.organ ?? meridian, rate }
      }
    }

    // 趋势
    const trend = computeTrendData(records, undefined)
    const recent = trend.slice(-7)
    const firstHalf = recent.slice(0, 3).reduce((s, p) => s + p.goodRate, 0)
    const secondHalf = recent.slice(3).reduce((s, p) => s + p.goodRate, 0)
    let recentTrend: 'up' | 'down' | 'flat' = 'flat'
    if (secondHalf > firstHalf + 10) recentTrend = 'up'
    else if (firstHalf > secondHalf + 10) recentTrend = 'down'

    return {
      totalRecords: total,
      overallGoodRate,
      bestMeridian: best,
      worstMeridian: worst,
      coveredMeridians: meridianHealth.size,
      totalMeridians: 12,
      recentTrend,
    }
  }

  // ---- 时辰养生建议 ----

  /** 获取当前时辰的养生建议 */
  function getCurrentHourAdvice(): {
    current: MeridianHourReminder
    next: MeridianHourReminder
    previous: MeridianHourReminder
  } {
    const reminders = getHourReminders()
    const activeIndex = reminders.findIndex(r => r.isActive)

    return {
      current: reminders[activeIndex] ?? reminders[0],
      next: reminders[(activeIndex + 1) % 12] ?? reminders[1],
      previous: reminders[(activeIndex - 1 + 12) % 12] ?? reminders[11],
    }
  }

  /** 设置选中经络 */
  function selectMeridian(meridian: MeridianType | null): void {
    config.value.selectedMeridian = meridian
  }

  /** 更新配置 */
  function updateConfig(partial: Partial<MeridianVisualizationConfig>): void {
    config.value = { ...config.value, ...partial }
  }

  return {
    config,
    computeClockNodes,
    currentClockNode,
    getHourReminders,
    computeHeatmapData,
    attentionHeatmap,
    getFiveElementRelations,
    computeElementRelations,
    getElementPositions,
    computeTrendData,
    computeAggregateTrend,
    computeHealthSummary,
    getCurrentHourAdvice,
    selectMeridian,
    updateConfig,
  }
}