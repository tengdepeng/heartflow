// ============================================================
// 根脉之庭 · P20-5 单元测试
// 衰减引擎 + 增强可视化 + 视图桥接
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import type { Root, RootLayer } from '../types'
import { useDecayEngine } from '../decay-engine'
import { DEFAULT_DECAY_CONFIG } from '../decay-engine'
import { useRootVisualization } from '../root-visualization'
import type { GrowthAnimation, LayoutType } from '../root-visualization'
import { useRootBridge } from '../root-bridge'

// ---- 测试辅助函数 ----

function createRoot(overrides: Partial<Root> = {}): Root {
  return {
    id: 'rt_' + Math.random().toString(36).slice(2, 8),
    layer: 'soil' as RootLayer,
    text: '测试根系',
    detail: '测试详情',
    era: '2020s',
    icon: '🪨',
    strength: 0.5,
    connections: [],
    tags: [],
    color: '#d4a574',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
    _expanded: false,
    ...overrides,
  }
}

// ============================================================
// 1. useDecayEngine — 衰减引擎
// ============================================================

describe('P20-5 衰减引擎', () => {
  let engine: ReturnType<typeof useDecayEngine>

  beforeEach(() => {
    engine = useDecayEngine()
  })

  describe('配置管理', () => {
    it('默认配置与 DEFAULT_DECAY_CONFIG 一致', () => {
      expect(engine.config.value).toEqual(DEFAULT_DECAY_CONFIG)
    })

    it('updateConfig 更新部分配置', () => {
      engine.updateConfig({ thresholdDays: 7 })
      expect(engine.config.value.thresholdDays).toBe(7)
      expect(engine.config.value.baseDecayRate).toBe(DEFAULT_DECAY_CONFIG.baseDecayRate)
    })

    it('resetConfig 恢复默认配置', () => {
      engine.updateConfig({ thresholdDays: 7, baseDecayRate: 0.1 })
      engine.resetConfig()
      expect(engine.config.value).toEqual(DEFAULT_DECAY_CONFIG)
    })
  })

  describe('calculateDecay - 衰减计算', () => {
    it('新节点（保护期内）不衰减', () => {
      const root = createRoot({ lastUpdatedAt: new Date().toISOString() })
      const result = engine.calculateDecay(root)
      expect(result.decayAmount).toBe(0)
      expect(result.wasProtected).toBe(true)
    })

    it('超过阈值触发衰减', () => {
      const oldDate = new Date(Date.now() - 30 * 86400000).toISOString() // 30 天前
      const root = createRoot({ lastUpdatedAt: oldDate, strength: 0.8 })
      const result = engine.calculateDecay(root)
      expect(result.decayAmount).toBeGreaterThan(0)
      expect(result.wasProtected).toBe(false)
    })

    it('有连接的节点衰减更慢', () => {
      const oldDate = new Date(Date.now() - 30 * 86400000).toISOString()
      const rootWithConnections = createRoot({
        lastUpdatedAt: oldDate,
        strength: 0.8,
        connections: ['rt_a', 'rt_b', 'rt_c'],
      })
      const rootNoConnections = createRoot({
        lastUpdatedAt: oldDate,
        strength: 0.8,
        connections: [],
      })

      const resultWith = engine.calculateDecay(rootWithConnections)
      const resultWithout = engine.calculateDecay(rootNoConnections)

      // 有连接保护的衰减量应小于无链接的
      expect(resultWith.decayAmount).toBeLessThan(resultWithout.decayAmount)
    })

    it('有标签的节点衰减减半', () => {
      const oldDate = new Date(Date.now() - 30 * 86400000).toISOString()
      const rootWithTags = createRoot({
        lastUpdatedAt: oldDate,
        strength: 0.8,
        tags: ['家庭', '成长'],
      })
      const rootNoTags = createRoot({
        lastUpdatedAt: oldDate,
        strength: 0.8,
        tags: [],
      })

      const resultWith = engine.calculateDecay(rootWithTags)
      const resultWithout = engine.calculateDecay(rootNoTags)

      expect(resultWith.decayAmount).toBeLessThan(resultWithout.decayAmount)
    })

    it('不衰减到最低强度以下', () => {
      const oldDate = new Date(Date.now() - 365 * 86400000).toISOString()
      const root = createRoot({ lastUpdatedAt: oldDate, strength: 0.05 })
      const result = engine.calculateDecay(root)
      expect(result.decayAmount).toBe(0)
    })
  })

  describe('runDecayCheck - 衰减检查', () => {
    it('空列表返回空报告', () => {
      const report = engine.runDecayCheck([])
      expect(report.records).toHaveLength(0)
      expect(report.decayedCount).toBe(0)
      expect(report.protectedCount).toBe(0)
      expect(report.totalDecay).toBe(0)
    })

    it('新节点被保护，不衰减', () => {
      const roots = [createRoot({ lastUpdatedAt: new Date().toISOString() })]
      const report = engine.runDecayCheck(roots)
      expect(report.protectedCount).toBe(1)
      expect(report.decayedCount).toBe(0)
    })

    it('旧节点触发衰减并生成报告', () => {
      const oldDate = new Date(Date.now() - 60 * 86400000).toISOString()
      const roots = [createRoot({ lastUpdatedAt: oldDate, strength: 0.8 })]
      const report = engine.runDecayCheck(roots)

      expect(report.decayedCount).toBe(1)
      expect(report.totalDecay).toBeGreaterThan(0)
      expect(report.records.length).toBeGreaterThan(0)
      expect(report.generatedAt).toBeTruthy()
    })

    it('衰减后强度不低于配置的最小值', () => {
      engine.updateConfig({ minStrength: 0.2 })
      const oldDate = new Date(Date.now() - 200 * 86400000).toISOString()
      const roots = [createRoot({ lastUpdatedAt: oldDate, strength: 0.3 })]
      engine.runDecayCheck(roots)
      expect(roots[0].strength).toBeGreaterThanOrEqual(0.2)
    })

    it('混合场景：部分衰减部分保护', () => {
      const oldDate = new Date(Date.now() - 60 * 86400000).toISOString()
      const newDate = new Date().toISOString()
      const roots = [
        createRoot({ id: 'old_1', lastUpdatedAt: oldDate, strength: 0.8 }),
        createRoot({ id: 'new_1', lastUpdatedAt: newDate, strength: 0.5 }),
      ]
      const report = engine.runDecayCheck(roots)

      expect(report.decayedCount).toBe(1)
      expect(report.protectedCount).toBe(1)
      expect(report.records.length).toBe(2)
    })
  })

  describe('calculateVitality - 生命力评分', () => {
    it('强根系生命力高', () => {
      const root = createRoot({
        strength: 0.9,
        connections: ['rt_a', 'rt_b', 'rt_c'],
        tags: ['家庭', '成长', '信念'],
        lastUpdatedAt: new Date().toISOString(),
      })
      const vitality = engine.calculateVitality(root)
      expect(vitality.score).toBeGreaterThanOrEqual(60)
      expect(vitality.status).toMatch(/thriving|healthy/)
    })

    it('弱根系生命力低', () => {
      const oldDate = new Date(Date.now() - 90 * 86400000).toISOString()
      const root = createRoot({
        strength: 0.2,
        connections: [],
        tags: [],
        lastUpdatedAt: oldDate,
      })
      const vitality = engine.calculateVitality(root)
      expect(vitality.score).toBeLessThan(40)
      expect(vitality.status).toMatch(/waning|critical/)
    })

    it('包含所有评分因子', () => {
      const root = createRoot()
      const vitality = engine.calculateVitality(root)
      expect(vitality.strengthFactor).toBeGreaterThanOrEqual(0)
      expect(vitality.recencyFactor).toBeGreaterThanOrEqual(0)
      expect(vitality.connectionFactor).toBeGreaterThanOrEqual(0)
      expect(vitality.tagFactor).toBeGreaterThanOrEqual(0)
      expect(vitality.suggestion).toBeTruthy()
    })

    it('calculateAllVitality 批量计算', () => {
      const roots = [
        createRoot({ id: 'r1', strength: 0.9 }),
        createRoot({ id: 'r2', strength: 0.3 }),
      ]
      const scores = engine.calculateAllVitality(roots)
      expect(scores).toHaveLength(2)
      expect(scores[0].score).toBeGreaterThan(scores[1].score)
    })
  })

  describe('predictDecay - 衰减预测', () => {
    it('预测未来衰减', () => {
      const oldDate = new Date(Date.now() - 30 * 86400000).toISOString()
      const root = createRoot({ lastUpdatedAt: oldDate, strength: 0.8 })
      const prediction = engine.predictDecay(root, 60)
      expect(prediction.predictedStrength).toBeLessThan(0.8)
    })

    it('新节点预测不衰减', () => {
      const root = createRoot({ lastUpdatedAt: new Date().toISOString(), strength: 0.8 })
      const prediction = engine.predictDecay(root, 7)
      expect(prediction.predictedStrength).toBe(0.8)
      expect(prediction.willReachMin).toBe(false)
    })
  })
})

// ============================================================
// 2. useRootVisualization — 增强可视化
// ============================================================

describe('P20-5 增强可视化', () => {
  let viz: ReturnType<typeof useRootVisualization>

  // 创建 TraceTree mock
  const mockTraceTree = {
    soil: [],
    era: [],
    branch: [],
    flatNodes: [],
    threads: [],
  }

  beforeEach(() => {
    viz = useRootVisualization()
  })

  describe('generateVisualTree - 可视化树', () => {
    it('空列表生成空树', () => {
      const tree = viz.generateVisualTree([], mockTraceTree)
      expect(tree.nodes).toHaveLength(0)
      expect(tree.edges).toHaveLength(0)
      expect(tree.totalNodes).toBe(0)
    })

    it('单根系生成可视化树', () => {
      const roots = [createRoot({ id: 'r1', layer: 'soil', text: '故乡' })]
      const tree = viz.generateVisualTree(roots, mockTraceTree)
      expect(tree.nodes).toHaveLength(1)
      expect(tree.nodes[0].label).toBe('故乡')
      expect(tree.nodes[0].layer).toBe('soil')
    })

    it('多层级根系数生成可视化树', () => {
      const roots = [
        createRoot({ id: 'r1', layer: 'soil', text: '原生家庭', strength: 0.8 }),
        createRoot({ id: 'r2', layer: 'era', text: '大学时代', strength: 0.6 }),
        createRoot({ id: 'r3', layer: 'branch', text: '核心价值观', strength: 0.7 }),
      ]
      const tree = viz.generateVisualTree(roots, mockTraceTree)
      expect(tree.nodes).toHaveLength(3)
      expect(tree.totalNodes).toBe(3)
    })

    it('有关联的根系生成边', () => {
      const roots = [
        createRoot({ id: 'r1', layer: 'soil', text: '家庭', connections: ['r2'] }),
        createRoot({ id: 'r2', layer: 'era', text: '成长', connections: ['r1'] }),
      ]
      const tree = viz.generateVisualTree(roots, mockTraceTree)
      expect(tree.edges.length).toBeGreaterThan(0)
      expect(tree.totalEdges).toBe(1)
    })

    it('支持不同布局类型', () => {
      const roots = [createRoot({ id: 'r1', layer: 'soil', text: '测试' })]
      const layouts: LayoutType[] = ['vertical', 'horizontal', 'radial', 'compact', 'tree']

      for (const layout of layouts) {
        const tree = viz.generateVisualTree(roots, mockTraceTree, '测试', layout)
        expect(tree.layoutType).toBe(layout)
      }
    })

    it('switchLayout 切换布局', () => {
      const roots = [createRoot({ id: 'r1', layer: 'soil', text: '测试' })]
      viz.generateVisualTree(roots, mockTraceTree, '测试', 'vertical')
      const newTree = viz.switchLayout('radial', roots, mockTraceTree)
      expect(newTree.layoutType).toBe('radial')
    })
  })

  describe('节点选择', () => {
    it('selectNode 选中节点', () => {
      viz.selectNode('node-1')
      expect(viz.selectedNodeId.value).toBe('node-1')
    })

    it('selectNode(null) 取消选中', () => {
      viz.selectNode('node-1')
      viz.selectNode(null)
      expect(viz.selectedNodeId.value).toBeNull()
    })
  })

  describe('generateVitalityMap - 生命力地图', () => {
    it('空列表生成空地图', () => {
      const map = viz.generateVitalityMap([])
      expect(map.nodes).toHaveLength(0)
      expect(map.avgVitality).toBe(0)
    })

    it('正常生成生命力地图', () => {
      const roots = [
        createRoot({ id: 'r1', layer: 'soil', strength: 0.9, lastUpdatedAt: new Date().toISOString() }),
        createRoot({ id: 'r2', layer: 'era', strength: 0.3 }),
      ]
      const map = viz.generateVitalityMap(roots)
      expect(map.nodes).toHaveLength(2)
      expect(map.avgVitality).toBeGreaterThan(0)
      expect(map.maxVitality).toBeGreaterThanOrEqual(map.minVitality)
      expect(map.rating).toBeTruthy()
      expect(map.layerVitality.soil).toBeGreaterThanOrEqual(0)
      expect(map.layerVitality.era).toBeGreaterThanOrEqual(0)
    })

    it('vitalitySummary 计算属性', () => {
      const roots = [createRoot({ id: 'r1', strength: 0.8 })]
      viz.generateVitalityMap(roots)
      const summary = viz.vitalitySummary.value
      expect(summary).toBeTruthy()
      expect(summary!.avgVitality).toBeGreaterThan(0)
      expect(summary!.ratingLabel).toBeTruthy()
    })
  })

  describe('clusterRoots - 根系聚类', () => {
    it('空列表返回空聚类', () => {
      const clusters = viz.clusterRoots([])
      expect(clusters).toHaveLength(0)
    })

    it('相同标签的根系聚为一类', () => {
      const roots = [
        createRoot({ id: 'r1', text: '母亲', tags: ['家庭'] }),
        createRoot({ id: 'r2', text: '父亲', tags: ['家庭'] }),
      ]
      const clusters = viz.clusterRoots(roots)
      const familyCluster = clusters.find(c => c.name === '家庭')
      expect(familyCluster).toBeTruthy()
      expect(familyCluster!.rootIds).toHaveLength(2)
    })

    it('相同时期的根系聚为一类', () => {
      const roots = [
        createRoot({ id: 'r1', text: '大学入学', era: '大学' }),
        createRoot({ id: 'r2', text: '毕业典礼', era: '大学' }),
      ]
      const clusters = viz.clusterRoots(roots)
      const eraCluster = clusters.find(c => c.name === '大学')
      expect(eraCluster).toBeTruthy()
      expect(eraCluster!.rootIds).toHaveLength(2)
    })

    it('未分类根系单独聚类', () => {
      const roots = [createRoot({ id: 'r1', text: '孤立的根', tags: [], era: '' })]
      const clusters = viz.clusterRoots(roots)
      const uncategorized = clusters.find(c => c.id === 'cluster-uncategorized')
      expect(uncategorized).toBeTruthy()
      expect(uncategorized!.rootIds).toContain('r1')
    })

    it('clusterSummary 计算属性', () => {
      const roots = [
        createRoot({ id: 'r1', tags: ['家庭'], era: '童年' }),
        createRoot({ id: 'r2', tags: ['家庭'], era: '童年' }),
      ]
      viz.clusterRoots(roots)
      const summary = viz.clusterSummary.value
      expect(summary).toBeTruthy()
      expect(summary!.totalClusters).toBeGreaterThan(0)
    })
  })

  describe('generateGrowthAnimation - 生长动画', () => {
    it('生成生长动画', () => {
      const root = createRoot({ id: 'r1', text: '新根' })
      const anim = viz.generateGrowthAnimation(root, 'grow')
      expect(anim.type).toBe('grow')
      expect(anim.targetRootId).toBe('r1')
      expect(anim.duration).toBeGreaterThan(0)
    })

    it('支持多种动画类型', () => {
      const root = createRoot()
      const types: GrowthAnimation['type'][] = ['grow', 'bloom', 'connect', 'strengthen', 'decay']

      for (const type of types) {
        const anim = viz.generateGrowthAnimation(root, type)
        expect(anim.type).toBe(type)
        expect(anim.id).toContain(type)
      }
    })
  })
})

// ============================================================
// 3. useRootBridge — 视图桥接
// ============================================================

describe('P20-5 视图桥接', () => {
  let bridge: ReturnType<typeof useRootBridge>

  // 注意：由于 useRootBridge 依赖 useRoots（storage），
  // 这些测试主要验证桥接层的 API 结构

  beforeEach(() => {
    bridge = useRootBridge()
  })

  describe('API 结构', () => {
    it('返回所有必需的 API', () => {
      expect(bridge).toBeDefined()
      expect(typeof bridge.initialize).toBe('function')
      expect(typeof bridge.refreshAll).toBe('function')
      expect(typeof bridge.addRoot).toBe('function')
      expect(typeof bridge.removeRoot).toBe('function')
      expect(typeof bridge.updateRoot).toBe('function')
    })

    it('暴露子模块', () => {
      expect(bridge.roots).toBeTruthy()
      expect(bridge.decayEngine).toBeTruthy()
      expect(bridge.visualization).toBeTruthy()
    })

    it('暴露状态属性', () => {
      expect(bridge.isLoading).toBeTruthy()
      expect(bridge.quickStats).toBeTruthy()
      expect(bridge.bridgeState).toBeTruthy()
    })
  })

  describe('quickStats', () => {
    it('空数据时 quickStats 返回合理默认值', () => {
      const stats = bridge.quickStats.value
      expect(stats.totalRoots).toBe(0)
      expect(stats.soilCount).toBe(0)
      expect(stats.eraCount).toBe(0)
      expect(stats.branchCount).toBe(0)
      expect(stats.avgStrength).toBe(0)
      expect(stats.totalConnections).toBe(0)
      expect(stats.gardenHealthScore).toBeGreaterThanOrEqual(0)
    })
  })

  describe('bridgeState', () => {
    it('空数据时 bridgeState 返回完整结构', () => {
      const state = bridge.bridgeState.value
      expect(state.roots).toBeDefined()
      expect(state.traceTree).toBeDefined()
      expect(state.connectionSuggestions).toBeDefined()
      expect(state.treeStats).toBeDefined()
      expect(state.originNarrative).toBeNull()
      expect(state.eraNarrative).toBeNull()
      expect(state.branchNarrative).toBeNull()
      expect(state.gardenHealth).toBeNull()
      expect(state.decayReport).toBeNull()
      expect(state.visualTree).toBeNull()
      expect(state.vitalityMap).toBeNull()
      expect(state.clusters).toEqual([])
    })
  })
})