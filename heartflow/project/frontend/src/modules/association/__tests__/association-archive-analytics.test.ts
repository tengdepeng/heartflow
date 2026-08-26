import { describe, it, expect } from 'vitest'
import type { AssociationGraph, CrossDomainLink, LinkType, DomainKey } from '../types'
import {
  associationArchiveOverview,
  linkTypeRows,
  domainPairRows,
  associationArchiveHealth,
  associationInsights,
  archiveDomainLabel,
  archiveDomainIcon,
} from '../association-archive-analytics'

function mkLink(
  sourceDomain: DomainKey,
  sourceId: string,
  targetDomain: DomainKey,
  targetId: string,
  linkType: LinkType,
  strength: number,
  createdAt = '2026-08-15T09:00:00+08:00',
): CrossDomainLink {
  return { id: `${sourceDomain}:${sourceId}->${targetDomain}:${targetId}:${linkType}`, sourceDomain, sourceId, targetDomain, targetId, linkType, strength, reason: '测试', createdAt }
}

function mkGraph(nodes: AssociationGraph['nodes'], links: CrossDomainLink[]): AssociationGraph {
  return { nodes, links }
}

const NOW = new Date('2026-08-15T12:00:00+08:00')

describe('关联档案·概览', () => {
  it('空图概览全部归零或占位', () => {
    const ov = associationArchiveOverview(mkGraph([], []), NOW)
    expect(ov.nodeCount).toBe(0)
    expect(ov.linkCount).toBe(0)
    expect(ov.domainCount).toBe(0)
    expect(ov.avgStrength).toBe(0)
    expect(ov.hubLabel).toBe('')
    expect(ov.hubDegree).toBe(0)
  })

  it('正确统计节点/连线/涉域/类型次数与平均强度', () => {
    const graph = mkGraph(
      [
        { domain: 'note', id: 'n1', label: '焦虑手记', ts: 1 },
        { domain: 'note', id: 'n2', label: '平静随笔', ts: 2 },
        { domain: 'emotion', id: 'e1', label: '焦虑', ts: 3 },
        { domain: 'goal', id: 'g1', label: '学习目标', ts: 4 },
      ],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('note', 'n2', 'emotion', 'e1', 'temporal-proximity', 0.4),
        mkLink('emotion', 'e1', 'goal', 'g1', 'causal-order', 1),
      ],
    )
    const ov = associationArchiveOverview(graph, NOW)
    expect(ov.nodeCount).toBe(4)
    expect(ov.linkCount).toBe(3)
    expect(ov.domainCount).toBe(3)
    expect(ov.sharedTagCount).toBe(1)
    expect(ov.temporalCount).toBe(1)
    expect(ov.causalCount).toBe(1)
    expect(ov.avgStrength).toBe(0.67)
  })

  it('统计孤立节点、枢纽与域对数', () => {
    const graph = mkGraph(
      [
        { domain: 'note', id: 'n1', label: 'A', ts: 1 },
        { domain: 'emotion', id: 'e1', label: 'B', ts: 2 },
        { domain: 'goal', id: 'g1', label: 'C', ts: 3 },
      ],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('note', 'n1', 'goal', 'g1', 'shared-tag', 0.5),
      ],
    )
    const ov = associationArchiveOverview(graph, NOW)
    expect(ov.isolatedCount).toBe(0)
    expect(ov.hubLabel).toBe('A')
    expect(ov.hubDegree).toBe(2)
    expect(ov.pairCount).toBe(2)
  })

  it('孤立节点计数正确', () => {
    const graph = mkGraph(
      [
        { domain: 'note', id: 'n1', label: 'A', ts: 1 },
        { domain: 'emotion', id: 'e1', label: 'B', ts: 2 },
      ],
      [],
    )
    expect(associationArchiveOverview(graph, NOW).isolatedCount).toBe(2)
  })
})

describe('关联档案·类型分布', () => {
  it('空图各类型为 0', () => {
    const rows = linkTypeRows(mkGraph([], []))
    expect(rows).toHaveLength(3)
    expect(rows.every(r => r.count === 0)).toBe(true)
  })

  it('正确统计类型次数与百分比', () => {
    const graph = mkGraph(
      [{ domain: 'note', id: 'n1', label: 'A', ts: 1 }],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('note', 'n1', 'goal', 'g1', 'shared-tag', 0.5),
        mkLink('note', 'n1', 'anchor', 'a1', 'temporal-proximity', 0.4),
        mkLink('note', 'n1', 'carrier', 'c1', 'causal-order', 1),
      ],
    )
    const rows = linkTypeRows(graph)
    const shared = rows.find(r => r.type === 'shared-tag')!
    expect(shared.count).toBe(2)
    expect(shared.percentage).toBe(50)
    const causal = rows.find(r => r.type === 'causal-order')!
    expect(causal.count).toBe(1)
    expect(causal.percentage).toBe(25)
  })
})

describe('关联档案·域对分布', () => {
  it('按关联次数排序（去方向）', () => {
    const graph = mkGraph(
      [{ domain: 'note', id: 'n1', label: 'A', ts: 1 }],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('emotion', 'e1', 'note', 'n2', 'shared-tag', 0.5),
        mkLink('note', 'n3', 'goal', 'g1', 'shared-tag', 0.4),
      ],
    )
    const rows = domainPairRows(graph)
    expect(rows[0].count).toBe(2)
    expect(rows[0].source).toBe('情绪')
    expect(rows[0].target).toBe('笔记')
  })

  it('无连线时为空', () => {
    expect(domainPairRows(mkGraph([], []))).toEqual([])
  })
})

describe('关联档案·图谱健康', () => {
  it('空图健康分数为 0，标签为最低档', () => {
    const h = associationArchiveHealth(mkGraph([], []))
    expect(h.score).toBe(0)
    expect(h.label).toBe('尚未织网')
  })

  it('多域多连线时分数较高且三轴在 0-100', () => {
    const nodes: AssociationGraph['nodes'] = []
    const links: CrossDomainLink[] = []
    let ts = 1
    const domains: { d: DomainKey; id: string }[] = []
    for (const d of ['note', 'emotion', 'goal', 'crystal', 'anchor', 'session'] as DomainKey[]) {
      domains.push({ d, id: `${d}1` })
      nodes.push({ domain: d, id: `${d}1`, label: d, ts: ts++ })
    }
    for (let i = 0; i < domains.length - 1; i++) {
      links.push(mkLink(domains[i].d, domains[i].id, domains[i + 1].d, domains[i + 1].id, 'shared-tag', 0.7))
    }
    const h = associationArchiveHealth(mkGraph(nodes, links))
    expect(h.score).toBeGreaterThan(0)
    expect(h.score).toBeLessThanOrEqual(100)
    expect(h.breadth).toBeGreaterThanOrEqual(0)
    expect(h.breadth).toBeLessThanOrEqual(100)
    expect(h.density).toBeGreaterThanOrEqual(0)
    expect(h.density).toBeLessThanOrEqual(100)
    expect(h.strength).toBeGreaterThanOrEqual(0)
    expect(h.strength).toBeLessThanOrEqual(100)
  })
})

describe('关联档案·温和洞察', () => {
  it('空图给出耐心开场', () => {
    const ins = associationInsights(mkGraph([], []), NOW)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins[0].text).toContain('网')
  })

  it('有节点无连线时提示织线', () => {
    const graph = mkGraph([{ domain: 'note', id: 'n1', label: 'A', ts: 1 }], [])
    const text = associationInsights(graph, NOW).map(i => i.text).join('')
    expect(text).toContain('标签')
  })

  it('有枢纽时提及枢纽节点', () => {
    const graph = mkGraph(
      [
        { domain: 'note', id: 'n1', label: '枢纽笔记', ts: 1 },
        { domain: 'emotion', id: 'e1', label: 'B', ts: 2 },
        { domain: 'goal', id: 'g1', label: 'C', ts: 3 },
        { domain: 'anchor', id: 'a1', label: 'D', ts: 4 },
      ],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('note', 'n1', 'goal', 'g1', 'shared-tag', 0.5),
        mkLink('note', 'n1', 'anchor', 'a1', 'shared-tag', 0.5),
        mkLink('note', 'n1', 'carrier', 'c1', 'shared-tag', 0.5),
      ],
    )
    const text = associationInsights(graph, NOW).map(i => i.text).join('')
    expect(text).toContain('枢纽笔记')
  })

  it('洞察条数有界', () => {
    const graph = mkGraph(
      [{ domain: 'note', id: 'n1', label: 'A', ts: 1 }],
      [
        mkLink('note', 'n1', 'emotion', 'e1', 'shared-tag', 0.6),
        mkLink('note', 'n1', 'goal', 'g1', 'temporal-proximity', 0.5),
        mkLink('note', 'n1', 'anchor', 'a1', 'causal-order', 0.8),
      ],
    )
    expect(associationInsights(graph, NOW).length).toBeLessThanOrEqual(4)
  })
})

describe('关联档案·域元数据', () => {
  it('已知域可映射标签与图标', () => {
    expect(archiveDomainLabel('note')).toBe('笔记')
    expect(archiveDomainIcon('note')).not.toBe('🔗')
    expect(archiveDomainLabel('emotion')).toBe('情绪')
  })
})