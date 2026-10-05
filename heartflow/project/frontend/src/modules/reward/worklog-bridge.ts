// ============================================================
// 劳酬 · 工作日志联动桥接
// P16-9: 工作日志自动创建收入记录 + 生产力-收入映射
// ============================================================

import { ref, computed } from 'vue'
import type { LogEntry, LogEntryType, MoodTone } from '../worklog/types'
import type { RewardRecord, IncomeCategory } from './types'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/time'

// ---- 收入映射配置 ----

/** 日志类型 → 收入类别映射 */
export const LOG_TYPE_TO_INCOME: Record<LogEntryType, { category: IncomeCategory; baseRate: number; label: string }> = {
  milestone: { category: 'freelance', baseRate: 200, label: '里程碑奖励' },
  insight:    { category: 'freelance', baseRate: 100, label: '洞察奖励' },
  review:     { category: 'freelance', baseRate: 80,  label: '复盘奖励' },
  reflection: { category: 'freelance', baseRate: 60,  label: '反思奖励' },
  plan:       { category: 'freelance', baseRate: 50,  label: '计划奖励' },
  journal:    { category: 'freelance', baseRate: 30,  label: '日志奖励' },
}

/** 情绪加成倍率 */
export const MOOD_MULTIPLIER: Record<MoodTone, number> = {
  energetic:  1.5,
  excited:    1.3,
  calm:       1.1,
  neutral:    1.0,
  tired:      0.8,
  frustrated: 0.6,
}

/** 桥接配置 */
export interface WorklogRewardConfig {
  /** 是否启用自动收入记录 */
  enabled: boolean
  /** 最低内容长度（字符），低于此长度不生成收入 */
  minContentLength: number
  /** 每日收入上限 */
  dailyIncomeCap: number
  /** 内容长度加成（每 100 字符） */
  lengthBonusRate: number
  /** 标签加成（每个标签） */
  tagBonusRate: number
}

export const DEFAULT_BRIDGE_CONFIG: WorklogRewardConfig = {
  enabled: true,
  minContentLength: 20,
  dailyIncomeCap: 2000,
  lengthBonusRate: 5,
  tagBonusRate: 10,
}

// ---- 桥接记录 ----

/** 桥接映射记录 */
export interface BridgeMapping {
  /** 工作日志 ID */
  worklogId: string
  /** 收入记录 ID */
  rewardId: string
  /** 映射时间 */
  mappedAt: string
  /** 收入金额 */
  amount: number
  /** 收入类别 */
  category: IncomeCategory
  /** 日志标题 */
  worklogTitle: string
}

// ---- 桥接统计 ----

export interface BridgeStats {
  /** 总映射次数 */
  totalMappings: number
  /** 总收入金额 */
  totalIncome: number
  /** 本月映射次数 */
  monthlyMappings: number
  /** 本月收入金额 */
  monthlyIncome: number
  /** 今日映射次数 */
  todayMappings: number
  /** 今日收入金额 */
  todayIncome: number
  /** 按日志类型分布 */
  byLogType: Record<string, { count: number; total: number }>
  /** 按收入类别分布 */
  byIncomeCategory: Record<string, { count: number; total: number }>
}

// ---- 存储键 ----

const BRIDGE_STORAGE_KEY = 'hf:reward:worklog-bridge-mappings'

// ============================================================
// useWorklogRewardBridge — 工作日志-收入桥接
// ============================================================

/**
 * 工作日志联动桥接引擎
 *
 * 核心功能：
 *   1. 根据工作日志自动计算并创建收入记录
 *   2. 支持日志类型→收入类别映射
 *   3. 情绪加成、内容长度加成、标签加成
 *   4. 每日收入上限控制
 *   5. 桥接记录追踪与统计
 *   6. 批量同步（将已有日志批量转化为收入记录）
 */
export function useWorklogRewardBridge(
  /** 获取所有日志的回调 */
  getEntries: () => LogEntry[],
  /** 添加收入记录的回调 */
  addRewardRecord: (
    type: 'income',
    category: IncomeCategory,
    amount: number,
    description: string,
    projectId?: string,
    worklogId?: string
  ) => Promise<RewardRecord>,
  /** 获取已有收入记录的回调（预留，供未来去重扩展） */
  _getRewardRecords: () => RewardRecord[]
) {
  const config = ref<WorklogRewardConfig>({ ...DEFAULT_BRIDGE_CONFIG })
  const mappings = ref<BridgeMapping[]>(loadMappings())

  // ---- 持久化 ----

  function loadMappings(): BridgeMapping[] {
    try {
      const raw = localStorage.getItem(BRIDGE_STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function saveMappings(): void {
    localStorage.setItem(BRIDGE_STORAGE_KEY, JSON.stringify(mappings.value))
  }

  // ---- 收入计算 ----

  /**
   * 计算单个日志条目应产生的收入
   */
  function calculateEntryIncome(entry: LogEntry): number {
    const typeConfig = LOG_TYPE_TO_INCOME[entry.type]
    if (!typeConfig) return 0

    // 内容长度检查
    if (entry.content.length < config.value.minContentLength) return 0

    // 基础收入
    let amount = typeConfig.baseRate

    // 情绪加成
    if (entry.mood) {
      amount *= MOOD_MULTIPLIER[entry.mood]
    }

    // 内容长度加成
    const lengthBonus = Math.floor(entry.content.length / 100) * config.value.lengthBonusRate
    amount += lengthBonus

    // 标签加成
    const tagBonus = entry.tags.length * config.value.tagBonusRate
    amount += tagBonus

    return Math.round(amount)
  }

  /**
   * 获取今日已生成的总收入
   */
  function getTodayBridgeIncome(): number {
    const today = getLocalDateKey()
    return mappings.value
      .filter(m => m.mappedAt.startsWith(today))
      .reduce((sum, m) => sum + m.amount, 0)
  }

  // ---- 核心操作 ----

  /**
   * 为单个工作日志创建收入记录
   * 返回创建的映射记录，如果跳过则返回 null
   */
  async function bridgeEntry(entry: LogEntry): Promise<BridgeMapping | null> {
    if (!config.value.enabled) return null

    // 检查是否已映射
    const existing = mappings.value.find(m => m.worklogId === entry.id)
    if (existing) return existing

    // 计算收入
    const amount = calculateEntryIncome(entry)
    if (amount <= 0) return null

    // 每日上限检查
    const todayIncome = getTodayBridgeIncome()
    if (todayIncome + amount > config.value.dailyIncomeCap) {
      return null
    }

    const typeConfig = LOG_TYPE_TO_INCOME[entry.type]
    const description = `[${typeConfig.label}] ${entry.title}`

    // 创建收入记录
    const record = await addRewardRecord(
      'income',
      typeConfig.category,
      amount,
      description,
      undefined,
      entry.id
    )

    const mapping: BridgeMapping = {
      worklogId: entry.id,
      rewardId: record.id,
      mappedAt: new Date().toISOString(),
      amount,
      category: typeConfig.category,
      worklogTitle: entry.title,
    }

    mappings.value.push(mapping)
    saveMappings()
    return mapping
  }

  /**
   * 批量桥接：为所有未映射的日志创建收入记录
   */
  async function bridgeAllUnmapped(): Promise<{
    bridged: BridgeMapping[]
    skipped: number
    capped: number
  }> {
    const entries = getEntries()
    const existingIds = new Set(mappings.value.map(m => m.worklogId))
    const unmapped = entries.filter(e => !existingIds.has(e.id))

    const bridged: BridgeMapping[] = []
    let skipped = 0
    let capped = 0

    for (const entry of unmapped) {
      if (!config.value.enabled) break

      const amount = calculateEntryIncome(entry)
      if (amount <= 0) {
        skipped++
        continue
      }

      const todayIncome = getTodayBridgeIncome() +
        bridged.reduce((s, m) => s + m.amount, 0)
      if (todayIncome + amount > config.value.dailyIncomeCap) {
        capped++
        continue
      }

      const result = await bridgeEntry(entry)
      if (result) {
        bridged.push(result)
      } else {
        skipped++
      }
    }

    return { bridged, skipped, capped }
  }

  /**
   * 为指定日期范围内的日志创建收入记录
   */
  async function bridgeDateRange(start: Date, end: Date): Promise<{
    bridged: BridgeMapping[]
    totalIncome: number
  }> {
    const entries = getEntries()
    const startStr = start.toISOString()
    const endStr = end.toISOString()

    const rangeEntries = entries.filter(e =>
      e.createdAt >= startStr && e.createdAt <= endStr
    )

    const bridged: BridgeMapping[] = []
    for (const entry of rangeEntries) {
      const result = await bridgeEntry(entry)
      if (result) bridged.push(result)
    }

    return {
      bridged,
      totalIncome: bridged.reduce((s, m) => s + m.amount, 0),
    }
  }

  /**
   * 撤销桥接（删除对应的收入记录）
   */
  async function unbridgeEntry(worklogId: string): Promise<boolean> {
    const idx = mappings.value.findIndex(m => m.worklogId === worklogId)
    if (idx === -1) return false

    mappings.value.splice(idx, 1)
    saveMappings()
    return true
  }

  /**
   * 获取日志对应的映射记录
   */
  function getMapping(worklogId: string): BridgeMapping | undefined {
    return mappings.value.find(m => m.worklogId === worklogId)
  }

  /**
   * 检查日志是否已映射
   */
  function isMapped(worklogId: string): boolean {
    return mappings.value.some(m => m.worklogId === worklogId)
  }

  // ---- 统计 ----

  /**
   * 获取桥接统计
   */
  const bridgeStats = computed<BridgeStats>(() => {
    const now = new Date()
    const monthPrefix = getLocalMonthKey(now)
    const today = getLocalDateKey(now)

    const todayMappings = mappings.value.filter(m => getLocalDateKey(new Date(m.mappedAt)) === today)
    const monthMappings = mappings.value.filter(m => getLocalMonthKey(m.mappedAt) === monthPrefix)

    const byLogType: Record<string, { count: number; total: number }> = {}
    const byIncomeCategory: Record<string, { count: number; total: number }> = {}

    for (const m of mappings.value) {
      // 通过日志 ID 查找日志类型
      const entries = getEntries()
      const entry = entries.find(e => e.id === m.worklogId)
      const logType = entry?.type || 'unknown'

      if (!byLogType[logType]) {
        byLogType[logType] = { count: 0, total: 0 }
      }
      byLogType[logType].count++
      byLogType[logType].total += m.amount

      if (!byIncomeCategory[m.category]) {
        byIncomeCategory[m.category] = { count: 0, total: 0 }
      }
      byIncomeCategory[m.category].count++
      byIncomeCategory[m.category].total += m.amount
    }

    return {
      totalMappings: mappings.value.length,
      totalIncome: mappings.value.reduce((s, m) => s + m.amount, 0),
      monthlyMappings: monthMappings.length,
      monthlyIncome: monthMappings.reduce((s, m) => s + m.amount, 0),
      todayMappings: todayMappings.length,
      todayIncome: todayMappings.reduce((s, m) => s + m.amount, 0),
      byLogType,
      byIncomeCategory,
    }
  })

  /**
   * 预估日志收入（不实际创建记录）
   */
  function estimateEntryIncome(entry: LogEntry): {
    amount: number
    category: IncomeCategory
    label: string
    breakdown: {
      baseRate: number
      moodMultiplier: number
      lengthBonus: number
      tagBonus: number
    }
  } | null {
    const typeConfig = LOG_TYPE_TO_INCOME[entry.type]
    if (!typeConfig) return null

    if (entry.content.length < config.value.minContentLength) return null

    const moodMult = entry.mood ? MOOD_MULTIPLIER[entry.mood] : 1.0
    const lengthBonus = Math.floor(entry.content.length / 100) * config.value.lengthBonusRate
    const tagBonus = entry.tags.length * config.value.tagBonusRate

    const amount = Math.round(typeConfig.baseRate * moodMult + lengthBonus + tagBonus)

    return {
      amount,
      category: typeConfig.category,
      label: typeConfig.label,
      breakdown: {
        baseRate: typeConfig.baseRate,
        moodMultiplier: moodMult,
        lengthBonus,
        tagBonus,
      },
    }
  }

  /**
   * 预估批量桥接收入
   */
  function estimateBatchIncome(entries: LogEntry[]): {
    total: number
    count: number
    byCategory: Record<string, number>
    details: { worklogId: string; title: string; amount: number; category: string }[]
  } {
    let total = 0
    let count = 0
    const byCategory: Record<string, number> = {}
    const details: { worklogId: string; title: string; amount: number; category: string }[] = []

    const existingIds = new Set(mappings.value.map(m => m.worklogId))

    for (const entry of entries) {
      if (existingIds.has(entry.id)) continue
      const estimate = estimateEntryIncome(entry)
      if (!estimate) continue

      total += estimate.amount
      count++
      byCategory[estimate.category] = (byCategory[estimate.category] || 0) + estimate.amount
      details.push({
        worklogId: entry.id,
        title: entry.title,
        amount: estimate.amount,
        category: estimate.category,
      })
    }

    return { total, count, byCategory, details }
  }

  // ---- 配置管理 ----

  function updateConfig(partial: Partial<WorklogRewardConfig>): void {
    config.value = { ...config.value, ...partial }
  }

  function resetConfig(): void {
    config.value = { ...DEFAULT_BRIDGE_CONFIG }
  }

  return {
    // 状态
    config,
    mappings,
    bridgeStats,
    // 核心操作
    bridgeEntry,
    bridgeAllUnmapped,
    bridgeDateRange,
    unbridgeEntry,
    getMapping,
    isMapped,
    // 计算
    calculateEntryIncome,
    estimateEntryIncome,
    estimateBatchIncome,
    // 配置
    updateConfig,
    resetConfig,
    // 常量
    LOG_TYPE_TO_INCOME,
    MOOD_MULTIPLIER,
  }
}