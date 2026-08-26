// ============================================================
// 阅览殿 · 阅读洞察引擎
// 阅读分析、知识图谱、阅读计划、书单推荐
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { Book, ReadingSession } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 阅读分析 */
export interface ReadingAnalytics {
  /** 总阅读书籍数 */
  totalBooks: number
  /** 总阅读页数 */
  totalPages: number
  /** 总阅读时间（分钟） */
  totalReadingTime: number
  /** 平均阅读速度（页/分钟） */
  avgReadingSpeed: number
  /** 本月阅读时间 */
  monthlyReadingTime: number
  /** 本月阅读书籍数 */
  monthlyBooks: number
  /** 阅读偏好标签 */
  topTags: { tag: string; count: number }[]
  /** 阅读时段分布 */
  timeDistribution: { hour: number; count: number }[]
  /** 月度阅读趋势 */
  monthlyTrend: { month: string; pages: number; books: number }[]
  /** 连续阅读天数 */
  streak: number
  /** 最佳阅读日 */
  bestReadingDay: string
}

/** 知识图谱节点 */
export interface KnowledgeNode {
  id: string
  label: string
  /** 来源书籍 */
  sourceBookId: string
  /** 来源书籍名 */
  sourceBookName: string
  /** 摘录/笔记内容 */
  content: string
  /** 节点类型 */
  type: 'concept' | 'fact' | 'insight' | 'question' | 'connection'
  /** 关联节点 */
  connections: string[]
}

/** 阅读计划 */
export interface ReadingPlan {
  id: string
  name: string
  description: string
  /** 计划书籍 */
  books: string[]
  /** 目标完成日期 */
  targetDate: string
  /** 创建时间 */
  createdAt: string
  /** 完成状态 */
  completed: boolean
}

/** 月度阅读目标 */
export interface MonthlyReadingGoal {
  month: string
  targetPages: number
  targetBooks: number
  actualPages: number
  actualBooks: number
}

/** 存储键 */
const READING_ANALYTICS_KEY = 'hf:reading:analytics'
const KNOWLEDGE_NODES_KEY = 'hf:reading:knowledge_nodes'
const READING_PLANS_KEY = 'hf:reading:plans'

// ============================================================
// 阅读洞察引擎
// ============================================================

export function useReadingInsights() {
  const analytics = ref<ReadingAnalytics>(loadAnalytics())
  const knowledgeNodes = ref<KnowledgeNode[]>(loadKnowledgeNodes())
  const readingPlans = ref<ReadingPlan[]>(loadPlans())

  // ---- 持久化 ----

  function loadAnalytics(): ReadingAnalytics {
    try {
      const raw = storage.getKV<string>(READING_ANALYTICS_KEY, '')
      if (!raw) return createDefaultAnalytics()
      return JSON.parse(raw)
    } catch { return createDefaultAnalytics() }
  }

  function saveAnalytics() {
    storage.setKV(READING_ANALYTICS_KEY, JSON.stringify(analytics.value))
  }

  function loadKnowledgeNodes(): KnowledgeNode[] {
    try {
      const raw = storage.getKV<string>(KNOWLEDGE_NODES_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveKnowledgeNodes() {
    storage.setKV(KNOWLEDGE_NODES_KEY, JSON.stringify(knowledgeNodes.value))
  }

  function loadPlans(): ReadingPlan[] {
    try {
      const raw = storage.getKV<string>(READING_PLANS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function savePlans() {
    storage.setKV(READING_PLANS_KEY, JSON.stringify(readingPlans.value))
  }

  function createDefaultAnalytics(): ReadingAnalytics {
    return {
      totalBooks: 0,
      totalPages: 0,
      totalReadingTime: 0,
      avgReadingSpeed: 0,
      monthlyReadingTime: 0,
      monthlyBooks: 0,
      topTags: [],
      timeDistribution: [],
      monthlyTrend: [],
      streak: 0,
      bestReadingDay: '',
    }
  }

  // ---- 阅读分析 ----

  /** 更新阅读分析 */
  function updateAnalytics(books: Book[], sessions: ReadingSession[]) {
    const a = analytics.value
    a.totalBooks = books.length
    a.totalPages = books.reduce((sum, b) => sum + b.currentPage, 0)
    a.totalReadingTime = books.reduce((sum, b) => sum + b.totalReadingTime, 0)

    // 平均阅读速度
    const finishedBooks = books.filter(b => b.status === 'finished' && b.totalReadingTime > 0)
    a.avgReadingSpeed = finishedBooks.length > 0
      ? Math.round(finishedBooks.reduce((sum, b) => sum + b.totalPages / b.totalReadingTime, 0) / finishedBooks.length * 100) / 100
      : 0

    // 本月统计
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthBooks = books.filter(b => b.finishDate && b.finishDate >= monthStart)
    a.monthlyBooks = monthBooks.length
    a.monthlyReadingTime = monthBooks.reduce((sum, b) => sum + b.totalReadingTime, 0)

    // 标签分布
    const tagMap = new Map<string, number>()
    for (const book of books) {
      for (const tag of book.tags) {
        tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
      }
    }
    a.topTags = [...tagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((x, y) => y.count - x.count)
      .slice(0, 10)

    // 阅读时段分布
    const hourMap = new Map<number, number>()
    for (const session of sessions) {
      const hour = new Date(session.timestamp).getHours()
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1)
    }
    a.timeDistribution = [...hourMap.entries()]
      .map(([hour, count]) => ({ hour, count }))
      .sort((x, y) => x.hour - y.hour)

    // 月度趋势（最近12个月）
    const monthlyMap = new Map<string, { pages: number; books: Set<string> }>()
    for (const book of books) {
      if (!book.finishDate) continue
      const month = book.finishDate.slice(0, 7)
      const entry = monthlyMap.get(month) || { pages: 0, books: new Set() }
      entry.pages += book.totalPages
      entry.books.add(book.id)
      monthlyMap.set(month, entry)
    }
    a.monthlyTrend = [...monthlyMap.entries()]
      .map(([month, data]) => ({ month, pages: data.pages, books: data.books.size }))
      .sort((x, y) => x.month.localeCompare(y.month))
      .slice(-12)

    saveAnalytics()
  }

  /** 获取阅读偏好摘要 */
  const readingPreferences = computed(() => {
    return {
      topTags: analytics.value.topTags.slice(0, 5),
      preferredTime: getPreferredReadingTime(analytics.value.timeDistribution),
      avgSpeed: analytics.value.avgReadingSpeed,
      activeStreak: analytics.value.streak,
    }
  })

  // ---- 知识图谱 ----

  /** 添加知识节点 */
  function addKnowledgeNode(
    label: string,
    content: string,
    sourceBookId: string,
    sourceBookName: string,
    type: KnowledgeNode['type'] = 'insight'
  ): KnowledgeNode {
    const node: KnowledgeNode = {
      id: `kn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label,
      sourceBookId,
      sourceBookName,
      content,
      type,
      connections: [],
    }
    knowledgeNodes.value.push(node)
    saveKnowledgeNodes()
    return node
  }

  /** 连接两个知识节点 */
  function connectNodes(nodeIdA: string, nodeIdB: string): boolean {
    const nodeA = knowledgeNodes.value.find(n => n.id === nodeIdA)
    const nodeB = knowledgeNodes.value.find(n => n.id === nodeIdB)
    if (!nodeA || !nodeB) return false
    if (!nodeA.connections.includes(nodeIdB)) nodeA.connections.push(nodeIdB)
    if (!nodeB.connections.includes(nodeIdA)) nodeB.connections.push(nodeIdA)
    saveKnowledgeNodes()
    return true
  }

  /** 按类型获取知识节点 */
  function getNodesByType(type: KnowledgeNode['type']): KnowledgeNode[] {
    return knowledgeNodes.value.filter(n => n.type === type)
  }

  /** 获取来源书籍的所有知识节点 */
  function getNodesByBook(bookId: string): KnowledgeNode[] {
    return knowledgeNodes.value.filter(n => n.sourceBookId === bookId)
  }

  /** 知识图谱统计 */
  const knowledgeStats = computed(() => {
    const nodes = knowledgeNodes.value
    const byType: Record<string, number> = {}
    for (const n of nodes) {
      byType[n.type] = (byType[n.type] ?? 0) + 1
    }
    const totalConnections = nodes.reduce((sum, n) => sum + n.connections.length, 0) / 2
    return {
      totalNodes: nodes.length,
      byType: byType as Record<KnowledgeNode['type'], number>,
      totalConnections,
      avgConnections: nodes.length > 0 ? Math.round(totalConnections / nodes.length * 10) / 10 : 0,
    }
  })

  // ---- 阅读计划 ----

  /** 创建阅读计划 */
  function createReadingPlan(name: string, description: string, books: string[], targetDate: string): ReadingPlan {
    const plan: ReadingPlan = {
      id: `plan_${Date.now()}`,
      name,
      description,
      books,
      targetDate,
      createdAt: new Date().toISOString(),
      completed: false,
    }
    readingPlans.value.push(plan)
    savePlans()
    return plan
  }

  /** 完成阅读计划 */
  function completePlan(planId: string): boolean {
    const plan = readingPlans.value.find(p => p.id === planId)
    if (!plan) return false
    plan.completed = true
    savePlans()
    return true
  }

  /** 获取进行中的计划 */
  const activePlans = computed(() => {
    return readingPlans.value.filter(p => !p.completed)
  })

  return {
    // 状态
    analytics,
    knowledgeNodes,
    readingPlans,

    // 计算属性
    readingPreferences,
    knowledgeStats,
    activePlans,

    // 分析
    updateAnalytics,

    // 知识图谱
    addKnowledgeNode,
    connectNodes,
    getNodesByType,
    getNodesByBook,

    // 阅读计划
    createReadingPlan,
    completePlan,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function getPreferredReadingTime(
  timeDistribution: { hour: number; count: number }[]
): { hour: number; label: string } {
  if (timeDistribution.length === 0) return { hour: 0, label: '暂无数据' }
  const best = timeDistribution.reduce((max, cur) => cur.count > max.count ? cur : max)
  const hour = best.hour
  let label: string
  if (hour >= 5 && hour < 8) label = '清晨'
  else if (hour >= 8 && hour < 12) label = '上午'
  else if (hour >= 12 && hour < 14) label = '午间'
  else if (hour >= 14 && hour < 18) label = '下午'
  else if (hour >= 18 && hour < 22) label = '晚间'
  else label = '深夜'
  return { hour, label }
}