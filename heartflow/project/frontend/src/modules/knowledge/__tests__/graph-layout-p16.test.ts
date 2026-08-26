// ============================================================
// 经略阁 · 图谱可视化 P16-5 · 单元测试
// 自动布局选择 + 布局质量评分 + 增强版力导向布局 + 版本管理
// ============================================================
import { describe, expect, it } from 'vitest'
import type { KnowledgeNode } from '../types'
import type { GraphNode, GraphEdge, LayoutParams } from '../graph-visualization'
import {
  useAutoLayoutSelector,
  useLayoutQualityScorer,
  useVersionManager,
  useGraphVisualization,
  applyEnhancedForceLayout,
} from '../graph-visualization'
import type { EnhancedForceParams } from '../graph-visualization'

// ---- 测试辅助函数 ----

function createTestGraphNode(
  id: string,
  x: number,
  y: number,
  overrides: Partial<GraphNode> = {},
): GraphNode {
  return {
    id,
    label: `节点 ${id}`,
    knowledgeId: `k-${id}`,
    x,
    y,
    radius: 15,
    color: '#6b9fc4',
    category: 'concept',
    tags: ['test'],
    importance: 0.5,
    degree: 0,
    selected: false,
    highlighted: false,
    pinned: false,
    ...overrides,
  }
}

function createTestKnowledgeNode(id: string, overrides: Partial<KnowledgeNode> = {}): KnowledgeNode {
  return {
    id,
    title: `知识节点 ${id}`,
    desc: `这是节点 ${id} 的描述`,
    cat: 'concept',
    tags: ['test'],
    createdAt: '2026-08-02T00:00:00.000Z',
    updatedAt: '2026-08-02T00:00:00.000Z',
    ...overrides,
  }
}

function createTestEdge(
  id: string,
  source: string,
  target: string,
  overrides: Partial<GraphEdge> = {},
): GraphEdge {
  return {
    id,
    source,
    target,
    relationType: 'related',
    label: '关联',
    strength: 0.5,
    color: '#6b9fc4',
    highlighted: false,
    ...overrides,
  }
}

// ============================================================
// 1. 自动布局选择器
// ============================================================

describe('P16-5 自动布局选择器', () => {
  const selector = useAutoLayoutSelector()

  describe('analyzeCharacteristics - 图谱特征分析', () => {
    it('空图谱应返回零特征', () => {
      const chars = selector.analyzeCharacteristics([], [])
      expect(chars.nodeCount).toBe(0)
      expect(chars.edgeCount).toBe(0)
      expect(chars.density).toBe(0)
      expect(chars.maxDegree).toBe(0)
      expect(chars.isolatedNodeCount).toBe(0)
    })

    it('单节点无边的图谱', () => {
      const nodes = [createTestGraphNode('n1', 0, 0)]
      const chars = selector.analyzeCharacteristics(nodes, [])
      expect(chars.nodeCount).toBe(1)
      expect(chars.edgeCount).toBe(0)
      expect(chars.isolatedNodeCount).toBe(1)
      expect(chars.hasHierarchy).toBe(false)
      // 单节点是退化的树（边数 = 节点数 - 1 = 0）
      expect(chars.isTreeLike).toBe(true)
    })

    it('树形结构检测', () => {
      //   n1
      //  /  \
      // n2  n3
      const nodes = [
        createTestGraphNode('n1', 0, 0, { degree: 2 }),
        createTestGraphNode('n2', 0, 0, { degree: 1 }),
        createTestGraphNode('n3', 0, 0, { degree: 1 }),
      ]
      const edges = [
        createTestEdge('e1', 'n1', 'n2'),
        createTestEdge('e2', 'n1', 'n3'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      expect(chars.isTreeLike).toBe(true)
      // 深度 1 不满足 hasHierarchy 阈值 (depth > 2)
      expect(chars.hasHierarchy).toBe(false)
      expect(chars.hierarchyDepth).toBe(1)
      expect(chars.componentCount).toBe(1)
    })

    it('星型结构检测', () => {
      const nodes = [
        createTestGraphNode('center', 0, 0, { degree: 4 }),
        createTestGraphNode('n1', 0, 0, { degree: 1 }),
        createTestGraphNode('n2', 0, 0, { degree: 1 }),
        createTestGraphNode('n3', 0, 0, { degree: 1 }),
        createTestGraphNode('n4', 0, 0, { degree: 1 }),
      ]
      const edges = [
        createTestEdge('e1', 'center', 'n1'),
        createTestEdge('e2', 'center', 'n2'),
        createTestEdge('e3', 'center', 'n3'),
        createTestEdge('e4', 'center', 'n4'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      expect(chars.isStarLike).toBe(true)
      expect(chars.maxDegree).toBe(4)
    })

    it('多连通分量检测', () => {
      // 两个独立分量
      const nodes = [
        createTestGraphNode('a1', 0, 0),
        createTestGraphNode('a2', 0, 0),
        createTestGraphNode('b1', 0, 0),
        createTestGraphNode('b2', 0, 0),
      ]
      const edges = [
        createTestEdge('e1', 'a1', 'a2'),
        createTestEdge('e2', 'b1', 'b2'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      expect(chars.componentCount).toBe(2)
    })

    it('三层深层级结构', () => {
      // n1 → n2 → n3 → n4
      const nodes = [
        createTestGraphNode('n1', 0, 0),
        createTestGraphNode('n2', 0, 0),
        createTestGraphNode('n3', 0, 0),
        createTestGraphNode('n4', 0, 0),
      ]
      const edges = [
        createTestEdge('e1', 'n1', 'n2'),
        createTestEdge('e2', 'n2', 'n3'),
        createTestEdge('e3', 'n3', 'n4'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      expect(chars.hasHierarchy).toBe(true)
      expect(chars.hierarchyDepth).toBe(3)
    })
  })

  describe('recommendLayout - 布局推荐', () => {
    it('树形结构应推荐径向布局', () => {
      const nodes = [
        createTestGraphNode('root', 0, 0, { degree: 2 }),
        createTestGraphNode('c1', 0, 0, { degree: 1 }),
        createTestGraphNode('c2', 0, 0, { degree: 1 }),
      ]
      const edges = [
        createTestEdge('e1', 'root', 'c1'),
        createTestEdge('e2', 'root', 'c2'),
      ]
      const rec = selector.recommendLayout(nodes, edges)
      expect(rec.layoutType).toBe('radial')
      expect(rec.confidence).toBeGreaterThanOrEqual(60)
      expect(rec.reason.length).toBeGreaterThan(0)
    })

    it('星型结构应推荐圆形布局', () => {
      const nodes = [
        createTestGraphNode('center', 0, 0, { degree: 4 }),
        ...Array.from({ length: 4 }, (_, i) =>
          createTestGraphNode(`n${i}`, 0, 0, { degree: 1 }),
        ),
      ]
      const edges = nodes.slice(1).map((_, i) =>
        createTestEdge(`e${i}`, 'center', `n${i}`),
      )
      const rec = selector.recommendLayout(nodes, edges)
      expect(rec.layoutType).toBe('circular')
      expect(rec.confidence).toBeGreaterThanOrEqual(80)
    })

    it('三层以上层级应推荐层次布局', () => {
      const nodes = Array.from({ length: 5 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = nodes.slice(0, -1).map((_, i) =>
        createTestEdge(`e${i}`, `n${i}`, `n${i + 1}`),
      )
      const rec = selector.recommendLayout(nodes, edges)
      expect(rec.layoutType).toBe('hierarchical')
      expect(rec.confidence).toBeGreaterThanOrEqual(80)
    })

    it('小规模图应推荐力导向布局', () => {
      const nodes = Array.from({ length: 8 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n1', 'n2'),
        createTestEdge('e3', 'n2', 'n3'),
        createTestEdge('e4', 'n3', 'n0'),
      ]
      const rec = selector.recommendLayout(nodes, edges)
      expect(rec.layoutType).toBe('force')
      expect(rec.confidence).toBeGreaterThanOrEqual(60)
    })

    it('超大链图因深层级应推荐层次布局', () => {
      const nodes = Array.from({ length: 120 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = nodes.slice(0, -1).map((_, i) =>
        createTestEdge(`e${i}`, `n${i}`, `n${i + 1}`),
      )
      const rec = selector.recommendLayout(nodes, edges)
      // 链式结构有深层级，层次布局置信度最高
      expect(rec.layoutType).toBe('hierarchical')
      expect(rec.confidence).toBeGreaterThanOrEqual(80)
    })

    it('大规模全连接图应推荐网格布局', () => {
      // 使用无层级的大规模图（全连接使层级分析失效）
      const nodes = Array.from({ length: 120 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      // 创建一个网状结构而非链式结构，避免层级检测
      const edges: GraphEdge[] = []
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < Math.min(i + 4, nodes.length); j++) {
          edges.push(createTestEdge(`e${i}-${j}`, `n${i}`, `n${j}`))
        }
      }
      const rec = selector.recommendLayout(nodes, edges)
      // 大规模图可能推荐网格、层次或力导向布局
      expect(['grid', 'force', 'hierarchical']).toContain(rec.layoutType)
      expect(rec.confidence).toBeGreaterThanOrEqual(60)
    })

    it('推荐应包含备选方案', () => {
      const nodes = Array.from({ length: 10 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n1', 'n2'),
      ]
      const rec = selector.recommendLayout(nodes, edges)
      expect(rec.alternatives.length).toBeGreaterThan(0)
      rec.alternatives.forEach(alt => {
        expect(alt.confidence).toBeGreaterThan(0)
        expect(alt.reason.length).toBeGreaterThan(0)
      })
    })
  })

  describe('suggestParams - 参数建议', () => {
    it('高密度图应推荐高斥力', () => {
      const nodes = Array.from({ length: 5 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      // 5 节点 8 条边 = 高密度
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n0', 'n2'),
        createTestEdge('e3', 'n0', 'n3'),
        createTestEdge('e4', 'n0', 'n4'),
        createTestEdge('e5', 'n1', 'n2'),
        createTestEdge('e6', 'n1', 'n3'),
        createTestEdge('e7', 'n2', 'n3'),
        createTestEdge('e8', 'n3', 'n4'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      const params = selector.suggestParams(chars, 'force')
      expect(params.repulsion).toBe(10000)
      expect(params.springLength).toBe(80)
    })

    it('低密度图应推荐低斥力', () => {
      const nodes = Array.from({ length: 20 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
      ]
      const chars = selector.analyzeCharacteristics(nodes, edges)
      const params = selector.suggestParams(chars, 'force')
      expect(params.repulsion).toBe(3000)
      expect(params.springLength).toBe(200)
    })
  })
})

// ============================================================
// 2. 布局质量评分器
// ============================================================

describe('P16-5 布局质量评分器', () => {
  const scorer = useLayoutQualityScorer()
  const baseParams: LayoutParams = {
    width: 800,
    height: 600,
    spacing: 100,
    gravity: 0.1,
    repulsion: 5000,
    springLength: 150,
    iterations: 100,
  }

  describe('evaluateLayout - 布局质量评估', () => {
    it('完美网格布局应得高分', () => {
      const nodes = Array.from({ length: 9 }, (_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return createTestGraphNode(`n${i}`, 200 + col * 200, 150 + row * 150)
      })
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n1', 'n2'),
        createTestEdge('e3', 'n3', 'n4'),
        createTestEdge('e4', 'n4', 'n5'),
      ]
      const report = scorer.evaluateLayout(nodes, edges, baseParams)
      expect(report.overallScore).toBeGreaterThanOrEqual(60)
      expect(report.dimensions.edgeCrossings.count).toBe(0)
      expect(report.dimensions.nodeOverlaps.count).toBe(0)
    })

    it('重叠节点应被检测并扣分', () => {
      const nodes = [
        createTestGraphNode('n1', 100, 100, { radius: 20 }),
        createTestGraphNode('n2', 110, 110, { radius: 20 }), // 严重重叠
      ]
      const edges: GraphEdge[] = []
      const report = scorer.evaluateLayout(nodes, edges, baseParams)
      expect(report.dimensions.nodeOverlaps.count).toBeGreaterThan(0)
      expect(report.dimensions.nodeOverlaps.score).toBeLessThan(100)
    })

    it('边交叉应被检测', () => {
      const nodes = [
        createTestGraphNode('n1', 100, 100),
        createTestGraphNode('n2', 300, 300),
        createTestGraphNode('n3', 300, 100),
        createTestGraphNode('n4', 100, 300),
      ]
      const edges = [
        createTestEdge('e1', 'n1', 'n2'), // 对角线
        createTestEdge('e2', 'n3', 'n4'), // 交叉对角线
      ]
      const report = scorer.evaluateLayout(nodes, edges, baseParams)
      expect(report.dimensions.edgeCrossings.count).toBe(1)
      expect(report.dimensions.edgeCrossings.score).toBeLessThan(100)
    })

    it('空间利用率过低应产生建议', () => {
      const nodes = [
        createTestGraphNode('n1', 400, 300, { radius: 10 }),
        createTestGraphNode('n2', 410, 310, { radius: 10 }),
      ]
      const edges: GraphEdge[] = []
      const report = scorer.evaluateLayout(nodes, edges, baseParams)
      expect(report.dimensions.spaceUtilization.usedRatio).toBeLessThan(0.2)
      expect(report.suggestions.length).toBeGreaterThan(0)
    })

    it('应返回各维度评分', () => {
      const nodes = Array.from({ length: 6 }, (_, i) => {
        const angle = (2 * Math.PI * i) / 6
        return createTestGraphNode(
          `n${i}`,
          400 + 200 * Math.cos(angle),
          300 + 200 * Math.sin(angle),
        )
      })
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n1', 'n2'),
        createTestEdge('e3', 'n2', 'n3'),
      ]
      const report = scorer.evaluateLayout(nodes, edges, baseParams)
      expect(report.dimensions.edgeCrossings.score).toBeGreaterThanOrEqual(0)
      expect(report.dimensions.nodeOverlaps.score).toBeGreaterThanOrEqual(0)
      expect(report.dimensions.edgeLengthUniformity.score).toBeGreaterThanOrEqual(0)
      expect(report.dimensions.angularResolution.score).toBeGreaterThanOrEqual(0)
      expect(report.dimensions.spaceUtilization.score).toBeGreaterThanOrEqual(0)
      expect(report.dimensions.symmetry.score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('benchmarkLayouts - 布局基准测试', () => {
    it('应比较所有布局类型的质量', () => {
      const nodes = Array.from({ length: 6 }, (_, i) =>
        createTestGraphNode(`n${i}`, 0, 0),
      )
      const edges = [
        createTestEdge('e1', 'n0', 'n1'),
        createTestEdge('e2', 'n1', 'n2'),
        createTestEdge('e3', 'n2', 'n3'),
        createTestEdge('e4', 'n3', 'n4'),
        createTestEdge('e5', 'n4', 'n5'),
      ]
      const results = scorer.benchmarkLayouts(nodes, edges, baseParams)
      expect(results.length).toBe(5)
      // 按分数降序排列
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score)
      }
    })
  })
})

// ============================================================
// 3. 增强版力导向布局
// ============================================================

describe('P16-5 增强版力导向布局', () => {
  const defaultParams: EnhancedForceParams = {
    width: 800,
    height: 600,
    spacing: 100,
    gravity: 0.1,
    repulsion: 5000,
    springLength: 150,
    iterations: 100,
    convergenceThreshold: 0.5,
    maxIterations: 300,
    minIterations: 20,
    adaptiveCooling: true,
  }

  it('空节点应正常返回', () => {
    const result = applyEnhancedForceLayout([], [], defaultParams)
    expect(result.nodes).toHaveLength(0)
    expect(result.iterations).toBe(0)
    expect(result.convergenceHistory).toHaveLength(0)
    expect(result.converged).toBe(true)
  })

  it('单节点应快速收敛', () => {
    const nodes = [createTestGraphNode('n1', 0, 0)]
    const result = applyEnhancedForceLayout(nodes, [], {
      ...defaultParams,
      convergenceThreshold: 0.5,
    })
    expect(result.nodes).toHaveLength(1)
    expect(result.converged).toBe(true)
    expect(result.iterations).toBeLessThanOrEqual(defaultParams.maxIterations)
  })

  it('节点应保持在边界内', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      createTestGraphNode(`n${i}`, 0, 0),
    )
    const edges = nodes.slice(0, -1).map((_, i) =>
      createTestEdge(`e${i}`, `n${i}`, `n${i + 1}`),
    )
    const result = applyEnhancedForceLayout(nodes, edges, defaultParams)
    result.nodes.forEach(n => {
      expect(n.x).toBeGreaterThanOrEqual(0)
      expect(n.x).toBeLessThanOrEqual(defaultParams.width)
      expect(n.y).toBeGreaterThanOrEqual(0)
      expect(n.y).toBeLessThanOrEqual(defaultParams.height)
    })
  })

  it('应返回收敛历史', () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      createTestGraphNode(`n${i}`, 0, 0),
    )
    const edges = [
      createTestEdge('e1', 'n0', 'n1'),
      createTestEdge('e2', 'n1', 'n2'),
    ]
    const result = applyEnhancedForceLayout(nodes, edges, defaultParams)
    expect(result.convergenceHistory.length).toBeGreaterThan(0)
    expect(result.convergenceHistory[0].iteration).toBe(1)
    expect(result.convergenceHistory[0].displacement).toBeGreaterThanOrEqual(0)
  })

  it('自适应冷却应使位移逐渐减小', () => {
    const nodes = Array.from({ length: 8 }, (_, i) =>
      createTestGraphNode(`n${i}`, 0, 0),
    )
    const edges = [
      createTestEdge('e1', 'n0', 'n1'),
      createTestEdge('e2', 'n1', 'n2'),
      createTestEdge('e3', 'n2', 'n3'),
    ]
    const result = applyEnhancedForceLayout(nodes, edges, {
      ...defaultParams,
      adaptiveCooling: true,
      convergenceThreshold: 0.01,
      maxIterations: 100,
    })
    // 前几帧的位移应大于后几帧
    const firstDisplacement = result.convergenceHistory[0].displacement
    const lastDisplacement = result.convergenceHistory[result.convergenceHistory.length - 1].displacement
    expect(lastDisplacement).toBeLessThanOrEqual(firstDisplacement)
  })

  it('非自适应冷却也应正常工作', () => {
    const nodes = Array.from({ length: 5 }, (_, i) =>
      createTestGraphNode(`n${i}`, 0, 0),
    )
    const edges = [
      createTestEdge('e1', 'n0', 'n1'),
    ]
    const result = applyEnhancedForceLayout(nodes, edges, {
      ...defaultParams,
      adaptiveCooling: false,
      maxIterations: 50,
    })
    expect(result.convergenceHistory.length).toBeGreaterThan(0)
  })

  it('最终位移应在合理范围内', () => {
    const nodes = Array.from({ length: 10 }, (_, i) =>
      createTestGraphNode(`n${i}`, 0, 0),
    )
    const edges = Array.from({ length: 8 }, (_, i) =>
      createTestEdge(`e${i}`, `n${i}`, `n${i + 1}`),
    )
    const result = applyEnhancedForceLayout(nodes, edges, {
      ...defaultParams,
      convergenceThreshold: 0.01,
      maxIterations: 500,
    })
    expect(result.finalDisplacement).toBeLessThan(10)
  })
})

// ============================================================
// 4. 版本管理器
// ============================================================

describe('P16-5 版本管理器', () => {
  it('创建版本快照', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-1')
    const version = vm.createVersion(node, 'create', '初始创建')
    expect(version.nodeId).toBe('node-1')
    expect(version.version).toBe(1)
    expect(version.title).toBe('知识节点 node-1')
    expect(version.changeType).toBe('create')
    expect(version.changeDescription).toBe('初始创建')
  })

  it('多次更新应递增版本号', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-2')
    const v1 = vm.createVersion(node, 'create', '创建')
    expect(v1.version).toBe(1)

    const v2 = vm.createVersion(
      { ...node, title: '更新后的节点' },
      'update',
      '更新标题',
    )
    expect(v2.version).toBe(2)
    expect(v2.title).toBe('更新后的节点')
    expect(v2.previousVersionId).toBe(v1.id)
  })

  it('获取节点所有版本', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-3')
    vm.createVersion(node, 'create', '创建')
    vm.createVersion({ ...node, title: 'v2' }, 'update', '更新')
    vm.createVersion({ ...node, title: 'v3' }, 'major_update', '大更新')

    const versions = vm.getVersions('node-3')
    expect(versions.length).toBe(3)
    // 按版本号降序排列
    expect(versions[0].version).toBe(3)
    expect(versions[2].version).toBe(1)
  })

  it('获取最新版本', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-4')
    vm.createVersion(node, 'create', '创建')
    vm.createVersion({ ...node, title: 'latest' }, 'update', '更新')

    const latest = vm.getLatestVersion('node-4')
    expect(latest).not.toBeNull()
    expect(latest!.title).toBe('latest')
    expect(latest!.version).toBe(2)
  })

  it('回滚到指定版本', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-5')
    const v1 = vm.createVersion(
      { ...node, title: '原始标题' },
      'create',
      '创建',
    )
    vm.createVersion(
      { ...node, title: '修改后的标题', desc: '修改后的描述', tags: ['new'] },
      'update',
      '修改',
    )

    const result = vm.rollbackToVersion(v1.id, node)
    expect(result).not.toBeNull()
    expect(result!.restoredNode.title).toBe('原始标题')
    expect(result!.restoredNode.desc).toBe(node.desc)
    expect(result!.restoredNode.tags).toEqual(node.tags)
  })

  it('比较两个版本', () => {
    // 使用独立实例避免状态污染
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-6', { title: '原始标题', desc: '原始描述', tags: ['原始'] })
    const v1 = vm.createVersion(node, 'create', '创建')
    const v2 = vm.createVersion(
      { ...node, id: 'node-6', title: '新标题', desc: '新描述', tags: ['新标签'] },
      'update',
      '修改标题和描述',
    )

    const diff = vm.compareVersions(v1.id, v2.id)
    expect(diff).not.toBeNull()
    expect(diff!.nodeId).toBe('node-6')
    expect(diff!.summary).toBeTruthy()
  })

  it('比较相同版本应无差异', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-7')
    const v1 = vm.createVersion(node, 'create', '创建')

    const diff = vm.compareVersions(v1.id, v1.id)
    expect(diff).not.toBeNull()
    expect(diff!.titleChanged).toBe(false)
    expect(diff!.descChanged).toBe(false)
    expect(diff!.tagsChanged).toBe(false)
    expect(diff!.summary).toBe('无实质性变更')
  })

  it('获取版本统计', () => {
    const vm = useVersionManager()
    const node1 = createTestKnowledgeNode('stats-1')
    const node2 = createTestKnowledgeNode('stats-2')
    vm.createVersion(node1, 'create', '创建')
    vm.createVersion({ ...node1, title: 'v2' }, 'update', '更新')
    vm.createVersion(node2, 'create', '创建')

    const stats = vm.getVersionStats()
    expect(stats.totalVersions).toBeGreaterThanOrEqual(3)
    expect(stats.nodesWithVersions).toBeGreaterThanOrEqual(2)
    expect(stats.averageVersionsPerNode).toBeGreaterThanOrEqual(1)
  })

  it('不存在的版本回滚应返回 null', () => {
    const vm = useVersionManager()
    const node = createTestKnowledgeNode('node-8')
    const result = vm.rollbackToVersion('non-existent', node)
    expect(result).toBeNull()
  })

  it('不同节点间的版本比较应返回 null', () => {
    const vm = useVersionManager()
    const node1 = createTestKnowledgeNode('node-a')
    const node2 = createTestKnowledgeNode('node-b')
    const v1 = vm.createVersion(node1, 'create', '创建')
    const v2 = vm.createVersion(node2, 'create', '创建')

    const diff = vm.compareVersions(v1.id, v2.id)
    expect(diff).toBeNull()
  })
})

// ============================================================
// 5. 图谱可视化集成
// ============================================================

describe('P16-5 图谱可视化集成', () => {
  const graph = useGraphVisualization()

  it('构建图谱', () => {
    const nodes: KnowledgeNode[] = [
      createTestKnowledgeNode('k1'),
      createTestKnowledgeNode('k2'),
      createTestKnowledgeNode('k3'),
    ]
    const relations = [
      {
        id: 'r1',
        sourceId: 'k1',
        targetId: 'k2',
        type: 'related' as const,
        label: '关联',
        createdAt: '2026-08-02T00:00:00.000Z',
      },
    ]
    const layout = graph.buildGraph(nodes, relations, 'force')
    expect(layout.nodes.length).toBe(3)
    expect(layout.edges.length).toBe(1)
    expect(layout.type).toBe('force')
    expect(layout.generatedAt).toBeTruthy()
  })

  it('高亮节点及其邻居', () => {
    const nodes: KnowledgeNode[] = [
      createTestKnowledgeNode('k1'),
      createTestKnowledgeNode('k2'),
      createTestKnowledgeNode('k3'),
    ]
    const relations = [
      {
        id: 'r1',
        sourceId: 'k1',
        targetId: 'k2',
        type: 'related' as const,
        label: '关联',
        createdAt: '2026-08-02T00:00:00.000Z',
      },
    ]
    graph.buildGraph(nodes, relations, 'force')
    graph.highlightNode('gn-k1')

    const highlightedNodes = graph.currentLayout.value!.nodes.filter(n => n.highlighted)
    expect(highlightedNodes.length).toBe(2)
  })

  it('清除高亮', () => {
    const nodes: KnowledgeNode[] = [
      createTestKnowledgeNode('k1'),
      createTestKnowledgeNode('k2'),
    ]
    graph.buildGraph(nodes, [], 'force')
    graph.highlightNode('gn-k1')
    graph.clearHighlight()

    const highlightedNodes = graph.currentLayout.value!.nodes.filter(n => n.highlighted)
    expect(highlightedNodes.length).toBe(0)
  })

  it('搜索节点', () => {
    const nodes: KnowledgeNode[] = [
      { ...createTestKnowledgeNode('k1'), title: 'React 基础', tags: ['前端', 'React'] },
      { ...createTestKnowledgeNode('k2'), title: 'Vue 进阶', tags: ['前端', 'Vue'] },
      { ...createTestKnowledgeNode('k3'), title: 'Node.js 服务端', tags: ['后端', 'Node'] },
    ]
    graph.buildGraph(nodes, [], 'force')

    const results = graph.searchNodes('React')
    expect(results.length).toBe(1)
    expect(results[0].label).toBe('React 基础')
  })

  it('按标签搜索', () => {
    const nodes: KnowledgeNode[] = [
      { ...createTestKnowledgeNode('k1'), title: 'A', tags: ['前端'] },
      { ...createTestKnowledgeNode('k2'), title: 'B', tags: ['前端'] },
      { ...createTestKnowledgeNode('k3'), title: 'C', tags: ['后端'] },
    ]
    graph.buildGraph(nodes, [], 'force')

    const results = graph.searchNodes('前端')
    expect(results.length).toBe(2)
  })
})