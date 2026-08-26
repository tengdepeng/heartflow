// ============================================================
// 业脉 · 类型定义
// 职业路径可视化 + 人脉网络 + 项目追踪
// ============================================================

/** 圈层 */
export type NetworkTier = 'core' | 'active' | 'extended' | 'peripheral'

/** 节点类型 */
export type NodeType =
  | 'mentor' | 'colleague' | 'superior' | 'subordinate'
  | 'client' | 'partner' | 'peer' | 'friend'
  | 'supplier' | 'investor' | 'alumni'

/** 连接类型 */
export type ConnectionType =
  | 'collaboration' | 'mentorship' | 'referral' | 'friendship'
  | 'transaction' | 'alumni-relation'

/** 项目状态 */
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'planning'

/** 联系人 */
export interface Contact {
  id: string
  name: string
  role: string
  tier: NetworkTier
  nodeType: NodeType
  /** 亲密度 1-10 */
  affinity: number
  tags: string[]
  note?: string
  /** 首次联系时间 */
  firstContactAt: string
  /** 最后联系时间 */
  lastContactAt?: string
  /** 联系次数 */
  contactCount: number
}

/** 连接关系 */
export interface CareerConnection {
  id: string
  fromId: string
  toId: string
  type: ConnectionType
  description?: string
  /** 关系强度 1-10 */
  strength: number
  createdAt: string
}

/** 职业项目 */
export interface CareerProject {
  id: string
  name: string
  icon: string
  description: string
  color: string
  status: ProjectStatus
  statusLabel: string
  partners: string[] // Contact IDs
  startDate: string
  endDate?: string
}

/** 职位/角色 */
export interface CareerPosition {
  id: string
  title: string
  organization: string
  startDate: string
  endDate?: string
  description: string
  /** 技能收获 */
  skills: string[]
  /** 关键成就 */
  achievements: string[]
}

/** 职业路径节点 */
export interface CareerPathNode {
  id: string
  position: CareerPosition
  /** 在路径中的位置 */
  level: number
  /** 父节点 ID */
  parentId?: string
  /** 是否为关键转折点 */
  isPivot: boolean
}

/** 节点类型定义 */
export interface NodeTypeDef {
  id: NodeType
  name: string
  icon: string
  color: string
  shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'star'
}

/** 网络图节点 */
export interface NetworkNode {
  id: string
  contact: Contact
  x: number
  y: number
  radius: number
  color: string
  shape: string
}

/** 网络图边 */
export interface NetworkEdge {
  from: NetworkNode
  to: NetworkNode
  type: ConnectionType
  strength: number
}

/** 网络统计 */
export interface NetworkStats {
  totalContacts: number
  activeProjects: number
  /** 脉动指数：活跃度综合评分 */
  pulseIndex: number
  /** 各圈层分布 */
  tierDistribution: Record<NetworkTier, number>
  /** 各节点类型分布 */
  nodeTypeDistribution: Record<NodeType, number>
  /** 平均亲密度 */
  avgAffinity: number
  /** 最近联系的活跃度 */
  recentActivity: number
}

/** 存储键 */
export const CAREER_STORAGE_KEYS = {
  CONTACTS: 'career:contacts',
  PROJECTS: 'career:projects',
  CONNECTIONS: 'career:connections',
  POSITIONS: 'career:positions',
} as const

/** 圈层元数据 */
export const TIER_META: Record<NetworkTier, { label: string; color: string; radius: number; description: string }> = {
  core: { label: '核心圈', color: '#c46a5a', radius: 60, description: '最亲密、最信任的关系' },
  active: { label: '活跃圈', color: '#f0c040', radius: 120, description: '经常联系和合作的关系' },
  extended: { label: '扩展圈', color: '#6b9fc4', radius: 190, description: '认识但联系较少的关系' },
  peripheral: { label: '边缘圈', color: '#94a3b8', radius: 260, description: '仅有一面之缘或间接关系' },
}

/** 节点类型定义 */
export const NODE_TYPE_DEFS: NodeTypeDef[] = [
  { id: 'mentor', name: '导师', icon: '⭐', color: '#f0c040', shape: 'star' },
  { id: 'colleague', name: '同事', icon: '👥', color: '#6b9fc4', shape: 'circle' },
  { id: 'superior', name: '上级', icon: '👆', color: '#c46a5a', shape: 'triangle' },
  { id: 'subordinate', name: '下属', icon: '👇', color: '#8a9a7a', shape: 'triangle' },
  { id: 'client', name: '客户', icon: '🤝', color: '#e0a96d', shape: 'diamond' },
  { id: 'partner', name: '合作', icon: '🔗', color: '#a07c8c', shape: 'diamond' },
  { id: 'peer', name: '同行', icon: '👤', color: '#5ab8a0', shape: 'circle' },
  { id: 'friend', name: '朋友', icon: '💚', color: '#d98c7a', shape: 'hexagon' },
  { id: 'supplier', name: '供应商', icon: '📦', color: '#e0a96d', shape: 'square' },
  { id: 'investor', name: '投资人', icon: '💰', color: '#8a9a7a', shape: 'pentagon' },
  { id: 'alumni', name: '校友', icon: '🎓', color: '#e4e6ed', shape: 'circle' },
]

/** 连接类型元数据 */
export const CONNECTION_TYPE_META: Record<ConnectionType, { label: string; color: string; icon: string }> = {
  collaboration: { label: '协作', color: '#6b9fc4', icon: '🤝' },
  mentorship: { label: '指导', color: '#f0c040', icon: '📖' },
  referral: { label: '引荐', color: '#8a9a7a', icon: '🔗' },
  friendship: { label: '友谊', color: '#d98c7a', icon: '💚' },
  transaction: { label: '交易', color: '#e0a96d', icon: '💼' },
  'alumni-relation': { label: '校友', color: '#a07c8c', icon: '🎓' },
}