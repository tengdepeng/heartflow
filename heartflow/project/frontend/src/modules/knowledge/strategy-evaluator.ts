// ============================================================
// 经略阁 · 策略评估引擎（P18-6）
// 多维度策略评分、对比分析、SWOT、推荐排序
// ============================================================

import type { KnowledgeNode } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 评估维度 */
export type EvalDimension = 'feasibility' | 'impact' | 'cost' | 'risk' | 'timeline' | 'sustainability' | 'alignment'

/** 维度权重 */
export type DimensionWeights = Record<EvalDimension, number>

/** 单维度评分 */
export interface DimensionScore {
  dimension: EvalDimension
  score: number
  weight: number
  weighted: number
  label: string
  icon: string
  note: string
}

/** 策略方案 */
export interface StrategyOption {
  id: string
  name: string
  description: string
  /** 关联的知识节点 ID */
  knowledgeNodeIds: string[]
  /** 各维度评分 */
  scores: Partial<Record<EvalDimension, number>>
  /** 自定义备注 */
  notes: Partial<Record<EvalDimension, string>>
  /** 标签 */
  tags: string[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 评估结果 */
export interface EvaluationResult {
  strategyId: string
  strategyName: string
  /** 各维度详细评分 */
  dimensions: DimensionScore[]
  /** 加权总分 */
  totalScore: number
  /** 评估等级 */
  grade: EvalGrade
  /** 评估时间 */
  evaluatedAt: string
}

/** 评估等级 */
export type EvalGrade = 'A' | 'B' | 'C' | 'D' | 'F'

/** 策略对比 */
export interface StrategyComparison {
  /** 参与对比的策略 */
  strategies: EvaluationResult[]
  /** 各维度排名 */
  rankings: Record<EvalDimension, string[]>
  /** 综合排名 */
  overallRanking: string[]
  /** 雷达图数据 */
  radarData: {
    dimensions: string[]
    series: { name: string; values: number[] }[]
  }
  /** 优势矩阵 */
  advantageMatrix: {
    strategyName: string
    strengths: string[]
    weaknesses: string[]
    bestFor: string
  }[]
}

/** SWOT 分析 */
export interface SWOTAnalysis {
  strategyId: string
  strategyName: string
  strengths: SWOTItem[]
  weaknesses: SWOTItem[]
  opportunities: SWOTItem[]
  threats: SWOTItem[]
  /** 综合评分 */
  matrixScore: {
    offensive: number
    defensive: number
    adaptive: number
    survival: number
  }
  /** 建议 */
  recommendations: string[]
}

export interface SWOTItem {
  content: string
  weight: number
  /** 关联的知识节点 ID */
  knowledgeNodeId?: string
}

/** 评估配置 */
export interface EvaluatorConfig {
  /** 默认权重 */
  weights: DimensionWeights
  /** 及格线 */
  passThreshold: number
  /** 优秀线 */
  excellentThreshold: number
}

/** 策略推荐 */
export interface StrategyRecommendation {
  strategyId: string
  strategyName: string
  totalScore: number
  grade: EvalGrade
  rank: number
  /** 推荐理由 */
  reasons: string[]
  /** 适用场景 */
  bestScenarios: string[]
  /** 风险提示 */
  risks: string[]
}

// ============================================================
// 常量
// ============================================================

const DIMENSION_META: Record<EvalDimension, { label: string; icon: string; description: string }> = {
  feasibility: { label: '可行性', icon: '✅', description: '方案是否具备实施条件，资源是否充足' },
  impact: { label: '影响力', icon: '💥', description: '方案产生的效果和影响范围' },
  cost: { label: '成本', icon: '💰', description: '时间、精力、金钱等投入' },
  risk: { label: '风险', icon: '⚠️', description: '失败概率和负面影响' },
  timeline: { label: '时效', icon: '⏱️', description: '达成目标所需时间' },
  sustainability: { label: '持续性', icon: '🔄', description: '方案效果的长期维持能力' },
  alignment: { label: '契合度', icon: '🎯', description: '与个人目标和价值观的匹配程度' },
}

const DEFAULT_WEIGHTS: DimensionWeights = {
  feasibility: 0.15,
  impact: 0.25,
  cost: 0.15,
  risk: 0.15,
  timeline: 0.10,
  sustainability: 0.10,
  alignment: 0.10,
}

const DEFAULT_CONFIG: EvaluatorConfig = {
  weights: { ...DEFAULT_WEIGHTS },
  passThreshold: 6,
  excellentThreshold: 8,
}

const GRADE_THRESHOLDS: { grade: EvalGrade; min: number; label: string; color: string }[] = [
  { grade: 'A', min: 8.5, label: '优秀', color: '#34d399' },
  { grade: 'B', min: 7, label: '良好', color: '#6b9fc4' },
  { grade: 'C', min: 5.5, label: '一般', color: '#f0c040' },
  { grade: 'D', min: 4, label: '较差', color: '#e0a96d' },
  { grade: 'F', min: 0, label: '不建议', color: '#ef4444' },
]

// ============================================================
// useStrategyEvaluator
// ============================================================

export function useStrategyEvaluator() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<EvaluatorConfig>) {
    config = { ...config, ...partial }
    if (partial.weights) {
      config.weights = { ...config.weights, ...partial.weights }
    }
  }

  /** 获取权重配置 */
  function getWeights(): DimensionWeights {
    return { ...config.weights }
  }

  /** 归一化权重（确保总和为 1） */
  function normalizeWeights(weights: DimensionWeights): DimensionWeights {
    const dims = Object.keys(weights) as EvalDimension[]
    const total = dims.reduce((s, d) => s + weights[d], 0)
    if (total === 0) return { ...DEFAULT_WEIGHTS }
    const normalized = { ...weights }
    for (const d of dims) {
      normalized[d] = Math.round(weights[d] / total * 100) / 100
    }
    return normalized
  }

  // ---- 单策略评估 ----

  /**
   * 评估单个策略
   */
  function evaluate(
    strategy: StrategyOption,
    weights?: DimensionWeights,
  ): EvaluationResult {
    const w = weights ? normalizeWeights(weights) : config.weights
    const dimensions: DimensionScore[] = []
    let totalScore = 0

    const dims = Object.keys(DIMENSION_META) as EvalDimension[]
    for (const dim of dims) {
      const score = strategy.scores[dim] ?? 0
      const weight = w[dim]
      const weighted = Math.round(score * weight * 100) / 100
      const meta = DIMENSION_META[dim]

      dimensions.push({
        dimension: dim,
        score,
        weight,
        weighted,
        label: meta.label,
        icon: meta.icon,
        note: strategy.notes[dim] || '',
      })

      totalScore += weighted
    }

    totalScore = Math.round(totalScore * 100) / 100

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      dimensions,
      totalScore,
      grade: getGrade(totalScore),
      evaluatedAt: new Date().toISOString(),
    }
  }

  // ---- 批量评估 ----

  /**
   * 批量评估多个策略
   */
  function evaluateAll(
    strategies: StrategyOption[],
    weights?: DimensionWeights,
  ): EvaluationResult[] {
    return strategies
      .map(s => evaluate(s, weights))
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  // ---- 策略对比 ----

  /**
   * 对比多个策略
   */
  function compare(
    strategies: StrategyOption[],
    weights?: DimensionWeights,
  ): StrategyComparison {
    const results = evaluateAll(strategies, weights)
    const dims = Object.keys(DIMENSION_META) as EvalDimension[]

    // 各维度排名
    const rankings: Record<string, string[]> = {}
    for (const dim of dims) {
      rankings[dim] = [...strategies]
        .sort((a, b) => (b.scores[dim] ?? 0) - (a.scores[dim] ?? 0))
        .map(s => s.id)
    }

    // 雷达图数据
    const radarData = {
      dimensions: dims.map(d => DIMENSION_META[d].label),
      series: results.map(r => ({
        name: r.strategyName,
        values: r.dimensions.map(d => d.score),
      })),
    }

    // 优势矩阵
    const advantageMatrix = results.map(r => {
      const strengths = r.dimensions
        .filter(d => d.score >= 8)
        .map(d => `${d.label}(${d.score}分)${d.note ? ': ' + d.note : ''}`)
      const weaknesses = r.dimensions
        .filter(d => d.score <= 4)
        .map(d => `${d.label}(${d.score}分)${d.note ? ': ' + d.note : ''}`)

      return {
        strategyName: r.strategyName,
        strengths,
        weaknesses,
        bestFor: determineBestScenario(r),
      }
    })

    return {
      strategies: results,
      rankings,
      overallRanking: results.map(r => r.strategyId),
      radarData,
      advantageMatrix,
    }
  }

  // ---- SWOT 分析 ----

  /**
   * 基于知识节点生成 SWOT 分析
   */
  function swotAnalyze(
    strategy: StrategyOption,
    nodes: KnowledgeNode[],
  ): SWOTAnalysis {
    const relatedNodes = nodes.filter(n => strategy.knowledgeNodeIds.includes(n.id))

    const strengths: SWOTItem[] = []
    const weaknesses: SWOTItem[] = []
    const opportunities: SWOTItem[] = []
    const threats: SWOTItem[] = []

    for (const node of relatedNodes) {
      switch (node.cat) {
        case 'insight':
          strengths.push({ content: `洞察: ${node.title}`, weight: 0.8, knowledgeNodeId: node.id })
          opportunities.push({ content: `从「${node.title}」延伸的可能性`, weight: 0.6, knowledgeNodeId: node.id })
          break
        case 'rule':
          strengths.push({ content: `法则支撑: ${node.title}`, weight: 0.7, knowledgeNodeId: node.id })
          break
        case 'concept':
          strengths.push({ content: `概念基础: ${node.title}`, weight: 0.5, knowledgeNodeId: node.id })
          break
        case 'pitfall':
          threats.push({ content: `误区警惕: ${node.title}`, weight: 0.7, knowledgeNodeId: node.id })
          weaknesses.push({ content: `潜在误区: ${node.title}`, weight: 0.6, knowledgeNodeId: node.id })
          break
        case 'frame':
          strengths.push({ content: `框架支撑: ${node.title}`, weight: 0.6, knowledgeNodeId: node.id })
          opportunities.push({ content: `框架扩展: ${node.title} 在更多场景的应用`, weight: 0.5, knowledgeNodeId: node.id })
          break
        case 'metaphor':
          strengths.push({ content: `比喻洞察: ${node.title}`, weight: 0.4, knowledgeNodeId: node.id })
          break
      }
    }

    // 基于评估维度补充
    const result = evaluate(strategy)
    const highDims = result.dimensions.filter(d => d.score >= 7)
    const lowDims = result.dimensions.filter(d => d.score <= 4)

    for (const d of highDims) {
      strengths.push({ content: `${d.label}维度表现优秀(${d.score}分)`, weight: 0.5, knowledgeNodeId: undefined })
    }
    for (const d of lowDims) {
      weaknesses.push({ content: `${d.label}维度需要加强(${d.score}分)`, weight: 0.5, knowledgeNodeId: undefined })
    }

    // 机会与威胁
    if (result.totalScore >= 7) {
      opportunities.push({ content: '高评分策略，可优先执行', weight: 0.9 })
    }
    if (strategy.knowledgeNodeIds.length < 3) {
      weaknesses.push({ content: '知识支撑节点较少，建议补充更多研究', weight: 0.6 })
    }
    const riskScore = strategy.scores.risk ?? 0
    if (riskScore <= 4) {
      threats.push({ content: '风险控制不足，建议制定应急预案', weight: 0.7 })
    }
    if (strategy.scores.sustainability && strategy.scores.sustainability <= 4) {
      threats.push({ content: '持续性评分偏低，效果可能难以维持', weight: 0.6 })
    }

    // 矩阵评分
    const sAvg = strengths.reduce((s, i) => s + i.weight, 0) / Math.max(1, strengths.length)
    const wAvg = weaknesses.reduce((s, i) => s + i.weight, 0) / Math.max(1, weaknesses.length)
    const oAvg = opportunities.reduce((s, i) => s + i.weight, 0) / Math.max(1, opportunities.length)
    const tAvg = threats.reduce((s, i) => s + i.weight, 0) / Math.max(1, threats.length)

    // 推荐
    const recommendations: string[] = []
    if (sAvg > oAvg && sAvg > tAvg) {
      recommendations.push('优势明显，建议采取进攻型策略，积极投入')
    }
    if (wAvg > sAvg) {
      recommendations.push('劣势突出，建议先补齐短板再推进')
    }
    if (oAvg > tAvg) {
      recommendations.push('机会大于威胁，可适度冒险')
    }
    if (tAvg > oAvg) {
      recommendations.push('威胁较大，建议采取防御型策略，谨慎推进')
    }
    if (relatedNodes.length < 3) {
      recommendations.push('建议在经略阁中补充更多相关知识节点，增强策略的知识支撑')
    }

    return {
      strategyId: strategy.id,
      strategyName: strategy.name,
      strengths,
      weaknesses,
      opportunities,
      threats,
      matrixScore: {
        offensive: Math.round(sAvg * oAvg * 100),
        defensive: Math.round(sAvg * (1 - tAvg) * 100),
        adaptive: Math.round(wAvg * oAvg * 100),
        survival: Math.round(wAvg * tAvg * 100),
      },
      recommendations,
    }
  }

  // ---- 推荐排序 ----

  /**
   * 生成策略推荐排序
   */
  function recommend(
    strategies: StrategyOption[],
    weights?: DimensionWeights,
    topN: number = 5,
  ): StrategyRecommendation[] {
    const results = evaluateAll(strategies, weights)

    return results.slice(0, topN).map((r, i) => {
      const highDims = r.dimensions.filter(d => d.score >= 7)
      const lowDims = r.dimensions.filter(d => d.score <= 4)

      return {
        strategyId: r.strategyId,
        strategyName: r.strategyName,
        totalScore: r.totalScore,
        grade: r.grade,
        rank: i + 1,
        reasons: [
          ...highDims.map(d => `${d.label}维度表现优秀(${d.score}分)`),
          ...(r.totalScore >= 8 ? ['综合评分优秀，强烈推荐'] : []),
        ],
        bestScenarios: determineScenarios(r),
        risks: lowDims.map(d => `${d.label}维度得分偏低(${d.score}分)，需关注`),
      }
    })
  }

  // ---- 敏感度分析 ----

  /**
   * 敏感度分析：各维度权重变化对总分的影响
   */
  function sensitivityAnalysis(
    strategy: StrategyOption,
    weights?: DimensionWeights,
  ): {
    dimension: string
    label: string
    currentScore: number
    /** 权重增加 10% 后的总分 */
    plus10pct: number
    /** 权重减少 10% 后的总分 */
    minus10pct: number
    /** 敏感度 */
    sensitivity: number
  }[] {
    const w = weights ? { ...weights } : { ...config.weights }
    const dims = Object.keys(DIMENSION_META) as EvalDimension[]
    const results: {
      dimension: string
      label: string
      currentScore: number
      plus10pct: number
      minus10pct: number
      sensitivity: number
    }[] = []

    for (const dim of dims) {
      const dimScore = strategy.scores[dim] ?? 0
      const meta = DIMENSION_META[dim]

      // 增加 10%
      const wPlus = { ...w }
      wPlus[dim] = Math.min(1, w[dim] + 0.10)
      const normalizedPlus = normalizeWeights(wPlus)
      const plusResult = evaluate(strategy, normalizedPlus)

      // 减少 10%
      const wMinus = { ...w }
      wMinus[dim] = Math.max(0, w[dim] - 0.10)
      const normalizedMinus = normalizeWeights(wMinus)
      const minusResult = evaluate(strategy, normalizedMinus)

      results.push({
        dimension: dim,
        label: meta.label,
        currentScore: dimScore,
        plus10pct: Math.round(plusResult.totalScore * 100) / 100,
        minus10pct: Math.round(minusResult.totalScore * 100) / 100,
        sensitivity: Math.round((plusResult.totalScore - minusResult.totalScore) * 100) / 100,
      })
    }

    return results.sort((a, b) => b.sensitivity - a.sensitivity)
  }

  // ---- 创建策略 ----

  /**
   * 创建新的策略方案
   */
  function createStrategy(
    name: string,
    description: string,
    knowledgeNodeIds: string[] = [],
    scores: Partial<Record<EvalDimension, number>> = {},
    notes: Partial<Record<EvalDimension, string>> = {},
    tags: string[] = [],
  ): StrategyOption {
    const now = new Date().toISOString()
    return {
      id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description,
      knowledgeNodeIds,
      scores,
      notes,
      tags,
      createdAt: now,
      updatedAt: now,
    }
  }

  // ---- 辅助函数 ----

  function getGrade(score: number): EvalGrade {
    for (const t of GRADE_THRESHOLDS) {
      if (score >= t.min) return t.grade
    }
    return 'F'
  }

  function determineBestScenario(result: EvaluationResult): string {
    const dims = result.dimensions
    const impact = dims.find(d => d.dimension === 'impact')?.score ?? 0
    const risk = dims.find(d => d.dimension === 'risk')?.score ?? 0
    const cost = dims.find(d => d.dimension === 'cost')?.score ?? 0
    const timeline = dims.find(d => d.dimension === 'timeline')?.score ?? 0

    if (impact >= 8 && risk >= 7) return '高影响力低风险项目，适合优先投入'
    if (impact >= 8 && risk <= 4) return '高影响力高风险项目，适合有经验的执行者'
    if (cost >= 8 && timeline >= 8) return '低成本快见效项目，适合快速验证'
    if (impact <= 4) return '影响力有限，适合作为辅助方案或试点'
    return '综合表现均衡，适合常规推进'
  }

  function determineScenarios(result: EvaluationResult): string[] {
    const scenarios: string[] = []
    const dims = result.dimensions

    const impact = dims.find(d => d.dimension === 'impact')?.score ?? 0
    const feasibility = dims.find(d => d.dimension === 'feasibility')?.score ?? 0
    const risk = dims.find(d => d.dimension === 'risk')?.score ?? 0
    const sustainability = dims.find(d => d.dimension === 'sustainability')?.score ?? 0

    if (feasibility >= 7) scenarios.push('资源充足时的首选方案')
    if (impact >= 8) scenarios.push('需要产生显著影响时')
    if (risk >= 7) scenarios.push('风险可控的稳定推进场景')
    if (sustainability >= 7) scenarios.push('长期战略规划')
    if (result.totalScore >= 8) scenarios.push('追求卓越成果的关键项目')

    if (scenarios.length === 0) scenarios.push('一般性探索或备选方案')

    return scenarios
  }

  return {
    config,
    setConfig,
    getWeights,
    normalizeWeights,
    evaluate,
    evaluateAll,
    compare,
    swotAnalyze,
    recommend,
    sensitivityAnalysis,
    createStrategy,
    getGrade,
    DIMENSION_META,
    DEFAULT_WEIGHTS,
    GRADE_THRESHOLDS,
  }
}