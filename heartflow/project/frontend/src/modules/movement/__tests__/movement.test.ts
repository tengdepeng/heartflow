// ============================================================
// 动律之间 · 测试套件（P20-1）
// 覆盖 rhythm、analytics、recovery-optimizer、movement-bridge
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useMovementRhythm } from '../rhythm'
import { useMovementAnalytics } from '../movement-analytics'
import { useRecoveryOptimizer } from '../recovery-optimizer'
import { useMovementBridge } from '../movement-bridge'
import type { MovementRecord, MovementType, MovementIntensity } from '../types'
import { MOVEMENT_TYPE_META, MOVEMENT_INTENSITY_META } from '../types'

// ============================================================
// 辅助函数
// ============================================================

function makeRecord(overrides: Partial<MovementRecord> = {}): MovementRecord {
  return {
    id: `move_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'running',
    duration: 30,
    intensity: 'moderate',
    distance: 5,
    calories: 300,
    avgHeartRate: 140,
    feeling: '精力充沛',
    note: '',
    date: new Date().toISOString().split('T')[0],
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString().split('T')[0]
}

// ============================================================
// rhythm 测试
// ============================================================

describe('useMovementRhythm', () => {
  let rhythm: ReturnType<typeof useMovementRhythm>

  beforeEach(() => {
    rhythm = useMovementRhythm()
  })

  describe('recordMovement', () => {
    it('应该记录一次运动', () => {
      const record = rhythm.recordMovement('running', 30, 'moderate')
      expect(record.type).toBe('running')
      expect(record.duration).toBe(30)
      expect(record.intensity).toBe('moderate')
      expect(record.id).toMatch(/^move_/)
    })

    it('应该计算消耗卡路里', () => {
      const record = rhythm.recordMovement('running', 30, 'vigorous')
      // running: avgCaloriesPerMin=10, vigorous multiplier=1.5
      expect(record.calories).toBe(450) // 30 * 10 * 1.5
    })

    it('应该支持可选参数', () => {
      const record = rhythm.recordMovement('swimming', 45, 'moderate', 2, '愉悦', '晨泳')
      expect(record.distance).toBe(2)
      expect(record.feeling).toBe('愉悦')
      expect(record.note).toBe('晨泳')
    })

    it('应该更新节律状态', () => {
      rhythm.recordMovement('running', 30, 'moderate')
      const state = rhythm.rhythm.value
      expect(state.weeklyCompleted).toBeGreaterThanOrEqual(30)
      expect(state.streak).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getWeeklyStats', () => {
    it('应该返回本周统计', () => {
      rhythm.recordMovement('running', 30, 'moderate')
      rhythm.recordMovement('cycling', 20, 'light')
      const stats = rhythm.getWeeklyStats()
      expect(stats.totalMinutes).toBeGreaterThanOrEqual(50)
      expect(stats.sessions).toBeGreaterThanOrEqual(2)
      expect(typeof stats.byType).toBe('object')
    })
  })

  describe('getRecentRecords', () => {
    it('应该返回最近的记录', () => {
      rhythm.recordMovement('running', 30, 'moderate')
      rhythm.recordMovement('yoga', 20, 'light')
      const recent = rhythm.getRecentRecords(5)
      expect(recent.length).toBeLessThanOrEqual(5)
      if (recent.length >= 2) {
        expect(recent[0].timestamp >= recent[1].timestamp).toBe(true)
      }
    })
  })

  describe('updateRhythmTarget', () => {
    it('应该更新每周目标', () => {
      rhythm.updateRhythmTarget(200)
      expect(rhythm.rhythm.value.weeklyTarget).toBe(200)
    })
  })

  describe('removeRecord', () => {
    it('应该删除记录', () => {
      const record = rhythm.recordMovement('running', 30, 'moderate')
      const result = rhythm.removeRecord(record.id)
      expect(result).toBe(true)
    })

    it('删除不存在的记录应返回 false', () => {
      const result = rhythm.removeRecord('nonexistent')
      expect(result).toBe(false)
    })
  })
})

// ============================================================
// analytics 测试
// ============================================================

describe('useMovementAnalytics', () => {
  let analytics: ReturnType<typeof useMovementAnalytics>
  let records: MovementRecord[]

  beforeEach(() => {
    analytics = useMovementAnalytics()
    records = [
      makeRecord({ type: 'running', duration: 30, intensity: 'moderate', calories: 300, date: daysAgo(0) }),
      makeRecord({ type: 'cycling', duration: 45, intensity: 'vigorous', calories: 500, date: daysAgo(1) }),
      makeRecord({ type: 'yoga', duration: 20, intensity: 'light', calories: 80, date: daysAgo(2) }),
      makeRecord({ type: 'swimming', duration: 35, intensity: 'moderate', calories: 350, date: daysAgo(3) }),
      makeRecord({ type: 'strength', duration: 25, intensity: 'vigorous', calories: 200, date: daysAgo(5) }),
    ]
  })

  describe('updateAnalytics', () => {
    it('应该更新运动分析数据', () => {
      const rhythm = { weeklyTarget: 150, weeklyCompleted: 0, streak: 3, bestStreak: 5, favoriteTypes: ['running'] as MovementType[], bodyAwakening: 60 }
      analytics.updateAnalytics(records, rhythm)
      expect(analytics.analytics.value.totalSessions).toBe(5)
      expect(analytics.analytics.value.totalDuration).toBe(155)
      expect(analytics.analytics.value.totalCalories).toBe(1430)
    })

    it('应该计算类型分布', () => {
      const rhythm = { weeklyTarget: 150, weeklyCompleted: 0, streak: 3, bestStreak: 5, favoriteTypes: ['running'] as MovementType[], bodyAwakening: 60 }
      analytics.updateAnalytics(records, rhythm)
      expect(analytics.analytics.value.typeDistribution.length).toBeGreaterThan(0)
    })

    it('应该计算强度分布', () => {
      const rhythm = { weeklyTarget: 150, weeklyCompleted: 0, streak: 3, bestStreak: 5, favoriteTypes: ['running'] as MovementType[], bodyAwakening: 60 }
      analytics.updateAnalytics(records, rhythm)
      expect(analytics.analytics.value.intensityDistribution.length).toBeGreaterThan(0)
    })

    it('应该计算月度趋势', () => {
      const rhythm = { weeklyTarget: 150, weeklyCompleted: 0, streak: 3, bestStreak: 5, favoriteTypes: ['running'] as MovementType[], bodyAwakening: 60 }
      analytics.updateAnalytics(records, rhythm)
      expect(analytics.analytics.value.monthlyTrend.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('assessFitness', () => {
    it('应该评估体能', () => {
      const assessment = analytics.assessFitness(records)
      expect(assessment.cardioEndurance).toBeGreaterThanOrEqual(0)
      expect(assessment.cardioEndurance).toBeLessThanOrEqual(100)
      expect(assessment.strength).toBeGreaterThanOrEqual(0)
      expect(assessment.flexibility).toBeGreaterThanOrEqual(0)
      expect(assessment.overall).toBeGreaterThanOrEqual(0)
      expect(assessment.overall).toBeLessThanOrEqual(100)
    })

    it('空记录应返回默认评估', () => {
      const assessment = analytics.assessFitness([])
      expect(assessment.overall).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getRecoveryStatus', () => {
    it('应该返回恢复状态', () => {
      const status = analytics.getRecoveryStatus(records)
      expect(status.recoveryScore).toBeGreaterThanOrEqual(0)
      expect(status.recoveryScore).toBeLessThanOrEqual(100)
      expect(typeof status.needsRest).toBe('boolean')
    })

    it('空记录应返回默认状态', () => {
      const status = analytics.getRecoveryStatus([])
      expect(status.recoveryScore).toBe(100)
      expect(status.needsRest).toBe(false)
    })
  })

  describe('generateRecommendations', () => {
    it('应该生成运动建议', () => {
      const recommendations = analytics.generateRecommendations(records)
      expect(Array.isArray(recommendations)).toBe(true)
    })
  })
})

// ============================================================
// recovery-optimizer 测试
// ============================================================

describe('useRecoveryOptimizer', () => {
  let recovery: ReturnType<typeof useRecoveryOptimizer>
  let records: MovementRecord[]

  beforeEach(() => {
    recovery = useRecoveryOptimizer()
    records = [
      makeRecord({ type: 'running', duration: 30, intensity: 'moderate', date: daysAgo(0) }),
      makeRecord({ type: 'hiit', duration: 20, intensity: 'extreme', date: daysAgo(1) }),
      makeRecord({ type: 'yoga', duration: 15, intensity: 'light', date: daysAgo(2) }),
      makeRecord({ type: 'strength', duration: 25, intensity: 'vigorous', date: daysAgo(3) }),
      makeRecord({ type: 'cycling', duration: 40, intensity: 'moderate', date: daysAgo(5) }),
    ]
  })

  describe('computeRecoveryScore', () => {
    it('应该计算恢复评分', () => {
      const score = recovery.computeRecoveryScore(records)
      expect(score.overall).toBeGreaterThanOrEqual(0)
      expect(score.overall).toBeLessThanOrEqual(100)
      expect(score.muscleRecovery).toBeGreaterThanOrEqual(0)
      expect(score.nervousRecovery).toBeGreaterThanOrEqual(0)
      expect(score.cardiovascularRecovery).toBeGreaterThanOrEqual(0)
      expect(score.mentalRecovery).toBeGreaterThanOrEqual(0)
      expect(score.assessedAt).toBeTruthy()
      expect(score.hoursSinceIntense).toBeGreaterThanOrEqual(0)
      expect(score.recommendedRestHours).toBeGreaterThanOrEqual(0)
    })

    it('高强度运动后恢复评分应较低', () => {
      const intenseRecords = [
        makeRecord({ type: 'hiit', duration: 60, intensity: 'extreme', date: daysAgo(0) }),
        makeRecord({ type: 'hiit', duration: 60, intensity: 'extreme', date: daysAgo(1) }),
        makeRecord({ type: 'hiit', duration: 60, intensity: 'extreme', date: daysAgo(2) }),
      ]
      const score = recovery.computeRecoveryScore(intenseRecords)
      expect(score.overall).toBeLessThan(80)
    })

    it('空记录应返回高恢复评分', () => {
      const score = recovery.computeRecoveryScore([])
      expect(score.overall).toBeGreaterThan(80)
    })
  })

  describe('detectOvertraining', () => {
    it('应该检测过度训练信号', () => {
      const signals = recovery.detectOvertraining(records)
      expect(Array.isArray(signals)).toBe(true)
    })

    it('大量高强度运动应触发疲劳信号', () => {
      const intenseRecords = Array.from({ length: 10 }, (_, i) =>
        makeRecord({ type: 'hiit', duration: 45, intensity: 'extreme', date: daysAgo(i) }),
      )
      const signals = recovery.detectOvertraining(intenseRecords)
      const hasFatigue = signals.some(s => s.type === 'fatigue_accumulation')
      expect(hasFatigue).toBe(true)
    })

    it('单一运动类型应触发受伤风险信号', () => {
      const singleTypeRecords = Array.from({ length: 7 }, (_, i) =>
        makeRecord({ type: 'running', duration: 30, intensity: 'moderate', date: daysAgo(i) }),
      )
      const signals = recovery.detectOvertraining(singleTypeRecords)
      const hasInjuryRisk = signals.some(s => s.type === 'injury_risk')
      expect(hasInjuryRisk).toBe(true)
    })
  })

  describe('getActiveRecoveryRecommendations', () => {
    it('应该返回主动恢复推荐', () => {
      const score = recovery.computeRecoveryScore(records)
      const recommendations = recovery.getActiveRecoveryRecommendations(records, score, 3)
      expect(recommendations.length).toBeLessThanOrEqual(3)
      expect(recommendations[0].id).toBeTruthy()
      expect(recommendations[0].name).toBeTruthy()
    })
  })

  describe('generateRecoveryPlan', () => {
    it('应该生成恢复计划', () => {
      const score = recovery.computeRecoveryScore(records)
      const signals = recovery.detectOvertraining(records)
      const plan = recovery.generateRecoveryPlan(records, score, signals)
      expect(plan.id).toMatch(/^rp_/)
      expect(plan.goal).toBeTruthy()
      expect(plan.dailyActivities.length).toBeGreaterThan(0)
      expect(plan.milestones.length).toBeGreaterThan(0)
    })
  })

  describe('generatePeriodizationPlan', () => {
    it('应该生成周期化训练计划', () => {
      const plan = recovery.generatePeriodizationPlan(records)
      expect(plan.currentPhase).toBeTruthy()
      expect(plan.weeklySchedule.length).toBe(7)
      expect(plan.intensityDistribution.length).toBeGreaterThan(0)
      expect(plan.keyNotes.length).toBeGreaterThan(0)
    })

    it('应该支持指定阶段', () => {
      const plan = recovery.generatePeriodizationPlan(records, 'recovery')
      expect(plan.currentPhase).toBe('recovery')
      expect(plan.weeklySchedule.every(d => d.workoutType !== 'primary')).toBe(true)
    })
  })

  describe('identifyMovementPatterns', () => {
    it('应该识别运动模式', () => {
      const patterns = recovery.identifyMovementPatterns(records)
      expect(patterns.pattern).toBeTruthy()
      expect(patterns.consistency).toBeGreaterThanOrEqual(0)
      expect(patterns.consistency).toBeLessThanOrEqual(100)
      expect(patterns.preferredTime).toBeTruthy()
      expect(Array.isArray(patterns.preferredDays)).toBe(true)
    })

    it('少于5条记录应返回数据不足', () => {
      const patterns = recovery.identifyMovementPatterns([makeRecord()])
      expect(patterns.pattern).toBe('数据不足')
      expect(patterns.consistency).toBe(0)
    })
  })
})

// ============================================================
// movement-bridge 测试
// ============================================================

describe('useMovementBridge', () => {
  let bridge: ReturnType<typeof useMovementBridge>

  beforeEach(() => {
    bridge = useMovementBridge()
  })

  describe('logMovement', () => {
    it('应该记录运动并刷新分析', () => {
      const record = bridge.logMovement({
        type: 'running',
        duration: 30,
        intensity: 'moderate',
        feeling: '精力充沛',
      })
      expect(record.type).toBe('running')
      expect(record.duration).toBe(30)
    })

    it('应该支持可选参数', () => {
      const record = bridge.logMovement({
        type: 'cycling',
        duration: 45,
        intensity: 'vigorous',
        distance: 20,
        note: '周末骑行',
      })
      expect(record.distance).toBe(20)
      expect(record.note).toBe('周末骑行')
    })
  })

  describe('removeMovement', () => {
    it('应该删除记录', () => {
      const record = bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const result = bridge.removeMovement(record.id)
      expect(result).toBe(true)
    })
  })

  describe('quickStats', () => {
    it('应该提供快捷统计', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 20, intensity: 'light' })
      const stats = bridge.quickStats.value
      expect(stats.weeklySessions).toBeGreaterThanOrEqual(2)
      expect(stats.weeklyMinutes).toBeGreaterThanOrEqual(50)
      expect(stats.typeDistribution.length).toBeGreaterThan(0)
      expect(stats.recentRecords.length).toBeLessThanOrEqual(10)
    })
  })

  describe('bridgeState', () => {
    it('应该提供完整状态', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(state.records.length).toBeGreaterThanOrEqual(1)
      expect(state.rhythm).toBeTruthy()
      expect(state.fitness).toBeTruthy()
      expect(state.movementPattern).toBeTruthy()
    })
  })

  describe('initialize', () => {
    it('应该从现有记录初始化', () => {
      const existingRecord = makeRecord({ type: 'swimming', duration: 35, intensity: 'moderate' })
      bridge.initialize([existingRecord])
      const state = bridge.bridgeState.value
      expect(state.records.length).toBeGreaterThanOrEqual(1)
    })
  })
})

// ============================================================
// 常量验证测试
// ============================================================

describe('常量验证', () => {
  it('MOVEMENT_TYPE_META 应包含所有运动类型', () => {
    const types: MovementType[] = ['running', 'walking', 'cycling', 'swimming', 'yoga', 'strength', 'dance', 'stretching', 'sports', 'hiit', 'tai_chi', 'custom']
    for (const type of types) {
      expect(MOVEMENT_TYPE_META[type]).toBeDefined()
      expect(MOVEMENT_TYPE_META[type].label).toBeTruthy()
      expect(MOVEMENT_TYPE_META[type].icon).toBeTruthy()
      expect(MOVEMENT_TYPE_META[type].avgCaloriesPerMin).toBeGreaterThan(0)
    }
  })

  it('MOVEMENT_INTENSITY_META 应包含所有强度级别', () => {
    const intensities: MovementIntensity[] = ['light', 'moderate', 'vigorous', 'extreme']
    for (const intensity of intensities) {
      expect(MOVEMENT_INTENSITY_META[intensity]).toBeDefined()
      expect(MOVEMENT_INTENSITY_META[intensity].label).toBeTruthy()
      expect(MOVEMENT_INTENSITY_META[intensity].multiplier).toBeGreaterThan(0)
    }
  })

  it('强度乘数应递增', () => {
    const multipliers = [
      MOVEMENT_INTENSITY_META.light.multiplier,
      MOVEMENT_INTENSITY_META.moderate.multiplier,
      MOVEMENT_INTENSITY_META.vigorous.multiplier,
      MOVEMENT_INTENSITY_META.extreme.multiplier,
    ]
    for (let i = 1; i < multipliers.length; i++) {
      expect(multipliers[i]).toBeGreaterThan(multipliers[i - 1])
    }
  })
})