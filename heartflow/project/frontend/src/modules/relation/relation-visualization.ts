// ============================================================
// 羁绊之厅 · 关系可视化增强
// 蓝图定义：
//   力导向布局算法、交互热力图、关系时间线、
//   关系质量雷达图、联络频率分析
// ============================================================

import type { Person } from './types'
import type { InteractionEntry } from './interaction-journal'

// ---- 力导向布局 ----

export interface ForceNode {
  id: string
  name: string
  relation: string
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
  size: number
  color: string
  isDeceased: boolean
  isSeat: boolean
}

export interface ForceEdge {
  source: string
  target: string
  strength: number
}

export interface ForceLayoutConfig {
  width: number
  height: number
  iterations: number
  repulsion: number
  attraction: number
  damping: number
  centerGravity: number
}

const DEFAULT_LAYOUT_CONFIG: ForceLayoutConfig = {
  width: 800,
  height: 600,
  iterations: 100,
  repulsion: 5000,
  attraction: 0.01,
  damping: 0.9,
  centerGravity: 0.02,
}

/**
 * 力导向布局算法
 * 根据人物关系自动计算节点位置
 */
export function computeForceLayout(
  persons: Person[],
  config: Partial<ForceLayoutConfig> = {},
): { nodes: ForceNode[]; edges: ForceEdge[] } {
  const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config }
  const centerX = cfg.width / 2
  const centerY = cfg.height / 2

  // 初始化节点
  const nodes: ForceNode[] = [
    // 中心节点：自己
    {
      id: 'self',
      name: '我',
      relation: 'self',
      x: centerX,
      y: centerY,
      vx: 0,
      vy: 0,
      fx: centerX,
      fy: centerY,
      size: 20,
      color: '#ffffff',
      isDeceased: false,
      isSeat: false,
    },
    // 人物节点
    ...persons.map((p, i) => {
      const angle = (i / persons.length) * Math.PI * 2
      const radius = 100 + Math.random() * 50
      return {
        id: p.id,
        name: p.name,
        relation: p.relation,
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null,
        size: p.deceased ? 8 : 10 + p.closeness * 10,
        color: p.color,
        isDeceased: p.deceased ?? false,
        isSeat: p.isSeat ?? false,
      }
    }),
  ]

  // 构建边
  const edges: ForceEdge[] = persons.map(p => ({
    source: 'self',
    target: p.id,
    strength: p.closeness * (p.deceased ? 0.3 : 1),
  }))

  // 同标签人物间连线
  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const a = persons[i]
      const b = persons[j]
      const sharedTags = a.tags?.filter(t => b.tags?.includes(t)) ?? []
      if (sharedTags.length > 0) {
        edges.push({
          source: a.id,
          target: b.id,
          strength: 0.3 + sharedTags.length * 0.1,
        })
      }
    }
  }

  // 力导向迭代
  for (let iter = 0; iter < cfg.iterations; iter++) {
    // 计算排斥力
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = b.x - a.x
        let dy = b.y - a.y
        let dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 1) dist = 1

        const force = cfg.repulsion / (dist * dist)
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force

        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // 计算吸引力（沿边）
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)
      if (!source || !target) continue

      let dx = target.x - source.x
      let dy = target.y - source.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 1) continue

      const force = (dist - 100) * cfg.attraction * edge.strength
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force

      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    // 中心引力
    for (const node of nodes) {
      if (node.fx !== null) continue
      node.vx += (centerX - node.x) * cfg.centerGravity
      node.vy += (centerY - node.y) * cfg.centerGravity
    }

    // 更新位置（带阻尼）
    for (const node of nodes) {
      if (node.fx !== null) {
        node.x = node.fx
        node.y = node.fy!
        node.vx = 0
        node.vy = 0
      } else {
        node.vx *= cfg.damping
        node.vy *= cfg.damping
        node.x += node.vx
        node.y += node.vy
      }
    }
  }

  return { nodes, edges }
}

// ---- 交互热力图 ----

export interface HeatmapCell {
  dayOfWeek: number
  hourOfDay: number
  count: number
  intensity: number
}

export interface InteractionHeatmap {
  cells: HeatmapCell[]
  maxIntensity: number
  /** 按天汇总 */
  dailyTotals: { dayOfWeek: number; count: number }[]
  /** 按小时汇总 */
  hourlyTotals: { hourOfDay: number; count: number }[]
  /** 最高频时段 */
  peakHour: { dayOfWeek: number; hourOfDay: number; count: number }
  /** 最低频时段 */
  quietestHour: { dayOfWeek: number; hourOfDay: number; count: number }
}

const DAY_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

/**
 * 构建交互热力图
 * 分析一周内各时段的互动频率分布
 */
export function buildInteractionHeatmap(interactions: InteractionEntry[]): InteractionHeatmap {
  // 7天 × 24小时 网格
  const grid = new Map<string, number>()

  for (const interaction of interactions) {
    const date = new Date(interaction.date)
    const dayOfWeek = date.getDay()
    const hourOfDay = date.getHours()
    const key = `${dayOfWeek}_${hourOfDay}`
    grid.set(key, (grid.get(key) || 0) + 1)
  }

  let maxIntensity = 0
  const cells: HeatmapCell[] = []

  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const key = `${d}_${h}`
      const count = grid.get(key) || 0
      maxIntensity = Math.max(maxIntensity, count)
      cells.push({
        dayOfWeek: d,
        hourOfDay: h,
        count,
        intensity: 0,
      })
    }
  }

  // 归一化强度
  for (const cell of cells) {
    cell.intensity = maxIntensity > 0 ? cell.count / maxIntensity : 0
  }

  // 日汇总
  const dailyTotals = [0, 1, 2, 3, 4, 5, 6].map(d => {
    const count = cells.filter(c => c.dayOfWeek === d).reduce((s, c) => s + c.count, 0)
    return { dayOfWeek: d, count }
  })

  // 小时汇总
  const hourlyTotals = Array.from({ length: 24 }, (_, h) => {
    const count = cells.filter(c => c.hourOfDay === h).reduce((s, c) => s + c.count, 0)
    return { hourOfDay: h, count }
  })

  // 峰值和低谷
  let peakHour = { dayOfWeek: 0, hourOfDay: 0, count: 0 }
  let quietestHour = { dayOfWeek: 0, hourOfDay: 0, count: Infinity }

  for (const cell of cells) {
    if (cell.count > peakHour.count) {
      peakHour = { dayOfWeek: cell.dayOfWeek, hourOfDay: cell.hourOfDay, count: cell.count }
    }
    if (cell.count < quietestHour.count && cell.count >= 0) {
      quietestHour = { dayOfWeek: cell.dayOfWeek, hourOfDay: cell.hourOfDay, count: cell.count }
    }
  }

  return { cells, maxIntensity, dailyTotals, hourlyTotals, peakHour, quietestHour }
}

// ---- 关系时间线 ----

export interface TimelineEvent {
  id: string
  date: string
  personId: string
  personName: string
  type: 'interaction' | 'anniversary' | 'contact' | 'milestone' | 'seat'
  title: string
  description: string
  intensity: number
  color: string
}

export interface RelationshipTimeline {
  events: TimelineEvent[]
  /** 按月份分组 */
  byMonth: Map<string, TimelineEvent[]>
  /** 按人物分组 */
  byPerson: Map<string, TimelineEvent[]>
  /** 时间跨度 */
  timeSpan: { start: string; end: string }
  /** 事件密度 */
  eventDensity: number
}

/**
 * 构建关系时间线
 * 汇总所有互动、纪念日、重要日期到一条时间线
 */
export function buildRelationshipTimeline(
  persons: Person[],
  interactions: InteractionEntry[],
): RelationshipTimeline {
  const events: TimelineEvent[] = []

  // 互动事件
  for (const interaction of interactions) {
    const person = persons.find(p => p.id === interaction.personId)
    if (!person) continue

    events.push({
      id: `tl_i_${interaction.id}`,
      date: interaction.date,
      personId: interaction.personId,
      personName: person.name,
      type: 'interaction',
      title: interaction.kind,
      description: interaction.summary || '',
      intensity: interaction.mood === 'positive' ? 1 : interaction.mood === 'neutral' ? 0.7 : 0.4,
      color: person.color,
    })
  }

  // 重要日期事件
  for (const person of persons) {
    for (const date of person.importantDates || []) {
      // 生成年度事件
      const [year, month, day] = date.date.split('-').map(Number)
      if (!year || !month || !day) continue

      // 为每个相关年份生成事件（最近3年）
      const currentYear = new Date().getFullYear()
      for (let y = currentYear - 2; y <= currentYear; y++) {
        const eventDate = `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        events.push({
          id: `tl_d_${person.id}_${date.label}_${y}`,
          date: eventDate,
          personId: person.id,
          personName: person.name,
          type: 'anniversary',
          title: date.label,
          description: `${person.name}的${date.label}`,
          intensity: 0.8,
          color: person.color,
        })
      }
    }

    // 留座事件
    if (person.isSeat && person.seattedAt) {
      events.push({
        id: `tl_seat_${person.id}`,
        date: person.seattedAt,
        personId: person.id,
        personName: person.name,
        type: 'seat',
        title: '留座',
        description: person.seatReason || '在这个位置留下回忆',
        intensity: 0.5,
        color: '#555',
      })
    }
  }

  // 按日期排序
  events.sort((a, b) => a.date.localeCompare(b.date))

  // 按月份分组
  const byMonth = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    const monthKey = event.date.slice(0, 7)
    if (!byMonth.has(monthKey)) byMonth.set(monthKey, [])
    byMonth.get(monthKey)!.push(event)
  }

  // 按人物分组
  const byPerson = new Map<string, TimelineEvent[]>()
  for (const event of events) {
    if (!byPerson.has(event.personId)) byPerson.set(event.personId, [])
    byPerson.get(event.personId)!.push(event)
  }

  // 时间跨度
  const timeSpan = {
    start: events.length > 0 ? events[0].date : new Date().toISOString(),
    end: events.length > 0 ? events[events.length - 1].date : new Date().toISOString(),
  }

  // 事件密度（每月平均事件数）
  const startDate = new Date(timeSpan.start)
  const endDate = new Date(timeSpan.end)
  const monthsDiff = Math.max(1, (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth()) + 1)
  const eventDensity = events.length / monthsDiff

  return { events, byMonth, byPerson, timeSpan, eventDensity }
}

// ---- 关系质量雷达图 ----

export interface RadarDimension {
  key: string
  label: string
  value: number
  maxValue: number
  description: string
}

export interface RelationshipRadar {
  personId: string
  personName: string
  dimensions: RadarDimension[]
  overallScore: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

const RADAR_DIMENSIONS = [
  { key: 'frequency', label: '联络频率', maxValue: 10, description: '最近互动的频率和规律性' },
  { key: 'depth', label: '交流深度', maxValue: 10, description: '交流内容的深度和质量' },
  { key: 'intimacy', label: '亲密程度', maxValue: 10, description: '主观亲密度和情感连接' },
  { key: 'memories', label: '共同记忆', maxValue: 10, description: '重要日期和纪念日的丰富度' },
  { key: 'growth', label: '共同成长', maxValue: 10, description: '关系是否有成长和变化' },
  { key: 'stability', label: '关系稳定', maxValue: 10, description: '关系的稳定性和可靠性' },
]

/**
 * 计算关系质量雷达图
 */
export function computeRelationshipRadar(
  person: Person,
  interactions: InteractionEntry[],
): RelationshipRadar {
  const personInteractions = interactions.filter(i => i.personId === person.id)
  const sortedInteractions = [...personInteractions].sort((a, b) => a.date.localeCompare(b.date))

  // 联络频率：最近3个月互动次数
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const recentInteractions = sortedInteractions.filter(i => new Date(i.date) >= threeMonthsAgo)
  const frequency = Math.min(10, recentInteractions.length * 2)

  // 交流深度：基于摘要长度和情绪评分
  const avgSummaryLength = personInteractions.length > 0
    ? personInteractions.reduce((s, i) => s + (i.summary?.length || 0), 0) / personInteractions.length
    : 0
  const depth = Math.min(10, (avgSummaryLength / 20) + 3)

  // 亲密程度
  const intimacy = (person.closeness || 0.3) * 10

  // 共同记忆：重要日期 + 互动历史
  const memories = Math.min(10, (person.importantDates?.length || 0) * 2 + personInteractions.length * 0.5)

  // 共同成长：时间跨度
  let growth = 3
  if (sortedInteractions.length >= 2) {
    const firstDate = new Date(sortedInteractions[0].date)
    const lastDate = new Date(sortedInteractions[sortedInteractions.length - 1].date)
    const monthsDiff = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth())
    growth = Math.min(10, 3 + monthsDiff * 0.5)
  }

  // 关系稳定：互动规律性
  let stability = 5
  if (sortedInteractions.length >= 3) {
    const intervals: number[] = []
    for (let i = 1; i < sortedInteractions.length; i++) {
      const diff = new Date(sortedInteractions[i].date).getTime() - new Date(sortedInteractions[i - 1].date).getTime()
      intervals.push(diff / 86400000)
    }
    const avgInterval = intervals.reduce((s, v) => s + v, 0) / intervals.length
    const variance = intervals.reduce((s, v) => s + (v - avgInterval) ** 2, 0) / intervals.length
    stability = Math.max(1, Math.min(10, 10 - Math.sqrt(variance) / 7))
  }

  const dimensions: RadarDimension[] = [
    { key: 'frequency', label: '联络频率', value: Math.round(frequency * 10) / 10, maxValue: 10, description: '最近互动的频率和规律性' },
    { key: 'depth', label: '交流深度', value: Math.round(depth * 10) / 10, maxValue: 10, description: '交流内容的深度和质量' },
    { key: 'intimacy', label: '亲密程度', value: Math.round(intimacy * 10) / 10, maxValue: 10, description: '主观亲密度和情感连接' },
    { key: 'memories', label: '共同记忆', value: Math.round(memories * 10) / 10, maxValue: 10, description: '重要日期和纪念日的丰富度' },
    { key: 'growth', label: '共同成长', value: Math.round(growth * 10) / 10, maxValue: 10, description: '关系是否有成长和变化' },
    { key: 'stability', label: '关系稳定', value: Math.round(stability * 10) / 10, maxValue: 10, description: '关系的稳定性和可靠性' },
  ]

  const overallScore = dimensions.reduce((s, d) => s + d.value, 0) / dimensions.length

  // 识别强弱项
  const strengths = dimensions.filter(d => d.value >= 7).map(d => d.label)
  const weaknesses = dimensions.filter(d => d.value <= 3).map(d => d.label)

  // 生成建议
  const suggestions: string[] = []
  if (frequency <= 3) suggestions.push('建议增加联络频率，哪怕只是简单的问候')
  if (depth <= 3) suggestions.push('尝试更深层次的交流，分享内心的想法')
  if (memories <= 3) suggestions.push('记录更多重要日期，创造共同回忆')
  if (stability <= 3) suggestions.push('建立规律的联络习惯，增强关系稳定性')
  if (growth <= 3) suggestions.push('尝试新的互动方式，让关系有新的成长')

  return {
    personId: person.id,
    personName: person.name,
    dimensions,
    overallScore: Math.round(overallScore * 100) / 100,
    strengths,
    weaknesses,
    suggestions,
  }
}

// ---- 导出工具 ----

export { DAY_LABELS, RADAR_DIMENSIONS, DEFAULT_LAYOUT_CONFIG }