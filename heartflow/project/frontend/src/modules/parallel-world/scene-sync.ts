// ============================================================
// 平行世界 · 场景同步引擎（P16-11）
// 跨分支状态同步、推送/拉取、冲突检测、同步审计
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type { WorldBranch, Checkpoint } from './types'

// ---- 同步目标 ----

export type SyncTarget = 'checkpoints' | 'tags' | 'metadata' | 'snapshots' | 'all'

export type SyncDirection = 'push' | 'pull' | 'bidirectional'

export type SyncStrategy = 'auto' | 'manual' | 'merge'

export type SyncConflictType = 'version' | 'label' | 'tag' | 'data' | 'timestamp'

export type SyncResolution = 'keep-source' | 'keep-target' | 'skip' | 'merge'

// ---- 同步冲突 ----

export interface SyncConflict {
  id: string
  /** 冲突类型 */
  type: SyncConflictType
  /** 源分支数据 */
  sourceData: Record<string, unknown>
  /** 目标分支数据 */
  targetData: Record<string, unknown>
  /** 冲突描述 */
  description: string
  /** 建议方案 */
  suggestedResolution: SyncResolution
  /** 已选方案 */
  resolution?: SyncResolution
  /** 是否已解决 */
  resolved: boolean
}

// ---- 同步事件 ----

export interface SyncEvent {
  id: string
  /** 源分支 ID */
  sourceBranchId: string
  /** 目标分支 ID */
  targetBranchId: string
  /** 同步方向 */
  direction: SyncDirection
  /** 同步目标 */
  targets: SyncTarget[]
  /** 同步策略 */
  strategy: SyncStrategy
  /** 同步的检查点数量 */
  syncedCheckpointCount: number
  /** 新增数量 */
  addedCount: number
  /** 更新数量 */
  updatedCount: number
  /** 跳过数量 */
  skippedCount: number
  /** 冲突数量 */
  conflictCount: number
  /** 已解决冲突数 */
  resolvedConflictCount: number
  /** 同步状态 */
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  /** 开始时间 */
  startedAt: string
  /** 完成时间 */
  completedAt?: string
  /** 备注 */
  notes?: string
}

// ---- 同步配置 ----

export interface SyncConfig {
  /** 默认同步策略 */
  defaultStrategy: SyncStrategy
  /** 自动同步的目标 */
  autoSyncTargets: SyncTarget[]
  /** 是否启用冲突自动解决 */
  autoResolveConflicts: boolean
  /** 最大同步历史保留数 */
  maxHistorySize: number
  /** 是否启用同步通知 */
  enableNotifications: boolean
  /** 同步超时时间（毫秒） */
  syncTimeout: number
}

// ---- 默认配置 ----

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  defaultStrategy: 'manual',
  autoSyncTargets: ['tags'],
  autoResolveConflicts: false,
  maxHistorySize: 100,
  enableNotifications: false,
  syncTimeout: 30000,
}

// ---- 存储键 ----

const SCENE_SYNC_STORAGE_KEYS = {
  CONFIG: 'hf:parallel-world:sync-config',
  HISTORY: 'hf:parallel-world:sync-history',
} as const

// ============================================================
// useSceneSync — 场景同步引擎
// ============================================================

export function useSceneSync(
  _getBranches: () => WorldBranch[],
  _getCheckpoints: () => Checkpoint[],
  getBranchCheckpoints: (branchId: string) => Checkpoint[],
  onCreateCheckpoint: (branchId: string, label: string, description?: string, snapshot?: Record<string, unknown>, tags?: string[]) => Checkpoint,
  onUpdateCheckpoint?: (checkpointId: string, updates: Partial<Checkpoint>) => Checkpoint | undefined,
) {
  const config = ref<SyncConfig>(loadConfig())
  const history = ref<SyncEvent[]>(loadHistory())
  const currentSync = ref<SyncEvent | null>(null)
  const conflicts = ref<SyncConflict[]>([])

  // ---- 持久化 ----

  function loadConfig(): SyncConfig {
    try {
      const raw = storage.getKV<string>(SCENE_SYNC_STORAGE_KEYS.CONFIG, '')
      if (!raw) return { ...DEFAULT_SYNC_CONFIG }
      return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(raw) }
    } catch { return { ...DEFAULT_SYNC_CONFIG } }
  }

  function saveConfig(): void {
    storage.setKV(SCENE_SYNC_STORAGE_KEYS.CONFIG, JSON.stringify(config.value))
  }

  function loadHistory(): SyncEvent[] {
    try {
      const raw = storage.getKV<string>(SCENE_SYNC_STORAGE_KEYS.HISTORY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveHistory(): void {
    const trimmed = history.value.slice(-config.value.maxHistorySize)
    storage.setKV(SCENE_SYNC_STORAGE_KEYS.HISTORY, JSON.stringify(trimmed))
  }

  // ---- 同步预览 ----

  /** 预览同步操作，返回将要同步的检查点列表和冲突 */
  function previewSync(
    sourceBranchId: string,
    targetBranchId: string,
    targets: SyncTarget[] = ['all'],
  ): {
    sourceCheckpoints: Checkpoint[]
    targetCheckpoints: Checkpoint[]
    newCheckpoints: Checkpoint[]
    updatedCheckpoints: Array<{ source: Checkpoint; target: Checkpoint }>
    conflicts: SyncConflict[]
    estimatedChanges: number
  } {
    const sourceCheckpoints = getBranchCheckpoints(sourceBranchId)
    const targetCheckpoints = getBranchCheckpoints(targetBranchId)

    const targetMap = new Map(targetCheckpoints.map(c => [c.id, c]))
    const newCheckpoints: Checkpoint[] = []
    const updatedCheckpoints: Array<{ source: Checkpoint; target: Checkpoint }> = []
    const detectedConflicts: SyncConflict[] = []

    for (const sc of sourceCheckpoints) {
      const tc = targetMap.get(sc.id)

      if (!tc) {
        // 新检查点，可以直接添加
        newCheckpoints.push(sc)
      } else {
        // 已存在，检查是否有差异
        const hasChanges = detectChanges(sc, tc, targets)
        if (hasChanges) {
          const conflict = buildConflict(sc, tc, targets)
          if (conflict) {
            detectedConflicts.push(conflict)
          }
          updatedCheckpoints.push({ source: sc, target: tc })
        }
      }
    }

    return {
      sourceCheckpoints,
      targetCheckpoints,
      newCheckpoints,
      updatedCheckpoints,
      conflicts: detectedConflicts,
      estimatedChanges: newCheckpoints.length + updatedCheckpoints.length,
    }
  }

  /** 检测变化 */
  function detectChanges(
    source: Checkpoint,
    target: Checkpoint,
    targets: SyncTarget[],
  ): boolean {
    if (targets.includes('all') || targets.includes('checkpoints')) {
      if (JSON.stringify(source.snapshot) !== JSON.stringify(target.snapshot)) return true
    }
    if (targets.includes('all') || targets.includes('tags')) {
      const sourceTags = [...source.tags].sort().join(',')
      const targetTags = [...target.tags].sort().join(',')
      if (sourceTags !== targetTags) return true
    }
    if (targets.includes('all') || targets.includes('metadata')) {
      if (source.label !== target.label) return true
      if (source.description !== target.description) return true
    }
    if (targets.includes('all') || targets.includes('snapshots')) {
      // 排除 branchId 和 createdAt，它们属于元数据而非快照内容
      const { branchId: _sb, createdAt: _sc, ...sourceSnapshot } = source as Checkpoint & { branchId: string }
      const { branchId: _tb, createdAt: _tc, ...targetSnapshot } = target as Checkpoint & { branchId: string }
      if (JSON.stringify(sourceSnapshot) !== JSON.stringify(targetSnapshot)) return true
    }
    return false
  }

  /** 构建冲突描述 */
  function buildConflict(
    source: Checkpoint,
    target: Checkpoint,
    targets: SyncTarget[],
  ): SyncConflict | null {
    const sourceData: Record<string, unknown> = {}
    const targetData: Record<string, unknown> = {}
    const descriptions: string[] = []

    if (targets.includes('all') || targets.includes('checkpoints')) {
      if (JSON.stringify(source.snapshot) !== JSON.stringify(target.snapshot)) {
        sourceData.snapshot = source.snapshot
        targetData.snapshot = target.snapshot
        descriptions.push('快照数据冲突')
      }
    }
    if (targets.includes('all') || targets.includes('tags')) {
      const sourceTags = [...source.tags].sort().join(',')
      const targetTags = [...target.tags].sort().join(',')
      if (sourceTags !== targetTags) {
        sourceData.tags = source.tags
        targetData.tags = target.tags
        descriptions.push('标签冲突')
      }
    }
    if (targets.includes('all') || targets.includes('metadata')) {
      if (source.label !== target.label) {
        sourceData.label = source.label
        targetData.label = target.label
        descriptions.push('标签名称冲突')
      }
    }

    if (descriptions.length === 0) return null

    return {
      id: `sync-conflict-${source.id}-${target.id}`,
      type: 'data',
      sourceData,
      targetData,
      description: descriptions.join('；'),
      suggestedResolution: 'merge',
      resolved: false,
    }
  }

  // ---- 同步执行 ----

  /** 执行推送同步 */
  async function pushSync(
    sourceBranchId: string,
    targetBranchId: string,
    targets: SyncTarget[] = ['all'],
    strategy?: SyncStrategy,
  ): Promise<SyncEvent> {
    const syncStrategy = strategy || config.value.defaultStrategy
    const event = createSyncEvent(sourceBranchId, targetBranchId, 'push', targets, syncStrategy)
    currentSync.value = event
    history.value.push(event)

    try {
      const preview = previewSync(sourceBranchId, targetBranchId, targets)

      // 存储冲突
      conflicts.value = preview.conflicts

      if (syncStrategy === 'manual' && preview.conflicts.length > 0) {
        event.status = 'pending'
        event.conflictCount = preview.conflicts.length
        event.notes = `检测到 ${preview.conflicts.length} 个冲突，需要手动解决`
        saveHistory()
        return event
      }

      // 自动或合并策略
      if (syncStrategy === 'auto' && preview.conflicts.length > 0) {
        if (!config.value.autoResolveConflicts) {
          event.status = 'pending'
          event.conflictCount = preview.conflicts.length
          event.notes = `检测到 ${preview.conflicts.length} 个冲突，自动解决被禁用`
          saveHistory()
          return event
        }
        // 自动解决：使用源数据覆盖
        for (const c of preview.conflicts) {
          c.resolution = 'keep-source'
          c.resolved = true
        }
      }

      if (syncStrategy === 'merge' && preview.conflicts.length > 0) {
        // 合并策略：尝试自动合并，无法合并的标记为手动
        for (const c of preview.conflicts) {
          if (c.suggestedResolution === 'merge') {
            c.resolution = 'merge'
            c.resolved = true
          } else {
            c.resolved = false
          }
        }
        const unresolved = preview.conflicts.filter(c => !c.resolved)
        if (unresolved.length > 0) {
          event.status = 'pending'
          event.conflictCount = preview.conflicts.length
          event.resolvedConflictCount = preview.conflicts.filter(c => c.resolved).length
          event.notes = `合并策略：${unresolved.length} 个冲突需要手动解决`
          saveHistory()
          return event
        }
      }

      // 执行同步
      let addedCount = 0
      let updatedCount = 0
      let skippedCount = 0

      for (const nc of preview.newCheckpoints) {
        const created = onCreateCheckpoint(
          targetBranchId,
          nc.label,
          nc.description,
          nc.snapshot,
          nc.tags,
        )
        if (created) {
          // 更新新创建的检查点以匹配源数据
          if (onUpdateCheckpoint) {
            onUpdateCheckpoint(created.id, {
              label: nc.label,
              description: nc.description,
              snapshot: nc.snapshot,
              tags: nc.tags,
            })
          }
          addedCount++
        } else {
          skippedCount++
        }
      }

      for (const { source, target } of preview.updatedCheckpoints) {
        const conflict = preview.conflicts.find(
          c => c.id === `sync-conflict-${source.id}-${target.id}`,
        )
        if (conflict && !conflict.resolved) {
          skippedCount++
          continue
        }
        if (onUpdateCheckpoint) {
          onUpdateCheckpoint(target.id, {
            label: source.label,
            description: source.description,
            snapshot: source.snapshot,
            tags: [...source.tags],
          })
          updatedCount++
        } else {
          skippedCount++
        }
      }

      event.syncedCheckpointCount = addedCount + updatedCount
      event.addedCount = addedCount
      event.updatedCount = updatedCount
      event.skippedCount = skippedCount
      event.conflictCount = preview.conflicts.length
      event.resolvedConflictCount = preview.conflicts.filter(c => c.resolved).length
      event.status = 'completed'
      event.completedAt = new Date().toISOString()
      event.notes = `同步完成：新增 ${addedCount}，更新 ${updatedCount}，跳过 ${skippedCount}`
    } catch (err) {
      event.status = 'failed'
      event.notes = `同步失败：${err instanceof Error ? err.message : String(err)}`
    }

    currentSync.value = null
    saveHistory()
    return event
  }

  /** 执行拉取同步 */
  async function pullSync(
    targetBranchId: string,
    sourceBranchId: string,
    targets: SyncTarget[] = ['all'],
    strategy?: SyncStrategy,
  ): Promise<SyncEvent> {
    return pushSync(sourceBranchId, targetBranchId, targets, strategy)
  }

  /** 双向同步 */
  async function bidirectionalSync(
    branchAId: string,
    branchBId: string,
    targets: SyncTarget[] = ['all'],
    strategy?: SyncStrategy,
  ): Promise<{ aToB: SyncEvent; bToA: SyncEvent }> {
    const aToB = await pushSync(branchAId, branchBId, targets, strategy)
    const bToA = await pushSync(branchBId, branchAId, targets, strategy)
    return { aToB, bToA }
  }

  // ---- 同步事件管理 ----

  function createSyncEvent(
    sourceBranchId: string,
    targetBranchId: string,
    direction: SyncDirection,
    targets: SyncTarget[],
    strategy: SyncStrategy,
  ): SyncEvent {
    return {
      id: `sync-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      sourceBranchId,
      targetBranchId,
      direction,
      targets,
      strategy,
      syncedCheckpointCount: 0,
      addedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
      conflictCount: 0,
      resolvedConflictCount: 0,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }
  }

  /** 解决冲突 */
  function resolveConflict(conflictId: string, resolution: SyncResolution): SyncConflict | undefined {
    const conflict = conflicts.value.find(c => c.id === conflictId)
    if (!conflict) return undefined
    conflict.resolution = resolution
    conflict.resolved = true
    return conflict
  }

  /** 取消当前同步 */
  function cancelSync(): void {
    if (currentSync.value) {
      currentSync.value.status = 'cancelled'
      currentSync.value.completedAt = new Date().toISOString()
      currentSync.value.notes = '用户取消'
      saveHistory()
      currentSync.value = null
    }
  }

  /** 继续执行待处理的同步 */
  async function resumeSync(): Promise<SyncEvent | null> {
    if (!currentSync.value || currentSync.value.status !== 'pending') return null

    const unresolved = conflicts.value.filter(c => !c.resolved)
    if (unresolved.length > 0) {
      currentSync.value.notes = `仍有 ${unresolved.length} 个未解决的冲突`
      return currentSync.value
    }

    // 重新执行（此时冲突已解决）
    return pushSync(
      currentSync.value.sourceBranchId,
      currentSync.value.targetBranchId,
      currentSync.value.targets,
      currentSync.value.strategy,
    )
  }

  // ---- 同步历史 ----

  /** 获取分支间同步历史 */
  function getSyncHistoryForBranch(branchId: string): SyncEvent[] {
    return history.value.filter(
      e => e.sourceBranchId === branchId || e.targetBranchId === branchId,
    )
  }

  /** 获取两个分支间的同步历史 */
  function getSyncHistoryBetweenBranches(branchAId: string, branchBId: string): SyncEvent[] {
    return history.value.filter(
      e =>
        (e.sourceBranchId === branchAId && e.targetBranchId === branchBId) ||
        (e.sourceBranchId === branchBId && e.targetBranchId === branchAId),
    )
  }

  /** 获取最近同步事件 */
  const recentSyncs = computed(() =>
    history.value.slice(-10).reverse(),
  )

  // ---- 同步统计 ----

  function getSyncStats(): {
    totalSyncs: number
    completedSyncs: number
    failedSyncs: number
    pendingSyncs: number
    totalAdded: number
    totalUpdated: number
    totalConflicts: number
    averageSyncTime: number
  } {
    const completed = history.value.filter(e => e.status === 'completed')
    const failed = history.value.filter(e => e.status === 'failed')
    const pending = history.value.filter(e => e.status === 'pending')

    const totalAdded = history.value.reduce((sum, e) => sum + e.addedCount, 0)
    const totalUpdated = history.value.reduce((sum, e) => sum + e.updatedCount, 0)
    const totalConflicts = history.value.reduce((sum, e) => sum + e.conflictCount, 0)

    let averageSyncTime = 0
    const completedWithTime = completed.filter(e => e.completedAt)
    if (completedWithTime.length > 0) {
      const totalTime = completedWithTime.reduce((sum, e) => {
        const start = new Date(e.startedAt).getTime()
        const end = new Date(e.completedAt!).getTime()
        return sum + (end - start)
      }, 0)
      averageSyncTime = Math.round(totalTime / completedWithTime.length)
    }

    return {
      totalSyncs: history.value.length,
      completedSyncs: completed.length,
      failedSyncs: failed.length,
      pendingSyncs: pending.length,
      totalAdded,
      totalUpdated,
      totalConflicts,
      averageSyncTime,
    }
  }

  // ---- 配置管理 ----

  function updateConfig(updates: Partial<SyncConfig>): void {
    config.value = { ...config.value, ...updates }
    saveConfig()
  }

  function resetConfig(): void {
    config.value = { ...DEFAULT_SYNC_CONFIG }
    saveConfig()
  }

  /** 清除同步历史 */
  function clearHistory(): void {
    history.value = []
    saveHistory()
  }

  // ---- 分支同步状态 ----

  /** 计算分支间的同步差异 */
  function getSyncDiff(
    branchAId: string,
    branchBId: string,
  ): {
    aOnly: Checkpoint[]
    bOnly: Checkpoint[]
    common: Array<{ a: Checkpoint; b: Checkpoint; diverged: boolean }>
    divergenceRate: number
  } {
    const aCheckpoints = getBranchCheckpoints(branchAId)
    const bCheckpoints = getBranchCheckpoints(branchBId)

    const bMap = new Map(bCheckpoints.map(c => [c.id, c]))
    const aOnly: Checkpoint[] = []
    const common: Array<{ a: Checkpoint; b: Checkpoint; diverged: boolean }> = []

    for (const ac of aCheckpoints) {
      const bc = bMap.get(ac.id)
      if (!bc) {
        aOnly.push(ac)
      } else {
        common.push({
          a: ac,
          b: bc,
          diverged: detectChanges(ac, bc, ['all']),
        })
        bMap.delete(ac.id)
      }
    }

    const bOnly = [...bMap.values()]
    const total = aCheckpoints.length + bCheckpoints.length - common.length
    const divergenceRate = total > 0
      ? Math.round((aOnly.length + bOnly.length + common.filter(c => c.diverged).length) / total * 100)
      : 0

    return { aOnly, bOnly, common, divergenceRate }
  }

  return {
    // 状态
    config,
    history,
    currentSync,
    conflicts,
    recentSyncs,
    // 同步
    previewSync,
    pushSync,
    pullSync,
    bidirectionalSync,
    resolveConflict,
    cancelSync,
    resumeSync,
    // 差异
    getSyncDiff,
    // 历史
    getSyncHistoryForBranch,
    getSyncHistoryBetweenBranches,
    getSyncStats,
    // 配置
    updateConfig,
    resetConfig,
    clearHistory,
    // 常量
    SCENE_SYNC_STORAGE_KEYS,
    DEFAULT_SYNC_CONFIG,
  }
}