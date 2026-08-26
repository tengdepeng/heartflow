// ============================================================
// 平行世界 · 类型定义
// 蓝图：
//   分支管理、检查点系统、快照机制、可视化统计
// ============================================================

// ---- 分支 ----

export interface WorldBranch {
  /** 唯一标识 */
  id: string
  /** 分支名称 */
  name: string
  /** 分支描述 */
  description: string
  /** 分支颜色 */
  color: string
  /** 创建时间 */
  createdAt: string
  /** 父分支 ID（根分支无父分支） */
  parentBranchId?: string
  /** 是否为当前活跃分支 */
  isActive: boolean
  /** 检查点数量 */
  checkpointCount: number
  /** 分支权重（可视化引擎扩展字段） */
  weight?: number
  /** 关联事件列表（可视化引擎扩展字段） */
  events?: unknown[]
  /** 标签列表（可视化引擎扩展字段） */
  tags?: string[]
}

// ---- 检查点 ----

export interface Checkpoint {
  /** 唯一标识 */
  id: string
  /** 所属分支 ID */
  branchId: string
  /** 检查点标签 */
  label: string
  /** 检查点描述 */
  description: string
  /** 快照数据（可序列化的任意数据） */
  snapshot: Record<string, unknown>
  /** 创建时间 */
  createdAt: string
  /** 标签列表 */
  tags: string[]
}

// ---- 世界快照 ----

export interface WorldSnapshot {
  /** 快照时间戳 */
  timestamp: string
  /** 快照时活跃分支 ID */
  activeBranchId: string
  /** 快照时的分支数据 */
  branches: WorldBranch[]
  /** 快照元数据 */
  metadata: {
    /** 快照名称 */
    label: string
    /** 快照描述 */
    description?: string
    /** 快照时的总检查点数 */
    totalCheckpoints: number
  }
}

// ---- 统计 ----

export interface BranchStats {
  /** 总分枝数 */
  totalBranches: number
  /** 活跃分支数 */
  activeBranches: number
  /** 已合并分支数 */
  mergedBranches: number
  /** 总检查点数 */
  totalCheckpoints: number
  /** 分支最大深度 */
  branchingDepth: number
}

// ---- 世界状态 ----

export interface ParallelWorldState {
  /** 所有分支 */
  branches: WorldBranch[]
  /** 所有检查点 */
  checkpoints: Checkpoint[]
  /** 当前活跃分支 ID */
  activeBranchId: string
  /** 历史快照列表 */
  snapshots: WorldSnapshot[]
}

// ---- 分支颜色预设 ----

export interface BranchColorPreset {
  /** 颜色值 */
  value: string
  /** 颜色标签（中文） */
  label: string
  /** 颜色标签（英文） */
  labelEn: string
}

export const BRANCH_COLORS: BranchColorPreset[] = [
  { value: '#4A90D9', label: '蔚蓝', labelEn: 'Azure' },
  { value: '#7B68EE', label: '紫藤', labelEn: 'Wisteria' },
  { value: '#2E8B57', label: '海绿', labelEn: 'Sea Green' },
  { value: '#D2691E', label: '巧克力', labelEn: 'Chocolate' },
  { value: '#C71585', label: '深粉', labelEn: 'Deep Pink' },
  { value: '#4682B4', label: '钢蓝', labelEn: 'Steel Blue' },
  { value: '#B8860B', label: '暗金', labelEn: 'Dark Golden' },
  { value: '#6A5ACD', label: '石蓝', labelEn: 'Slate Blue' },
]

// ---- 存储键名 ----

export const PARALLEL_WORLD_STORAGE_KEYS = {
  BRANCHES: 'hf:parallel-world:branches',
  CHECKPOINTS: 'hf:parallel-world:checkpoints',
  SNAPSHOTS: 'hf:parallel-world:snapshots',
} as const