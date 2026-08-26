// ============================================================
// 平行世界 · 世界融合引擎（P15-5）
// 分支合并、冲突解决、遗产继承、世界快照、回滚
// ============================================================

import { ref, computed } from 'vue'
import type { WorldBranch, Checkpoint, WorldSnapshot } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 合并策略 */
export type MergeStrategy = 'fast-forward' | 'three-way' | 'squash' | 'rebase'

/** 冲突类型 */
export type ConflictType = 'data' | 'label' | 'tag' | 'metadata' | 'timeline'

/** 冲突严重级别 */
export type ConflictSeverity = 'info' | 'warning' | 'critical'

/** 冲突项 */
export interface MergeConflict {
  id: string
  /** 冲突类型 */
  type: ConflictType
  /** 严重级别 */
  severity: ConflictSeverity
  /** 源分支的检查点 ID */
  sourceCheckpointId: string
  /** 目标分支的检查点 ID */
  targetCheckpointId: string
  /** 冲突描述 */
  description: string
  /** 源数据 */
  sourceData: Record<string, unknown>
  /** 目标数据 */
  targetData: Record<string, unknown>
  /** 建议的解决方案 */
  suggestedResolution: 'keep-source' | 'keep-target' | 'merge'
  /** 已选择的解决方案 */
  resolution?: 'keep-source' | 'keep-target' | 'merge' | 'manual'
  /** 是否已解决 */
  resolved: boolean
}

/** 合并预览 */
export interface MergePreview {
  /** 合并 ID */
  id: string
  /** 源分支 ID */
  sourceBranchId: string
  /** 目标分支 ID */
  targetBranchId: string
  /** 合并策略 */
  strategy: MergeStrategy
  /** 将新增的检查点数 */
  newCheckpoints: number
  /** 将修改的检查点数 */
  modifiedCheckpoints: number
  /** 冲突列表 */
  conflicts: MergeConflict[]
  /** 总冲突数 */
  totalConflicts: number
  /** 已解决冲突数 */
  resolvedConflicts: number
  /** 是否所有冲突已解决 */
  allResolved: boolean
  /** 预览时间 */
  previewedAt: string
}

/** 遗产继承项 */
export interface LegacyItem {
  /** 来源分支 ID */
  sourceBranchId: string
  /** 继承类型 */
  type: 'checkpoint' | 'tag' | 'label' | 'metadata' | 'color'
  /** 继承数据 */
  data: Record<string, unknown>
  /** 是否保留 */
  preserved: boolean
  /** 继承原因 */
  reason: string
}

/** 合并结果 */
export interface MergeResult {
  /** 合并是否成功 */
  success: boolean
  /** 合并策略 */
  strategy: MergeStrategy
  /** 源分支 ID */
  sourceBranchId: string
  /** 目标分支 ID */
  targetBranchId: string
  /** 合并后的检查点 */
  mergedCheckpoints: Checkpoint[]
  /** 遗产继承列表 */
  legacies: LegacyItem[]
  /** 解决的冲突数 */
  conflictsResolved: number
  /** 未解决的冲突数 */
  conflictsUnresolved: number
  /** 合并时间 */
  mergedAt: string
  /** 合并摘要 */
  summary: string
}

/** 回滚操作 */
export interface RollbackAction {
  id: string
  /** 回滚类型 */
  type: 'snapshot' | 'checkpoint' | 'merge'
  /** 回滚源 */
  sourceId: string
  /** 回滚描述 */
  description: string
  /** 回滚时间 */
  timestamp: string
  /** 回滚前的状态（用于撤销回滚） */
  undoState?: {
    branches: WorldBranch[]
    checkpoints: Checkpoint[]
  }
}

/** 融合引擎配置 */
export interface MergeEngineConfig {
  /** 默认合并策略 */
  defaultStrategy: MergeStrategy
  /** 是否自动解决非关键冲突 */
  autoResolveNonCritical: boolean
  /** 是否保留源分支（合并后不删除） */
  keepSourceBranch: boolean
  /** 冲突解决超时（ms） */
  conflictTimeout: number
  /** 最大冲突数（超过则拒绝合并） */
  maxConflicts: number
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_MERGE_ENGINE_CONFIG: MergeEngineConfig = {
  defaultStrategy: 'three-way',
  autoResolveNonCritical: true,
  keepSourceBranch: false,
  conflictTimeout: 0,
  maxConflicts: 50,
}

// ============================================================
// 工具函数
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 深度比较两个对象 */
function deepEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return false

  for (const key of aKeys) {
    if (!(key in b)) return false
    const av = a[key]
    const bv = b[key]

    if (typeof av === 'object' && av !== null && typeof bv === 'object' && bv !== null) {
      if (!deepEqual(av as Record<string, unknown>, bv as Record<string, unknown>)) return false
    } else if (av !== bv) {
      return false
    }
  }
  return true
}

/** 深度合并两个对象 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  conflictKeys: Set<string> = new Set(),
): { result: Record<string, unknown>; conflicts: string[] } {
  const result = { ...target }
  const conflicts: string[] = []

  for (const key of Object.keys(source)) {
    if (key in target) {
      const tv = target[key]
      const sv = source[key]

      if (typeof tv === 'object' && tv !== null && !Array.isArray(tv) &&
          typeof sv === 'object' && sv !== null && !Array.isArray(sv)) {
        const subResult = deepMerge(
          tv as Record<string, unknown>,
          sv as Record<string, unknown>,
          conflictKeys,
        )
        result[key] = subResult.result
        conflicts.push(...subResult.conflicts)
      } else if (tv !== sv) {
        conflictKeys.add(key)
        conflicts.push(key)
        result[key] = sv // 默认使用源数据
      }
    } else {
      result[key] = source[key]
    }
  }

  return { result, conflicts }
}

// ============================================================
// 世界融合引擎 Composable
// ============================================================

export function useWorldMergeEngine(
  branches: () => WorldBranch[],
  checkpoints: () => Checkpoint[],
  snapshots: () => WorldSnapshot[],
  onPersist: () => Promise<void>,
) {
  // ---- 配置 ----
  const mergeConfig = ref<MergeEngineConfig>({ ...DEFAULT_MERGE_ENGINE_CONFIG })

  // ---- 合并预览 ----
  const mergePreviews = ref<MergePreview[]>([])

  // ---- 合并结果 ----
  const mergeResults = ref<MergeResult[]>([])

  // ---- 回滚历史 ----
  const rollbackHistory = ref<RollbackAction[]>([])

  // ============================================================
  // 冲突检测
  // ============================================================

  /** 检测两个检查点之间的冲突 */
  function detectConflicts(
    sourceCheckpoint: Checkpoint,
    targetCheckpoint: Checkpoint,
  ): MergeConflict[] {
    const conflicts: MergeConflict[] = []

    // 检测标签冲突
    const sourceTags = new Set(sourceCheckpoint.tags)
    const targetTags = new Set(targetCheckpoint.tags)
    const tagOverlap = [...sourceTags].filter(t => targetTags.has(t))

    if (tagOverlap.length > 0) {
      conflicts.push({
        id: generateId('conflict'),
        type: 'tag',
        severity: 'info',
        sourceCheckpointId: sourceCheckpoint.id,
        targetCheckpointId: targetCheckpoint.id,
        description: `标签冲突: ${tagOverlap.join(', ')}`,
        sourceData: { tags: sourceCheckpoint.tags },
        targetData: { tags: targetCheckpoint.tags },
        suggestedResolution: 'merge',
        resolved: false,
      })
    }

    // 检测标签冲突
    if (sourceCheckpoint.label === targetCheckpoint.label) {
      conflicts.push({
        id: generateId('conflict'),
        type: 'label',
        severity: 'warning',
        sourceCheckpointId: sourceCheckpoint.id,
        targetCheckpointId: targetCheckpoint.id,
        description: `标签名冲突: "${sourceCheckpoint.label}"`,
        sourceData: { label: sourceCheckpoint.label },
        targetData: { label: targetCheckpoint.label },
        suggestedResolution: 'keep-target',
        resolved: false,
      })
    }

    // 检测数据冲突
    if (!deepEqual(sourceCheckpoint.snapshot, targetCheckpoint.snapshot)) {
      const { conflicts: dataConflicts } = deepMerge(
        targetCheckpoint.snapshot,
        sourceCheckpoint.snapshot,
      )

      if (dataConflicts.length > 0) {
        conflicts.push({
          id: generateId('conflict'),
          type: 'data',
          severity: 'critical',
          sourceCheckpointId: sourceCheckpoint.id,
          targetCheckpointId: targetCheckpoint.id,
          description: `数据冲突: ${dataConflicts.join(', ')} 个字段不一致`,
          sourceData: sourceCheckpoint.snapshot,
          targetData: targetCheckpoint.snapshot,
          suggestedResolution: 'merge',
          resolved: false,
        })
      }
    }

    return conflicts
  }

  // ============================================================
  // 合并预览
  // ============================================================

  /** 生成合并预览 */
  function previewMerge(
    sourceBranchId: string,
    targetBranchId: string,
    strategy?: MergeStrategy,
  ): MergePreview | null {
    const branchList = branches()
    const checkpointList = checkpoints()

    const sourceBranch = branchList.find(b => b.id === sourceBranchId)
    const targetBranch = branchList.find(b => b.id === targetBranchId)

    if (!sourceBranch || !targetBranch) return null

    const sourceCheckpoints = checkpointList
      .filter(cp => cp.branchId === sourceBranchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const targetCheckpoints = checkpointList
      .filter(cp => cp.branchId === targetBranchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const mergeStrategy = strategy ?? mergeConfig.value.defaultStrategy
    const conflicts: MergeConflict[] = []

    let newCheckpoints = 0
    let modifiedCheckpoints = 0

    // 根据策略计算新增/修改
    for (const scp of sourceCheckpoints) {
      const existing = targetCheckpoints.find(tcp => tcp.label === scp.label)

      if (existing) {
        modifiedCheckpoints++
        const cpConflicts = detectConflicts(scp, existing)
        conflicts.push(...cpConflicts)
      } else {
        newCheckpoints++
      }
    }

    const preview: MergePreview = {
      id: generateId('merge_preview'),
      sourceBranchId,
      targetBranchId,
      strategy: mergeStrategy,
      newCheckpoints,
      modifiedCheckpoints,
      conflicts,
      totalConflicts: conflicts.length,
      resolvedConflicts: 0,
      allResolved: conflicts.length === 0,
      previewedAt: new Date().toISOString(),
    }

    mergePreviews.value = [preview, ...mergePreviews.value]
    return preview
  }

  /** 解决单个冲突 */
  function resolveConflict(
    previewId: string,
    conflictId: string,
    resolution: MergeConflict['resolution'],
  ): boolean {
    const preview = mergePreviews.value.find(p => p.id === previewId)
    if (!preview) return false

    const conflict = preview.conflicts.find(c => c.id === conflictId)
    if (!conflict) return false

    conflict.resolution = resolution
    conflict.resolved = true

    preview.resolvedConflicts = preview.conflicts.filter(c => c.resolved).length
    preview.allResolved = preview.resolvedConflicts >= preview.totalConflicts

    mergePreviews.value = [...mergePreviews.value]
    return true
  }

  /** 自动解决非关键冲突 */
  function autoResolveNonCritical(previewId: string): number {
    const preview = mergePreviews.value.find(p => p.id === previewId)
    if (!preview) return 0

    let resolved = 0
    for (const conflict of preview.conflicts) {
      if (conflict.severity !== 'critical' && !conflict.resolved) {
        resolveConflict(previewId, conflict.id, conflict.suggestedResolution)
        resolved++
      }
    }

    return resolved
  }

  // ============================================================
  // 执行合并
  // ============================================================

  /** 执行合并 */
  async function executeMerge(
    sourceBranchId: string,
    targetBranchId: string,
    strategy?: MergeStrategy,
    previewId?: string,
  ): Promise<MergeResult> {
    const branchList = branches()
    const checkpointList = checkpoints()

    const sourceBranch = branchList.find(b => b.id === sourceBranchId)
    const targetBranch = branchList.find(b => b.id === targetBranchId)

    if (!sourceBranch || !targetBranch) {
      return createFailedResult(sourceBranchId, targetBranchId, strategy ?? mergeConfig.value.defaultStrategy, '分支不存在')
    }

    // 复用已解决冲突的预览，避免重新检测丢失手动解决结果
    const existingPreview = previewId
      ? mergePreviews.value.find(p => p.id === previewId)
      : undefined
    const preview = existingPreview ?? previewMerge(sourceBranchId, targetBranchId, strategy)
    if (!preview) {
      return createFailedResult(sourceBranchId, targetBranchId, strategy ?? mergeConfig.value.defaultStrategy, '无法生成合并预览')
    }

    // 自动解决非关键冲突
    if (mergeConfig.value.autoResolveNonCritical) {
      autoResolveNonCritical(preview.id)
    }

    // 检查是否所有冲突已解决
    if (!preview.allResolved) {
      return createFailedResult(
        sourceBranchId, targetBranchId, preview.strategy,
        `仍有 ${preview.totalConflicts - preview.resolvedConflicts} 个冲突未解决`,
      )
    }

    // 检查冲突数量
    if (preview.totalConflicts > mergeConfig.value.maxConflicts) {
      return createFailedResult(
        sourceBranchId, targetBranchId, preview.strategy,
        `冲突数(${preview.totalConflicts})超过上限(${mergeConfig.value.maxConflicts})`,
      )
    }

    const mergeStrategy = preview.strategy
    const mergedCheckpoints: Checkpoint[] = []
    const legacies: LegacyItem[] = []

    const sourceCheckpoints = checkpointList
      .filter(cp => cp.branchId === sourceBranchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    const targetCheckpoints = checkpointList
      .filter(cp => cp.branchId === targetBranchId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    switch (mergeStrategy) {
      case 'fast-forward':
        // 快进合并：直接将源分支的检查点追加到目标分支
        for (const scp of sourceCheckpoints) {
          mergedCheckpoints.push({
            ...scp,
            id: generateId('cp'),
            branchId: targetBranchId,
            createdAt: new Date().toISOString(),
          })
        }
        break

      case 'squash':
        // 压缩合并：将所有源检查点合并为一个
        if (sourceCheckpoints.length > 0) {
          const mergedSnapshot: Record<string, unknown> = {}
          const allTags: string[] = []
          const labels: string[] = []

          for (const scp of sourceCheckpoints) {
            Object.assign(mergedSnapshot, scp.snapshot)
            allTags.push(...scp.tags)
            labels.push(scp.label)
          }

          mergedCheckpoints.push({
            id: generateId('cp'),
            branchId: targetBranchId,
            label: `[合并] ${sourceBranch.name}: ${labels.join(', ')}`,
            description: `从"${sourceBranch.name}"分支压缩合并 ${sourceCheckpoints.length} 个检查点`,
            snapshot: mergedSnapshot,
            createdAt: new Date().toISOString(),
            tags: [...new Set(allTags)],
          })
        }
        break

      case 'three-way':
      case 'rebase':
      default:
        // 三方合并：逐个处理检查点
        for (const scp of sourceCheckpoints) {
          const existing = targetCheckpoints.find(tcp => tcp.label === scp.label)

          if (existing) {
            // 存在冲突，使用已解决的冲突方案
            const conflict = preview.conflicts.find(
              c => c.sourceCheckpointId === scp.id && c.targetCheckpointId === existing.id,
            )

            if (conflict?.resolution === 'keep-source') {
              mergedCheckpoints.push({
                ...existing,
                snapshot: { ...scp.snapshot },
                tags: [...new Set([...existing.tags, ...scp.tags])],
              })
            } else if (conflict?.resolution === 'merge') {
              const mergedSnapshot = { ...existing.snapshot, ...scp.snapshot }
              mergedCheckpoints.push({
                ...existing,
                snapshot: mergedSnapshot,
                tags: [...new Set([...existing.tags, ...scp.tags])],
              })
            } else {
              // keep-target 或 默认
              mergedCheckpoints.push(existing)
            }
          } else {
            mergedCheckpoints.push({
              ...scp,
              id: generateId('cp'),
              branchId: targetBranchId,
              createdAt: new Date().toISOString(),
            })
          }
        }
        break
    }

    // 收集遗产
    legacies.push({
      sourceBranchId,
      type: 'checkpoint',
      data: { count: sourceCheckpoints.length },
      preserved: true,
      reason: `从"${sourceBranch.name}"继承了 ${sourceCheckpoints.length} 个检查点`,
    })

    if (sourceBranch.color) {
      legacies.push({
        sourceBranchId,
        type: 'color',
        data: { color: sourceBranch.color },
        preserved: mergeConfig.value.keepSourceBranch,
        reason: `分支颜色 "${sourceBranch.color}" 已保留`,
      })
    }

    // 标签继承
    const uniqueTags = [...new Set(sourceCheckpoints.flatMap(cp => cp.tags))]
    if (uniqueTags.length > 0) {
      legacies.push({
        sourceBranchId,
        type: 'tag',
        data: { tags: uniqueTags },
        preserved: true,
        reason: `继承了 ${uniqueTags.length} 个标签: ${uniqueTags.join(', ')}`,
      })
    }

    // 保存回滚前的状态
    rollbackHistory.value.push({
      id: generateId('rollback'),
      type: 'merge',
      sourceId: sourceBranchId,
      description: `合并"${sourceBranch.name}"到"${targetBranch.name}"`,
      timestamp: new Date().toISOString(),
      undoState: {
        branches: JSON.parse(JSON.stringify(branchList)),
        checkpoints: JSON.parse(JSON.stringify(checkpointList)),
      },
    })

    const result: MergeResult = {
      success: true,
      strategy: mergeStrategy,
      sourceBranchId,
      targetBranchId,
      mergedCheckpoints,
      legacies,
      conflictsResolved: preview.resolvedConflicts,
      conflictsUnresolved: preview.totalConflicts - preview.resolvedConflicts,
      mergedAt: new Date().toISOString(),
      summary: generateMergeSummary(
        sourceBranch.name,
        targetBranch.name,
        mergeStrategy,
        mergedCheckpoints.length,
        preview.resolvedConflicts,
        legacies,
      ),
    }

    mergeResults.value = [result, ...mergeResults.value]
    return result
  }

  /** 生成合并摘要 */
  function generateMergeSummary(
    sourceName: string,
    targetName: string,
    strategy: MergeStrategy,
    checkpointCount: number,
    conflictsResolved: number,
    legacies: LegacyItem[],
  ): string {
    const strategyLabels: Record<MergeStrategy, string> = {
      'fast-forward': '快进合并',
      'three-way': '三方合并',
      'squash': '压缩合并',
      'rebase': '变基合并',
    }

    return `将"${sourceName}"以${strategyLabels[strategy]}方式合并到"${targetName}"，` +
      `产生 ${checkpointCount} 个检查点，解决 ${conflictsResolved} 个冲突，` +
      `继承 ${legacies.length} 项遗产。`
  }

  /** 创建失败结果 */
  function createFailedResult(
    sourceBranchId: string,
    targetBranchId: string,
    strategy: MergeStrategy,
    reason: string,
  ): MergeResult {
    return {
      success: false,
      strategy,
      sourceBranchId,
      targetBranchId,
      mergedCheckpoints: [],
      legacies: [],
      conflictsResolved: 0,
      conflictsUnresolved: 0,
      mergedAt: new Date().toISOString(),
      summary: `合并失败: ${reason}`,
    }
  }

  // ============================================================
  // 遗产继承
  // ============================================================

  /** 获取分支的遗产清单 */
  function getLegacyForBranch(branchId: string): LegacyItem[] {
    const results = mergeResults.value
      .filter(r => r.success && r.sourceBranchId === branchId)

    return results.flatMap(r => r.legacies)
  }

  /** 获取所有遗产 */
  function getAllLegacies(): LegacyItem[] {
    return mergeResults.value
      .filter(r => r.success)
      .flatMap(r => r.legacies)
  }

  /** 按类型获取遗产 */
  function getLegaciesByType(type: LegacyItem['type']): LegacyItem[] {
    return getAllLegacies().filter(l => l.type === type)
  }

  // ============================================================
  // 回滚
  // ============================================================

  /** 回滚到指定快照 */
  async function rollbackToSnapshot(
    snapshotTimestamp: string,
    currentBranches: WorldBranch[],
    currentCheckpoints: Checkpoint[],
  ): Promise<boolean> {
    const snapshotList = snapshots()
    const snapshot = snapshotList.find(s => s.timestamp === snapshotTimestamp)
    if (!snapshot) return false

    // 保存回滚前的状态
    rollbackHistory.value.push({
      id: generateId('rollback'),
      type: 'snapshot',
      sourceId: snapshotTimestamp,
      description: `回滚到快照 "${snapshot.metadata.label}"`,
      timestamp: new Date().toISOString(),
      undoState: {
        branches: JSON.parse(JSON.stringify(currentBranches)),
        checkpoints: JSON.parse(JSON.stringify(currentCheckpoints)),
      },
    })

    return true
  }

  /** 回滚到指定检查点 */
  async function rollbackToCheckpoint(
    checkpointId: string,
    currentBranches: WorldBranch[],
    currentCheckpoints: Checkpoint[],
  ): Promise<boolean> {
    const checkpointList = checkpoints()
    const targetCP = checkpointList.find(cp => cp.id === checkpointId)
    if (!targetCP) return false

    // 保存回滚前的状态
    rollbackHistory.value.push({
      id: generateId('rollback'),
      type: 'checkpoint',
      sourceId: checkpointId,
      description: `回滚到检查点 "${targetCP.label}"`,
      timestamp: new Date().toISOString(),
      undoState: {
        branches: JSON.parse(JSON.stringify(currentBranches)),
        checkpoints: JSON.parse(JSON.stringify(currentCheckpoints)),
      },
    })

    return true
  }

  /** 撤销最近的合并 */
  async function undoLastMerge(
    currentBranches: WorldBranch[],
    currentCheckpoints: Checkpoint[],
  ): Promise<boolean> {
    const lastMerge = rollbackHistory.value
      .filter(h => h.type === 'merge')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]

    if (!lastMerge || !lastMerge.undoState) return false

    // 恢复状态
    const restoredBranches = lastMerge.undoState.branches
    const restoredCheckpoints = lastMerge.undoState.checkpoints

    // 更新引用（通过外部提供的函数）
    currentBranches.length = 0
    currentBranches.push(...restoredBranches)
    currentCheckpoints.length = 0
    currentCheckpoints.push(...restoredCheckpoints)

    await onPersist()

    // 移除回滚记录
    rollbackHistory.value = rollbackHistory.value.filter(h => h.id !== lastMerge.id)

    return true
  }

  /** 获取回滚历史 */
  function getRollbackHistory(): RollbackAction[] {
    return rollbackHistory.value
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /** 清除回滚历史 */
  function clearRollbackHistory(): void {
    rollbackHistory.value = []
  }

  // ============================================================
  // 合并策略比较
  // ============================================================

  /** 推荐最佳合并策略 */
  function recommendStrategy(
    sourceBranchId: string,
    targetBranchId: string,
  ): { strategy: MergeStrategy; reason: string } {
    const checkpointList = checkpoints()
    const branchList = branches()

    const sourceCheckpoints = checkpointList.filter(cp => cp.branchId === sourceBranchId)
    const targetCheckpoints = checkpointList.filter(cp => cp.branchId === targetBranchId)

    const sourceBranch = branchList.find(b => b.id === sourceBranchId)

    // 如果源分支是目标分支的直接子分支且没有冲突，推荐快进
    if (sourceBranch?.parentBranchId === targetBranchId && sourceCheckpoints.length <= 5) {
      return {
        strategy: 'fast-forward',
        reason: '源分支是目标分支的直接子分支，建议快进合并',
      }
    }

    // 如果检查点较多，推荐压缩合并
    if (sourceCheckpoints.length > 10) {
      return {
        strategy: 'squash',
        reason: `源分支有 ${sourceCheckpoints.length} 个检查点，建议压缩合并以减少历史复杂度`,
      }
    }

    // 如果目标分支没有检查点，推荐快进
    if (targetCheckpoints.length === 0) {
      return {
        strategy: 'fast-forward',
        reason: '目标分支无检查点，建议快进合并',
      }
    }

    // 默认推荐三方合并
    return {
      strategy: 'three-way',
      reason: '双方分支均有检查点，建议三方合并以保留完整历史',
    }
  }

  // ============================================================
  // 计算属性
  // ============================================================

  /** 合并成功次数 */
  const successfulMergeCount = computed(() =>
    mergeResults.value.filter(r => r.success).length,
  )

  /** 最近的合并结果 */
  const latestMergeResult = computed(() => mergeResults.value[0] ?? null)

  /** 回滚记录数 */
  const rollbackCount = computed(() => rollbackHistory.value.length)

  // ============================================================
  // 清理
  // ============================================================

  function destroy(): void {
    mergePreviews.value = []
    mergeResults.value = []
    rollbackHistory.value = []
  }

  return {
    // 配置
    mergeConfig,

    // 合并预览
    mergePreviews,
    previewMerge,
    resolveConflict,
    autoResolveNonCritical,

    // 执行合并
    executeMerge,
    mergeResults,
    successfulMergeCount,
    latestMergeResult,

    // 遗产继承
    getLegacyForBranch,
    getAllLegacies,
    getLegaciesByType,

    // 回滚
    rollbackHistory,
    rollbackCount,
    rollbackToSnapshot,
    rollbackToCheckpoint,
    undoLastMerge,
    getRollbackHistory,
    clearRollbackHistory,

    // 策略推荐
    recommendStrategy,

    // 生命周期
    destroy,
  }
}