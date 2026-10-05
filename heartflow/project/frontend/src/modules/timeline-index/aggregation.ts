// ============================================================
// 时间线索引 · 聚合视图与高级搜索
// 蓝图要求：聚合视图数据 + 全文搜索 + 事件联动
// ============================================================

import { ref } from 'vue'
import { getLocalMonthKey } from '../../utils/time'
import type { IndexEntry } from './types'

// ---- 聚合视图类型 ----

/** 时间粒度 */
export type AggregationGranularity = 'hour' | 'day' | 'week' | 'month'

/** 聚合数据项 */
export interface AggregatedItem {
  /** 时间段标识 */
  key: string
  /** 标签（如 "2026-08-01" 或 "周一"） */
  label: string
  /** 条目数 */
  count: number
  /** 总权重 */
  totalWeight: number
  /** 平均权重 */
  avgWeight: number
  /** 情绪峰值强度 */
  peakIntensity: number
  /** 情绪平均强度 */
  avgIntensity: number
  /** 类型分布 */
  typeDistribution: Record<string, number>
  /** 房间来源分布 */
  roomDistribution: Record<string, number>
  /** 时间段起始 */
  startTime: string
  /** 时间段结束 */
  endTime: string
}

/** 聚合视图配置 */
export interface AggregationConfig {
  granularity: AggregationGranularity
  startDate: string
  endDate: string
  includeTypes?: string[]
  minWeight?: number
}

/** 聚合视图结果 */
export interface AggregationResult {
  items: AggregatedItem[]
  totalEntries: number
  totalWeight: number
  peakDay: AggregatedItem | null
  quietestDay: AggregatedItem | null
  typeDistribution: Record<string, number>
  roomDistribution: Record<string, number>
}

// ---- 全文搜索类型 ----

/** 搜索索引 */
export interface SearchIndex {
  /** 词 → 条目 ID 列表 */
  wordToIds: Record<string, string[]>
  /** 条目 ID → 索引内容 */
  idToContent: Record<string, string>
  /** 最后构建时间 */
  builtAt: string
  /** 索引条目数 */
  entryCount: number
}

/** 搜索结果 */
export interface SearchResult {
  entry: IndexEntry
  score: number
  highlights: string[]
  matchedFields: string[]
}

/** 全文搜索配置 */
export interface SearchConfig {
  /** 搜索字段权重 */
  fieldWeights: {
    title: number
    summary: number
    content: number
    tags: number
  }
  /** 最小匹配分数 */
  minScore: number
  /** 最大结果数 */
  maxResults: number
  /** 模糊匹配阈值 */
  fuzzyThreshold: number
}

// ---- 事件联动类型 ----

/** 事件链 */
export interface EventChain {
  id: string
  /** 链中事件 */
  events: IndexEntry[]
  /** 链类型 */
  chainType: 'cause-effect' | 'sequential' | 'related' | 'milestone'
  /** 链描述 */
  description: string
  /** 关联强度 */
  strength: number
  /** 时间跨度 */
  timeSpan: string
}

/** 事件簇 */
export interface EventCluster {
  id: string
  /** 中心事件 */
  center: IndexEntry
  /** 关联事件 */
  related: IndexEntry[]
  /** 簇类型 */
  clusterType: string
  /** 关联得分 */
  relevanceScore: number
}

// ---- 默认配置 ----

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  fieldWeights: {
    title: 3.0,
    summary: 2.0,
    content: 1.0,
    tags: 1.5,
  },
  minScore: 0.1,
  maxResults: 50,
  fuzzyThreshold: 0.7,
}

// ---- 工具函数 ----

function getWeekKey(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return monday.toISOString().slice(0, 10)
}

function getMonthKey(date: Date): string {
  return getLocalMonthKey(date)
}

function getHourKey(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T${String(date.getHours()).padStart(2, '0')}`
}

function getKeyForGranularity(date: Date, granularity: AggregationGranularity): string {
  switch (granularity) {
    case 'hour': return getHourKey(date)
    case 'day': return date.toISOString().slice(0, 10)
    case 'week': return getWeekKey(date)
    case 'month': return getMonthKey(date)
  }
}

function getLabelForKey(key: string, granularity: AggregationGranularity): string {
  switch (granularity) {
    case 'hour': return `${key.slice(11)}:00`
    case 'day': {
      const d = new Date(key)
      const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${key.slice(5)} ${weekDays[d.getDay()]}`
    }
    case 'week': return `${key} 起`
    case 'month': {
      const [y, m] = key.split('-')
      return `${y}年${parseInt(m)}月`
    }
  }
}

// ---- 简单分词器 ----

function tokenize(text: string): string[] {
  if (!text) return []
  // 中文按字符拆分，英文按空格
  const tokens: string[] = []
  const parts = text.toLowerCase().split(/\s+/)
  for (const part of parts) {
    // 中英文混合处理
    const mixed = part.match(/[\u4e00-\u9fff]|[a-z0-9]+/g)
    if (mixed) {
      tokens.push(...mixed)
    }
  }
  return [...new Set(tokens)]
}

// ---- 编辑距离（模糊匹配） ----

function levenshteinDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))

  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshteinDistance(a, b) / maxLen
}

// ============================================================
// 聚合视图
// ============================================================

export function useAggregation(getEntries: (start: string, end: string) => IndexEntry[]) {
  const config = ref<AggregationConfig>({
    granularity: 'day',
    startDate: '',
    endDate: '',
  })

  /**
   * 计算聚合视图
   * 将时间线索引条目按指定粒度聚合，生成统计视图
   */
  function aggregate(cfg: AggregationConfig): AggregationResult {
    const entries = getEntries(cfg.startDate, cfg.endDate)

    // 过滤
    let filtered = entries
    if (cfg.includeTypes && cfg.includeTypes.length > 0) {
      const typeSet = new Set(cfg.includeTypes)
      filtered = filtered.filter(e => typeSet.has(e.type))
    }
    if (cfg.minWeight !== undefined) {
      filtered = filtered.filter(e => e.weight >= (cfg.minWeight ?? 0))
    }

    // 按粒度分组
    const groups = new Map<string, IndexEntry[]>()
    for (const entry of filtered) {
      const key = getKeyForGranularity(new Date(entry.timestamp), cfg.granularity)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(entry)
    }

    // 计算聚合项
    const items: AggregatedItem[] = []
    let totalWeight = 0
    const globalTypeDist: Record<string, number> = {}
    const globalRoomDist: Record<string, number> = {}

    for (const [key, groupEntries] of groups) {
      const sorted = groupEntries.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      const count = sorted.length
      let groupWeight = 0
      let peakIntensity = 0
      let totalIntensity = 0
      let intensityCount = 0
      const typeDist: Record<string, number> = {}
      const roomDist: Record<string, number> = {}

      for (const e of sorted) {
        groupWeight += e.weight
        typeDist[e.type] = (typeDist[e.type] || 0) + 1
        roomDist[e.roomSource] = (roomDist[e.roomSource] || 0) + 1

        globalTypeDist[e.type] = (globalTypeDist[e.type] || 0) + 1
        globalRoomDist[e.roomSource] = (globalRoomDist[e.roomSource] || 0) + 1

        const intensity = (e.summary as any)?.intensity as number | undefined
        if (intensity !== undefined) {
          peakIntensity = Math.max(peakIntensity, intensity)
          totalIntensity += intensity
          intensityCount++
        }
      }

      const item: AggregatedItem = {
        key,
        label: getLabelForKey(key, cfg.granularity),
        count,
        totalWeight: groupWeight,
        avgWeight: count > 0 ? Math.round((groupWeight / count) * 1000) / 1000 : 0,
        peakIntensity,
        avgIntensity: intensityCount > 0 ? Math.round((totalIntensity / intensityCount) * 100) / 100 : 0,
        typeDistribution: typeDist,
        roomDistribution: roomDist,
        startTime: sorted[0].timestamp,
        endTime: sorted[sorted.length - 1].timestamp,
      }
      items.push(item)
      totalWeight += groupWeight
    }

    // 排序
    items.sort((a, b) => a.key.localeCompare(b.key))

    // 找到峰值和低谷
    let peakDay: AggregatedItem | null = null
    let quietestDay: AggregatedItem | null = null
    let maxCount = 0
    let minCount = Infinity

    for (const item of items) {
      if (item.count > maxCount) {
        maxCount = item.count
        peakDay = item
      }
      if (item.count < minCount && item.count > 0) {
        minCount = item.count
        quietestDay = item
      }
    }

    return {
      items,
      totalEntries: filtered.length,
      totalWeight: Math.round(totalWeight * 1000) / 1000,
      peakDay,
      quietestDay,
      typeDistribution: globalTypeDist,
      roomDistribution: globalRoomDist,
    }
  }

  /** 获取多粒度聚合 */
  function multiGranularity(startDate: string, endDate: string): {
    hourly: AggregationResult
    daily: AggregationResult
    weekly: AggregationResult
    monthly: AggregationResult
  } {
    return {
      hourly: aggregate({ granularity: 'hour', startDate, endDate }),
      daily: aggregate({ granularity: 'day', startDate, endDate }),
      weekly: aggregate({ granularity: 'week', startDate, endDate }),
      monthly: aggregate({ granularity: 'month', startDate, endDate }),
    }
  }

  return {
    config,
    aggregate,
    multiGranularity,
  }
}

// ============================================================
// 全文搜索
// ============================================================

export function useFullTextSearch(_getEntries: (start: string, end: string) => IndexEntry[]) {
  const searchIndex = ref<SearchIndex | null>(null)
  const searchConfig = ref<SearchConfig>({ ...DEFAULT_SEARCH_CONFIG })

  /**
   * 构建搜索索引
   * 对所有条目的摘要和内容建立倒排索引
   */
  function buildIndex(entries: IndexEntry[]): SearchIndex {
    const wordToIds: Record<string, string[]> = {}
    const idToContent: Record<string, string> = {}

    for (const entry of entries) {
      const contentParts: string[] = []

      if (entry.summary.snippet) {
        contentParts.push(entry.summary.snippet)
      }
      if ((entry.summary as any).content) {
        contentParts.push((entry.summary as any).content as string)
      }

      const fullContent = contentParts.join(' ')
      idToContent[entry.indexId] = fullContent

      const tokens = tokenize(fullContent)
      for (const token of tokens) {
        if (!wordToIds[token]) wordToIds[token] = []
        if (!wordToIds[token].includes(entry.indexId)) {
          wordToIds[token].push(entry.indexId)
        }
      }
    }

    const index: SearchIndex = {
      wordToIds,
      idToContent,
      builtAt: new Date().toISOString(),
      entryCount: entries.length,
    }

    searchIndex.value = index
    return index
  }

  /**
   * 全文搜索
   */
  function search(
    query: string,
    entries: IndexEntry[],
    config: Partial<SearchConfig> = {},
  ): SearchResult[] {
    // 确保索引存在
    if (!searchIndex.value || searchIndex.value.entryCount !== entries.length) {
      buildIndex(entries)
    }

    const cfg = { ...searchConfig.value, ...config }
    const idx = searchIndex.value!
    const queryTokens = tokenize(query)

    if (queryTokens.length === 0) return []

    const idToEntry = new Map<string, IndexEntry>()
    for (const entry of entries) {
      idToEntry.set(entry.indexId, entry)
    }

    // 计算每个条目的分数
    const scores = new Map<string, { score: number; matchedFields: string[]; highlights: string[] }>()

    for (const token of queryTokens) {
      // 精确匹配
      if (idx.wordToIds[token]) {
        for (const id of idx.wordToIds[token]) {
          if (!scores.has(id)) {
            scores.set(id, { score: 0, matchedFields: [], highlights: [] })
          }
          const s = scores.get(id)!
          s.score += cfg.fieldWeights.summary
          s.matchedFields.push('summary')
        }
      }

      // 模糊匹配
      const allWords = Object.keys(idx.wordToIds)
      for (const word of allWords) {
        const sim = similarity(token, word)
        if (sim >= cfg.fuzzyThreshold && sim < 1) {
          for (const id of idx.wordToIds[word]) {
            if (!scores.has(id)) {
              scores.set(id, { score: 0, matchedFields: [], highlights: [] })
            }
            const s = scores.get(id)!
            s.score += cfg.fieldWeights.summary * sim * 0.5
            s.matchedFields.push('summary(fuzzy)')
          }
        }
      }

      // 内容搜索
      for (const [id, content] of Object.entries(idx.idToContent)) {
        if (content.toLowerCase().includes(token.toLowerCase())) {
          if (!scores.has(id)) {
            scores.set(id, { score: 0, matchedFields: [], highlights: [] })
          }
          const s = scores.get(id)!
          s.score += cfg.fieldWeights.content

          // 生成高亮片段
          const idx2 = content.toLowerCase().indexOf(token.toLowerCase())
          if (idx2 >= 0) {
            const start = Math.max(0, idx2 - 20)
            const end = Math.min(content.length, idx2 + token.length + 20)
            const snippet = content.slice(start, end)
            s.highlights.push((start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : ''))
          }
        }
      }
    }

    // 过滤低分并排序
    const results: SearchResult[] = []
    for (const [id, scoreData] of scores) {
      if (scoreData.score >= cfg.minScore) {
        const entry = idToEntry.get(id)
        if (entry) {
          results.push({
            entry,
            score: Math.round(scoreData.score * 100) / 100,
            highlights: [...new Set(scoreData.highlights)].slice(0, 3),
            matchedFields: [...new Set(scoreData.matchedFields)],
          })
        }
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, cfg.maxResults)
  }

  /** 清除索引 */
  function clearIndex(): void {
    searchIndex.value = null
  }

  return {
    searchIndex,
    searchConfig,
    buildIndex,
    search,
    clearIndex,
  }
}

// ============================================================
// 事件联动
// ============================================================

export function useEventLinkage(getEntries: (start: string, end: string) => IndexEntry[]) {
  const chains = ref<EventChain[]>([])
  const clusters = ref<EventCluster[]>([])

  /**
   * 发现事件链
   * 基于时间邻近性、类型关联和房间来源，发现事件之间的因果关系
   */
  function discoverChains(entries: IndexEntry[]): EventChain[] {
    const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const discovered: EventChain[] = []

    // 按房间分组，在同一房间内寻找时间相邻的事件
    const roomGroups = new Map<string, IndexEntry[]>()
    for (const entry of sorted) {
      if (!roomGroups.has(entry.roomSource)) {
        roomGroups.set(entry.roomSource, [])
      }
      roomGroups.get(entry.roomSource)!.push(entry)
    }

    for (const [room, roomEntries] of roomGroups) {
      for (let i = 0; i < roomEntries.length - 1; i++) {
        const a = roomEntries[i]
        const b = roomEntries[i + 1]
        const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        const hoursDiff = timeDiff / 3600000

        // 24小时内的事件视为关联
        if (hoursDiff <= 24) {
          const chainType = determineChainType(a, b)
          const strength = calculateChainStrength(a, b, hoursDiff)

          discovered.push({
            id: `chain_${a.indexId}_${b.indexId}`,
            events: [a, b],
            chainType,
            description: generateChainDescription(a, b, chainType, room),
            strength,
            timeSpan: formatTimeSpan(a.timestamp, b.timestamp),
          })
        }
      }
    }

    // 跨房间关联：情绪事件后跟随笔记或锚点
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i]
      const b = sorted[i + 1]

      if (a.roomSource !== b.roomSource) {
        const timeDiff = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        const hoursDiff = timeDiff / 3600000

        if (hoursDiff <= 6) {
          // 跨房间关联
          if (a.type === 'emotion' && (b.type === 'note' || b.type === 'anchor')) {
            discovered.push({
              id: `cross_chain_${a.indexId}_${b.indexId}`,
              events: [a, b],
              chainType: 'cause-effect',
              description: `情绪波动 "${a.summary.snippet}" 触发了 "${b.summary.snippet}"`,
              strength: 0.7,
              timeSpan: formatTimeSpan(a.timestamp, b.timestamp),
            })
          }
        }
      }
    }

    // 去重并排序
    chains.value = discovered
      .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
      .sort((a, b) => b.strength - a.strength)

    return chains.value
  }

  /** 确定链类型 */
  function determineChainType(a: IndexEntry, b: IndexEntry): EventChain['chainType'] {
    // 情绪 → 笔记 = 因果
    if (a.type === 'emotion' && b.type === 'note') return 'cause-effect'
    // 锚点 → 锚点 = 序列
    if (a.type === 'anchor' && b.type === 'anchor') return 'sequential'
    // 笔记 → 笔记 = 相关
    if (a.type === 'note' && b.type === 'note') return 'related'
    // 结晶 → 任意 = 里程碑
    if (a.type === 'crystal') return 'milestone'
    return 'related'
  }

  /** 计算链强度 */
  function calculateChainStrength(a: IndexEntry, b: IndexEntry, hoursDiff: number): number {
    let strength = 1.0

    // 时间越近，强度越高
    if (hoursDiff <= 1) strength *= 1.0
    else if (hoursDiff <= 6) strength *= 0.8
    else if (hoursDiff <= 12) strength *= 0.6
    else strength *= 0.4

    // 同类型更强
    if (a.type === b.type) strength *= 1.2

    // 权重越高越重要
    strength *= (a.weight + b.weight) / 2

    return Math.min(1, Math.round(strength * 100) / 100)
  }

  /** 生成链描述 */
  function generateChainDescription(
    a: IndexEntry,
    b: IndexEntry,
    chainType: EventChain['chainType'],
    room: string,
  ): string {
    const roomLabel = getRoomLabel(room)
    const aTitle = a.summary.snippet || '未知事件'
    const bTitle = b.summary.snippet || '未知事件'

    switch (chainType) {
      case 'cause-effect':
        return `"${aTitle}" 可能导致了 "${bTitle}"`
      case 'sequential':
        return `在 ${roomLabel} 中连续发生：${aTitle} → ${bTitle}`
      case 'related':
        return `在 ${roomLabel} 中的关联事件：${aTitle} 与 ${bTitle}`
      case 'milestone':
        return `里程碑 "${aTitle}" 触发了后续 "${bTitle}"`
    }
  }

  /** 格式化时间跨度 */
  function formatTimeSpan(start: string, end: string): string {
    const diff = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}分钟`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}小时${minutes % 60}分钟`
    const days = Math.floor(hours / 24)
    return `${days}天${hours % 24}小时`
  }

  /** 获取房间标签 */
  function getRoomLabel(room: string): string {
    const labels: Record<string, string> = {
      home: '家',
      study: '思绪书房',
      emotion: '情绪花房',
      anchor: '逐日心锚',
      garden: '根脉之庭',
      goal: '留光阁',
      reward: '劳酬',
      rest: '息壤',
      scar: '工痕',
      career: '业脉',
      relation: '羁绊之厅',
      timeline: '时间长廊',
      sanctuary: '安全岛',
    }
    return labels[room] || room
  }

  /**
   * 发现事件簇
   * 基于相似度聚类，找出密度最高的事件簇
   */
  function discoverClusters(entries: IndexEntry[]): EventCluster[] {
    if (entries.length < 2) return []

    const clusters2: EventCluster[] = []
    const processed = new Set<string>()

    // 按时间窗口聚类（同一个小时窗口）
    const sorted = [...entries].sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    const windowMs = 3600000 // 1小时窗口

    for (let i = 0; i < sorted.length; i++) {
      if (processed.has(sorted[i].indexId)) continue

      const center = sorted[i]
      const centerTime = new Date(center.timestamp).getTime()
      const related: IndexEntry[] = []

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j]
        if (processed.has(candidate.indexId)) continue

        const candidateTime = new Date(candidate.timestamp).getTime()
        if (candidateTime - centerTime <= windowMs) {
          related.push(candidate)
          processed.add(candidate.indexId)
        } else {
          break
        }
      }

      if (related.length > 0) {
        processed.add(center.indexId)
        const clusterType = determineClusterType(center, related)
        const relevanceScore = calculateClusterScore(center, related)

        clusters2.push({
          id: `cluster_${center.indexId}`,
          center,
          related,
          clusterType,
          relevanceScore,
        })
      }
    }

    clusters.value = clusters2.sort((a, b) => b.relevanceScore - a.relevanceScore)
    return clusters.value
  }

  /** 确定簇类型 */
  function determineClusterType(center: IndexEntry, related: IndexEntry[]): string {
    const types = new Set([center.type, ...related.map(e => e.type)])
    if (types.size === 1) return `${center.type}_cluster`
    return 'mixed_cluster'
  }

  /** 计算簇分数 */
  function calculateClusterScore(center: IndexEntry, related: IndexEntry[]): number {
    const totalWeight = related.reduce((sum, e) => sum + e.weight, center.weight)
    const avgWeight = totalWeight / (related.length + 1)
    const sizeBonus = Math.min(1, related.length / 10)
    return Math.round((avgWeight * 0.7 + sizeBonus * 0.3) * 100) / 100
  }

  /**
   * 分析事件联动（完整流程）
   */
  function analyze(startDate: string, endDate: string): {
    chains: EventChain[]
    clusters: EventCluster[]
  } {
    const entries = getEntries(startDate, endDate)
    const chainsResult = discoverChains(entries)
    const clustersResult = discoverClusters(entries)
    return { chains: chainsResult, clusters: clustersResult }
  }

  return {
    chains,
    clusters,
    discoverChains,
    discoverClusters,
    analyze,
  }
}

// ---- 存储键 ----
