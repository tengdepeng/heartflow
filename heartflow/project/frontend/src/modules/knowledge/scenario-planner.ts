// ============================================================
// 经略阁 · 场景规划模板（P18-6）
// 场景构建、what-if 分析、场景对比矩阵、未来投影
// ============================================================

import type { KnowledgeNode } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 场景类型 */
export type ScenarioType = 'best_case' | 'worst_case' | 'most_likely' | 'wild_card' | 'trend' | 'custom'

/** 时间范围 */
export type TimeHorizon = 'short_term' | 'medium_term' | 'long_term' | 'vision'

/** 不确定性等级 */
export type UncertaintyLevel = 'very_low' | 'low' | 'medium' | 'high' | 'very_high'

/** 场景驱动因素 */
export interface ScenarioDriver {
  id: string
  name: string
  description: string
  /** 当前状态 */
  currentState: string
  /** 不确定性等级 */
  uncertainty: UncertaintyLevel
  /** 影响程度 0-1 */
  impact: number
  /** 可能的方向 */
  possibleDirections: string[]
  /** 关联的知识节点 */
  knowledgeNodeIds: string[]
}

/** 场景因子 */
export interface ScenarioFactor {
  id: string
  name: string
  /** 因子值 */
  value: string
  /** 概率 0-1 */
  probability: number
  /** 影响程度 0-1 */
  impact: number
  /** 趋势方向 */
  trend: 'increasing' | 'decreasing' | 'stable' | 'unknown'
  /** 关联驱动因素 */
  driverId?: string
}

/** 场景规划 */
export interface ScenarioPlan {
  id: string
  name: string
  description: string
  /** 场景类型 */
  type: ScenarioType
  /** 时间范围 */
  timeHorizon: TimeHorizon
  /** 场景描述 */
  narrative: string
  /** 驱动因素 */
  drivers: ScenarioDriver[]
  /** 场景因子 */
  factors: ScenarioFactor[]
  /** 关键假设 */
  assumptions: string[]
  /** 早期信号 */
  earlySignals: string[]
  /** 影响评估 */
  impactAssessment: ScenarioImpact
  /** 应对策略 */
  strategies: string[]
  /** 关联的知识节点 */
  knowledgeNodeIds: string[]
  /** 标签 */
  tags: string[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 场景影响评估 */
export interface ScenarioImpact {
  /** 总体评分 0-10 */
  overallScore: number
  /** 积极影响 0-10 */
  positiveImpact: number
  /** 消极影响 0-10 */
  negativeImpact: number
  /** 准备度 0-10 */
  preparedness: number
  /** 可控度 0-10 */
  controllability: number
  /** 影响领域 */
  affectedAreas: string[]
}

/** 场景对比矩阵 */
export interface ScenarioComparisonMatrix {
  /** 场景列表 */
  scenarios: ScenarioPlan[]
  /** 对比维度 */
  dimensions: string[]
  /** 矩阵数据 */
  matrix: {
    scenarioId: string
    scenarioName: string
    values: Record<string, number | string>
  }[]
  /** 各维度最佳场景 */
  bestPerDimension: Record<string, string>
  /** 综合推荐 */
  overallRecommendation: string
}

/** What-If 分析 */
export interface WhatIfAnalysis {
  id: string
  /** 基准场景 */
  baseScenario: ScenarioPlan
  /** 变化因子 */
  changedFactors: {
    factorId: string
    originalValue: string
    newValue: string
    reason: string
  }[]
  /** 结果场景 */
  resultingScenario: ScenarioPlan
  /** 差异分析 */
  differences: {
    dimension: string
    before: number | string
    after: number | string
    significance: 'critical' | 'major' | 'minor' | 'none'
  }[]
  /** 分析时间 */
  analyzedAt: string
}

/** 场景模板 */
export interface ScenarioTemplate {
  id: string
  name: string
  description: string
  type: ScenarioType
  /** 预设的驱动因素 */
  suggestedDrivers: string[]
  /** 预设的问题 */
  guidingQuestions: string[]
  /** 适用场景 */
  useCases: string[]
}

/** 场景规划配置 */
export interface ScenarioConfig {
  /** 默认时间范围 */
  defaultTimeHorizon: TimeHorizon
  /** 最大场景数 */
  maxScenarios: number
  /** 最大驱动因素数 */
  maxDrivers: number
  /** 最大因子数 */
  maxFactors: number
}

/** 未来投影 */
export interface FutureProjection {
  /** 时间点 */
  timePoint: string
  /** 时间标签 */
  label: string
  /** 场景在各时间点的状态 */
  states: {
    scenarioId: string
    scenarioName: string
    /** 概率变化 */
    probability: number
    /** 关键变化 */
    keyChanges: string[]
  }[]
}

// ============================================================
// 常量
// ============================================================

const TIME_HORIZON_META: Record<TimeHorizon, { label: string; icon: string; defaultMonths: number }> = {
  short_term: { label: '短期', icon: '📅', defaultMonths: 3 },
  medium_term: { label: '中期', icon: '🗓️', defaultMonths: 12 },
  long_term: { label: '长期', icon: '📆', defaultMonths: 36 },
  vision: { label: '愿景', icon: '🔭', defaultMonths: 60 },
}

const UNCERTAINTY_META: Record<UncertaintyLevel, { label: string; color: string; score: number }> = {
  very_low: { label: '极低', color: '#34d399', score: 0.1 },
  low: { label: '低', color: '#6b9fc4', score: 0.3 },
  medium: { label: '中', color: '#f0c040', score: 0.5 },
  high: { label: '高', color: '#e0a96d', score: 0.7 },
  very_high: { label: '极高', color: '#ef4444', score: 0.9 },
}

const SCENARIO_TYPE_META: Record<ScenarioType, { label: string; icon: string; description: string }> = {
  best_case: { label: '最佳情况', icon: '🌟', description: '一切顺利的理想场景' },
  worst_case: { label: '最差情况', icon: '🌧️', description: '最不利条件下的场景' },
  most_likely: { label: '最可能', icon: '📊', description: '基于当前趋势的最可能发展' },
  wild_card: { label: '黑天鹅', icon: '🦢', description: '低概率但高冲击的意外事件' },
  trend: { label: '趋势延续', icon: '📈', description: '当前趋势不变的自然延伸' },
  custom: { label: '自定义', icon: '✏️', description: '自由定义的场景' },
}

// ============================================================
// 预设场景模板
// ============================================================

const PRESET_SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'template_decision',
    name: '重大决策场景',
    description: '评估重大人生/职业决策的多种可能结果',
    type: 'custom',
    suggestedDrivers: ['技能水平', '市场需求', '竞争环境', '资源可用性', '时间投入'],
    guidingQuestions: [
      '最好的结果是什么？需要什么条件？',
      '最坏的结果是什么？如何应对？',
      '什么因素会改变结果的方向？',
      '有哪些早期信号值得关注？',
    ],
    useCases: ['职业转型', '重大投资', '学业选择', '创业决策'],
  },
  {
    id: 'template_risk',
    name: '风险评估场景',
    description: '系统性地识别和评估潜在风险',
    type: 'worst_case',
    suggestedDrivers: ['风险概率', '影响程度', '缓释措施', '恢复能力', '连锁反应'],
    guidingQuestions: [
      '最可能发生的风险是什么？',
      '影响最大的风险是什么？',
      '有哪些被忽视的风险？',
      '应对措施是否充分？',
    ],
    useCases: ['项目风险管理', '投资风险评估', '健康风险管理'],
  },
  {
    id: 'template_opportunity',
    name: '机会识别场景',
    description: '发现和评估新兴机会',
    type: 'best_case',
    suggestedDrivers: ['技术变革', '市场空白', '能力优势', '网络效应', '时机窗口'],
    guidingQuestions: [
      '当前最大的机会在哪里？',
      '需要什么资源才能抓住机会？',
      '机会窗口有多长？',
      '谁可能也在追逐这个机会？',
    ],
    useCases: ['商业机会评估', '学习路径规划', '创造性项目'],
  },
  {
    id: 'template_trend',
    name: '趋势分析场景',
    description: '基于现有趋势推演未来',
    type: 'trend',
    suggestedDrivers: ['技术发展', '社会变迁', '经济周期', '政策环境', '文化演变'],
    guidingQuestions: [
      '当前有哪些重要趋势？',
      '这些趋势会持续多久？',
      '趋势之间的相互作用是什么？',
      '什么力量可能改变趋势？',
    ],
    useCases: ['行业分析', '个人发展规划', '投资策略'],
  },
  {
    id: 'template_learning',
    name: '学习成长场景',
    description: '规划个人学习与成长路径',
    type: 'most_likely',
    suggestedDrivers: ['学习效率', '时间投入', '资源质量', '实践机会', '反馈循环'],
    guidingQuestions: [
      '一年后希望达到什么水平？',
      '学习路径上最大的障碍是什么？',
      '什么资源可以加速成长？',
      '如何衡量进展？',
    ],
    useCases: ['技能学习', '知识体系构建', '能力提升计划'],
  },
  {
    id: 'template_crisis',
    name: '危机应对场景',
    description: '为潜在的危机情况做准备',
    type: 'wild_card',
    suggestedDrivers: ['触发事件', '传播速度', '影响范围', '应对能力', '恢复时间'],
    guidingQuestions: [
      '什么事件可能触发危机？',
      '危机的影响范围和持续时间？',
      '现有的应对资源是否充足？',
      '如何建立早期预警机制？',
    ],
    useCases: ['应急计划', '业务连续性', '个人安全预案'],
  },
]

// ============================================================
// 默认配置
// ============================================================

const DEFAULT_CONFIG: ScenarioConfig = {
  defaultTimeHorizon: 'medium_term',
  maxScenarios: 10,
  maxDrivers: 8,
  maxFactors: 12,
}

// ============================================================
// useScenarioPlanner
// ============================================================

export function useScenarioPlanner() {
  let config = { ...DEFAULT_CONFIG }

  function setConfig(partial: Partial<ScenarioConfig>) {
    config = { ...config, ...partial }
  }

  // ---- 创建场景 ----

  /**
   * 创建场景规划
   */
  function createScenario(
    name: string,
    type: ScenarioType = 'custom',
    options: {
      description?: string
      timeHorizon?: TimeHorizon
      narrative?: string
      drivers?: ScenarioDriver[]
      factors?: ScenarioFactor[]
      assumptions?: string[]
      earlySignals?: string[]
      knowledgeNodeIds?: string[]
      tags?: string[]
    } = {},
  ): ScenarioPlan {
    const now = new Date().toISOString()
    return {
      id: `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: options.description || '',
      type,
      timeHorizon: options.timeHorizon || config.defaultTimeHorizon,
      narrative: options.narrative || '',
      drivers: options.drivers || [],
      factors: options.factors || [],
      assumptions: options.assumptions || [],
      earlySignals: options.earlySignals || [],
      impactAssessment: {
        overallScore: 0,
        positiveImpact: 0,
        negativeImpact: 0,
        preparedness: 0,
        controllability: 0,
        affectedAreas: [],
      },
      strategies: [],
      knowledgeNodeIds: options.knowledgeNodeIds || [],
      tags: options.tags || [],
      createdAt: now,
      updatedAt: now,
    }
  }

  /**
   * 基于模板创建场景
   */
  function createFromTemplate(
    templateId: string,
    name: string,
    customizations: Partial<ScenarioPlan> = {},
  ): ScenarioPlan | null {
    const template = PRESET_SCENARIO_TEMPLATES.find(t => t.id === templateId)
    if (!template) return null

    const now = new Date().toISOString()
    const drivers: ScenarioDriver[] = template.suggestedDrivers.map((name, i) => ({
      id: `driver_${Date.now()}_${i}`,
      name,
      description: '',
      currentState: '待评估',
      uncertainty: 'medium' as UncertaintyLevel,
      impact: 0.5,
      possibleDirections: [],
      knowledgeNodeIds: [],
    }))

    return {
      id: `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: template.description,
      type: template.type,
      timeHorizon: config.defaultTimeHorizon,
      narrative: '',
      drivers,
      factors: [],
      assumptions: [],
      earlySignals: [],
      impactAssessment: {
        overallScore: 0,
        positiveImpact: 0,
        negativeImpact: 0,
        preparedness: 0,
        controllability: 0,
        affectedAreas: [],
      },
      strategies: [],
      knowledgeNodeIds: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
      ...customizations,
    }
  }

  // ---- 驱动因素管理 ----

  /**
   * 添加驱动因素
   */
  function addDriver(
    scenario: ScenarioPlan,
    name: string,
    options: {
      description?: string
      currentState?: string
      uncertainty?: UncertaintyLevel
      impact?: number
      possibleDirections?: string[]
      knowledgeNodeIds?: string[]
    } = {},
  ): ScenarioDriver {
    const driver: ScenarioDriver = {
      id: `driver_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: options.description || '',
      currentState: options.currentState || '待评估',
      uncertainty: options.uncertainty || 'medium',
      impact: options.impact ?? 0.5,
      possibleDirections: options.possibleDirections || [],
      knowledgeNodeIds: options.knowledgeNodeIds || [],
    }

    scenario.drivers.push(driver)
    scenario.updatedAt = new Date().toISOString()
    return driver
  }

  /**
   * 移除驱动因素
   */
  function removeDriver(scenario: ScenarioPlan, driverId: string): boolean {
    const idx = scenario.drivers.findIndex(d => d.id === driverId)
    if (idx < 0) return false

    scenario.drivers.splice(idx, 1)
    // 同时移除关联该驱动的因子
    scenario.factors = scenario.factors.filter(f => f.driverId !== driverId)
    scenario.updatedAt = new Date().toISOString()
    return true
  }

  // ---- 因子管理 ----

  /**
   * 添加场景因子
   */
  function addFactor(
    scenario: ScenarioPlan,
    name: string,
    options: {
      value?: string
      probability?: number
      impact?: number
      trend?: ScenarioFactor['trend']
      driverId?: string
    } = {},
  ): ScenarioFactor {
    const factor: ScenarioFactor = {
      id: `factor_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      value: options.value || '中性',
      probability: options.probability ?? 0.5,
      impact: options.impact ?? 0.5,
      trend: options.trend || 'stable',
      driverId: options.driverId,
    }

    scenario.factors.push(factor)
    scenario.updatedAt = new Date().toISOString()
    return factor
  }

  /**
   * 移除因子
   */
  function removeFactor(scenario: ScenarioPlan, factorId: string): boolean {
    const idx = scenario.factors.findIndex(f => f.id === factorId)
    if (idx < 0) return false

    scenario.factors.splice(idx, 1)
    scenario.updatedAt = new Date().toISOString()
    return true
  }

  // ---- 影响评估 ----

  /**
   * 评估场景影响
   */
  function assessImpact(scenario: ScenarioPlan): ScenarioImpact {
    const factors = scenario.factors
    const drivers = scenario.drivers

    // 积极影响：因子中正面趋势的加权平均
    const positiveFactors = factors.filter(f => f.trend === 'increasing' || f.value === '有利')
    const negativeFactors = factors.filter(f => f.trend === 'decreasing' || f.value === '不利')

    const positiveImpact = factors.length > 0
      ? Math.round(positiveFactors.reduce((s, f) => s + f.impact * f.probability, 0) / factors.length * 10)
      : 5

    const negativeImpact = factors.length > 0
      ? Math.round(negativeFactors.reduce((s, f) => s + f.impact * f.probability, 0) / factors.length * 10)
      : 3

    // 准备度：基于假设和策略的完整度
    const preparedness = Math.min(10, Math.round(
      (scenario.assumptions.length * 0.5 + scenario.strategies.length * 1.5 + scenario.earlySignals.length * 1)
    ))

    // 可控度：基于驱动因素不确定性
    const avgUncertainty = drivers.length > 0
      ? drivers.reduce((s, d) => s + UNCERTAINTY_META[d.uncertainty].score, 0) / drivers.length
      : 0.5
    const controllability = Math.round((1 - avgUncertainty) * 10)

    const overallScore = Math.round(
      (positiveImpact * 0.4 + preparedness * 0.3 + controllability * 0.3)
    )

    // 影响领域
    const affectedAreas = [...new Set([
      ...drivers.map(d => d.name),
      ...factors.map(f => f.name),
    ])]

    const assessment: ScenarioImpact = {
      overallScore: Math.min(10, overallScore),
      positiveImpact,
      negativeImpact,
      preparedness,
      controllability,
      affectedAreas: affectedAreas.slice(0, 10),
    }

    scenario.impactAssessment = assessment
    scenario.updatedAt = new Date().toISOString()

    return assessment
  }

  // ---- 场景对比 ----

  /**
   * 创建场景对比矩阵
   */
  function compareScenarios(scenarios: ScenarioPlan[]): ScenarioComparisonMatrix {
    // 确保所有场景都有评估
    for (const s of scenarios) {
      if (s.impactAssessment.overallScore === 0) {
        assessImpact(s)
      }
    }

    const dimensions = ['总体评分', '积极影响', '消极影响', '准备度', '可控度'] as const
    type DimensionKey = typeof dimensions[number]
    const matrix = scenarios.map(s => ({
      scenarioId: s.id,
      scenarioName: s.name,
      values: {
        '总体评分': s.impactAssessment.overallScore,
        '积极影响': s.impactAssessment.positiveImpact,
        '消极影响': s.impactAssessment.negativeImpact,
        '准备度': s.impactAssessment.preparedness,
        '可控度': s.impactAssessment.controllability,
      } as Record<DimensionKey, number>,
    }))

    // 各维度最佳
    const bestPerDimension: Record<string, string> = {}
    for (const dim of dimensions) {
      let best: { id: string; value: number } | null = null
      for (const row of matrix) {
        const val = row.values[dim] as number
        if (dim === '消极影响') {
          if (best === null || val < best.value) best = { id: row.scenarioId, value: val }
        } else {
          if (best === null || val > best.value) best = { id: row.scenarioId, value: val }
        }
      }
      if (best) {
        bestPerDimension[dim] = best.id
      }
    }

    // 综合推荐
    const scored = scenarios.map(s => {
      const ia = s.impactAssessment
      return {
        id: s.id,
        name: s.name,
        score: ia.positiveImpact * 0.4 + ia.preparedness * 0.3 + ia.controllability * 0.3 - ia.negativeImpact * 0.1,
      }
    })
    const best = scored.sort((a, b) => b.score - a.score)[0]
    const overallRecommendation = best
      ? `推荐优先关注「${best.name}」场景（综合得分 ${Math.round(best.score * 10) / 10}）`
      : '需要更多场景数据进行比较'

    return {
      scenarios,
      dimensions: [...dimensions],
      matrix,
      bestPerDimension,
      overallRecommendation,
    }
  }

  // ---- What-If 分析 ----

  /**
   * 执行 What-If 分析
   */
  function whatIf(
    baseScenario: ScenarioPlan,
    changes: { factorId: string; newValue: string; reason: string }[],
  ): WhatIfAnalysis {
    // 深拷贝基准场景
    const resultingScenario: ScenarioPlan = JSON.parse(JSON.stringify(baseScenario))
    resultingScenario.id = `scenario_whatif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    resultingScenario.name = `${baseScenario.name} (What-If)`
    resultingScenario.type = 'custom'

    const changedFactors: WhatIfAnalysis['changedFactors'] = []
    const differences: WhatIfAnalysis['differences'] = []

    for (const change of changes) {
      const baseFactor = baseScenario.factors.find(f => f.id === change.factorId)
      const newFactor = resultingScenario.factors.find(f => f.id === change.factorId)
      if (!baseFactor || !newFactor) continue

      const originalValue = baseFactor.value
      newFactor.value = change.newValue

      // 根据值变化自动调整趋势
      if (change.newValue === '有利') newFactor.trend = 'increasing'
      else if (change.newValue === '不利') newFactor.trend = 'decreasing'
      else newFactor.trend = 'stable'

      changedFactors.push({
        factorId: change.factorId,
        originalValue,
        newValue: change.newValue,
        reason: change.reason,
      })
    }

    // 重新评估
    const baseAssessment = assessImpact(baseScenario)
    const newAssessment = assessImpact(resultingScenario)

    // 差异分析
    const compareDims: { key: keyof ScenarioImpact; label: string }[] = [
      { key: 'overallScore', label: '总体评分' },
      { key: 'positiveImpact', label: '积极影响' },
      { key: 'negativeImpact', label: '消极影响' },
      { key: 'preparedness', label: '准备度' },
      { key: 'controllability', label: '可控度' },
    ]

    for (const { key, label } of compareDims) {
      const before = baseAssessment[key] as number
      const after = newAssessment[key] as number
      const diff = after - before

      let significance: 'critical' | 'major' | 'minor' | 'none' = 'none'
      if (Math.abs(diff) >= 3) significance = 'critical'
      else if (Math.abs(diff) >= 2) significance = 'major'
      else if (Math.abs(diff) >= 1) significance = 'minor'

      differences.push({ dimension: label, before, after, significance })
    }

    return {
      id: `whatif_${Date.now()}`,
      baseScenario,
      changedFactors,
      resultingScenario,
      differences,
      analyzedAt: new Date().toISOString(),
    }
  }

  // ---- 未来投影 ----

  /**
   * 生成未来时间线投影
   */
  function projectFuture(
    scenarios: ScenarioPlan[],
    timePoints: { months: number; label: string }[],
  ): FutureProjection[] {
    return timePoints.map(tp => {
      const date = new Date()
      date.setMonth(date.getMonth() + tp.months)
      const timePoint = date.toISOString().split('T')[0]

      const states: FutureProjection['states'] = scenarios.map(s => {
        // 基于驱动因素不确定性计算概率衰减
        const avgUncertainty = s.drivers.length > 0
          ? s.drivers.reduce((sum, d) => sum + UNCERTAINTY_META[d.uncertainty].score, 0) / s.drivers.length
          : 0.5

        // 随时间衰减的概率
        const decayFactor = Math.exp(-avgUncertainty * tp.months / 12)
        const probability = Math.round(decayFactor * 100) / 100

        // 关键变化
        const keyChanges: string[] = []
        if (avgUncertainty > 0.5) {
          keyChanges.push('不确定性较高，可能出现意外变化')
        }
        if (tp.months > 12) {
          keyChanges.push('长期预测可靠性降低')
        }

        return {
          scenarioId: s.id,
          scenarioName: s.name,
          probability,
          keyChanges,
        }
      })

      return { timePoint, label: tp.label, states }
    })
  }

  // ---- 场景集 ----

  /**
   * 创建标准场景集（最佳、最差、最可能、黑天鹅）
   */
  function createStandardSet(
    namePrefix: string,
    description: string = '',
    timeHorizon: TimeHorizon = 'medium_term',
  ): ScenarioPlan[] {
    const types: ScenarioType[] = ['best_case', 'worst_case', 'most_likely', 'wild_card']
    const scenarios: ScenarioPlan[] = []

    for (const type of types) {
      const meta = SCENARIO_TYPE_META[type]
      const scenario = createScenario(
        `${namePrefix} - ${meta.label}`,
        type,
        {
          description: `${description} - ${meta.description}`,
          timeHorizon,
        },
      )
      scenarios.push(scenario)
    }

    return scenarios
  }

  // ---- 从知识节点构建驱动因素 ----

  /**
   * 基于知识节点生成驱动因素
   */
  function buildDriversFromKnowledge(nodes: KnowledgeNode[]): ScenarioDriver[] {
    return nodes.map(node => {
      let uncertainty: UncertaintyLevel = 'medium'
      switch (node.cat) {
        case 'insight': uncertainty = 'high'; break
        case 'rule': uncertainty = 'low'; break
        case 'concept': uncertainty = 'medium'; break
        case 'pitfall': uncertainty = 'high'; break
        case 'frame': uncertainty = 'low'; break
        case 'metaphor': uncertainty = 'high'; break
      }

      return {
        id: `driver_knowledge_${node.id}`,
        name: node.title,
        description: node.desc,
        currentState: '基于知识节点',
        uncertainty,
        impact: 0.5,
        possibleDirections: [],
        knowledgeNodeIds: [node.id],
      }
    })
  }

  // ---- 生成叙事 ----

  /**
   * 为场景生成叙事描述
   */
  function generateNarrative(scenario: ScenarioPlan): string {
    const meta = SCENARIO_TYPE_META[scenario.type]
    const timeMeta = TIME_HORIZON_META[scenario.timeHorizon]
    const parts: string[] = []

    parts.push(`在${timeMeta.label}时间范围内（约${timeMeta.defaultMonths}个月），`)
    parts.push(`这是一个「${meta.label}」场景。`)

    if (scenario.drivers.length > 0) {
      const topDrivers = [...scenario.drivers]
        .sort((a, b) => b.impact - a.impact)
        .slice(0, 3)
      parts.push(`关键驱动因素包括: ${topDrivers.map(d => d.name).join('、')}。`)
    }

    if (scenario.factors.length > 0) {
      const positiveFactors = scenario.factors.filter(f => f.trend === 'increasing')
      const negativeFactors = scenario.factors.filter(f => f.trend === 'decreasing')
      if (positiveFactors.length > 0) {
        parts.push(`有利因素: ${positiveFactors.map(f => f.name).join('、')}呈上升趋势。`)
      }
      if (negativeFactors.length > 0) {
        parts.push(`不利因素: ${negativeFactors.map(f => f.name).join('、')}呈下降趋势。`)
      }
    }

    if (scenario.assumptions.length > 0) {
      parts.push(`关键假设: ${scenario.assumptions.slice(0, 3).join('；')}。`)
    }

    if (scenario.earlySignals.length > 0) {
      parts.push(`早期信号: ${scenario.earlySignals.slice(0, 3).join('、')}。`)
    }

    // 评估
    const impact = scenario.impactAssessment
    if (impact.overallScore > 0) {
      parts.push(`综合评估: ${impact.overallScore}/10，`)
      parts.push(`准备度 ${impact.preparedness}/10，可控度 ${impact.controllability}/10。`)
    }

    return parts.join('')
  }

  return {
    config,
    setConfig,
    createScenario,
    createFromTemplate,
    addDriver,
    removeDriver,
    addFactor,
    removeFactor,
    assessImpact,
    compareScenarios,
    whatIf,
    projectFuture,
    createStandardSet,
    buildDriversFromKnowledge,
    generateNarrative,
    PRESET_SCENARIO_TEMPLATES,
    SCENARIO_TYPE_META,
    TIME_HORIZON_META,
    UNCERTAINTY_META,
  }
}