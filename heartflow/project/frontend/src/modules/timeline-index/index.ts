// ============================================================
// 时间线索引 · 核心模块
// 模块二：时间长廊的专用数据视图
// 按天分片存储 + 二级索引 + 权重计算
// ============================================================

import { storage } from '../../engine/storage'
import type {
  IndexEntry, IndexSummary, SecondaryIndex, WeightParams,
  IndexQueryOptions, IndexQueryResult, IndexStats, CacheStats,
  GovernanceInfo, AgeLevel, TimelineIndexConfig, WeightDecayConfig,
} from './types'
import {
  DEFAULT_GOVERNANCE, EMPTY_SECONDARY_INDEX, AGE_MULTIPLIERS,
  BASE_WEIGHTS, DEFAULT_DECAY_CONFIG, DEFAULT_TIMELINE_INDEX_CONFIG,
} from './types'

export type {
  IndexEntry, IndexSummary, SecondaryIndex, WeightParams,
  IndexQueryOptions, IndexQueryResult, IndexStats, CacheStats,
  GovernanceInfo, AgeLevel, TimelineIndexConfig, WeightDecayConfig,
}

// ---- 工具函数 ----

function genId(): string {
  return `idx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function now(): string {
  return new Date().toISOString()
}

/** 从 ISO 时间戳提取日期字符串（YYYY-MM-DD） */
function extractDate(iso: string): string {
  return iso.slice(0, 10)
}

/** 获取分片 KV key */
function shardKey(date: string, prefix: string): string {
  return `${prefix}${date}`
}

/** 计算天数差 */
function daysBetween(from: string, to: string): number {
  const d1 = new Date(from).getTime()
  const d2 = new Date(to).getTime()
  return Math.max(0, Math.floor((d2 - d1) / (86400000)))
}

/** 生成日期范围列表 */
function generateDateRange(start: string, end: string): string[] {
  const dates: string[] = []
  const current = new Date(start)
  const endDate = new Date(end)
  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10))
    current.setDate(current.getDate() + 1)
  }
  return dates
}

// ============================================================
// 权重计算
// ============================================================

/**
 * 计算基准权重
 * 蓝图规则：
 * - 锚点 must=1.0 / optional=0.7 / floating=0.4
 * - 情绪 = intensity
 * - 结晶 = min(1.0, duration/120)
 * - 笔记默认 0.7
 */
function calcBaseWeight(params: WeightParams): number {
  const { entryType, anchorType, intensity, durationMinutes } = params

  if (entryType === 'anchor' && anchorType) {
    return BASE_WEIGHTS[`anchor_${anchorType}`] ?? BASE_WEIGHTS.note
  }
  if (entryType === 'emotion' && intensity !== undefined) {
    return Math.max(0, Math.min(1, intensity))
  }
  if (entryType === 'crystal' && durationMinutes !== undefined) {
    return Math.min(1.0, durationMinutes / 120)
  }
  return BASE_WEIGHTS[entryType] ?? 0.5
}

/**
 * 计算时间衰减系数
 * 蓝图规则：30天×0.95、90天×0.85、365天×0.7、3年×0.5
 * 线性插值在两个边界之间
 */
function calcTimeDecay(createdAt: string, decayConfig: WeightDecayConfig): number {
  const days = daysBetween(createdAt, now())

  if (days <= 30) return 1.0
  if (days <= 90) {
    // 30~90天：从 0.95 线性下降到 0.85
    const t = (days - 30) / 60
    return decayConfig.days30 - t * (decayConfig.days30 - decayConfig.days90)
  }
  if (days <= 365) {
    // 90~365天：从 0.85 线性下降到 0.7
    const t = (days - 90) / 275
    return decayConfig.days90 - t * (decayConfig.days90 - decayConfig.days365)
  }
  if (days <= 365 * 3) {
    // 365天~3年：从 0.7 线性下降到 0.5
    const t = (days - 365) / (365 * 2)
    return decayConfig.days365 - t * (decayConfig.days365 - decayConfig.years3)
  }
  return decayConfig.years3
}

/**
 * 计算最终权重
 * 权重 = 基准权重 × 时间衰减 × 老化乘数
 */
export function calcWeight(params: WeightParams, decayConfig: WeightDecayConfig = DEFAULT_DECAY_CONFIG): number {
  const base = calcBaseWeight(params)
  const decay = calcTimeDecay(params.createdAt, decayConfig)
  const ageMultiplier = params.ageLevel
    ? AGE_MULTIPLIERS[params.ageLevel]
    : 1.0

  const weight = base * decay * ageMultiplier
  return Math.round(weight * 1000) / 1000 // 保留3位小数
}

// ============================================================
// 时间线索引管理器
// ============================================================

export function useTimelineIndex(config: Partial<TimelineIndexConfig> = {}) {
  const cfg = { ...DEFAULT_TIMELINE_INDEX_CONFIG, ...config }

  // ---- 缓存 ----
  const shardCache = new Map<string, { data: IndexEntry[]; loadedAt: number }>()

  // ---- 存储层 ----

  /** 加载指定日期的分片数据 */
  function loadShard(date: string): IndexEntry[] {
    // 检查缓存
    const cached = shardCache.get(date)
    if (cached) {
      // 缓存只在当天有效
      const daysSinceLoad = daysBetween(new Date(cached.loadedAt).toISOString(), now())
      if (daysSinceLoad < 1) return cached.data
    }

    const key = shardKey(date, cfg.shardPrefix)
    const entries = storage.getKV<IndexEntry[]>(key, [])

    // 更新缓存（最近 N 天的分片才缓存）
    const daysSince = daysBetween(date, now())
    if (daysSince <= cfg.cacheDays) {
      shardCache.set(date, { data: entries, loadedAt: Date.now() })
      // 缓存大小控制（LRU 简单裁剪）
      if (shardCache.size > cfg.cacheDays * 2) {
        const firstKey = shardCache.keys().next().value
        if (firstKey) shardCache.delete(firstKey)
      }
    }

    return entries
  }

  /** 保存分片数据 */
  function saveShard(date: string, entries: IndexEntry[]): boolean {
    const key = shardKey(date, cfg.shardPrefix)
    let attempts = 0
    while (attempts < cfg.maxWriteRetries) {
      try {
        storage.setKV(key, entries)
        // 更新缓存
        shardCache.set(date, { data: entries, loadedAt: Date.now() })
        return true
      } catch (err) {
        attempts++
        if (attempts >= cfg.maxWriteRetries) {
          console.error(`[TimelineIndex] 分片 ${date} 写入失败，已重试 ${attempts} 次:`, err)
          return false
        }
      }
    }
    return false
  }

  /** 加载二级索引 */
  function loadSecondaryIndex(): SecondaryIndex {
    return storage.getKV<SecondaryIndex>(cfg.secondaryIndexKey, { ...EMPTY_SECONDARY_INDEX })
  }

  /** 保存二级索引 */
  function saveSecondaryIndex(idx: SecondaryIndex): boolean {
    try {
      storage.setKV(cfg.secondaryIndexKey, idx)
      return true
    } catch {
      return false
    }
  }

  // ============================================================
  // 写操作
  // ============================================================

  /**
   * 新增索引条目
   * 流程：确定分片 → 按时间戳插入 → 更新二级索引
   * 蓝图：新增<50ms
   */
  function add(params: {
    type: string
    roomSource: string
    payloadRef: string
    summary: IndexSummary
    timestamp?: string
    weightParams?: Partial<WeightParams>
    governance?: GovernanceInfo
  }): IndexEntry | null {
    const ts = params.timestamp ?? now()
    const date = extractDate(ts)

    const entry: IndexEntry = {
      indexId: genId(),
      timestamp: ts,
      type: params.type,
      roomSource: params.roomSource,
      payloadRef: params.payloadRef,
      summary: params.summary,
      weight: calcWeight({
        entryType: params.type,
        anchorType: params.weightParams?.anchorType,
        intensity: params.weightParams?.intensity,
        durationMinutes: params.weightParams?.durationMinutes,
        createdAt: ts,
        ageLevel: params.governance?.ageLevel,
      }),
      governance: params.governance ?? { ...DEFAULT_GOVERNANCE },
      createdAt: ts,
      updatedAt: ts,
    }

    // 1. 加载分片
    const shardEntries = loadShard(date)

    // 2. 按时间戳插入（保持有序）
    const insertIndex = shardEntries.findIndex(e => e.timestamp > ts)
    if (insertIndex === -1) {
      shardEntries.push(entry)
    } else {
      shardEntries.splice(insertIndex, 0, entry)
    }

    // 3. 保存分片
    if (!saveShard(date, shardEntries)) return null

    // 4. 更新二级索引
    const secIdx = loadSecondaryIndex()
    secIdx.byId[entry.indexId] = date
    if (!secIdx.byType[entry.type]) secIdx.byType[entry.type] = []
    secIdx.byType[entry.type]!.push(entry.indexId)
    saveSecondaryIndex(secIdx)

    return entry
  }

  /**
   * 更新条目
   * 流程：定位条目 → 更新字段 → 重写分片
   */
  function update(indexId: string, updates: Partial<IndexEntry>): boolean {
    const secIdx = loadSecondaryIndex()
    const date = secIdx.byId[indexId]
    if (!date) return false

    const shardEntries = loadShard(date)
    const index = shardEntries.findIndex(e => e.indexId === indexId)
    if (index === -1) return false

    shardEntries[index] = {
      ...shardEntries[index],
      ...updates,
      indexId, // 确保 ID 不变
      updatedAt: now(),
    }

    return saveShard(date, shardEntries)
  }

  /**
   * 删除条目
   * 流程：从分片移除 → 从二级索引移除
   */
  function remove(indexId: string): boolean {
    const secIdx = loadSecondaryIndex()
    const date = secIdx.byId[indexId]
    if (!date) return false

    const shardEntries = loadShard(date)
    const newEntries = shardEntries.filter(e => e.indexId !== indexId)
    if (newEntries.length === shardEntries.length) return false

    if (!saveShard(date, newEntries)) return false

    // 从二级索引移除
    delete secIdx.byId[indexId]
    for (const type of Object.keys(secIdx.byType)) {
      secIdx.byType[type] = secIdx.byType[type].filter(id => id !== indexId)
      if (secIdx.byType[type].length === 0) delete secIdx.byType[type]
    }
    secIdx.byGovernance.archived = secIdx.byGovernance.archived.filter(id => id !== indexId)
    secIdx.byGovernance.released = secIdx.byGovernance.released.filter(id => id !== indexId)
    secIdx.byGovernance.deleted = secIdx.byGovernance.deleted.filter(id => id !== indexId)
    saveSecondaryIndex(secIdx)

    return true
  }

  /**
   * 治理变更
   * 流程：更新 governance 字段 → 更新 by_governance 索引
   */
  function updateGovernance(indexId: string, governance: Partial<GovernanceInfo>): boolean {
    const secIdx = loadSecondaryIndex()
    const date = secIdx.byId[indexId]
    if (!date) return false

    const shardEntries = loadShard(date)
    const entry = shardEntries.find(e => e.indexId === indexId)
    if (!entry) return false

    // 更新治理字段
    entry.governance = { ...entry.governance, ...governance, updatedAt: now() }
    entry.updatedAt = now()

    // 重新计算权重（老化影响）
    if (governance.ageLevel) {
      entry.weight = calcWeight({
        entryType: entry.type,
        createdAt: entry.createdAt,
        ageLevel: governance.ageLevel,
      })
    }

    saveShard(date, shardEntries)

    // 更新 by_governance 索引
    const listName = governance.archived ? 'archived'
      : governance.released ? 'released'
      : governance.deleted ? 'deleted'
      : null

    if (listName) {
      if (!secIdx.byGovernance[listName].includes(indexId)) {
        secIdx.byGovernance[listName].push(indexId)
      }
      // 从其他治理列表移除
      for (const key of ['archived', 'released', 'deleted'] as const) {
        if (key !== listName) {
          secIdx.byGovernance[key] = secIdx.byGovernance[key].filter(id => id !== indexId)
        }
      }
    } else {
      // 恢复到 active：从所有治理列表移除
      for (const key of ['archived', 'released', 'deleted'] as const) {
        secIdx.byGovernance[key] = secIdx.byGovernance[key].filter(id => id !== indexId)
      }
    }

    saveSecondaryIndex(secIdx)
    return true
  }

  // ============================================================
  // 查询操作
  // ============================================================

  /**
   * 按时间范围查询
   * 蓝图：计算涉及日期分片 → 并行读取 → 合并排序 → 应用过滤器 → 应用分页
   */
  function queryByTime(options: IndexQueryOptions = {}): IndexQueryResult {
    const nowStr = now()
    const start = options.startDate ?? extractDate(new Date(Date.now() - 30 * 86400000).toISOString())
    const end = options.endDate ?? extractDate(nowStr)

    // 超过30天范围，先按月份预过滤
    const daysRange = daysBetween(start, end)
    let shardDates: string[]
    if (daysRange > 30) {
      // 只查询有数据的分片（通过二级索引的 byId 推断）
      const secIdx = loadSecondaryIndex()
      const allDates = new Set(Object.values(secIdx.byId))
      shardDates = generateDateRange(start, end).filter(d => allDates.has(d))
    } else {
      shardDates = generateDateRange(start, end)
    }

    // 读取所有涉及的分片
    let allEntries: IndexEntry[] = []
    const shardsScanned = shardDates.length

    for (const date of shardDates) {
      try {
        const entries = loadShard(date)
        allEntries = allEntries.concat(entries)
      } catch (err) {
        console.error(`[TimelineIndex] 分片 ${date} 读取失败:`, err)
        // 尝试从备份恢复（当前实现：跳过该分片）
      }
    }

    // 合并排序
    allEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))

    // 应用过滤器
    let filtered = allEntries

    if (options.types && options.types.length > 0) {
      const typeSet = new Set(options.types)
      filtered = filtered.filter(e => typeSet.has(e.type))
    }

    if (options.governanceStatus) {
      if (options.governanceStatus === 'active') {
        filtered = filtered.filter(e =>
          !e.governance.archived && !e.governance.released && !e.governance.deleted
        )
      } else {
        filtered = filtered.filter(e =>
          (e.governance as any)[options.governanceStatus!] === true
        )
      }
    }

    if (options.minWeight !== undefined) {
      filtered = filtered.filter(e => e.weight >= options.minWeight!)
    }
    if (options.maxWeight !== undefined) {
      filtered = filtered.filter(e => e.weight <= options.maxWeight!)
    }

    const total = filtered.length
    const offset = options.offset ?? 0
    const limit = options.limit ?? 50
    const hasMore = offset + limit < total
    const entries = filtered.slice(offset, offset + limit)

    return { entries, total, hasMore, shardsScanned }
  }

  /** 按 ID 查询 */
  function queryById(indexId: string): IndexEntry | undefined {
    const secIdx = loadSecondaryIndex()
    const date = secIdx.byId[indexId]
    if (!date) return undefined

    const shardEntries = loadShard(date)
    return shardEntries.find(e => e.indexId === indexId)
  }

  /** 按治理状态查询 */
  function queryByGovernance(status: 'archived' | 'released' | 'deleted'): IndexEntry[] {
    const secIdx = loadSecondaryIndex()
    const ids = secIdx.byGovernance[status]
    if (ids.length === 0) return []

    // 按分片批量读取
    const dateToIds = new Map<string, string[]>()
    for (const id of ids) {
      const date = secIdx.byId[id]
      if (date) {
        if (!dateToIds.has(date)) dateToIds.set(date, [])
        dateToIds.get(date)!.push(id)
      }
    }

    const entries: IndexEntry[] = []
    for (const [date, idList] of dateToIds) {
      const shardEntries = loadShard(date)
      const idSet = new Set(idList)
      for (const entry of shardEntries) {
        if (idSet.has(entry.indexId)) {
          entries.push(entry)
        }
      }
    }

    return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }

  // ============================================================
  // 统计信息
  // ============================================================

  /** 获取索引统计 */
  function getStats(): IndexStats {
    const secIdx = loadSecondaryIndex()
    const allDates = [...new Set(Object.values(secIdx.byId))]

    let totalEntries = 0
    let totalWeight = 0
    const typeDist: Record<string, number> = {}
    const govDist = { archived: 0, released: 0, deleted: 0, active: 0 }

    for (const date of allDates) {
      const entries = loadShard(date)
      totalEntries += entries.length
      for (const e of entries) {
        totalWeight += e.weight
        typeDist[e.type] = (typeDist[e.type] ?? 0) + 1
        if (e.governance.deleted) govDist.deleted++
        else if (e.governance.archived) govDist.archived++
        else if (e.governance.released) govDist.released++
        else govDist.active++
      }
    }

    return {
      totalEntries,
      shardCount: allDates.length,
      typeDistribution: typeDist,
      governanceDistribution: govDist,
      totalWeight: Math.round(totalWeight * 1000) / 1000,
      averageWeight: totalEntries > 0 ? Math.round((totalWeight / totalEntries) * 1000) / 1000 : 0,
      lastUpdated: now(),
    }
  }

  /** 获取缓存统计 */
  function getCacheStats(): CacheStats {
    let totalBytes = 0
    const dates: string[] = []
    for (const [date, cached] of shardCache) {
      dates.push(date)
      totalBytes += JSON.stringify(cached.data).length * 2
    }
    return {
      cachedShards: shardCache.size,
      cachedShardDates: dates.sort(),
      cacheSizeBytes: totalBytes,
      maxCacheSize: cfg.maxCacheSizeBytes,
    }
  }

  /**
   * 从分片全量重建二级索引
   * 蓝图：二级索引损坏时调用
   */
  function rebuildSecondaryIndex(): boolean {
    try {
      const newIdx: SecondaryIndex = {
        byId: { ...EMPTY_SECONDARY_INDEX.byId },
        byType: { ...EMPTY_SECONDARY_INDEX.byType },
        byGovernance: { ...EMPTY_SECONDARY_INDEX.byGovernance },
      }

      const allDates = new Set<string>()
      // 扫描所有可能的分片 key
      const keyPrefix = cfg.shardPrefix
      // 从 localStorage 中查找所有匹配的 key（通过遍历）
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(keyPrefix)) {
          const date = key.slice(keyPrefix.length)
          allDates.add(date)
        }
      }

      for (const date of allDates) {
        const entries = loadShard(date)
        for (const entry of entries) {
          newIdx.byId[entry.indexId] = date
          if (!newIdx.byType[entry.type]) newIdx.byType[entry.type] = []
          newIdx.byType[entry.type]!.push(entry.indexId)
          if (entry.governance.archived) newIdx.byGovernance.archived.push(entry.indexId)
          if (entry.governance.released) newIdx.byGovernance.released.push(entry.indexId)
          if (entry.governance.deleted) newIdx.byGovernance.deleted.push(entry.indexId)
        }
      }

      saveSecondaryIndex(newIdx)
      return true
    } catch (err) {
      console.error('[TimelineIndex] 二级索引重建失败:', err)
      return false
    }
  }

  /** 清空缓存 */
  function clearCache(): void {
    shardCache.clear()
  }

  return {
    // 写操作
    add,
    update,
    remove,
    updateGovernance,
    // 查询操作
    queryByTime,
    queryById,
    queryByGovernance,
    // 统计与维护
    getStats,
    getCacheStats,
    rebuildSecondaryIndex,
    clearCache,
    // 权重计算（导出供外部使用）
    calcWeight,
  }
}