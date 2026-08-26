// ============================================================
// 共鸣协议层 · 业务能力接口 (IBusinessCapability)
// 定义所有业务模块必须遵守的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult, ResonanceEventListener } from './types'

/** 业务能力级别 */
export type CapabilityLevel = 'core' | 'standard' | 'extended' | 'experimental'

/** 业务能力元数据 */
export interface CapabilityMeta {
  /** 能力唯一标识 */
  readonly id: string
  /** 能力名称 */
  readonly name: string
  /** 能力级别 */
  readonly level: CapabilityLevel
  /** 能力描述 */
  readonly description: string
  /** 依赖的其他能力 ID 列表 */
  readonly dependencies: string[]
  /** 能力版本 */
  readonly version: string
}

/** 业务能力状态 */
export interface CapabilityStatus {
  /** 是否已初始化 */
  initialized: boolean
  /** 是否启用 */
  enabled: boolean
  /** 是否繁忙 */
  busy: boolean
  /** 最后活动时间 */
  lastActivityAt: number | null
  /** 错误信息 */
  error?: string
}

/** 业务能力调用参数 */
export interface CapabilityInvocation {
  /** 操作名称 */
  operation: string
  /** 调用参数 */
  params?: Record<string, unknown>
  /** 调用上下文 */
  context?: Record<string, unknown>
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * 业务能力接口
 * 所有业务模块在注册时必须提供此接口的实现
 */
export interface IBusinessCapability {
  /** 能力元数据 */
  readonly meta: CapabilityMeta

  // ---- 生命周期 ----
  /** 初始化能力模块 */
  initialize(): Promise<ResonanceResult<void>>
  /** 销毁能力模块，释放资源 */
  destroy(): Promise<ResonanceResult<void>>

  // ---- 执行 ----
  /** 调用一个业务操作 */
  invoke(invocation: CapabilityInvocation): Promise<ResonanceResult<unknown>>
  /** 检查是否支持某个操作 */
  canHandle(operation: string): boolean

  // ---- 状态 ----
  /** 获取当前状态 */
  getStatus(): CapabilityStatus
  /** 启用 */
  enable(): void
  /** 禁用 */
  disable(): void

  // ---- 事件 ----
  /** 注册状态变更监听器 */
  onStatusChange(listener: ResonanceEventListener<CapabilityStatus>): void
  /** 移除状态变更监听器 */
  offStatusChange(listener: ResonanceEventListener<CapabilityStatus>): void
}

/**
 * 业务能力发现接口
 * 供能力消费者查询和定位所需能力
 */
export interface ICapabilityRegistry {
  /** 注册一个业务能力 */
  register(capability: IBusinessCapability): ResonanceResult<void>
  /** 注销一个业务能力 */
  unregister(capabilityId: string): ResonanceResult<void>
  /** 按 ID 查找能力 */
  findById(capabilityId: string): IBusinessCapability | undefined
  /** 按名称关键词搜索 */
  search(keyword: string): IBusinessCapability[]
  /** 按级别筛选 */
  findByLevel(level: CapabilityLevel): IBusinessCapability[]
  /** 获取所有已注册的能力 */
  getAll(): IBusinessCapability[]
}