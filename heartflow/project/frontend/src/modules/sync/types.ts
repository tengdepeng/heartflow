// ============================================================
// P2P 同步引擎 · 类型定义
// ============================================================

/** 同步状态 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

/** 同步方向 */
export type SyncDirection = 'export' | 'import' | 'bidirectional'

/** 同步目标 */
export interface SyncTarget {
  /** 设备/对端标识 */
  id: string
  /** 设备名称 */
  name: string
  /** 设备类型 */
  type: 'local' | 'remote' | 'file'
  /** 上次同步时间 */
  lastSyncAt: string | null
  /** 上次同步状态 */
  lastSyncStatus: SyncStatus
}

/** 同步数据域 */
export type SyncDomain = 'sessions' | 'crystals' | 'carriers' | 'notes' | 'emotions' | 'anchors' | 'goals' | 'relations' | 'ledger' | 'tags' | 'config'

/** 同步变更条目 */
export interface SyncChange {
  /** 数据域 */
  domain: SyncDomain
  /** 变更类型 */
  type: 'create' | 'update' | 'delete'
  /** 条目 ID */
  id: string
  /** 变更时间戳 */
  timestamp: string
  /** 变更数据（序列化 JSON） */
  data: string
  /** 数据哈希（用于冲突检测） */
  hash: string
}

/** 同步快照（一次同步的完整状态记录） */
export interface SyncSnapshot {
  /** 快照 ID */
  id: string
  /** 创建时间 */
  createdAt: string
  /** 数据域快照 */
  domains: Partial<Record<SyncDomain, number>>
  /** 总条目数 */
  totalEntries: number
  /** 快照大小（字节） */
  sizeBytes: number
  /** 所属设备 */
  deviceId: string
}

/** 同步冲突记录 */
export interface SyncConflict {
  /** 冲突 ID */
  id: string
  /** 数据域 */
  domain: SyncDomain
  /** 条目 ID */
  entryId: string
  /** 本地数据 */
  localData: string
  /** 远程数据 */
  remoteData: string
  /** 本地时间戳 */
  localTimestamp: string
  /** 远程时间戳 */
  remoteTimestamp: string
  /** 解决方式 */
  resolution: 'local' | 'remote' | 'merged' | null
  /** 解决时间 */
  resolvedAt: string | null
  /** 冲突发生时间 */
  occurredAt: string
}

/** 同步日志条目 */
export interface SyncLogEntry {
  /** 日志 ID */
  id: string
  /** 同步时间 */
  timestamp: string
  /** 同步目标 */
  targetId: string
  /** 同步方向 */
  direction: SyncDirection
  /** 同步状态 */
  status: SyncStatus
  /** 导出条目数 */
  exportedCount: number
  /** 导入条目数 */
  importedCount: number
  /** 冲突条目数 */
  conflictCount: number
  /** 错误信息 */
  error?: string
  /** 持续时间（毫秒） */
  durationMs: number
}

/** 同步配置 */
export interface SyncConfig {
  /** 本设备标识 */
  deviceId: string
  /** 本设备名称 */
  deviceName: string
  /** 同步数据域白名单 */
  enabledDomains: SyncDomain[]
  /** 冲突解决策略 */
  conflictStrategy: 'local-wins' | 'remote-wins' | 'last-write-wins'
  /** 保留同步日志条数上限 */
  logRetentionLimit: number
  /** 保留快照条数上限 */
  snapshotRetentionLimit: number
}

/** 默认同步配置 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  deviceId: `device_${Date.now().toString(36)}`,
  deviceName: '本地设备',
  enabledDomains: ['sessions', 'crystals', 'carriers', 'notes', 'emotions', 'anchors', 'goals'],
  conflictStrategy: 'last-write-wins',
  logRetentionLimit: 50,
  snapshotRetentionLimit: 10,
}

/** 存储键 */
export const SYNC_KV_PREFIX = 'hf:sync:'
export const SYNC_CONFIG_KEY = `${SYNC_KV_PREFIX}config`
export const SYNC_LOGS_KEY = `${SYNC_KV_PREFIX}logs`
export const SYNC_CONFLICTS_KEY = `${SYNC_KV_PREFIX}conflicts`
export const SYNC_TARGETS_KEY = `${SYNC_KV_PREFIX}targets`
export const SYNC_SNAPSHOTS_KEY = `${SYNC_KV_PREFIX}snapshots`
export const SYNC_CURSOR_KEY = `${SYNC_KV_PREFIX}cursor`