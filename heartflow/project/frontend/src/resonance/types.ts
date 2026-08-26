// ============================================================
// 共鸣协议层 · 核心类型定义
// 第二层架构：定义所有模块之间的"共鸣频率"
// 不实现任何具体功能，只定规则
// ============================================================

import type { RoomNode } from '../engine/room-graph'

// ---- 模块标识 ----

/** 共鸣协议 · 模块标识 */
export interface ModuleIdentity {
  /** 模块唯一 ID */
  readonly id: string
  /** 模块名称 */
  readonly name: string
  /** 模块版本号（语义化版本） */
  readonly version: string
  /** 模块描述 */
  readonly description: string
  /** 模块提供的接口列表 */
  readonly provides: InterfaceType[]
  /** 模块依赖的接口列表 */
  readonly requires: InterfaceType[]
}

// ---- 接口类型枚举 ----

/** 共鸣协议定义的 8 类接口类型 */
export type InterfaceType =
  | 'interaction'      // 交互引擎接口
  | 'capability'       // 业务能力接口
  | 'ai'               // AI 能力接口
  | 'knowledge'        // 知识接引接口
  | 'data-transfer'    // 数据引渡协议
  | 'automation'       // 自动化引擎接口
  | 'thread'           // 线程管理接口
  | 'extension'        // 扩展接口

// ---- 注册与发现 ----

/** 模块注册信息 */
export interface ModuleRegistration {
  identity: ModuleIdentity
  instance: unknown
  registeredAt: number
  status: 'active' | 'inactive' | 'error'
  error?: string
}

/** 模块查询过滤器 */
export interface ModuleFilter {
  /** 按接口类型筛选 */
  provides?: InterfaceType[]
  /** 按状态筛选 */
  status?: 'active' | 'inactive' | 'error'
  /** 按名称关键词模糊匹配 */
  nameKeyword?: string
}

// ---- 通用协议基类 ----

/** 协议调用返回值基类 */
export interface ResonanceResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  /** 调用耗时（毫秒） */
  latency?: number
}

/** 协议事件监听器 */
export type ResonanceEventListener<T = unknown> = (event: T) => void | Promise<void>

// ---- 注册表状态 ----

/** 共鸣协议注册表状态 */
export interface ResonanceRegistryState {
  /** 已注册模块数量 */
  moduleCount: number
  /** 活跃模块数量 */
  activeModuleCount: number
  /** 各接口类型的注册数量 */
  interfaceCounts: Record<InterfaceType, number>
  /** 最后注册时间 */
  lastRegisteredAt: number | null
  /** 注册表是否已初始化 */
  initialized: boolean
}

// ---- 共鸣协议核心接口 ----

/**
 * 共鸣协议核心接口
 * 所有模块通过此接口注册、发现和通信
 */
export interface IResonanceProtocol {
  // ---- 模组注册 ----
  /** 注册一个模块到共鸣协议层 */
  register(module: ModuleIdentity, instance: unknown): ResonanceResult<void>
  /** 注销一个模块 */
  unregister(moduleId: string): ResonanceResult<void>
  /** 更新模块状态 */
  updateStatus(moduleId: string, status: ModuleRegistration['status'], error?: string): ResonanceResult<void>

  // ---- 模块发现 ----
  /** 按模块 ID 查找 */
  findById(moduleId: string): ModuleRegistration | undefined
  /** 按接口类型查找所有提供该接口的模块 */
  findByInterface(type: InterfaceType): ModuleRegistration[]
  /** 按过滤器查询 */
  query(filter: ModuleFilter): ModuleRegistration[]
  /** 获取所有已注册模块 */
  getAll(): ModuleRegistration[]

  // ---- 状态查询 ----
  /** 获取注册表状态 */
  getState(): ResonanceRegistryState
  /** 检查指定接口类型是否至少有一个活跃提供者 */
  isInterfaceAvailable(type: InterfaceType): boolean
  /** 检查指定模块是否已注册 */
  isRegistered(moduleId: string): boolean

  // ---- 生命周期 ----
  /** 初始化共鸣协议层 */
  initialize(): void
  /** 销毁所有注册（用于测试/重置） */
  destroy(): void
}

// ---- 导航上下文 ----

/** 导航上下文（供交互引擎和业务能力模块共享） */
export interface NavigationContext {
  /** 当前房间 */
  currentRoom: RoomNode | null
  /** 导航历史（最近 N 个房间 ID） */
  history: string[]
  /** 是否正在动画过渡中 */
  isTransitioning: boolean
  /** 过渡动画类型 */
  transitionType?: 'slide' | 'fade' | 'light-gate' | 'none'
  /** 导航目标房间 ID */
  targetRoomId?: string
}