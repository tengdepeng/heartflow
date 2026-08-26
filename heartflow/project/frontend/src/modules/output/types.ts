// ============================================================
// 输出管理 · 类型定义
// 模块一：用户主动写入流的第一站
// ============================================================

/** 输出记录类型 */
export type OutputRecordType = 'note' | 'emotion' | 'anchor' | 'crystal' | 'session'

/** 输出记录状态 */
export type OutputRecordStatus = 'draft' | 'published' | 'archived' | 'deleted'

/** 输出浮层状态机 */
export type OutputState = 'hidden' | 'expanded' | 'editing' | 'submitting' | 'error'

/** 统一记录结构 */
export interface OutputRecord {
  id: string
  type: OutputRecordType
  content: string
  createdAt: string
  updatedAt: string
  roomSource: string
  status: OutputRecordStatus

  // ---- 笔记扩展 ----
  format?: 'text' | 'markdown' | 'rich'
  attachments?: string[]
  linkedCrystals?: string[]

  // ---- 情绪扩展 ----
  emotionCategory?: string
  intensity?: number
  triggerEvent?: string

  // ---- 锚点扩展 ----
  anchorType?: 'must' | 'optional' | 'floating'
  scheduledTime?: string
  zone?: string
  completedAt?: string
}

/** 输出事件 */
export interface OutputEvent {
  type: 'record:created' | 'record:updated' | 'record:deleted'
  record: OutputRecord
  timestamp: string
}

/** 事件监听器 */
export type OutputEventListener = (event: OutputEvent) => void | Promise<void>

/** 创建记录参数 */
export interface CreateRecordParams {
  type: OutputRecordType
  content: string
  roomSource: string
  format?: 'text' | 'markdown' | 'rich'
  attachments?: string[]
  linkedCrystals?: string[]
  emotionCategory?: string
  intensity?: number
  triggerEvent?: string
  anchorType?: 'must' | 'optional' | 'floating'
  scheduledTime?: string
  zone?: string
}

/** 输出管理器接口 */
export interface IOutputManager {
  // ---- 对外接口 ----
  create(params: CreateRecordParams): OutputRecord | null
  update(id: string, updates: Partial<OutputRecord>): boolean
  delete(id: string): boolean
  get(id: string): OutputRecord | undefined

  // ---- 状态机 ----
  readonly state: OutputState
  transition(target: OutputState): boolean
  reset(): void

  // ---- 事件订阅 ----
  on(eventType: string, listener: OutputEventListener): void
  off(eventType: string, listener: OutputEventListener): void

  // ---- 数据 ----
  readonly records: OutputRecord[]
  getAll(): OutputRecord[]
  getByType(type: OutputRecordType): OutputRecord[]
  getByDateRange(start: string, end: string): OutputRecord[]
}

/** 输出配置 */
export interface OutputConfig {
  /** 浮层高度百分比 */
  overlayHeightPercent: number
  /** 提交后浮层收起延迟（毫秒） */
  collapseDelay: number
  /** 提交失败重试次数 */
  maxRetries: number
  /** 重试间隔（毫秒） */
  retryDelays: number[]
  /** 事件发布重试间隔 */
  eventRetryDelays: number[]
  /** 存储空间预留检测 */
  storageThreshold: number
}

/** 默认输出配置 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  overlayHeightPercent: 35,
  collapseDelay: 200,
  maxRetries: 3,
  retryDelays: [1000, 3000, 5000],
  eventRetryDelays: [1000, 3000, 5000],
  storageThreshold: 1024 * 100, // 100KB 预留
}