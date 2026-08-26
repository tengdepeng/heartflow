// ============================================================
// 插件调度层 · 高级调度引擎
// 任务调度、依赖管理、优先级队列、执行上下文
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型定义
// ============================================================

/** 调度任务优先级 */
export type SchedulePriority = 'critical' | 'high' | 'normal' | 'low' | 'background'

/** 调度任务状态 */
export type ScheduleTaskStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

/** 调度任务 */
export interface ScheduleTask {
  id: string
  /** 任务名称 */
  name: string
  /** 优先级 */
  priority: SchedulePriority
  /** 状态 */
  status: ScheduleTaskStatus
  /** 所属插件 ID */
  pluginId: string
  /** 依赖任务 ID 列表 */
  dependencies: string[]
  /** 超时时间（毫秒） */
  timeout: number
  /** 最大重试次数 */
  maxRetries: number
  /** 当前重试次数 */
  retryCount: number
  /** 进度 0-100 */
  progress: number
  /** 创建时间 */
  createdAt: string
  /** 开始时间 */
  startedAt?: string
  /** 完成时间 */
  completedAt?: string
  /** 错误信息 */
  error?: string
  /** 任务元数据 */
  metadata?: Record<string, unknown>
}

/** 调度器配置 */
export interface SchedulerConfig {
  /** 最大并发任务数 */
  maxConcurrency: number
  /** 是否启用优先级调度 */
  priorityEnabled: boolean
  /** 任务超时默认值（毫秒） */
  defaultTimeout: number
  /** 最大重试次数默认值 */
  defaultMaxRetries: number
  /** 是否自动重试失败任务 */
  autoRetry: boolean
  /** 调度间隔（毫秒） */
  tickInterval: number
}

/** 调度统计 */
export interface ScheduleStats {
  totalTasks: number
  pendingTasks: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
  averageWaitTime: number
  averageExecutionTime: number
  successRate: number
}

/** 优先级权重 */
export const PRIORITY_WEIGHT: Record<SchedulePriority, number> = {
  critical: 100,
  high: 75,
  normal: 50,
  low: 25,
  background: 10,
}

/** 优先级元数据 */
export const PRIORITY_META: Record<SchedulePriority, { label: string; icon: string; color: string }> = {
  critical: { label: '关键', icon: '🔴', color: '#ef4444' },
  high: { label: '高', icon: '🟠', color: '#cf8b6b' },
  normal: { label: '普通', icon: '🟡', color: '#f0c040' },
  low: { label: '低', icon: '🟢', color: '#34d399' },
  background: { label: '后台', icon: '⚪', color: '#7a7f8c' },
}

/** 默认调度器配置 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrency: 4,
  priorityEnabled: true,
  defaultTimeout: 30000,
  defaultMaxRetries: 3,
  autoRetry: true,
  tickInterval: 100,
}

/** 存储键 */
const SCHEDULE_STORAGE_KEY = 'hf:plugin:scheduler:tasks'
const SCHEDULE_CONFIG_KEY = 'hf:plugin:scheduler:config'

// ============================================================
// 插件调度器
// ============================================================

export function usePluginScheduler() {
  const tasks = ref<ScheduleTask[]>(loadTasks())
  const config = ref<SchedulerConfig>(loadConfig())
  const isRunning = ref(false)
  const _tickTimer = ref<ReturnType<typeof setInterval> | null>(null)

  // ---- 持久化 ----

  function loadTasks(): ScheduleTask[] {
    try {
      const raw = storage.getKV<string>(SCHEDULE_STORAGE_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveTasks() {
    storage.setKV(SCHEDULE_STORAGE_KEY, JSON.stringify(tasks.value))
  }

  function loadConfig(): SchedulerConfig {
    try {
      const raw = storage.getKV<string>(SCHEDULE_CONFIG_KEY, '')
      if (!raw) return { ...DEFAULT_SCHEDULER_CONFIG }
      return { ...DEFAULT_SCHEDULER_CONFIG, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_SCHEDULER_CONFIG } }
  }

  function saveConfig() {
    storage.setKV(SCHEDULE_CONFIG_KEY, JSON.stringify(config.value))
  }

  // ---- 计算属性 ----

  const pendingTasks = computed(() =>
    tasks.value.filter(t => t.status === 'pending')
  )

  const runningTasks = computed(() =>
    tasks.value.filter(t => t.status === 'running')
  )

  const failedTasks = computed(() =>
    tasks.value.filter(t => t.status === 'failed')
  )

  /** 按优先级排序的待执行任务 */
  const sortedPendingTasks = computed(() => {
    return [...pendingTasks.value].sort((a, b) => {
      const weightDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority]
      if (weightDiff !== 0) return weightDiff
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })
  })

  /** 调度统计 */
  const stats = computed<ScheduleStats>(() => {
    const all = tasks.value
    const completed = all.filter(t => t.status === 'completed')
    const total = all.length
    return {
      totalTasks: total,
      pendingTasks: pendingTasks.value.length,
      runningTasks: runningTasks.value.length,
      completedTasks: completed.length,
      failedTasks: failedTasks.value.length,
      averageWaitTime: calculateAverageWait(all),
      averageExecutionTime: calculateAverageExecution(all),
      successRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    }
  })

  // ---- 任务管理 ----

  /** 添加任务 */
  function addTask(
    name: string,
    pluginId: string,
    options?: {
      priority?: SchedulePriority
      dependencies?: string[]
      timeout?: number
      maxRetries?: number
      metadata?: Record<string, unknown>
    }
  ): ScheduleTask {
    const task: ScheduleTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      priority: options?.priority ?? 'normal',
      status: 'pending',
      pluginId,
      dependencies: options?.dependencies ?? [],
      timeout: options?.timeout ?? config.value.defaultTimeout,
      maxRetries: options?.maxRetries ?? config.value.defaultMaxRetries,
      retryCount: 0,
      progress: 0,
      createdAt: new Date().toISOString(),
      metadata: options?.metadata,
    }
    tasks.value.push(task)
    saveTasks()
    return task
  }

  /** 取消任务 */
  function cancelTask(taskId: string): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status === 'completed' || task.status === 'cancelled') return false
    task.status = 'cancelled'
    saveTasks()
    return true
  }

  /** 重试失败任务 */
  function retryTask(taskId: string): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'failed') return false
    task.status = 'pending'
    task.retryCount = 0
    task.progress = 0
    task.error = undefined
    saveTasks()
    return true
  }

  /** 更新任务进度 */
  function updateProgress(taskId: string, progress: number): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'running') return false
    task.progress = Math.max(0, Math.min(100, progress))
    return true
  }

  /** 标记任务完成 */
  function completeTask(taskId: string): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'running') return false
    task.status = 'completed'
    task.progress = 100
    task.completedAt = new Date().toISOString()
    saveTasks()
    return true
  }

  /** 标记任务失败 */
  function failTask(taskId: string, error: string): boolean {
    const task = tasks.value.find(t => t.id === taskId)
    if (!task || task.status !== 'running') return false
    task.status = 'failed'
    task.error = error
    task.completedAt = new Date().toISOString()
    saveTasks()
    return true
  }

  // ---- 依赖检查 ----

  /** 检查任务依赖是否满足 */
  function areDependenciesMet(task: ScheduleTask): boolean {
    if (task.dependencies.length === 0) return true
    return task.dependencies.every(depId => {
      const dep = tasks.value.find(t => t.id === depId)
      return dep && dep.status === 'completed'
    })
  }

  /** 获取被阻塞的任务（依赖未满足） */
  const blockedTasks = computed(() => {
    return pendingTasks.value.filter(t => !areDependenciesMet(t))
  })

  /** 获取可执行的任务（依赖已满足） */
  const readyTasks = computed(() => {
    return pendingTasks.value.filter(t => areDependenciesMet(t))
  })

  // ---- 调度器控制 ----

  /** 调度下一个任务 */
  function scheduleNext(): ScheduleTask | null {
    if (runningTasks.value.length >= config.value.maxConcurrency) return null
    const ready = readyTasks.value
    if (ready.length === 0) return null
    const next = ready[0]
    next.status = 'running'
    next.startedAt = new Date().toISOString()
    saveTasks()
    return next
  }

  /** 启动调度器 */
  function start() {
    if (isRunning.value) return
    isRunning.value = true
    _tickTimer.value = setInterval(() => {
      while (runningTasks.value.length < config.value.maxConcurrency && readyTasks.value.length > 0) {
        scheduleNext()
      }
    }, config.value.tickInterval)
  }

  /** 停止调度器 */
  function stop() {
    isRunning.value = false
    if (_tickTimer.value) {
      clearInterval(_tickTimer.value)
      _tickTimer.value = null
    }
  }

  /** 清空所有任务 */
  function clearAll() {
    tasks.value = []
    saveTasks()
  }

  /** 清空已完成任务 */
  function clearCompleted() {
    tasks.value = tasks.value.filter(t => t.status !== 'completed' && t.status !== 'cancelled')
    saveTasks()
  }

  // ---- 配置管理 ----

  function updateConfig(updates: Partial<SchedulerConfig>) {
    config.value = { ...config.value, ...updates }
    saveConfig()
  }

  // ---- 插件级调度 ----

  /** 按插件获取任务 */
  function getTasksByPlugin(pluginId: string): ScheduleTask[] {
    return tasks.value.filter(t => t.pluginId === pluginId)
  }

  /** 按插件获取统计 */
  function getPluginStats(pluginId: string): ScheduleStats {
    const pluginTasks = getTasksByPlugin(pluginId)
    const completed = pluginTasks.filter(t => t.status === 'completed')
    const total = pluginTasks.length
    return {
      totalTasks: total,
      pendingTasks: pluginTasks.filter(t => t.status === 'pending').length,
      runningTasks: pluginTasks.filter(t => t.status === 'running').length,
      completedTasks: completed.length,
      failedTasks: pluginTasks.filter(t => t.status === 'failed').length,
      averageWaitTime: calculateAverageWait(pluginTasks),
      averageExecutionTime: calculateAverageExecution(pluginTasks),
      successRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
    }
  }

  return {
    // 状态
    tasks,
    config,
    isRunning,

    // 计算属性
    pendingTasks,
    runningTasks,
    failedTasks,
    sortedPendingTasks,
    blockedTasks,
    readyTasks,
    stats,

    // 任务管理
    addTask,
    cancelTask,
    retryTask,
    updateProgress,
    completeTask,
    failTask,

    // 依赖检查
    areDependenciesMet,

    // 调度器控制
    scheduleNext,
    start,
    stop,
    clearAll,
    clearCompleted,

    // 配置
    updateConfig,

    // 插件级
    getTasksByPlugin,
    getPluginStats,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function calculateAverageWait(tasks: ScheduleTask[]): number {
  const withTimestamps = tasks.filter(t => t.createdAt && t.startedAt)
  if (withTimestamps.length === 0) return 0
  const total = withTimestamps.reduce((sum, t) => {
    return sum + (new Date(t.startedAt!).getTime() - new Date(t.createdAt).getTime())
  }, 0)
  return Math.round(total / withTimestamps.length)
}

function calculateAverageExecution(tasks: ScheduleTask[]): number {
  const withTimestamps = tasks.filter(t => t.startedAt && t.completedAt)
  if (withTimestamps.length === 0) return 0
  const total = withTimestamps.reduce((sum, t) => {
    return sum + (new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime())
  }, 0)
  return Math.round(total / withTimestamps.length)
}