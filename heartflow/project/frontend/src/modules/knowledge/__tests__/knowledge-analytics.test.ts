// ============================================================
// 经略阁 · 知识档案分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { KNode, StarPositions } from '../knowledge-tower'
import type { ImportSource } from '../importer'
import {
  knowledgeOverview,
  knowledgeGraphShape,
  importOverview,
  knowledgeInsights,
  starLayoutProgress,
} from '../knowledge-analytics'

function node(partial: Partial<KNode> = {}): KNode {
  return {
    id: 'n-1',
    title: '节点',
    desc: '',
    cat: 'concept',
    links: [],
    ...partial,
  }
}

function src(partial: Partial<ImportSource> = {}): ImportSource {
  return {
    id: 's-1',
    type: 'web',
    title: '摘录',
    content: '内容',
    importedAt: '2026-08-01T00:00:00Z',
    ...partial,
  }
}

describe('knowledge-analytics', () => {
  it('knowledgeOverview 空列表返回零值', () => {
    const o = knowledgeOverview([])
    expect(o.nodeCount).toBe(0)
    expect(o.edgeCount).toBe(0)
    expect(o.avgDegree).toBe(0)
    expect(o.categories).toEqual([])
  })

  it('knowledgeOverview 统计节点/边/分类/平均度', () => {
    const nodes: KNode[] = [
      node({ id: 'a', title: '甲', cat: 'concept', links: ['b', 'c', 'missing'] }),
      node({ id: 'b', title: '乙', cat: 'rule', links: ['a'] }),
      node({ id: 'c', title: '丙', cat: 'insight', links: [] }),
    ]
    const o = knowledgeOverview(nodes)
    expect(o.nodeCount).toBe(3)
    expect(o.edgeCount).toBe(3) // a→b, b→a, a 指向 c（missing 不计）
    expect(o.linkedNodeCount).toBe(2) // a、b 有入度
    expect(o.categoryCount).toBe(3)
    expect(o.avgDegree).toBe(1)
  })

  it('knowledgeOverview 分类分布按数量降序并带标签', () => {
    const nodes = [
      node({ id: 'a', cat: 'concept' }),
      node({ id: 'b', cat: 'concept' }),
      node({ id: 'c', cat: 'frame' }),
    ]
    const o = knowledgeOverview(nodes)
    expect(o.categories[0]).toMatchObject({ cat: 'concept', count: 2, label: '概念' })
  })

  it('knowledgeGraphShape 计算连通率/孤立点/枢纽', () => {
    const nodes: KNode[] = [
      node({ id: 'a', title: '枢纽', links: ['b', 'c', 'd'] }),
      node({ id: 'b', title: '乙', links: ['a'] }),
      node({ id: 'c', title: '丙', links: ['a'] }),
      node({ id: 'd', title: '丁', links: [] }),
      node({ id: 'e', title: '戊', links: [] }),
    ]
    const s = knowledgeGraphShape(nodes)
    expect(s.isolated).toBe(2) // d、e 均无进出边
    expect(s.hubs[0].title).toBe('枢纽')
    expect(s.hubs[0].degree).toBe(3)
    expect(s.connectivity).toBe(60) // 3/5
  })

  it('importOverview 统计类型分布与近7天', () => {
    const sources = [
      src({ type: 'web', importedAt: '2026-08-18T00:00:00Z' }),
      src({ type: 'book', importedAt: '2026-07-01T00:00:00Z' }),
    ]
    const now = new Date('2026-08-20T00:00:00Z').getTime()
    const ov = importOverview(sources, now)
    expect(ov.total).toBe(2)
    expect(ov.recent7).toBe(1)
    const web = ov.byType.find(t => t.type === 'web')
    expect(web?.count).toBe(1)
    expect(web?.label).toBe('网页摘录')
  })

  it('knowledgeInsights 空塔给建塔提示', () => {
    const o = knowledgeOverview([])
    const s = knowledgeGraphShape([])
    const imp = importOverview([])
    const list = knowledgeInsights(o, s, imp)
    expect(list.some(i => i.text.includes('知识塔还空着'))).toBe(true)
  })

  it('knowledgeInsights 给出孤立点与枢纽提示', () => {
    const nodes: KNode[] = [
      node({ id: 'a', title: '核心', links: ['b', 'c', 'd'] }),
      node({ id: 'b', title: '乙', links: ['a'] }),
      node({ id: 'c', title: '丙', links: [] }),
      node({ id: 'd', title: '丁', links: [] }),
      node({ id: 'e', title: '孤点', links: [] }),
    ]
    const o = knowledgeOverview(nodes)
    const s = knowledgeGraphShape(nodes)
    const imp = importOverview([])
    const list = knowledgeInsights(o, s, imp)
    expect(list.some(i => i.text.includes('枢纽'))).toBe(true)
    // c、d、e 均为孤点（占 3/5），触发孤立点提示
    expect(list.some(i => i.text.includes('尚未彼此相连'))).toBe(true)
  })

  it('starLayoutProgress 计算星图铺展进度', () => {
    const pos: StarPositions = { a: { x: 1, y: 2 }, b: { x: 3, y: 4 } }
    expect(starLayoutProgress(pos, 4)).toBe(50)
    expect(starLayoutProgress({}, 4)).toBe(0)
    expect(starLayoutProgress({}, 0)).toBe(0)
  })
})