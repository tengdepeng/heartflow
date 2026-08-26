// ============================================================
// P22-1 动律之间 · 视图桥接层测试
// 注意：每个 describe 块使用独立的 beforeEach 重置模块，
// 避免状态累积同时防止过多模块重置导致的超时
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

// 共享的初始化辅助函数
async function initBridge(): Promise<any> {
  vi.resetModules()
  ;(globalThis as any).localStorage = createMockStorage()
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  const mod = await import('../movement-bridge')
  return mod.useMovementBridge()
}

describe('P22-1 动律之间视图桥接', () => {
  let bridge: any

  // ============================================================
  // 1. 初始化
  // ============================================================
  describe('初始化', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('bridge 初始化后 isLoading 为 false', () => {
      expect(bridge.isLoading.value).toBe(false)
    })

    it('bridge 初始化后 quickStats 不为空', () => {
      expect(bridge.quickStats.value).toBeDefined()
    })

    it('bridge 初始化后 bridgeState 不为空', () => {
      expect(bridge.bridgeState.value).toBeDefined()
    })

    it('quickStats.weeklyMinutes 初始为 0', () => {
      expect(bridge.quickStats.value.weeklyMinutes).toBe(0)
    })

    it('quickStats.weeklySessions 初始为 0', () => {
      expect(bridge.quickStats.value.weeklySessions).toBe(0)
    })

    it('quickStats.weeklyCalories 初始为 0', () => {
      expect(bridge.quickStats.value.weeklyCalories).toBe(0)
    })

    it('quickStats.streak 初始为 0 或 undefined', () => {
      expect(bridge.quickStats.value.streak === 0 || bridge.quickStats.value.streak === undefined).toBe(true)
    })

    it('quickStats.typeDistribution 初始为空', () => {
      expect(bridge.quickStats.value.typeDistribution).toEqual([])
    })

    it('quickStats.recentRecords 初始为空', () => {
      expect(bridge.quickStats.value.recentRecords).toEqual([])
    })

    it('bridgeState.records 初始为空', () => {
      expect(bridge.bridgeState.value.records).toEqual([])
    })
  })

  // ============================================================
  // 2. 记录运动
  // ============================================================
  describe('记录运动', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('logMovement 返回 MovementRecord 对象', () => {
      const record = bridge.logMovement({
        type: 'running', duration: 30, intensity: 'moderate',
      })
      expect(record).toBeDefined()
      expect(record.type).toBe('running')
      expect(record.duration).toBe(30)
      expect(record.intensity).toBe('moderate')
    })

    it('logMovement 返回的记录包含 id', () => {
      const record = bridge.logMovement({
        type: 'walking', duration: 20, intensity: 'light',
      })
      expect(record.id).toBeDefined()
      expect(typeof record.id).toBe('string')
      expect(record.id.startsWith('move_')).toBe(true)
    })

    it('logMovement 返回的记录包含 date 和 timestamp', () => {
      const record = bridge.logMovement({
        type: 'cycling', duration: 45, intensity: 'vigorous',
      })
      expect(record.date).toBeDefined()
      expect(record.timestamp).toBeDefined()
      expect(typeof record.date).toBe('string')
      expect(typeof record.timestamp).toBe('string')
    })

    it('logMovement 返回的记录包含 calories', () => {
      const record = bridge.logMovement({
        type: 'running', duration: 30, intensity: 'moderate',
      })
      expect(record.calories).toBeDefined()
      expect(record.calories).toBeGreaterThan(0)
    })

    it('logMovement 支持可选参数 distance', () => {
      const record = bridge.logMovement({
        type: 'running', duration: 30, intensity: 'moderate', distance: 5,
      })
      expect(record.distance).toBe(5)
    })

    it('logMovement 支持可选参数 feeling', () => {
      const record = bridge.logMovement({
        type: 'yoga', duration: 40, intensity: 'light', feeling: '精力充沛',
      })
      expect(record.feeling).toBe('精力充沛')
    })

    it('logMovement 支持可选参数 note', () => {
      const record = bridge.logMovement({
        type: 'strength', duration: 50, intensity: 'vigorous', note: '上肢训练',
      })
      expect(record.note).toBe('上肢训练')
    })

    it('logMovement 后 records 数量增加', () => {
      expect(bridge.bridgeState.value.records.length).toBe(0)
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      expect(bridge.bridgeState.value.records.length).toBe(1)
    })
  })

  // ============================================================
  // 3. 快捷统计
  // ============================================================
  describe('快捷统计', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('logMovement 后 weeklyMinutes 更新', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'walking', duration: 20, intensity: 'light' })
      expect(bridge.quickStats.value.weeklyMinutes).toBe(50)
    })

    it('logMovement 后 weeklySessions 更新', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'moderate' })
      bridge.logMovement({ type: 'yoga', duration: 15, intensity: 'light' })
      expect(bridge.quickStats.value.weeklySessions).toBe(3)
    })

    it('logMovement 后 weeklyCalories 更新', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      expect(bridge.quickStats.value.weeklyCalories).toBeGreaterThan(0)
    })

    it('logMovement 后 recentRecords 包含最新记录', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const recent = bridge.quickStats.value.recentRecords
      expect(recent.length).toBe(1)
      expect(recent[0].type).toBe('running')
      expect(recent[0].duration).toBe(30)
    })

    it('recentRecords 最多返回 10 条', () => {
      for (let i = 0; i < 15; i++) {
        bridge.logMovement({
          type: 'running', duration: 10 + i, intensity: 'moderate',
        })
      }
      expect(bridge.quickStats.value.recentRecords.length).toBeLessThanOrEqual(10)
    })
  })

  // ============================================================
  // 4. 桥接状态
  // ============================================================
  describe('桥接状态', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('bridgeState 包含 records 数组', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(Array.isArray(state.records)).toBe(true)
      expect(state.records.length).toBe(1)
    })

    it('bridgeState 包含 rhythm 数据', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(state.rhythm).toBeDefined()
      expect(state.rhythm.weeklyCompleted).toBeGreaterThanOrEqual(0)
      expect(state.rhythm.streak).toBeGreaterThanOrEqual(0)
    })

    it('bridgeState 包含 fitness 数据', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(state.fitness).toBeDefined()
      expect(state.fitness.overall).toBeGreaterThanOrEqual(0)
      expect(state.fitness.overall).toBeLessThanOrEqual(100)
      expect(state.fitness.cardioEndurance).toBeGreaterThanOrEqual(0)
      expect(state.fitness.strength).toBeGreaterThanOrEqual(0)
      expect(state.fitness.flexibility).toBeGreaterThanOrEqual(0)
      expect(state.fitness.balance).toBeGreaterThanOrEqual(0)
    })

    it('bridgeState 包含 recoveryScore', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(state.recoveryScore).toBeDefined()
      expect(state.recoveryScore.overall).toBeGreaterThanOrEqual(0)
      expect(state.recoveryScore.overall).toBeLessThanOrEqual(100)
    })

    it('bridgeState 包含 recommendations', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(Array.isArray(state.recommendations)).toBe(true)
    })

    it('bridgeState 包含 movementPattern', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const state = bridge.bridgeState.value
      expect(state.movementPattern).toBeDefined()
      expect(state.movementPattern.pattern).toBeDefined()
      expect(state.movementPattern.consistency).toBeGreaterThanOrEqual(0)
    })

    it('记录 >= 3 条后 bridgeState 包含 recoveryPlan', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      const state = bridge.bridgeState.value
      expect(state.recoveryPlan).toBeDefined()
      expect(state.recoveryPlan.id).toBeDefined()
      expect(state.recoveryPlan.dailyActivities.length).toBeGreaterThan(0)
    })

    it('记录 >= 3 条后 bridgeState 包含 periodizationPlan', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      const state = bridge.bridgeState.value
      expect(state.periodizationPlan).toBeDefined()
      expect(state.periodizationPlan.currentPhase).toBeDefined()
      expect(state.periodizationPlan.weeklySchedule.length).toBe(7)
    })

    it('记录 >= 3 条后 bridgeState 包含 activeRecovery', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      const state = bridge.bridgeState.value
      expect(Array.isArray(state.activeRecovery)).toBe(true)
      expect(state.activeRecovery.length).toBeGreaterThan(0)
    })
  })

  // ============================================================
  // 5. 删除运动记录
  // ============================================================
  describe('删除运动记录', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('removeMovement 删除已存在的记录返回 true', () => {
      const record = bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const result = bridge.removeMovement(record.id)
      expect(result).toBe(true)
    })

    it('removeMovement 删除不存在的记录返回 false', () => {
      const result = bridge.removeMovement('nonexistent_id')
      expect(result).toBe(false)
    })

    it('删除后 bridgeState.records 数量减少', () => {
      const record = bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      expect(bridge.bridgeState.value.records.length).toBe(1)
      bridge.removeMovement(record.id)
      expect(bridge.bridgeState.value.records.length).toBe(0)
    })

    it('删除后 quickStats 更新', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'walking', duration: 20, intensity: 'light' })
      expect(bridge.quickStats.value.weeklySessions).toBe(2)

      const records = bridge.bridgeState.value.records
      bridge.removeMovement(records[0].id)
      expect(bridge.quickStats.value.weeklySessions).toBe(1)
    })

    it('删除全部记录后 quickStats 归零', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'walking', duration: 20, intensity: 'light' })
      const records = bridge.bridgeState.value.records
      for (const r of records) {
        bridge.removeMovement(r.id)
      }
      expect(bridge.quickStats.value.weeklyMinutes).toBe(0)
      expect(bridge.quickStats.value.weeklySessions).toBe(0)
    })
  })

  // ============================================================
  // 6. 初始化已有记录
  // ============================================================
  describe('初始化已有记录', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('initialize() 加载已有记录到 bridge', () => {
      const existingRecords = [
        {
          id: 'move_1', type: 'running', duration: 30, intensity: 'moderate',
          date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(),
        },
      ]
      bridge.initialize(existingRecords)
      expect(bridge.bridgeState.value.records.length).toBe(1)
    })

    it('initialize() 后 quickStats 反映已加载记录', () => {
      const existingRecords = [
        {
          id: 'move_1', type: 'running', duration: 30, intensity: 'moderate',
          date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(),
        },
        {
          id: 'move_2', type: 'walking', duration: 20, intensity: 'light',
          date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(),
        },
      ]
      bridge.initialize(existingRecords)
      expect(bridge.quickStats.value.weeklyMinutes).toBe(50)
      expect(bridge.quickStats.value.weeklySessions).toBe(2)
    })

    it('initialize() 后 bridgeState 包含 fitness 数据', () => {
      const existingRecords = [
        {
          id: 'move_1', type: 'running', duration: 30, intensity: 'moderate',
          date: new Date().toISOString().split('T')[0], timestamp: new Date().toISOString(),
        },
      ]
      bridge.initialize(existingRecords)
      expect(bridge.bridgeState.value.fitness).toBeDefined()
      expect(bridge.bridgeState.value.fitness.overall).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // 7. 刷新所有
  // ============================================================
  describe('刷新所有', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('refreshAll 后数据保持一致', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const beforeMinutes = bridge.quickStats.value.weeklyMinutes
      bridge.refreshAll()
      const afterMinutes = bridge.quickStats.value.weeklyMinutes
      expect(afterMinutes).toBe(beforeMinutes)
    })

    it('refreshAll 后 bridgeState 仍然可用', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.refreshAll()
      expect(bridge.bridgeState.value.records.length).toBe(1)
      expect(bridge.bridgeState.value.rhythm).toBeDefined()
      expect(bridge.bridgeState.value.fitness).toBeDefined()
    })

    it('refreshAll 更新 recoveryScore', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.refreshAll()
      expect(bridge.bridgeState.value.recoveryScore).toBeDefined()
      expect(bridge.bridgeState.value.recoveryScore.overall).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // 8. 子模块访问
  // ============================================================
  describe('子模块访问', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('rhythm 子模块可访问', () => {
      expect(bridge.rhythm).toBeDefined()
      expect(typeof bridge.rhythm.recordMovement).toBe('function')
      expect(typeof bridge.rhythm.getWeeklyStats).toBe('function')
      expect(typeof bridge.rhythm.removeRecord).toBe('function')
    })

    it('analytics 子模块可访问', () => {
      expect(bridge.analytics).toBeDefined()
      expect(typeof bridge.analytics.updateAnalytics).toBe('function')
      expect(typeof bridge.analytics.assessFitness).toBe('function')
      expect(typeof bridge.analytics.generateRecommendations).toBe('function')
    })

    it('recovery 子模块可访问', () => {
      expect(bridge.recovery).toBeDefined()
      expect(typeof bridge.recovery.computeRecoveryScore).toBe('function')
      expect(typeof bridge.recovery.detectOvertraining).toBe('function')
      expect(typeof bridge.recovery.generateRecoveryPlan).toBe('function')
    })
  })

  // ============================================================
  // 9. 多条运动记录
  // ============================================================
  describe('多条运动记录', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('logMovement 多次调用后记录数正确', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      bridge.logMovement({ type: 'swimming', duration: 25, intensity: 'moderate' })
      expect(bridge.bridgeState.value.records.length).toBe(4)
    })

    it('多条记录累计 weeklyMinutes 正确', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      expect(bridge.quickStats.value.weeklyMinutes).toBe(90)
    })

    it('多条记录累计 weeklySessions 正确', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      bridge.logMovement({ type: 'swimming', duration: 25, intensity: 'moderate' })
      bridge.logMovement({ type: 'strength', duration: 50, intensity: 'vigorous' })
      expect(bridge.quickStats.value.weeklySessions).toBe(5)
    })

    it('多条不同强度记录后 bridgeState 正确', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'light' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'moderate' })
      bridge.logMovement({ type: 'hiit', duration: 20, intensity: 'vigorous' })
      expect(bridge.bridgeState.value.records.length).toBe(3)
    })
  })

  // ============================================================
  // 10. 类型分布
  // ============================================================
  describe('类型分布', () => {
    beforeEach(async () => {
      bridge = await initBridge()
    })

    it('typeDistribution 按 count 降序排列', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'running', duration: 20, intensity: 'moderate' })
      bridge.logMovement({ type: 'running', duration: 25, intensity: 'moderate' })
      bridge.logMovement({ type: 'yoga', duration: 20, intensity: 'light' })
      bridge.logMovement({ type: 'yoga', duration: 15, intensity: 'light' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'vigorous' })

      const dist = bridge.quickStats.value.typeDistribution
      expect(dist.length).toBeGreaterThan(0)
      for (let i = 1; i < dist.length; i++) {
        expect(dist[i - 1].count).toBeGreaterThanOrEqual(dist[i].count)
      }
    })

    it('typeDistribution 包含正确的 label', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      const dist = bridge.quickStats.value.typeDistribution
      const runningEntry = dist.find((d: any) => d.type === 'running')
      expect(runningEntry).toBeDefined()
      expect(runningEntry.label).toBe('跑步')
      expect(runningEntry.icon).toBe('🏃')
    })

    it('typeDistribution 包含正确的 icon', () => {
      bridge.logMovement({ type: 'swimming', duration: 30, intensity: 'moderate' })
      const dist = bridge.quickStats.value.typeDistribution
      const swimEntry = dist.find((d: any) => d.type === 'swimming')
      expect(swimEntry).toBeDefined()
      expect(swimEntry.icon).toBe('🏊')
    })

    it('typeDistribution 正确统计不同运动类型数量', () => {
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'running', duration: 20, intensity: 'moderate' })
      bridge.logMovement({ type: 'yoga', duration: 30, intensity: 'light' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 35, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 25, intensity: 'moderate' })

      const dist = bridge.quickStats.value.typeDistribution
      const cycling = dist.find((d: any) => d.type === 'cycling')
      const running = dist.find((d: any) => d.type === 'running')
      const yoga = dist.find((d: any) => d.type === 'yoga')
      expect(cycling.count).toBe(3)
      expect(running.count).toBe(2)
      expect(yoga.count).toBe(1)
    })

    it('typeDistribution 最高频运动类型排在第一位', () => {
      bridge.logMovement({ type: 'cycling', duration: 30, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 40, intensity: 'moderate' })
      bridge.logMovement({ type: 'cycling', duration: 35, intensity: 'moderate' })
      bridge.logMovement({ type: 'running', duration: 30, intensity: 'moderate' })

      const dist = bridge.quickStats.value.typeDistribution
      expect(dist[0].type).toBe('cycling')
      expect(dist[0].count).toBe(3)
    })
  })
})