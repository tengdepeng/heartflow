// ============================================================
// 共鸣协议层 · 知识接引接口 (IKnowledgeGuidance)
// 定义知识获取、索引、检索的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult } from './types'

/** 知识条目类型 */
export type KnowledgeEntryType = 'note' | 'book' | 'excerpt' | 'concept' | 'reflection' | 'external'

/** 知识条目元数据 */
export interface KnowledgeEntry {
  /** 条目唯一 ID */
  id: string
  /** 条目类型 */
  type: KnowledgeEntryType
  /** 标题 */
  title: string
  /** 内容摘要 */
  snippet: string
  /** 全文内容 */
  content: string
  /** 标签列表 */
  tags: string[]
  /** 来源 */
  source: string
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 关联条目 ID 列表 */
  relatedIds: string[]
  /** 权重/重要性 (0-1) */
  weight: number
}

/** 知识检索查询 */
export interface KnowledgeQuery {
  /** 搜索关键词 */
  keywords: string[]
  /** 按类型筛选 */
  typeFilter?: KnowledgeEntryType[]
  /** 按标签筛选 */
  tagFilter?: string[]
  /** 按时间范围筛选 */
  timeRange?: { from?: string; to?: string }
  /** 返回结果数量上限 */
  limit: number
  /** 偏移量 */
  offset: number
  /** 排序方式 */
  sortBy?: 'relevance' | 'date' | 'weight'
}

/** 知识检索结果 */
export interface KnowledgeSearchResult {
  /** 匹配的条目列表 */
  entries: KnowledgeEntry[]
  /** 总匹配数 */
  total: number
  /** 搜索耗时（毫秒） */
  latency: number
  /** 是否命中缓存 */
  cached: boolean
}

/** 知识图谱节点 */
export interface KnowledgeNode {
  /** 节点 ID */
  id: string
  /** 节点标签 */
  label: string
  /** 节点类型 */
  type: KnowledgeEntryType
  /** 关联强度 (0-1) */
  strength: number
  /** 子节点 */
  children?: KnowledgeNode[]
}

/**
 * 知识接引接口
 * 所有知识管理模块必须遵守此契约
 */
export interface IKnowledgeGuidance {
  /** 接引源标识 */
  readonly sourceId: string
  /** 接引源名称 */
  readonly sourceName: string

  // ---- 索引 ----
  /** 索引一条知识条目 */
  index(entry: KnowledgeEntry): Promise<ResonanceResult<void>>
  /** 批量索引 */
  indexBatch(entries: KnowledgeEntry[]): Promise<ResonanceResult<{ indexed: number }>>
  /** 移除索引 */
  removeIndex(entryId: string): Promise<ResonanceResult<void>>
  /** 清空索引 */
  clearIndex(): Promise<ResonanceResult<void>>

  // ---- 检索 ----
  /** 搜索知识 */
  search(query: KnowledgeQuery): Promise<ResonanceResult<KnowledgeSearchResult>>
  /** 按 ID 获取单条知识 */
  getById(entryId: string): Promise<ResonanceResult<KnowledgeEntry | undefined>>
  /** 获取关联知识 */
  getRelated(entryId: string, limit: number): Promise<ResonanceResult<KnowledgeEntry[]>>

  // ---- 图谱 ----
  /** 获取知识图谱（关联网络） */
  getGraph(rootId?: string, depth?: number): Promise<ResonanceResult<KnowledgeNode>>
  /** 获取标签云 */
  getTagCloud(): Promise<ResonanceResult<Array<{ tag: string; count: number }>>>

  // ---- 统计 ----
  /** 获取知识统计 */
  getStats(): Promise<ResonanceResult<{
    totalEntries: number
    byType: Record<KnowledgeEntryType, number>
    totalTags: number
    lastIndexedAt: string | null
  }>>
}

/**
 * 知识接引聚合接口
 * 聚合多个知识源，提供统一的检索入口
 */
export interface IKnowledgeAggregator {
  /** 注册一个知识源 */
  registerSource(source: IKnowledgeGuidance): ResonanceResult<void>
  /** 跨源搜索 */
  searchAll(query: KnowledgeQuery): Promise<ResonanceResult<KnowledgeSearchResult>>
  /** 获取所有已注册知识源 */
  getSources(): IKnowledgeGuidance[]
}