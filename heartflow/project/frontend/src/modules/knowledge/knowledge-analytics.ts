// ============================================================
// 经略阁 · 知识档案分析引擎
// 蓝图 P16「经略阁深度：知识图谱+七种展示+3D星图+本地AI管家」，
// 本引擎为"陈列而非叙事"的纯函数，只呈现客观指标与温和提示，
// 不做因果评判。接受 now 以保证时间可测试。
// 输入为经略阁核心数据：KNode 节点 + ImportSource 导入来源。
// ============================================================

import type { KNode, StarPositions } from './knowledge-tower'
import type { ImportSource } from './importer'
import { IMPORT_SOURCE_TYPES, IMPORT_SOURCE_LABELS, IMPORT_SOURCE_ICONS } from './importer'

export const KNOWLEDGE_CAT_LABELS: Record<string, string> = {
  concept: '概念',
  rule: '规则',
  frame: '框架',
  insight: '洞察',
  pitfall: '误区',
  metaphor: '隐喻',
}

// ---- 概览 ----

export interface KnowledgeOverview {
  nodeCount: number
  /** 含链接/入度的节点数 */
  linkedNodeCount: number
  /** 总链接数（边） */
  edgeCount: number
  /** 分类数 */
  categoryCount: number
  categories: { cat: string; label: string; count: number }[]
  /** 关联房间数（恒为 0，KNode 无 roomId 字段） */
  roomCount: number
  /** 近 30 天新增/更新的节点数（恒为 0，无时间戳） */
  recent30: number
  /** 平均每节点链接数 */
  avgDegree: number
}

export function knowledgeOverview(
  nodes: KNode[],
): KnowledgeOverview {
  const catMap = new Map<string, number>()
  let edges = 0
  let linked = 0

  const nodeTitles = new Set(nodes.map(n => n.id))

  for (const n of nodes) {
    catMap.set(n.cat, (catMap.get(n.cat) ?? 0) + 1)
    const e = (n.links || []).filter(id => nodeTitles.has(id)).length
    if (e > 0) linked++
    edges += e
    // KNode 无 createdAt/updatedAt 时间戳，故 recent30 恒为 0（不计时间）
  }

  const categories = Array.from(catMap.entries())
    .map(([cat, count]) => ({ cat, count, label: KNOWLEDGE_CAT_LABELS[cat] ?? cat }))
    .sort((a, b) => b.count - a.count)

  return {
    nodeCount: nodes.length,
    linkedNodeCount: linked,
    edgeCount: edges,
    categoryCount: categories.filter(c => c.count > 0).length,
    categories,
    roomCount: 0,
    recent30: 0,
    avgDegree: nodes.length ? Math.round((edges / nodes.length) * 10) / 10 : 0,
  }
}

// ---- 网络密度与孤岛 ----

export interface KnowledgeGraphShape {
  /** 连通率：有链接的节点占比 */
  connectivity: number
  /** 孤立点数量 */
  isolated: number
  /** 每节点平均边数 */
  density: number
  /** 最受关联节点 top（入度） */
  hubs: { id: string; title: string; degree: number }[]
}

export function knowledgeGraphShape(nodes: KNode[]): KnowledgeGraphShape {
  const nodeTitles = new Set(nodes.map(n => n.id))
  const degree = new Map<string, number>()
  let isolated = 0

  for (const n of nodes) {
    const e = (n.links || []).filter(id => nodeTitles.has(id)).length
    degree.set(n.id, e)
    if (e === 0) isolated++
  }

  const hubs = nodes
    .map(n => ({ id: n.id, title: n.title, degree: degree.get(n.id) ?? 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 3)

  return {
    connectivity: nodes.length ? Math.round((1 - isolated / nodes.length) * 100) : 0,
    isolated,
    density: nodes.length ? Math.round((degree.size / nodes.length) * 10) / 10 : 0,
    hubs,
  }
}

// ---- 导入来源 ----

export interface ImportOverview {
  total: number
  byType: { type: ImportSource['type']; label: string; icon: string; count: number }[]
  recent7: number
}

export function importOverview(
  sources: ImportSource[],
  now: number = Date.now(),
): ImportOverview {
  const typeMap = new Map<ImportSource['type'], number>()
  let recent7 = 0
  const cut = now - 7 * 86400000

  for (const s of sources) {
    typeMap.set(s.type, (typeMap.get(s.type) ?? 0) + 1)
    if (new Date(s.importedAt).getTime() >= cut) recent7++
  }

  const byType = IMPORT_SOURCE_TYPES.map(({ type }) => ({
    type,
    label: IMPORT_SOURCE_LABELS[type],
    icon: IMPORT_SOURCE_ICONS[type],
    count: typeMap.get(type) ?? 0,
  })).filter(t => t.count > 0)

  return { total: sources.length, byType, recent7 }
}

// ---- 温和提示（陈列式，非叙事） ----

export interface KnowledgeInsight {
  level: 'gentle'
  text: string
}

export function knowledgeInsights(
  overview: KnowledgeOverview,
  shape: KnowledgeGraphShape,
  imp: ImportOverview,
): KnowledgeInsight[] {
  const list: KnowledgeInsight[] = []
  if (overview.nodeCount === 0) {
    list.push({ level: 'gentle', text: '知识塔还空着，可从导入一本摘录或记下一条初识开始' })
    return list
  }
  if (shape.isolated > 0 && shape.isolated >= overview.nodeCount / 2) {
    list.push({ level: 'gentle', text: `有 ${shape.isolated} 个节点尚未彼此相连，尝试建立关联能看见更大的图谱` })
  }
  if (shape.hubs.length && shape.hubs[0].degree >= 3) {
    list.push({ level: 'gentle', text: `「${shape.hubs[0].title}」是枢纽节点，从它出发能触达较多分支` })
  }
  if (imp.total === 0) {
    list.push({ level: 'gentle', text: '还没有导入来源，网页摘录与书籍导入会自然融入图谱' })
  }
  return list
}

// ---- 星图位置（3D 已展开与否） ----

/** 已布局的星点数（用于判断星图是否已铺开） */
export function starLayoutProgress(positions: StarPositions, nodeCount: number): number {
  if (nodeCount === 0) return 0
  const placed = Object.keys(positions).length
  return Math.min(100, Math.round((placed / nodeCount) * 100))
}