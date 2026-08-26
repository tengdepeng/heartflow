// ============================================================
// 装修工坊 · 预览引擎
// 实时预览、撤销/重做、装修历史、批量操作、风格迁移
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { SpaceConfig, CustomDimension } from './types'
import { getSpaceConfigs, saveSpaceConfigs } from './engine'

// ============================================================
// 类型定义
// ============================================================

/** 预览状态 */
export interface PreviewState {
  /** 是否处于预览模式 */
  active: boolean
  /** 预览的目标配置 ID */
  configId: string | null
  /** 预览中的临时修改 */
  pendingChanges: Partial<SpaceConfig>
  /** 预览开始时间 */
  startedAt: string | null
}

/** 撤销/重做操作记录 */
export interface UndoEntry {
  /** 操作 ID */
  id: string
  /** 操作时间 */
  timestamp: string
  /** 操作描述 */
  description: string
  /** 操作前的配置快照 */
  before: SpaceConfig | null
  /** 操作后的配置快照 */
  after: SpaceConfig | null
  /** 操作类型 */
  type: 'create' | 'update' | 'delete' | 'batch' | 'style-migrate'
}

/** 装修历史记录 */
export interface RenovationRecord {
  /** 记录 ID */
  id: string
  /** 关联的配置 ID */
  configId: string
  /** 操作描述 */
  description: string
  /** 操作类型 */
  type: UndoEntry['type']
  /** 变更详情 */
  changes: string[]
  /** 操作时间 */
  timestamp: string
  /** 操作者（用户/系统） */
  operator: 'user' | 'system' | 'style-migration'
}

/** 批量操作 */
export interface BatchOperation {
  /** 操作 ID */
  id: string
  /** 操作类型 */
  type: 'update' | 'delete' | 'duplicate' | 'export' | 'import'
  /** 目标配置 ID 列表 */
  targetIds: string[]
  /** 操作参数 */
  params: Record<string, any>
  /** 操作状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back'
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failureCount: number
  /** 错误信息 */
  errors: { configId: string; message: string }[]
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt: string | null
}

/** 风格迁移配置 */
export interface StyleMigration {
  /** 迁移 ID */
  id: string
  /** 源配置 ID */
  sourceId: string
  /** 目标配置 ID 列表 */
  targetIds: string[]
  /** 要迁移的维度 */
  dimensions: CustomDimension[]
  /** 迁移策略 */
  strategy: 'overwrite' | 'merge' | 'preview'
  /** 是否创建备份 */
  createBackup: boolean
  /** 迁移状态 */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled-back'
  /** 迁移结果统计 */
  results: {
    success: number
    failed: number
    skipped: number
  }
  /** 错误详情 */
  errors: { configId: string; message: string }[]
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  completedAt: string | null
}

/** 装修预览配置 */
export interface PreviewConfig {
  /** 是否启用实时预览 */
  realtimePreview: boolean
  /** 预览延迟（毫秒），防抖用 */
  previewDelay: number
  /** 最大撤销步数 */
  maxUndoSteps: number
  /** 最大历史记录数 */
  maxHistoryRecords: number
  /** 是否自动保存预览 */
  autoSavePreview: boolean
  /** 是否启用过渡动画 */
  enableTransition: boolean
  /** 过渡动画时长（毫秒） */
  transitionDuration: number
}

// ============================================================
// 常量
// ============================================================

/** 默认预览配置 */
export const DEFAULT_PREVIEW_CONFIG: PreviewConfig = {
  realtimePreview: true,
  previewDelay: 300,
  maxUndoSteps: 50,
  maxHistoryRecords: 200,
  autoSavePreview: false,
  enableTransition: true,
  transitionDuration: 250,
}

/** 存储键 */
const UNDO_STACK_KEY = 'hf:customization:undo-stack'
const REDO_STACK_KEY = 'hf:customization:redo-stack'
const HISTORY_KEY = 'hf:customization:history'
const BATCH_OPS_KEY = 'hf:customization:batch-ops'
const STYLE_MIGRATIONS_KEY = 'hf:customization:style-migrations'
const PREVIEW_CONFIG_KEY = 'hf:customization:preview-config'

// ============================================================
// 装修预览引擎
// ============================================================

export function usePreviewEngine() {
  // ---- 状态 ----
  const previewState = ref<PreviewState>({
    active: false,
    configId: null,
    pendingChanges: {},
    startedAt: null,
  })

  const undoStack = ref<UndoEntry[]>(loadUndoStack())
  const redoStack = ref<UndoEntry[]>(loadRedoStack())
  const history = ref<RenovationRecord[]>(loadHistory())
  const batchOps = ref<BatchOperation[]>(loadBatchOps())
  const styleMigrations = ref<StyleMigration[]>(loadStyleMigrations())
  const previewConfig = ref<PreviewConfig>(loadPreviewConfig())

  /** 预览防抖计时器 */
  let previewTimer: ReturnType<typeof setTimeout> | null = null

  // ---- 持久化 ----

  function loadUndoStack(): UndoEntry[] {
    try { return JSON.parse(storage.getKV<string>(UNDO_STACK_KEY, '[]')) } catch { return [] }
  }
  function saveUndoStack() {
    storage.setKV(UNDO_STACK_KEY, JSON.stringify(undoStack.value))
  }

  function loadRedoStack(): UndoEntry[] {
    try { return JSON.parse(storage.getKV<string>(REDO_STACK_KEY, '[]')) } catch { return [] }
  }
  function saveRedoStack() {
    storage.setKV(REDO_STACK_KEY, JSON.stringify(redoStack.value))
  }

  function loadHistory(): RenovationRecord[] {
    try { return JSON.parse(storage.getKV<string>(HISTORY_KEY, '[]')) } catch { return [] }
  }
  function saveHistory() {
    storage.setKV(HISTORY_KEY, JSON.stringify(history.value))
  }

  function loadBatchOps(): BatchOperation[] {
    try { return JSON.parse(storage.getKV<string>(BATCH_OPS_KEY, '[]')) } catch { return [] }
  }
  function saveBatchOps() {
    storage.setKV(BATCH_OPS_KEY, JSON.stringify(batchOps.value))
  }

  function loadStyleMigrations(): StyleMigration[] {
    try { return JSON.parse(storage.getKV<string>(STYLE_MIGRATIONS_KEY, '[]')) } catch { return [] }
  }
  function saveStyleMigrations() {
    storage.setKV(STYLE_MIGRATIONS_KEY, JSON.stringify(styleMigrations.value))
  }

  function loadPreviewConfig(): PreviewConfig {
    try {
      const raw = storage.getKV<string>(PREVIEW_CONFIG_KEY, '')
      if (!raw) return { ...DEFAULT_PREVIEW_CONFIG }
      return { ...DEFAULT_PREVIEW_CONFIG, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_PREVIEW_CONFIG } }
  }
  function savePreviewConfig() {
    storage.setKV(PREVIEW_CONFIG_KEY, JSON.stringify(previewConfig.value))
  }

  // ---- 计算属性 ----

  /** 是否可撤销 */
  const canUndo = computed(() => undoStack.value.length > 0)

  /** 是否可重做 */
  const canRedo = computed(() => redoStack.value.length > 0)

  /** 撤销步数 */
  const undoCount = computed(() => undoStack.value.length)

  /** 重做步数 */
  const redoCount = computed(() => redoStack.value.length)

  /** 最近的历史记录 */
  const recentHistory = computed(() => history.value.slice(0, 20))

  /** 进行中的批量操作 */
  const activeBatchOps = computed(() =>
    batchOps.value.filter(b => b.status === 'pending' || b.status === 'running')
  )

  /** 进行中的风格迁移 */
  const activeMigrations = computed(() =>
    styleMigrations.value.filter(m => m.status === 'pending' || m.status === 'running')
  )

  // ---- 预览管理 ----

  /** 开始预览 */
  function startPreview(configId: string): void {
    const configs = getSpaceConfigs()
    const config = configs.find(c => c.id === configId)
    if (!config) return

    previewState.value = {
      active: true,
      configId,
      pendingChanges: {},
      startedAt: new Date().toISOString(),
    }
  }

  /** 更新预览（带防抖） */
  function updatePreview(changes: Partial<SpaceConfig>): void {
    if (!previewState.value.active) return

    previewState.value.pendingChanges = {
      ...previewState.value.pendingChanges,
      ...changes,
    }

    if (previewConfig.value.realtimePreview) {
      if (previewTimer) clearTimeout(previewTimer)
      previewTimer = setTimeout(() => {
        applyPendingChanges()
      }, previewConfig.value.previewDelay)
    }
  }

  /** 立即应用预览变更 */
  function applyPendingChanges(): void {
    if (!previewState.value.active || !previewState.value.configId) return
    // 预览变更通过 computed 属性在视图层实时反映
    // 实际持久化在 commitPreview 时进行
  }

  /** 提交预览（保存变更） */
  function commitPreview(description: string): SpaceConfig | null {
    if (!previewState.value.active || !previewState.value.configId) return null

    const configs = getSpaceConfigs()
    const config = configs.find(c => c.id === previewState.value.configId)
    if (!config) return null

    // 记录撤销快照
    const before = JSON.parse(JSON.stringify(config))
    const updated = {
      ...config,
      ...previewState.value.pendingChanges,
      updatedAt: new Date().toISOString(),
    }

    pushUndo({
      id: `undo_${Date.now()}`,
      timestamp: new Date().toISOString(),
      description,
      before,
      after: updated,
      type: 'update',
    })

    // 保存配置
    const idx = configs.findIndex(c => c.id === config.id)
    configs[idx] = updated
    saveSpaceConfigs(configs)

    // 记录历史
    addHistoryRecord(config.id, description, 'update', getChangeList(before, updated))

    // 重置预览状态
    resetPreview()
    return updated
  }

  /** 取消预览 */
  function cancelPreview(): void {
    resetPreview()
  }

  /** 重置预览状态 */
  function resetPreview(): void {
    if (previewTimer) {
      clearTimeout(previewTimer)
      previewTimer = null
    }
    previewState.value = {
      active: false,
      configId: null,
      pendingChanges: {},
      startedAt: null,
    }
  }

  /** 获取预览后的配置（合并 pendingChanges） */
  function getPreviewConfig(configId: string): SpaceConfig | null {
    const configs = getSpaceConfigs()
    const config = configs.find(c => c.id === configId)
    if (!config) return null
    if (previewState.value.active && previewState.value.configId === configId) {
      return { ...config, ...previewState.value.pendingChanges, updatedAt: new Date().toISOString() }
    }
    return config
  }

  // ---- 撤销/重做 ----

  /** 推入撤销栈 */
  function pushUndo(entry: UndoEntry): void {
    undoStack.value.push(entry)
    // 限制栈大小
    while (undoStack.value.length > previewConfig.value.maxUndoSteps) {
      undoStack.value.shift()
    }
    // 清空重做栈
    redoStack.value = []
    saveUndoStack()
    saveRedoStack()
  }

  /** 撤销 */
  function undo(): SpaceConfig | null {
    if (undoStack.value.length === 0) return null

    const entry = undoStack.value.pop()!
    saveUndoStack()

    if (!entry.before) return null

    // 推入重做栈
    redoStack.value.push({
      ...entry,
      id: `redo_${Date.now()}`,
      type: entry.type,
    })
    saveRedoStack()

    // 恢复配置
    const configs = getSpaceConfigs()
    const idx = configs.findIndex(c => c.id === entry.before!.id)
    if (idx === -1) {
      // 可能是被删除的配置，重建
      configs.push({ ...entry.before, updatedAt: new Date().toISOString() })
    } else {
      configs[idx] = { ...entry.before, updatedAt: new Date().toISOString() }
    }
    saveSpaceConfigs(configs)

    // 记录历史
    addHistoryRecord(entry.before.id, `撤销: ${entry.description}`, 'update', [`撤销操作: ${entry.description}`])

    return entry.before
  }

  /** 重做 */
  function redo(): SpaceConfig | null {
    if (redoStack.value.length === 0) return null

    const entry = redoStack.value.pop()!
    saveRedoStack()

    if (!entry.after) return null

    // 推入撤销栈
    undoStack.value.push({
      ...entry,
      id: `undo_${Date.now()}`,
      type: entry.type,
    })
    saveUndoStack()

    // 恢复配置
    const configs = getSpaceConfigs()
    const idx = configs.findIndex(c => c.id === entry.after!.id)
    if (idx === -1) {
      configs.push({ ...entry.after, updatedAt: new Date().toISOString() })
    } else {
      configs[idx] = { ...entry.after, updatedAt: new Date().toISOString() }
    }
    saveSpaceConfigs(configs)

    // 记录历史
    addHistoryRecord(entry.after.id, `重做: ${entry.description}`, 'update', [`重做操作: ${entry.description}`])

    return entry.after
  }

  /** 清空撤销/重做栈 */
  function clearUndoRedo(): void {
    undoStack.value = []
    redoStack.value = []
    saveUndoStack()
    saveRedoStack()
  }

  // ---- 装修历史 ----

  /** 添加历史记录 */
  function addHistoryRecord(
    configId: string,
    description: string,
    type: UndoEntry['type'],
    changes: string[],
    operator: 'user' | 'system' | 'style-migration' = 'user',
  ): void {
    history.value.unshift({
      id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      configId,
      description,
      type,
      changes,
      timestamp: new Date().toISOString(),
      operator,
    })

    // 限制历史记录数量
    while (history.value.length > previewConfig.value.maxHistoryRecords) {
      history.value.pop()
    }
    saveHistory()
  }

  /** 查询配置的历史记录 */
  function getConfigHistory(configId: string, limit = 50): RenovationRecord[] {
    return history.value.filter(h => h.configId === configId).slice(0, limit)
  }

  /** 按时间范围查询历史 */
  function getHistoryByDateRange(from: string, to: string): RenovationRecord[] {
    return history.value.filter(h => h.timestamp >= from && h.timestamp <= to)
  }

  /** 按操作类型查询历史 */
  function getHistoryByType(type: UndoEntry['type']): RenovationRecord[] {
    return history.value.filter(h => h.type === type)
  }

  /** 清除历史记录 */
  function clearHistory(configId?: string): number {
    if (configId) {
      const before = history.value.length
      history.value = history.value.filter(h => h.configId !== configId)
      saveHistory()
      return before - history.value.length
    }
    const count = history.value.length
    history.value = []
    saveHistory()
    return count
  }

  // ---- 批量操作 ----

  /** 创建批量操作 */
  function createBatchOperation(
    type: BatchOperation['type'],
    targetIds: string[],
    params: Record<string, any> = {},
  ): BatchOperation {
    const op: BatchOperation = {
      id: `batch_${Date.now()}`,
      type,
      targetIds,
      params,
      status: 'pending',
      successCount: 0,
      failureCount: 0,
      errors: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    batchOps.value.push(op)
    saveBatchOps()
    return op
  }

  /** 执行批量操作 */
  function executeBatchOperation(opId: string): BatchOperation | null {
    const op = batchOps.value.find(b => b.id === opId)
    if (!op) return null

    op.status = 'running'
    saveBatchOps()

    const configs = getSpaceConfigs()

    for (const targetId of op.targetIds) {
      try {
        const config = configs.find(c => c.id === targetId)
        if (!config) {
          op.failureCount++
          op.errors.push({ configId: targetId, message: '配置不存在' })
          continue
        }

        switch (op.type) {
          case 'update': {
            const before = JSON.parse(JSON.stringify(config))
            const updated = { ...config, ...op.params, updatedAt: new Date().toISOString() }
            const idx = configs.findIndex(c => c.id === targetId)
            configs[idx] = updated
            pushUndo({
              id: `undo_batch_${Date.now()}`,
              timestamp: new Date().toISOString(),
              description: `批量更新: ${op.id}`,
              before,
              after: updated,
              type: 'batch',
            })
            op.successCount++
            break
          }
          case 'delete': {
            const idx = configs.findIndex(c => c.id === targetId)
            if (idx !== -1) {
              const deleted = configs[idx]
              pushUndo({
                id: `undo_batch_${Date.now()}`,
                timestamp: new Date().toISOString(),
                description: `批量删除: ${op.id}`,
                before: deleted,
                after: null,
                type: 'batch',
              })
              configs.splice(idx, 1)
              op.successCount++
            }
            break
          }
          case 'duplicate': {
            const suffix = op.params.suffix ?? ' (副本)'
            const duplicate = {
              ...config,
              id: `space_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              name: `${config.name}${suffix}`,
              presetId: config.presetId,
              dimensions: JSON.parse(JSON.stringify(config.dimensions)),
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
            configs.push(duplicate)
            op.successCount++
            break
          }
          case 'export': {
            // 导出到 JSON 字符串存储在 params 中
            op.params.exports = op.params.exports ?? {}
            op.params.exports[targetId] = JSON.stringify(config)
            op.successCount++
            break
          }
          case 'import': {
            if (op.params.imports?.[targetId]) {
              try {
                const imported = JSON.parse(op.params.imports[targetId])
                const existing = configs.find(c => c.id === targetId)
                if (existing) {
                  const idx = configs.indexOf(existing)
                  configs[idx] = { ...imported, id: targetId, updatedAt: new Date().toISOString() }
                } else {
                  configs.push({ ...imported, id: targetId, updatedAt: new Date().toISOString() })
                }
                op.successCount++
              } catch {
                op.failureCount++
                op.errors.push({ configId: targetId, message: '导入数据解析失败' })
              }
            }
            break
          }
        }
      } catch (e: any) {
        op.failureCount++
        op.errors.push({ configId: targetId, message: e?.message ?? '未知错误' })
      }
    }

    saveSpaceConfigs(configs)
    op.status = op.failureCount > 0 ? 'completed' : 'completed'
    op.completedAt = new Date().toISOString()
    saveBatchOps()

    // 记录历史
    addHistoryRecord(
      op.targetIds[0] ?? 'batch',
      `批量${getBatchTypeLabel(op.type)}: ${op.targetIds.length} 项配置`,
      'batch',
      [`成功: ${op.successCount}, 失败: ${op.failureCount}`],
    )

    return op
  }

  /** 回滚批量操作 */
  function rollbackBatchOperation(opId: string): boolean {
    const op = batchOps.value.find(b => b.id === opId)
    if (!op || op.status === 'rolled-back') return false

    // 通过撤销栈回滚
    let rollbackCount = 0
    while (undoStack.value.length > 0 && rollbackCount < op.targetIds.length) {
      undo()
      rollbackCount++
    }

    op.status = 'rolled-back'
    saveBatchOps()
    return true
  }

  /** 获取批量操作 */
  function getBatchOperation(opId: string): BatchOperation | undefined {
    return batchOps.value.find(b => b.id === opId)
  }

  /** 清除已完成的批量操作 */
  function clearCompletedBatchOps(): number {
    const before = batchOps.value.length
    batchOps.value = batchOps.value.filter(
      b => b.status !== 'completed' && b.status !== 'failed' && b.status !== 'rolled-back'
    )
    saveBatchOps()
    return before - batchOps.value.length
  }

  // ---- 风格迁移 ----

  /** 创建风格迁移 */
  function createStyleMigration(
    sourceId: string,
    targetIds: string[],
    dimensions: CustomDimension[],
    strategy: StyleMigration['strategy'] = 'preview',
    createBackup = true,
  ): StyleMigration {
    const migration: StyleMigration = {
      id: `migrate_${Date.now()}`,
      sourceId,
      targetIds,
      dimensions,
      strategy,
      createBackup,
      status: 'pending',
      results: { success: 0, failed: 0, skipped: 0 },
      errors: [],
      createdAt: new Date().toISOString(),
      completedAt: null,
    }
    styleMigrations.value.push(migration)
    saveStyleMigrations()
    return migration
  }

  /** 执行风格迁移 */
  function executeStyleMigration(migrationId: string): StyleMigration | null {
    const migration = styleMigrations.value.find(m => m.id === migrationId)
    if (!migration) return null

    migration.status = 'running'
    saveStyleMigrations()

    const configs = getSpaceConfigs()
    const sourceConfig = configs.find(c => c.id === migration.sourceId)
    if (!sourceConfig) {
      migration.status = 'failed'
      migration.errors.push({ configId: migration.sourceId, message: '源配置不存在' })
      saveStyleMigrations()
      return migration
    }

    for (const targetId of migration.targetIds) {
      try {
        const targetConfig = configs.find(c => c.id === targetId)
        if (!targetConfig) {
          migration.results.failed++
          migration.errors.push({ configId: targetId, message: '目标配置不存在' })
          continue
        }

        // 创建备份
        if (migration.createBackup) {
          pushUndo({
            id: `undo_migrate_${Date.now()}`,
            timestamp: new Date().toISOString(),
            description: `风格迁移前备份: ${targetConfig.name}`,
            before: JSON.parse(JSON.stringify(targetConfig)),
            after: null,
            type: 'style-migrate',
          })
        }

        // 迁移维度
        const sourceDimensions = sourceConfig.dimensions.filter(d =>
          migration.dimensions.includes(d.dimension)
        )

        const targetDimensions = [...targetConfig.dimensions]
        for (const sourceDim of sourceDimensions) {
          const existingIdx = targetDimensions.findIndex(
            d => d.dimension === sourceDim.dimension
          )
          if (existingIdx === -1) {
            targetDimensions.push(JSON.parse(JSON.stringify(sourceDim)))
          } else if (migration.strategy === 'overwrite') {
            targetDimensions[existingIdx] = JSON.parse(JSON.stringify(sourceDim))
          } else if (migration.strategy === 'merge') {
            targetDimensions[existingIdx] = {
              ...targetDimensions[existingIdx],
              options: {
                ...targetDimensions[existingIdx].options,
                ...sourceDim.options,
              },
            }
          }
          // 'preview' 策略下跳过已存在的维度
        }

        const idx = configs.findIndex(c => c.id === targetId)
        configs[idx] = {
          ...targetConfig,
          dimensions: targetDimensions,
          updatedAt: new Date().toISOString(),
        }

        migration.results.success++
      } catch (e: any) {
        migration.results.failed++
        migration.errors.push({
          configId: targetId,
          message: e?.message ?? '迁移失败',
        })
      }
    }

    saveSpaceConfigs(configs)
    migration.status = migration.results.failed > 0 ? 'completed' : 'completed'
    migration.completedAt = new Date().toISOString()
    saveStyleMigrations()

    // 记录历史
    addHistoryRecord(
      migration.sourceId,
      `风格迁移: ${migration.targetIds.length} 个目标`,
      'style-migrate',
      [
        `维度: ${migration.dimensions.join(', ')}`,
        `策略: ${migration.strategy}`,
        `成功: ${migration.results.success}, 失败: ${migration.results.failed}`,
      ],
      'style-migration',
    )

    return migration
  }

  /** 回滚风格迁移 */
  function rollbackStyleMigration(migrationId: string): boolean {
    const migration = styleMigrations.value.find(m => m.id === migrationId)
    if (!migration || migration.status === 'rolled-back') return false

    // 通过撤销栈回滚
    let rollbackCount = 0
    while (undoStack.value.length > 0 && rollbackCount < migration.targetIds.length) {
      const entry = undoStack.value[undoStack.value.length - 1]
      if (entry.type === 'style-migrate') {
        undo()
        rollbackCount++
      } else {
        break
      }
    }

    migration.status = 'rolled-back'
    saveStyleMigrations()
    return true
  }

  /** 获取风格迁移 */
  function getStyleMigration(migrationId: string): StyleMigration | undefined {
    return styleMigrations.value.find(m => m.id === migrationId)
  }

  /** 预览风格迁移效果 */
  function previewMigration(
    sourceId: string,
    targetId: string,
    dimensions: CustomDimension[],
  ): Partial<SpaceConfig> | null {
    const configs = getSpaceConfigs()
    const source = configs.find(c => c.id === sourceId)
    const target = configs.find(c => c.id === targetId)
    if (!source || !target) return null

    const sourceDimensions = source.dimensions.filter(d => dimensions.includes(d.dimension))
    const preview = { ...target, dimensions: [...target.dimensions] }

    for (const sourceDim of sourceDimensions) {
      const existingIdx = preview.dimensions.findIndex(d => d.dimension === sourceDim.dimension)
      if (existingIdx === -1) {
        preview.dimensions.push(JSON.parse(JSON.stringify(sourceDim)))
      } else {
        preview.dimensions[existingIdx] = JSON.parse(JSON.stringify(sourceDim))
      }
    }

    return preview
  }

  // ---- 预览配置管理 ----

  /** 更新预览配置 */
  function updatePreviewConfig(partial: Partial<PreviewConfig>): void {
    previewConfig.value = { ...previewConfig.value, ...partial }
    savePreviewConfig()
  }

  /** 重置预览配置为默认值 */
  function resetPreviewConfig(): void {
    previewConfig.value = { ...DEFAULT_PREVIEW_CONFIG }
    savePreviewConfig()
  }

  // ---- 辅助函数 ----

  /** 获取变更列表 */
  function getChangeList(before: SpaceConfig, after: SpaceConfig): string[] {
    const changes: string[] = []
    if (before.name !== after.name) changes.push(`名称: ${before.name} → ${after.name}`)
    if (before.description !== after.description) changes.push(`描述已更新`)
    if (before.presetId !== after.presetId) changes.push(`预设已变更`)

    const beforeDims = new Set(before.dimensions.map(d => d.dimension))
    const afterDims = new Set(after.dimensions.map(d => d.dimension))

    const added = [...afterDims].filter(d => !beforeDims.has(d))
    const removed = [...beforeDims].filter(d => !afterDims.has(d))
    const modified = [...beforeDims].filter(d => {
      if (!afterDims.has(d)) return false
      const b = before.dimensions.find(dd => dd.dimension === d)
      const a = after.dimensions.find(dd => dd.dimension === d)
      return JSON.stringify(b?.options) !== JSON.stringify(a?.options)
    })

    if (added.length) changes.push(`新增维度: ${added.join(', ')}`)
    if (removed.length) changes.push(`移除维度: ${removed.join(', ')}`)
    if (modified.length) changes.push(`修改维度: ${modified.join(', ')}`)

    return changes.length > 0 ? changes : ['无显著变更']
  }

  /** 获取批量操作类型标签 */
  function getBatchTypeLabel(type: BatchOperation['type']): string {
    const labels: Record<BatchOperation['type'], string> = {
      update: '更新',
      delete: '删除',
      duplicate: '复制',
      export: '导出',
      import: '导入',
    }
    return labels[type] ?? type
  }

  // ---- 清理 ----

  /** 销毁引擎，清理资源 */
  function destroy(): void {
    if (previewTimer) clearTimeout(previewTimer)
    resetPreview()
  }

  return {
    // 状态
    previewState,
    undoStack,
    redoStack,
    history,
    batchOps,
    styleMigrations,
    previewConfig,

    // 计算属性
    canUndo,
    canRedo,
    undoCount,
    redoCount,
    recentHistory,
    activeBatchOps,
    activeMigrations,

    // 预览
    startPreview,
    updatePreview,
    applyPendingChanges,
    commitPreview,
    cancelPreview,
    getPreviewConfig,

    // 撤销/重做
    pushUndo,
    undo,
    redo,
    clearUndoRedo,

    // 历史
    addHistoryRecord,
    getConfigHistory,
    getHistoryByDateRange,
    getHistoryByType,
    clearHistory,

    // 批量操作
    createBatchOperation,
    executeBatchOperation,
    rollbackBatchOperation,
    getBatchOperation,
    clearCompletedBatchOps,

    // 风格迁移
    createStyleMigration,
    executeStyleMigration,
    rollbackStyleMigration,
    getStyleMigration,
    previewMigration,

    // 配置
    updatePreviewConfig,
    resetPreviewConfig,

    // 清理
    destroy,
  }
}

