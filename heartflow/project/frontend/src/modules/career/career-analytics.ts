// ============================================================
// 业脉 · 业脉档案分析引擎（career-analytics）
// 从每一位联系人、每一段连接与每一个项目，读出「业脉」的脉络。
// 档案概览、圈层分布、类型分布、亲密度分档、项目状态、业脉健康、温和洞察。
// 全纯函数、本地计算、零网络出口。
// 顺着「业脉」蓝图：关系网络是职业的根系，记得与经营皆有迹可循。
// ============================================================

import type {
  CareerContact,
  CareerProject,
  CareerConnection,
  NodeTypeId,
  ProjectStatus,
} from './career'

function clamp(n: number, lo = 0, hi = 100): number {
  if (!isFinite(n)) return lo
  return Math.max(lo, Math.min(hi, n))
}

// ---- 元数据（本地，避免与视图层存储键耦合）----

type TierKey = CareerContact['tier']

export const CAREER_TIER_META: Record<TierKey, { label: string; color: string }> = {
  core: { label: '核心圈', color: '#c46a5a' },
  active: { label: '活跃圈', color: '#f0c040' },
  extended: { label: '扩展圈', color: '#6b9fc4' },
  edge: { label: '边缘圈', color: '#94a3b8' },
}

export const CAREER_NODE_META: Record<NodeTypeId, { label: string; icon: string; color: string }> = {
  mentor: { label: '导师', icon: '⭐', color: '#f0c040' },
  colleague: { label: '同事', icon: '👥', color: '#6b9fc4' },
  superior: { label: '上级', icon: '👆', color: '#c46a5a' },
  subordinate: { label: '下属', icon: '👇', color: '#8a9a7a' },
  client: { label: '客户', icon: '🤝', color: '#e0a96d' },
  partner: { label: '合作', icon: '🔗', color: '#a07c8c' },
  peer: { label: '同行', icon: '👤', color: '#5ab8a0' },
  friend: { label: '朋友', icon: '💚', color: '#d98c7a' },
  vendor: { label: '供应商', icon: '📦', color: '#e0a96d' },
  investor: { label: '投资人', icon: '💰', color: '#8a9a7a' },
  alumni: { label: '校友', icon: '🎓', color: '#a08ac4' },
}

export const CAREER_CONN_META: Record<CareerConnection['type'], { label: string; color: string; icon: string }> = {
  strong: { label: '紧密', color: '#e8b0a0', icon: '🧿' },
  medium: { label: '稳定', color: '#f0d080', icon: '🕸' },
  weak: { label: '弱连接', color: '#a8b8c8', icon: '🌫' },
  collaboration: { label: '协作', color: '#6b9fc4', icon: '🤝' },
  referral: { label: '引荐', color: '#8a9a7a', icon: '🔗' },
  mentorship: { label: '指导', color: '#f0c040', icon: '📖' },
}

export const CAREER_PROJECT_META: Record<ProjectStatus, { label: string; color: string }> = {
  active: { label: '进行中', color: '#7ab87a' },
  completed: { label: '已完成', color: '#6b9fc4' },
  paused: { label: '暂停', color: '#c4a060' },
  planning: { label: '规划中', color: '#a08ac4' },
}

// ---- 档案概览 ----

export interface CareerOverview {
  /** 联系人总数 */
  totalContacts: number
  /** 项目总数 */
  totalProjects: number
  /** 连接总数 */
  totalConnections: number
  /** 核心圈人数 */
  coreContacts: number
  /** 进行中的项目 */
  activeProjects: number
  /** 已完成的项目 */
  completedProjects: number
  /** 平均亲密度 1-10 */
  avgAffinity: number
  /** 平均每人连接数（网络密度） */
  avgConnectionsPerContact: number
  /** 最亲近 / 关系最强的一位联系人 */
  closest: { name: string; role: string; affinity: number } | null
}

export function careerOverview(
  contacts: CareerContact[],
  projects: CareerProject[],
  connections: CareerConnection[],
): CareerOverview {
  const total = contacts.length
  let core = 0
  let affinitySum = 0
  let closest: { name: string; role: string; affinity: number } | null = null
  for (const c of contacts) {
    if (c.tier === 'core') core++
    affinitySum += c.affinity ?? 0
    const a = c.affinity ?? 0
    if (!closest || a > closest.affinity) closest = { name: c.name, role: c.role, affinity: a }
  }
  const active = projects.filter((p) => p.status === 'active').length
  const completed = projects.filter((p) => p.status === 'completed').length

  return {
    totalContacts: total,
    totalProjects: projects.length,
    totalConnections: connections.length,
    coreContacts: core,
    activeProjects: active,
    completedProjects: completed,
    avgAffinity: total ? Math.round((affinitySum / total) * 10) / 10 : 0,
    avgConnectionsPerContact: total ? Math.round((connections.length / total) * 10) / 10 : 0,
    closest,
  }
}

// ---- 圈层分布 ----

export interface CareerRow {
  key: string
  label: string
  color: string
  /** 图标（节点类型分布用） */
  icon?: string
  count: number
  /** 占比 0-100 */
  pct: number
}

const TIER_ORDER: TierKey[] = ['core', 'active', 'extended', 'edge']

export function careerTierRows(contacts: CareerContact[]): CareerRow[] {
  const total = contacts.length || 1
  return TIER_ORDER.map((tier) => {
    const count = contacts.filter((c) => c.tier === tier).length
    return { key: tier, ...CAREER_TIER_META[tier], count, pct: Math.round((count / total) * 100) }
  })
}

// ---- 节点类型分布（按人数降序）----

const NODE_ORDER: NodeTypeId[] = [
  'mentor', 'colleague', 'superior', 'subordinate', 'client',
  'partner', 'peer', 'friend', 'vendor', 'investor', 'alumni',
]

export function careerNodeRows(contacts: CareerContact[], top = 8): CareerRow[] {
  const total = contacts.length || 1
  const rows = NODE_ORDER
    .map((key) => {
      const count = contacts.filter((c) => c.nodeType === key).length
      return { key, ...CAREER_NODE_META[key], count, pct: Math.round((count / total) * 100) }
    })
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
  return rows
}

// ---- 亲密度分档 ----

export interface AffinityBuckets {
  high: CareerRow   // 8-10
  mid: CareerRow    // 5-7
  low: CareerRow    // 0-4
}

export function affinityBuckets(contacts: CareerContact[]): AffinityBuckets {
  const total = contacts.length || 1
  const count = (pred: (a: number) => boolean) => contacts.filter((c) => pred(c.affinity ?? 0)).length
  const high = count((a) => a >= 8)
  const mid = count((a) => a >= 5 && a < 8)
  const low = count((a) => a < 5)
  return {
    high: { key: 'high', label: '亲密', color: '#e8b0a0', count: high, pct: Math.round((high / total) * 100) },
    mid: { key: 'mid', label: '熟络', color: '#f0d080', count: mid, pct: Math.round((mid / total) * 100) },
    low: { key: 'low', label: '疏淡', color: '#a8b8c8', count: low, pct: Math.round((low / total) * 100) },
  }
}

// ---- 项目状态分布 ----

const STATUS_ORDER: ProjectStatus[] = ['active', 'completed', 'paused', 'planning']

export function careerStatusRows(projects: CareerProject[]): CareerRow[] {
  const total = projects.length || 1
  return STATUS_ORDER.map((status) => {
    const count = projects.filter((p) => p.status === status).length
    return { key: status, ...CAREER_PROJECT_META[status], count, pct: Math.round((count / total) * 100) }
  })
}

// ---- 连接类型分布 ----

const CONN_ORDER: CareerConnection['type'][] = [
  'strong', 'medium', 'weak', 'collaboration', 'referral', 'mentorship',
]

export function careerConnRows(connections: CareerConnection[]): CareerRow[] {
  const total = connections.length || 1
  return CONN_ORDER.map((type) => {
    const count = connections.filter((c) => c.type === type).length
    return { key: type, ...CAREER_CONN_META[type], count, pct: Math.round((count / total) * 100) }
  })
}

// ---- 业脉健康（0-100）----

export interface CareerHealth {
  /** 0-100 业脉的繁茂程度 */
  score: number
  /** 广度（圈层与角色多寡）0-100 */
  breadth: number
  /** 深度（平均亲密度与强纽带占比）0-100 */
  depth: number
  /** 活力（在途项目与网络密度）0-100 */
  vitality: number
  label: string
}

export function careerHealth(
  contacts: CareerContact[],
  projects: CareerProject[],
  connections: CareerConnection[],
): CareerHealth {
  // 广度：圈层覆盖 + 角色多样
  const tiers = new Set(contacts.map((c) => c.tier)).size
  const types = new Set(contacts.map((c) => c.nodeType)).size
  const breadth = clamp(Math.round((tiers / 4) * 50 + (types / 11) * 50))

  // 深度：平均亲密度 + 核心/活跃圈占比
  const avgAffinity = contacts.length ? contacts.reduce((s, c) => s + (c.affinity ?? 0), 0) / contacts.length : 0
  const strongTies = contacts.length ? contacts.filter((c) => c.tier === 'core' || c.tier === 'active').length : 0
  const depth = clamp(Math.round((avgAffinity / 10) * 60 + (strongTies / Math.max(contacts.length, 1)) * 40))

  // 活力：在途项目占比 + 网络连接密度
  const activeRatio = projects.length ? projects.filter((p) => p.status === 'active').length / Math.max(projects.length, 1) : 0
  const density = contacts.length ? Math.min(connections.length / Math.max(contacts.length, 1), 2) / 2 : 0
  const vitality = clamp(Math.round(activeRatio * 55 + density * 45))

  const score = Math.round(breadth * 0.35 + depth * 0.35 + vitality * 0.3)
  const label =
    score >= 70 ? '业脉丰沛' : score >= 45 ? '枝繁叶茂' : score >= 20 ? '幼苗初成' : '荒芜待耕'

  return { score, breadth, depth, vitality, label }
}

// ---- 温和洞察 ----

export function careerInsights(
  contacts: CareerContact[],
  projects: CareerProject[],
  connections: CareerConnection[],
  limit = 4,
): string[] {
  if (contacts.length === 0 && projects.length === 0) {
    return ['业脉还是一片空白。记下一位伙伴，织上第一根关系的线。']
  }

  const out: string[] = []
  const ov = careerOverview(contacts, projects, connections)
  const health = careerHealth(contacts, projects, connections)
  const tiers = careerTierRows(contacts)
  const buckets = affinityBuckets(contacts)
  const statuses = careerStatusRows(projects)

  if (ov.totalContacts > 0 && ov.coreContacts === 0) {
    out.push('还没有一位「核心圈」伙伴，可以试着把最信任的人移入核心圈。')
  }
  if (buckets.low.count > 0) {
    out.push(`${buckets.low.count} 位联系人亲密度偏低，一次轻松的联系或许能重新点亮。`)
  }
  if (ov.avgConnectionsPerContact < 0.5 && ov.totalConnections > 0) {
    out.push('网络有些稀疏，平均每人不足半条连接，适合多牵几根线。')
  }

  const active = statuses.find((s) => s.key === 'active')
  if (active && active.count > 0) {
    out.push(`当前有 ${active.count} 个进行中的项目，正是枝繁叶茂之时。`)
  } else if (ov.totalProjects > 0) {
    const top = statuses.slice().sort((a, b) => b.count - a.count)[0]
    out.push(`当前项目多为「${top.label}」，可以歇口气，也别忘了再次出发。`)
  }

  const dominantTier = tiers.slice().sort((a, b) => b.count - a.count)[0]
  if (dominantTier && dominantTier.count > 0 && dominantTier.key !== 'core') {
    out.push(`人脉多聚在${dominantTier.label}，向核心圈再聚拢一些会更有力。`)
  }

  out.push(`近期业脉沉淀为「${health.label}」。`)

  return out.slice(0, limit)
}