// ============================================================
// 关联图本地布局（零依赖）单测
// ============================================================
import { describe, expect, it } from 'vitest'
import { computeLayout } from '../layout'
import type { AssociationGraph } from '../types'

function buildGraph(nodeCount: number, edges: Array<[number, number, string]>): AssociationGraph {
  const nodes = Array.from({ length: nodeCount }, (_, i) => ({
    domain: 'note' as const,
    id: `n${i}`,
    label: `节点${i}`,
    ts: i * 1000,
  }))
  const links = edges.map(([a, b, type], i) => ({
    id: `e${i}`,
    sourceDomain: 'note' as const,
    sourceId: `n${a}`,
    targetDomain: 'note' as const,
    targetId: `n${b}`,
    linkType: type as any,
    strength: 0.5,
    reason: '测试',
    createdAt: new Date().toISOString(),
  }))
  return { nodes, links }
}

describe('computeLayout · 本地力导向（零依赖）', () => {
  it('为每张节点产出唯一且在画布内的坐标', () => {
    const g = buildGraph(6, [[0, 1, 'shared-tag'], [1, 2, 'temporal-proximity'], [2, 3, 'causal-order'], [3, 4, 'shared-tag'], [4, 5, 'shared-tag']])
    const layout = computeLayout(g, { width: 800, height: 600 })
    expect(layout.nodes.length).toBe(6)
    // 所有坐标落在画布内（含边界 padding 容差）
    for (const n of layout.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(800)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(600)
    }
    // 键唯一
    const keys = layout.nodes.map(n => n.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('度数正确反映连边数', () => {
    const g = buildGraph(3, [[0, 1, 'shared-tag'], [1, 2, 'shared-tag']])
    const layout = computeLayout(g)
    const byKey = Object.fromEntries(layout.nodes.map(n => [n.key, n.degree]))
    expect(byKey['note:n1']).toBe(2) // 中间节点 2 度
    expect(byKey['note:n0']).toBe(1)
    expect(byKey['note:n2']).toBe(1)
  })

  it('忽略端点缺失的边（不产生悬空引用）', () => {
    const g: AssociationGraph = {
      nodes: [{ domain: 'note', id: 'a', label: 'A', ts: 1 }],
      links: [{
        id: 'ghost', sourceDomain: 'note', sourceId: 'a',
        targetDomain: 'note', targetId: 'missing', linkType: 'shared-tag',
        strength: 1, reason: 'x', createdAt: new Date().toISOString(),
      }],
    }
    const layout = computeLayout(g)
    expect(layout.edges.length).toBe(0) // 端点缺失被过滤
    expect(() => computeLayout(g)).not.toThrow()
  })

  it('单节点图稳定落在中心', () => {
    const g = buildGraph(1, [])
    const layout = computeLayout(g, { width: 800, height: 600 })
    expect(layout.nodes[0].x).toBeCloseTo(400, 1)
    expect(layout.nodes[0].y).toBeCloseTo(300, 1)
  })

  it('相同输入产出确定性布局（无随机抖动）', () => {
    const g = buildGraph(8, [[0, 1, 'shared-tag'], [1, 2, 'temporal-proximity'], [2, 3, 'causal-order'], [3, 4, 'shared-tag'], [4, 5, 'shared-tag'], [5, 6, 'shared-tag'], [6, 7, 'shared-tag']])
    const a = computeLayout(g)
    const b = computeLayout(g)
    expect(JSON.stringify(a.nodes)).toBe(JSON.stringify(b.nodes))
  })

  it('不修改输入图对象（纯函数）', () => {
    const g = buildGraph(4, [[0, 1, 'shared-tag'], [2, 3, 'shared-tag']])
    const snapshot = JSON.stringify(g)
    computeLayout(g)
    expect(JSON.stringify(g)).toBe(snapshot)
  })
})
