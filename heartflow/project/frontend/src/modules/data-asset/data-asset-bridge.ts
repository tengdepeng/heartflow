// ============================================================
// 数据资产层 · 视图桥接层 (P22)
//
// 蓝图定义：
//   作为用户数据资产层的视图桥接层，聚合所有数据域的统计信息，
//   提供数据概览、健康度、存储使用、完整性检查、导出就绪、
//   增长趋势、操作建议等统一的 computed 属性与方法。
//
//   所有数据通过 storage 统一存储对象获取。
// ============================================================

import { computed, ref } from 'vue'
import { storage } from '../../engine/storage'
import { loadSchema, SCHEMA_VERSION, invalidateCache } from '../../engine/storage/core'
import { getKV, setKV } from '../../engine/storage/kv'

// ============================================================
// 导出类型
// ============================================================

/** 数据资产总览 */
export interface DataAssetOverview {
  /** 总条目数 */
  totalItems: number
  /** 结晶数量 */
  crystalCount: number
  /** 专注会话数量 */
  sessionCount: number
  /** 笔记数量 */
  noteCount: number
  /** 情绪记录数量 */
  emotionCount: number
  /** 锚点数量 */
  anchorCount: number
  /** 目标数量 */
  goalCount: number
  /** 载体数量 */
  carrierCount: number
  /** 幕僚数量 */
  advisorCount: number
  /** 关系数量 */
  relationCount: number
  /** KV 存储条目数 */
  totalKVEntries: number
  /** Schema 版本号 */
  schemaVersion: number
  /** 估算数据大小（字节） */
  dataSize: number
}

/** 数据域健康度 */
export interface DataDomainHealth {
  /** 域名 */
  name: string
  /** 域标识 key */
  key: string
  /** 条目数 */
  count: number
  /** 是否为空 */
  isEmpty: boolean
  /** 数据完整性标记 */
  integrity: 'healthy' | 'warning' | 'empty'
}

/** 存储使用情况 */
export interface StorageUsageInfo {
  /** 估算大小（字节） */
  estimatedSize: number
  /** KV 条目数 */
  kvEntries: number
  /** 格式化后的大小字符串 */
  formatSize: string
}

/** 数据资产建议 */
export interface DataAssetRecommendation {
  id: string
  /** 建议类型 */
  type: 'backup' | 'export' | 'cleanup' | 'enrich' | 'review' | 'maintenance'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 关联操作 */
  action?: string
}

// ============================================================
// 域定义
// ============================================================

/** 所有数据域元信息 */
const DOMAIN_META = [
  { key: 'crystals',  name: '结晶',    getter: () => storage.getCrystals() },
  { key: 'sessions',  name: '专注会话', getter: () => storage.getSessions() },
  { key: 'notes',     name: '笔记',    getter: () => storage.getNotes() },
  { key: 'emotions',  name: '情绪记录', getter: () => storage.getEmotions() },
  { key: 'anchors',   name: '锚点',    getter: () => storage.getAnchors() },
  { key: 'goals',     name: '目标',    getter: () => storage.getGoals() },
  { key: 'carriers',  name: '载体',    getter: () => storage.getCarriers() },
  { key: 'advisors',  name: '幕僚',    getter: () => storage.getAdvisors() },
  { key: 'relations', name: '关系',    getter: () => storage.getRelations() },
] as const

// ============================================================
// useDataAssetBridge
// ============================================================

export function useDataAssetBridge() {
  // ---- 内部状态 ----

  /** 数据是否正在刷新 */
  const isRefreshing = ref(false)

  /** 上次刷新时间戳 */
  const lastRefreshedAt = ref<string | null>(null)

  // ============================================================
  // 1. dataOverview — 数据资产总览
  // ============================================================

  const dataOverview = computed<DataAssetOverview>(() => {
    const crystals  = storage.getCrystals()
    const sessions  = storage.getSessions()
    const notes     = storage.getNotes()
    const emotions  = storage.getEmotions()
    const anchors   = storage.getAnchors()
    const goals     = storage.getGoals()
    const carriers  = storage.getCarriers()
    const advisors  = storage.getAdvisors()
    const relations = storage.getRelations()
    const schema    = loadSchema()
    const kvEntries = schema.kvStore ? Object.keys(schema.kvStore).length : 0

    const totalItems =
      crystals.length +
      sessions.length +
      notes.length +
      emotions.length +
      anchors.length +
      goals.length +
      carriers.length +
      advisors.length +
      relations.length

    const dataSize = estimateDataSize(schema)

    return {
      totalItems,
      crystalCount:  crystals.length,
      sessionCount:  sessions.length,
      noteCount:     notes.length,
      emotionCount:  emotions.length,
      anchorCount:   anchors.length,
      goalCount:     goals.length,
      carrierCount:  carriers.length,
      advisorCount:  advisors.length,
      relationCount: relations.length,
      totalKVEntries: kvEntries,
      schemaVersion: SCHEMA_VERSION,
      dataSize,
    }
  })

  // ============================================================
  // 2. dataDomainHealth — 各数据域健康度
  // ============================================================

  const dataDomainHealth = computed<DataDomainHealth[]>(() => {
    return DOMAIN_META.map(domain => {
      let data: any[] = []
      try {
        data = domain.getter() ?? []
      } catch {
        data = []
      }

      const count = data.length
      let integrity: DataDomainHealth['integrity'] = 'empty'

      if (count === 0) {
        integrity = 'empty'
      } else {
        // 检查是否有空记录（缺少关键字段）
        const hasEmptyRecords = data.some(item => {
          if (!item) return true
          // 检查 id 字段是否存在（作为基本完整性判断）
          return !item.id
        })
        integrity = hasEmptyRecords ? 'warning' : 'healthy'
      }

      return {
        name: domain.name,
        key: domain.key,
        count,
        isEmpty: count === 0,
        integrity,
      }
    })
  })

  // ============================================================
  // 3. storageUsage — 存储使用情况
  // ============================================================

  const storageUsage = computed<StorageUsageInfo>(() => {
    const schema = loadSchema()
    const kvEntries = schema.kvStore ? Object.keys(schema.kvStore).length : 0
    const estimatedSize = estimateDataSize(schema)

    return {
      estimatedSize,
      kvEntries,
      formatSize: formatBytes(estimatedSize),
    }
  })

  // ============================================================
  // 4. dataIntegrity — 数据完整性检查
  // ============================================================

  const dataIntegrity = computed(() => {
    const results: {
      domain: string
      name: string
      count: number
      hasEmptyRecords: boolean
      emptyRecordCount: number
      isHealthy: boolean
      issues: string[]
    }[] = []

    for (const domain of DOMAIN_META) {
      let data: any[] = []
      try {
        data = domain.getter() ?? []
      } catch {
        data = []
      }

      const issues: string[] = []
      let emptyRecordCount = 0

      for (const item of data) {
        if (!item) {
          emptyRecordCount++
          continue
        }
        if (!item.id) {
          emptyRecordCount++
          issues.push('存在缺少 id 的记录')
        }
      }

      if (data.length === 0) {
        issues.push('该域无数据')
      }

      results.push({
        domain: domain.key,
        name: domain.name,
        count: data.length,
        hasEmptyRecords: emptyRecordCount > 0,
        emptyRecordCount,
        isHealthy: emptyRecordCount === 0,
        issues,
      })
    }

    const overallHealthy = results.every(r => r.isHealthy)

    return {
      domains: results,
      overallHealthy,
      totalIssues: results.reduce((sum, r) => sum + r.issues.length, 0),
    }
  })

  // ============================================================
  // 5. exportReadiness — 导出就绪状态
  // ============================================================

  const exportReadiness = computed(() => {
    const overview = dataOverview.value
    const hasData = overview.totalItems > 0

    const domainsWithData = DOMAIN_META
      .map(d => {
        let data: any[] = []
        try {
          data = d.getter() ?? []
        } catch {
          data = []
        }
        return { key: d.key, name: d.name, count: data.length }
      })
      .filter(d => d.count > 0)

    return {
      hasData,
      domainsWithData,
      domainCount: domainsWithData.length,
      totalDomainCount: DOMAIN_META.length,
      schemaVersion: SCHEMA_VERSION,
      estimatedExportSize: formatBytes(overview.dataSize),
      estimatedExportSizeBytes: overview.dataSize,
    }
  })

  // ============================================================
  // 6. dataGrowth — 数据增长趋势
  // ============================================================

  const dataGrowth = computed(() => {
    const now = Date.now()
    const DAY = 86_400_000

    // 收集所有带时间戳的记录
    const allTimestamps: { domain: string; ts: number }[] = []

    const timeFields: Record<string, string[]> = {
      sessions:  ['startedAt'],
      crystals:  ['createdAt'],
      notes:     ['createdAt'],
      emotions:  ['timestamp', 'createdAt'],
      anchors:   ['createdAt'],
      goals:     ['createdAt'],
      carriers:  ['createdAt'],
      advisors:  ['createdAt'],
      relations: ['createdAt'],
    }

    for (const domain of DOMAIN_META) {
      let data: any[] = []
      try {
        data = domain.getter() ?? []
      } catch {
        data = []
      }
      const fields = timeFields[domain.key] || ['createdAt']
      for (const item of data) {
        for (const field of fields) {
          const raw = item?.[field]
          if (raw) {
            const ts = new Date(raw).getTime()
            if (!isNaN(ts)) {
              allTimestamps.push({ domain: domain.key, ts })
              break
            }
          }
        }
      }
    }

    // 按时间段统计
    const last7Days   = allTimestamps.filter(t => now - t.ts <= 7 * DAY).length
    const last30Days  = allTimestamps.filter(t => now - t.ts <= 30 * DAY).length
    const last90Days  = allTimestamps.filter(t => now - t.ts <= 90 * DAY).length
    const olderThan90 = allTimestamps.filter(t => now - t.ts > 90 * DAY).length

    // 按域统计最近增长
    const byDomain = DOMAIN_META.map(d => {
      const domainTimestamps = allTimestamps.filter(t => t.domain === d.key)
      const recent7  = domainTimestamps.filter(t => now - t.ts <= 7 * DAY).length
      const recent30 = domainTimestamps.filter(t => now - t.ts <= 30 * DAY).length
      return {
        key: d.key,
        name: d.name,
        recent7Days: recent7,
        recent30Days: recent30,
        total: domainTimestamps.length,
      }
    })

    // 趋势判断
    let trend: 'growing' | 'stable' | 'declining' | 'dormant' = 'dormant'
    if (last7Days > 0 && last30Days > 0) {
      const weeklyRate = last7Days / 7
      const monthlyRate = (last30Days - last7Days) / 23
      if (weeklyRate > monthlyRate * 1.2) {
        trend = 'growing'
      } else if (weeklyRate < monthlyRate * 0.5) {
        trend = 'declining'
      } else {
        trend = 'stable'
      }
    } else if (last30Days === 0) {
      trend = 'dormant'
    }

    return {
      totalTimestamps: allTimestamps.length,
      last7Days,
      last30Days,
      last90Days,
      olderThan90,
      byDomain,
      trend,
    }
  })

  // ============================================================
  // 7. recommendations — 数据资产建议
  // ============================================================

  const recommendations = computed<DataAssetRecommendation[]>(() => {
    const result: DataAssetRecommendation[] = []
    const overview = dataOverview.value
    const health = dataDomainHealth.value
    const growth = dataGrowth.value

    // 1. 备份建议 —— 数据量较大时建议备份
    if (overview.totalItems > 50) {
      const lastBackup = getKV<string>('data-asset:lastBackupDate', '')
      const daysSinceBackup = lastBackup
        ? Math.floor((Date.now() - new Date(lastBackup).getTime()) / 86_400_000)
        : Infinity

      if (daysSinceBackup > 30 || !lastBackup) {
        result.push({
          id: 'rec_backup',
          type: 'backup',
          priority: 'high',
          title: '建议进行数据备份',
          description: !lastBackup
            ? '你尚未创建过数据备份，建议立即备份以保护数据安全'
            : `距离上次备份已过 ${daysSinceBackup} 天，建议定期备份数据`,
          action: 'backup',
        })
      }
    }

    // 2. 导出建议
    if (overview.totalItems > 0) {
      result.push({
        id: 'rec_export',
        type: 'export',
        priority: overview.totalItems > 100 ? 'high' : 'medium',
        title: '导出数据资产',
        description: `共有 ${overview.totalItems} 条数据记录，导出为 JSON 便于存档或迁移`,
        action: 'export',
      })
    }

    // 3. 清理建议 —— 长期不活跃的域
    const dormantDomains = growth.byDomain.filter(d => d.total === 0)
    if (dormantDomains.length > 0) {
      result.push({
        id: 'rec_enrich',
        type: 'enrich',
        priority: 'medium',
        title: '丰富数据域',
        description: `以下 ${dormantDomains.length} 个数据域尚无数据：${dormantDomains.map(d => d.name).join('、')}`,
        action: 'enrich',
      })
    }

    // 4. 完整性警告
    const warningDomains = health.filter(d => d.integrity === 'warning')
    if (warningDomains.length > 0) {
      result.push({
        id: 'rec_integrity',
        type: 'maintenance',
        priority: 'medium',
        title: '数据完整性检查',
        description: `${warningDomains.length} 个域存在数据完整性问题，建议检查：${warningDomains.map(d => d.name).join('、')}`,
        action: 'checkIntegrity',
      })
    }

    // 5. 增长趋势建议
    if (growth.trend === 'dormant' && overview.totalItems === 0) {
      result.push({
        id: 'rec_getstarted',
        type: 'enrich',
        priority: 'high',
        title: '开始记录数据',
        description: '你的数据资产还是空的，开始记录专注、情绪、笔记等内容来构建你的数据资产',
        action: 'getStarted',
      })
    }

    if (growth.trend === 'declining') {
      result.push({
        id: 'rec_review',
        type: 'review',
        priority: 'low',
        title: '数据增长放缓',
        description: '最近数据增长速率有所下降，是否考虑回顾并调整使用习惯？',
        action: 'review',
      })
    }

    // 6. 数据量充足时的复盘建议
    if (overview.totalItems > 200) {
      result.push({
        id: 'rec_review_data',
        type: 'review',
        priority: 'low',
        title: '定期数据复盘',
        description: '你的数据资产已相当丰富，定期回顾可以发现成长规律和隐藏模式',
        action: 'reviewData',
      })
    }

    return result.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 }
      return order[a.priority] - order[b.priority]
    })
  })

  // ============================================================
  // 操作方法
  // ============================================================

  /**
   * 刷新所有数据（强制失效缓存并重新加载）
   */
  function refreshAll(): void {
    isRefreshing.value = true
    try {
      // 强制失效缓存，使下次读取 schema 时重新从后端加载
      invalidateCache()
      lastRefreshedAt.value = new Date().toISOString()
      setKV('data-asset:lastRefreshedAt', lastRefreshedAt.value)
    } finally {
      isRefreshing.value = false
    }
  }

  /**
   * 导出所有数据为 JSON 字符串
   */
  function exportAllData(): string {
    const schema = loadSchema()
    const exportData = {
      exportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
      summary: {
        crystalCount:  schema.crystals?.length ?? 0,
        sessionCount:  schema.sessions?.length ?? 0,
        noteCount:     schema.notes?.length ?? 0,
        emotionCount:  schema.emotions?.length ?? 0,
        anchorCount:   schema.anchors?.length ?? 0,
        goalCount:     schema.goals?.length ?? 0,
        carrierCount:  schema.carriers?.length ?? 0,
        advisorCount:  schema.advisors?.length ?? 0,
        relationCount: schema.relations?.length ?? 0,
        kvEntries:     schema.kvStore ? Object.keys(schema.kvStore).length : 0,
      },
      data: {
        crystals:  schema.crystals ?? [],
        sessions:  schema.sessions ?? [],
        notes:     schema.notes ?? [],
        emotions:  schema.emotions ?? [],
        anchors:   schema.anchors ?? [],
        goals:     schema.goals ?? [],
        carriers:  schema.carriers ?? [],
        advisors:  schema.advisors ?? [],
        relations: schema.relations ?? [],
        kvStore:   schema.kvStore ?? {},
        tagCategories: schema.tagCategories ?? [],
        scenePresets: schema.scenePresets ?? [],
        ledger: schema.ledger ?? [],
        advisorMessages: schema.advisorMessages ?? [],
      },
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 获取指定域的数据统计
   */
  function getDomainStats(domain: string): {
    name: string
    count: number
    isEmpty: boolean
    data: any[]
  } | null {
    const meta = DOMAIN_META.find(d => d.key === domain)
    if (!meta) return null

    let data: any[] = []
    try {
      data = meta.getter() ?? []
    } catch {
      data = []
    }

    return {
      name: meta.name,
      count: data.length,
      isEmpty: data.length === 0,
      data,
    }
  }

  /**
   * 获取数据大小估算（字节）
   */
  function getDataSize(): number {
    const schema = loadSchema()
    return estimateDataSize(schema)
  }

  /**
   * 获取所有数据域名称
   */
  function getAllDomains(): { key: string; name: string }[] {
    return DOMAIN_META.map(d => ({ key: d.key, name: d.name }))
  }

  /**
   * 数据完整性检查（返回详细结果）
   */
  function checkDataIntegrity() {
    return dataIntegrity.value
  }

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    isRefreshing,
    lastRefreshedAt,

    // 聚合计算属性
    dataOverview,
    dataDomainHealth,
    storageUsage,
    dataIntegrity,
    exportReadiness,
    dataGrowth,
    recommendations,

    // 操作方法
    refreshAll,
    exportAllData,
    getDomainStats,
    getDataSize,
    getAllDomains,
    checkDataIntegrity,
  }
}

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 估算 schema 数据大小（字节）
 * 通过 JSON.stringify 近似计算
 */
function estimateDataSize(schema: any): number {
  try {
    const size = new Blob([JSON.stringify(schema)]).size
    return size
  } catch {
    // 回退：粗略估算
    const json = JSON.stringify(schema)
    return json ? json.length * 2 : 0
  }
}

/**
 * 格式化字节数为可读字符串
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let unitIndex = 0
  let size = bytes
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}