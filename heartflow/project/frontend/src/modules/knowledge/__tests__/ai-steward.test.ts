// ============================================================
// 经略阁 · AI 知识管家 · 单元测试
// 覆盖：suggestConnections / generateQuestions / detectBlindSpots / calculateHealthScore
// ============================================================
import { describe, expect, it } from 'vitest'
import type { KnowledgeNode, KnowledgeRelation } from '../types'
import {
  suggestConnections,
  generateQuestions,
  detectBlindSpots,
  calculateHealthScore,
} from '../ai-steward'

// ---- 测试辅助函数 ----

function makeNode(overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id: 'n1',
    title: '测试节点',
    desc: '这是一个测试节点',
    cat: 'concept',
    tags: ['测试'],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeRelation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: 'r1',
    sourceId: 'n1',
    targetId: 'n2',
    type: 'related',
    label: '关联',
    createdAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

// ============================================================
// 1. suggestConnections
// ============================================================
describe('suggestConnections', () => {
  it('节点不存在时返回空数组', () => {
    const nodes: KnowledgeNode[] = [makeNode({ id: 'n2' })]
    const result = suggestConnections('nonexistent', nodes, [])
    expect(result).toEqual([])
  })

  it('同分类节点获得高分建议', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: '函数式编程' }),
      makeNode({ id: 'n2', cat: 'concept', title: '不可变数据' }),
    ]
    const result = suggestConnections('n1', nodes, [])
    expect(result).toHaveLength(1)
    expect(result[0].targetId).toBe('n2')
    expect(result[0].score).toBeGreaterThanOrEqual(30)
    expect(result[0].reason).toContain('概念')
  })

  it('标签重叠增加建议分数', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: 'A', tags: ['TypeScript', '前端'] }),
      makeNode({ id: 'n2', cat: 'rule', title: 'B', tags: ['TypeScript', '后端'] }),
    ]
    const result = suggestConnections('n1', nodes, [])
    expect(result).toHaveLength(1)
    // 标签相似度: 交集={TypeScript}, 并集={TypeScript,前端,后端} = 1/3 ≈ 0.33
    // 标签分: 0.33 * 40 ≈ 13
    expect(result[0].score).toBeGreaterThan(0)
    expect(result[0].reason).toContain('标签相似度')
  })

  it('已存在关系的节点被排除', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: 'A' }),
      makeNode({ id: 'n2', cat: 'concept', title: 'B' }),
      makeNode({ id: 'n3', cat: 'concept', title: 'C' }),
    ]
    const relations = [makeRelation({ sourceId: 'n1', targetId: 'n2' })]
    const result = suggestConnections('n1', nodes, relations)
    expect(result).toHaveLength(1)
    expect(result[0].targetId).toBe('n3')
  })

  it('关系反向也排除 (targetId 匹配)', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: 'A' }),
      makeNode({ id: 'n2', cat: 'concept', title: 'B' }),
    ]
    const relations = [makeRelation({ sourceId: 'n2', targetId: 'n1' })]
    const result = suggestConnections('n1', nodes, relations)
    expect(result).toEqual([])
  })

  it('排除自身', () => {
    const nodes: KnowledgeNode[] = [makeNode({ id: 'n1', title: 'A' })]
    const result = suggestConnections('n1', nodes, [])
    expect(result).toEqual([])
  })

  it('最多返回 5 条建议', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n0', cat: 'concept', title: '核心概念' }),
      ...Array.from({ length: 10 }, (_, i) =>
        makeNode({ id: `n${i + 1}`, cat: 'concept', title: `相关概念 ${i}` })
      ),
    ]
    const result = suggestConnections('n0', nodes, [])
    expect(result.length).toBeLessThanOrEqual(5)
  })

  it('按分数降序排列', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n0', cat: 'concept', title: '核心', tags: ['A', 'B', 'C'] }),
      makeNode({ id: 'n1', cat: 'concept', title: '核心相关', tags: ['A', 'B', 'C'] }), // 高分
      makeNode({ id: 'n2', cat: 'rule', title: '其他', tags: ['X'] }), // 低分
    ]
    const result = suggestConnections('n0', nodes, [])
    expect(result[0].targetId).toBe('n1')
    expect(result[0].score).toBeGreaterThan(result[1].score)
  })

  it('标题字符重叠增加分数', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'rule', title: '函数式编程范式' }),
      makeNode({ id: 'n2', cat: 'insight', title: '函数柯里化', tags: [] }),
    ]
    const result = suggestConnections('n1', nodes, [])
    expect(result).toHaveLength(1)
    // "函数" 两字重叠 → 2*5 = 10 分
    expect(result[0].score).toBeGreaterThanOrEqual(10)
  })

  it('描述内容相似度增加分数', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({
        id: 'n1',
        cat: 'concept',
        title: 'A',
        tags: [],
        desc: '响应式编程 数据流 异步处理',
      }),
      makeNode({
        id: 'n2',
        cat: 'rule',
        title: 'B',
        tags: [],
        desc: '数据流 异步处理 事件驱动',
      }),
    ]
    const result = suggestConnections('n1', nodes, [])
    expect(result).toHaveLength(1)
    expect(result[0].reason).toContain('描述内容有相似表述')
  })

  it('无描述时跳过描述相似度', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: 'A', desc: '', tags: [] }),
      makeNode({ id: 'n2', cat: 'concept', title: 'B', desc: '', tags: [] }),
    ]
    const result = suggestConnections('n1', nodes, [])
    // 同分类但无其他加分 → score = 30
    expect(result).toHaveLength(1)
    expect(result[0].score).toBe(30)
  })

  it('无标签时跳过标签相似度', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({ id: 'n1', cat: 'concept', title: 'AAAA', desc: '', tags: [] }),
      makeNode({ id: 'n2', cat: 'rule', title: 'BBBB', desc: '', tags: [] }),
    ]
    const result = suggestConnections('n1', nodes, [])
    // 无同分类、无标签重叠、无标题字符重叠、无描述 → 0 分
    expect(result).toEqual([])
  })

  it('分数上限为 100', () => {
    const nodes: KnowledgeNode[] = [
      makeNode({
        id: 'n1',
        cat: 'concept',
        title: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        desc: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10',
      }),
      makeNode({
        id: 'n2',
        cat: 'concept',
        title: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
        tags: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
        desc: 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10',
      }),
    ]
    const result = suggestConnections('n1', nodes, [])
    expect(result[0].score).toBeLessThanOrEqual(100)
  })
})

// ============================================================
// 2. generateQuestions
// ============================================================
describe('generateQuestions', () => {
  it('节点不存在时返回空数组', () => {
    const result = generateQuestions('nonexistent', [])
    expect(result).toEqual([])
  })

  it('concept 分类返回 5 个概念追问', () => {
    const node = makeNode({ id: 'n1', cat: 'concept', title: '闭包' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('核心前提')
    expect(result[1]).toContain('反例')
  })

  it('rule 分类返回 5 个法则追问', () => {
    const node = makeNode({ id: 'n1', cat: 'rule', title: 'SOLID' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('适用范围')
    expect(result[2]).toContain('违背')
  })

  it('frame 分类返回 5 个框架追问', () => {
    const node = makeNode({ id: 'n1', cat: 'frame', title: 'MVVM' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('问题')
    expect(result[2]).toContain('盲区')
  })

  it('insight 分类返回 5 个直觉追问', () => {
    const node = makeNode({ id: 'n1', cat: 'insight', title: '经验' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('经历')
    expect(result[1]).toContain('逻辑')
  })

  it('pitfall 分类返回 5 个误区追问', () => {
    const node = makeNode({ id: 'n1', cat: 'pitfall', title: '过早优化' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('根源')
    expect(result[2]).toContain('防错机制')
  })

  it('metaphor 分类返回 5 个比喻追问', () => {
    const node = makeNode({ id: 'n1', cat: 'metaphor', title: '建筑比喻' })
    const result = generateQuestions('n1', [node])
    expect(result).toHaveLength(5)
    expect(result[0]).toContain('源域')
    expect(result[2]).toContain('换一个源域')
  })
})

// ============================================================
// 3. detectBlindSpots
// ============================================================
describe('detectBlindSpots', () => {
  it('空节点返回所有分类覆盖为 0', () => {
    const result = detectBlindSpots([])
    expect(result).toHaveLength(6)
    for (const item of result) {
      expect(item.nodeCount).toBe(0)
      expect(item.coverageScore).toBe(0)
    }
  })

  it('单一分类节点返回该分类满分', () => {
    const nodes = [
      makeNode({ id: 'n1', cat: 'concept' }),
      makeNode({ id: 'n2', cat: 'concept' }),
    ]
    const result = detectBlindSpots(nodes)
    const concept = result.find(r => r.category === 'concept')
    expect(concept!.coverageScore).toBe(100)
    expect(concept!.nodeCount).toBe(2)
  })

  it('覆盖率基于最高分类节点数计算', () => {
    const nodes = [
      makeNode({ id: 'n1', cat: 'concept' }),
      makeNode({ id: 'n2', cat: 'concept' }),
      makeNode({ id: 'n3', cat: 'concept' }),
      makeNode({ id: 'n4', cat: 'rule' }),
    ]
    const result = detectBlindSpots(nodes)
    const concept = result.find(r => r.category === 'concept')
    const rule = result.find(r => r.category === 'rule')
    expect(concept!.coverageScore).toBe(100) // 3/3 = 100%
    expect(rule!.coverageScore).toBe(33) // 1/3 ≈ 33%
  })

  it('所有分类覆盖数据包含 label 和 icon', () => {
    const result = detectBlindSpots([])
    for (const item of result) {
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.category).toBeTruthy()
    }
  })

  it('自定义分类过滤', () => {
    const nodes = [
      makeNode({ id: 'n1', cat: 'concept' }),
      makeNode({ id: 'n2', cat: 'rule' }),
    ]
    const result = detectBlindSpots(nodes, ['concept', 'rule'])
    expect(result).toHaveLength(2)
    expect(result.map(r => r.category)).toEqual(['concept', 'rule'])
  })

  it('默认包含全部 6 个分类', () => {
    const result = detectBlindSpots([])
    const categories = result.map(r => r.category)
    expect(categories).toEqual(['concept', 'rule', 'frame', 'insight', 'pitfall', 'metaphor'])
  })
})

// ============================================================
// 4. calculateHealthScore
// ============================================================
describe('calculateHealthScore', () => {
  it('空节点返回 0 分', () => {
    const result = calculateHealthScore([], [])
    expect(result.total).toBe(0)
    expect(result.breakdown).toEqual({ density: 0, relation: 0, diversity: 0, depth: 0 })
    expect(result.level.label).toBe('待育')
  })

  it('10 个节点达到密度满分 30', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `n${i}`, cat: 'concept', desc: '有描述' })
    )
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.density).toBe(30)
  })

  it('5 个节点密度为 15', () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      makeNode({ id: `n${i}`, cat: 'concept', desc: '' })
    )
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.density).toBe(15)
  })

  it('每个节点 0.5 条关系达到关系满分 30', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      makeNode({ id: `n${i}`, cat: 'concept', desc: '' })
    )
    const relations = Array.from({ length: 5 }, (_, i) =>
      makeRelation({ id: `r${i}`, sourceId: `n${i}`, targetId: `n${i + 5}` })
    )
    const result = calculateHealthScore(nodes, relations)
    expect(result.breakdown.relation).toBe(30)
  })

  it('无关系时关系分为 0', () => {
    const nodes = [makeNode({ id: 'n1', cat: 'concept', desc: '' })]
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.relation).toBe(0)
  })

  it('覆盖全部 6 个分类达到多样性满分 20', () => {
    const cats: Array<'concept' | 'rule' | 'frame' | 'insight' | 'pitfall' | 'metaphor'> = [
      'concept', 'rule', 'frame', 'insight', 'pitfall', 'metaphor',
    ]
    const nodes = cats.map((cat, i) =>
      makeNode({ id: `n${i}`, cat, desc: '' })
    )
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.diversity).toBe(20)
  })

  it('仅覆盖 1 个分类多样性约为 3.3', () => {
    const nodes = [makeNode({ id: 'n1', cat: 'concept', desc: '' })]
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.diversity).toBeCloseTo(3.3, 0)
  })

  it('全部有描述达到深度满分 20', () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      makeNode({ id: `n${i}`, cat: 'concept', desc: '有描述内容' })
    )
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.depth).toBe(20)
  })

  it('无描述时深度为 0', () => {
    const nodes = [makeNode({ id: 'n1', cat: 'concept', desc: '' })]
    const result = calculateHealthScore(nodes, [])
    expect(result.breakdown.depth).toBe(0)
  })

  it('总分 >= 80 为茁壮', () => {
    const cats: Array<'concept' | 'rule' | 'frame' | 'insight' | 'pitfall' | 'metaphor'> = [
      'concept', 'rule', 'frame', 'insight', 'pitfall', 'metaphor',
    ]
    const nodes = cats.flatMap((cat, i) => [
      makeNode({ id: `n${i}a`, cat, desc: 'desc' }),
      makeNode({ id: `n${i}b`, cat, desc: 'desc' }),
    ])
    const relations = Array.from({ length: 6 }, (_, i) =>
      makeRelation({ id: `r${i}`, sourceId: `n${i}a`, targetId: `n${i}b` })
    )
    const result = calculateHealthScore(nodes, relations)
    expect(result.total).toBeGreaterThanOrEqual(80)
    expect(result.level.label).toBe('茁壮')
  })

  it('总分 60-79 为良好', () => {
    // 8 nodes, 3 cats, 3 relations, all with desc
    // density=24, relation=22.5, diversity=10, depth=20 → total≈76
    const nodes = Array.from({ length: 8 }, (_, i) =>
      makeNode({
        id: `n${i}`,
        cat: i < 3 ? 'concept' : i < 6 ? 'rule' : 'insight',
        desc: 'desc',
      })
    )
    const relations = [
      makeRelation({ id: 'r1', sourceId: 'n0', targetId: 'n1' }),
      makeRelation({ id: 'r2', sourceId: 'n2', targetId: 'n3' }),
      makeRelation({ id: 'r3', sourceId: 'n4', targetId: 'n5' }),
    ]
    const result = calculateHealthScore(nodes, relations)
    expect(result.total).toBeGreaterThanOrEqual(60)
    expect(result.total).toBeLessThan(80)
    expect(result.level.label).toBe('良好')
  })

  it('总分 40-59 为初萌', () => {
    // 4 nodes, 2 cats, 1 relation, 2 with desc
    // density=12, relation=15, diversity=6.67, depth=10 → total≈44
    const nodes = [
      makeNode({ id: 'n1', cat: 'concept', desc: 'desc' }),
      makeNode({ id: 'n2', cat: 'concept', desc: 'desc' }),
      makeNode({ id: 'n3', cat: 'rule', desc: '' }),
      makeNode({ id: 'n4', cat: 'rule', desc: '' }),
    ]
    const relations = [makeRelation({ id: 'r1', sourceId: 'n1', targetId: 'n2' })]
    const result = calculateHealthScore(nodes, relations)
    expect(result.total).toBeGreaterThanOrEqual(40)
    expect(result.total).toBeLessThan(60)
    expect(result.level.label).toBe('初萌')
  })

  it('总分 20-39 为萌芽', () => {
    // 2 nodes, 2 cats, 0 relations, 1 with desc
    // density=6, relation=0, diversity=6.67, depth=10 → total≈23
    const nodes = [
      makeNode({ id: 'n1', cat: 'concept', desc: 'desc' }),
      makeNode({ id: 'n2', cat: 'rule', desc: '' }),
    ]
    const result = calculateHealthScore(nodes, [])
    expect(result.total).toBeGreaterThanOrEqual(20)
    expect(result.total).toBeLessThan(40)
    expect(result.level.label).toBe('萌芽')
  })

  it('总分 0-19 为待育', () => {
    const result = calculateHealthScore([], [])
    expect(result.total).toBe(0)
    expect(result.level.label).toBe('待育')
  })
})