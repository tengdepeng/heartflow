// ============================================================
// Parallel World 桥接层
// 简化透传：直接暴露各 composable 的原始 API
// ============================================================

import { computed, ref } from 'vue'
// ⚠️ 直接指向真实定义文件，**不要**从 './index' 取符号：
// index.ts 会 re-export 本文件，barrel 自引用会构成 index ↔ bridge 循环依赖
// （模块初始化顺序不确定，取值可能拿到 undefined）。
import { useParallelWorld } from './worlds'
import {
  useBranchTimeline,
  useBranchComparison,
  useMergeSuggestions,
  useEvolutionGraph,
} from './branch-timeline'
import type { WorldBranch, Checkpoint, WorldSnapshot, BranchStats } from './types'

// ---- 聚合类型 ----

export interface ParallelWorldSummary {
  totalBranches: number
  totalCheckpoints: number
  totalSnapshots: number
  activeBranchName: string
  trunkBranchName: string | null
  branchingDepth: number
  mergeOpportunities: number
  branchStats: BranchStats
}

export interface BranchDetail {
  branch: WorldBranch
  children: WorldBranch[]
  checkpoints: Checkpoint[]
  depth: number
  canMerge: boolean
  path: WorldBranch[]
}

// ---- 桥接 ----

export function useParallelWorldBridge() {
  const world = useParallelWorld()
  const timeline = useBranchTimeline()
  const comparison = useBranchComparison()
  const mergeSuggestions = useMergeSuggestions()
  const evolution = useEvolutionGraph()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<ParallelWorldSummary>(() => {
    const stats = world.getBranchStats()
    const trunk = world.trunkBranch.value
    const active = world.activeBranch.value

    return {
      totalBranches: stats.totalBranches,
      totalCheckpoints: stats.totalCheckpoints,
      totalSnapshots: world.snapshots.value.length,
      activeBranchName: active?.name ?? '未选择',
      trunkBranchName: trunk?.name ?? null,
      branchingDepth: stats.branchingDepth,
      mergeOpportunities: mergeSuggestions.suggestions.value.length,
      branchStats: stats,
    }
  })

  const branchDetails = computed<BranchDetail[]>(() => {
    return world.branches.value.map(b => ({
      branch: b,
      children: world.getChildBranches(b.id),
      checkpoints: world.getCheckpointsForBranch(b.id),
      depth: world.getBranchDepth(b.id),
      canMerge: world.canMerge(b.id),
      path: world.getBranchPath(b.id),
    }))
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      await world.load()
      timeline.buildTimeline(world.branches.value, world.checkpoints.value)
      mergeSuggestions.detectMergeOpportunities(world.branches.value, world.checkpoints.value)
      evolution.buildEvolutionGraph(world.branches.value, world.checkpoints.value)
    } finally {
      isLoading.value = false
    }
  }

  // 分支
  async function createBranch(
    name: string,
    description?: string,
    color?: string,
    parentBranchId?: string,
  ): Promise<WorldBranch> {
    return world.createBranch(name, description, color, parentBranchId)
  }

  async function switchBranch(branchId: string): Promise<boolean> {
    return world.switchBranch(branchId)
  }

  async function mergeBranch(branchId: string): Promise<boolean> {
    return world.mergeBranch(branchId)
  }

  async function deleteBranch(branchId: string): Promise<boolean> {
    return world.deleteBranch(branchId)
  }

  async function renameBranch(branchId: string, newName: string): Promise<boolean> {
    return world.renameBranch(branchId, newName)
  }

  // 检查点
  async function createCheckpoint(
    label: string,
    description?: string,
    snapshot?: Record<string, unknown>,
    tags?: string[],
    branchId?: string,
  ): Promise<Checkpoint> {
    return world.createCheckpoint(label, description, snapshot, tags, branchId)
  }

  async function deleteCheckpoint(checkpointId: string): Promise<boolean> {
    return world.deleteCheckpoint(checkpointId)
  }

  // 快照
  async function takeSnapshot(label: string, description?: string): Promise<WorldSnapshot> {
    return world.takeSnapshot(label, description)
  }

  async function restoreSnapshot(timestamp: string): Promise<boolean> {
    return world.restoreSnapshot(timestamp)
  }

  return {
    // 状态
    branches: world.branches,
    checkpoints: world.checkpoints,
    snapshots: world.snapshots,
    activeBranchId: world.activeBranchId,
    activeBranch: world.activeBranch,
    trunkBranch: world.trunkBranch,
    isLoading,
    summary,
    branchDetails,
    // 分支树
    branchTree: computed(() => world.getBranchTree()),
    // 时间线
    timelineNodes: timeline.timelineNodes,
    // 对比
    comparisons: comparison.comparisons,
    // 合并建议
    suggestions: mergeSuggestions.suggestions,
    // 演变图谱
    evolutionGraph: evolution.evolutionGraph,
    // 操作
    initialize,
    createBranch,
    switchBranch,
    mergeBranch,
    deleteBranch,
    renameBranch,
    createCheckpoint,
    deleteCheckpoint,
    takeSnapshot,
    restoreSnapshot,
    // 子模块直通
    world,
    timeline,
    comparison,
    mergeSuggestions,
    evolution,
  }
}