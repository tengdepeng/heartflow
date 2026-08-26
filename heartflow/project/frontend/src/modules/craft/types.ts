// ============================================================
// 匠庐 · 作品类型定义
// ============================================================

export type WorkStatus = 'draft' | 'refining' | 'completed' | 'archived'
export type WorkType = 'writing' | 'code' | 'design' | 'plan' | 'insight'

export type LightFormId = 'warm' | 'cool' | 'crystal' | 'mist' | 'ember' | 'aurora' | 'jade' | 'gold' | 'void'

export interface EvolutionRecord {
  date: string
  evolution: number
  milestone?: string
}

export interface CraftWork {
  id: string
  name: string
  icon: string
  description: string
  color: string
  status: WorkStatus
  type: WorkType
  date: string
  evolution: number
  tags: string[]
  lightFormId?: LightFormId
  evolutionHistory?: EvolutionRecord[]
  createdAt: string
  updatedAt: string
}

export interface CraftStats {
  totalWorks: number
  byStatus: Record<WorkStatus, number>
  byType: Record<WorkType, number>
  averageEvolution: number
  totalCompleted: number
}

export const STATUS_LABEL: Record<WorkStatus, string> = {
  draft: '草稿',
  refining: '打磨中',
  completed: '已完成',
  archived: '归档',
}

export const TYPE_LABEL: Record<WorkType, string> = {
  writing: '写作',
  code: '代码',
  design: '设计',
  plan: '规划',
  insight: '洞见',
}