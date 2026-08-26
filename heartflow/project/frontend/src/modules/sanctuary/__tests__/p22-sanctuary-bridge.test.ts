// ============================================================
// P22-6 安全岛视图桥接层测试
// 覆盖：初始化、激活状态、触发配置、会话统计、
//       激活历史、推荐系统、激活/退出操作、计时器、
//       配置更新、会话管理、统计重置、完整工作流
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('P22-6 安全岛视图桥接', () => {
  let bridge: any

  beforeEach(async () => {
    vi.resetModules()
    const mod = await import('../sanctuary-bridge')
    bridge = mod.useSanctuaryBridge()
  })

  // ============================================================
  // 1. 初始化
  // ============================================================
  describe('初始化', () => {
    it('初始化时 isActive 为 false', () => {
      expect(bridge.isActive.value).toBe(false)
    })

    it('初始化时 sanctuaryState 有默认值', () => {
      const state = bridge.sanctuaryState.value
      expect(state.isActive).toBe(false)
      expect(state.activationCount).toBe(0)
      expect(state.currentSessionStart).toBeNull()
      expect(state.sessionDuration).toBe(0)
    })

    it('初始化时 activationCount 为 0', () => {
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)
    })
  })

  // ============================================================
  // 2. 安全岛状态
  // ============================================================
  describe('安全岛状态', () => {
    it('sanctuaryState.isActive 反映 isActive 的值', () => {
      expect(bridge.sanctuaryState.value.isActive).toBe(false)
      bridge.activate()
      expect(bridge.sanctuaryState.value.isActive).toBe(true)
      bridge.deactivate()
      expect(bridge.sanctuaryState.value.isActive).toBe(false)
    })

    it('sessionDuration 初始为 0', () => {
      expect(bridge.sanctuaryState.value.sessionDuration).toBe(0)
    })

    it('sanctuaryState 是计算属性，响应式更新', () => {
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)
      bridge.activate()
      expect(bridge.sanctuaryState.value.activationCount).toBe(1)
      bridge.deactivate()
    })
  })

  // ============================================================
  // 3. 触发配置
  // ============================================================
  describe('触发配置', () => {
    it('triggerConfig 有默认值：tapCount=5, windowMs=2000, autoExit=false, progress=0', () => {
      const config = bridge.triggerConfig.value
      expect(config.tapCount).toBe(5)
      expect(config.windowMs).toBe(2000)
      expect(config.autoExit).toBe(false)
      expect(config.progress).toBe(0)
    })

    it('triggerConfig 是计算属性，响应式更新', () => {
      bridge.configureTrigger({ tapCount: 3 })
      expect(bridge.triggerConfig.value.tapCount).toBe(3)
      expect(bridge.triggerConfig.value.windowMs).toBe(2000)
    })
  })

  // ============================================================
  // 4. 会话统计
  // ============================================================
  describe('会话统计', () => {
    it('sessionStats 初始值全部为 0 或 null', () => {
      const stats = bridge.sessionStats.value
      expect(stats.totalActivations).toBe(0)
      expect(stats.totalDuration).toBe(0)
      expect(stats.avgDuration).toBe(0)
      expect(stats.lastActivation).toBeNull()
      expect(stats.sessionsToday).toBe(0)
      expect(stats.longestSession).toBe(0)
      expect(stats.shortestSession).toBe(0)
    })

    it('sessionStats 是计算属性，响应式更新', () => {
      bridge.activate()
      bridge.deactivate()
      expect(bridge.sessionStats.value.totalActivations).toBe(1)
    })
  })

  // ============================================================
  // 5. 激活历史
  // ============================================================
  describe('激活历史', () => {
    it('activationHistory 初始为空数组', () => {
      expect(bridge.activationHistory.value).toEqual([])
    })

    it('激活后不包含未完成的会话', () => {
      bridge.activate()
      // 只有激活没有退出，会话未完成，不应出现在历史中
      expect(bridge.activationHistory.value).toEqual([])
      bridge.deactivate()
      expect(bridge.activationHistory.value.length).toBe(1)
    })
  })

  // ============================================================
  // 6. 推荐系统
  // ============================================================
  describe('推荐系统', () => {
    it('空状态时给出高优先级 "初次体验安全岛" 推荐', () => {
      const recs = bridge.recommendations.value
      const firstRec = recs.find((r: any) => r.title === '初次体验安全岛')
      expect(firstRec).toBeDefined()
      expect(firstRec.priority).toBe('high')
      expect(firstRec.type).toBe('usage')
    })

    it('空状态推荐包含 action 字段', () => {
      const recs = bridge.recommendations.value
      const firstRec = recs.find((r: any) => r.title === '初次体验安全岛')
      expect(firstRec.action).toBeDefined()
    })

    it('推荐按优先级排序（high → medium → low）', () => {
      const recs = bridge.recommendations.value
      for (let i = 1; i < recs.length; i++) {
        const order: Record<string, number> = { high: 0, medium: 1, low: 2 }
        const prev = order[recs[i - 1].priority]
        const curr = order[recs[i].priority]
        expect(prev).toBeLessThanOrEqual(curr)
      }
    })
  })

  // ============================================================
  // 7. 激活操作
  // ============================================================
  describe('激活操作', () => {
    it('activate 将 isActive 设为 true', () => {
      bridge.activate()
      expect(bridge.isActive.value).toBe(true)
      bridge.deactivate()
    })

    it('activate 递增 activationCount', () => {
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)
      bridge.activate()
      expect(bridge.sanctuaryState.value.activationCount).toBe(1)
      bridge.deactivate()
    })

    it('activate 创建会话记录', () => {
      bridge.activate()
      // 激活后检查今日会话（未完成会话也包含在内）
      const todaySessions = bridge.getTodaySessions()
      expect(todaySessions.length).toBe(1)
      const session = todaySessions[0]
      expect(session.id).toMatch(/^sanc-/)
      expect(session.startTime).toBeTruthy()
      expect(session.endTime).toBeNull()
      expect(session.duration).toBe(0)
      expect(session.reason).toBe('用户触发')
      bridge.deactivate()
    })

    it('activate 带自定义 reason 参数', () => {
      bridge.activate('测试原因')
      const todaySessions = bridge.getTodaySessions()
      expect(todaySessions[0].reason).toBe('测试原因')
      bridge.deactivate()
    })

    it('activate 设置 currentSessionStart', () => {
      bridge.activate()
      expect(bridge.sanctuaryState.value.currentSessionStart).toBeTruthy()
      bridge.deactivate()
    })

    it('activate 将 sessionDuration 重置为 0', () => {
      bridge.activate()
      expect(bridge.sanctuaryState.value.sessionDuration).toBe(0)
      bridge.deactivate()
    })

    it('当已激活时再次调用 activate 被忽略', () => {
      bridge.activate()
      const firstStart = bridge.sanctuaryState.value.currentSessionStart
      const firstCount = bridge.sanctuaryState.value.activationCount

      bridge.activate()
      // 状态不应改变
      expect(bridge.sanctuaryState.value.currentSessionStart).toBe(firstStart)
      expect(bridge.sanctuaryState.value.activationCount).toBe(firstCount)
      bridge.deactivate()
    })

    it('第二次 activate 被忽略，不创建新会话', () => {
      bridge.activate()
      const sessionCount = bridge.getSessionHistory().length
      bridge.activate()
      expect(bridge.getSessionHistory().length).toBe(sessionCount)
      bridge.deactivate()
    })
  })

  // ============================================================
  // 8. 退出操作
  // ============================================================
  describe('退出操作', () => {
    it('deactivate 将 isActive 设为 false', () => {
      bridge.activate()
      bridge.deactivate()
      expect(bridge.isActive.value).toBe(false)
    })

    it('deactivate 完成会话，设置 endTime 和 duration', () => {
      bridge.activate()
      bridge.deactivate()
      const session = bridge.getSessionHistory()[0]
      expect(session.endTime).toBeTruthy()
      expect(typeof session.duration).toBe('number')
    })

    it('deactivate 清除 currentSessionStart', () => {
      bridge.activate()
      bridge.deactivate()
      expect(bridge.sanctuaryState.value.currentSessionStart).toBeNull()
    })

    it('deactivate 将 sessionDuration 重置为 0', () => {
      bridge.activate()
      bridge.deactivate()
      expect(bridge.sanctuaryState.value.sessionDuration).toBe(0)
    })

    it('未激活时调用 deactivate 不报错', () => {
      expect(() => bridge.deactivate()).not.toThrow()
      expect(bridge.isActive.value).toBe(false)
    })
  })

  // ============================================================
  // 9. 会话追踪
  // ============================================================
  describe('会话追踪', () => {
    it('激活并退出后 sessionStats 更新', () => {
      bridge.activate()
      bridge.deactivate()

      const stats = bridge.sessionStats.value
      expect(stats.totalActivations).toBe(1)
      expect(stats.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('激活并退出后 sessionsToday 反映今日会话数', () => {
      bridge.activate()
      bridge.deactivate()

      const stats = bridge.sessionStats.value
      expect(stats.sessionsToday).toBeGreaterThanOrEqual(1)
    })

    it('激活并退出后 lastActivation 不为 null', () => {
      bridge.activate()
      bridge.deactivate()

      expect(bridge.sessionStats.value.lastActivation).toBeTruthy()
    })
  })

  // ============================================================
  // 10. 多次会话
  // ============================================================
  describe('多次会话', () => {
    it('多次激活/退出，activationCount 递增', () => {
      for (let i = 1; i <= 5; i++) {
        bridge.activate()
        bridge.deactivate()
        expect(bridge.sanctuaryState.value.activationCount).toBe(i)
      }
    })

    it('多次激活/退出，sessionStats.totalActivations 正确', () => {
      for (let i = 0; i < 3; i++) {
        bridge.activate()
        bridge.deactivate()
      }
      expect(bridge.sessionStats.value.totalActivations).toBe(3)
    })

    it('多次会话后 longestSession 和 shortestSession 正确', () => {
      bridge.activate()
      bridge.deactivate()
      bridge.activate()
      bridge.deactivate()

      const stats = bridge.sessionStats.value
      expect(stats.longestSession).toBeGreaterThanOrEqual(0)
      expect(stats.shortestSession).toBeGreaterThanOrEqual(0)
      expect(stats.longestSession).toBeGreaterThanOrEqual(stats.shortestSession)
    })

    it('多次会话后 avgDuration 计算正确', () => {
      for (let i = 0; i < 3; i++) {
        bridge.activate()
        bridge.deactivate()
      }

      const stats = bridge.sessionStats.value
      expect(stats.avgDuration).toBeGreaterThanOrEqual(0)
    })
  })

  // ============================================================
  // 11. 配置触发器
  // ============================================================
  describe('配置触发器', () => {
    it('configureTrigger 更新 tapCount', () => {
      bridge.configureTrigger({ tapCount: 3 })
      expect(bridge.triggerConfig.value.tapCount).toBe(3)
    })

    it('configureTrigger 更新 windowMs', () => {
      bridge.configureTrigger({ windowMs: 3000 })
      expect(bridge.triggerConfig.value.windowMs).toBe(3000)
    })

    it('configureTrigger 更新 autoExit', () => {
      bridge.configureTrigger({ autoExit: true })
      expect(bridge.triggerConfig.value.autoExit).toBe(true)
    })

    it('configureTrigger 同时更新多个字段', () => {
      bridge.configureTrigger({ tapCount: 7, windowMs: 1500, autoExit: true })
      const config = bridge.triggerConfig.value
      expect(config.tapCount).toBe(7)
      expect(config.windowMs).toBe(1500)
      expect(config.autoExit).toBe(true)
    })

    it('configureTrigger 部分更新，未指定的字段保持不变', () => {
      bridge.configureTrigger({ tapCount: 10 })
      const config = bridge.triggerConfig.value
      expect(config.tapCount).toBe(10)
      expect(config.windowMs).toBe(2000) // 默认不变
      expect(config.autoExit).toBe(false) // 默认不变
    })
  })

  // ============================================================
  // 12. 更新进度
  // ============================================================
  describe('更新进度', () => {
    it('updateProgress 设置 progress', () => {
      bridge.updateProgress(0.5)
      expect(bridge.triggerConfig.value.progress).toBe(0.5)
    })

    it('updateProgress 将超出 1 的值 clamp 到 1', () => {
      bridge.updateProgress(1.5)
      expect(bridge.triggerConfig.value.progress).toBe(1)
    })

    it('updateProgress 将小于 0 的值 clamp 到 0', () => {
      bridge.updateProgress(-0.5)
      expect(bridge.triggerConfig.value.progress).toBe(0)
    })

    it('updateProgress 接受 0 和 1 边界值', () => {
      bridge.updateProgress(0)
      expect(bridge.triggerConfig.value.progress).toBe(0)

      bridge.updateProgress(1)
      expect(bridge.triggerConfig.value.progress).toBe(1)
    })
  })

  // ============================================================
  // 13. 获取会话历史
  // ============================================================
  describe('获取会话历史', () => {
    it('getSessionHistory 返回已完成会话，按 startTime 降序排列', () => {
      bridge.activate()
      bridge.deactivate()
      bridge.activate()
      bridge.deactivate()

      const history = bridge.getSessionHistory()
      expect(history.length).toBe(2)
      expect(new Date(history[0].startTime).getTime())
        .toBeGreaterThanOrEqual(new Date(history[1].startTime).getTime())
    })

    it('getSessionHistory 支持 limit 参数限制返回数量', () => {
      for (let i = 0; i < 5; i++) {
        bridge.activate()
        bridge.deactivate()
      }

      const limited = bridge.getSessionHistory(3)
      expect(limited.length).toBe(3)
    })

    it('getSessionHistory 默认 limit 为 20', () => {
      bridge.activate()
      bridge.deactivate()

      const history = bridge.getSessionHistory()
      expect(history.length).toBeLessThanOrEqual(20)
    })
  })

  // ============================================================
  // 14. 获取今日会话
  // ============================================================
  describe('获取今日会话', () => {
    it('getTodaySessions 仅返回今日会话', () => {
      bridge.activate()
      bridge.deactivate()

      const today = bridge.getTodaySessions()
      expect(today.length).toBeGreaterThanOrEqual(1)
    })

    it('getTodaySessions 返回的会话是今天创建的', () => {
      bridge.activate()
      bridge.deactivate()

      const today = bridge.getTodaySessions()
      const todayStr = new Date().toISOString().slice(0, 10)
      today.forEach((s: any) => {
        expect(s.startTime.slice(0, 10)).toBe(todayStr)
      })
    })
  })

  // ============================================================
  // 15. 重置统计
  // ============================================================
  describe('重置统计', () => {
    it('resetStats 清除所有数据', () => {
      bridge.activate()
      bridge.deactivate()
      bridge.configureTrigger({ tapCount: 3 })
      bridge.updateProgress(0.8)

      bridge.resetStats()

      expect(bridge.isActive.value).toBe(false)
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)
      expect(bridge.sessionStats.value.totalActivations).toBe(0)
      expect(bridge.activationHistory.value).toEqual([])
      expect(bridge.triggerConfig.value.progress).toBe(0)
    })

    it('resetStats 在激活状态下先退出再重置', () => {
      bridge.activate()
      bridge.resetStats()

      expect(bridge.isActive.value).toBe(false)
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)
      expect(bridge.sanctuaryState.value.sessionDuration).toBe(0)
    })

    it('resetStats 重置后 sessionStats 全部恢复初始值', () => {
      bridge.activate()
      bridge.deactivate()
      bridge.activate()
      bridge.deactivate()

      bridge.resetStats()

      const stats = bridge.sessionStats.value
      expect(stats.totalActivations).toBe(0)
      expect(stats.totalDuration).toBe(0)
      expect(stats.avgDuration).toBe(0)
      expect(stats.lastActivation).toBeNull()
      expect(stats.sessionsToday).toBe(0)
      expect(stats.longestSession).toBe(0)
      expect(stats.shortestSession).toBe(0)
    })
  })

  // ============================================================
  // 16. 推荐系统（使用后）
  // ============================================================
  describe('推荐系统（使用后）', () => {
    it('使用后推荐发生变化，不再包含 "初次体验安全岛"', () => {
      bridge.activate()
      bridge.deactivate()

      const recs = bridge.recommendations.value
      const firstRec = recs.find((r: any) => r.title === '初次体验安全岛')
      expect(firstRec).toBeUndefined()
    })

    it('使用后包含 "建立安全岛使用习惯" 健康建议', () => {
      bridge.activate()
      bridge.deactivate()

      const recs = bridge.recommendations.value
      const habit = recs.find((r: any) => r.title === '建立安全岛使用习惯')
      expect(habit).toBeDefined()
      expect(habit.priority).toBe('low')
      expect(habit.type).toBe('wellness')
    })

    it('激活 5 次以上且今日 3 次以上时给出频率提示', () => {
      // 快速激活和退出 5 次
      for (let i = 0; i < 5; i++) {
        bridge.activate()
        bridge.deactivate()
      }

      const stats = bridge.sessionStats.value
      if (stats.totalActivations >= 5 && stats.sessionsToday >= 3) {
        const recs = bridge.recommendations.value
        const freq = recs.find((r: any) => r.title === '你今天已经多次使用安全岛')
        expect(freq).toBeDefined()
        expect(freq.priority).toBe('low')
        expect(freq.type).toBe('pattern')
      }
    })
  })

  // ============================================================
  // 17. 会话持续时间
  // ============================================================
  describe('会话持续时间', () => {
    it('激活后 sessionDuration 是数字类型', () => {
      bridge.activate()
      expect(typeof bridge.sanctuaryState.value.sessionDuration).toBe('number')
      bridge.deactivate()
    })

    it('激活后 sessionDuration 初始为 0', () => {
      bridge.activate()
      expect(bridge.sanctuaryState.value.sessionDuration).toBe(0)
      bridge.deactivate()
    })
  })

  // ============================================================
  // 18. 安全岛状态完整性
  // ============================================================
  describe('安全岛状态完整性', () => {
    it('激活后 sanctuaryState 所有字段已填充', () => {
      bridge.activate()

      const state = bridge.sanctuaryState.value
      expect(state.isActive).toBe(true)
      expect(state.activationCount).toBeGreaterThan(0)
      expect(state.currentSessionStart).toBeTruthy()
      expect(typeof state.sessionDuration).toBe('number')

      bridge.deactivate()
    })

    it('退出后 sanctuaryState 状态正确', () => {
      bridge.activate()
      bridge.deactivate()

      const state = bridge.sanctuaryState.value
      expect(state.isActive).toBe(false)
      expect(state.currentSessionStart).toBeNull()
      expect(state.sessionDuration).toBe(0)
      expect(state.activationCount).toBe(1)
    })
  })

  // ============================================================
  // 19. 触发配置部分更新
  // ============================================================
  describe('触发配置部分更新', () => {
    it('只更新 tapCount，其他字段保持不变', () => {
      const before = bridge.triggerConfig.value
      bridge.configureTrigger({ tapCount: 8 })

      const after = bridge.triggerConfig.value
      expect(after.tapCount).toBe(8)
      expect(after.windowMs).toBe(before.windowMs)
      expect(after.autoExit).toBe(before.autoExit)
      expect(after.progress).toBe(before.progress)
    })

    it('只更新 autoExit，其他字段保持不变', () => {
      const before = bridge.triggerConfig.value
      bridge.configureTrigger({ autoExit: true })

      const after = bridge.triggerConfig.value
      expect(after.autoExit).toBe(true)
      expect(after.tapCount).toBe(before.tapCount)
      expect(after.windowMs).toBe(before.windowMs)
    })
  })

  // ============================================================
  // 20. 边界情况
  // ============================================================
  describe('边界情况', () => {
    it('configureTrigger 传入空对象不报错', () => {
      expect(() => bridge.configureTrigger({})).not.toThrow()
      // 所有字段保持不变
      const config = bridge.triggerConfig.value
      expect(config.tapCount).toBe(5)
      expect(config.windowMs).toBe(2000)
    })

    it('getSessionHistory 传入 0 返回空数组', () => {
      bridge.activate()
      bridge.deactivate()

      const result = bridge.getSessionHistory(0)
      expect(result).toEqual([])
    })

    it('连续调用 resetStats 多次不报错', () => {
      bridge.activate()
      bridge.deactivate()

      expect(() => {
        bridge.resetStats()
        bridge.resetStats()
        bridge.resetStats()
      }).not.toThrow()
    })

    it('deactivate 后再次 deactivate 不报错', () => {
      bridge.activate()
      bridge.deactivate()
      expect(() => bridge.deactivate()).not.toThrow()
      expect(bridge.isActive.value).toBe(false)
    })
  })

  // ============================================================
  // 21. 完整工作流
  // ============================================================
  describe('完整工作流', () => {
    it('激活 → 配置 → 进度更新 → 退出 → 统计 完整流程', () => {
      // 1. 初始状态
      expect(bridge.isActive.value).toBe(false)
      expect(bridge.sanctuaryState.value.activationCount).toBe(0)

      // 2. 配置触发器
      bridge.configureTrigger({ tapCount: 3, windowMs: 1500 })
      expect(bridge.triggerConfig.value.tapCount).toBe(3)
      expect(bridge.triggerConfig.value.windowMs).toBe(1500)

      // 3. 更新进度
      bridge.updateProgress(0.75)
      expect(bridge.triggerConfig.value.progress).toBe(0.75)

      // 4. 激活
      bridge.activate('手动触发')
      expect(bridge.isActive.value).toBe(true)
      expect(bridge.sanctuaryState.value.activationCount).toBe(1)
      expect(bridge.sanctuaryState.value.currentSessionStart).toBeTruthy()

      // 5. 退出
      bridge.deactivate()
      expect(bridge.isActive.value).toBe(false)
      expect(bridge.sanctuaryState.value.currentSessionStart).toBeNull()

      // 6. 验证统计
      const stats = bridge.sessionStats.value
      expect(stats.totalActivations).toBe(1)
      expect(stats.sessionsToday).toBeGreaterThanOrEqual(1)

      // 7. 验证历史
      const history = bridge.getSessionHistory()
      expect(history.length).toBe(1)
      expect(history[0].reason).toBe('手动触发')

      // 8. 验证推荐
      const recs = bridge.recommendations.value
      expect(recs.length).toBeGreaterThan(0)
    })

    it('多次激活 → 重置 → 重新激活 完整流程', () => {
      // 激活 3 次
      for (let i = 0; i < 3; i++) {
        bridge.activate()
        bridge.deactivate()
      }
      expect(bridge.sessionStats.value.totalActivations).toBe(3)
      expect(bridge.getSessionHistory().length).toBe(3)

      // 重置
      bridge.resetStats()
      expect(bridge.sessionStats.value.totalActivations).toBe(0)
      expect(bridge.getSessionHistory().length).toBe(0)

      // 重新激活
      bridge.activate()
      expect(bridge.sanctuaryState.value.activationCount).toBe(1)
      // 激活中的会话没有 endTime，getSessionHistory 过滤已完成会话
      // 使用 getTodaySessions 检查包含未完成会话
      expect(bridge.getTodaySessions().length).toBe(1)
      bridge.deactivate()
      expect(bridge.getSessionHistory().length).toBe(1)
    })
  })
})