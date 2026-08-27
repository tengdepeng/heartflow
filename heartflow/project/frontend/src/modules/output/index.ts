// ============================================================
// 输出管理 · 核心模块
// 模块一：用户主动写入流的第一站
// 负责接收、验证、写入本地存储，并通知时间线索引更新
// ============================================================

import { storage } from '../../engine/storage'
import { ref } from 'vue'
import type {
  OutputRecord,
  OutputRecordType,
  OutputRecordStatus,
  OutputState,
  OutputEvent,
  OutputEventListener,
  CreateRecordParams,
  IOutputManager,
  OutputConfig,
} from './types'
import { DEFAULT_OUTPUT_CONFIG } from './types'
import { governanceCheckRecord } from './governance-gate'

export type { OutputRecord, OutputRecordType, OutputRecordStatus, OutputState, OutputEvent, CreateRecordParams, IOutputManager, OutputConfig }
export { DEFAULT_OUTPUT_CONFIG }

// ---- 发布流水线（P15-8） ----
export {
  usePublishPipeline,
  PIPELINE_STAGE_META,
  PUBLISH_CHANNEL_META,
  DEFAULT_PIPELINE_CONFIG,
} from './publish-pipeline'
export type {
  PipelineStage,
  PipelineStageMeta,
  PipelineRecord,
  PipelineStageEntry,
  PublishChannel,
  VersionSnapshot,
  VersionChangeSummary,
  VersionDiff,
  DiffBlock,
  Comment,
  CommentAnchor,
  CommentThread,
  PublishStats,
  CommentStats,
  VersionStats,
  PipelineConfig,
} from './publish-pipeline'

// ---- 工具函数 ----

function genId(): string {
  return `out_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function now(): string {
  return new Date().toISOString()
}

/** 简单的事件总线实现 */
class OutputEventBus {
  private listeners = new Map<string, Set<OutputEventListener>>()

  on(eventType: string, listener: OutputEventListener): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(listener)
  }

  off(eventType: string, listener: OutputEventListener): void {
    this.listeners.get(eventType)?.delete(listener)
  }

  /** 发布事件，失败时按指定间隔重试 */
  async emit(event: OutputEvent, retryDelays: number[] = DEFAULT_OUTPUT_CONFIG.eventRetryDelays): Promise<boolean> {
    const listeners = this.listeners.get(event.type)
    if (!listeners || listeners.size === 0) return true

    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        const promises: Promise<void>[] = []
        for (const listener of listeners) {
          const result = listener(event)
          if (result instanceof Promise) {
            promises.push(result)
          }
        }
        if (promises.length > 0) {
          await Promise.all(promises)
        }
        return true
      } catch (err) {
        if (attempt < retryDelays.length) {
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]))
        } else {
          console.error(`[Output] 事件 ${event.type} 发布失败，已重试 ${retryDelays.length} 次:`, err)
          return false
        }
      }
    }
    return false
  }
}

// ---- 状态机 ----

/** 状态转换规则：当前状态 → 允许的目标状态 */
const STATE_TRANSITIONS: Record<OutputState, OutputState[]> = {
  hidden: ['expanded'],
  expanded: ['editing', 'hidden'],
  editing: ['submitting', 'expanded'],
  submitting: ['hidden', 'expanded', 'error'],
  error: ['editing', 'hidden'],
}

function isValidTransition(from: OutputState, to: OutputState): boolean {
  const allowed = STATE_TRANSITIONS[from]
  return allowed ? allowed.includes(to) : false
}

// ---- 存储检查 ----

/** 检查是否有足够的存储空间 */
function checkStorageAvailable(threshold: number = DEFAULT_OUTPUT_CONFIG.storageThreshold): boolean {
  try {
    // 估算当前localStorage使用量
    let total = 0
    for (const key of Object.keys(localStorage)) {
      const item = localStorage.getItem(key)
      if (item) total += item.length * 2 // UTF-16
    }
    // 检查剩余空间（localStorage 通常约 5MB）
    const remaining = 5 * 1024 * 1024 - total
    return remaining > threshold
  } catch {
    return false
  }
}

// ---- 权限检查占位 ----

/** 治理检查接口（#85 输出治理闸接守护室：本地写入仅观测，命中上报审计） */
function governanceCheck(params: CreateRecordParams): { allowed: boolean; reason?: string } {
  const result = governanceCheckRecord(params)
  return { allowed: result.allowed, reason: result.reason }
}

// ---- 输出管理器 ----

export function useOutputManager(config: Partial<OutputConfig> = {}): IOutputManager {
  const cfg = { ...DEFAULT_OUTPUT_CONFIG, ...config }
  const eventBus = new OutputEventBus()

  // ---- 状态机 ----
  const _state = ref<OutputState>('hidden')

  // ---- 存储层 ----
  /** 从 localStorage 加载所有输出记录 */
  function loadRecords(): OutputRecord[] {
    return storage.getKV<OutputRecord[]>('hf:output_records', [])
  }

  /** 保存输出记录到 localStorage */
  function saveRecords(records: OutputRecord[]): void {
    storage.setKV('hf:output_records', records)
  }

  let _records = loadRecords()

  // ============================================================
  // 对外接口
  // ============================================================

  /** 创建记录 */
  function create(params: CreateRecordParams): OutputRecord | null {
    // 1. 治理检查
    const check = governanceCheck(params)
    if (!check.allowed) {
      console.warn(`[Output] 治理检查未通过: ${check.reason}`)
      return null
    }

    // 2. 存储空间检查
    if (!checkStorageAvailable(cfg.storageThreshold)) {
      console.warn('[Output] 存储空间不足')
      return null
    }

    const timestamp = now()
    const record: OutputRecord = {
      id: genId(),
      type: params.type,
      content: params.content,
      createdAt: timestamp,
      updatedAt: timestamp,
      roomSource: params.roomSource,
      status: 'published',
      // 扩展字段
      format: params.format,
      attachments: params.attachments,
      linkedCrystals: params.linkedCrystals,
      emotionCategory: params.emotionCategory,
      intensity: params.intensity,
      triggerEvent: params.triggerEvent,
      anchorType: params.anchorType,
      scheduledTime: params.scheduledTime,
      zone: params.zone,
    }

    // 3. 写入存储
    _records.push(record)
    saveRecords(_records)

    // 4. 发布事件（异步，不影响用户侧反馈）
    const event: OutputEvent = {
      type: 'record:created',
      record,
      timestamp,
    }
    eventBus.emit(event, cfg.eventRetryDelays).catch(err => {
      console.error('[Output] 事件发布失败（异步重试后）:', err)
    })

    return record
  }

  /** 更新记录 */
  function update(id: string, updates: Partial<OutputRecord>): boolean {
    const index = _records.findIndex(r => r.id === id)
    if (index === -1) return false

    _records[index] = {
      ..._records[index],
      ...updates,
      id, // 确保 ID 不变
      updatedAt: now(),
    }
    saveRecords(_records)

    // 发布更新事件
    const event: OutputEvent = {
      type: 'record:updated',
      record: _records[index],
      timestamp: now(),
    }
    eventBus.emit(event, cfg.eventRetryDelays).catch(() => {})

    return true
  }

  /** 删除记录 */
  function deleteRecord(id: string): boolean {
    const index = _records.findIndex(r => r.id === id)
    if (index === -1) return false

    const deleted = _records.splice(index, 1)[0]
    saveRecords(_records)

    // 发布删除事件
    const event: OutputEvent = {
      type: 'record:deleted',
      record: deleted,
      timestamp: now(),
    }
    eventBus.emit(event, cfg.eventRetryDelays).catch(() => {})

    return true
  }

  /** 获取单条记录 */
  function get(id: string): OutputRecord | undefined {
    return _records.find(r => r.id === id)
  }

  /** 获取所有记录 */
  function getAll(): OutputRecord[] {
    return [..._records]
  }

  /** 按类型获取记录 */
  function getByType(type: OutputRecordType): OutputRecord[] {
    return _records.filter(r => r.type === type)
  }

  /** 按日期范围获取记录 */
  function getByDateRange(start: string, end: string): OutputRecord[] {
    return _records.filter(r => {
      return r.createdAt >= start && r.createdAt <= end
    })
  }

  // ============================================================
  // 状态机
  // ============================================================

  /** 状态转换 */
  function transition(target: OutputState): boolean {
    if (!isValidTransition(_state.value, target)) {
      console.warn(`[Output] 无效状态转换: ${_state.value} → ${target}`)
      return false
    }

    // hidden → expanded: 无需检查
    // expanded → editing: 无需检查
    // editing → submitting: 无需检查
    // submitting → hidden: 提交成功
    // submitting → error: 提交失败
    // submitting → expanded: 错误后返回编辑
    // error → editing: 重试
    // error → hidden: 放弃

    _state.value = target

    // hidden 时清空内容（由调用方处理）
    return true
  }

  /** 重置状态 */
  function reset(): void {
    _state.value = 'hidden'
  }

  // ============================================================
  // 事件订阅
  // ============================================================

  function on(eventType: string, listener: OutputEventListener): void {
    eventBus.on(eventType, listener)
  }

  function off(eventType: string, listener: OutputEventListener): void {
    eventBus.off(eventType, listener)
  }

  return {
    // 对外接口
    create,
    update,
    delete: deleteRecord,
    get,
    // 状态机
    get state() { return _state.value },
    transition,
    reset,
    // 事件订阅
    on,
    off,
    // 数据
    get records() { return [..._records] },
    getAll,
    getByType,
    getByDateRange,
  }
}