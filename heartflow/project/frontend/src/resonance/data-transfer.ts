// ============================================================
// 共鸣协议层 · 数据引渡协议 (IDataTransfer)
// 定义模块间数据交换的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult } from './types'

/** 数据域标识 */
export type DataDomain =
  | 'sessions'    // 专注会话
  | 'crystals'    // 时间结晶
  | 'notes'       // 笔记
  | 'emotions'    // 情绪记录
  | 'anchors'     // 心锚
  | 'goals'       // 目标
  | 'relations'   // 关系
  | 'carriers'    // 载体
  | 'constitution' // 宪法
  | 'advisors'    // 幕僚
  | 'ledger'      // 账本
  | 'tags'        // 标签
  | 'kv'          // 通用 KV

/** 数据变更操作类型 */
export type DataChangeOperation = 'create' | 'update' | 'delete' | 'clear'

/** 数据变更事件 */
export interface DataChangeEvent {
  /** 数据域 */
  domain: DataDomain
  /** 变更操作类型 */
  operation: DataChangeOperation
  /** 变更的条目 ID 列表 */
  entryIds: string[]
  /** 变更时间戳 */
  timestamp: string
  /** 变更来源模块 ID */
  sourceModuleId: string
  /** 变更数据快照（可选，供订阅者消费） */
  snapshot?: Record<string, unknown>[]
}

/** 数据查询条件 */
export interface DataQuery {
  /** 数据域 */
  domain: DataDomain
  /** 筛选条件 */
  filters?: Record<string, unknown>
  /** 排序方式 */
  sortBy?: { field: string; order: 'asc' | 'desc' }
  /** 分页 */
  pagination?: { offset: number; limit: number }
  /** 时间范围 */
  timeRange?: { field: string; from?: string; to?: string }
}

/** 数据查询结果 */
export interface DataQueryResult<T = unknown> {
  /** 结果条目列表 */
  items: T[]
  /** 总条目数 */
  total: number
  /** 是否还有更多 */
  hasMore: boolean
}

/** 数据导出格式 */
export interface DataExport {
  /** 导出版本 */
  version: number
  /** 导出时间 */
  exportedAt: string
  /** 导出数据域 */
  domains: Partial<Record<DataDomain, unknown[]>>
  /** 元数据 */
  meta?: {
    sourceModule: string
    sourceVersion: string
    totalEntries: number
    checksum?: string
  }
}

/** 数据导入选项 */
export interface DataImportOptions {
  /** 冲突解决策略 */
  conflictStrategy: 'local-wins' | 'remote-wins' | 'skip' | 'merge'
  /** 是否允许覆盖 */
  allowOverwrite: boolean
  /** 是否保留删除标记 */
  keepDeleted: boolean
  /** 限制导入的域 */
  domains?: DataDomain[]
}

/** 数据导入结果 */
export interface DataImportResult {
  /** 导入的条目数 */
  imported: number
  /** 跳过的条目数 */
  skipped: number
  /** 冲突的条目数 */
  conflicts: number
  /** 按域统计 */
  byDomain: Partial<Record<DataDomain, { imported: number; skipped: number }>>
  /** 错误信息 */
  errors?: string[]
}

/**
 * 数据引渡协议接口
 * 所有模块间数据交换必须遵守此契约
 */
export interface IDataTransfer {
  /** 协议提供者标识 */
  readonly providerId: string
  /** 支持的数据域列表 */
  readonly supportedDomains: DataDomain[]

  // ---- 读取 ----
  /** 查询数据 */
  query<T = unknown>(query: DataQuery): Promise<ResonanceResult<DataQueryResult<T>>>
  /** 按 ID 获取单条数据 */
  getById<T = unknown>(domain: DataDomain, id: string): Promise<ResonanceResult<T | undefined>>
  /** 获取指定域的所有数据 */
  getAll<T = unknown>(domain: DataDomain): Promise<ResonanceResult<T[]>>

  // ---- 写入 ----
  /** 创建数据 */
  create<T = unknown>(domain: DataDomain, data: T): Promise<ResonanceResult<T>>
  /** 更新数据 */
  update<T = unknown>(domain: DataDomain, id: string, data: Partial<T>): Promise<ResonanceResult<T>>
  /** 删除数据 */
  delete(domain: DataDomain, id: string): Promise<ResonanceResult<void>>
  /** 批量操作 */
  batch(
    operations: Array<{ domain: DataDomain; operation: DataChangeOperation; data: unknown }>,
  ): Promise<ResonanceResult<{ succeeded: number; failed: number }>>

  // ---- 导入导出 ----
  /** 导出数据 */
  exportData(domains?: DataDomain[]): Promise<ResonanceResult<DataExport>>
  /** 导入数据 */
  importData(data: DataExport, options?: DataImportOptions): Promise<ResonanceResult<DataImportResult>>

  // ---- 变更通知 ----
  /** 订阅数据变更 */
  subscribe(domain: DataDomain, listener: (event: DataChangeEvent) => void): void
  /** 取消订阅 */
  unsubscribe(domain: DataDomain, listener: (event: DataChangeEvent) => void): void
  /** 发布变更通知 */
  notify(event: DataChangeEvent): void
}

/**
 * 数据引渡桥接接口
 * 用于在运行时桥接存储引擎和共鸣协议层
 */
export interface IDataBridge {
  /** 注册一个数据源 */
  registerSource(provider: IDataTransfer): ResonanceResult<void>
  /** 取消注册 */
  unregisterSource(providerId: string): ResonanceResult<void>
  /** 跨源联合查询 */
  federatedQuery<T = unknown>(query: DataQuery): Promise<ResonanceResult<DataQueryResult<T>>>
  /** 获取所有数据源 */
  getSources(): IDataTransfer[]
}