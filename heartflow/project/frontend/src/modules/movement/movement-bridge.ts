// ============================================================
// 动律之间 · 视图桥接层（P20-1）
// 为 MovementRoom.vue 提供标准化模块接口，替代直接 storage 调用
// ============================================================

import { ref, computed } from 'vue'
import { useMovementRhythm } from './rhythm'
import { useMovementAnalytics } from './movement-analytics'
import { useRecoveryOptimizer } from './recovery-optimizer'
import type { MovementRecord, MovementType, MovementIntensity, MovementRhythm } from './types'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from './types'
import type { FitnessAssessment, MovementRecommendation } from './movement-analytics'
import type { RecoveryScore, OvertrainingSignal, ActiveRecovery, RecoveryPlan, PeriodizationPlan } from './recovery-optimizer'

// ============================================================
// 类型定义
// ============================================================

/** 桥接层返回的完整运动状态 */
export interface MovementBridgeState {
  /** 运动记录列表 */
  records: MovementRecord[]
  /** 律动节奏 */
  rhythm: MovementRhythm
  /** 体能评估 */
  fitness: FitnessAssessment
  /** 恢复评分 */
  recoveryScore: RecoveryScore | null
  /** 过度训练信号 */
  overtrainingSignals: OvertrainingSignal[]
  /** 运动建议 */
  recommendations: MovementRecommendation[]
  /** 主动恢复推荐 */
  activeRecovery: ActiveRecovery[]
  /** 恢复计划 */
  recoveryPlan: RecoveryPlan | null
  /** 周期化训练计划 */
  periodizationPlan: PeriodizationPlan | null
  /** 运动模式 */
  movementPattern: {
    pattern: string
    consistency: number
    preferredTime: string
    preferredDays: string[]
    seasonalTrend: string
  }
}

/** 快捷统计 */
export interface QuickStats {
  /** 本周运动时长（分钟） */
  weeklyMinutes: number
  /** 本周运动次数 */
  weeklySessions: number
  /** 本周消耗卡路里 */
  weeklyCalories: number
  /** 连续运动天数 */
  streak: number
  /** 运动类型分布 */
  typeDistribution: { type: MovementType; label: string; icon: string; count: number }[]
  /** 最近记录 */
  recentRecords: MovementRecord[]
}

// ============================================================
// useMovementBridge Composable
// ============================================================

export function useMovementBridge() {
  // ---- 子模块 ----
  const rhythm = useMovementRhythm()
  const analytics = useMovementAnalytics()
  const recovery = useRecoveryOptimizer()

  // ---- 状态 ----
  const isLoading = ref(false)

  // ---- 初始化 ----

  /**
   * 从视图初始化桥接层
   * 替代 MovementRoom.vue 中的直接 storage 调用
   */
  function initialize(existingRecords?: MovementRecord[]): void {
    if (existingRecords && existingRecords.length > 0) {
      // 如果视图已有数据，同步到 rhythm 模块
      for (const r of existingRecords) {
        rhythm.recordMovement(r.type, r.duration, r.intensity, r.distance, r.feeling, r.note)
      }
    }
    refreshAll()
  }

  /**
   * 刷新所有分析数据
   */
  function refreshAll(): void {
    const allRecords = rhythm.records.value
    const rhythmState = rhythm.rhythm.value

    analytics.updateAnalytics(allRecords, rhythmState)
    analytics.assessFitness(allRecords)
    recovery.computeRecoveryScore(allRecords)
    recovery.detectOvertraining(allRecords)

    if (allRecords.length >= 3) {
      const score = recovery.recoveryScore.value!
      const signals = recovery.overtrainingSignals.value
      recovery.getActiveRecoveryRecommendations(allRecords, score)
      recovery.generateRecoveryPlan(allRecords, score, signals)
      recovery.generatePeriodizationPlan(allRecords)
    }
  }

  // ============================================================
  // 记录运动（统一入口）
  // ============================================================

  /**
   * 记录一次运动
   * 替代 MovementRoom.vue 中直接操作 storage 的逻辑
   */
  function logMovement(params: {
    type: MovementType
    duration: number
    intensity: MovementIntensity
    distance?: number
    feeling?: string
    note?: string
  }): MovementRecord {
    const record = rhythm.recordMovement(
      params.type, params.duration, params.intensity,
      params.distance, params.feeling, params.note,
    )
    refreshAll()
    return record
  }

  /**
   * 删除运动记录
   */
  function removeMovement(id: string): boolean {
    const result = rhythm.removeRecord(id)
    if (result) refreshAll()
    return result
  }

  // ============================================================
  // 快捷统计
  // ============================================================

  /** 快捷统计 */
  const quickStats = computed<QuickStats>(() => {
    const weekly = rhythm.getWeeklyStats()

    const typeDistribution = Object.entries(weekly.byType).map(([type, count]) => {
      const meta = MOVEMENT_TYPE_META[type as MovementType]
      return {
        type: type as MovementType,
        label: meta?.label ?? type,
        icon: meta?.icon ?? '🎯',
        count,
      }
    }).sort((a, b) => b.count - a.count)

    return {
      weeklyMinutes: weekly.totalMinutes,
      weeklySessions: weekly.sessions,
      weeklyCalories: weekly.totalCalories,
      streak: rhythm.rhythm.value.streak,
      typeDistribution,
      recentRecords: rhythm.getRecentRecords(10),
    }
  })

  // ============================================================
  // 完整状态
  // ============================================================

  /** 完整桥接状态 */
  const bridgeState = computed<MovementBridgeState>(() => {
    const allRecords = rhythm.records.value
    const movementPattern = recovery.identifyMovementPatterns(allRecords)

    return {
      records: allRecords,
      rhythm: rhythm.rhythm.value,
      fitness: analytics.fitness.value,
      recoveryScore: recovery.recoveryScore.value,
      overtrainingSignals: recovery.overtrainingSignals.value,
      recommendations: analytics.generateRecommendations(allRecords),
      activeRecovery: recovery.recoveryScore.value
        ? recovery.getActiveRecoveryRecommendations(allRecords, recovery.recoveryScore.value)
        : [],
      recoveryPlan: recovery.recoveryPlan.value,
      periodizationPlan: recovery.periodizationPlan.value,
      movementPattern,
    }
  })

  return {
    // 状态
    isLoading,
    quickStats,
    bridgeState,

    // 记录操作
    logMovement,
    removeMovement,

    // 子模块访问（供高级场景使用）
    rhythm,
    analytics,
    recovery,

    // 生命周期
    initialize,
    refreshAll,
  }
}

// ============================================================
// 导出常量
// ============================================================

export { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META }
export type { MovementRecord, MovementType, MovementIntensity, MovementRhythm }
export type { FitnessAssessment, MovementRecommendation }
export type { RecoveryScore, OvertrainingSignal, ActiveRecovery, RecoveryPlan, PeriodizationPlan }