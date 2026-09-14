// ============================================================
// 平行世界 · 自动冲突解决引擎（P19-6）
// 蓝图：
//   规则驱动自动冲突解决、冲突模式分析、
//   多种解决策略、可配置优先级规则、解决历史追踪
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { WorldBranch, Checkpoint } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 冲突策略 */
export type ConflictStrategy = 'newest-wins' | 'manual-priority' | 'merge-fields' | 'keep-both' | 'custom-rules'

/** 冲突类型（本模块独立定义，避免与 merge-engine 重复） */
export type AutoConflictType = 'data' | 'label' | 'tag' | 'metadata' | 'timeline' | 'snapshot'

/** 冲突项 */
export interface ConflictResolution {
  id: string
  /** 冲突类型 */
  type: AutoConflictType
  /** 源分支 ID */
  sourceBranchId: string
  /** 目标分支 ID */
  targetBranchId: string
  /** 冲突字段名 */
  fieldName: string
  /** 源数据 */
  sourceValue: unknown
  /** 目标数据 */
  targetValue: unknown
  /** 冲突描述 */
  description: string
  /** 应用策略 */
  strategy: ConflictStrategy
  /** 解决结果 */
  resolvedValue: unknown
  /** 是否自动解决 */
  isAuto: boolean
  /** 解决时间 */
  resolvedAt: string
  /** 解决规则 ID（如果是规则驱动的） */
  ruleId?: string
}

/** 解决规则 */
export interface ResolutionRule {
  id: string
  /** 规则名称 */
  name: string
  /** 规则描述 */
  description: string
  /** 匹配的冲突类型 */
  conflictTypes: AutoConflictType[]
  /** 匹配的字段名（为空匹配所有字段） */
  fieldPatterns: string[]
  /** 匹配的分支 ID 模式（为空匹配所有分支） */
  branchPatterns: string[]
  /** 解决方案 */
  strategy: ResolutionStrategy
  /** 规则优先级（1-10，数字越大优先级越高） */
  priority: number
  /** 是否启用 */
  enabled: boolean
  /** 命中次数 */
  hitCount: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

/** 规则解析策略 */
export type ResolutionStrategy =
  | 'keep-source'
  | 'keep-target'
  | 'keep-newest'
  | 'keep-oldest'
  | 'merge'
  | 'keep-both'
  | 'skip'
  | 'custom'

/** 解决结果 */
export interface ResolutionResult {
  id: string
  /** 解决的冲突列表 */
  resolutions: ConflictResolution[]
  /** 总冲突数 */
  totalConflicts: number
  /** 自动解决数 */
  autoResolved: number
  /** 手动解决数 */
  manualResolved: number
  /** 未解决数 */
  unresolved: number
  /** 使用的策略 */
  strategiesUsed: ConflictStrategy[]
  /** 使用的规则 */
  rulesApplied: ResolutionRule[]
  /** 是否全部解决 */
  allResolved: boolean
  /** 解决时间 */
  resolvedAt: string
  /** 解决摘要 */
  summary: string
}

// ============================================================
// 策略标签
// ============================================================

const STRATEGY_LABELS: Record<ConflictStrategy, string> = {
  'newest-wins': '最新优先',
  'manual-priority': '手动优先级',
  'merge-fields': '字段合并',
  'keep-both': '保留双方',
  'custom-rules': '自定义规则',
}

const RESOLUTION_LABELS: Record<ResolutionStrategy, string> = {
  'keep-source': '保留源',
  'keep-target': '保留目标',
  'keep-newest': '保留最新',
  'keep-oldest': '保留最旧',
  'merge': '合并',
  'keep-both': '保留双方',
  'skip': '跳过',
  'custom': '自定义',
}

// ---- 存储键 ----

const RESOLUTION_STORAGE_KEYS = {
  RULES: 'hf:parallel-world:resolution-rules',
  HISTORY: 'hf:parallel-world:resolution-history',
  DEFAULT_STRATEGY: 'hf:parallel-world:default-strategy',
} as const

// ---- ID 生成 ----

function generateId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// ---- 深度比较 ----

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object' || a === null || b === null) return false

  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const aKeys = Object.keys(aObj)
  const bKeys = Object.keys(bObj)

  if (aKeys.length !== bKeys.length) return false
  for (const key of aKeys) {
    if (!(key in bObj)) return false
    if (!deepEqual(aObj[key], bObj[key])) return false
  }
  return true
}

// ============================================================
// 默认规则
// ============================================================

function createDefaultRules(): ResolutionRule[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'rule_default_newest',
      name: '时间戳冲突取最新',
      description: '当时间戳字段冲突时，自动保留最新的时间戳',
      conflictTypes: ['timeline'],
      fieldPatterns: ['createdAt', 'updatedAt', 'timestamp'],
      branchPatterns: [],
      strategy: 'keep-newest',
      priority: 8,
      enabled: true,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rule_default_tags',
      name: '标签合并',
      description: '当标签冲突时，自动合并双方的标签（去重）',
      conflictTypes: ['tag'],
      fieldPatterns: ['tags', 'labels'],
      branchPatterns: [],
      strategy: 'merge',
      priority: 7,
      enabled: true,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rule_default_label',
      name: '标签名称冲突取目标',
      description: '当标签名称冲突时，保留目标分支的标签名称',
      conflictTypes: ['label'],
      fieldPatterns: ['label', 'name', 'title'],
      branchPatterns: [],
      strategy: 'keep-target',
      priority: 6,
      enabled: true,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rule_default_data_merge',
      name: '数据字段合并',
      description: '当数据字段冲突时，尝试合并字段（目标优先，源补充）',
      conflictTypes: ['data'],
      fieldPatterns: [],
      branchPatterns: [],
      strategy: 'merge',
      priority: 5,
      enabled: true,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'rule_default_keep_both',
      name: '元数据保留双方',
      description: '当元数据冲突时，保留双方数据',
      conflictTypes: ['metadata'],
      fieldPatterns: ['description', 'notes', 'comments'],
      branchPatterns: [],
      strategy: 'keep-both',
      priority: 4,
      enabled: true,
      hitCount: 0,
      createdAt: now,
      updatedAt: now,
    },
  ]
}

// ============================================================
// useAutoConflictResolution — 自动冲突解决
// ============================================================

export function useAutoConflictResolution() {
  // ---- 状态 ----

  const rules = ref<ResolutionRule[]>([])
  const resolutionHistory = ref<ResolutionResult[]>([])
  const defaultStrategy = ref<ConflictStrategy>('newest-wins')

  // ---- 派生状态 ----

  /** 启用的规则（按优先级排序） */
  const enabledRules = computed(() =>
    rules.value
      .filter(r => r.enabled)
      .sort((a, b) => b.priority - a.priority),
  )

  /** 总命中次数 */
  const totalHits = computed(() =>
    rules.value.reduce((sum, r) => sum + r.hitCount, 0),
  )

  /** 最近解决结果 */
  const latestResolution = computed<ResolutionResult | null>(() =>
    resolutionHistory.value[0] ?? null,
  )

  // ---- 持久化 ----

  function loadRules(): void {
    const saved = storage.getKV<ResolutionRule[]>(RESOLUTION_STORAGE_KEYS.RULES, [])
    if (saved && saved.length > 0) {
      rules.value = saved
    } else {
      rules.value = createDefaultRules()
      saveRules()
    }
  }

  function saveRules(): void {
    storage.setKV(RESOLUTION_STORAGE_KEYS.RULES, rules.value)
  }

  function loadHistory(): void {
    const saved = storage.getKV<ResolutionResult[]>(RESOLUTION_STORAGE_KEYS.HISTORY, [])
    if (saved) {
      resolutionHistory.value = saved
    }
  }

  function saveHistory(): void {
    storage.setKV(RESOLUTION_STORAGE_KEYS.HISTORY, resolutionHistory.value)
  }

  function loadDefaultStrategy(): void {
    const saved = storage.getKV<ConflictStrategy>(RESOLUTION_STORAGE_KEYS.DEFAULT_STRATEGY, 'newest-wins')
    if (saved) {
      defaultStrategy.value = saved
    }
  }

  function saveDefaultStrategy(): void {
    storage.setKV(RESOLUTION_STORAGE_KEYS.DEFAULT_STRATEGY, defaultStrategy.value)
  }

  // ============================================================
  // 冲突检测
  // ============================================================

  /**
   * 检测两个检查点之间的冲突
   */
  function detectConflicts(
    sourceCheckpoint: Checkpoint,
    targetCheckpoint: Checkpoint,
  ): ConflictResolution[] {
    const conflicts: ConflictResolution[] = []

    // 标签名称冲突
    if (sourceCheckpoint.label !== targetCheckpoint.label) {
      conflicts.push({
        id: generateId('cr'),
        type: 'label',
        sourceBranchId: sourceCheckpoint.branchId,
        targetBranchId: targetCheckpoint.branchId,
        fieldName: 'label',
        sourceValue: sourceCheckpoint.label,
        targetValue: targetCheckpoint.label,
        description: `标签名称冲突: "${sourceCheckpoint.label}" vs "${targetCheckpoint.label}"`,
        strategy: defaultStrategy.value,
        resolvedValue: targetCheckpoint.label,
        isAuto: false,
        resolvedAt: '',
      })
    }

    // 标签冲突
    const sourceTags = new Set(sourceCheckpoint.tags)
    const targetTags = new Set(targetCheckpoint.tags)
    const sourceOnly = [...sourceTags].filter(t => !targetTags.has(t))
    const targetOnly = [...targetTags].filter(t => !sourceTags.has(t))

    if (sourceOnly.length > 0 || targetOnly.length > 0) {
      conflicts.push({
        id: generateId('cr'),
        type: 'tag',
        sourceBranchId: sourceCheckpoint.branchId,
        targetBranchId: targetCheckpoint.branchId,
        fieldName: 'tags',
        sourceValue: sourceCheckpoint.tags,
        targetValue: targetCheckpoint.tags,
        description: `标签冲突: 源独有 ${sourceOnly.length} 个，目标独有 ${targetOnly.length} 个`,
        strategy: defaultStrategy.value,
        resolvedValue: [...sourceTags, ...targetTags],
        isAuto: false,
        resolvedAt: '',
      })
    }

    // 快照数据冲突
    if (!deepEqual(sourceCheckpoint.snapshot, targetCheckpoint.snapshot)) {
      const conflictFields = findConflictingFields(
        sourceCheckpoint.snapshot,
        targetCheckpoint.snapshot,
      )

      for (const field of conflictFields) {
        conflicts.push({
          id: generateId('cr'),
          type: 'data',
          sourceBranchId: sourceCheckpoint.branchId,
          targetBranchId: targetCheckpoint.branchId,
          fieldName: field,
          sourceValue: sourceCheckpoint.snapshot[field],
          targetValue: targetCheckpoint.snapshot[field],
          description: `数据字段冲突: "${field}"`,
          strategy: defaultStrategy.value,
          resolvedValue: targetCheckpoint.snapshot[field],
          isAuto: false,
          resolvedAt: '',
        })
      }
    }

    // 描述冲突
    if (sourceCheckpoint.description !== targetCheckpoint.description) {
      conflicts.push({
        id: generateId('cr'),
        type: 'metadata',
        sourceBranchId: sourceCheckpoint.branchId,
        targetBranchId: targetCheckpoint.branchId,
        fieldName: 'description',
        sourceValue: sourceCheckpoint.description,
        targetValue: targetCheckpoint.description,
        description: `描述内容冲突`,
        strategy: defaultStrategy.value,
        resolvedValue: targetCheckpoint.description,
        isAuto: false,
        resolvedAt: '',
      })
    }

    // 时间戳冲突
    if (sourceCheckpoint.createdAt !== targetCheckpoint.createdAt) {
      conflicts.push({
        id: generateId('cr'),
        type: 'timeline',
        sourceBranchId: sourceCheckpoint.branchId,
        targetBranchId: targetCheckpoint.branchId,
        fieldName: 'createdAt',
        sourceValue: sourceCheckpoint.createdAt,
        targetValue: targetCheckpoint.createdAt,
        description: `创建时间不一致`,
        strategy: defaultStrategy.value,
        resolvedValue: new Date(Math.max(
          new Date(sourceCheckpoint.createdAt).getTime(),
          new Date(targetCheckpoint.createdAt).getTime(),
        )).toISOString(),
        isAuto: false,
        resolvedAt: '',
      })
    }

    return conflicts
  }

  /**
   * 查找两个快照之间冲突的字段
   */
  function findConflictingFields(
    source: Record<string, unknown>,
    target: Record<string, unknown>,
  ): string[] {
    const conflicting: string[] = []
    const allKeys = new Set([...Object.keys(source), ...Object.keys(target)])

    for (const key of allKeys) {
      if (!(key in source) || !(key in target)) {
        conflicting.push(key)
        continue
      }
      if (!deepEqual(source[key], target[key])) {
        conflicting.push(key)
      }
    }

    return conflicting
  }

  // ============================================================
  // 冲突解决
  // ============================================================

  /**
   * 解决所有冲突
   */
  function resolveConflict(
    conflicts: ConflictResolution[],
    strategy?: ConflictStrategy,
    sourceBranch?: WorldBranch,
    targetBranch?: WorldBranch,
  ): ResolutionResult {
    const strategyToUse = strategy ?? defaultStrategy.value
    const resolutions: ConflictResolution[] = []
    const rulesApplied: ResolutionRule[] = []
    let autoResolved = 0
    let manualResolved = 0

    for (const conflict of conflicts) {
      // 尝试规则匹配
      const matchedRule = findMatchingRule(conflict, sourceBranch, targetBranch)

      if (matchedRule) {
        // 规则驱动解决
        conflict.strategy = 'custom-rules'
        conflict.resolvedValue = applyRuleStrategy(conflict, matchedRule)
        conflict.isAuto = true
        conflict.ruleId = matchedRule.id
        conflict.resolvedAt = new Date().toISOString()

        matchedRule.hitCount++
        if (!rulesApplied.find(r => r.id === matchedRule.id)) {
          rulesApplied.push(matchedRule)
        }
        autoResolved++
      } else {
        // 使用指定策略
        conflict.strategy = strategyToUse
        conflict.resolvedValue = applyStrategy(conflict, strategyToUse)
        conflict.isAuto = strategyToUse !== 'manual-priority'
        conflict.resolvedAt = new Date().toISOString()

        if (conflict.isAuto) {
          autoResolved++
        } else {
          manualResolved++
        }
      }

      resolutions.push(conflict)
    }

    const result: ResolutionResult = {
      id: generateId('result'),
      resolutions,
      totalConflicts: conflicts.length,
      autoResolved,
      manualResolved,
      unresolved: conflicts.length - autoResolved - manualResolved,
      strategiesUsed: [...new Set(resolutions.map(r => r.strategy))],
      rulesApplied,
      allResolved: autoResolved + manualResolved >= conflicts.length,
      resolvedAt: new Date().toISOString(),
      summary: generateResolutionSummary(resolutions, autoResolved, manualResolved, rulesApplied),
    }

    resolutionHistory.value = [result, ...resolutionHistory.value]
    saveRules()
    saveHistory()
    return result
  }

  /**
   * 查找匹配的规则
   */
  function findMatchingRule(
    conflict: ConflictResolution,
    sourceBranch?: WorldBranch,
    targetBranch?: WorldBranch,
  ): ResolutionRule | undefined {
    for (const rule of enabledRules.value) {
      // 检查冲突类型
      if (!rule.conflictTypes.includes(conflict.type)) continue

      // 检查字段模式
      if (rule.fieldPatterns.length > 0) {
        const matchesField = rule.fieldPatterns.some(pattern =>
          conflict.fieldName === pattern ||
          conflict.fieldName.includes(pattern),
        )
        if (!matchesField) continue
      }

      // 检查分支模式
      if (rule.branchPatterns.length > 0) {
        const sourceMatch = rule.branchPatterns.some(pattern =>
          sourceBranch?.name.includes(pattern) || sourceBranch?.id === pattern,
        )
        const targetMatch = rule.branchPatterns.some(pattern =>
          targetBranch?.name.includes(pattern) || targetBranch?.id === pattern,
        )
        if (!sourceMatch && !targetMatch) continue
      }

      return rule
    }

    return undefined
  }

  /**
   * 应用策略到冲突值
   */
  function applyStrategy(conflict: ConflictResolution, strategy: ConflictStrategy): unknown {
    switch (strategy) {
      case 'newest-wins':
        // 根据时间戳判断（如果有的话）
        return conflict.targetValue

      case 'manual-priority':
        // 手动优先级，默认保留目标
        return conflict.targetValue

      case 'merge-fields':
        // 合并字段（数组优先于对象判断，数组也是 object）
        if (Array.isArray(conflict.sourceValue) && Array.isArray(conflict.targetValue)) {
          return [...new Set([...(conflict.sourceValue as unknown[]), ...(conflict.targetValue as unknown[])])]
        }
        if (typeof conflict.sourceValue === 'object' && typeof conflict.targetValue === 'object') {
          return { ...(conflict.targetValue as Record<string, unknown>), ...(conflict.sourceValue as Record<string, unknown>) }
        }
        return conflict.targetValue

      case 'keep-both':
        // 保留双方，合并为数组
        return [conflict.sourceValue, conflict.targetValue]

      case 'custom-rules':
        return conflict.targetValue

      default:
        return conflict.targetValue
    }
  }

  /**
   * 应用规则策略
   */
  function applyRuleStrategy(conflict: ConflictResolution, rule: ResolutionRule): unknown {
    switch (rule.strategy) {
      case 'keep-source':
        return conflict.sourceValue

      case 'keep-target':
        return conflict.targetValue

      case 'keep-newest':
        // 比较时间戳
        if (conflict.type === 'timeline') {
          const sourceTime = new Date(String(conflict.sourceValue)).getTime()
          const targetTime = new Date(String(conflict.targetValue)).getTime()
          return sourceTime > targetTime ? conflict.sourceValue : conflict.targetValue
        }
        return conflict.targetValue

      case 'keep-oldest':
        if (conflict.type === 'timeline') {
          const sourceTime = new Date(String(conflict.sourceValue)).getTime()
          const targetTime = new Date(String(conflict.targetValue)).getTime()
          return sourceTime < targetTime ? conflict.sourceValue : conflict.targetValue
        }
        return conflict.sourceValue

      case 'merge':
        // 合并（数组优先于对象判断，数组也是 object）
        if (Array.isArray(conflict.sourceValue) && Array.isArray(conflict.targetValue)) {
          return [...new Set([...(conflict.targetValue as unknown[]), ...(conflict.sourceValue as unknown[])])]
        }
        if (typeof conflict.sourceValue === 'object' && typeof conflict.targetValue === 'object') {
          return { ...(conflict.targetValue as Record<string, unknown>), ...(conflict.sourceValue as Record<string, unknown>) }
        }
        return conflict.targetValue

      case 'keep-both':
        return [conflict.sourceValue, conflict.targetValue]

      case 'skip':
        return conflict.targetValue

      case 'custom':
        return conflict.targetValue

      default:
        return conflict.targetValue
    }
  }

  /**
   * 生成解决摘要
   */
  function generateResolutionSummary(
    resolutions: ConflictResolution[],
    autoResolved: number,
    manualResolved: number,
    rulesApplied: ResolutionRule[],
  ): string {
    const typeLabels: Record<AutoConflictType, string> = {
      data: '数据',
      label: '标签名',
      tag: '标签',
      metadata: '元数据',
      timeline: '时间线',
      snapshot: '快照',
    }

    const typeCounts = new Map<AutoConflictType, number>()
    for (const r of resolutions) {
      typeCounts.set(r.type, (typeCounts.get(r.type) || 0) + 1)
    }

    const typeSummary = [...typeCounts.entries()]
      .map(([type, count]) => `${typeLabels[type]} ${count} 个`)
      .join('，')

    let summary = `共解决 ${resolutions.length} 个冲突`
    if (typeSummary) summary += `（${typeSummary}）`
    summary += `，自动 ${autoResolved} 个`
    if (manualResolved > 0) summary += `，手动 ${manualResolved} 个`
    if (rulesApplied.length > 0) {
      summary += `，应用了 ${rulesApplied.length} 条规则: ${rulesApplied.map(r => r.name).join('、')}`
    }

    return summary
  }

  // ============================================================
  // 策略管理
  // ============================================================

  /**
   * 设置默认策略
   */
  function setDefaultStrategy(strategy: ConflictStrategy): void {
    defaultStrategy.value = strategy
    saveDefaultStrategy()
  }

  /**
   * 获取策略标签
   */
  function getStrategyLabel(strategy: ConflictStrategy): string {
    return STRATEGY_LABELS[strategy]
  }

  /**
   * 获取所有可用策略
   */
  function getAvailableStrategies(): { value: ConflictStrategy; label: string }[] {
    return Object.entries(STRATEGY_LABELS).map(([value, label]) => ({
      value: value as ConflictStrategy,
      label,
    }))
  }

  // ============================================================
  // 规则管理
  // ============================================================

  /**
   * 添加解决规则
   */
  function addResolutionRule(
    name: string,
    description: string,
    conflictTypes: AutoConflictType[],
    strategy: ResolutionStrategy,
    options?: {
      fieldPatterns?: string[]
      branchPatterns?: string[]
      priority?: number
    },
  ): ResolutionRule {
    const rule: ResolutionRule = {
      id: generateId('rule'),
      name,
      description,
      conflictTypes,
      fieldPatterns: options?.fieldPatterns ?? [],
      branchPatterns: options?.branchPatterns ?? [],
      strategy,
      priority: options?.priority ?? 5,
      enabled: true,
      hitCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    rules.value.push(rule)
    saveRules()
    return rule
  }

  /**
   * 更新规则
   */
  function updateRule(ruleId: string, updates: Partial<ResolutionRule>): ResolutionRule | undefined {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx === -1) return undefined

    rules.value[idx] = {
      ...rules.value[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveRules()
    return rules.value[idx]
  }

  /**
   * 删除规则
   */
  function deleteRule(ruleId: string): boolean {
    const idx = rules.value.findIndex(r => r.id === ruleId)
    if (idx === -1) return false

    rules.value.splice(idx, 1)
    saveRules()
    return true
  }

  /**
   * 启用/禁用规则
   */
  function toggleRule(ruleId: string, enabled: boolean): boolean {
    const rule = rules.value.find(r => r.id === ruleId)
    if (!rule) return false

    rule.enabled = enabled
    rule.updatedAt = new Date().toISOString()
    saveRules()
    return true
  }

  /**
   * 重置所有规则为默认值
   */
  function resetRules(): void {
    rules.value = createDefaultRules()
    saveRules()
  }

  /**
   * 获取规则
   */
  function getRule(ruleId: string): ResolutionRule | undefined {
    return rules.value.find(r => r.id === ruleId)
  }

  // ============================================================
  // 解决历史
  // ============================================================

  /**
   * 获取解决历史
   */
  function getResolutionHistory(): ResolutionResult[] {
    return resolutionHistory.value
  }

  /**
   * 获取指定分支的解决历史
   */
  function getHistoryForBranch(branchId: string): ResolutionResult[] {
    return resolutionHistory.value.filter(r =>
      r.resolutions.some(
        cr => cr.sourceBranchId === branchId || cr.targetBranchId === branchId,
      ),
    )
  }

  /**
   * 清除解决历史
   */
  function clearHistory(): void {
    resolutionHistory.value = []
    saveHistory()
  }

  // ============================================================
  // 冲突模式分析
  // ============================================================

  /**
   * 分析冲突模式
   */
  function analyzeConflictPatterns(): {
    mostCommonTypes: { type: AutoConflictType; count: number }[]
    mostCommonFields: { field: string; count: number }[]
    mostUsedRules: { rule: ResolutionRule; count: number }[]
    totalResolved: number
    autoResolveRate: number
    ruleHitRate: number
    recommendations: string[]
  } {
    const allResolutions = resolutionHistory.value.flatMap(r => r.resolutions)

    // 分析冲突类型分布
    const typeCounts = new Map<AutoConflictType, number>()
    for (const r of allResolutions) {
      typeCounts.set(r.type, (typeCounts.get(r.type) || 0) + 1)
    }
    const mostCommonTypes = [...typeCounts.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 分析冲突字段分布
    const fieldCounts = new Map<string, number>()
    for (const r of allResolutions) {
      fieldCounts.set(r.fieldName, (fieldCounts.get(r.fieldName) || 0) + 1)
    }
    const mostCommonFields = [...fieldCounts.entries()]
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // 分析规则使用频次
    const mostUsedRules = [...rules.value]
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 5)
      .map(r => ({ rule: r, count: r.hitCount }))

    const totalResolved = allResolutions.length
    const autoResolved = allResolutions.filter(r => r.isAuto).length
    const autoResolveRate = totalResolved > 0 ? autoResolved / totalResolved : 0
    const ruleHitRate = rules.value.length > 0
      ? rules.value.filter(r => r.hitCount > 0).length / rules.value.length
      : 0

    // 生成建议
    const recommendations: string[] = []

    if (autoResolveRate < 0.5) {
      recommendations.push('自动解决率较低，建议添加更多匹配规则以减少手动干预')
    }

    if (mostCommonTypes.length > 0 && mostCommonTypes[0].count > totalResolved * 0.5) {
      recommendations.push(
        `"${mostCommonTypes[0].type}" 类型冲突占比最高，建议为此类型创建专用规则`,
      )
    }

    if (mostCommonFields.length > 0 && mostCommonFields[0].count > totalResolved * 0.3) {
      recommendations.push(
        `字段 "${mostCommonFields[0].field}" 频繁冲突，建议检查该字段的设计逻辑`,
      )
    }

    if (ruleHitRate < 0.3) {
      recommendations.push('规则命中率较低，建议检查现有规则的匹配条件是否合理')
    }

    if (recommendations.length === 0) {
      recommendations.push('当前冲突解决状态良好，无需调整')
    }

    return {
      mostCommonTypes,
      mostCommonFields,
      mostUsedRules,
      totalResolved,
      autoResolveRate: Math.round(autoResolveRate * 100) / 100,
      ruleHitRate: Math.round(ruleHitRate * 100) / 100,
      recommendations,
    }
  }

  // ---- 清理 ----

  function destroy(): void {
    resolutionHistory.value = []
  }

  // ---- 初始化 ----

  loadRules()
  loadHistory()
  loadDefaultStrategy()

  // ============================================================
  // 返回
  // ============================================================

  return {
    // 状态
    rules,
    resolutionHistory,
    defaultStrategy,
    enabledRules,
    totalHits,
    latestResolution,

    // 冲突解决
    detectConflicts,
    resolveConflict,
    findMatchingRule,

    // 策略管理
    setDefaultStrategy,
    getStrategyLabel,
    getAvailableStrategies,

    // 规则管理
    addResolutionRule,
    updateRule,
    deleteRule,
    toggleRule,
    resetRules,
    getRule,

    // 解决历史
    getResolutionHistory,
    getHistoryForBranch,
    clearHistory,

    // 冲突模式分析
    analyzeConflictPatterns,

    // 生命周期
    destroy,
    loadRules,
    loadHistory,
    saveRules,
    saveHistory,
  }
}

export { STRATEGY_LABELS, RESOLUTION_LABELS, RESOLUTION_STORAGE_KEYS }