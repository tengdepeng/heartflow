// ============================================================
// 逐日心锚 · 类型定义
// ============================================================

export interface Anchor {
  id: string
  /** 锚点文本 */
  text: string
  /** 是否已完成 */
  done: boolean
  /** 目标日期（YYYY-MM-DD） */
  targetDate: string
  /** 创建时间 */
  createdAt: string
  /** 完成时间 */
  doneAt?: string
  /** 优先级: must=必锚, can=可锚, float=浮锚 */
  priority: 'must' | 'can' | 'float'
  /** 所处阶段：pool=锚点池，active=已安放 */
  stage?: 'pool' | 'active'
  /** 被推迟次数（自动漂移到明天的次数） */
  driftCount: number
  /** 标签列表 */
  tags?: string[]
  /** 分类/类别 */
  category?: string
  /** 备注/补充描述 */
  notes?: string
  /** 到期时间（HH:mm，可选） */
  dueTime?: string
}

export interface AnchorCategory {
  id: string
  name: string
  color: string
  icon: string
}

export const PRIORITY_LABELS: Record<Anchor['priority'], string> = {
  must: '必锚',
  can: '可锚',
  float: '浮锚',
}

export const PRIORITY_COLORS: Record<Anchor['priority'], string> = {
  must: '#f0c040',
  can: '#80b8d0',
  float: 'rgba(255,255,255,0.3)',
}
