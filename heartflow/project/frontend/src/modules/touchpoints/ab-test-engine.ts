// ============================================================
// 殿堂触角 · A/B 测试引擎（P20-6）
// 蓝图定义：
//   统计显著性检验（卡方检验、Z检验）
//   实验生命周期管理（创建→运行→停止→归档）
//   胜者判定与置信区间
//   效应量计算（Cohen's d, 相对提升）
//   多变量并行实验
//   样本量估算与功效分析
//   实验报告生成
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { ABTestVariant } from './notification-strategy'
import type { PushRecord } from './push-channel'

// 重新导出，方便外部模块引用
export type { ABTestVariant } from './notification-strategy'

// ---- 类型定义 ----

/** 实验状态 */
export type ExperimentStatus = 'draft' | 'running' | 'stopped' | 'completed' | 'archived'

/** A/B 实验（增强版） */
export interface ABExperiment {
  id: string
  name: string
  description: string
  /** 实验状态 */
  status: ExperimentStatus
  /** 开始时间 */
  startedAt: string | null
  /** 结束时间 */
  endedAt: string | null
  /** 目标指标 */
  targetMetric: ExperimentMetric
  /** 最小样本量 */
  minSampleSize: number
  /** 最小运行天数 */
  minDurationDays: number
  /** 显著性水平 */
  significanceLevel: number
  /** 变体列表 */
  variants: ABTestVariant[]
  /** 变体指标 */
  variantMetrics: Record<string, VariantMetrics>
  /** 胜者 */
  winnerId: string | null
  /** 胜者置信度 */
  winnerConfidence: number
  /** 结果总结 */
  resultSummary: string | null
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 实验指标 */
export type ExperimentMetric = 'clickRate' | 'openRate' | 'conversionRate' | 'responseTime' | 'dismissRate'

/** 变体指标 */
export interface VariantMetrics {
  deliveries: number
  opens: number
  clicks: number
  conversions: number
  dismissals: number
  responseTimes: number[]
  /** 主要指标值 */
  primaryMetric: number
  /** 相比对照组的提升 */
  lift: number | null
  /** 置信区间下界 */
  ciLower: number | null
  /** 置信区间上界 */
  ciUpper: number | null
  /** 统计显著性 p 值 */
  pValue: number | null
  /** 是否显著 */
  isSignificant: boolean
}

/** 显著性检验结果 */
export interface SignificanceResult {
  /** 是否显著 */
  significant: boolean
  /** p 值 */
  pValue: number
  /** 效应量 */
  effectSize: number
  /** 效应量解释 */
  effectSizeLabel: string
  /** 置信区间 */
  confidenceInterval: [number, number]
  /** 相对提升 */
  relativeLift: number
}

/** 实验报告 */
export interface ExperimentReport {
  experimentId: string
  experimentName: string
  status: ExperimentStatus
  duration: number
  totalSamples: number
  variants: {
    variantId: string
    variantName: string
    metrics: VariantMetrics
    isWinner: boolean
    isLoser: boolean
  }[]
  winner: {
    variantId: string
    variantName: string
    confidence: number
    lift: number
    effectSize: number
  } | null
  recommendation: string
  generatedAt: string
}

/** 实验模板 */
export interface ExperimentTemplate {
  id: string
  name: string
  description: string
  targetMetric: ExperimentMetric
  minSampleSize: number
  minDurationDays: number
  defaultVariants: Omit<ABTestVariant, 'id'>[]
}

// ---- 常量 ----

/** 指标标签 */
export const METRIC_LABELS: Record<ExperimentMetric, string> = {
  clickRate: '点击率',
  openRate: '打开率',
  conversionRate: '转化率',
  responseTime: '响应时间',
  dismissRate: '关闭率',
}

/** 指标方向（higher=越高越好，lower=越低越好） */
export const METRIC_DIRECTION: Record<ExperimentMetric, 'higher' | 'lower'> = {
  clickRate: 'higher',
  openRate: 'higher',
  conversionRate: 'higher',
  responseTime: 'lower',
  dismissRate: 'lower',
}

/** 预设实验模板 */
export const EXPERIMENT_TEMPLATES: ExperimentTemplate[] = [
  {
    id: 'template_timing',
    name: '触达时段实验',
    description: '测试不同推送时段对点击率的影响',
    targetMetric: 'clickRate',
    minSampleSize: 100,
    minDurationDays: 7,
    defaultVariants: [
      {
        name: '早间触达',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{greeting}}早安！',
        weight: 1,
      },
      {
        name: '午间触达',
        timeOffsetMinutes: 240,
        channels: ['browser'],
        messageTemplate: '{{greeting}}午安！',
        weight: 1,
      },
      {
        name: '晚间触达',
        timeOffsetMinutes: 480,
        channels: ['browser'],
        messageTemplate: '{{greeting}}晚安！',
        weight: 1,
      },
    ],
  },
  {
    id: 'template_channel',
    name: '渠道组合实验',
    description: '测试不同推送渠道组合对转化率的影响',
    targetMetric: 'conversionRate',
    minSampleSize: 150,
    minDurationDays: 7,
    defaultVariants: [
      {
        name: '纯浏览器通知',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
      {
        name: '浏览器+应用内',
        timeOffsetMinutes: 0,
        channels: ['browser', 'in-app'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
      {
        name: '浏览器+邮件',
        timeOffsetMinutes: 0,
        channels: ['browser', 'email'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
    ],
  },
  {
    id: 'template_message',
    name: '消息内容实验',
    description: '测试不同消息模板对打开率的影响',
    targetMetric: 'openRate',
    minSampleSize: 80,
    minDurationDays: 5,
    defaultVariants: [
      {
        name: '简洁版',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}: {{summary}}',
        weight: 1,
      },
      {
        name: '情感版',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{emoji}} {{title}} — {{emotional_summary}}',
        weight: 1,
      },
      {
        name: '行动版',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}。点击查看 {{action}}',
        weight: 1,
      },
    ],
  },
  {
    id: 'template_frequency',
    name: '推送频率实验',
    description: '测试不同推送频率对用户留存的影响',
    targetMetric: 'dismissRate',
    minSampleSize: 100,
    minDurationDays: 14,
    defaultVariants: [
      {
        name: '低频（每天1次）',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
      {
        name: '中频（每天3次）',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
      {
        name: '高频（每天5次）',
        timeOffsetMinutes: 0,
        channels: ['browser'],
        messageTemplate: '{{title}}',
        weight: 1,
      },
    ],
  },
]

// ---- 存储键 ----

const STORAGE_KEYS = {
  experiments: 'hf:touchpoints:ab_experiments',
  reports: 'hf:touchpoints:ab_reports',
  assignments: 'hf:touchpoints:ab_assignments',
}

// ============================================================
// 统计工具函数
// ============================================================

/**
 * 计算标准正态分布的 CDF（Abramowitz and Stegun 近似）
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)
  const t = 1 / (1 + p * x)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)
  return 0.5 * (1 + sign * y)
}

/**
 * 计算标准正态分布的逆 CDF（分位数函数）
 */
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity
  if (p >= 1) return Infinity

  const a = [
    -3.969683028665376e+1,
    2.209460984245205e+2,
    -2.759285104469687e+2,
    1.383577518672690e+2,
    -3.066479806614716e+1,
    2.506628277459239e+0,
  ]
  const b = [
    -5.447609879822406e+1,
    1.615858368580409e+2,
    -1.556989798598866e+2,
    6.680131188771972e+1,
    -1.328068155288572e+1,
  ]
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838e+0,
    -2.549732539343734e+0,
    4.374664141464968e+0,
    2.938163982698783e+0,
  ]
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996e+0,
    3.754408661907416e+0,
  ]

  const q = p - 0.5
  let r: number
  if (Math.abs(q) <= 0.425) {
    r = 0.180625 - q * q
    return q * (((((a[5] * r + a[4]) * r + a[3]) * r + a[2]) * r + a[1]) * r + a[0]) /
      (((((b[4] * r + b[3]) * r + b[2]) * r + b[1]) * r + b[0]) * r + 1)
  } else {
    r = q < 0 ? p : 1 - p
    r = Math.sqrt(-Math.log(r))
    let val = ((((c[5] * r + c[4]) * r + c[3]) * r + c[2]) * r + c[1]) * r + c[0]
    val /= ((d[3] * r + d[2]) * r + d[1]) * r + 1
    return q < 0 ? -val : val
  }
}

/**
 * Z检验：比较两个比例（双尾检验）
 */
function zTestForProportions(
  p1: number, n1: number,
  p2: number, n2: number,
): { zScore: number; pValue: number } {
  if (n1 === 0 || n2 === 0) return { zScore: 0, pValue: 1 }

  const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2)
  const pooledSE = Math.sqrt(pooledP * (1 - pooledP) * (1 / n1 + 1 / n2))

  if (pooledSE === 0) return { zScore: 0, pValue: 1 }

  const zScore = (p1 - p2) / pooledSE
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  return { zScore, pValue }
}

/**
 * Welch's t检验近似：比较两个均值
 */
function tTestForMeans(
  mean1: number, std1: number, n1: number,
  mean2: number, std2: number, n2: number,
): { tScore: number; pValue: number; df: number } {
  if (n1 < 2 || n2 < 2) return { tScore: 0, pValue: 1, df: 0 }

  const se = Math.sqrt((std1 * std1) / n1 + (std2 * std2) / n2)
  if (se === 0) return { tScore: 0, pValue: 1, df: 0 }

  const tScore = (mean1 - mean2) / se

  // Welch-Satterthwaite 自由度
  const num = ((std1 * std1) / n1 + (std2 * std2) / n2) ** 2
  const den = ((std1 * std1 / n1) ** 2) / (n1 - 1) + ((std2 * std2 / n2) ** 2) / (n2 - 1)
  const df = den > 0 ? num / den : n1 + n2 - 2

  // 使用正态近似（对于大样本）
  const pValue = 2 * (1 - normalCDF(Math.abs(tScore)))

  return { tScore, pValue, df }
}

/**
 * 计算 Cohen's d 效应量
 */
function cohensD(mean1: number, std1: number, n1: number, mean2: number, std2: number, n2: number): number {
  if (n1 < 2 || n2 < 2) return 0

  const pooledStd = Math.sqrt(
    ((n1 - 1) * std1 * std1 + (n2 - 1) * std2 * std2) / (n1 + n2 - 2),
  )
  if (pooledStd === 0) return 0

  return Math.abs(mean1 - mean2) / pooledStd
}

/**
 * 效应量解释
 */
function interpretEffectSize(d: number): string {
  if (d < 0.2) return '极小'
  if (d < 0.5) return '小'
  if (d < 0.8) return '中等'
  if (d < 1.2) return '大'
  return '极大'
}

/**
 * 计算比例置信区间（Wilson score interval）
 */
function wilsonCI(p: number, n: number, z: number = 1.96): [number, number] {
  if (n === 0) return [0, 0]

  const denominator = 1 + z * z / n
  const center = (p + z * z / (2 * n)) / denominator
  const margin = z * Math.sqrt((p * (1 - p) + z * z / (4 * n)) / n) / denominator

  return [Math.max(0, center - margin), Math.min(1, center + margin)]
}

/**
 * 估算所需样本量
 */
export function estimateSampleSize(
  baselineRate: number,
  minimumDetectableEffect: number,
  significanceLevel: number = 0.05,
  power: number = 0.8,
): number {
  const zAlpha = normalQuantile(1 - significanceLevel / 2)
  const zBeta = normalQuantile(power)

  const p1 = baselineRate
  const p2 = baselineRate + minimumDetectableEffect

  const pooledP = (p1 + p2) / 2
  const pooledQ = 1 - pooledP

  const numerator = (zAlpha * Math.sqrt(2 * pooledP * pooledQ) + zBeta * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2))) ** 2
  const denominator = minimumDetectableEffect ** 2

  return Math.ceil(numerator / denominator)
}

// ============================================================
// A/B 测试引擎
// ============================================================

export function useABTestEngine() {
  const experiments = ref<ABExperiment[]>(
    storage.getKV<ABExperiment[]>(STORAGE_KEYS.experiments, []),
  )
  const reports = ref<ExperimentReport[]>(
    storage.getKV<ExperimentReport[]>(STORAGE_KEYS.reports, []),
  )
  /** 用户-变体分配记录 */
  const assignments = ref<Record<string, string>>(
    storage.getKV<Record<string, string>>(STORAGE_KEYS.assignments, {}),
  )

  function persist() {
    storage.setKV(STORAGE_KEYS.experiments, experiments.value)
    storage.setKV(STORAGE_KEYS.reports, reports.value)
    storage.setKV(STORAGE_KEYS.assignments, assignments.value)
  }

  // ---- 实验管理 ----

  /** 从模板创建实验 */
  function createFromTemplate(
    templateId: string,
    name: string,
    description?: string,
  ): ABExperiment | null {
    const template = EXPERIMENT_TEMPLATES.find(t => t.id === templateId)
    if (!template) return null

    const variants: ABTestVariant[] = template.defaultVariants.map((v, i) => ({
      id: `var_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      ...v,
    }))

    const experiment: ABExperiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description: description ?? template.description,
      status: 'draft',
      startedAt: null,
      endedAt: null,
      targetMetric: template.targetMetric,
      minSampleSize: template.minSampleSize,
      minDurationDays: template.minDurationDays,
      significanceLevel: 0.05,
      variants,
      variantMetrics: {},
      winnerId: null,
      winnerConfidence: 0,
      resultSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    for (const v of variants) {
      experiment.variantMetrics[v.id] = {
        deliveries: 0,
        opens: 0,
        clicks: 0,
        conversions: 0,
        dismissals: 0,
        responseTimes: [],
        primaryMetric: 0,
        lift: null,
        ciLower: null,
        ciUpper: null,
        pValue: null,
        isSignificant: false,
      }
    }

    experiments.value.push(experiment)
    persist()
    return experiment
  }

  /** 创建自定义实验 */
  function createExperiment(
    name: string,
    description: string,
    targetMetric: ExperimentMetric,
    variants: Omit<ABTestVariant, 'id'>[],
    options?: {
      minSampleSize?: number
      minDurationDays?: number
      significanceLevel?: number
    },
  ): ABExperiment {
    const fullVariants: ABTestVariant[] = variants.map((v, i) => ({
      id: `var_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      ...v,
    }))

    const experiment: ABExperiment = {
      id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description,
      status: 'draft',
      startedAt: null,
      endedAt: null,
      targetMetric,
      minSampleSize: options?.minSampleSize ?? 100,
      minDurationDays: options?.minDurationDays ?? 7,
      significanceLevel: options?.significanceLevel ?? 0.05,
      variants: fullVariants,
      variantMetrics: {},
      winnerId: null,
      winnerConfidence: 0,
      resultSummary: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    for (const v of fullVariants) {
      experiment.variantMetrics[v.id] = {
        deliveries: 0,
        opens: 0,
        clicks: 0,
        conversions: 0,
        dismissals: 0,
        responseTimes: [],
        primaryMetric: 0,
        lift: null,
        ciLower: null,
        ciUpper: null,
        pValue: null,
        isSignificant: false,
      }
    }

    experiments.value.push(experiment)
    persist()
    return experiment
  }

  /** 开始实验 */
  function startExperiment(experimentId: string): boolean {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || exp.status !== 'draft') return false

    exp.status = 'running'
    exp.startedAt = new Date().toISOString()
    exp.updatedAt = new Date().toISOString()
    persist()
    return true
  }

  /** 停止实验 */
  function stopExperiment(experimentId: string): boolean {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || exp.status !== 'running') return false

    exp.status = 'stopped'
    exp.endedAt = new Date().toISOString()
    exp.updatedAt = new Date().toISOString()
    persist()
    return true
  }

  /** 完成实验 */
  function completeExperiment(experimentId: string): boolean {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || (exp.status !== 'running' && exp.status !== 'stopped')) return false

    exp.status = 'completed'
    exp.endedAt = exp.endedAt ?? new Date().toISOString()
    exp.updatedAt = new Date().toISOString()
    persist()
    return true
  }

  /** 归档实验 */
  function archiveExperiment(experimentId: string): boolean {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || exp.status !== 'completed') return false

    exp.status = 'archived'
    exp.updatedAt = new Date().toISOString()
    persist()
    return true
  }

  /** 删除实验 */
  function deleteExperiment(experimentId: string): boolean {
    const idx = experiments.value.findIndex(e => e.id === experimentId)
    if (idx === -1) return false

    experiments.value.splice(idx, 1)
    persist()
    return true
  }

  // ---- 变体分配 ----

  /** 为用户分配变体 */
  function assignVariant(experimentId: string, userId: string): ABTestVariant | null {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || (exp.status !== 'running' && exp.status !== 'draft')) return null

    const key = `${experimentId}:${userId}`

    // 已有分配则直接返回
    const existingVariantId = assignments.value[key]
    if (existingVariantId) {
      const variant = exp.variants.find(v => v.id === existingVariantId)
      if (variant) return variant
    }

    // 随机分配
    const totalWeight = exp.variants.reduce((sum, v) => sum + v.weight, 0)
    let random = Math.random() * totalWeight
    for (const v of exp.variants) {
      random -= v.weight
      if (random <= 0) {
        assignments.value[key] = v.id
        persist()
        return v
      }
    }

    const variant = exp.variants[0]
    assignments.value[key] = variant.id
    persist()
    return variant
  }

  /** 获取用户分配的变体 */
  function getUserVariant(experimentId: string, userId: string): ABTestVariant | null {
    const key = `${experimentId}:${userId}`
    const variantId = assignments.value[key]
    if (!variantId) return null

    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return null

    return exp.variants.find(v => v.id === variantId) ?? null
  }

  // ---- 指标记录 ----

  /** 记录指标事件 */
  function recordMetric(
    experimentId: string,
    variantId: string,
    action: 'delivery' | 'open' | 'click' | 'conversion' | 'dismiss',
    responseTime?: number,
  ) {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return

    const metrics = exp.variantMetrics[variantId]
    if (!metrics) return

    switch (action) {
      case 'delivery': metrics.deliveries++; break
      case 'open': metrics.opens++; break
      case 'click': metrics.clicks++; break
      case 'conversion': metrics.conversions++; break
      case 'dismiss': metrics.dismissals++; break
    }

    if (responseTime !== undefined) {
      metrics.responseTimes.push(responseTime)
    }

    exp.updatedAt = new Date().toISOString()
    persist()
  }

  /** 批量记录指标（从 PushRecord 同步） */
  function syncFromRecords(experimentId: string, variantId: string, records: PushRecord[]) {
    for (const r of records) {
      if (r.success) {
        recordMetric(experimentId, variantId, 'delivery', r.responseTimeMs ?? undefined)
        if (r.openedAt) recordMetric(experimentId, variantId, 'open')
        if (r.clickedAt) recordMetric(experimentId, variantId, 'click')
        if (r.dismissedAt) recordMetric(experimentId, variantId, 'dismiss')
      }
    }
  }

  // ---- 统计分析 ----

  /** 获取变体的主要指标值 */
  function getVariantPrimaryMetric(metrics: VariantMetrics, metric: ExperimentMetric): number {
    switch (metric) {
      case 'clickRate':
        return metrics.deliveries > 0 ? metrics.clicks / metrics.deliveries : 0
      case 'openRate':
        return metrics.deliveries > 0 ? metrics.opens / metrics.deliveries : 0
      case 'conversionRate':
        return metrics.deliveries > 0 ? metrics.conversions / metrics.deliveries : 0
      case 'dismissRate':
        return metrics.deliveries > 0 ? metrics.dismissals / metrics.deliveries : 0
      case 'responseTime':
        return metrics.responseTimes.length > 0
          ? metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
          : 0
    }
  }

  /** 计算变体指标的标准差 */
  function getVariantStd(metrics: VariantMetrics, metric: ExperimentMetric): number {
    if (metric === 'responseTime') {
      if (metrics.responseTimes.length < 2) return 0
      const mean = metrics.responseTimes.reduce((a, b) => a + b, 0) / metrics.responseTimes.length
      const variance = metrics.responseTimes.reduce((a, b) => a + (b - mean) ** 2, 0) / (metrics.responseTimes.length - 1)
      return Math.sqrt(variance)
    }
    // 比例的标准差
    const p = getVariantPrimaryMetric(metrics, metric)
    return Math.sqrt(p * (1 - p))
  }

  /** 执行显著性检验 */
  function testSignificance(
    experimentId: string,
    controlVariantId?: string,
  ): Record<string, SignificanceResult> | null {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp || exp.variants.length < 2) return null

    const control = controlVariantId
      ? exp.variants.find(v => v.id === controlVariantId)
      : exp.variants[0]
    if (!control) return null

    const controlMetrics = exp.variantMetrics[control.id]
    if (!controlMetrics || controlMetrics.deliveries < 5) return null

    const results: Record<string, SignificanceResult> = {}

    for (const variant of exp.variants) {
      if (variant.id === control.id) {
        results[variant.id] = {
          significant: false,
          pValue: 1,
          effectSize: 0,
          effectSizeLabel: '无',
          confidenceInterval: [0, 0],
          relativeLift: 0,
        }
        continue
      }

      const vm = exp.variantMetrics[variant.id]
      if (!vm || vm.deliveries < 5) {
        results[variant.id] = {
          significant: false,
          pValue: 1,
          effectSize: 0,
          effectSizeLabel: '无',
          confidenceInterval: [0, 0],
          relativeLift: 0,
        }
        continue
      }

      const isProportion = exp.targetMetric !== 'responseTime'
      let pValue: number
      let effectSize: number

      if (isProportion) {
        const p1 = getVariantPrimaryMetric(controlMetrics, exp.targetMetric)
        const p2 = getVariantPrimaryMetric(vm, exp.targetMetric)
        const test = zTestForProportions(p1, controlMetrics.deliveries, p2, vm.deliveries)
        pValue = test.pValue
        effectSize = Math.abs(p1 - p2) / Math.sqrt(
          ((p1 * (1 - p1)) / controlMetrics.deliveries) + ((p2 * (1 - p2)) / vm.deliveries),
        )
      } else {
        const mean1 = getVariantPrimaryMetric(controlMetrics, exp.targetMetric)
        const mean2 = getVariantPrimaryMetric(vm, exp.targetMetric)
        const std1 = getVariantStd(controlMetrics, exp.targetMetric)
        const std2 = getVariantStd(vm, exp.targetMetric)
        const test = tTestForMeans(mean1, std1, controlMetrics.responseTimes.length, mean2, std2, vm.responseTimes.length)
        pValue = test.pValue
        effectSize = cohensD(mean1, std1, controlMetrics.responseTimes.length, mean2, std2, vm.responseTimes.length)
      }

      const controlValue = getVariantPrimaryMetric(controlMetrics, exp.targetMetric)
      const variantValue = getVariantPrimaryMetric(vm, exp.targetMetric)
      const relativeLift = controlValue !== 0 ? (variantValue - controlValue) / controlValue : 0

      let ciLower: number, ciUpper: number
      if (isProportion) {
        const delta = variantValue - controlValue
        const se = Math.sqrt(
          (controlValue * (1 - controlValue)) / controlMetrics.deliveries +
          (variantValue * (1 - variantValue)) / vm.deliveries,
        )
        const z = normalQuantile(1 - exp.significanceLevel / 2)
        ciLower = delta - z * se
        ciUpper = delta + z * se
      } else {
        const ci = wilsonCI(variantValue, vm.deliveries)
        ciLower = ci[0]
        ciUpper = ci[1]
      }

      results[variant.id] = {
        significant: pValue < exp.significanceLevel,
        pValue,
        effectSize,
        effectSizeLabel: interpretEffectSize(effectSize),
        confidenceInterval: [ciLower, ciUpper],
        relativeLift,
      }
    }

    return results
  }

  /** 更新所有变体指标 */
  function updateVariantMetrics(experimentId: string) {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return

    const sigResults = testSignificance(experimentId)

    for (const variant of exp.variants) {
      const metrics = exp.variantMetrics[variant.id]
      if (!metrics) continue

      metrics.primaryMetric = getVariantPrimaryMetric(metrics, exp.targetMetric)

      if (sigResults && sigResults[variant.id]) {
        const sr = sigResults[variant.id]
        metrics.pValue = sr.pValue
        metrics.isSignificant = sr.significant
        metrics.ciLower = sr.confidenceInterval[0]
        metrics.ciUpper = sr.confidenceInterval[1]
        metrics.lift = sr.relativeLift
      }
    }

    persist()
  }

  // ---- 胜者判定 ----

  /** 判断实验胜者 */
  function determineWinner(experimentId: string): {
    winnerId: string | null
    confidence: number
    summary: string
  } {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return { winnerId: null, confidence: 0, summary: '实验不存在' }

    // 检查样本量是否足够
    const totalSamples = Object.values(exp.variantMetrics).reduce((sum, m) => sum + m.deliveries, 0)
    if (totalSamples < exp.minSampleSize) {
      return {
        winnerId: null,
        confidence: 0,
        summary: `样本量不足（当前 ${totalSamples}，需要 ${exp.minSampleSize}）`,
      }
    }

    // 检查运行天数
    if (exp.startedAt) {
      const days = (Date.now() - new Date(exp.startedAt).getTime()) / 86400000
      if (days < exp.minDurationDays) {
        return {
          winnerId: null,
          confidence: 0,
          summary: `实验时长不足（当前 ${days.toFixed(1)} 天，需要 ${exp.minDurationDays} 天）`,
        }
      }
    }

    updateVariantMetrics(experimentId)

    const direction = METRIC_DIRECTION[exp.targetMetric]
    const variants = exp.variants
      .map(v => ({ ...v, metrics: exp.variantMetrics[v.id] }))
      .filter(v => v.metrics && v.metrics.deliveries >= 5)

    if (variants.length < 2) {
      return { winnerId: null, confidence: 0, summary: '有效变体不足' }
    }

    // 按指标方向排序
    const sorted = [...variants].sort((a, b) => {
      const aVal = a.metrics?.primaryMetric ?? 0
      const bVal = b.metrics?.primaryMetric ?? 0
      return direction === 'higher' ? bVal - aVal : aVal - bVal
    })

    const best = sorted[0]
    if (!best.metrics) return { winnerId: null, confidence: 0, summary: '无有效数据' }

    // 检查是否显著优于第二名
    const second = sorted[1]
    if (second?.metrics) {
      const sigResults = testSignificance(experimentId)
      const bestResult = sigResults?.[best.id]
      if (!bestResult?.significant) {
        return {
          winnerId: null,
          confidence: 0,
          summary: `无法确定胜者：${best.name} 与 ${second.name} 差异不显著（p=${bestResult?.pValue.toFixed(3) ?? 'N/A'}）`,
        }
      }
    }

    const confidence = best.metrics.isSignificant
      ? Math.min(1, 1 - (best.metrics.pValue ?? 1))
      : 0.5

    const lift = best.metrics.lift ?? 0
    const liftPercent = (Math.abs(lift) * 100).toFixed(1)
    const liftDirection = lift > 0 ? '提升' : '降低'

    const summary = best.metrics.isSignificant
      ? `胜者: ${best.name}（${METRIC_LABELS[exp.targetMetric]} ${liftDirection} ${liftPercent}%，置信度 ${(confidence * 100).toFixed(0)}%）`
      : `趋势: ${best.name} 表现较优，但未达统计显著性`

    return { winnerId: best.id, confidence, summary }
  }

  /** 自动判定并更新胜者 */
  function autoDetermineWinner(experimentId: string) {
    const result = determineWinner(experimentId)
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return

    exp.winnerId = result.winnerId
    exp.winnerConfidence = result.confidence
    exp.resultSummary = result.summary
    exp.updatedAt = new Date().toISOString()
    persist()
  }

  // ---- 实验报告 ----

  /** 生成实验报告 */
  function generateReport(experimentId: string): ExperimentReport | null {
    const exp = experiments.value.find(e => e.id === experimentId)
    if (!exp) return null

    updateVariantMetrics(experimentId)
    const winnerResult = determineWinner(experimentId)

    const totalSamples = Object.values(exp.variantMetrics).reduce((sum, m) => sum + m.deliveries, 0)
    const duration = exp.endedAt && exp.startedAt
      ? (new Date(exp.endedAt).getTime() - new Date(exp.startedAt).getTime()) / 86400000
      : exp.startedAt
        ? (Date.now() - new Date(exp.startedAt).getTime()) / 86400000
        : 0

    const variantReports = exp.variants.map(v => {
      const metrics = exp.variantMetrics[v.id]
      return {
        variantId: v.id,
        variantName: v.name,
        metrics: metrics ?? {
          deliveries: 0, opens: 0, clicks: 0, conversions: 0, dismissals: 0,
          responseTimes: [], primaryMetric: 0, lift: null, ciLower: null, ciUpper: null,
          pValue: null, isSignificant: false,
        },
        isWinner: v.id === winnerResult.winnerId,
        isLoser: false,
      }
    })

    const report: ExperimentReport = {
      experimentId: exp.id,
      experimentName: exp.name,
      status: exp.status,
      duration: Math.round(duration * 10) / 10,
      totalSamples,
      variants: variantReports,
      winner: winnerResult.winnerId
        ? {
          variantId: winnerResult.winnerId,
          variantName: exp.variants.find(v => v.id === winnerResult.winnerId)?.name ?? '',
          confidence: winnerResult.confidence,
          lift: exp.variantMetrics[winnerResult.winnerId]?.lift ?? 0,
          effectSize: 0,
        }
        : null,
      recommendation: winnerResult.summary,
      generatedAt: new Date().toISOString(),
    }

    reports.value.push(report)
    if (reports.value.length > 20) {
      reports.value = reports.value.slice(-20)
    }
    persist()

    return report
  }

  // ---- 计算属性 ----

  const runningExperiments = computed(() =>
    experiments.value.filter(e => e.status === 'running'),
  )

  const completedExperiments = computed(() =>
    experiments.value.filter(e => e.status === 'completed'),
  )

  const draftExperiments = computed(() =>
    experiments.value.filter(e => e.status === 'draft'),
  )

  return {
    experiments,
    reports,
    runningExperiments,
    completedExperiments,
    draftExperiments,
    createFromTemplate,
    createExperiment,
    startExperiment,
    stopExperiment,
    completeExperiment,
    archiveExperiment,
    deleteExperiment,
    assignVariant,
    getUserVariant,
    recordMetric,
    syncFromRecords,
    testSignificance,
    updateVariantMetrics,
    determineWinner,
    autoDetermineWinner,
    generateReport,
    getVariantPrimaryMetric,
    persist,
  }
}