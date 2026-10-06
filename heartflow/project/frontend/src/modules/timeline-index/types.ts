// ============================================================
// 时间线索引 · 类型定义
// 模块二：时间长廊的专用数据视图
// 不存储业务数据本身，只存储每条记录的索引条目
// ============================================================

/** 治理等级 */
export type AgeLevel = 1 | 2 | 3 | 4 | 5

/** 治理信息 */
export interface GovernanceInfo {
  ageLevel: AgeLevel
  agedAt: string | null
  archived: boolean
  archivedAt: string | null
  released: boolean
  releasedAt: string | null
  deleted: boolean
  updatedAt?: string
}

/** 默认治理信息 */
export const DEFAULT_GOVERNANCE: GovernanceInfo = {
  ageLevel: 1,
  agedAt: null,
  archived: false,
  archivedAt: null,
  released: false,
  releasedAt: null,
  deleted: false,
}

/** 索引摘要 */
export interface IndexSummary {
  snippet: string
  emotionCategory?: string
  anchorZone?: string
  scheduledTime?: string
  durationMinutes?: number
  personName?: string
}

/** 索引条目 */
export interface IndexEntry {
  indexId: string
  timestamp: string
  type: string
  roomSource: string
  payloadRef: string
  summary: IndexSummary
  weight: number
  governance: GovernanceInfo
  createdAt: string
  updatedAt: string
}

/** 二级索引结构 */
export interface SecondaryIndex {
  byId: Record<string, string>     // indexId → shardDate
  byType: Record<string, string[]> // type → indexId[]
  byGovernance: {
    archived: string[]
    released: string[]
    deleted: string[]
  }
}

/** 空二级索引 */
export const EMPTY_SECONDARY_INDEX: SecondaryIndex = {
  byId: {},
  byType: {},
  byGovernance: {
    archived: [],
    released: [],
    deleted: [],
  },
}

/** 权重计算参数 */
export interface WeightParams {
  entryType: string
  anchorType?: 'must' | 'optional' | 'floating'
  intensity?: number
  durationMinutes?: number
  createdAt: string
  ageLevel?: AgeLevel
}

/** 权重衰减配置 */
export interface WeightDecayConfig {
  days30: number
  days90: number
  days365: number
  years3: number
}

/** 老化乘数 */
export const AGE_MULTIPLIERS: Record<AgeLevel, number> = {
  1: 0.8,
  2: 0.6,
  3: 0.4,
  4: 0.2,
  5: 0.1,
}

/** 默认权重衰减配置 */
export const DEFAULT_DECAY_CONFIG: WeightDecayConfig = {
  days30: 0.95,
  days90: 0.85,
  days365: 0.7,
  years3: 0.5,
}

/** 基准权重 */
export const BASE_WEIGHTS: Record<string, number> = {
  note: 0.7,
  anchor_must: 1.0,
  anchor_optional: 0.7,
  anchor_floating: 0.4,
  session: 0.5,
  crystal: 0.6,
  emotion: 0.5,
}

/** 索引查询选项 */
export interface IndexQueryOptions {
  startDate?: string
  endDate?: string
  types?: string[]
  governanceStatus?: 'archived' | 'released' | 'deleted' | 'active'
  minWeight?: number
  maxWeight?: number
  limit?: number
  offset?: number
}

/** 索引查询结果 */
export interface IndexQueryResult {
  entries: IndexEntry[]
  total: number
  hasMore: boolean
  shardsScanned: number
}

/** 索引统计 */
export interface IndexStats {
  totalEntries: number
  shardCount: number
  typeDistribution: Record<string, number>
  governanceDistribution: {
    archived: number
    released: number
    deleted: number
    active: number
  }
  totalWeight: number
  averageWeight: number
  lastUpdated: string | null
}

/** 缓存统计 */
export interface CacheStats {
  cachedShards: number
  cachedShardDates: string[]
  cacheSizeBytes: number
  maxCacheSize: number
}

/** 分片键迁移报告（UTC 日 → 本地日历日 一次性重分片） */
export interface ShardMigrationReport {
  /** 迁移此前已执行过（标记键命中），本次未做任何改动 */
  alreadyDone: boolean
  /** 扫描到的旧分片数 */
  scannedShards: number
  /** 重新归片的条目总数 */
  movedEntries: number
  /** 迁移前的分片数 */
  shardsBefore: number
  /** 迁移后的分片数 */
  shardsAfter: number
}

/** 时间线索引配置 */
export interface TimelineIndexConfig {
  /** 缓存最近 N 天的分片数据 */
  cacheDays: number
  /** 最大缓存大小（字节） */
  maxCacheSizeBytes: number
  /** 写入重试次数 */
  maxWriteRetries: number
  /** 写入重试间隔（毫秒） */
  writeRetryDelay: number
  /** 分片前缀 */
  shardPrefix: string
  /** 二级索引 KV key */
  secondaryIndexKey: string
}

/** 默认时间线索引配置 */
export const DEFAULT_TIMELINE_INDEX_CONFIG: TimelineIndexConfig = {
  cacheDays: 7,
  maxCacheSizeBytes: 20 * 1024 * 1024, // 20MB
  maxWriteRetries: 3,
  writeRetryDelay: 100,
  shardPrefix: 'hf:timeline_index:',
  secondaryIndexKey: 'hf:timeline_index:meta',
}