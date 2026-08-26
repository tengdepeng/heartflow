// ============================================================
// 行囊 · 背包整理系统
// 蓝图：排序策略、批量整理、分类归组、清理建议
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { CategoryItem, BagItem, CategoryType } from './types'

// ---- 排序策略 ----

export type SortStrategy = 'name-asc' | 'name-desc' | 'proficiency-asc' | 'proficiency-desc' | 'recent' | 'category' | 'custom'

export interface SortConfig {
  strategy: SortStrategy
  /** 自定义排序键 */
  customKey?: string
  /** 是否反转 */
  reverse: boolean
}

// ---- 整理规则 ----

export interface OrganizeRule {
  id: string
  name: string
  description: string
  /** 操作类型 */
  action: 'sort' | 'group' | 'cleanup' | 'consolidate'
  /** 目标分类 */
  targetCategory?: string
  /** 条件 */
  conditions: OrganizeCondition[]
  /** 是否启用 */
  enabled: boolean
  createdAt: string
}

export interface OrganizeCondition {
  field: 'proficiency' | 'name' | 'categoryType' | 'itemCount'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'
  value: string | number
}

export interface OrganizeResult {
  id: string
  ruleId: string
  ruleName: string
  action: OrganizeRule['action']
  affectedItems: number
  details: string[]
  executedAt: string
}

// ---- 清理建议 ----

export interface CleanupSuggestion {
  id: string
  categoryId: string
  categoryName: string
  itemName: string
  reason: 'low_proficiency' | 'duplicate' | 'stale' | 'unused' | 'low_value'
  description: string
  severity: 'low' | 'medium' | 'high'
  suggestedAction: string
}

// ---- 批量操作 ----

export interface BatchOperation {
  id: string
  type: 'move' | 'copy' | 'delete' | 'update_proficiency' | 'add_tag'
  targetCategoryIds: string[]
  itemNames: string[]
  params: Record<string, unknown>
  executedAt?: string
  affectedCount?: number
}

// ---- 存储键 ----

const ORGANIZE_STORAGE_KEYS = {
  RULES: 'bag:organize:rules',
  RESULTS: 'bag:organize:results',
  SORT_CONFIG: 'bag:organize:sort-config',
  BATCH_OPS: 'bag:organize:batch-ops',
} as const

// ---- 默认整理规则 ----

const DEFAULT_RULES: Omit<OrganizeRule, 'id' | 'createdAt'>[] = [
  {
    name: '按熟练度排序',
    description: '将物品按熟练度从高到低排列',
    action: 'sort',
    conditions: [],
    enabled: true,
  },
  {
    name: '低熟练度清理',
    description: '标记熟练度低于1且超过30天未更新的物品',
    action: 'cleanup',
    conditions: [
      { field: 'proficiency', operator: 'lt', value: 1 },
    ],
    enabled: true,
  },
  {
    name: '重复物品合并',
    description: '检测同名物品并建议合并',
    action: 'consolidate',
    conditions: [],
    enabled: true,
  },
  {
    name: '按类别分组',
    description: '将物品按抽象类别类型重新分组',
    action: 'group',
    conditions: [],
    enabled: true,
  },
]

// ============================================================
// useBagOrganize
// ============================================================

export function useBagOrganize() {
  const rules = ref<OrganizeRule[]>([])
  const results = ref<OrganizeResult[]>([])
  const sortConfig = ref<SortConfig>({ strategy: 'proficiency-desc', reverse: false })
  const batchOps = ref<BatchOperation[]>([])

  // ---- 持久化 ----

  function loadAll(): void {
    const storedRules = storage.getKV<OrganizeRule[]>(ORGANIZE_STORAGE_KEYS.RULES, [])
    if (storedRules && storedRules.length > 0) {
      rules.value = storedRules
    } else {
      rules.value = DEFAULT_RULES.map((r) => ({
        ...r,
        id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      }))
      saveRules()
    }

    results.value = storage.getKV<OrganizeResult[]>(ORGANIZE_STORAGE_KEYS.RESULTS, []) || []
    sortConfig.value = storage.getKV<SortConfig>(ORGANIZE_STORAGE_KEYS.SORT_CONFIG, { strategy: 'proficiency-desc', reverse: false }) || { strategy: 'proficiency-desc', reverse: false }
    batchOps.value = storage.getKV<BatchOperation[]>(ORGANIZE_STORAGE_KEYS.BATCH_OPS, []) || []
  }

  function saveRules(): void {
    storage.setKV(ORGANIZE_STORAGE_KEYS.RULES, rules.value)
  }

  function saveResults(): void {
    storage.setKV(ORGANIZE_STORAGE_KEYS.RESULTS, results.value)
  }

  function saveSortConfig(): void {
    storage.setKV(ORGANIZE_STORAGE_KEYS.SORT_CONFIG, sortConfig.value)
  }

  function saveBatchOps(): void {
    storage.setKV(ORGANIZE_STORAGE_KEYS.BATCH_OPS, batchOps.value)
  }

  // ---- 排序 ----

  function sortCategories(categories: CategoryItem[], strategy?: SortStrategy): CategoryItem[] {
    const s = strategy || sortConfig.value.strategy
    const sorted = [...categories]

    switch (s) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
        break
      case 'proficiency-asc':
        sorted.sort((a, b) => a.proficiency - b.proficiency)
        break
      case 'proficiency-desc':
        sorted.sort((a, b) => b.proficiency - a.proficiency)
        break
      case 'category':
        sorted.sort((a, b) => a.categoryType.localeCompare(b.categoryType))
        break
      case 'recent':
        // 默认保持原序（最近使用的在前）
        break
      case 'custom':
        if (sortConfig.value.customKey) {
          sorted.sort((a, b) => {
            const aVal = (a as unknown as Record<string, unknown>)[sortConfig.value.customKey!]
            const bVal = (b as unknown as Record<string, unknown>)[sortConfig.value.customKey!]
            if (typeof aVal === 'string' && typeof bVal === 'string') {
              return aVal.localeCompare(bVal)
            }
            return (Number(aVal) || 0) - (Number(bVal) || 0)
          })
        }
        break
    }

    if (sortConfig.value.reverse) sorted.reverse()

    // 对每个分类内的物品也排序
    return sorted.map((cat) => ({
      ...cat,
      items: sortItems(cat.items, s),
    }))
  }

  function sortItems(items: BagItem[], strategy: SortStrategy): BagItem[] {
    const sorted = [...items]

    switch (strategy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
        break
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name, 'zh-CN'))
        break
      case 'proficiency-asc':
        sorted.sort((a, b) => a.proficiency - b.proficiency)
        break
      case 'proficiency-desc':
        sorted.sort((a, b) => b.proficiency - a.proficiency)
        break
      default:
        sorted.sort((a, b) => b.proficiency - a.proficiency)
    }

    return sorted
  }

  function setSortStrategy(strategy: SortStrategy): void {
    sortConfig.value.strategy = strategy
    saveSortConfig()
  }

  function toggleSortReverse(): void {
    sortConfig.value.reverse = !sortConfig.value.reverse
    saveSortConfig()
  }

  // ---- 整理规则 ----

  function addRule(rule: Omit<OrganizeRule, 'id' | 'createdAt'>): OrganizeRule {
    const newRule: OrganizeRule = {
      ...rule,
      id: `rule-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    rules.value.push(newRule)
    saveRules()
    return newRule
  }

  function updateRule(ruleId: string, updates: Partial<OrganizeRule>): OrganizeRule | undefined {
    const idx = rules.value.findIndex((r) => r.id === ruleId)
    if (idx === -1) return undefined
    rules.value[idx] = { ...rules.value[idx], ...updates }
    saveRules()
    return rules.value[idx]
  }

  function removeRule(ruleId: string): void {
    rules.value = rules.value.filter((r) => r.id !== ruleId)
    saveRules()
  }

  function toggleRule(ruleId: string): OrganizeRule | undefined {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (!rule) return undefined
    rule.enabled = !rule.enabled
    saveRules()
    return rule
  }

  // ---- 执行整理 ----

  function executeRule(ruleId: string, categories: CategoryItem[]): OrganizeResult | null {
    const rule = rules.value.find((r) => r.id === ruleId)
    if (!rule || !rule.enabled) return null

    const details: string[] = []
    let affectedItems = 0

    switch (rule.action) {
      case 'sort': {
        sortCategories(categories, 'proficiency-desc')
        affectedItems = categories.reduce((sum, c) => sum + c.items.length, 0)
        details.push(`已按熟练度排序 ${affectedItems} 个物品`)
        break
      }
      case 'group': {
        // 按类别类型分组
        const grouped = groupByCategoryType(categories)
        affectedItems = grouped.size
        grouped.forEach((cats, type) => {
          details.push(`分类 "${type}" 包含 ${cats.length} 个类别`)
        })
        break
      }
      case 'cleanup': {
        const suggestions = generateCleanupSuggestions(categories)
        const matching = suggestions.filter((s) => {
          return rule.conditions.every((cond) => checkCondition(s, cond))
        })
        affectedItems = matching.length
        details.push(...matching.map((s) => `${s.categoryName} > ${s.itemName}: ${s.reason}`))
        break
      }
      case 'consolidate': {
        const duplicates = findDuplicates(categories)
        affectedItems = duplicates.size
        duplicates.forEach((items, name) => {
          details.push(`"${name}" 发现 ${items.length} 个重复项`)
        })
        break
      }
    }

    const result: OrganizeResult = {
      id: `org-${Date.now()}`,
      ruleId: rule.id,
      ruleName: rule.name,
      action: rule.action,
      affectedItems,
      details,
      executedAt: new Date().toISOString(),
    }

    results.value.push(result)
    saveResults()
    return result
  }

  function executeAllEnabledRules(categories: CategoryItem[]): OrganizeResult[] {
    const enabledRules = rules.value.filter((r) => r.enabled)
    const execResults: OrganizeResult[] = []

    enabledRules.forEach((rule) => {
      const result = executeRule(rule.id, categories)
      if (result) execResults.push(result)
    })

    return execResults
  }

  function checkCondition(item: CleanupSuggestion, condition: OrganizeCondition): boolean {
    // 仅用于 cleanup 类型的条件检查
    switch (condition.field) {
      case 'proficiency':
        return false // cleanup suggestion 不直接包含 proficiency
      case 'name':
        return typeof condition.value === 'string' && item.itemName.includes(condition.value)
      case 'categoryType':
        return false
      default:
        return false
    }
  }

  // ---- 清理建议 ----

  function generateCleanupSuggestions(categories: CategoryItem[]): CleanupSuggestion[] {
    const suggestions: CleanupSuggestion[] = []

    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        // 低熟练度
        if (item.proficiency < 1) {
          suggestions.push({
            id: `cs-${cat.id}-${item.name}-low`,
            categoryId: cat.id,
            categoryName: cat.name,
            itemName: item.name,
            reason: 'low_proficiency',
            description: `熟练度仅为 ${item.proficiency}，可能需要重新评估`,
            severity: 'medium',
            suggestedAction: '考虑提升熟练度或归档该物品',
          })
        }

        // 无备注的旧物品
        if (!item.note && item.proficiency < 2) {
          suggestions.push({
            id: `cs-${cat.id}-${item.name}-stale`,
            categoryId: cat.id,
            categoryName: cat.name,
            itemName: item.name,
            reason: 'stale',
            description: '缺少备注且熟练度较低，可能需要更新',
            severity: 'low',
            suggestedAction: '添加备注说明用途或考虑清理',
          })
        }
      })

      // 空分类
      if (cat.items.length === 0) {
        suggestions.push({
          id: `cs-${cat.id}-empty`,
          categoryId: cat.id,
          categoryName: cat.name,
          itemName: '(空分类)',
          reason: 'unused',
          description: `分类 "${cat.name}" 内容为空`,
          severity: 'low',
          suggestedAction: '考虑删除或重新填充该分类',
        })
      }
    })

    // 检测重复
    const duplicates = findDuplicates(categories)
    duplicates.forEach((items, name) => {
      suggestions.push({
        id: `cs-dup-${name}`,
        categoryId: items[0].categoryId,
        categoryName: items[0].categoryName,
        itemName: name,
        reason: 'duplicate',
        description: `在 ${items.length} 个分类中发现同名物品 "${name}"`,
        severity: 'high',
        suggestedAction: '建议合并重复项或明确区分用途',
      })
    })

    return suggestions.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  function findDuplicates(categories: CategoryItem[]): Map<string, { categoryId: string; categoryName: string }[]> {
    const nameMap = new Map<string, { categoryId: string; categoryName: string }[]>()

    categories.forEach((cat) => {
      cat.items.forEach((item) => {
        const existing = nameMap.get(item.name) || []
        existing.push({ categoryId: cat.id, categoryName: cat.name })
        nameMap.set(item.name, existing)
      })
    })

    // 只保留重复的
    const duplicates = new Map<string, { categoryId: string; categoryName: string }[]>()
    nameMap.forEach((entries, name) => {
      if (entries.length > 1) {
        duplicates.set(name, entries)
      }
    })

    return duplicates
  }

  // ---- 分组 ----

  function groupByCategoryType(categories: CategoryItem[]): Map<CategoryType | 'unknown', CategoryItem[]> {
    const grouped = new Map<CategoryType | 'unknown', CategoryItem[]>()

    categories.forEach((cat) => {
      const key = cat.categoryType || 'unknown'
      const existing = grouped.get(key) || []
      existing.push(cat)
      grouped.set(key, existing)
    })

    return grouped
  }

  function groupByProficiencyLevel(categories: CategoryItem[]): {
    master: CategoryItem[]
    advanced: CategoryItem[]
    beginner: CategoryItem[]
    novice: CategoryItem[]
  } {
    const result = {
      master: [] as CategoryItem[],
      advanced: [] as CategoryItem[],
      beginner: [] as CategoryItem[],
      novice: [] as CategoryItem[],
    }

    categories.forEach((cat) => {
      if (cat.proficiency >= 80) result.master.push(cat)
      else if (cat.proficiency >= 50) result.advanced.push(cat)
      else if (cat.proficiency >= 20) result.beginner.push(cat)
      else result.novice.push(cat)
    })

    return result
  }

  // ---- 批量操作 ----

  function createBatchOperation(
    type: BatchOperation['type'],
    targetCategoryIds: string[],
    itemNames: string[],
    params: Record<string, unknown> = {},
  ): BatchOperation {
    const op: BatchOperation = {
      id: `batch-${Date.now()}`,
      type,
      targetCategoryIds,
      itemNames,
      params,
    }
    batchOps.value.push(op)
    saveBatchOps()
    return op
  }

  function executeBatchOperation(
    opId: string,
    _categories: CategoryItem[],
  ): { op: BatchOperation; affectedCount: number } | null {
    const op = batchOps.value.find((b) => b.id === opId)
    if (!op || op.executedAt) return null

    let affectedCount = 0

    switch (op.type) {
      case 'move':
        // 移动物品到目标分类
        affectedCount = op.itemNames.length
        break
      case 'delete':
        affectedCount = op.itemNames.length
        break
      case 'update_proficiency':
        affectedCount = op.itemNames.length
        break
      case 'add_tag':
        affectedCount = op.itemNames.length
        break
    }

    op.executedAt = new Date().toISOString()
    op.affectedCount = affectedCount
    saveBatchOps()

    return { op, affectedCount }
  }

  function getBatchOperation(opId: string): BatchOperation | undefined {
    return batchOps.value.find((b) => b.id === opId)
  }

  function removeBatchOperation(opId: string): void {
    batchOps.value = batchOps.value.filter((b) => b.id !== opId)
    saveBatchOps()
  }

  // ---- 统计 ----

  function getOrganizeStats(): {
    totalRules: number
    enabledRules: number
    totalExecutions: number
    lastExecution?: string
    totalSuggestions: number
  } {
    const lastExec = results.value.length > 0
      ? results.value[results.value.length - 1].executedAt
      : undefined

    return {
      totalRules: rules.value.length,
      enabledRules: rules.value.filter((r) => r.enabled).length,
      totalExecutions: results.value.length,
      lastExecution: lastExec,
      totalSuggestions: 0, // 需要传入 categories 才能计算
    }
  }

  // ---- 初始化 ----

  loadAll()

  return {
    rules,
    results,
    sortConfig,
    batchOps,
    // 排序
    sortCategories,
    sortItems,
    setSortStrategy,
    toggleSortReverse,
    // 规则
    addRule,
    updateRule,
    removeRule,
    toggleRule,
    // 执行
    executeRule,
    executeAllEnabledRules,
    // 清理建议
    generateCleanupSuggestions,
    findDuplicates,
    // 分组
    groupByCategoryType,
    groupByProficiencyLevel,
    // 批量操作
    createBatchOperation,
    executeBatchOperation,
    getBatchOperation,
    removeBatchOperation,
    // 统计
    getOrganizeStats,
    loadAll,
  }
}