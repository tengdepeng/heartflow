// ============================================================
// 羁绊之厅 · 关系网络图 + 家脉全图 + 留座
// 蓝图定义：
//   关系网络图：节点=人物，连线=关系，强度=亲密度+联系频率
//   家脉全图：以自己为中心的三代家谱
//   留座：已逝者/失联者在关系网中保留位置
//   逝者处理：标记为逝者，柔和显示，保留回忆
// ============================================================

import type { Person } from './types'

// ---- 关系类型 ----

export type RelationType = 'family' | 'lover' | 'friend' | 'colleague' | 'mentor' | 'other'

export const RELATION_LABELS: Record<RelationType, string> = {
  family: '家人',
  lover: '恋人',
  friend: '朋友',
  colleague: '同事',
  mentor: '导师',
  other: '其他',
}

export const RELATION_COLORS: Record<RelationType, string> = {
  family: '#d98c7a',
  lover: '#f0c040',
  friend: '#8a9a7a',
  colleague: '#6b9fc4',
  mentor: '#e0a96d',
  other: '#a07c8c',
}

// ---- 关系网络图 ----

export interface NetworkNode {
  id: string
  name: string
  relation: RelationType
  closeness: number
  /** 是否已逝 */
  isDeceased: boolean
  /** 是否留座（失联/逝者保留位置） */
  isSeat: boolean
  /** 节点的 x, y 坐标（力导向布局） */
  x: number
  y: number
  /** 节点大小 */
  size: number
  /** 颜色 */
  color: string
  /** 留座原因 */
  seatReason?: string
}

export interface NetworkEdge {
  sourceId: string
  targetId: string
  /** 连线强度 */
  strength: number
  /** 连线颜色 */
  color: string
  /** 连线标签 */
  label?: string
}

export interface RelationNetwork {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
  /** 中心节点（自己） */
  center: NetworkNode
}

/** 构建关系网络图 */
export function buildRelationNetwork(persons: Person[]): RelationNetwork {
  const nodes: NetworkNode[] = []
  const edges: NetworkEdge[] = []

  // 中心节点：自己
  const center: NetworkNode = {
    id: 'self',
    name: '我',
    relation: 'other',
    closeness: 1,
    isDeceased: false,
    isSeat: false,
    x: 0.5,
    y: 0.5,
    size: 24,
    color: '#ffffff',
  }

  for (const p of persons) {
    const isDeceased = p.deceased ?? false
    const isSeat = p.isSeat ?? false

    nodes.push({
      id: p.id,
      name: p.name,
      relation: p.relation,
      closeness: p.closeness ?? 0.5,
      isDeceased,
      isSeat,
      x: 0.5 + Math.cos(nodes.length * 1.2) * 0.3,
      y: 0.5 + Math.sin(nodes.length * 1.2) * 0.3,
      size: isDeceased ? 12 : 16,
      color: RELATION_COLORS[p.relation],
      seatReason: p.seatReason,
    })

    // 连线：自己 → 每个人
    edges.push({
      sourceId: 'self',
      targetId: p.id,
      strength: (p.closeness ?? 0.5) * (isDeceased ? 0.3 : 1),
      color: isDeceased ? 'rgba(255,255,255,0.15)' : RELATION_COLORS[p.relation],
      label: p.relation === 'lover' ? '恋人' : p.relation === 'family' ? '家人' : undefined,
    })
  }

  // 人物间连线：同标签自动关联
  for (let i = 0; i < persons.length; i++) {
    for (let j = i + 1; j < persons.length; j++) {
      const a = persons[i]
      const b = persons[j]
      if (a.tags && b.tags) {
        const sharedTags = a.tags.filter(t => b.tags!.includes(t))
        if (sharedTags.length > 0) {
          edges.push({
            sourceId: a.id,
            targetId: b.id,
            strength: 0.3,
            color: 'rgba(255,255,255,0.1)',
            label: sharedTags[0],
          })
        }
      }
    }
  }

  return { nodes, edges, center }
}

// ---- 家脉全图 ----

export interface FamilyNode {
  id: string
  /** 填充真实人物 ID，或临时节点 */
  personId?: string
  name: string
  /** 代际（0=自己，1=父母/子女，-1=子女，2=祖父母，-2=孙辈） */
  generation: number
  /** 角色：self/father/mother/spouse/child/sibling/grandparent/grandchild */
  role: FamilyRole
  /** 是否已逝 */
  isDeceased: boolean
  /** 是否留座 */
  isSeat: boolean
  /** 性别 */
  gender?: 'male' | 'female'
  /** 配偶 */
  spouseId?: string
  /** 父节点 */
  fatherId?: string
  /** 母节点 */
  motherId?: string
}

export type FamilyRole =
  | 'self'
  | 'father' | 'mother'
  | 'spouse'
  | 'child' | 'son' | 'daughter'
  | 'sibling' | 'brother' | 'sister'
  | 'grandfather' | 'grandmother'
  | 'grandchild'
  | 'uncle' | 'aunt'
  | 'cousin'
  | 'other'

export interface FamilyTree {
  nodes: FamilyNode[]
  /** 自己 */
  self: FamilyNode
  /** 按代际分组 */
  byGeneration: Map<number, FamilyNode[]>
}

/** 创建家脉全图基础结构 */
export function createFamilyTree(persons: Person[]): FamilyTree {
  const nodes: FamilyNode[] = []
  const familyPersons = persons.filter(p => p.relation === 'family')

  // 自己
  const self: FamilyNode = {
    id: 'self',
    name: '我',
    generation: 0,
    role: 'self',
    isDeceased: false,
    isSeat: false,
  }
  nodes.push(self)

  // 家人映射
  for (const p of familyPersons) {
    const fn = createFamilyNodeFromPerson(p)
    nodes.push(fn)
  }

  // 按代际分组
  const byGeneration = new Map<number, FamilyNode[]>()
  for (const n of nodes) {
    if (!byGeneration.has(n.generation)) byGeneration.set(n.generation, [])
    byGeneration.get(n.generation)!.push(n)
  }

  return { nodes, self, byGeneration }
}

/** 从人物创建家脉节点 */
function createFamilyNodeFromPerson(p: Person): FamilyNode {
  let role: FamilyRole = 'other'
  let generation = 0

  // 根据标签推断角色
  if (p.tags) {
    const tagSet = new Set(p.tags.map(t => t.toLowerCase()))
    if (tagSet.has('父亲') || tagSet.has('爸爸') || tagSet.has('父')) { role = 'father'; generation = 1 }
    else if (tagSet.has('母亲') || tagSet.has('妈妈') || tagSet.has('母')) { role = 'mother'; generation = 1 }
    else if (tagSet.has('配偶') || tagSet.has('妻子') || tagSet.has('丈夫') || tagSet.has('伴侣')) { role = 'spouse'; generation = 0 }
    else if (tagSet.has('儿子') || tagSet.has('儿子')) { role = 'son'; generation = -1 }
    else if (tagSet.has('女儿')) { role = 'daughter'; generation = -1 }
    else if (tagSet.has('孩子') || tagSet.has('子女')) { role = 'child'; generation = -1 }
    else if (tagSet.has('兄弟') || tagSet.has('哥哥') || tagSet.has('弟弟')) { role = 'brother'; generation = 0 }
    else if (tagSet.has('姐妹') || tagSet.has('姐姐') || tagSet.has('妹妹')) { role = 'sister'; generation = 0 }
    else if (tagSet.has('爷爷') || tagSet.has('祖父')) { role = 'grandfather'; generation = 2 }
    else if (tagSet.has('奶奶') || tagSet.has('祖母')) { role = 'grandmother'; generation = 2 }
    else if (tagSet.has('孙子') || tagSet.has('孙女')) { role = 'grandchild'; generation = -2 }
    else if (tagSet.has('家人') || tagSet.has('亲属')) { role = 'other'; generation = 0 }
  }

  return {
    id: p.id,
    personId: p.id,
    name: p.name,
    generation,
    role,
    isDeceased: p.deceased ?? false,
    isSeat: p.isSeat ?? false,
    gender: (p.tags && p.tags.some(t => t.includes('女'))) ? 'female' : 'male',
  }
}

// ---- 留座与逝者 ----

export interface MemorialSeat extends Person {
  /** 留座原因 */
  reason: 'deceased' | 'lost_contact' | 'distance' | 'other'
  /** 最后一次联系时间 */
  lastContact: string | null
  /** 纪念文字 */
  memorial?: string
  /** 留座时间 */
  seattedAt: string
}

/** 创建留座 */
export function createMemorialSeat(
  name: string,
  reason: MemorialSeat['reason'],
  memorial?: string,
): MemorialSeat {
  const now = new Date().toISOString()
  return {
    id: `seat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    relation: 'other',
    tags: [],
    notes: '',
    color: '#555',
    importantDates: [],
    lastContact: null,
    isSeat: true,
    reason,
    seatReason: reason,
    memorial,
    seattedAt: now,
    deceased: reason === 'deceased',
    closeness: 0.8,
    createdAt: now,
    updatedAt: now,
  }
}

/** 标记人物为逝者 */
export function markAsDeceased(person: Person, memorial?: string): Person {
  return {
    ...person,
    deceased: true,
    isSeat: true,
    seatReason: 'deceased',
    memorial,
    updatedAt: new Date().toISOString(),
  }
}

// ---- 关系网络统计 ----

export interface NetworkStats {
  total: number
  byRelation: { type: RelationType; count: number }[]
  deceased: number
  seats: number
  avgCloseness: number
  /** 最近联系天数 */
  daysSinceLastContact: number
}

/** 计算关系网络统计 */
export function computeNetworkStats(persons: Person[]): NetworkStats {
  const byRelation = new Map<RelationType, number>()
  let closenessSum = 0
  let minDaysSinceContact = Infinity

  const now = new Date()

  for (const p of persons) {
    byRelation.set(p.relation, (byRelation.get(p.relation) || 0) + 1)
    closenessSum += p.closeness ?? 0.5

    if (p.lastContact) {
      const days = Math.floor((now.getTime() - new Date(p.lastContact).getTime()) / 86400000)
      if (days < minDaysSinceContact) minDaysSinceContact = days
    }
  }

  return {
    total: persons.length,
    byRelation: Array.from(byRelation.entries()).map(([type, count]) => ({ type, count })),
    deceased: persons.filter(p => p.deceased).length,
    seats: persons.filter(p => p.isSeat).length,
    avgCloseness: persons.length > 0 ? closenessSum / persons.length : 0,
    daysSinceLastContact: minDaysSinceContact === Infinity ? -1 : minDaysSinceContact,
  }
}