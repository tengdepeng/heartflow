// ============================================================
// 根脉之庭 · 智能衰减引擎（P20-5）
// 时间衰减 + 强度保护 + 生命力评分 + 衰减报告
// ============================================================

import { ref } from 'vue'
import type { Root, RootLayer } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 衰减配置 */
export interface DecayConfig {
  /** 衰减阈值（天），超过此天数开始衰减 */
  thresholdDays: number
  /** 基础衰减率（每周） */
  baseDecayRate: number
  /** 最低强度保护 */
  minStrength: number
  /** 是否启用保护期（新节点 7 天内不衰减） */
  enableProtection: boolean
  /** 保护期天数 */
  protectionDays: number
  /** 是否考虑连接数保护（连接越多衰减越慢） */
  enableConnectionShield: boolean
  /** 是否考虑标签保护（有标签的节点衰减减半） */
  enableTagShield: boolean
}

/** 衰减记录 */
export interface DecayRecord {
  /** 根系 ID */
  rootId: string
  /** 根系名称 */
  rootText: string
  /** 衰减前强度 */
  strengthBefore: number
  /** 衰减后强度 */
  strengthAfter: number
  /** 衰减量 */
  decayAmount: number
  /** 距上次更新天数 */
  daysSinceUpdate: number
  /** 是否被保护 */
  wasProtected: boolean
  /** 保护原因 */
  protectionReason?: string
  /** 衰减时间 */
  decayedAt: string
}

/** 衰减报告 */
export interface DecayReport {
  /** 总衰减记录 */
  records: DecayRecord[]
  /** 衰减根系数 */
  decayedCount: number
  /** 被保护根系数 */
  protectedCount: number
  /** 总衰减量 */
  totalDecay: number
  /** 平均衰减量 */
  avgDecay: number
  /** 最严重衰减 */
  worstDecay: DecayRecord | null
  /** 建议 */
  recommendations: string[]
  /** 报告时间 */
  generatedAt: string
}

/** 生命力评分 */
export interface VitalityScore {
  /** 根系 ID */
  rootId: string
  /** 根系名称 */
  rootText: string
  /** 层级 */
  layer: RootLayer
  /** 生命力评分 0-100 */
  score: number
  /** 强度因子 */
  strengthFactor: number
  /** 时效因子 */
  recencyFactor: number
  /** 连接因子 */
  connectionFactor: number
  /** 标签因子 */
  tagFactor: number
  /** 状态 */
  status: 'thriving' | 'healthy' | 'stable' | 'waning' | 'critical'
  /** 建议 */
  suggestion: string
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  thresholdDays: 14,
  baseDecayRate: 0.03,
  minStrength: 0.05,
  enableProtection: true,
  protectionDays: 7,
  enableConnectionShield: true,
  enableTagShield: true,
}

// ============================================================
// useDecayEngine Composable
// ============================================================

export function useDecayEngine() {
  // ---- 状态 ----
  const config = ref<DecayConfig>({ ...DEFAULT_DECAY_CONFIG })
  const report = ref<DecayReport | null>(null)
  const lastCheck = ref<string | null>(null)

  // ---- 配置管理 ----

  /**
   * 更新衰减配置
   */
  function updateConfig(updates: Partial<DecayConfig>): void {
    config.value = { ...config.value, ...updates }
  }

  /**
   * 重置为默认配置
   */
  function resetConfig(): void {
    config.value = { ...DEFAULT_DECAY_CONFIG }
  }

  // ---- 衰减计算 ----

  /**
   * 计算单个根系的衰减量
   */
  function calculateDecay(root: Root, now: Date = new Date()): { decayAmount: number; wasProtected: boolean; protectionReason?: string } {
    const updatedAt = new Date(root.lastUpdatedAt)
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / 86400000

    // 保护期检查
    if (config.value.enableProtection && daysSinceUpdate < config.value.protectionDays) {
      return {
        decayAmount: 0,
        wasProtected: true,
        protectionReason: `处于保护期内（${Math.round(daysSinceUpdate)} 天 < ${config.value.protectionDays} 天）`,
      }
    }

    // 阈值检查
    if (daysSinceUpdate < config.value.thresholdDays) {
      return {
        decayAmount: 0,
        wasProtected: true,
        protectionReason: `未达衰减阈值（${Math.round(daysSinceUpdate)} 天 < ${config.value.thresholdDays} 天）`,
      }
    }

    // 基础衰减
    const weeksPassed = (daysSinceUpdate - config.value.thresholdDays) / 7
    let decayRate = config.value.baseDecayRate * weeksPassed

    // 连接保护
    if (config.value.enableConnectionShield && root.connections.length > 0) {
      const shieldFactor = Math.min(root.connections.length * 0.05, 0.5)
      decayRate *= (1 - shieldFactor)
    }

    // 标签保护
    if (config.value.enableTagShield && root.tags.length > 0) {
      decayRate *= 0.5
    }

    const decayAmount = Math.min(decayRate, root.strength - config.value.minStrength)

    return {
      decayAmount: Math.max(decayAmount, 0),
      wasProtected: decayAmount < 0.001,
      protectionReason: decayAmount < 0.001 ? '保护机制生效（连接数/标签/强度已达下限）' : undefined,
    }
  }

  /**
   * 运行衰减检查
   */
  function runDecayCheck(roots: Root[]): DecayReport {
    const now = new Date()
    const records: DecayRecord[] = []

    for (const root of roots) {
      const { decayAmount, wasProtected, protectionReason } = calculateDecay(root, now)

      if (decayAmount > 0.001) {
        const strengthBefore = root.strength
        root.strength = Math.max(
          config.value.minStrength,
          +(root.strength - decayAmount).toFixed(3)
        )

        const updatedAt = new Date(root.lastUpdatedAt)
        const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / 86400000

        records.push({
          rootId: root.id,
          rootText: root.text,
          strengthBefore,
          strengthAfter: root.strength,
          decayAmount: +decayAmount.toFixed(4),
          daysSinceUpdate: Math.round(daysSinceUpdate),
          wasProtected: false,
          decayedAt: now.toISOString(),
        })
      } else if (wasProtected) {
        const updatedAt = new Date(root.lastUpdatedAt)
        const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / 86400000

        records.push({
          rootId: root.id,
          rootText: root.text,
          strengthBefore: root.strength,
          strengthAfter: root.strength,
          decayAmount: 0,
          daysSinceUpdate: Math.round(daysSinceUpdate),
          wasProtected: true,
          protectionReason,
          decayedAt: now.toISOString(),
        })
      }
    }

    const decayedRecords = records.filter(r => !r.wasProtected)
    const protectedRecords = records.filter(r => r.wasProtected)

    const totalDecay = decayedRecords.reduce((s, r) => s + r.decayAmount, 0)
    const avgDecay = decayedRecords.length > 0
      ? totalDecay / decayedRecords.length
      : 0

    const worstDecay = decayedRecords.length > 0
      ? decayedRecords.reduce((worst, r) =>
          r.decayAmount > worst.decayAmount ? r : worst, decayedRecords[0])
      : null

    // 生成建议
    const recommendations: string[] = []

    if (decayedRecords.length > 0) {
      recommendations.push(
        `${decayedRecords.length} 个根系发生了衰减，建议定期回顾和更新`
      )
    }

    if (worstDecay && worstDecay.decayAmount > 0.1) {
      recommendations.push(
        `「${worstDecay.rootText}」衰减严重（${worstDecay.decayAmount.toFixed(2)}），建议尽快更新内容或添加关联`
      )
    }

    if (protectedRecords.length > 0 && decayedRecords.length === 0) {
      recommendations.push('所有根系均受到保护，暂无衰减风险')
    }

    const decayReport: DecayReport = {
      records,
      decayedCount: decayedRecords.length,
      protectedCount: protectedRecords.length,
      totalDecay: +totalDecay.toFixed(4),
      avgDecay: +avgDecay.toFixed(4),
      worstDecay,
      recommendations,
      generatedAt: now.toISOString(),
    }

    report.value = decayReport
    lastCheck.value = now.toISOString()
    return decayReport
  }

  /**
   * 计算生命力评分
   */
  function calculateVitality(root: Root, now: Date = new Date()): VitalityScore {
    const updatedAt = new Date(root.lastUpdatedAt)
    const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / 86400000

    // 强度因子 (0-40)
    const strengthFactor = Math.round(root.strength * 40)

    // 时效因子 (0-30)
    const recencyFactor = Math.round(Math.max(0, 30 - daysSinceUpdate * 0.5))

    // 连接因子 (0-20)
    const connectionFactor = Math.round(Math.min(root.connections.length * 4, 20))

    // 标签因子 (0-10)
    const tagFactor = Math.round(Math.min(root.tags.length * 3, 10))

    const totalScore = Math.min(strengthFactor + recencyFactor + connectionFactor + tagFactor, 100)

    let status: VitalityScore['status']
    if (totalScore >= 80) status = 'thriving'
    else if (totalScore >= 60) status = 'healthy'
    else if (totalScore >= 40) status = 'stable'
    else if (totalScore >= 20) status = 'waning'
    else status = 'critical'

    const suggestion = generateVitalitySuggestion(status, root, daysSinceUpdate)

    return {
      rootId: root.id,
      rootText: root.text,
      layer: root.layer,
      score: totalScore,
      strengthFactor,
      recencyFactor,
      connectionFactor,
      tagFactor,
      status,
      suggestion,
    }
  }

  /**
   * 批量计算所有根系生命力
   */
  function calculateAllVitality(roots: Root[]): VitalityScore[] {
    const now = new Date()
    return roots.map(r => calculateVitality(r, now))
  }

  /**
   * 预测未来衰减
   */
  function predictDecay(root: Root, daysAhead: number): {
    predictedStrength: number
    willReachMin: boolean
    daysToMin: number | null
  } {
    const updatedAt = new Date(root.lastUpdatedAt)
    const futureDate = new Date(Date.now() + daysAhead * 86400000)
    const cfg = config.value
    const daysSinceUpdate = (futureDate.getTime() - updatedAt.getTime()) / 86400000

    if (daysSinceUpdate < cfg.thresholdDays) {
      return {
        predictedStrength: root.strength,
        willReachMin: false,
        daysToMin: null,
      }
    }

    const weeksPassed = (daysSinceUpdate - cfg.thresholdDays) / 7
    let decayRate = cfg.baseDecayRate * weeksPassed

    if (cfg.enableConnectionShield && root.connections.length > 0) {
      decayRate *= (1 - Math.min(root.connections.length * 0.05, 0.5))
    }

    if (cfg.enableTagShield && root.tags.length > 0) {
      decayRate *= 0.5
    }

    const predictedStrength = Math.max(
      cfg.minStrength,
      +(root.strength - decayRate).toFixed(3)
    )

    const willReachMin = predictedStrength <= cfg.minStrength

    // 计算到达最低强度所需天数
    let daysToMin: number | null = null
    if (decayRate > 0.001) {
      const decayPerWeek = decayRate / weeksPassed
      if (decayPerWeek > 0) {
        const remainingStrength = root.strength - cfg.minStrength
        const weeksToMin = remainingStrength / decayPerWeek
        daysToMin = Math.round(weeksToMin * 7 + cfg.thresholdDays)
      }
    }

    return {
      predictedStrength,
      willReachMin,
      daysToMin,
    }
  }

  return {
    // 状态
    config,
    report,
    lastCheck,

    // 配置
    updateConfig,
    resetConfig,

    // 衰减
    calculateDecay,
    runDecayCheck,
    predictDecay,

    // 生命力
    calculateVitality,
    calculateAllVitality,
  }
}

// ============================================================
// 内部函数
// ============================================================

function generateVitalitySuggestion(
  status: VitalityScore['status'],
  root: Root,
  daysSinceUpdate: number,
): string {
  switch (status) {
    case 'thriving':
      return '生命力旺盛，继续保持当前状态'
    case 'healthy':
      return '状态良好，建议定期回顾以保持活力'
    case 'stable':
      return '根系稳定，建议补充更多细节或建立新连接'
    case 'waning':
      if (daysSinceUpdate > 30) {
        return `已 ${Math.round(daysSinceUpdate)} 天未更新，建议尽快回顾并刷新内容`
      }
      if (root.connections.length === 0) {
        return '缺少关联，建议添加与其他根系的连接'
      }
      return '生命力下降，建议补充标签或增加连接'
    case 'critical':
      if (daysSinceUpdate > 60) {
        return `严重衰减！已 ${Math.round(daysSinceUpdate)} 天未更新，需要立即关注`
      }
      return '生命力危急，建议立即更新内容并建立连接'
    default:
      return '需要关注'
  }
}