// ============================================================
// 共鸣协议层 · 线程管理接口 (IThreadManager)
// 定义并发任务、异步操作、队列调度的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult, ResonanceEventListener } from './types'

/** 线程/任务优先级 */
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low' | 'background'

/** 任务状态 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

/** 任务定义 */
export interface TaskDefinition {
  /** 任务唯一 ID */
  readonly id: string
  /** 任务名称 */
  readonly name: string
  /** 任务优先级 */
  readonly priority: TaskPriority
  /** 任务类型标签 */
  readonly type: string
  /** 超时时间（毫秒，0 表示不超时） */
  readonly timeout: number
  /** 是否可取消 */
  readonly cancellable: boolean
  /** 任务上下文 */
  readonly context?: Record<string, unknown>
  /** 依赖任务 ID 列表 */
  readonly dependencies?: string[]
}

/** 任务进度 */
export interface TaskProgress {
  /** 任务 ID */
  taskId: string
  /** 进度 (0-1) */
  progress: number
  /** 进度描述 */
  message?: string
  /** 已耗时（毫秒） */
  elapsed: number
  /** 预计剩余时间（毫秒） */
  estimatedRemaining?: number
}

/** 任务执行结果 */
export interface TaskResult<T = unknown> {
  /** 任务 ID */
  taskId: string
  /** 执行状态 */
  status: TaskStatus
  /** 结果数据 */
  data?: T
  /** 错误信息 */
  error?: string
  /** 执行耗时（毫秒） */
  duration: number
  /** 完成时间戳 */
  completedAt: number
}

/** 队列状态 */
export interface QueueStatus {
  /** 队列名称 */
  queueName: string
  /** 等待中的任务数 */
  pending: number
  /** 运行中的任务数 */
  running: number
  /** 已完成的任务数 */
  completed: number
  /** 失败的任务数 */
  failed: number
  /** 是否已暂停 */
  paused: boolean
}

/** 调度器配置 */
export interface SchedulerConfig {
  /** 最大并发任务数 */
  maxConcurrency: number
  /** 默认超时（毫秒） */
  defaultTimeout: number
  /** 失败重试次数 */
  maxRetries: number
  /** 重试间隔（毫秒） */
  retryDelay: number
  /** 是否自动恢复失败任务 */
  autoRecover: boolean
}

/**
 * 线程管理接口
 * 所有后台任务和异步操作必须遵守此契约
 */
export interface IThreadManager {
  /** 管理器标识 */
  readonly managerId: string
  /** 管理器名称 */
  readonly managerName: string

  // ---- 生命周期 ----
  /** 初始化调度器 */
  initialize(config: SchedulerConfig): void
  /** 销毁调度器，取消所有任务 */
  destroy(): void

  // ---- 任务管理 ----
  /** 提交一个任务 */
  submit<T = unknown>(task: TaskDefinition, executor: () => Promise<T>): Promise<ResonanceResult<TaskResult<T>>>
  /** 取消一个任务 */
  cancel(taskId: string): ResonanceResult<void>
  /** 取消所有任务 */
  cancelAll(): void
  /** 获取任务状态 */
  getTaskStatus(taskId: string): TaskStatus | undefined
  /** 获取任务进度 */
  getTaskProgress(taskId: string): TaskProgress | undefined

  // ---- 队列管理 ----
  /** 暂停队列 */
  pauseQueue(queueName?: string): void
  /** 恢复队列 */
  resumeQueue(queueName?: string): void
  /** 获取队列状态 */
  getQueueStatus(queueName?: string): QueueStatus
  /** 获取所有队列状态 */
  getAllQueueStatuses(): QueueStatus[]

  // ---- 调度器 ----
  /** 获取调度器配置 */
  getConfig(): SchedulerConfig
  /** 更新调度器配置 */
  updateConfig(partial: Partial<SchedulerConfig>): void

  // ---- 事件 ----
  /** 注册任务完成监听器 */
  onTaskComplete(listener: ResonanceEventListener<TaskResult>): void
  /** 注册任务进度监听器 */
  onTaskProgress(listener: ResonanceEventListener<TaskProgress>): void
  /** 注册任务错误监听器 */
  onTaskError(listener: ResonanceEventListener<{ taskId: string; error: string }>): void
  /** 移除监听器 */
  offTaskComplete(listener: ResonanceEventListener<TaskResult>): void
  offTaskProgress(listener: ResonanceEventListener<TaskProgress>): void
  offTaskError(listener: ResonanceEventListener<{ taskId: string; error: string }>): void

  // ---- 统计 ----
  /** 获取统计信息 */
  getStats(): {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    cancelledTasks: number
    averageLatency: number
    uptime: number
  }
}

/**
 * 可延迟任务接口
 * 定义需要延迟执行或定期执行的任务契约
 */
export interface IScheduledTask {
  /** 任务标识 */
  readonly id: string
  /** 任务名称 */
  readonly name: string
  /** 执行间隔（毫秒） */
  readonly interval: number
  /** 是否已启动 */
  readonly running: boolean
  /** 启动 */
  start(): void
  /** 停止 */
  stop(): void
  /** 立即执行一次 */
  executeNow(): Promise<void>
}