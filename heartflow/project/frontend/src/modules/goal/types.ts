// ============================================================
// 留光阁 · 目标与计划类型
// 三层结构: 愿景 → 目标 → 计划
// ============================================================

export type GoalTier = 'vision' | 'target' | 'plan'

export type GoalStatus = 'seed' | 'sprout' | 'growing' | 'bloom' | 'dormant'

export interface Goal {
  id: string
  /** 标题 */
  title: string
  /** 描述 */
  description: string
  /** 层级 */
  tier: GoalTier
  /** 父目标 ID（plan → target, target → vision） */
  parentId?: string
  /** 生长状态 */
  status: GoalStatus
  /** 所属领域 */
  domain: 'work' | 'growth' | 'health' | 'relation' | 'wealth' | 'play' | 'other'
  /** 排序 */
  order: number
  createdAt: string
  updatedAt: string
  /** 完成时间（开花时） */
  completedAt?: string
  /** 进度锚点计数 */
  anchorCount: number
  /** 已完成锚点数 */
  anchorDone: number
}

export const DOMAIN_LABELS: Record<Goal['domain'], string> = {
  work: '工作',
  growth: '成长',
  health: '健康',
  relation: '关系',
  wealth: '财富',
  play: '逸趣',
  other: '其他',
}

export const DOMAIN_COLORS: Record<Goal['domain'], string> = {
  work: '#6b9fc4',
  growth: '#8a9a7a',
  health: '#d98c7a',
  relation: '#f0c040',
  wealth: '#e0a96d',
  play: '#5ab8a0',
  other: '#a07c8c',
}

export const STATUS_LABELS: Record<GoalStatus, string> = {
  seed: '种子',
  sprout: '发芽',
  growing: '生长中',
  bloom: '已开花',
  dormant: '休眠中',
}

// ================================================================
// 专项规划区 · 跨目标专项规划
// ================================================================

export interface Milestone {
  label: string
  done: boolean
}

export interface SpecialPlan {
  id: string
  title: string
  description: string
  relatedGoalIds: string[]
  milestones: Milestone[]
  createdAt: string
  updatedAt: string
}
