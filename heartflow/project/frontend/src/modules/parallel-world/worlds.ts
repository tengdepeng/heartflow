// ============================================================
// 平行世界 · 核心逻辑
// 蓝图：
//   分支创建与切换、检查点管理、世界快照、
//   分支树导航、可视化辅助、持久化存储
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '@/engine/storage'
import type {
  WorldBranch,
  Checkpoint,
  WorldSnapshot,
  BranchStats,
  ParallelWorldState,
} from './types'
import { BRANCH_COLORS, PARALLEL_WORLD_STORAGE_KEYS } from './types'

// ---- ID 生成 ----

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// ---- 分支树节点 ----

export interface BranchTreeNode {
  branch: WorldBranch
  children: BranchTreeNode[]
  depth: number
}

// ---- 默认主干分支 ----

const DEFAULT_TRUNK: WorldBranch = {
  id: 'pw_trunk',
  name: '主干',
  description: '主时间线，一切分支的起点',
  color: BRANCH_COLORS[0].value,
  createdAt: new Date().toISOString(),
  parentBranchId: undefined,
  isActive: true,
  checkpointCount: 0,
}

// ============================================================
//  useParallelWorld 组合式函数
// ============================================================

export function useParallelWorld() {
  // ---- 状态 ----

  const branches = ref<WorldBranch[]>([])
  const checkpoints = ref<Checkpoint[]>([])
  const activeBranchId = ref<string>(DEFAULT_TRUNK.id)
  const snapshots = ref<WorldSnapshot[]>([])

  // ---- 派生状态 ----

  /** 当前活跃分支 */
  const activeBranch = computed<WorldBranch | undefined>(() =>
    branches.value.find(b => b.id === activeBranchId.value),
  )

  /** 主干分支 */
  const trunkBranch = computed<WorldBranch | undefined>(() =>
    branches.value.find(b => b.id === DEFAULT_TRUNK.id),
  )

  // ---- 持久化 ----

  async function load(): Promise<void> {
    const [savedBranches, savedCheckpoints, savedSnapshots] = await Promise.all([
      storage.getKV<WorldBranch[]>(PARALLEL_WORLD_STORAGE_KEYS.BRANCHES, []),
      storage.getKV<Checkpoint[]>(PARALLEL_WORLD_STORAGE_KEYS.CHECKPOINTS, []),
      storage.getKV<WorldSnapshot[]>(PARALLEL_WORLD_STORAGE_KEYS.SNAPSHOTS, []),
    ])

    if (savedBranches.length === 0) {
      // 首次加载，初始化默认主干分支
      branches.value = [{ ...DEFAULT_TRUNK }]
      activeBranchId.value = DEFAULT_TRUNK.id
      await persistBranches()
    } else {
      branches.value = savedBranches
      checkpoints.value = savedCheckpoints
      snapshots.value = savedSnapshots

      // 找到活跃分支
      const active = branches.value.find(b => b.isActive)
      activeBranchId.value = active ? active.id : DEFAULT_TRUNK.id
    }
  }

  async function persistBranches(): Promise<void> {
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.BRANCHES, branches.value)
  }

  async function persistCheckpoints(): Promise<void> {
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.CHECKPOINTS, checkpoints.value)
  }

  async function persistSnapshots(): Promise<void> {
    await storage.setKV(PARALLEL_WORLD_STORAGE_KEYS.SNAPSHOTS, snapshots.value)
  }

  async function persistAll(): Promise<void> {
    await Promise.all([persistBranches(), persistCheckpoints(), persistSnapshots()])
  }

  // ============================================================
  //  分支管理
  // ============================================================

  /**
   * 创建新分支
   * @param name 分支名称
   * @param description 分支描述
   * @param color 分支颜色（可选，默认从预设中轮询选取）
   * @param parentBranchId 父分支 ID（可选，默认从当前活跃分支分叉）
   */
  async function createBranch(
    name: string,
    description: string = '',
    color?: string,
    parentBranchId?: string,
  ): Promise<WorldBranch> {
    const parentId = parentBranchId ?? activeBranchId.value
    const branchColor = color ?? BRANCH_COLORS[branches.value.length % BRANCH_COLORS.length].value

    const branch: WorldBranch = {
      id: generateId(),
      name,
      description,
      color: branchColor,
      createdAt: new Date().toISOString(),
      parentBranchId: parentId,
      isActive: false,
      checkpointCount: 0,
    }

    branches.value.push(branch)
    await persistBranches()
    return branch
  }

  /**
   * 切换到指定分支
   */
  async function switchBranch(branchId: string): Promise<boolean> {
    const target = branches.value.find(b => b.id === branchId)
    if (!target) return false

    // 取消所有分支的活跃状态
    for (const b of branches.value) {
      b.isActive = false
    }

    target.isActive = true
    activeBranchId.value = branchId
    await persistBranches()
    return true
  }

  /**
   * 合并分支回父分支
   * 将子分支的检查点合并到父分支，然后删除子分支
   */
  async function mergeBranch(branchId: string): Promise<boolean> {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false
    if (!branch.parentBranchId) return false // 根分支无法合并
    if (branch.isActive) return false        // 活跃分支不可合并

    const parent = branches.value.find(b => b.id === branch.parentBranchId)
    if (!parent) return false

    // 将子分支的检查点转移到父分支
    for (const cp of checkpoints.value) {
      if (cp.branchId === branchId) {
        cp.branchId = parent.id
      }
    }

    // 更新父分支的检查点计数
    parent.checkpointCount += branch.checkpointCount

    // 删除子分支
    branches.value = branches.value.filter(b => b.id !== branchId)

    await persistAll()
    return true
  }

  /**
   * 删除分支及其所有检查点
   */
  async function deleteBranch(branchId: string): Promise<boolean> {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false
    if (branch.id === DEFAULT_TRUNK.id) return false // 主干不可删除
    if (branch.isActive) return false                // 活跃分支不可删除

    // 递归删除所有子分支
    const childBranches = branches.value.filter(b => b.parentBranchId === branchId)
    for (const child of childBranches) {
      await deleteBranch(child.id)
    }

    // 删除该分支的检查点
    checkpoints.value = checkpoints.value.filter(cp => cp.branchId !== branchId)
    // 删除分支
    branches.value = branches.value.filter(b => b.id !== branchId)

    await persistAll()
    return true
  }

  /**
   * 重命名分支
   */
  async function renameBranch(branchId: string, newName: string): Promise<boolean> {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false

    branch.name = newName
    await persistBranches()
    return true
  }

  // ============================================================
  //  检查点管理
  // ============================================================

  /**
   * 在当前活跃分支上创建检查点
   */
  async function createCheckpoint(
    label: string,
    description: string = '',
    snapshot: Record<string, unknown> = {},
    tags: string[] = [],
    branchId?: string,
  ): Promise<Checkpoint> {
    const targetBranchId = branchId ?? activeBranchId.value

    const checkpoint: Checkpoint = {
      id: generateId(),
      branchId: targetBranchId,
      label,
      description,
      snapshot,
      createdAt: new Date().toISOString(),
      tags,
    }

    checkpoints.value.push(checkpoint)

    // 更新分支的检查点计数
    const branch = branches.value.find(b => b.id === targetBranchId)
    if (branch) {
      branch.checkpointCount += 1
    }

    await persistAll()
    return checkpoint
  }

  /**
   * 删除检查点
   */
  async function deleteCheckpoint(checkpointId: string): Promise<boolean> {
    const cp = checkpoints.value.find(c => c.id === checkpointId)
    if (!cp) return false

    checkpoints.value = checkpoints.value.filter(c => c.id !== checkpointId)

    // 更新分支的检查点计数
    const branch = branches.value.find(b => b.id === cp.branchId)
    if (branch && branch.checkpointCount > 0) {
      branch.checkpointCount -= 1
    }

    await persistAll()
    return true
  }

  /**
   * 更新检查点（部分字段）
   */
  async function updateCheckpoint(checkpointId: string, updates: Partial<Checkpoint>): Promise<Checkpoint | undefined> {
    const cp = checkpoints.value.find(c => c.id === checkpointId)
    if (!cp) return undefined
    Object.assign(cp, updates)
    await persistAll()
    return cp
  }

  /**
   * 获取指定分支的所有检查点（按创建时间倒序）
   */
  function getCheckpointsForBranch(branchId: string): Checkpoint[] {
    return checkpoints.value
      .filter(cp => cp.branchId === branchId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  // ============================================================
  //  世界快照
  // ============================================================

  /**
   * 拍摄当前状态的世界快照
   */
  async function takeSnapshot(label: string, description?: string): Promise<WorldSnapshot> {
    const snapshot: WorldSnapshot = {
      timestamp: new Date().toISOString(),
      activeBranchId: activeBranchId.value,
      branches: JSON.parse(JSON.stringify(branches.value)),
      metadata: {
        label,
        description,
        totalCheckpoints: checkpoints.value.length,
      },
    }

    snapshots.value.push(snapshot)
    await persistSnapshots()
    return snapshot
  }

  /**
   * 从快照恢复状态
   */
  async function restoreSnapshot(timestamp: string): Promise<boolean> {
    const snapshot = snapshots.value.find(s => s.timestamp === timestamp)
    if (!snapshot) return false

    branches.value = JSON.parse(JSON.stringify(snapshot.branches))
    activeBranchId.value = snapshot.activeBranchId

    // 确保活跃分支状态正确
    for (const b of branches.value) {
      b.isActive = b.id === activeBranchId.value
    }

    await persistAll()
    return true
  }

  /**
   * 获取所有快照（按时间倒序）
   */
  function getSnapshots(): WorldSnapshot[] {
    return snapshots.value
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  // ============================================================
  //  导航与树形结构
  // ============================================================

  /**
   * 获取从根到指定分支的路径（血统链）
   * 返回数组从根分支到目标分支，包含每个分支节点
   */
  function getBranchPath(branchId: string): WorldBranch[] {
    const path: WorldBranch[] = []
    let currentId: string | undefined = branchId

    while (currentId) {
      const branch = branches.value.find(b => b.id === currentId)
      if (!branch) break
      path.unshift(branch)
      currentId = branch.parentBranchId
    }

    return path
  }

  /**
   * 获取分支树结构
   * 从根分支开始构建层级树
   */
  function getBranchTree(): BranchTreeNode[] {
    const rootBranches = branches.value.filter(b => !b.parentBranchId)

    function buildNode(branch: WorldBranch, depth: number): BranchTreeNode {
      const children = branches.value
        .filter(b => b.parentBranchId === branch.id)
        .map(child => buildNode(child, depth + 1))

      return { branch, children, depth }
    }

    return rootBranches.map(b => buildNode(b, 0))
  }

  /**
   * 获取分支统计信息
   */
  function getBranchStats(): BranchStats {
    const totalBranches = branches.value.length
    const activeBranches = branches.value.filter(b => b.isActive).length
    const totalCheckpoints = checkpoints.value.length

    // 已合并分支：存在于检查点中但分支本身已被删除的 branchId
    const existingBranchIds = new Set(branches.value.map(b => b.id))
    const checkpointBranchIds = new Set(checkpoints.value.map(cp => cp.branchId))
    const mergedBranches = [...checkpointBranchIds].filter(id => !existingBranchIds.has(id)).length

    // 分支最大深度
    let branchingDepth = 0
    for (const b of branches.value) {
      const depth = getBranchDepth(b.id)
      if (depth > branchingDepth) branchingDepth = depth
    }

    return {
      totalBranches,
      activeBranches,
      mergedBranches,
      totalCheckpoints,
      branchingDepth,
    }
  }

  // ============================================================
  //  可视化辅助
  // ============================================================

  /**
   * 获取分支颜色
   */
  function getBranchColor(branchId: string): string | undefined {
    return branches.value.find(b => b.id === branchId)?.color
  }

  /**
   * 获取分支在树中的深度（0 为根）
   */
  function getBranchDepth(branchId: string): number {
    let depth = 0
    let currentId: string | undefined = branchId

    while (currentId) {
      const branch = branches.value.find(b => b.id === currentId)
      if (!branch) break
      if (branch.parentBranchId) {
        depth++
        currentId = branch.parentBranchId
      } else {
        break
      }
    }

    return depth
  }

  /**
   * 检查分支是否可以合并回父分支
   * 条件：有父分支、非活跃分支、父分支仍然存在
   */
  function canMerge(branchId: string): boolean {
    const branch = branches.value.find(b => b.id === branchId)
    if (!branch) return false
    if (!branch.parentBranchId) return false
    if (branch.isActive) return false

    const parent = branches.value.find(b => b.id === branch.parentBranchId)
    return !!parent
  }

  /**
   * 获取指定分支的所有子分支
   */
  function getChildBranches(branchId: string): WorldBranch[] {
    return branches.value.filter(b => b.parentBranchId === branchId)
  }

  // ============================================================
  //  导出当前世界状态
  // ============================================================

  /**
   * 获取当前完整的世界状态
   */
  function getState(): ParallelWorldState {
    return {
      branches: branches.value,
      checkpoints: checkpoints.value,
      activeBranchId: activeBranchId.value,
      snapshots: snapshots.value,
    }
  }

  // ---- 自动初始化 ----

  load()

  // ============================================================
  //  返回
  // ============================================================

  return {
    // 状态
    branches,
    checkpoints,
    activeBranchId,
    snapshots,
    activeBranch,
    trunkBranch,

    // 分支管理
    createBranch,
    switchBranch,
    mergeBranch,
    deleteBranch,
    renameBranch,

    // 检查点管理
    createCheckpoint,
    deleteCheckpoint,
    getCheckpointsForBranch,
    updateCheckpoint,

    // 快照
    takeSnapshot,
    restoreSnapshot,
    getSnapshots,

    // 导航
    getBranchPath,
    getBranchTree,
    getBranchStats,
    getChildBranches,

    // 可视化辅助
    getBranchColor,
    getBranchDepth,
    canMerge,

    // 持久化
    load,
    persistAll,

    // 状态导出
    getState,
  }
}