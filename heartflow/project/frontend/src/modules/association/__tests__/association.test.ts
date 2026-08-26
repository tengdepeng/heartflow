import { describe, expect, it, beforeEach } from 'vitest'
import { storage } from '../../../engine/storage'
import {
  computeAssociationGraph,
  linkBySharedTag,
  linkByTemporalProximity,
  linkByCausalOrder,
  collectAllItems,
  getTags,
  getTimeOf,
  expandTags,
} from '../engine'

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
  storage.clear()
}

describe('通用跨域关联引擎', () => {
  beforeEach(() => setupMemoryStorage())

  it('统一时间访问器处理各域不统一字段名', () => {
    expect(getTimeOf('session', { completedAt: '2026-01-01T10:00:00.000Z' })).toBeGreaterThan(0)
    expect(getTimeOf('ledger', { at: '2026-01-01T10:00:00.000Z' })).toBeGreaterThan(0)
    expect(getTimeOf('note', { createdAt: '2026-01-01T10:00:00.000Z' })).toBeGreaterThan(0)
    // 无时间字段返回 0（过滤掉）
    expect(getTimeOf('session', {})).toBe(0)
  })

  it('统一标签访问器把枚举降级为伪标签', () => {
    const t = getTags('emotion', { type: 'happy', tags: ['晨间'] })
    expect(t).toContain('晨间')
    expect(t).toContain('emotion:happy')
    const g = getTags('goal', { domain: 'health', tags: [] })
    expect(g).toContain('goal-domain:health')
  })

  it('共享标签关联：跨域交集产生 shared-tag 边', () => {
    storage.setNotes([
      { id: 'n1', title: 't', content: 'c', tags: ['成长', '复盘'], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-02T10:00:00.000Z', tags: ['成长'] } as any,
    ])
    const items = collectAllItems()
    const links = linkBySharedTag(items)
    const shared = links.filter(l => l.linkType === 'shared-tag')
    expect(shared.length).toBeGreaterThan(0)
    expect(shared[0].sharedTags).toContain('成长')
    expect(shared[0].strength).toBeGreaterThan(0)
  })

  it('C1 · expandTags 把标签扩展为近义词并集', () => {
    const exp = expandTags(['焦虑'])
    expect(exp).toContain('焦虑')
    expect(exp).toContain('不安')
    expect(exp).toContain('担忧')
    // 伪标签（含 ':'）不参与近义扩展，避免跨域误联
    const withPseudo = expandTags(['emotion:calm'])
    expect(withPseudo).toEqual(['emotion:calm'])
  })

  it('C1 · 同义不同词经近义词建立 shared-tag 关联', () => {
    storage.setNotes([
      { id: 'n1', title: 't', content: 'c', tags: ['焦虑'], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-02T10:00:00.000Z', tags: ['不安'] } as any,
    ])
    const items = collectAllItems()
    const links = linkBySharedTag(items).filter(l => l.linkType === 'shared-tag')
    // 两方原标签无交集（焦虑 ≠ 不安），应经近义词命中
    expect(links.length).toBe(1)
    expect(links[0].sharedTags).toContain('焦虑')
    expect(links[0].sharedTags).toContain('不安')
    expect(links[0].reason).toContain('共享近义词')
  })

  it('C1 · 直连标签仍标「共享标签」而非近义词', () => {
    storage.setNotes([
      { id: 'n1', title: 't', content: 'c', tags: ['成长'], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-02T10:00:00.000Z', tags: ['成长'] } as any,
    ])
    const links = linkBySharedTag(collectAllItems()).filter(l => l.linkType === 'shared-tag')
    expect(links.length).toBe(1)
    expect(links[0].reason).toContain('共享标签')
    expect(links[0].reason).not.toContain('近义词')
  })

  it('时间邻近关联：窗口内跨域条目产生 temporal-proximity 边', () => {
    storage.setNotes([
      { id: 'n1', title: 't', content: 'c', tags: [], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-01T10:30:00.000Z' } as any,
    ])
    const items = collectAllItems()
    const links = linkByTemporalProximity(items)
    expect(links.length).toBeGreaterThan(0)
    expect(links[0].linkType).toBe('temporal-proximity')
    expect(links[0].timeDistanceMin).toBe(30)
  })

  it('时间邻近超出 24h 窗口不产生边', () => {
    storage.setNotes([
      { id: 'n1', title: 't', content: 'c', tags: [], createdAt: '2026-01-01T10:00:00.000Z', updatedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setEmotions([
      { id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-05T10:00:00.000Z' } as any,
    ])
    const items = collectAllItems()
    expect(linkByTemporalProximity(items).length).toBe(0)
  })

  it('因果顺序关联：结晶硬外键关联其专注会话（强度 1）', () => {
    storage.setSessions([
      { id: 's1', startedAt: '2026-01-01T09:00:00.000Z', completedAt: '2026-01-01T10:00:00.000Z' } as any,
    ])
    storage.setCrystals([
      { id: 'c1', sessionId: 's1', createdAt: '2026-01-01T10:01:00.000Z', tags: [], intensity: 0.5, color: '#fff', shape: 'sphere' } as any,
    ])
    const items = collectAllItems()
    const links = linkByCausalOrder(items)
    const hard = links.find(l => l.linkType === 'causal-order' && l.sourceId === 'c1')
    expect(hard).toBeDefined()
    expect(hard!.targetId).toBe('s1')
    expect(hard!.strength).toBe(1)
  })

  it('完整图计算：跨域多关联汇聚到统一节点+边', () => {    storage.setSessions([{ id: 's1', startedAt: '2026-01-01T09:00:00.000Z', completedAt: '2026-01-01T10:00:00.000Z' } as any])
    storage.setCrystals([{ id: 'c1', sessionId: 's1', createdAt: '2026-01-01T10:05:00.000Z', tags: ['心流'], intensity: 0.5, color: '#fff', shape: 'sphere' } as any])
    storage.setNotes([{ id: 'n1', title: 't', content: 'c', tags: ['心流'], createdAt: '2026-01-01T10:10:00.000Z', updatedAt: '2026-01-01T10:10:00.000Z' } as any])
    storage.setEmotions([{ id: 'e1', type: 'calm', note: 'c', createdAt: '2026-01-01T10:08:00.000Z' } as any])

    const graph = computeAssociationGraph()
    expect(graph.nodes.length).toBe(4)
    expect(graph.links.length).toBeGreaterThan(0)
    // 至少包含：结晶→会话（因果）、结晶↔笔记（共享标签）、会话↔情绪（时间邻近/因果）
    const types = new Set(graph.links.map(l => l.linkType))
    expect(types.has('shared-tag')).toBe(true)
    expect(types.has('causal-order')).toBe(true)
  })

  it('空数据不产生图（不抛错）', () => {
    const graph = computeAssociationGraph()
    expect(graph.nodes.length).toBe(0)
    expect(graph.links.length).toBe(0)
  })
})
