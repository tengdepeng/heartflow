// ============================================================
// 共鸣图谱 · 关联档案分析引擎（档案陈列，纯函数 + now 可测）
// 把跨域记录彼此相连的这张网，拢成一册安放；只呈现，不评判。
// ============================================================

import type {
  AssociationGraph,
  DomainKey,
  LinkType,
} from './types'

const DAY_MS = 24 * 60 * 60 * 1000

// ============================================================
// 域元数据
// ============================================================

export const DOMAIN_ARCHIVE_META: Record<DomainKey, { label: string; icon: string }> = {
  session: { label: '专注', icon: '⏳' },
  crystal: { label: '结晶', icon: '💎' },
  note: { label: '笔记', icon: '📝' },
  anchor: { label: '心锚', icon: '🧭' },
  relation: { label: '关系', icon: '🤝' },
  goal: { label: '目标', icon: '🎯' },
  emotion: { label: '情绪', icon: '🌊' },
  ledger: { label: '账本', icon: '📒' },
  carrier: { label: '载体', icon: '📿' },
  advisor: { label: '幕僚', icon: '🧑' },
}

export function archiveDomainLabel(d: DomainKey): string {
  return DOMAIN_ARCHIVE_META[d]?.label || d
}

export function archiveDomainIcon(d: DomainKey): string {
  return DOMAIN_ARCHIVE_META[d]?.icon || '🔗'
}

export const LINK_TYPE_META: Record<LinkType, { label: string; icon: string }> = {
  'shared-tag': { label: '共享标签', icon: '🏷' },
  'temporal-proximity': { label: '时间邻近', icon: '🕒' },
  'causal-order': { label: '因果顺序', icon: '➜' },
}

// 归一化的"域对"键（去方向）
function pairKey(a: string, b: string): string {
  return a < b ? `${a}·${b}` : `${b}·${a}`
}

// ============================================================
// 1. 关联档案概览
// ============================================================

export interface AssociationArchiveOverview {
  nodeCount: number
  linkCount: number
  domainCount: number
  sharedTagCount: number
  temporalCount: number
  causalCount: number
  avgStrength: number
  isolatedCount: number
  pairCount: number
  hubLabel: string
  hubDomain: string
  hubDegree: number
  recent30Links: number
}

export function associationArchiveOverview(graph: AssociationGraph, now: Date): AssociationArchiveOverview {
  const { nodes, links } = graph

  const nodeCount = nodes.length
  const linkCount = links.length

  const domainSet = new Set<DomainKey>()
  for (const n of nodes) domainSet.add(n.domain)
  const domainCount = domainSet.size

  let sharedTagCount = 0
  let temporalCount = 0
  let causalCount = 0
  let strengthSum = 0
  for (const l of links) {
    if (l.linkType === 'shared-tag') sharedTagCount++
    else if (l.linkType === 'temporal-proximity') temporalCount++
    else causalCount++
    strengthSum += l.strength
  }
  const avgStrength = linkCount > 0 ? Math.round((strengthSum / linkCount) * 100) / 100 : 0

  // 度（无向）
  const degree = new Map<string, number>()
  const domainOfNode = new Map<string, DomainKey>()
  const labelOfNode = new Map<string, string>()
  for (const n of nodes) {
    const key = `${n.domain}:${n.id}`
    degree.set(key, 0)
    domainOfNode.set(key, n.domain)
    labelOfNode.set(key, n.label)
  }
  const domainPairs = new Set<string>()
  for (const l of links) {
    const sk = `${l.sourceDomain}:${l.sourceId}`
    const tk = `${l.targetDomain}:${l.targetId}`
    degree.set(sk, (degree.get(sk) || 0) + 1)
    degree.set(tk, (degree.get(tk) || 0) + 1)
    domainPairs.add(pairKey(l.sourceDomain, l.targetDomain))
  }

  let hubKey = ''
  let hubDegree = 0
  let isolated = 0
  for (const [k, d] of degree) {
    if (d > hubDegree) { hubDegree = d; hubKey = k }
    if (d === 0) isolated++
  }

  const cutoff30 = now.getTime() - 30 * DAY_MS
  let recent30Links = 0
  for (const l of links) {
    const t = new Date(l.createdAt).getTime()
    if (!isNaN(t) && t >= cutoff30) recent30Links++
  }

  return {
    nodeCount,
    linkCount,
    domainCount,
    sharedTagCount,
    temporalCount,
    causalCount,
    avgStrength,
    isolatedCount: isolated,
    pairCount: domainPairs.size,
    hubLabel: hubKey ? labelOfNode.get(hubKey) || '' : '',
    hubDomain: hubKey ? domainOfNode.get(hubKey) || '' : '',
    hubDegree,
    recent30Links,
  }
}

// ============================================================
// 2. 关联类型分布
// ============================================================

export interface LinkTypeRow {
  type: LinkType
  label: string
  icon: string
  count: number
  percentage: number
}

export function linkTypeRows(graph: AssociationGraph): LinkTypeRow[] {
  const counts: Record<LinkType, number> = {
    'shared-tag': 0,
    'temporal-proximity': 0,
    'causal-order': 0,
  }
  for (const l of graph.links) counts[l.linkType] = (counts[l.linkType] || 0) + 1
  const total = graph.links.length
  return (Object.keys(LINK_TYPE_META) as LinkType[]).map(type => ({
    type,
    label: LINK_TYPE_META[type].label,
    icon: LINK_TYPE_META[type].icon,
    count: counts[type],
    percentage: total > 0 ? Math.round((counts[type] / total) * 100) : 0,
  }))
}

// ============================================================
// 3. 域对分布（哪两个域关联最密）
// ============================================================

export interface DomainPairRow {
  source: string
  target: string
  count: number
  percentage: number
}

export function domainPairRows(graph: AssociationGraph): DomainPairRow[] {
  const map = new Map<string, number>()
  for (const l of graph.links) {
    const key = pairKey(l.sourceDomain, l.targetDomain)
    map.set(key, (map.get(key) || 0) + 1)
  }
  const total = graph.links.length
  return [...map.entries()]
    .map(([key, count]) => {
      const [a, b] = key.split('·')
      return {
        source: archiveDomainLabel(a as DomainKey),
        target: archiveDomainLabel(b as DomainKey),
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }
    })
    .sort((x, y) => y.count - x.count)
}

// ============================================================
// 4. 图谱健康
// ============================================================

export interface AssociationArchiveHealth {
  score: number
  breadth: number
  density: number
  strength: number
  label: string
}

const HEALTH_LABELS = [
  { min: 80, label: '万物相连' },
  { min: 60, label: '织网渐成' },
  { min: 40, label: '初显轮廓' },
  { min: 0, label: '尚未织网' },
]

function healthLabel(score: number): string {
  for (const h of HEALTH_LABELS) if (score >= h.min) return h.label
  return HEALTH_LABELS[HEALTH_LABELS.length - 1].label
}

export function associationArchiveHealth(graph: AssociationGraph): AssociationArchiveHealth {
  const ov = associationArchiveOverview(graph, new Date())

  // 广度：涉域覆盖（全 10 域）
  const breadth = Math.min(100, Math.round((ov.domainCount / 10) * 100))

  // 密度：平均每个节点被多少条连线牵扯（0..~2 归一）
  const density = ov.nodeCount > 0
    ? Math.min(100, Math.round((ov.linkCount / ov.nodeCount) * 60))
    : 0

  // 强度：平均关联强度
  const strength = Math.min(100, Math.round(ov.avgStrength * 100))

  const score = Math.max(0, Math.min(100, Math.round(breadth * 0.34 + density * 0.33 + strength * 0.33)))
  return { score, breadth, density, strength, label: healthLabel(score) }
}

// ============================================================
// 5. 温和洞察
// ============================================================

export interface AssociationInsight {
  text: string
}

export function associationInsights(graph: AssociationGraph, now: Date): AssociationInsight[] {
  const out: AssociationInsight[] = []
  const ov = associationArchiveOverview(graph, now)

  if (ov.nodeCount === 0) {
    out.push({ text: '这张网还空着。当你在不同空间留下记录，它们之间的联系会在此慢慢织起。' })
    return out
  }

  if (ov.linkCount === 0) {
    out.push({ text: `已有 ${ov.domainCount} 个领域的 ${ov.nodeCount} 条记录，暂时还没有彼此相连——给它们贴上共有的标签，网便有了第一道丝。` })
    return out
  }

  if (ov.isolatedCount > 0) {
    out.push({ text: `有 ${ov.isolatedCount} 条记录暂居网外，像是未找到同伴的孤舟，静候被共同的标签牵起。` })
  }

  if (ov.hubDegree >= 4) {
    out.push({ text: `「${ov.hubLabel}」成了这张网最亮的枢纽，牵起了 ${ov.hubDegree} 条线。` })
  } else if (ov.domainCount >= 2) {
    out.push({ text: `力量散布在各处，${ov.domainCount} 个领域彼此相连，慢慢合成一张完整的网。` })
  }

  if (ov.sharedTagCount > 0) {
    out.push({ text: `共享标签牵起了 ${ov.sharedTagCount} 条线，是这张网最常用的一条经线。` })
  }

  if (ov.causalCount > 0) {
    out.push({ text: `${ov.causalCount} 段因果顺序，让先后的发生有了来龙去脉。` })
  }

  if (ov.recent30Links > 0) {
    out.push({ text: `近三十天里织出 ${ov.recent30Links} 条新连线，网仍在生长。` })
  }

  return out.slice(0, 4)
}