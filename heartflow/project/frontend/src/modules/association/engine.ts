// ============================================================
// 通用跨域关联引擎 · 实现
// 蓝图第三部分·第二层：把多域记录用「共享标签 / 时间邻近 / 因果顺序」
// 三种轻量启发式自动关联起来。纯前端、无 AI、只读存储。
// ============================================================

import { storage } from '../../engine/storage'
import type {
  NormalizedItem, DomainKey, CrossDomainLink, AssociationGraph, LinkType,
} from './types'

/** 时间邻近窗口（分钟）：超过此距离的条目不参与时间/因果关联 */
const TEMPORAL_WINDOW_MIN = 24 * 60

/** 统一时间访问器：把各域不统一的字段名归一化为 ms 时间戳 */
function getTime(domain: DomainKey, item: any): number {
  const fallbacks: Record<DomainKey, string[]> = {
    session: ['completedAt', 'startedAt'],
    crystal: ['createdAt'],
    note: ['updatedAt', 'createdAt'],
    anchor: ['doneAt', 'createdAt'],
    relation: ['updatedAt', 'createdAt', 'lastContact'],
    goal: ['completedAt', 'updatedAt', 'createdAt'],
    emotion: ['createdAt'],
    ledger: ['at'],
    carrier: ['lastUsedAt', 'createdAt'],
    advisor: ['lastActiveAt', 'createdAt'],
  }
  for (const key of fallbacks[domain]) {
    const v = item[key]
    if (v) {
      const t = new Date(v).getTime()
      if (!Number.isNaN(t)) return t
    }
  }
  return 0
}

/** 统一标签访问器：优先自由 tags，否则把枚举字段降级为伪标签 */
function getItemTags(domain: DomainKey, item: any): string[] {
  const direct: string[] = Array.isArray(item.tags) ? [...item.tags] : []
  const pseudo: string[] = []
  const pushPseudo = (prefix: string, val?: string | null) => {
    if (val) pseudo.push(`${prefix}:${val}`)
  }
  switch (domain) {
    case 'emotion': pushPseudo('emotion', item.type); break
    case 'ledger': pushPseudo('ledger', item.category); pushPseudo('ledger-type', item.type); break
    case 'goal': pushPseudo('goal-domain', item.domain); pushPseudo('goal-tier', item.tier); break
    case 'carrier': pushPseudo('carrier', item.type); break
    case 'advisor': pushPseudo('advisor-role', item.role); pushPseudo('advisor-personality', item.personality); break
    case 'relation': pushPseudo('relation', item.relation); break
    default: break
  }
  return [...new Set([...direct, ...pseudo])]
}

/** 统一标签访问器（导出，便于测试与复用） */
export function getTags(domain: DomainKey, item: any): string[] {
  return getItemTags(domain, item)
}

/** 统一时间访问器（导出） */
export function getTimeOf(domain: DomainKey, item: any): number {
  return getTime(domain, item)
}

// ============================================================
// C1 · 轻量本地语义层（零依赖 / 零外网）
// 在既有「共享标签」启发式上叠加中文近义词扩展：使「同义不同词」的条目
// （如笔记「焦虑」与「不安」）也能建立关联，无需 embedding 模型。
// 仅覆盖应用域常见词面，作为「已知边界」的语义近似，不声称向量语义。
// ============================================================

/** 近义词簇：簇内任意两词互视为近义。覆盖情绪/成长/关系/目标等高频域。 */
const SYNONYM_CLUSTERS: string[][] = [
  ['焦虑', '不安', '担忧', '紧张', '惶恐'],
  ['平静', '安宁', '平和', '淡然'],
  ['开心', '愉悦', '喜悦', '高兴'],
  ['难过', '悲伤', '哀伤', '低落'],
  ['成长', '进步', '蜕变', '成熟'],
  ['复盘', '反思', '回顾', '总结'],
  ['目标', '志向', '愿望', '期许'],
  ['习惯', '惯例', '习性'],
  ['专注', '心流', '投入', '沉浸'],
  ['关系', '人际', '联结', '羁绊', '连结'],
  ['健康', '康健', '安康'],
  ['灵感', '触动', '妙想'],
  ['迷茫', '困惑', '失措'],
  ['能量', '精力', '元气'],
  ['感恩', '感激', '谢意'],
]

/** 词 → 近义词列表（由簇构建，对称） */
const SYNONYM_INDEX: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>()
  for (const cluster of SYNONYM_CLUSTERS) {
    for (const w of cluster) {
      m.set(w, cluster.filter(x => x !== w))
    }
  }
  return m
})()

/** 把标签集合扩展为其近义词并集（含原词）。伪标签（含 ':'）不匹配，避免跨域误联。 */
export function expandTags(tags: string[]): string[] {
  const out = new Set<string>()
  for (const t of tags) {
    out.add(t)
    if (t.includes(':')) continue
    const syn = SYNONYM_INDEX.get(t)
    if (syn) for (const s of syn) out.add(s)
  }
  return [...out]
}

function labelOf(domain: DomainKey, item: any): string {
  switch (domain) {
    case 'session': return item.title || '专注会话'
    case 'crystal': return item.insight || '时间结晶'
    case 'note': return item.title || '笔记'
    case 'anchor': return item.text || '心锚'
    case 'relation': return item.name || '关系'
    case 'goal': return item.title || '目标'
    case 'emotion': return item.note || item.type || '情绪'
    case 'ledger': return item.note || item.category || '账本'
    case 'carrier': return item.name || '载体'
    case 'advisor': return item.name || '幕僚'
    default: return String(item.id ?? '')
  }
}

/** 收集所有域的归一化条目 */
export function collectAllItems(): NormalizedItem[] {
  const pick = (domain: DomainKey, items: any[]) =>
    items.map(item => ({
      domain,
      id: item.id,
      label: labelOf(domain, item),
      ts: getTime(domain, item),
      tags: getItemTags(domain, item),
    }))

  return [
    ...pick('session', storage.getSessions()),
    ...pick('crystal', storage.getCrystals()),
    ...pick('note', storage.getNotes()),
    ...pick('anchor', storage.getAnchors()),
    ...pick('relation', storage.getRelations()),
    ...pick('goal', storage.getGoals()),
    ...pick('emotion', storage.getEmotions()),
    ...pick('ledger', storage.getLedger()),
    ...pick('carrier', storage.getCarriers()),
    ...pick('advisor', storage.getAdvisors()),
  ].filter(it => it.ts > 0)
}

function makeId(source: NormalizedItem, target: NormalizedItem, type: LinkType): string {
  return `${source.domain}:${source.id}->${target.domain}:${target.id}:${type}`
}

/** 关联一：共享标签（跨域标签交集，含 C1 近义词扩展） */
export function linkBySharedTag(items: NormalizedItem[]): CrossDomainLink[] {
  const links: CrossDomainLink[] = []
  const seen = new Set<string>()
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      // 同域也连线（用户拍板）：但同域仅用真实用户标签，剔除 ':' 伪标签（如 advisor-personality:[object Object]），避免退化毛球；跨域保留伪标签+近义扩展以发现弱关联
      const sameDomain = a.domain === b.domain
      const baseA = sameDomain ? a.tags.filter(t => !t.includes(':')) : a.tags
      const baseB = sameDomain ? b.tags.filter(t => !t.includes(':')) : b.tags
      const expA = expandTags(baseA)
      const expB = expandTags(baseB)
      const shared = expA.filter(t => expB.includes(t))
      if (shared.length === 0) continue
      const id = makeId(a, b, 'shared-tag')
      if (seen.has(id)) continue
      seen.add(id)
      // 直连标签（两方原标签直接相交）vs 经近义词命中
      const direct = baseA.filter(t => baseB.includes(t))
      const strength = Math.min(0.3 + 0.15 * shared.length, 1)
      const reason = direct.length > 0
        ? `共享标签：${direct.join('、')}`
        : `共享近义词：${shared.join('、')}（${baseA.join('/')} ≈ ${baseB.join('/')}）`
      links.push({
        id,
        sourceDomain: a.domain,
        sourceId: a.id,
        targetDomain: b.domain,
        targetId: b.id,
        linkType: 'shared-tag',
        strength,
        sharedTags: shared,
        reason,
        createdAt: new Date().toISOString(),
      })
    }
  }
  return links
}

/** 关联二：时间邻近（同一时间窗内先后发生，强度随时间衰减） */
export function linkByTemporalProximity(items: NormalizedItem[]): CrossDomainLink[] {
  const sorted = [...items].sort((a, b) => a.ts - b.ts)
  const links: CrossDomainLink[] = []
  const seen = new Set<string>()
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i]
      const b = sorted[j]
      // 同域不连时间邻近：用户拍板「同域仅经真实用户 tags 连线」，时间邻近保持跨域（避免同域幕僚因同刻播种形成无意义毛球）
      if (a.domain === b.domain) continue
      const distMin = (b.ts - a.ts) / 60000
      if (distMin > TEMPORAL_WINDOW_MIN) break // 已超出窗口，后续更远
      const id = makeId(a, b, 'temporal-proximity')
      if (seen.has(id)) continue
      seen.add(id)
      const strength = Math.max(0.1, 1 - distMin / TEMPORAL_WINDOW_MIN)
      links.push({
        id,
        sourceDomain: a.domain,
        sourceId: a.id,
        targetDomain: b.domain,
        targetId: b.id,
        linkType: 'temporal-proximity',
        strength,
        timeDistanceMin: Math.round(distMin),
        reason: `时间邻近（约 ${Math.round(distMin)} 分钟）`,
        createdAt: new Date().toISOString(),
      })
    }
  }
  return links
}

/** 关联三：因果顺序（硬外键 crystal.sessionId + 时间序启发式定向） */
export function linkByCausalOrder(items: NormalizedItem[]): CrossDomainLink[] {
  const links: CrossDomainLink[] = []
  const seen = new Set<string>()
  const crystals = storage.getCrystals()
  const sessions = new Map(storage.getSessions().map(s => [s.id, s]))

  // 硬因果：结晶 → 其关联专注会话
  for (const crystal of crystals) {
    const session = sessions.get(crystal.sessionId)
    if (!session) continue
    const a = items.find(it => it.domain === 'crystal' && it.id === crystal.id)
    const b = items.find(it => it.domain === 'session' && it.id === session.id)
    if (!a || !b) continue
    const id = makeId(a, b, 'causal-order')
    if (seen.has(id)) continue
    seen.add(id)
    links.push({
      id,
      sourceDomain: 'crystal',
      sourceId: crystal.id,
      targetDomain: 'session',
      targetId: session.id,
      linkType: 'causal-order',
      strength: 1,
      reason: '时间结晶由其专注会话孕育（硬因果）',
      createdAt: new Date().toISOString(),
    })
  }

  // 软因果（时间序启发式）：在窗口内，按已知方向语义定向
  // 约定：session 完成常先于其后的 emotion / crystal / note；anchor 完成常先于 goal 开花
  const sorted = [...items].sort((a, b) => a.ts - b.ts)
  const directional: Partial<Record<DomainKey, DomainKey[]>> = {
    session: ['emotion', 'crystal', 'note'],
    anchor: ['goal'],
  }
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]
    const targets = directional[a.domain]
    if (!targets) continue
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j]
      if (!targets.includes(b.domain)) continue
      const distMin = (b.ts - a.ts) / 60000
      if (distMin > TEMPORAL_WINDOW_MIN) break
      const id = makeId(a, b, 'causal-order')
      if (seen.has(id)) continue
      seen.add(id)
      const strength = Math.max(0.2, 1 - distMin / TEMPORAL_WINDOW_MIN) * 0.8
      links.push({
        id,
        sourceDomain: a.domain,
        sourceId: a.id,
        targetDomain: b.domain,
        targetId: b.id,
        linkType: 'causal-order',
        strength,
        timeDistanceMin: Math.round(distMin),
        reason: `${domainLabel(a.domain)}先于${domainLabel(b.domain)}（时间序启发式）`,
        createdAt: new Date().toISOString(),
      })
    }
  }
  return links
}

function domainLabel(d: DomainKey): string {
  const map: Record<DomainKey, string> = {
    session: '专注', crystal: '结晶', note: '笔记', anchor: '心锚',
    relation: '关系', goal: '目标', emotion: '情绪', ledger: '账本',
    carrier: '载体', advisor: '幕僚',
  }
  return map[d]
}

/** 计算完整跨域关联图 */
export function computeAssociationGraph(): AssociationGraph {
  const items = collectAllItems()
  const links = [
    ...linkBySharedTag(items),
    ...linkByTemporalProximity(items),
    ...linkByCausalOrder(items),
  ]
  const nodeKeys = new Set<string>()
  const nodes: AssociationGraph['nodes'] = []
  for (const it of items) {
    const key = `${it.domain}:${it.id}`
    if (nodeKeys.has(key)) continue
    nodeKeys.add(key)
    nodes.push({ domain: it.domain, id: it.id, label: it.label, ts: it.ts })
  }
  return { nodes, links }
}

/** composable 包装（与项目其它模块风格一致） */
export function useAssociationEngine() {
  function compute(): AssociationGraph {
    return computeAssociationGraph()
  }
  return { compute }
}

/**
 * 按 domain + id 取回真实记录对象（只读 storage，零写入）。
 * 用于图谱节点下钻展示真实字段，避免图中只显示归一化 label。
 */
export function fetchRecord(domain: DomainKey, id: string): any | null {
  switch (domain) {
    case 'session': return storage.getSessions().find(s => s.id === id) ?? null
    case 'crystal': return storage.getCrystals().find(c => c.id === id) ?? null
    case 'note': return storage.getNotes().find(n => n.id === id) ?? null
    case 'anchor': return storage.getAnchors().find(a => a.id === id) ?? null
    case 'relation': return storage.getRelations().find(r => r.id === id) ?? null
    case 'goal': return storage.getGoals().find(g => g.id === id) ?? null
    case 'emotion': return storage.getEmotions().find(e => e.id === id) ?? null
    case 'ledger': return storage.getLedger().find(l => l.id === id) ?? null
    case 'carrier': return storage.getCarriers().find(c => c.id === id) ?? null
    case 'advisor': return storage.getAdvisors().find(a => a.id === id) ?? null
    default: return null
  }
}
