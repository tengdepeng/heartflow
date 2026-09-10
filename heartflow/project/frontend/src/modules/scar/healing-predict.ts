// ============================================================
// 工痕 · 愈合预测引擎（P16-6）
// 基于多因素回归的智能愈合预测，替代简单线性外推
// ============================================================

import type {
  BodyMark, GrowthRecord, ScarType, SeverityLevel, BodyPart, HealingStage,
} from './types'

// ---- 预测引擎类型 ----

/** 预测输入因子 */
export interface PredictionFactors {
  /** 伤痕类型 */
  scarType: ScarType
  /** 严重度 */
  severity: SeverityLevel
  /** 身体部位 */
  bodyPart: BodyPart
  /** 当前愈合阶段 */
  currentStage: HealingStage
  /** 当前愈合进度 */
  currentProgress: number
  /** 记录天数 */
  daysSinceRecorded: number
  /** 是否有成长记录 */
  hasGrowth: boolean
  /** 是否已转化 */
  isTransformed: boolean
  /** 历史同类型伤痕平均愈合天数 */
  historicalAvgDays?: number
  /** 同部位历史伤痕平均愈合天数 */
  bodyPartAvgDays?: number
}

/** 愈合预测 */
export interface HealingPrediction {
  /** 预计完全愈合日期 */
  predictedDate: string
  /** 预计剩余天数 */
  remainingDays: number
  /** 置信度 0-1 */
  confidence: number
  /** 置信区间（天） */
  confidenceInterval: [number, number]
  /** 各因子贡献度 */
  factorContributions: FactorContribution[]
  /** 预测方法 */
  method: 'weighted_regression' | 'historical_baseline' | 'linear_fallback'
  /** 预测时间 */
  predictedAt: string
}

/** 因子贡献度 */
export interface FactorContribution {
  /** 因子名称 */
  factor: string
  /** 影响方向 */
  direction: 'accelerates' | 'slows' | 'neutral'
  /** 权重 0-1 */
  weight: number
  /** 描述 */
  description: string
}

/** 预测历史 */
export interface PredictionHistory {
  /** 伤痕 ID */
  scarId: string
  /** 预测记录 */
  predictions: HealingPrediction[]
  /** 实际愈合天数 */
  actualHealingDays?: number
  /** 预测误差（天） */
  predictionError?: number
  /** 模型准确度 */
  accuracy?: number
}

/** 愈合基线数据 */
export interface HealingBaseline {
  /** 伤痕类型 */
  scarType: ScarType
  /** 严重度 */
  severity: SeverityLevel
  /** 身体部位 */
  bodyPart: BodyPart
  /** 平均愈合天数 */
  avgDays: number
  /** 样本量 */
  sampleSize: number
  /** 标准差 */
  stdDev: number
}

// ---- 愈合基线表 ----

/**
 * 基于伤痕类型的基线愈合速度因子（相对于标准愈合速度）
 * 值越大愈合越快
 */
const SCAR_TYPE_HEALING_FACTOR: Record<ScarType, number> = {
  impact: 1.0,   // 撞击：标准速度
  cut: 0.85,     // 割裂：较慢（需要组织再生）
  burn: 0.7,     // 灼烧：最慢（深层组织损伤）
  wear: 1.1,     // 磨损：较快（表皮损伤）
}

/**
 * 基于严重度的愈合延迟因子
 */
const SEVERITY_HEALING_FACTOR: Record<SeverityLevel, number> = {
  1: 1.3,  // 轻微：快
  2: 1.1,  // 较轻
  3: 1.0,  // 中等：标准
  4: 0.8,  // 较重
  5: 0.6,  // 严重：慢
}

/**
 * 基于身体部位的愈合速度因子
 * 血供丰富的部位愈合更快
 */
const BODY_PART_HEALING_FACTOR: Record<BodyPart, number> = {
  head: 1.15,      // 头部：血供丰富，愈合快
  neck: 1.1,       // 颈部
  chest: 1.05,     // 胸部
  arm: 1.0,        // 手臂：标准
  hand: 0.95,      // 手部：活动多
  shoulder: 0.95,  // 肩部
  back: 0.9,       // 背部
  waist: 0.85,     // 腰部：核心区域
  leg: 0.9,        // 腿部
  foot: 0.8,       // 足部：承重
  eye: 0.75,       // 眼部：敏感
}

/**
 * 基于愈合阶段的预估剩余天数基准
 */
const STAGE_REMAINING_DAYS_BASE: Record<HealingStage, number> = {
  acute: 90,         // 新鲜期：还需约 90 天
  proliferation: 60, // 增生期：还需约 60 天
  remodeling: 40,    // 重塑期：还需约 40 天
  matured: 0,        // 成熟期：已愈合
}

/**
 * 成长记录的加速因子
 * 有成长记录 = 心理愈合加速生理愈合
 */
const GROWTH_ACCELERATION = 0.15 // 有成长记录加速 15%
const TRANSFORMED_ACCELERATION = 0.25 // 已转化加速 25%

// ============================================================
// useHealingPredictor
// ============================================================

export function useHealingPredictor() {
  /**
   * 基于历史数据计算愈合基线
   */
  function computeBaseline(
    marks: BodyMark[],
    _growthRecords: GrowthRecord[],
  ): HealingBaseline[] {
    const baselines: HealingBaseline[] = []
    const healedMarks = marks.filter(m => m.healingProgress >= 100)

    if (healedMarks.length === 0) return baselines

    // 按 scarType + severity + bodyPart 分组
    const groups = new Map<string, BodyMark[]>()

    for (const mark of healedMarks) {
      const key = `${mark.scarType}|${mark.severity}|${mark.bodyPart}`
      const group = groups.get(key) || []
      group.push(mark)
      groups.set(key, group)
    }

    for (const [key, groupMarks] of groups) {
      const [scarType, severityStr, bodyPart] = key.split('|') as [ScarType, string, BodyPart]
      const severity = parseInt(severityStr) as SeverityLevel

      const healingDays = groupMarks.map(m => {
        const days = Math.floor(
          (new Date().getTime() - new Date(m.recordedAt).getTime()) / 86400000,
        )
        return days
      })

      const avgDays = Math.round(healingDays.reduce((a, b) => a + b, 0) / healingDays.length)
      const variance = healingDays.reduce((sum, d) => sum + (d - avgDays) ** 2, 0) / healingDays.length
      const stdDev = Math.round(Math.sqrt(variance))

      baselines.push({
        scarType,
        severity,
        bodyPart,
        avgDays: Math.max(avgDays, 1),
        sampleSize: groupMarks.length,
        stdDev,
      })
    }

    return baselines
  }

  /**
   * 获取历史同类型伤痕的平均愈合天数
   */
  function getHistoricalAvg(
    scarType: ScarType,
    severity: SeverityLevel,
    baselines: HealingBaseline[],
  ): number | undefined {
    const matches = baselines.filter(
      b => b.scarType === scarType && b.severity === severity,
    )
    if (matches.length === 0) return undefined

    const totalDays = matches.reduce((sum, b) => sum + b.avgDays * b.sampleSize, 0)
    const totalSamples = matches.reduce((sum, b) => sum + b.sampleSize, 0)
    return totalSamples > 0 ? Math.round(totalDays / totalSamples) : undefined
  }

  /**
   * 获取同部位历史伤痕的平均愈合天数
   */
  function getBodyPartAvg(
    bodyPart: BodyPart,
    baselines: HealingBaseline[],
  ): number | undefined {
    const matches = baselines.filter(b => b.bodyPart === bodyPart)
    if (matches.length === 0) return undefined

    const totalDays = matches.reduce((sum, b) => sum + b.avgDays * b.sampleSize, 0)
    const totalSamples = matches.reduce((sum, b) => sum + b.sampleSize, 0)
    return totalSamples > 0 ? Math.round(totalDays / totalSamples) : undefined
  }

  /**
   * 分析各因子对愈合的影响
   */
  function analyzeFactors(
    scar: BodyMark,
    growthRecords: GrowthRecord[],
    baselines: HealingBaseline[],
  ): FactorContribution[] {
    const contributions: FactorContribution[] = []
    const hasGrowth = growthRecords.some(r => r.scarId === scar.id)

    // 1. 伤痕类型因子
    const typeFactor = SCAR_TYPE_HEALING_FACTOR[scar.scarType]
    contributions.push({
      factor: `伤痕类型：${scar.scarType}`,
      direction: typeFactor >= 1 ? 'accelerates' : 'slows',
      weight: Math.abs(1 - typeFactor) * 2,
      description: typeFactor >= 1
        ? `${scar.scarType} 类型愈合速度较快`
        : `${scar.scarType} 类型愈合速度较慢`,
    })

    // 2. 严重度因子
    const sevFactor = SEVERITY_HEALING_FACTOR[scar.severity]
    contributions.push({
      factor: `严重度：${scar.severity}/5`,
      direction: sevFactor >= 1 ? 'accelerates' : 'slows',
      weight: Math.abs(1 - sevFactor) * 2,
      description: sevFactor >= 1
        ? `严重度 ${scar.severity} 较低，愈合较快`
        : `严重度 ${scar.severity} 较高，愈合较慢`,
    })

    // 3. 身体部位因子
    const partFactor = BODY_PART_HEALING_FACTOR[scar.bodyPart] ?? 1.0
    contributions.push({
      factor: `身体部位：${scar.bodyPart}`,
      direction: partFactor >= 1 ? 'accelerates' : 'slows',
      weight: Math.abs(1 - partFactor) * 1.5,
      description: partFactor >= 1
        ? `${scar.bodyPart} 部位血供丰富，愈合较快`
        : `${scar.bodyPart} 部位愈合速度较慢`,
    })

    // 4. 成长记录因子
    if (hasGrowth) {
      contributions.push({
        factor: '有成长记录',
        direction: 'accelerates',
        weight: 0.15,
        description: '心理成长加速整体愈合进程约 15%',
      })
    }

    // 5. 转化状态因子
    if (scar.transformed) {
      contributions.push({
        factor: '已转化',
        direction: 'accelerates',
        weight: 0.25,
        description: '已完成逆境转化，愈合进程加速约 25%',
      })
    }

    // 6. 历史数据因子
    const historicalAvg = getHistoricalAvg(scar.scarType, scar.severity, baselines)
    if (historicalAvg !== undefined) {
      const diff = historicalAvg - STAGE_REMAINING_DAYS_BASE[scar.healingStage]
      contributions.push({
        factor: '历史数据参考',
        direction: diff < 0 ? 'accelerates' : diff > 0 ? 'slows' : 'neutral',
        weight: 0.2,
        description: `同类型伤痕历史平均愈合 ${historicalAvg} 天`,
      })
    }

    return contributions
  }

  /**
   * 预测愈合（加权回归模型）
   */
  function predictHealing(
    scar: BodyMark,
    allMarks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): HealingPrediction {
    if (scar.healingProgress >= 100) {
      return {
        predictedDate: new Date().toISOString().split('T')[0],
        remainingDays: 0,
        confidence: 1,
        confidenceInterval: [0, 0],
        factorContributions: [],
        method: 'linear_fallback',
        predictedAt: new Date().toISOString(),
      }
    }

    const baselines = computeBaseline(allMarks, growthRecords)
    const factors = analyzeFactors(scar, growthRecords, baselines)

    // 计算加权愈合速度
    const typeFactor = SCAR_TYPE_HEALING_FACTOR[scar.scarType] ?? 1.0
    const sevFactor = SEVERITY_HEALING_FACTOR[scar.severity] ?? 1.0
    const partFactor = BODY_PART_HEALING_FACTOR[scar.bodyPart] ?? 1.0

    // 基础愈合速度：每天固定百分比
    let baseHealingRate = 0.02 // 每天 2% 基础愈合

    // 多因子加权
    let combinedFactor = typeFactor * sevFactor * partFactor

    // 成长加速
    const hasGrowth = growthRecords.some(r => r.scarId === scar.id)
    if (hasGrowth) combinedFactor *= (1 + GROWTH_ACCELERATION)
    if (scar.transformed) combinedFactor *= (1 + TRANSFORMED_ACCELERATION)

    // 调整后的愈合速度
    const adjustedRate = baseHealingRate * combinedFactor

    // 预计剩余天数
    const remainingProgress = 100 - scar.healingProgress
    let remainingDays = Math.ceil(remainingProgress / (adjustedRate * 100))

    // 使用历史数据校准
    const historicalAvg = getHistoricalAvg(scar.scarType, scar.severity, baselines)
    const bodyPartAvg = getBodyPartAvg(scar.bodyPart, baselines)

    let method: HealingPrediction['method'] = 'weighted_regression'
    if (historicalAvg !== undefined) {
      // 历史加权：历史数据 40% + 回归预测 60%
      const historicalRemaining = Math.max(
        0,
        Math.ceil(historicalAvg * (remainingProgress / 100)),
      )
      remainingDays = Math.round(remainingDays * 0.6 + historicalRemaining * 0.4)
      method = 'historical_baseline'
    }

    // 确保最小剩余天数
    remainingDays = Math.max(remainingDays, 1)

    // 计算置信度
    let confidence = 0.6 // 基础置信度

    // 历史数据增加置信度
    if (historicalAvg !== undefined) confidence += 0.15
    if (bodyPartAvg !== undefined) confidence += 0.05

    // 当前进度越高置信度越高
    confidence += scar.healingProgress / 100 * 0.15

    // 有成长记录增加置信度
    if (hasGrowth) confidence += 0.05

    confidence = Math.min(confidence, 0.95)

    // 置信区间
    const margin = Math.ceil(remainingDays * (1 - confidence) * 2)
    const confidenceInterval: [number, number] = [
      Math.max(1, remainingDays - margin),
      remainingDays + margin,
    ]

    // 预测日期
    const predictedDate = new Date()
    predictedDate.setDate(predictedDate.getDate() + remainingDays)

    return {
      predictedDate: predictedDate.toISOString().split('T')[0],
      remainingDays,
      confidence: Math.round(confidence * 100) / 100,
      confidenceInterval,
      factorContributions: factors,
      method,
      predictedAt: new Date().toISOString(),
    }
  }

  /**
   * 批量预测
   */
  function predictAll(
    marks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): Map<string, HealingPrediction> {
    const predictions = new Map<string, HealingPrediction>()
    for (const mark of marks) {
      predictions.set(mark.id, predictHealing(mark, marks, growthRecords))
    }
    return predictions
  }

  /**
   * 比较预测与实际（用于模型评估）
   */
  function evaluatePrediction(
    scar: BodyMark,
    prediction: HealingPrediction,
  ): PredictionHistory {
    const _daysSinceRecorded = Math.floor(
      (Date.now() - new Date(scar.recordedAt).getTime()) / 86400000,
    )

    const history: PredictionHistory = {
      scarId: scar.id,
      predictions: [prediction],
    }

    if (scar.healingProgress >= 100) {
      history.actualHealingDays = _daysSinceRecorded
      history.predictionError = Math.abs(
        _daysSinceRecorded - (prediction.remainingDays + _daysSinceRecorded),
      )
      history.accuracy = Math.max(
        0,
        1 - (history.predictionError / Math.max(_daysSinceRecorded, 1)),
      )
    }

    return history
  }

  /**
   * 获取愈合进度预测（分阶段）
   */
  function predictStageProgress(
    scar: BodyMark,
    allMarks: BodyMark[],
    growthRecords: GrowthRecord[],
  ): { stage: HealingStage; estimatedDays: number; progress: number }[] {
    const prediction = predictHealing(scar, allMarks, growthRecords)
    const stages: HealingStage[] = ['acute', 'proliferation', 'remodeling', 'matured']
    const currentStageIdx = stages.indexOf(scar.healingStage)

    const result: { stage: HealingStage; estimatedDays: number; progress: number }[] = []

    let cumulativeDays = 0
    for (let i = currentStageIdx; i < stages.length; i++) {
      const stage = stages[i]
      if (i === currentStageIdx) {
        // 当前阶段：根据剩余天数比例分配
        const stageWeight = i === stages.length - 1 ? 0.3 : 0.25
        const days = Math.ceil(prediction.remainingDays * stageWeight)
        cumulativeDays += days
        result.push({
          stage,
          estimatedDays: cumulativeDays,
          progress: scar.healingProgress,
        })
      } else {
        const stageWeight = i === stages.length - 1 ? 0.35 : 0.25
        const days = Math.ceil(prediction.remainingDays * stageWeight)
        cumulativeDays += days
        result.push({
          stage,
          estimatedDays: cumulativeDays,
          progress: Math.min(
            100,
            scar.healingProgress + Math.round((i - currentStageIdx) / (stages.length - currentStageIdx) * (100 - scar.healingProgress)),
          ),
        })
      }
    }

    return result
  }

  return {
    computeBaseline,
    getHistoricalAvg,
    getBodyPartAvg,
    analyzeFactors,
    predictHealing,
    predictAll,
    evaluatePrediction,
    predictStageProgress,
  }
}