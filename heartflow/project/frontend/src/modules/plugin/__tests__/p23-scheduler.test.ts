// ============================================================
// P23 插件调度器测试
// 测试 usePluginScheduler() 组合函数：
//   初始化、任务管理、任务状态流转、依赖检查、
//   阻塞/就绪任务、优先级排序、调度器控制、
//   配置管理、插件级调度、进度更新、并发控制、
//   统计计算
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ============================================================
// 共享 mock 状态
// ============================================================

const { mockGetKV, mockSetKV, clearKVStore } = vi.hoisted(() => {
  const kvStore: Record<string, any> = {}
  const mockGetKV = vi.fn((_key: string, def: any) => {
    const val = kvStore[_key]
    return val !== undefined ? val : def
  })
  const mockSetKV = vi.fn((key: string, val: any) => {
    kvStore[key] = val
  })
  /**
   * 清空所有 mock 存储
   */
  function clearKVStore() {
    Object.keys(kvStore).forEach((k) => delete kvStore[k])
  }
  return { mockGetKV, mockSetKV, clearKVStore }
})

// ============================================================
// vi.mock 声明
// ============================================================

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockGetKV(key, def),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

// ============================================================
// 辅助函数
// ============================================================

/** 创建调度器实例（每次重新导入，清空持久化数据） */
async function createScheduler() {
  clearKVStore()
  vi.resetModules()
  const mod = await import('../plugin-scheduler')
  return mod.usePluginScheduler()
}

// ============================================================
// P23 插件调度器
// ============================================================

describe('P23 插件调度器', () => {
  let scheduler: any

  // ==========================================================
  // 初始化
  // ==========================================================
  describe('初始化', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('config 默认值正确', () => {
      expect(scheduler.config.value).toBeDefined()
      expect(scheduler.config.value.maxConcurrency).toBe(4)
      expect(scheduler.config.value.priorityEnabled).toBe(true)
      expect(scheduler.config.value.defaultTimeout).toBe(30000)
      expect(scheduler.config.value.defaultMaxRetries).toBe(3)
      expect(scheduler.config.value.autoRetry).toBe(true)
      expect(scheduler.config.value.tickInterval).toBe(100)
    })

    it('stats 初始全部为 0', () => {
      expect(scheduler.stats.value.totalTasks).toBe(0)
      expect(scheduler.stats.value.pendingTasks).toBe(0)
      expect(scheduler.stats.value.runningTasks).toBe(0)
      expect(scheduler.stats.value.completedTasks).toBe(0)
      expect(scheduler.stats.value.failedTasks).toBe(0)
      expect(scheduler.stats.value.averageWaitTime).toBe(0)
      expect(scheduler.stats.value.averageExecutionTime).toBe(0)
      expect(scheduler.stats.value.successRate).toBe(0)
    })

    it('isRunning 为 false', () => {
      expect(scheduler.isRunning.value).toBe(false)
    })

    it('tasks 为空数组', () => {
      expect(Array.isArray(scheduler.tasks.value)).toBe(true)
      expect(scheduler.tasks.value.length).toBe(0)
    })

    it('pendingTasks 为空数组', () => {
      expect(Array.isArray(scheduler.pendingTasks.value)).toBe(true)
      expect(scheduler.pendingTasks.value.length).toBe(0)
    })

    it('runningTasks 为空数组', () => {
      expect(Array.isArray(scheduler.runningTasks.value)).toBe(true)
      expect(scheduler.runningTasks.value.length).toBe(0)
    })

    it('failedTasks 为空数组', () => {
      expect(Array.isArray(scheduler.failedTasks.value)).toBe(true)
      expect(scheduler.failedTasks.value.length).toBe(0)
    })
  })

  // ==========================================================
  // 任务管理
  // ==========================================================
  describe('任务管理', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('addTask 增加任务，返回 ScheduleTask', () => {
      const task = scheduler.addTask('测试任务', 'plugin-a')
      expect(task).toBeDefined()
      expect(task.id).toBeDefined()
      expect(task.name).toBe('测试任务')
      expect(task.pluginId).toBe('plugin-a')
      expect(scheduler.tasks.value.length).toBe(1)
    })

    it('addTask 默认优先级为 normal', () => {
      const task = scheduler.addTask('默认优先级任务', 'plugin-a')
      expect(task.priority).toBe('normal')
    })

    it('addTask 自定义优先级', () => {
      const task = scheduler.addTask('高优先级任务', 'plugin-a', { priority: 'high' })
      expect(task.priority).toBe('high')
    })

    it('addTask 自定义依赖', () => {
      const task = scheduler.addTask('依赖任务', 'plugin-a', { dependencies: ['task_1', 'task_2'] })
      expect(task.dependencies).toEqual(['task_1', 'task_2'])
    })

    it('cancelTask 取消任务', () => {
      const task = scheduler.addTask('待取消任务', 'plugin-a')
      const result = scheduler.cancelTask(task.id)
      expect(result).toBe(true)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.status).toBe('cancelled')
    })

    it('cancelTask 已完成的任务返回 false', () => {
      const task = scheduler.addTask('已完成任务', 'plugin-a')
      task.status = 'completed'
      const result = scheduler.cancelTask(task.id)
      expect(result).toBe(false)
    })

    it('cancelTask 不存在的任务返回 false', () => {
      const result = scheduler.cancelTask('nonexistent')
      expect(result).toBe(false)
    })

    it('retryTask 重试失败任务', () => {
      const task = scheduler.addTask('失败任务', 'plugin-a')
      task.status = 'failed'
      task.error = '测试错误'
      const result = scheduler.retryTask(task.id)
      expect(result).toBe(true)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.status).toBe('pending')
      expect(updated.retryCount).toBe(0)
      expect(updated.error).toBeUndefined()
    })

    it('retryTask 非失败状态返回 false', () => {
      const task = scheduler.addTask('运行中任务', 'plugin-a')
      task.status = 'running'
      const result = scheduler.retryTask(task.id)
      expect(result).toBe(false)
    })
  })

  // ==========================================================
  // 任务状态流转
  // ==========================================================
  describe('任务状态流转', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('addTask 后状态为 pending', () => {
      const task = scheduler.addTask('新任务', 'plugin-a')
      expect(task.status).toBe('pending')
    })

    it('scheduleNext 后状态为 running', () => {
      const task = scheduler.addTask('待调度任务', 'plugin-a')
      const scheduled = scheduler.scheduleNext()
      expect(scheduled).toBeDefined()
      expect(scheduled.status).toBe('running')
      expect(scheduled.startedAt).toBeDefined()
      expect(scheduled.id).toBe(task.id)
    })

    it('completeTask 后状态为 completed', () => {
      const task = scheduler.addTask('待完成任务', 'plugin-a')
      scheduler.scheduleNext()
      const result = scheduler.completeTask(task.id)
      expect(result).toBe(true)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.status).toBe('completed')
      expect(updated.progress).toBe(100)
      expect(updated.completedAt).toBeDefined()
    })

    it('completeTask 非 running 状态返回 false', () => {
      const task = scheduler.addTask('未运行任务', 'plugin-a')
      const result = scheduler.completeTask(task.id)
      expect(result).toBe(false)
    })

    it('failTask 后状态为 failed', () => {
      const task = scheduler.addTask('待失败任务', 'plugin-a')
      scheduler.scheduleNext()
      const result = scheduler.failTask(task.id, '发生严重错误')
      expect(result).toBe(true)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.status).toBe('failed')
      expect(updated.error).toBe('发生严重错误')
      expect(updated.completedAt).toBeDefined()
    })

    it('failTask 非 running 状态返回 false', () => {
      const task = scheduler.addTask('未运行任务', 'plugin-a')
      const result = scheduler.failTask(task.id, '错误')
      expect(result).toBe(false)
    })
  })

  // ==========================================================
  // 依赖检查
  // ==========================================================
  describe('依赖检查', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('areDependenciesMet 无依赖返回 true', () => {
      const task = scheduler.addTask('无依赖任务', 'plugin-a')
      expect(scheduler.areDependenciesMet(task)).toBe(true)
    })

    it('areDependenciesMet 有依赖未完成返回 false', () => {
      const depTask = scheduler.addTask('依赖任务A', 'plugin-a')
      const task = scheduler.addTask('等待依赖', 'plugin-a', { dependencies: [depTask.id] })
      // 依赖任务还是 pending，未完成
      expect(scheduler.areDependenciesMet(task)).toBe(false)
    })

    it('areDependenciesMet 有依赖已完成返回 true', () => {
      const depTask = scheduler.addTask('依赖任务B', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.completeTask(depTask.id)
      const task = scheduler.addTask('等待依赖完成', 'plugin-a', { dependencies: [depTask.id] })
      expect(scheduler.areDependenciesMet(task)).toBe(true)
    })

    it('areDependenciesMet 依赖不存在返回 false', () => {
      const task = scheduler.addTask('依赖不存在', 'plugin-a', { dependencies: ['nonexistent'] })
      expect(scheduler.areDependenciesMet(task)).toBe(false)
    })

    it('areDependenciesMet 多个依赖全部完成返回 true', () => {
      const dep1 = scheduler.addTask('依赖1', 'plugin-a')
      const dep2 = scheduler.addTask('依赖2', 'plugin-a')
      scheduler.scheduleNext() // dep1 running
      scheduler.completeTask(dep1.id)
      // dep2 需要先被调度
      scheduler.scheduleNext() // dep2 running
      scheduler.completeTask(dep2.id)
      const task = scheduler.addTask('多依赖任务', 'plugin-a', { dependencies: [dep1.id, dep2.id] })
      expect(scheduler.areDependenciesMet(task)).toBe(true)
    })
  })

  // ==========================================================
  // 阻塞/就绪任务
  // ==========================================================
  describe('阻塞/就绪任务', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('blockedTasks 返回依赖未满足的任务', () => {
      const depTask = scheduler.addTask('依赖任务', 'plugin-a')
      scheduler.addTask('阻塞任务', 'plugin-a', { dependencies: [depTask.id] })
      expect(scheduler.blockedTasks.value.length).toBe(1)
      expect(scheduler.blockedTasks.value[0].name).toBe('阻塞任务')
    })

    it('blockedTasks 无阻塞时为空', () => {
      scheduler.addTask('普通任务', 'plugin-a')
      expect(scheduler.blockedTasks.value.length).toBe(0)
    })

    it('readyTasks 返回可执行任务', () => {
      scheduler.addTask('可执行任务', 'plugin-a')
      expect(scheduler.readyTasks.value.length).toBe(1)
      expect(scheduler.readyTasks.value[0].name).toBe('可执行任务')
    })

    it('readyTasks 排除阻塞任务', () => {
      const depTask = scheduler.addTask('依赖任务', 'plugin-a')
      scheduler.addTask('阻塞任务', 'plugin-a', { dependencies: [depTask.id] })
      expect(scheduler.readyTasks.value.length).toBe(1)
      expect(scheduler.readyTasks.value[0].name).toBe('依赖任务')
    })
  })

  // ==========================================================
  // 优先级排序
  // ==========================================================
  describe('优先级排序', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('sortedPendingTasks 按优先级排序', () => {
      scheduler.addTask('低优先级', 'plugin-a', { priority: 'low' })
      scheduler.addTask('高优先级', 'plugin-a', { priority: 'high' })
      scheduler.addTask('普通', 'plugin-a', { priority: 'normal' })
      scheduler.addTask('关键', 'plugin-a', { priority: 'critical' })
      scheduler.addTask('后台', 'plugin-a', { priority: 'background' })

      const sorted = scheduler.sortedPendingTasks.value
      expect(sorted.length).toBe(5)
      // critical > high > normal > low > background
      expect(sorted[0].priority).toBe('critical')
      expect(sorted[1].priority).toBe('high')
      expect(sorted[2].priority).toBe('normal')
      expect(sorted[3].priority).toBe('low')
      expect(sorted[4].priority).toBe('background')
    })

    it('sortedPendingTasks 同优先级按创建时间排序', () => {
      const task1 = scheduler.addTask('先创建', 'plugin-a', { priority: 'normal' })
      const task2 = scheduler.addTask('后创建', 'plugin-a', { priority: 'normal' })
      const sorted = scheduler.sortedPendingTasks.value
      expect(sorted[0].id).toBe(task1.id)
      expect(sorted[1].id).toBe(task2.id)
    })
  })

  // ==========================================================
  // 调度器控制
  // ==========================================================
  describe('调度器控制', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('start 启动调度器', () => {
      scheduler.start()
      expect(scheduler.isRunning.value).toBe(true)
      scheduler.stop()
    })

    it('start 重复启动不应重复设置定时器', () => {
      scheduler.start()
      scheduler.start()
      expect(scheduler.isRunning.value).toBe(true)
      scheduler.stop()
    })

    it('stop 停止调度器', () => {
      scheduler.start()
      scheduler.stop()
      expect(scheduler.isRunning.value).toBe(false)
    })

    it('stop 未启动时不报错', () => {
      expect(() => scheduler.stop()).not.toThrow()
    })

    it('clearAll 清空所有任务', () => {
      scheduler.addTask('任务A', 'plugin-a')
      scheduler.addTask('任务B', 'plugin-b')
      scheduler.clearAll()
      expect(scheduler.tasks.value.length).toBe(0)
      expect(scheduler.stats.value.totalTasks).toBe(0)
    })

    it('clearCompleted 清空已完成任务', () => {
      const task1 = scheduler.addTask('已完成', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.completeTask(task1.id)
      const task2 = scheduler.addTask('待处理', 'plugin-a')
      expect(scheduler.tasks.value.length).toBe(2)
      scheduler.clearCompleted()
      expect(scheduler.tasks.value.length).toBe(1)
      expect(scheduler.tasks.value[0].id).toBe(task2.id)
    })

    it('clearCompleted 同时清空已取消任务', () => {
      const task = scheduler.addTask('待取消', 'plugin-a')
      scheduler.cancelTask(task.id)
      scheduler.clearCompleted()
      expect(scheduler.tasks.value.length).toBe(0)
    })
  })

  // ==========================================================
  // 配置管理
  // ==========================================================
  describe('配置管理', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('updateConfig 更新配置', () => {
      scheduler.updateConfig({ maxConcurrency: 8, defaultTimeout: 60000 })
      expect(scheduler.config.value.maxConcurrency).toBe(8)
      expect(scheduler.config.value.defaultTimeout).toBe(60000)
      // 其他字段保持默认
      expect(scheduler.config.value.priorityEnabled).toBe(true)
    })

    it('updateConfig 部分更新', () => {
      scheduler.updateConfig({ defaultMaxRetries: 5 })
      expect(scheduler.config.value.defaultMaxRetries).toBe(5)
      expect(scheduler.config.value.maxConcurrency).toBe(4)
    })
  })

  // ==========================================================
  // 插件级调度
  // ==========================================================
  describe('插件级调度', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('getTasksByPlugin 过滤指定插件任务', () => {
      scheduler.addTask('插件A任务1', 'plugin-a')
      scheduler.addTask('插件A任务2', 'plugin-a')
      scheduler.addTask('插件B任务', 'plugin-b')
      const pluginATasks = scheduler.getTasksByPlugin('plugin-a')
      expect(pluginATasks.length).toBe(2)
      pluginATasks.forEach((t: any) => expect(t.pluginId).toBe('plugin-a'))
    })

    it('getTasksByPlugin 无匹配返回空数组', () => {
      scheduler.addTask('插件A任务', 'plugin-a')
      const result = scheduler.getTasksByPlugin('nonexistent')
      expect(result).toEqual([])
    })

    it('getPluginStats 统计指定插件', () => {
      const task1 = scheduler.addTask('任务1', 'plugin-a')
      scheduler.addTask('任务2', 'plugin-a')
      // scheduleNext 调度第一个 pending 任务（task1）
      scheduler.scheduleNext()
      scheduler.completeTask(task1.id)
      const stats = scheduler.getPluginStats('plugin-a')
      expect(stats.totalTasks).toBe(2)
      expect(stats.completedTasks).toBe(1)
      expect(stats.successRate).toBe(50)
    })

    it('getPluginStats 无任务时为 0', () => {
      const stats = scheduler.getPluginStats('empty')
      expect(stats.totalTasks).toBe(0)
      expect(stats.successRate).toBe(0)
    })
  })

  // ==========================================================
  // 进度更新
  // ==========================================================
  describe('进度更新', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('updateProgress 更新进度', () => {
      const task = scheduler.addTask('进度任务', 'plugin-a')
      scheduler.scheduleNext()
      const result = scheduler.updateProgress(task.id, 50)
      expect(result).toBe(true)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.progress).toBe(50)
    })

    it('updateProgress 非 running 状态返回 false', () => {
      const task = scheduler.addTask('未运行任务', 'plugin-a')
      const result = scheduler.updateProgress(task.id, 50)
      expect(result).toBe(false)
    })

    it('updateProgress 边界值 clamp 到 0-100', () => {
      const task = scheduler.addTask('边界任务', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.updateProgress(task.id, -10)
      let updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.progress).toBe(0)
      scheduler.updateProgress(task.id, 150)
      updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.progress).toBe(100)
    })

    it('completeTask 设进度为 100', () => {
      const task = scheduler.addTask('完成进度任务', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.updateProgress(task.id, 30)
      scheduler.completeTask(task.id)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task.id)
      expect(updated.progress).toBe(100)
    })
  })

  // ==========================================================
  // 并发控制
  // ==========================================================
  describe('并发控制', () => {
    it('maxConcurrency 限制运行任务数', async () => {
      scheduler = await createScheduler()
      scheduler.updateConfig({ maxConcurrency: 2 })
      // 添加 5 个任务
      for (let i = 0; i < 5; i++) {
        scheduler.addTask(`任务${i + 1}`, 'plugin-a')
      }
      // 调度前两个
      scheduler.scheduleNext()
      scheduler.scheduleNext()
      expect(scheduler.runningTasks.value.length).toBe(2)
      // 再调度一个应该返回 null（已达并发上限）
      const next = scheduler.scheduleNext()
      expect(next).toBeNull()
    })

    it('scheduleNext 无就绪任务返回 null', async () => {
      scheduler = await createScheduler()
      const next = scheduler.scheduleNext()
      expect(next).toBeNull()
    })
  })

  // ==========================================================
  // 统计计算
  // ==========================================================
  describe('统计计算', () => {
    beforeEach(async () => {
      scheduler = await createScheduler()
    })

    it('stats 正确计算 successRate', () => {
      const task1 = scheduler.addTask('成功任务', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.completeTask(task1.id)
      const task2 = scheduler.addTask('第二个任务', 'plugin-a')
      // scheduleNext 调度第二个 pending 任务（task2）
      scheduler.scheduleNext()
      scheduler.completeTask(task2.id)
      scheduler.addTask('失败任务', 'plugin-a')
      // 第三个任务保持 pending，不调度
      expect(scheduler.stats.value.totalTasks).toBe(3)
      expect(scheduler.stats.value.completedTasks).toBe(2)
      expect(scheduler.stats.value.successRate).toBe(67) // 2/3 ≈ 67%
    })

    it('stats averageWaitTime 计算', () => {
      const task1 = scheduler.addTask('等待任务', 'plugin-a')
      // 通过 scheduleNext 设置 startedAt
      scheduler.scheduleNext()
      const updated = scheduler.tasks.value.find((t: any) => t.id === task1.id)
      expect(updated.startedAt).toBeDefined()
      // 等待时间 = startedAt - createdAt
      expect(scheduler.stats.value.averageWaitTime).toBeGreaterThanOrEqual(0)
    })

    it('stats averageExecutionTime 计算', () => {
      const task1 = scheduler.addTask('执行任务', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.completeTask(task1.id)
      const updated = scheduler.tasks.value.find((t: any) => t.id === task1.id)
      expect(updated.completedAt).toBeDefined()
      expect(scheduler.stats.value.averageExecutionTime).toBeGreaterThanOrEqual(0)
    })

    it('stats 无任务时 successRate 为 0', () => {
      expect(scheduler.stats.value.successRate).toBe(0)
    })

    it('stats 反映 pending 和 running 数量', () => {
      scheduler.addTask('待处理1', 'plugin-a')
      scheduler.addTask('待处理2', 'plugin-a')
      scheduler.scheduleNext()
      expect(scheduler.stats.value.pendingTasks).toBe(1)
      expect(scheduler.stats.value.runningTasks).toBe(1)
    })
  })

  // ==========================================================
  // 完整工作流
  // ==========================================================
  describe('完整工作流', () => {
    it('添加多个任务 → 调度 → 完成 → 统计完整流程', async () => {
      scheduler = await createScheduler()
      scheduler.updateConfig({ maxConcurrency: 2 })

      const task1 = scheduler.addTask('关键任务', 'plugin-a', { priority: 'critical' })
      const task2 = scheduler.addTask('普通任务', 'plugin-a', { priority: 'normal' })
      const task3 = scheduler.addTask('依赖任务', 'plugin-a', { dependencies: [task1.id] })

      // 调度任务
      const scheduled1 = scheduler.scheduleNext()
      const scheduled2 = scheduler.scheduleNext()
      expect(scheduled1).not.toBeNull()
      expect(scheduled2).not.toBeNull()
      expect(scheduled1.priority).toBe('critical') // 优先级高的先调度

      // 完成第一个任务
      scheduler.completeTask(task1.id)
      expect(scheduler.stats.value.completedTasks).toBe(1)

      // 完成第二个（普通任务）
      scheduler.completeTask(task2.id)
      expect(scheduler.stats.value.completedTasks).toBe(2)

      // 依赖任务现在可以调度了
      const scheduled3 = scheduler.scheduleNext()
      expect(scheduled3).not.toBeNull()
      expect(scheduled3.id).toBe(task3.id)

      // 完成依赖任务
      scheduler.completeTask(task3.id)
      expect(scheduler.stats.value.completedTasks).toBe(3)
      expect(scheduler.stats.value.successRate).toBe(100)
    })

    it('失败重试流程', async () => {
      scheduler = await createScheduler()
      const task = scheduler.addTask('可重试任务', 'plugin-a')
      scheduler.scheduleNext()
      scheduler.failTask(task.id, '临时错误')
      expect(scheduler.failedTasks.value.length).toBe(1)
      // 重试
      scheduler.retryTask(task.id)
      expect(scheduler.failedTasks.value.length).toBe(0)
      expect(scheduler.pendingTasks.value.length).toBe(1)
    })
  })
})