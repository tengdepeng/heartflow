// ============================================================
// 镜我 · 主题聚类模块（P16-13）
// 对话主题提取、聚类分析、趋势追踪、主题搜索
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 对话条目 */
export interface TopicDialogueEntry {
  id: string
  text: string
  timestamp: number
  intent?: string
  emotion?: string
}

/** 主题 */
export interface Topic {
  /** 主题 ID */
  id: string
  /** 主题名称 */
  name: string
  /** 关键词 */
  keywords: string[]
  /** 所属对话条目数 */
  entryCount: number
  /** 首次出现时间 */
  firstSeen: number
  /** 最近出现时间 */
  lastSeen: number
  /** 关联对话 ID */
  entryIds: string[]
  /** 主题强度 (0-1) */
  strength: number
  /** 父主题 ID */
  parentId?: string
  /** 子主题 */
  children: Topic[]
  /** 情绪倾向 */
  emotionalTone?: 'positive' | 'negative' | 'neutral' | 'mixed'
}

/** 主题聚类配置 */
export interface TopicClusteringConfig {
  /** 最小关键词频率 */
  minKeywordFrequency: number
  /** 最大主题数 */
  maxTopics: number
  /** 相似度阈值 */
  similarityThreshold: number
  /** 是否启用层次聚类 */
  hierarchicalClustering: boolean
  /** 停用词列表 */
  stopWords: string[]
  /** 最小词长度 */
  minWordLength: number
}

/** 主题趋势 */
export interface TopicTrend {
  /** 主题 ID */
  topicId: string
  /** 主题名称 */
  topicName: string
  /** 时间段 */
  periods: TopicTrendPeriod[]
  /** 趋势方向 */
  direction: 'rising' | 'falling' | 'stable' | 'new' | 'fading'
  /** 变化率 */
  changeRate: number
}

/** 主题趋势时间段 */
export interface TopicTrendPeriod {
  /** 时间段标签 */
  label: string
  /** 开始时间戳 */
  startTime: number
  /** 结束时间戳 */
  endTime: number
  /** 频次 */
  frequency: number
  /** 强度 */
  intensity: number
}

/** 主题搜索结果 */
export interface TopicSearchResult {
  /** 主题 */
  topic: Topic
  /** 相关条目 */
  entries: TopicDialogueEntry[]
  /** 相关性分数 */
  relevanceScore: number
}

/** 主题摘要 */
export interface TopicSummary {
  /** 总主题数 */
  totalTopics: number
  /** 活跃主题数 */
  activeTopics: number
  /** 新兴主题 */
  emergingTopics: Topic[]
  /** 衰退主题 */
  fadingTopics: Topic[]
  /** 热点主题 */
  hotTopics: Topic[]
  /** 生成时间 */
  generatedAt: number
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_TOPIC_CONFIG: TopicClusteringConfig = {
  minKeywordFrequency: 2,
  maxTopics: 20,
  similarityThreshold: 0.3,
  hierarchicalClustering: true,
  stopWords: [
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
    '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着',
    '没有', '看', '好', '自己', '这', '他', '她', '它', '们', '那', '些',
    '什么', '怎么', '哪儿', '为什么', '可以', '这个', '那个', '还是',
    '只是', '但是', '因为', '所以', '如果', '虽然', '而且', '然后',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'can', 'shall', 'to', 'of', 'in', 'for',
    'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
    'before', 'after', 'above', 'below', 'between', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
    'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'now', 'also', 'really', 'still', 'already',
  ],
  minWordLength: 2,
}

// ============================================================
// 中文分词辅助
// ============================================================

/** 简单中文分词（基于字符 n-gram 和词典） */
function tokenizeChinese(text: string, minLength: number, stopWords: string[]): string[] {
  // 移除标点符号和特殊字符
  const cleaned = text.replace(/[，。！？、；：""''（）【】《》\s,.!?;:'"()\[\]{}<>\/\\@#$%^&*+=~`|]/g, ' ')

  // 提取中文词（2-4字组合）
  const tokens: string[] = []
  const chars = cleaned.replace(/\s+/g, '').split('')

  // 单字（有意义的）
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (/[\u4e00-\u9fff]/.test(ch) && ch.length >= minLength) {
      tokens.push(ch)
    }
  }

  // 双字组合
  for (let i = 0; i < chars.length - 1; i++) {
    const bigram = chars[i] + chars[i + 1]
    if (/^[\u4e00-\u9fff]{2}$/.test(bigram)) {
      tokens.push(bigram)
    }
  }

  // 三字组合
  for (let i = 0; i < chars.length - 2; i++) {
    const trigram = chars[i] + chars[i + 1] + chars[i + 2]
    if (/^[\u4e00-\u9fff]{3}$/.test(trigram)) {
      tokens.push(trigram)
    }
  }

  // 提取英文单词
  const englishWords = text.match(/[a-zA-Z]{2,}/g)
  if (englishWords) {
    tokens.push(...englishWords.map(w => w.toLowerCase()))
  }

  // 过滤停用词和短词
  return tokens.filter(t => t.length >= minLength && !stopWords.includes(t.toLowerCase()))
}

// ============================================================
// 主题聚类 Composable
// ============================================================

export function useTopicClustering(config?: Partial<TopicClusteringConfig>) {
  // ---- 配置 ----
  const clusteringConfig = ref<TopicClusteringConfig>({
    ...DEFAULT_TOPIC_CONFIG,
    ...config,
  })

  // ---- 状态 ----
  const entries = ref<TopicDialogueEntry[]>([])
  const topics = ref<Topic[]>([])
  const trends = ref<TopicTrend[]>([])
  const lastClusteredAt = ref<number | null>(null)

  // ---- 内部状态 ----
  let entryIdCounter = 0

  // ---- 派生状态 ----
  const topicCount = computed(() => topics.value.length)

  const activeTopics = computed(() => {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000
    return topics.value.filter(t => t.lastSeen >= weekAgo && t.entryCount >= 2)
  })

  const hotTopics = computed(() => {
    return [...activeTopics.value]
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5)
  })

  const topKeywords = computed(() => {
    const keywordMap = new Map<string, number>()
    for (const topic of topics.value) {
      for (const kw of topic.keywords) {
        keywordMap.set(kw, (keywordMap.get(kw) ?? 0) + topic.strength)
      }
    }
    return [...keywordMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([kw, score]) => ({ keyword: kw, score: Math.round(score * 100) / 100 }))
  })

  // ============================================================
  // 条目管理
  // ============================================================

  /** 添加对话条目 */
  function addEntry(text: string, intent?: string, emotion?: string): TopicDialogueEntry {
    const entry: TopicDialogueEntry = {
      id: `entry_${Date.now().toString(36)}_${(entryIdCounter++).toString(36)}`,
      text,
      timestamp: Date.now(),
      intent,
      emotion,
    }
    entries.value = [...entries.value, entry]
    return entry
  }

  /** 批量添加条目 */
  function addEntries(items: Array<{ text: string; intent?: string; emotion?: string; timestamp?: number }>): void {
    const newEntries: TopicDialogueEntry[] = items.map(item => ({
      id: `entry_${Date.now().toString(36)}_${(entryIdCounter++).toString(36)}`,
      text: item.text,
      timestamp: item.timestamp ?? Date.now(),
      intent: item.intent,
      emotion: item.emotion,
    }))
    entries.value = [...entries.value, ...newEntries]
  }

  /** 移除条目 */
  function removeEntry(entryId: string): boolean {
    const idx = entries.value.findIndex(e => e.id === entryId)
    if (idx === -1) return false
    entries.value = [...entries.value.slice(0, idx), ...entries.value.slice(idx + 1)]
    return true
  }

  /** 清除所有条目 */
  function clearEntries(): void {
    entries.value = []
    topics.value = []
    trends.value = []
    lastClusteredAt.value = null
  }

  // ============================================================
  // 聚类分析
  // ============================================================

  /** 执行主题聚类 */
  function cluster(): Topic[] {
    if (entries.value.length === 0) return []

    const cfg = clusteringConfig.value
    const allTokens: Map<string, { count: number; entryIds: string[]; timestamps: number[] }> = new Map()

    // 1. 分词和统计
    for (const entry of entries.value) {
      const tokens = tokenizeChinese(entry.text, cfg.minWordLength, cfg.stopWords)
      const uniqueTokens = new Set(tokens)

      for (const token of uniqueTokens) {
        const existing = allTokens.get(token)
        if (existing) {
          existing.count++
          existing.entryIds.push(entry.id)
          existing.timestamps.push(entry.timestamp)
        } else {
          allTokens.set(token, {
            count: 1,
            entryIds: [entry.id],
            timestamps: [entry.timestamp],
          })
        }
      }
    }

    // 2. 过滤低频词
    const frequentTokens = new Map(
      [...allTokens.entries()].filter(([_, data]) => data.count >= cfg.minKeywordFrequency),
    )

    if (frequentTokens.size === 0) {
      topics.value = []
      return []
    }

    // 3. 计算词共现矩阵
    const tokenList = [...frequentTokens.keys()]
    const cooccurrence = new Map<string, Map<string, number>>()

    for (const entry of entries.value) {
      const tokens = tokenizeChinese(entry.text, cfg.minWordLength, cfg.stopWords)
      const uniqueTokens = [...new Set(tokens)].filter(t => frequentTokens.has(t))

      for (let i = 0; i < uniqueTokens.length; i++) {
        for (let j = i + 1; j < uniqueTokens.length; j++) {
          const a = uniqueTokens[i]
          const b = uniqueTokens[j]

          if (!cooccurrence.has(a)) cooccurrence.set(a, new Map())
          if (!cooccurrence.has(b)) cooccurrence.set(b, new Map())

          cooccurrence.get(a)!.set(b, (cooccurrence.get(a)!.get(b) ?? 0) + 1)
          cooccurrence.get(b)!.set(a, (cooccurrence.get(b)!.get(a) ?? 0) + 1)
        }
      }
    }

    // 4. 简单聚类（基于共现相似度）
    const clusters: Array<{
      keywords: string[]
      entryIds: Set<string>
      timestamps: number[]
    }> = []

    const assigned = new Set<string>()

    for (const token of tokenList) {
      if (assigned.has(token)) continue

      // 找到最相似的未分配词
      const neighbors = cooccurrence.get(token)
      const clusterKeywords = [token]
      assigned.add(token)

      if (neighbors) {
        for (const [neighbor, count] of neighbors) {
          if (assigned.has(neighbor)) continue
          const neighborData = frequentTokens.get(neighbor)
          if (!neighborData) continue

          // 计算 Jaccard 相似度
          const score = count / (frequentTokens.get(token)!.count + neighborData.count - count)
          if (score >= cfg.similarityThreshold) {
            clusterKeywords.push(neighbor)
            assigned.add(neighbor)
          }
        }
      }

      // 收集该聚类的条目
      const entryIds = new Set<string>()
      const timestamps: number[] = []

      for (const kw of clusterKeywords) {
        const data = frequentTokens.get(kw)
        if (data) {
          for (const eid of data.entryIds) entryIds.add(eid)
          timestamps.push(...data.timestamps)
        }
      }

      clusters.push({ keywords: clusterKeywords, entryIds, timestamps })
    }

    // 5. 限制主题数量
    clusters.sort((a, b) => b.entryIds.size - a.entryIds.size)
    const topClusters = clusters.slice(0, cfg.maxTopics)

    // 6. 构建主题对象
    const newTopics: Topic[] = topClusters.map((cluster, index) => {
      const sortedTimestamps = [...cluster.timestamps].sort((a, b) => a - b)
      const entryCount = cluster.entryIds.size
      const totalEntries = entries.value.length
      const recency = sortedTimestamps.length > 0
        ? (Date.now() - sortedTimestamps[sortedTimestamps.length - 1]) / (24 * 60 * 60 * 1000)
        : 999

      // 强度 = 条目占比 * 时间衰减
      const strength = Math.min(1, (entryCount / Math.max(1, totalEntries)) * (1 / (1 + recency * 0.1)))

      return {
        id: `topic_${Date.now().toString(36)}_${index.toString(36)}`,
        name: cluster.keywords.slice(0, 3).join('·'),
        keywords: cluster.keywords,
        entryCount,
        firstSeen: sortedTimestamps[0] ?? Date.now(),
        lastSeen: sortedTimestamps[sortedTimestamps.length - 1] ?? Date.now(),
        entryIds: [...cluster.entryIds],
        strength: Math.round(strength * 1000) / 1000,
        children: [],
      }
    })

    // 7. 层次聚类（可选）
    if (cfg.hierarchicalClustering && newTopics.length > 3) {
      buildHierarchy(newTopics, cfg.similarityThreshold)
    }

    topics.value = newTopics
    lastClusteredAt.value = Date.now()

    // 更新趋势
    updateTrends()

    return newTopics
  }

  // ============================================================
  // 层次聚类
  // ============================================================

  /** 构建主题层次结构 */
  function buildHierarchy(topicList: Topic[], threshold: number): void {
    if (topicList.length <= 1) return

    // 计算主题间相似度
    const pairs: Array<{ i: number; j: number; similarity: number }> = []

    for (let i = 0; i < topicList.length; i++) {
      for (let j = i + 1; j < topicList.length; j++) {
        const similarity = calculateTopicSimilarity(topicList[i], topicList[j])
        if (similarity >= threshold) {
          pairs.push({ i, j, similarity })
        }
      }
    }

    pairs.sort((a, b) => b.similarity - a.similarity)

    // 合并最相似的主题对
    const merged = new Set<number>()

    for (const pair of pairs) {
      if (merged.has(pair.i) || merged.has(pair.j)) continue

      // 找到较大的作为父主题
      const parent = topicList[pair.i].entryCount >= topicList[pair.j].entryCount
        ? topicList[pair.i]
        : topicList[pair.j]
      const child = topicList[pair.i].entryCount < topicList[pair.j].entryCount
        ? topicList[pair.i]
        : topicList[pair.j]

      child.parentId = parent.id
      parent.children = [...parent.children, child]

      merged.add(pair.i)
      merged.add(pair.j)
    }
  }

  /** 计算主题间相似度 */
  function calculateTopicSimilarity(a: Topic, b: Topic): number {
    const setA = new Set(a.keywords)
    const setB = new Set(b.keywords)

    const intersection = new Set([...setA].filter(x => setB.has(x)))
    const union = new Set([...setA, ...setB])

    if (union.size === 0) return 0
    return intersection.size / union.size
  }

  // ============================================================
  // 趋势分析
  // ============================================================

  /** 更新主题趋势 */
  function updateTrends(): void {
    const now = Date.now()
    const periods = generateTimePeriods(now, 7) // 最近7天

    const newTrends: TopicTrend[] = topics.value.map(topic => {
      const topicEntries = entries.value.filter(e => topic.entryIds.includes(e.id))

      const trendPeriods: TopicTrendPeriod[] = periods.map(period => {
        const periodEntries = topicEntries.filter(
          e => e.timestamp >= period.startTime && e.timestamp < period.endTime,
        )
        return {
          label: period.label,
          startTime: period.startTime,
          endTime: period.endTime,
          frequency: periodEntries.length,
          intensity: periodEntries.length / Math.max(1, period.duration / (24 * 60 * 60 * 1000)),
        }
      })

      const direction = calculateTrendDirection(trendPeriods)

      return {
        topicId: topic.id,
        topicName: topic.name,
        periods: trendPeriods,
        direction,
        changeRate: calculateChangeRate(trendPeriods),
      }
    })

    trends.value = newTrends
  }

  /** 生成时间段 */
  function generateTimePeriods(now: number, days: number): Array<{ label: string; startTime: number; endTime: number; duration: number }> {
    const periods: Array<{ label: string; startTime: number; endTime: number; duration: number }> = []
    const dayMs = 24 * 60 * 60 * 1000

    for (let i = days - 1; i >= 0; i--) {
      const start = now - (i + 1) * dayMs
      const end = now - i * dayMs
      periods.push({
        label: formatDateLabel(new Date(start)),
        startTime: start,
        endTime: end,
        duration: dayMs,
      })
    }

    return periods
  }

  /** 计算趋势方向 */
  function calculateTrendDirection(periods: TopicTrendPeriod[]): TopicTrend['direction'] {
    if (periods.length < 2) return 'stable'

    const recent = periods.slice(-3)
    const older = periods.slice(0, -3)

    const recentAvg = recent.length > 0
      ? recent.reduce((s, p) => s + p.frequency, 0) / recent.length
      : 0
    const olderAvg = older.length > 0
      ? older.reduce((s, p) => s + p.frequency, 0) / older.length
      : recentAvg

    if (olderAvg === 0 && recentAvg > 0) return 'new'
    if (recentAvg === 0 && olderAvg > 0) return 'fading'
    if (recentAvg > olderAvg * 1.2) return 'rising'
    if (recentAvg < olderAvg * 0.8) return 'falling'
    return 'stable'
  }

  /** 计算变化率 */
  function calculateChangeRate(periods: TopicTrendPeriod[]): number {
    if (periods.length < 2) return 0

    const first = periods[0].frequency
    const last = periods[periods.length - 1].frequency

    if (first === 0) return last > 0 ? 1 : 0
    return Math.round(((last - first) / first) * 100) / 100
  }

  // ============================================================
  // 主题搜索
  // ============================================================

  /** 搜索主题 */
  function searchTopics(query: string): TopicSearchResult[] {
    if (!query.trim()) return []

    const queryTokens = tokenizeChinese(query, 1, clusteringConfig.value.stopWords)
    if (queryTokens.length === 0) return []

    const results: TopicSearchResult[] = []

    for (const topic of topics.value) {
      // 计算关键词匹配度
      const matchCount = queryTokens.filter(qt =>
        topic.keywords.some(kw => kw.includes(qt) || qt.includes(kw)),
      ).length

      if (matchCount === 0) continue

      const relevanceScore = matchCount / Math.max(queryTokens.length, topic.keywords.length)
      const topicEntries = entries.value.filter(e => topic.entryIds.includes(e.id))

      results.push({
        topic,
        entries: topicEntries,
        relevanceScore: Math.round(relevanceScore * 100) / 100,
      })
    }

    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /** 按关键词搜索条目 */
  function searchEntries(keyword: string): TopicDialogueEntry[] {
    return entries.value.filter(e => e.text.includes(keyword))
  }

  // ============================================================
  // 摘要生成
  // ============================================================

  /** 生成主题摘要 */
  function generateSummary(): TopicSummary {
    const now = Date.now()
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000

    const active = topics.value.filter(t => t.lastSeen >= weekAgo)
    const emerging = active.filter(t => t.firstSeen >= weekAgo && t.entryCount >= 2)
    const fading = topics.value.filter(t => t.lastSeen < weekAgo)
    const hot = [...active].sort((a, b) => b.strength - a.strength).slice(0, 5)

    return {
      totalTopics: topics.value.length,
      activeTopics: active.length,
      emergingTopics: emerging,
      fadingTopics: fading,
      hotTopics: hot,
      generatedAt: now,
    }
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 更新配置 */
  function updateConfig(update: Partial<TopicClusteringConfig>): void {
    clusteringConfig.value = { ...clusteringConfig.value, ...update }
  }

  /** 重置 */
  function reset(): void {
    entries.value = []
    topics.value = []
    trends.value = []
    lastClusteredAt.value = null
  }

  return {
    // 配置
    clusteringConfig,
    updateConfig,

    // 状态
    entries,
    topics,
    trends,
    lastClusteredAt,

    // 派生状态
    topicCount,
    activeTopics,
    hotTopics,
    topKeywords,

    // 条目管理
    addEntry,
    addEntries,
    removeEntry,
    clearEntries,

    // 聚类分析
    cluster,

    // 趋势分析
    updateTrends,

    // 搜索
    searchTopics,
    searchEntries,

    // 摘要
    generateSummary,

    // 生命周期
    reset,

    // 常量
    DEFAULT_TOPIC_CONFIG,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 格式化日期标签 */
function formatDateLabel(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}/${day}`
}