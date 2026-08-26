// ============================================================
// 自律工坊 · 习惯关联分析（P18-2）
// 习惯间关联发现、互补/冲突分析、关联网络、时间序列交叉分析
// ============================================================

import type { Habit } from './types'
import { HABIT_DIFFICULTY_META } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 关联类型 */
export type CorrelationType = 'complementary' | 'sequential' | 'conflicting' | 'synergistic' | 'independent'

/** 习惯关联 */
export interface HabitCorrelation {
  /** 习惯 A ID */
  habitA: string
  /** 习惯 A 名称 */
  habitAName: string
  /** 习惯 B ID */
  habitB: string
  /** 习惯 B 名称 */
  habitBName: string
  /** 关联类型 */
  type: CorrelationType
  /** 关联强度 0-1 */
  strength: number
  /** 关联描述 */
  description: string
  /** 共同完成率 */
  coCompletionRate: number
  /** 时间间隔（分钟），sequential 时有意义 */
  avgTimeGap?: number
  /** 关联证据 */
  evidence: string[]
  /** 建议 */
  suggestion: string
}

/** 关联网络节点 */
export interface CorrelationNode {
  habitId: string
  habitName: string
  /** 连接的节点 ID */
  connections: string[]
  /** 节点权重 */
  weight: number
  /** 节点聚类 */
  cluster: number
  /** 中心度 */
  centrality: number
}

/** 关联网络 */
export interface CorrelationNetwork {
  /** 节点 */
  nodes: CorrelationNode[]
  /** 关联 */
  correlations: HabitCorrelation[]
  /** 聚类 */
  clusters: HabitCluster[]
  /** 网络密度 */
  density: number
  /** 平均聚类系数 */
  avgClusteringCoefficient: number
}

/** 习惯聚类 */
export interface HabitCluster {
  id: number
  name: string
  /** 聚类中的习惯 */
  habitIds: string[]
  /** 聚类特征 */
  characteristics: string[]
  /** 聚类内关联强度 */
  internalStrength: number
}

/** 时间交叉分析 */
export interface TimeCrossAnalysis {
  /** 习惯 A */
  habitA: string
  /** 习惯 B */
  habitB: string
  /** 时序对比 */
  comparison: TimeCrossPoint[]
  /** 领先/滞后关系 */
  leadLag: LeadLagResult
  /** 相关性系数 */
  correlationCoefficient: number
  /** 总结 */
  summary: string
}

/** 时间交叉点 */
export interface TimeCrossPoint {
  /** 日期 */
  date: string
  /** 习惯 A 完成（0/1） */
  habitACompleted: number
  /** 习惯 B 完成（0/1） */
  habitBCompleted: number
  /** 两者都完成（0/1） */
  bothCompleted: number
}

/** 领先/滞后结果 */
export interface LeadLagResult {
  /** 领先方 */
  leader: string | null
  /** 滞后方 */
  lagger: string | null
  /** 最大相关系数 */
  maxCorrelation: number
  /** 最优滞后天数 */
  optimalLag: number
  /** 描述 */
  description: string
}

/** 关联分析配置 */
export interface CorrelationConfig {
  /** 最小共现次数 */
  minCoOccurrence: number
  /** 关联强度阈值 */
  strengthThreshold: number
  /** 最大滞后天数 */
  maxLagDays: number
}

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: CorrelationConfig = {
  minCoOccurrence: 3,
  strengthThreshold: 0.3,
  maxLagDays: 14,
}

// 关联类型元数据
const CORRELATION_TYPE_META: Record<CorrelationType, { label: string; icon: string; color: string }> = {
  complementary: { label: '互补', icon: '🔄', color: '#2ecc71' },
  sequential: { label: '顺序', icon: '➡️', color: '#3498db' },
  conflicting: { label: '冲突', icon: '⚠️', color: '#e74c3c' },
  synergistic: { label: '协同', icon: '✨', color: '#9b59b6' },
  independent: { label: '独立', icon: '🔹', color: '#95a5a6' },
}

// ============================================================
// useHabitCorrelation
// ============================================================

export function useHabitCorrelation() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<CorrelationConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 关联发现 ----

  /**
   * 分析所有习惯之间的关联
   */
  function analyzeCorrelations(habits: Habit[]): HabitCorrelation[] {
    const active = habits.filter(h => h.enabled)
    const correlations: HabitCorrelation[] = []

    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        const correlation = analyzePair(active[i], active[j])
        if (correlation && correlation.strength >= config.strengthThreshold) {
          correlations.push(correlation)
        }
      }
    }

    return correlations.sort((a, b) => b.strength - a.strength)
  }

  /**
   * 分析两个习惯之间的关联
   */
  function analyzePair(habitA: Habit, habitB: Habit): HabitCorrelation | null {
    const datesA = new Set(habitA.completedDates)
    const datesB = new Set(habitB.completedDates)

    // 共同完成日期
    const coDates = [...datesA].filter(d => datesB.has(d)).sort()
    const coCount = coDates.length

    if (coCount < config.minCoOccurrence) {
      // 检查是否有明显的互斥
      const onlyA = [...datesA].filter(d => !datesB.has(d)).length
      const onlyB = [...datesB].filter(d => !datesA.has(d)).length
      const total = onlyA + onlyB + coCount

      if (total > 0 && coCount / total < 0.1 && onlyA + onlyB > 5) {
        return {
          habitA: habitA.id,
          habitAName: habitA.title,
          habitB: habitB.id,
          habitBName: habitB.title,
          type: 'conflicting',
          strength: 0.3,
          description: `「${habitA.title}」和「${habitB.title}」似乎存在冲突，很少在同一天完成`,
          coCompletionRate: 0,
          evidence: [`共 ${onlyA} 天仅完成 A，${onlyB} 天仅完成 B，仅 ${coCount} 天同时完成`],
          suggestion: '考虑将这两个习惯安排在不同时间，或评估是否过多',
        }
      }
      return null
    }

    // 计算共完成率
    const totalDays = new Set([...datesA, ...datesB]).size
    const coCompletionRate = coCount / totalDays

    // 计算时间间隔
    let avgTimeGap: number | undefined
    const sortedDates = [...new Set([...datesA, ...datesB])].sort()
    const gaps: number[] = []
    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1])
      const curr = new Date(sortedDates[i])
      gaps.push(Math.round((curr.getTime() - prev.getTime()) / 60000))
    }
    avgTimeGap = gaps.length > 0 ? Math.round(gaps.reduce((s, g) => s + g, 0) / gaps.length) : 0

    // 确定关联类型
    const type = determineCorrelationType(habitA, habitB, coCompletionRate, avgTimeGap)
    const strength = calculateCorrelationStrength(habitA, habitB, coCount, totalDays)
    const evidence = collectEvidence(habitA, habitB, coCount, coCompletionRate, avgTimeGap)
    const suggestion = generateCorrelationSuggestion(type, habitA, habitB, coCompletionRate)

    return {
      habitA: habitA.id,
      habitAName: habitA.title,
      habitB: habitB.id,
      habitBName: habitB.title,
      type,
      strength: Math.round(strength * 100) / 100,
      description: generateCorrelationDescription(type, habitA.title, habitB.title, coCompletionRate),
      coCompletionRate: Math.round(coCompletionRate * 100) / 100,
      avgTimeGap,
      evidence,
      suggestion,
    }
  }

  // ---- 关联网络 ----

  /**
   * 构建关联网络
   */
  function buildNetwork(habits: Habit[]): CorrelationNetwork {
    const correlations = analyzeCorrelations(habits)
    const active = habits.filter(h => h.enabled)

    // 构建节点
    const nodeMap = new Map<string, CorrelationNode>()
    for (const h of active) {
      nodeMap.set(h.id, {
        habitId: h.id,
        habitName: h.title,
        connections: [],
        weight: h.totalCompleted,
        cluster: 0,
        centrality: 0,
      })
    }

    // 更新连接
    for (const c of correlations) {
      const nodeA = nodeMap.get(c.habitA)
      const nodeB = nodeMap.get(c.habitB)
      if (nodeA && nodeB) {
        nodeA.connections.push(c.habitB)
        nodeB.connections.push(c.habitA)
      }
    }

    const nodes = [...nodeMap.values()]

    // 计算中心度
    for (const node of nodes) {
      node.centrality = node.connections.length > 0
        ? Math.round((node.connections.length / (nodes.length - 1)) * 100) / 100
        : 0
    }

    // 简单聚类
    const clusters = detectClusters(nodes, correlations)

    // 分配聚类
    for (const node of nodes) {
      const cluster = clusters.find(c => c.habitIds.includes(node.habitId))
      node.cluster = cluster ? cluster.id : -1
    }

    const density = nodes.length > 1
      ? Math.round((correlations.length * 2 / (nodes.length * (nodes.length - 1))) * 100) / 100
      : 0

    const avgClusteringCoefficient = computeAvgClusteringCoefficient(nodes, correlations)

    return {
      nodes: nodes.sort((a, b) => b.centrality - a.centrality),
      correlations,
      clusters,
      density,
      avgClusteringCoefficient: Math.round(avgClusteringCoefficient * 100) / 100,
    }
  }

  // ---- 时间交叉分析 ----

  /**
   * 时序交叉分析
   */
  function analyzeTimeCross(habits: Habit[], habitAId: string, habitBId: string): TimeCrossAnalysis | null {
    const habitA = habits.find(h => h.id === habitAId)
    const habitB = habits.find(h => h.id === habitBId)
    if (!habitA || !habitB) return null

    const allDates = new Set([...habitA.completedDates, ...habitB.completedDates])
    const sortedDates = [...allDates].sort()

    const comparison: TimeCrossPoint[] = sortedDates.map(date => ({
      date,
      habitACompleted: habitA.completedDates.includes(date) ? 1 : 0,
      habitBCompleted: habitB.completedDates.includes(date) ? 1 : 0,
      bothCompleted: habitA.completedDates.includes(date) && habitB.completedDates.includes(date) ? 1 : 0,
    }))

    // 计算相关系数
    const correlationCoefficient = calculatePearsonCorrelation(
      comparison.map(p => p.habitACompleted),
      comparison.map(p => p.habitBCompleted),
    )

    // 领先/滞后分析
    const leadLag = analyzeLeadLag(habitA.completedDates, habitB.completedDates, habitA.title, habitB.title)

    const summary = generateTimeCrossSummary(habitA.title, habitB.title, correlationCoefficient, leadLag)

    return {
      habitA: habitA.title,
      habitB: habitB.title,
      comparison,
      leadLag,
      correlationCoefficient: Math.round(correlationCoefficient * 100) / 100,
      summary,
    }
  }

  // ---- 习惯建议 ----

  /**
   * 基于关联分析生成习惯建议
   */
  function generateRecommendations(correlations: HabitCorrelation[]): string[] {
    const recommendations: string[] = []

    const complementary = correlations.filter(c => c.type === 'complementary')
    const conflicting = correlations.filter(c => c.type === 'conflicting')
    const sequential = correlations.filter(c => c.type === 'sequential')

    if (complementary.length > 0) {
      recommendations.push(`发现 ${complementary.length} 对互补习惯，建议将它们安排在相邻时段完成`)
    }

    if (sequential.length > 0) {
      const top = sequential[0]
      recommendations.push(`「${top.habitAName}」→「${top.habitBName}」存在顺序关系，建议先完成后者的准备`)
    }

    if (conflicting.length > 0) {
      recommendations.push(`发现 ${conflicting.length} 对冲突习惯，建议分散到不同时段或日期`)
    }

    return recommendations
  }

  // ============================================================
  // 辅助函数
  // ============================================================

  function determineCorrelationType(
    habitA: Habit,
    habitB: Habit,
    coCompletionRate: number,
    avgTimeGap: number,
  ): CorrelationType {
    // 高度共现 → 协同
    if (coCompletionRate > 0.7) return 'synergistic'

    // 中等共现 + 时间间隔短 → 互补
    if (coCompletionRate > 0.4 && avgTimeGap < 1440) return 'complementary'

    // 低共现 → 独立
    if (coCompletionRate < 0.2) return 'independent'

    // 顺序关系（A完成后B通常也在同一天完成）
    const datesA = new Set(habitA.completedDates)
    const datesB = new Set(habitB.completedDates)
    const aFirst = [...datesA].filter(d => {
      const idx = [...datesB].sort().indexOf(d)
      return idx > 0
    })
    if (aFirst.length > 3) return 'sequential'

    return 'independent'
  }

  function calculateCorrelationStrength(
    habitA: Habit,
    habitB: Habit,
    coCount: number,
    totalDays: number,
  ): number {
    const jaccard = coCount / totalDays

    // 考虑难度权重
    const diffA = HABIT_DIFFICULTY_META[habitA.difficulty]?.basePoints ?? 1
    const diffB = HABIT_DIFFICULTY_META[habitB.difficulty]?.basePoints ?? 1
    const diffFactor = Math.min(2, (diffA + diffB) / 2)

    return Math.min(1, jaccard * diffFactor * 1.5)
  }

  function collectEvidence(
    _habitA: Habit,
    _habitB: Habit,
    coCount: number,
    coCompletionRate: number,
    avgTimeGap: number,
  ): string[] {
    const evidence: string[] = []
    evidence.push(`共 ${coCount} 天同时完成`)
    evidence.push(`共完成率 ${Math.round(coCompletionRate * 100)}%`)
    if (avgTimeGap) {
      evidence.push(`平均间隔 ${avgTimeGap} 分钟`)
    }
    return evidence
  }

  function generateCorrelationDescription(
    type: CorrelationType,
    nameA: string,
    nameB: string,
    coCompletionRate: number,
  ): string {
    const rate = Math.round(coCompletionRate * 100)
    switch (type) {
      case 'complementary':
        return `「${nameA}」和「${nameB}」经常在同一天完成，形成互补关系（共完成率 ${rate}%）`
      case 'sequential':
        return `「${nameA}」完成后通常会带动「${nameB}」的完成，存在顺序关系`
      case 'synergistic':
        return `「${nameA}」和「${nameB}」高度协同，几乎总是一起完成（共完成率 ${rate}%）`
      case 'conflicting':
        return `「${nameA}」和「${nameB}」存在冲突，很少在同一天完成`
      default:
        return `「${nameA}」和「${nameB}」之间没有明显的关联`
    }
  }

  function generateCorrelationSuggestion(
    type: CorrelationType,
    habitA: Habit,
    habitB: Habit,
    _coCompletionRate: number,
  ): string {
    switch (type) {
      case 'complementary':
        return `建议将「${habitA.title}」和「${habitB.title}」安排在相邻时段，互相促进`
      case 'sequential':
        return `先完成「${habitA.title}」可以为「${habitB.title}」创造良好条件`
      case 'synergistic':
        return `继续保持这两个习惯的同步节奏，它们形成了良好的习惯组合`
      case 'conflicting':
        return `考虑将「${habitA.title}」和「${habitB.title}」分散到不同时段，避免冲突`
      default:
        return '这两个习惯可以独立安排，无需特别协调'
    }
  }

  function detectClusters(nodes: CorrelationNode[], correlations: HabitCorrelation[]): HabitCluster[] {
    const visited = new Set<string>()
    const clusters: HabitCluster[] = []

    for (const node of nodes) {
      if (visited.has(node.habitId)) continue
      if (node.connections.length === 0) continue

      const clusterIds: string[] = []
      const queue = [node.habitId]
      visited.add(node.habitId)

      while (queue.length > 0) {
        const current = queue.shift()!
        clusterIds.push(current)

        const currentNode = nodes.find(n => n.habitId === current)
        if (currentNode) {
          for (const conn of currentNode.connections) {
            if (!visited.has(conn)) {
              visited.add(conn)
              queue.push(conn)
            }
          }
        }
      }

      if (clusterIds.length >= 2) {
        const clusterNodes = nodes.filter(n => clusterIds.includes(n.habitId))
        const internalStrength = clusterIds.length > 1
          ? correlations.filter(c => clusterIds.includes(c.habitA) && clusterIds.includes(c.habitB)).length
            / (clusterIds.length * (clusterIds.length - 1) / 2)
          : 0

        clusters.push({
          id: clusters.length + 1,
          name: `${clusterNodes.map(n => n.habitName).slice(0, 3).join('、')}等`,
          habitIds: clusterIds,
          characteristics: clusterIds.length >= 3 ? ['习惯组合', '高度关联'] : ['习惯配对'],
          internalStrength: Math.round(internalStrength * 100) / 100,
        })
      }
    }

    return clusters
  }

  function computeAvgClusteringCoefficient(
    nodes: CorrelationNode[],
    correlations: HabitCorrelation[],
  ): number {
    if (nodes.length < 2) return 0

    let totalCoeff = 0
    let validNodes = 0

    for (const node of nodes) {
      const neighbors = node.connections
      if (neighbors.length < 2) continue

      let edgeCount = 0
      for (let i = 0; i < neighbors.length; i++) {
        for (let j = i + 1; j < neighbors.length; j++) {
          const hasEdge = correlations.some(
            c => (c.habitA === neighbors[i] && c.habitB === neighbors[j]) ||
                 (c.habitA === neighbors[j] && c.habitB === neighbors[i]),
          )
          if (hasEdge) edgeCount++
        }
      }

      const possible = neighbors.length * (neighbors.length - 1) / 2
      totalCoeff += edgeCount / possible
      validNodes++
    }

    return validNodes > 0 ? totalCoeff / validNodes : 0
  }

  function calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length < 3) return 0

    const n = x.length
    const meanX = x.reduce((s, v) => s + v, 0) / n
    const meanY = y.reduce((s, v) => s + v, 0) / n

    let num = 0, denX = 0, denY = 0
    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX
      const dy = y[i] - meanY
      num += dx * dy
      denX += dx * dx
      denY += dy * dy
    }

    return num / (Math.sqrt(denX) * Math.sqrt(denY) || 1)
  }

  function analyzeLeadLag(
    datesA: string[],
    datesB: string[],
    nameA: string,
    nameB: string,
  ): LeadLagResult {
    const sortedA = [...datesA].sort()
    const sortedB = [...datesB].sort()

    let maxCorrelation = 0
    let optimalLag = 0
    let leader: string | null = null
    let lagger: string | null = null

    for (let lag = -config.maxLagDays; lag <= config.maxLagDays; lag++) {
      let matchCount = 0
      let total = 0

      for (const dateA of sortedA) {
        const a = new Date(dateA)
        const shifted = new Date(a.getTime() + lag * 86400000)
        const shiftedStr = shifted.toISOString().split('T')[0]
        if (sortedB.includes(shiftedStr)) matchCount++
        total++
      }

      const corr = total > 0 ? matchCount / total : 0
      if (corr > maxCorrelation) {
        maxCorrelation = corr
        optimalLag = lag
        leader = lag > 0 ? nameA : nameB
        lagger = lag > 0 ? nameB : nameA
      }
    }

    let description = '未检测到明显的领先/滞后关系'
    if (maxCorrelation > 0.3 && leader && lagger) {
      const absLag = Math.abs(optimalLag)
      if (absLag === 0) {
        description = `「${nameA}」和「${nameB}」同步完成，没有领先/滞后关系`
      } else {
        description = `「${leader}」领先「${lagger}」约 ${absLag} 天`
      }
    }

    return {
      leader: maxCorrelation > 0.3 ? leader : null,
      lagger: maxCorrelation > 0.3 ? lagger : null,
      maxCorrelation: Math.round(maxCorrelation * 100) / 100,
      optimalLag,
      description,
    }
  }

  function generateTimeCrossSummary(
    nameA: string,
    nameB: string,
    correlation: number,
    leadLag: LeadLagResult,
  ): string {
    const parts: string[] = []

    if (correlation > 0.5) {
      parts.push(`「${nameA}」和「${nameB}」高度相关（r=${correlation}）`)
    } else if (correlation > 0.3) {
      parts.push(`「${nameA}」和「${nameB}」中度相关（r=${correlation}）`)
    } else {
      parts.push(`「${nameA}」和「${nameB}」弱相关（r=${correlation}）`)
    }

    if (leadLag.leader) {
      parts.push(leadLag.description)
    }

    return parts.join('。')
  }

  return {
    config,
    setConfig,
    analyzeCorrelations,
    analyzePair,
    buildNetwork,
    analyzeTimeCross,
    generateRecommendations,
    CORRELATION_TYPE_META,
  }
}