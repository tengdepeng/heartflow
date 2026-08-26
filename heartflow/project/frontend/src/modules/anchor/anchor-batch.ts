// ============================================================
// 逐日心锚 · 批量锚点管理（P18-4）
// 批量完成、批量重排、批量优先级变更、批量标签、批量删除
// ============================================================

import type { Anchor } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 批量操作类型 */
export type BatchOperationType =
  | 'complete'
  | 'postpone'
  | 'setPriority'
  | 'addTag'
  | 'removeTag'
  | 'setCategory'
  | 'moveToPool'
  | 'placeFromPool'
  | 'delete'
  | 'duplicate'

/** 批量操作记录 */
export interface BatchOperation {
  /** 操作 ID */
  id: string
  /** 操作类型 */
  type: BatchOperationType
  /** 目标锚点 ID 列表 */
  targetIds: string[]
  /** 操作参数 */
  params: BatchOperationParams
  /** 操作时间 */
  operatedAt: string
  /** 受影响锚点数 */
  affectedCount: number
  /** 是否可撤销 */
  reversible: boolean
}

/** 批量操作参数 */
export interface BatchOperationParams {
  /** 优先级 */
  priority?: Anchor['priority']
  /** 标签 */
  tag?: string
  /** 分类 */
  category?: string
  /** 目标日期 */
  targetDate?: string
  /** 重复份数 */
  duplicateCount?: number
}

/** 批量操作结果 */
export interface BatchOperationResult {
  /** 是否成功 */
  success: boolean
  /** 操作记录 */
  operation: BatchOperation
  /** 成功数 */
  successCount: number
  /** 失败数 */
  failureCount: number
  /** 错误信息 */
  errors: string[]
}

/** 选择模式 */
export type SelectionMode = 'all' | 'filtered' | 'manual' | 'none'

/** 选择状态 */
export interface SelectionState {
  /** 选择模式 */
  mode: SelectionMode
  /** 手动选中的锚点 ID 集合 */
  selectedIds: Set<string>
  /** 筛选条件 */
  filter?: SelectionFilter
}

/** 选择筛选条件 */
export interface SelectionFilter {
  /** 优先级 */
  priority?: Anchor['priority']
  /** 标签 */
  tag?: string
  /** 分类 */
  category?: string
  /** 是否只选未完成 */
  pendingOnly?: boolean
  /** 日期范围 */
  dateRange?: { start: string; end: string }
  /** 是否只选已完成 */
  doneOnly?: boolean
}

/** 批量操作预览 */
export interface BatchPreview {
  /** 操作类型 */
  type: BatchOperationType
  /** 将受影响的锚点数 */
  affectedCount: number
  /** 预览摘要 */
  summary: string
  /** 受影响的锚点文本 */
  affectedTexts: string[]
}

// ============================================================
// 元数据
// ============================================================

export const BATCH_OPERATION_LABELS: Record<BatchOperationType, string> = {
  complete: '批量完成',
  postpone: '批量推迟',
  setPriority: '批量设置优先级',
  addTag: '批量添加标签',
  removeTag: '批量移除标签',
  setCategory: '批量设置分类',
  moveToPool: '批量放回锚点池',
  placeFromPool: '批量安放',
  delete: '批量删除',
  duplicate: '批量复制',
}

export const BATCH_OPERATION_ICONS: Record<BatchOperationType, string> = {
  complete: '✅',
  postpone: '⏭️',
  setPriority: '⭐',
  addTag: '🏷️',
  removeTag: '🏷️',
  setCategory: '📁',
  moveToPool: '🔙',
  placeFromPool: '📤',
  delete: '🗑️',
  duplicate: '📋',
}

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// useAnchorBatch
// ============================================================

export function useAnchorBatch() {
  // ---- 选择状态 ----
  const selection = ref<SelectionState>({
    mode: 'none',
    selectedIds: new Set(),
  })

  /** 清除选择 */
  function clearSelection(): void {
    selection.value = { mode: 'none', selectedIds: new Set() }
  }

  /** 切换单个锚点选择 */
  function toggleSelection(anchorId: string): void {
    const newIds = new Set(selection.value.selectedIds)
    if (newIds.has(anchorId)) {
      newIds.delete(anchorId)
    } else {
      newIds.add(anchorId)
    }
    selection.value = {
      mode: newIds.size > 0 ? 'manual' : 'none',
      selectedIds: newIds,
    }
  }

  /** 全选 */
  function selectAll(anchors: Anchor[], filter?: SelectionFilter): void {
    const filtered = applyFilter(anchors, filter)
    const ids = new Set(filtered.map(a => a.id))
    selection.value = {
      mode: 'all',
      selectedIds: ids,
      filter,
    }
  }

  /** 反选 */
  function invertSelection(anchors: Anchor[], filter?: SelectionFilter): void {
    const filtered = applyFilter(anchors, filter)
    const currentIds = selection.value.selectedIds
    const newIds = new Set<string>()

    for (const a of filtered) {
      if (!currentIds.has(a.id)) {
        newIds.add(a.id)
      }
    }

    selection.value = {
      mode: newIds.size > 0 ? 'manual' : 'none',
      selectedIds: newIds,
    }
  }

  /** 获取选中的锚点 */
  function getSelectedAnchors(anchors: Anchor[]): Anchor[] {
    if (selection.value.mode === 'none') return []
    return anchors.filter(a => selection.value.selectedIds.has(a.id))
  }

  /** 获取选中数量 */
  function getSelectionCount(): number {
    return selection.value.selectedIds.size
  }

  // ---- 筛选 ----
  function applyFilter(anchors: Anchor[], filter?: SelectionFilter): Anchor[] {
    if (!filter) return anchors

    let result = [...anchors]

    if (filter.priority) {
      result = result.filter(a => a.priority === filter.priority)
    }
    if (filter.tag) {
      result = result.filter(a => a.tags?.includes(filter.tag!))
    }
    if (filter.category) {
      result = result.filter(a => a.category === filter.category)
    }
    if (filter.pendingOnly) {
      result = result.filter(a => !a.done)
    }
    if (filter.doneOnly) {
      result = result.filter(a => a.done)
    }
    if (filter.dateRange) {
      result = result.filter(a =>
        a.targetDate >= filter.dateRange!.start &&
        a.targetDate <= filter.dateRange!.end
      )
    }

    return result
  }

  // ---- 批量操作 ----

  /** 批量完成 */
  function batchComplete(
    anchors: Anchor[],
    anchorIds: string[],
    updateFn: (id: string) => boolean,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if (a.done) {
        errors.push(`锚点 "${a.text}" 已完成`)
        continue
      }
      if (updateFn(id)) {
        successCount++
      } else {
        errors.push(`锚点 "${a.text}" 操作失败`)
      }
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'complete',
        targetIds: anchorIds,
        params: {},
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: false,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量推迟 */
  function batchPostpone(
    anchors: Anchor[],
    anchorIds: string[],
    postponeFn: (id: string) => void,
    targetDate?: string,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if (a.done) {
        errors.push(`锚点 "${a.text}" 已完成，无法推迟`)
        continue
      }
      postponeFn(id)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'postpone',
        targetIds: anchorIds,
        params: { targetDate },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量设置优先级 */
  function batchSetPriority(
    anchors: Anchor[],
    anchorIds: string[],
    priority: Anchor['priority'],
    updateFn: (id: string, priority: Anchor['priority']) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      updateFn(id, priority)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'setPriority',
        targetIds: anchorIds,
        params: { priority },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量添加标签 */
  function batchAddTag(
    anchors: Anchor[],
    anchorIds: string[],
    tag: string,
    addTagFn: (id: string, tag: string) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if (a.tags?.includes(tag)) {
        errors.push(`锚点 "${a.text}" 已有标签 "${tag}"`)
        continue
      }
      addTagFn(id, tag)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'addTag',
        targetIds: anchorIds,
        params: { tag },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量移除标签 */
  function batchRemoveTag(
    anchors: Anchor[],
    anchorIds: string[],
    tag: string,
    removeTagFn: (id: string, tag: string) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if (!a.tags?.includes(tag)) {
        errors.push(`锚点 "${a.text}" 没有标签 "${tag}"`)
        continue
      }
      removeTagFn(id, tag)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'removeTag',
        targetIds: anchorIds,
        params: { tag },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量设置分类 */
  function batchSetCategory(
    anchors: Anchor[],
    anchorIds: string[],
    category: string,
    updateFn: (id: string, updates: Partial<Anchor>) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      updateFn(id, { category })
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'setCategory',
        targetIds: anchorIds,
        params: { category },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量放回锚点池 */
  function batchMoveToPool(
    anchors: Anchor[],
    anchorIds: string[],
    moveFn: (id: string) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if ((a.stage ?? 'active') === 'pool') {
        errors.push(`锚点 "${a.text}" 已在锚点池中`)
        continue
      }
      moveFn(id)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'moveToPool',
        targetIds: anchorIds,
        params: {},
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量安放 */
  function batchPlaceFromPool(
    anchors: Anchor[],
    anchorIds: string[],
    priority: Anchor['priority'] | undefined,
    placeFn: (id: string, priority?: Anchor['priority']) => void,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      if ((a.stage ?? 'active') !== 'pool') {
        errors.push(`锚点 "${a.text}" 不在锚点池中`)
        continue
      }
      placeFn(id, priority)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'placeFromPool',
        targetIds: anchorIds,
        params: { priority },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: true,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  /** 批量删除 */
  function batchDelete(
    anchors: Anchor[],
    anchorIds: string[],
    deleteFn: (id: string) => void,
    confirmMessage?: string,
  ): BatchOperationResult & { requiresConfirmation: boolean; confirmMessage: string } {
    const errors: string[] = []
    let successCount = 0
    const affectedAnchors: Anchor[] = []

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      affectedAnchors.push(a)
    }

    const msg = confirmMessage || `确定要删除 ${affectedAnchors.length} 个锚点吗？此操作不可撤销。`

    // 批量删除需要确认
    if (!confirmMessage) {
      return {
        success: false,
        operation: {
          id: generateId(),
          type: 'delete',
          targetIds: anchorIds,
          params: {},
          operatedAt: new Date().toISOString(),
          affectedCount: 0,
          reversible: false,
        },
        successCount: 0,
        failureCount: 0,
        errors: [],
        requiresConfirmation: true,
        confirmMessage: msg,
      }
    }

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      deleteFn(id)
      successCount++
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'delete',
        targetIds: anchorIds,
        params: {},
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: false,
      },
      successCount,
      failureCount: errors.length,
      errors,
      requiresConfirmation: false,
      confirmMessage: '',
    }
  }

  /** 批量复制 */
  function batchDuplicate(
    anchors: Anchor[],
    anchorIds: string[],
    addFn: (text: string, priority: Anchor['priority'], extra?: Partial<Anchor>) => Anchor,
    count: number = 1,
  ): BatchOperationResult {
    const errors: string[] = []
    let successCount = 0

    for (const id of anchorIds) {
      const a = anchors.find(a => a.id === id)
      if (!a) {
        errors.push(`锚点 ${id} 不存在`)
        continue
      }
      for (let i = 0; i < count; i++) {
        addFn(a.text, a.priority, {
          tags: a.tags ? [...a.tags] : undefined,
          category: a.category,
          dueTime: a.dueTime,
        })
        successCount++
      }
    }

    return {
      success: errors.length === 0,
      operation: {
        id: generateId(),
        type: 'duplicate',
        targetIds: anchorIds,
        params: { duplicateCount: count },
        operatedAt: new Date().toISOString(),
        affectedCount: successCount,
        reversible: false,
      },
      successCount,
      failureCount: errors.length,
      errors,
    }
  }

  // ---- 批量预览 ----
  function getBatchPreview(
    anchors: Anchor[],
    type: BatchOperationType,
    anchorIds: string[],
    params?: BatchOperationParams,
  ): BatchPreview {
    const affected = anchors.filter(a => anchorIds.includes(a.id))
    const texts = affected.map(a => a.text)

    let summary = ''
    switch (type) {
      case 'complete':
        summary = `将完成 ${affected.length} 个锚点`
        break
      case 'postpone':
        summary = `将推迟 ${affected.length} 个锚点`
        if (params?.targetDate) summary += ` 到 ${params.targetDate}`
        break
      case 'setPriority':
        summary = `将设置 ${affected.length} 个锚点的优先级为 ${params?.priority || '—'}`
        break
      case 'addTag':
        summary = `将为 ${affected.length} 个锚点添加标签 "${params?.tag || '—'}"`
        break
      case 'removeTag':
        summary = `将从 ${affected.length} 个锚点移除标签 "${params?.tag || '—'}"`
        break
      case 'setCategory':
        summary = `将设置 ${affected.length} 个锚点的分类为 "${params?.category || '—'}"`
        break
      case 'moveToPool':
        summary = `将 ${affected.length} 个锚点放回锚点池`
        break
      case 'placeFromPool':
        summary = `将安放 ${affected.length} 个锚点`
        if (params?.priority) summary += ` 为 ${params.priority}`
        break
      case 'delete':
        summary = `将删除 ${affected.length} 个锚点（不可撤销）`
        break
      case 'duplicate':
        summary = `将复制 ${affected.length} 个锚点`
        if (params?.duplicateCount && params.duplicateCount > 1) {
          summary += ` ${params.duplicateCount} 次`
        }
        break
    }

    return {
      type,
      affectedCount: affected.length,
      summary,
      affectedTexts: texts,
    }
  }

  // ---- 批量操作历史 ----
  const operationHistory = ref<BatchOperation[]>([])

  function recordOperation(operation: BatchOperation): void {
    operationHistory.value = [operation, ...operationHistory.value].slice(0, 50)
  }

  function getOperationHistory(): BatchOperation[] {
    return operationHistory.value
  }

  function clearHistory(): void {
    operationHistory.value = []
  }

  return {
    selection,
    clearSelection,
    toggleSelection,
    selectAll,
    invertSelection,
    getSelectedAnchors,
    getSelectionCount,
    applyFilter,
    batchComplete,
    batchPostpone,
    batchSetPriority,
    batchAddTag,
    batchRemoveTag,
    batchSetCategory,
    batchMoveToPool,
    batchPlaceFromPool,
    batchDelete,
    batchDuplicate,
    getBatchPreview,
    recordOperation,
    getOperationHistory,
    clearHistory,
  }
}

// ============================================================
// Vue 依赖
// ============================================================

import { ref } from 'vue'