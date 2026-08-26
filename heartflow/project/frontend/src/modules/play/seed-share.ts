// ============================================================
// 逸趣阁 · 时间种子分享与遗传
// 蓝图定义：
//   种子分享：将时间种子导出为可传输格式
//   种子遗传：跨代/跨用户传递，记录遗传谱系
//   种子图谱：可视化种子间的关系
// ============================================================

import type { TimeSeed, SeedRarity } from './time-seed'
import { SEED_RARITY_LABELS, SEED_RARITY_COLORS, computeSeedStats } from './time-seed'
import { assertShareLocalOnly } from '../share/share-local'

// ---- 种子分享 ----

/** 种子分享格式 */
export interface SeedSharePayload {
  version: '1.0'
  seed: ExportedSeed
  signature: string
  exportedAt: string
}

/** 导出的种子数据（精简版，不含内部状态） */
export interface ExportedSeed {
  name: string
  source: string
  timestamp: string
  emotion: number
  tags: string[]
  description: string
  rarity: SeedRarity
  /** 原始种子 ID（用于追溯） */
  originId: string
}

/** 将种子导出为分享格式 */
export function exportSeed(seed: TimeSeed): SeedSharePayload {
  // 第43条本地边界：种子分享仅限本地文件，拦截任何云端目标
  assertShareLocalOnly('local')
  const exported: ExportedSeed = {
    name: seed.name,
    source: seed.source,
    timestamp: seed.timestamp,
    emotion: seed.emotion,
    tags: [...seed.tags],
    description: seed.description,
    rarity: seed.rarity,
    originId: seed.id,
  }

  return {
    version: '1.0',
    seed: exported,
    signature: generateSignature(exported),
    exportedAt: new Date().toISOString(),
  }
}

/** 从分享格式导入种子 */
export function importSeed(payload: SeedSharePayload): TimeSeed | null {
  if (!validateSignature(payload)) return null
  if (payload.version !== '1.0') return null

  const { seed: exported } = payload
  return {
    id: `imported_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: exported.name,
    source: exported.source as TimeSeed['source'],
    sourceId: exported.originId,
    timestamp: exported.timestamp,
    emotion: exported.emotion,
    tags: [...exported.tags, '导入'],
    inherited: false,
    description: exported.description,
    rarity: exported.rarity,
    createdAt: new Date().toISOString(),
  }
}

/** 将种子导出为 JSON 字符串 */
export function stringifySeed(seed: TimeSeed): string {
  return JSON.stringify(exportSeed(seed))
}

/** 从 JSON 字符串导入种子 */
export function parseSeed(json: string): TimeSeed | null {
  try {
    const payload = JSON.parse(json) as SeedSharePayload
    return importSeed(payload)
  } catch {
    return null
  }
}

// ---- 签名验证 ----

function generateSignature(seed: ExportedSeed): string {
  const data = `${seed.originId}:${seed.name}:${seed.timestamp}:${seed.rarity}`
  // 简单哈希（生产环境应使用 HMAC）
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

function validateSignature(payload: SeedSharePayload): boolean {
  const expected = generateSignature(payload.seed)
  return expected === payload.signature
}

// ---- 种子遗传谱系 ----

/** 遗传记录 */
export interface InheritanceRecord {
  id: string
  /** 源种子 ID */
  sourceSeedId: string
  /** 目标种子 ID */
  targetSeedId: string
  /** 遗传代际 */
  generation: number
  /** 遗传时间 */
  timestamp: string
  /** 遗传方式 */
  method: 'direct' | 'cross' | 'mutation'
  /** 遗传备注 */
  note?: string
}

/** 遗传谱系 */
export interface InheritanceLineage {
  /** 根种子 */
  root: TimeSeed
  /** 遗传记录 */
  records: InheritanceRecord[]
  /** 所有后代 */
  descendants: TimeSeed[]
  /** 代数 */
  depth: number
}

/** 创建遗传记录 */
export function createInheritance(
  sourceSeed: TimeSeed,
  targetSeed: TimeSeed,
  method: InheritanceRecord['method'] = 'direct',
  note?: string,
): InheritanceRecord {
  return {
    id: `inheritance_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    sourceSeedId: sourceSeed.id,
    targetSeedId: targetSeed.id,
    generation: 1, // 由调用方设置
    timestamp: new Date().toISOString(),
    method,
    note,
  }
}

/** 构建遗传谱系 */
export function buildLineage(
  rootSeed: TimeSeed,
  allSeeds: TimeSeed[],
  allRecords: InheritanceRecord[],
): InheritanceLineage {
  const descendants: TimeSeed[] = []
  const records: InheritanceRecord[] = []
  let depth = 0

  // BFS 遍历遗传树
  const queue: { seedId: string; generation: number }[] = [{ seedId: rootSeed.id, generation: 0 }]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (visited.has(current.seedId)) continue
    visited.add(current.seedId)

    const childRecords = allRecords.filter(r => r.sourceSeedId === current.seedId)
    for (const record of childRecords) {
      records.push(record)
      const child = allSeeds.find(s => s.id === record.targetSeedId)
      if (child) {
        descendants.push(child)
        queue.push({ seedId: child.id, generation: current.generation + 1 })
      }
    }

    depth = Math.max(depth, current.generation)
  }

  return {
    root: rootSeed,
    records,
    descendants,
    depth,
  }
}

// ---- 种子图谱 ----

/** 种子图谱节点 */
export interface SeedGraphNode {
  id: string
  name: string
  rarity: SeedRarity
  color: string
  /** 连接数 */
  degree: number
  /** 是否为根节点 */
  isRoot: boolean
}

/** 种子图谱边 */
export interface SeedGraphEdge {
  source: string
  target: string
  type: 'generation' | 'similarity' | 'tag'
  weight: number
}

/** 种子图谱 */
export interface SeedGraph {
  nodes: SeedGraphNode[]
  edges: SeedGraphEdge[]
}

/** 构建种子图谱（基于标签相似度） */
export function buildSeedGraph(seeds: TimeSeed[]): SeedGraph {
  const nodes: SeedGraphNode[] = seeds.map(s => ({
    id: s.id,
    name: s.name,
    rarity: s.rarity,
    color: SEED_RARITY_COLORS[s.rarity],
    degree: 0,
    isRoot: s.rarity === 'legendary',
  }))

  const edges: SeedGraphEdge[] = []
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // 基于标签相似度连线
  for (let i = 0; i < seeds.length; i++) {
    for (let j = i + 1; j < seeds.length; j++) {
      const a = seeds[i]
      const b = seeds[j]
      const commonTags = a.tags.filter(t => b.tags.includes(t))
      if (commonTags.length > 0) {
        const weight = commonTags.length / Math.max(a.tags.length, b.tags.length)
        edges.push({
          source: a.id,
          target: b.id,
          type: 'tag',
          weight: Math.round(weight * 100) / 100,
        })
        const na = nodeMap.get(a.id)
        const nb = nodeMap.get(b.id)
        if (na) na.degree++
        if (nb) nb.degree++
      }
    }
  }

  return { nodes, edges }
}

/** 种子图谱摘要 */
export interface SeedGraphSummary {
  nodeCount: number
  edgeCount: number
  rootCount: number
  maxDegree: number
  avgDegree: number
  /** 按稀有度分布 */
  rarityDistribution: { rarity: SeedRarity; label: string; count: number }[]
  /** 最连接的种子 */
  mostConnected: { id: string; name: string; degree: number }[]
}

/** 计算图谱摘要 */
export function computeGraphSummary(graph: SeedGraph): SeedGraphSummary {
  const { nodes, edges } = graph

  const rarityDist = ['common', 'rare', 'epic', 'legendary'].map(r => ({
    rarity: r as SeedRarity,
    label: SEED_RARITY_LABELS[r as SeedRarity],
    count: nodes.filter(n => n.rarity === r).length,
  }))

  const sorted = [...nodes].sort((a, b) => b.degree - a.degree)

  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    rootCount: nodes.filter(n => n.isRoot).length,
    maxDegree: sorted.length > 0 ? sorted[0].degree : 0,
    avgDegree: nodes.length > 0
      ? Math.round(nodes.reduce((s, n) => s + n.degree, 0) / nodes.length * 100) / 100
      : 0,
    rarityDistribution: rarityDist,
    mostConnected: sorted.slice(0, 5).map(n => ({ id: n.id, name: n.name, degree: n.degree })),
  }
}

// ---- 种子集合操作 ----

/** 合并两个种子集合 */
export function mergeSeedCollections(
  local: TimeSeed[],
  imported: TimeSeed[],
): { merged: TimeSeed[]; newCount: number; duplicateCount: number } {
  const existingIds = new Set(local.map(s => s.id))
  let newCount = 0
  let duplicateCount = 0

  const merged = [...local]
  for (const seed of imported) {
    if (existingIds.has(seed.id)) {
      duplicateCount++
    } else {
      merged.push(seed)
      newCount++
    }
  }

  return { merged, newCount, duplicateCount }
}

/** 按稀有度过滤种子 */
export function filterByRarity(seeds: TimeSeed[], minRarity: SeedRarity): TimeSeed[] {
  const rarityOrder: SeedRarity[] = ['common', 'rare', 'epic', 'legendary']
  const minIndex = rarityOrder.indexOf(minRarity)
  return seeds.filter(s => rarityOrder.indexOf(s.rarity) >= minIndex)
}

/** 搜索种子 */
export function searchSeeds(seeds: TimeSeed[], query: string): TimeSeed[] {
  if (!query.trim()) return seeds
  const lower = query.toLowerCase()
  return seeds.filter(s =>
    s.name.toLowerCase().includes(lower) ||
    s.description.toLowerCase().includes(lower) ||
    s.tags.some(t => t.toLowerCase().includes(lower)),
  )
}

// 重新导出
export { SEED_RARITY_LABELS, SEED_RARITY_COLORS, computeSeedStats }