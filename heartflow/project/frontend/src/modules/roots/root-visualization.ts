// ============================================================
// 根脉之庭 · 增强可视化引擎（P20-5）
// 根系可视化树 + 生命力地图 + 根系聚类 + 生长动画
// ============================================================

import { ref, computed } from 'vue'
import type { Root, RootLayer } from './types'
import { LAYER_CONFIG } from './types'
import type { TraceTree } from './root-tree'
import { CATEGORY_PALETTE } from '../../theme/categoryColors'

// ============================================================
// 类型定义
// ============================================================

/** 可视化树节点 */
export interface RootVisualNode {
  /** 节点 ID */
  id: string
  /** 关联根系 ID */
  rootId: string
  /** 显示标签 */
  label: string
  /** 层级 */
  layer: RootLayer
  /** 位置 X */
  x: number
  /** 位置 Y */
  y: number
  /** 半径 */
  radius: number
  /** 颜色 */
  color: string
  /** 强度 0-1 */
  strength: number
  /** 子节点 */
  children: RootVisualNode[]
  /** 父节点 ID */
  parentId: string | null
  /** 深度 */
  depth: number
  /** 是否展开 */
  isExpanded: boolean
  /** 是否有子节点 */
  hasChildren: boolean
  /** 标签 */
  tags: string[]
  /** 连接数 */
  connectionCount: number
}

/** 可视化边 */
export interface RootVisualEdge {
  /** 边 ID */
  id: string
  /** 源节点 */
  sourceId: string
  /** 目标节点 */
  targetId: string
  /** 边类型 */
  type: 'parent-child' | 'connection' | 'layer-bridge'
  /** 强度 */
  strength: number
  /** 颜色 */
  color: string
  /** 是否虚线 */
  dashed: boolean
  /** 线的宽度 */
  width: number
}

/** 布局类型 */
export type LayoutType = 'vertical' | 'horizontal' | 'radial' | 'compact' | 'tree'

/** 可视化树 */
export interface RootVisualTree {
  /** 树 ID */
  id: string
  /** 标题 */
  title: string
  /** 布局类型 */
  layoutType: LayoutType
  /** 节点列表 */
  nodes: RootVisualNode[]
  /** 边列表 */
  edges: RootVisualEdge[]
  /** 最大深度 */
  maxDepth: number
  /** 总节点数 */
  totalNodes: number
  /** 总边数 */
  totalEdges: number
  /** 宽度 */
  width: number
  /** 高度 */
  height: number
  /** 生成时间 */
  generatedAt: string
}

/** 生命力地图节点 */
export interface VitalityNode {
  /** 根系 ID */
  rootId: string
  /** 根系名称 */
  rootText: string
  /** 层级 */
  layer: RootLayer
  /** 生命力 0-100 */
  vitality: number
  /** 颜色 */
  color: string
  /** 大小 */
  size: number
  /** 位置 X */
  x: number
  /** 位置 Y */
  y: number
}

/** 生命力地图 */
export interface RootVitalityMap {
  /** 节点列表 */
  nodes: VitalityNode[]
  /** 平均生命力 */
  avgVitality: number
  /** 最高生命力 */
  maxVitality: number
  /** 最低生命力 */
  minVitality: number
  /** 各层生命力 */
  layerVitality: Record<RootLayer, number>
  /** 总体评级 */
  rating: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  /** 生成时间 */
  generatedAt: string
}

/** 生长动画 */
export interface GrowthAnimation {
  /** 动画 ID */
  id: string
  /** 动画名称 */
  name: string
  /** 目标根系 */
  targetRootId: string
  /** 动画类型 */
  type: 'grow' | 'bloom' | 'connect' | 'strengthen' | 'decay'
  /** 持续时间（毫秒） */
  duration: number
  /** 延迟（毫秒） */
  delay: number
  /** 缓动函数 */
  easing: string
  /** 起始值 */
  from: Record<string, number>
  /** 结束值 */
  to: Record<string, number>
}

/** 根系聚类 */
export interface RootCluster {
  /** 聚类 ID */
  id: string
  /** 聚类名称 */
  name: string
  /** 聚类标签 */
  label: string
  /** 包含的根系 ID */
  rootIds: string[]
  /** 聚类中心主题 */
  themes: string[]
  /** 颜色 */
  color: string
  /** 平均强度 */
  avgStrength: number
  /** 节点数 */
  size: number
}

// ============================================================
// 布局常量
// ============================================================

const LAYER_RADIUS: Record<RootLayer, number> = {
  soil: 30,
  era: 24,
  branch: 18,
}

// ============================================================
// useRootVisualization Composable
// ============================================================

export function useRootVisualization() {
  // ---- 状态 ----
  const visualTree = ref<RootVisualTree | null>(null)
  const vitalityMap = ref<RootVitalityMap | null>(null)
  const clusters = ref<RootCluster[]>([])
  const selectedNodeId = ref<string | null>(null)
  const layoutType = ref<LayoutType>('vertical')

  // ---- 可视化树 ----

  /**
   * 生成可视化树
   */
  function generateVisualTree(
    roots: Root[],
    _traceTree: TraceTree,
    title: string = '根脉之庭',
    layout: LayoutType = 'vertical',
  ): RootVisualTree {
    const nodes: RootVisualNode[] = []
    const edges: RootVisualEdge[] = []
    const nodeMap = new Map<string, RootVisualNode>()

    // 计算布局位置
    const layerRoots: Record<RootLayer, Root[]> = {
      soil: roots.filter(r => r.layer === 'soil'),
      era: roots.filter(r => r.layer === 'era'),
      branch: roots.filter(r => r.layer === 'branch'),
    }

    let maxDepth = 0
    const layoutConfig = getLayoutConfig(layout, roots.length)

    // 按层生成节点
    const layerOrder: RootLayer[] = ['soil', 'era', 'branch']
    for (const layer of layerOrder) {
      const layerRootsList = layerRoots[layer]
      const layerConfig = LAYER_CONFIG[layer]
      const baseY = layerOrder.indexOf(layer) * layoutConfig.layerSpacing + layoutConfig.paddingTop

      layerRootsList.forEach((root, index) => {
        const x = layoutConfig.getX(index, layerRootsList.length, layerOrder.indexOf(layer))
        const y = baseY
        const radius = LAYER_RADIUS[layer] * (0.7 + root.strength * 0.6)

        const node: RootVisualNode = {
          id: `vnode-${root.id}`,
          rootId: root.id,
          label: root.text,
          layer,
          x,
          y,
          radius,
          color: root.color || layerConfig.color,
          strength: root.strength,
          children: [],
          parentId: null,
          depth: layerOrder.indexOf(layer),
          isExpanded: root._expanded,
          hasChildren: root.connections.length > 0,
          tags: root.tags,
          connectionCount: root.connections.length,
        }

        nodes.push(node)
        nodeMap.set(root.id, node)
        maxDepth = Math.max(maxDepth, node.depth)
      })
    }

    // 生成边
    let edgeCount = 0
    for (const root of roots) {
      const sourceNode = nodeMap.get(root.id)
      if (!sourceNode) continue

      for (const connId of root.connections) {
        const targetNode = nodeMap.get(connId)
        if (!targetNode) continue

        // 避免重复边
        const edgeId = [root.id, connId].sort().join('-')
        const existing = edges.find(e => e.id === edgeId)
        if (existing) continue

        const isCrossLayer = sourceNode.layer !== targetNode.layer
        const edgeType = isCrossLayer ? 'layer-bridge' : 'connection'
        const edgeStrength = root.strength * 0.8

        edges.push({
          id: edgeId,
          sourceId: `vnode-${root.id}`,
          targetId: `vnode-${connId}`,
          type: edgeType,
          strength: edgeStrength,
          color: isCrossLayer ? '#94a3b8' : '#6b9fc4',
          dashed: isCrossLayer,
          width: Math.max(1, edgeStrength * 3),
        })
        edgeCount++
      }
    }

    // 建立父子关系
    for (const root of roots) {
      const node = nodeMap.get(root.id)
      if (!node) continue

      for (const connId of root.connections) {
        const childNode = nodeMap.get(connId)
        if (!childNode) continue

        // 如果连接节点层级更高，则作为子节点
        const layerIndex = layerOrder.indexOf(childNode.layer)
        const nodeLayerIndex = layerOrder.indexOf(node.layer)
        if (layerIndex > nodeLayerIndex && !childNode.parentId) {
          childNode.parentId = node.id
          node.children.push(childNode)
        }
      }
    }

    const result: RootVisualTree = {
      id: `vt-${Date.now()}`,
      title,
      layoutType: layout,
      nodes,
      edges,
      maxDepth,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      width: layoutConfig.width,
      height: layoutConfig.height,
      generatedAt: new Date().toISOString(),
    }

    visualTree.value = result
    layoutType.value = layout
    return result
  }

  /**
   * 切换布局类型
   */
  function switchLayout(
    newLayout: LayoutType,
    roots: Root[],
    traceTree: TraceTree,
  ): RootVisualTree {
    return generateVisualTree(roots, traceTree, visualTree.value?.title || '根脉之庭', newLayout)
  }

  /**
   * 选中节点
   */
  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId
  }

  /**
   * 获取节点及其关联节点
   */
  function getRelatedNodes(nodeId: string): RootVisualNode[] {
    if (!visualTree.value) return []

    const node = visualTree.value.nodes.find(n => n.id === nodeId)
    if (!node) return []

    const relatedIds = new Set<string>()
    relatedIds.add(nodeId)

    // 找关联边
    for (const edge of visualTree.value.edges) {
      if (edge.sourceId === nodeId) relatedIds.add(edge.targetId)
      if (edge.targetId === nodeId) relatedIds.add(edge.sourceId)
    }

    return visualTree.value.nodes.filter(n => relatedIds.has(n.id))
  }

  // ---- 生命力地图 ----

  /**
   * 生成生命力地图
   */
  function generateVitalityMap(roots: Root[]): RootVitalityMap {
    const now = new Date()
    const nodes: VitalityNode[] = []

    let totalVitality = 0
    let maxVitality = 0
    let minVitality = 100

    const layerTotal: Record<RootLayer, { total: number; count: number }> = {
      soil: { total: 0, count: 0 },
      era: { total: 0, count: 0 },
      branch: { total: 0, count: 0 },
    }

    roots.forEach((root, index) => {
      const vitality = computeVitality(root, now)
      const layerConfig = LAYER_CONFIG[root.layer]
      const angle = (index / roots.length) * Math.PI * 2
      const radius = 100 + vitality * 1.5

      nodes.push({
        rootId: root.id,
        rootText: root.text,
        layer: root.layer,
        vitality,
        color: layerConfig.color,
        size: 8 + vitality * 0.2,
        x: Math.cos(angle) * radius + 200,
        y: Math.sin(angle) * radius + 200,
      })

      totalVitality += vitality
      maxVitality = Math.max(maxVitality, vitality)
      minVitality = Math.min(minVitality, vitality)

      layerTotal[root.layer].total += vitality
      layerTotal[root.layer].count++
    })

    const avgVitality = roots.length > 0
      ? Math.round(totalVitality / roots.length)
      : 0

    const layerVitality: Record<RootLayer, number> = {
      soil: layerTotal.soil.count > 0
        ? Math.round(layerTotal.soil.total / layerTotal.soil.count)
        : 0,
      era: layerTotal.era.count > 0
        ? Math.round(layerTotal.era.total / layerTotal.era.count)
        : 0,
      branch: layerTotal.branch.count > 0
        ? Math.round(layerTotal.branch.total / layerTotal.branch.count)
        : 0,
    }

    const rating = avgVitality >= 80 ? 'excellent'
      : avgVitality >= 60 ? 'good'
      : avgVitality >= 40 ? 'fair'
      : avgVitality >= 20 ? 'poor'
      : 'critical'

    const result: RootVitalityMap = {
      nodes,
      avgVitality,
      maxVitality,
      minVitality,
      layerVitality,
      rating,
      generatedAt: now.toISOString(),
    }

    vitalityMap.value = result
    return result
  }

  /**
   * 生命力地图摘要
   */
  const vitalitySummary = computed(() => {
    if (!vitalityMap.value) return null

    const { avgVitality, rating, layerVitality } = vitalityMap.value

    const ratingLabels: Record<string, string> = {
      excellent: '非常健康',
      good: '健康',
      fair: '一般',
      poor: '较差',
      critical: '危急',
    }

    const weakestLayer = Object.entries(layerVitality).sort(
      (a, b) => a[1] - b[1]
    )[0]

    return {
      avgVitality,
      rating,
      ratingLabel: ratingLabels[rating] || '未知',
      weakestLayer: weakestLayer
        ? `${LAYER_CONFIG[weakestLayer[0] as RootLayer]?.label || weakestLayer[0]}（${weakestLayer[1]}分）`
        : '—',
    }
  })

  // ---- 根系聚类 ----

  /**
   * 基于标签和时期对根系聚类
   */
  function clusterRoots(roots: Root[]): RootCluster[] {
    if (roots.length === 0) return []

    const tagMap = new Map<string, Root[]>()
    const eraMap = new Map<string, Root[]>()

    // 按标签聚类
    for (const root of roots) {
      for (const tag of root.tags) {
        const group = tagMap.get(tag) || []
        group.push(root)
        tagMap.set(tag, group)
      }
    }

    // 按时期聚类
    for (const root of roots) {
      if (root.era) {
        const group = eraMap.get(root.era) || []
        group.push(root)
        eraMap.set(root.era, group)
      }
    }

    const clusterList: RootCluster[] = []
    const clusterColors = [CATEGORY_PALETTE[14], CATEGORY_PALETTE[3], CATEGORY_PALETTE[8], CATEGORY_PALETTE[11], CATEGORY_PALETTE[6], CATEGORY_PALETTE[5], CATEGORY_PALETTE[4], CATEGORY_PALETTE[10]]

    // 标签聚类
    let colorIndex = 0
    for (const [tag, group] of tagMap) {
      if (group.length >= 2) {
        const themes = extractThemes(group)
        clusterList.push({
          id: `cluster-tag-${tag}`,
          name: tag,
          label: `标签: ${tag}`,
          rootIds: group.map(r => r.id),
          themes,
          color: clusterColors[colorIndex % clusterColors.length],
          avgStrength: Math.round(group.reduce((s, r) => s + r.strength, 0) / group.length * 100) / 100,
          size: group.length,
        })
        colorIndex++
      }
    }

    // 时期聚类
    for (const [era, group] of eraMap) {
      if (group.length >= 2) {
        const themes = extractThemes(group)
        clusterList.push({
          id: `cluster-era-${era}`,
          name: era,
          label: `时期: ${era}`,
          rootIds: group.map(r => r.id),
          themes,
          color: clusterColors[colorIndex % clusterColors.length],
          avgStrength: Math.round(group.reduce((s, r) => s + r.strength, 0) / group.length * 100) / 100,
          size: group.length,
        })
        colorIndex++
      }
    }

    // 未聚类的单独根系
    const clusteredIds = new Set(clusterList.flatMap(c => c.rootIds))
    const unclustered = roots.filter(r => !clusteredIds.has(r.id))
    if (unclustered.length > 0) {
      clusterList.push({
        id: 'cluster-uncategorized',
        name: '未分类',
        label: '未分类根系',
        rootIds: unclustered.map(r => r.id),
        themes: ['待归类'],
        color: '#94a3b8',
        avgStrength: Math.round(unclustered.reduce((s, r) => s + r.strength, 0) / unclustered.length * 100) / 100,
        size: unclustered.length,
      })
    }

    clusters.value = clusterList
    return clusterList
  }

  /**
   * 聚类摘要
   */
  const clusterSummary = computed(() => {
    if (clusters.value.length === 0) return null

    const largestCluster = clusters.value.reduce((largest, c) =>
      c.size > largest.size ? c : largest, clusters.value[0])

    return {
      totalClusters: clusters.value.length,
      largestCluster: largestCluster.name,
      largestClusterSize: largestCluster.size,
      avgClusterSize: Math.round(
        clusters.value.reduce((s, c) => s + c.size, 0) / clusters.value.length
      ),
    }
  })

  // ---- 生长动画 ----

  /**
   * 生成生长动画
   */
  function generateGrowthAnimation(
    root: Root,
    type: GrowthAnimation['type'] = 'grow',
  ): GrowthAnimation {
    const animations: Record<GrowthAnimation['type'], GrowthAnimation> = {
      grow: {
        id: `anim-${root.id}-grow`,
        name: `${root.text} 生长`,
        targetRootId: root.id,
        type: 'grow',
        duration: 800,
        delay: 100,
        easing: 'ease-out',
        from: { scale: 0, opacity: 0 },
        to: { scale: 1, opacity: 1 },
      },
      bloom: {
        id: `anim-${root.id}-bloom`,
        name: `${root.text} 绽放`,
        targetRootId: root.id,
        type: 'bloom',
        duration: 1200,
        delay: 200,
        easing: 'ease-in-out',
        from: { scale: 0.5, opacity: 0.3, rotation: -10 },
        to: { scale: 1.1, opacity: 1, rotation: 0 },
      },
      connect: {
        id: `anim-${root.id}-connect`,
        name: `${root.text} 连接`,
        targetRootId: root.id,
        type: 'connect',
        duration: 600,
        delay: 0,
        easing: 'linear',
        from: { lineProgress: 0 },
        to: { lineProgress: 1 },
      },
      strengthen: {
        id: `anim-${root.id}-strengthen`,
        name: `${root.text} 强化`,
        targetRootId: root.id,
        type: 'strengthen',
        duration: 500,
        delay: 0,
        easing: 'ease-out',
        from: { strength: root.strength - 0.1 },
        to: { strength: root.strength },
      },
      decay: {
        id: `anim-${root.id}-decay`,
        name: `${root.text} 衰减`,
        targetRootId: root.id,
        type: 'decay',
        duration: 1000,
        delay: 0,
        easing: 'ease-in',
        from: { opacity: 1, scale: 1 },
        to: { opacity: 0.5, scale: 0.8 },
      },
    }

    return animations[type]
  }

  return {
    // 状态
    visualTree,
    vitalityMap,
    clusters,
    selectedNodeId,
    layoutType,

    // 计算属性
    vitalitySummary,
    clusterSummary,

    // 可视化树
    generateVisualTree,
    switchLayout,
    selectNode,
    getRelatedNodes,

    // 生命力地图
    generateVitalityMap,

    // 聚类
    clusterRoots,

    // 动画
    generateGrowthAnimation,
  }
}

// ============================================================
// 内部函数
// ============================================================

/** 计算生命力 */
function computeVitality(root: Root, now: Date): number {
  const updatedAt = new Date(root.lastUpdatedAt)
  const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / 86400000

  const strengthScore = root.strength * 40
  const recencyScore = Math.max(0, 30 - daysSinceUpdate * 0.5)
  const connectionScore = Math.min(root.connections.length * 4, 20)
  const tagScore = Math.min(root.tags.length * 3, 10)

  return Math.round(Math.min(strengthScore + recencyScore + connectionScore + tagScore, 100))
}

/** 提取聚类主题 */
function extractThemes(roots: Root[]): string[] {
  const tagCounts = new Map<string, number>()
  for (const root of roots) {
    for (const tag of root.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
    }
  }

  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag]) => tag)
}

/** 布局配置 */
interface LayoutConfig {
  getX: (index: number, total: number, layerIndex: number) => number
  layerSpacing: number
  paddingTop: number
  width: number
  height: number
}

function getLayoutConfig(layout: LayoutType, totalNodes: number): LayoutConfig {
  const baseWidth = 800
  const baseHeight = 600

  switch (layout) {
    case 'vertical':
      return {
        getX: (index, total, _layerIndex) =>
          100 + (index / Math.max(total - 1, 1)) * (baseWidth - 200),
        layerSpacing: 180,
        paddingTop: 60,
        width: baseWidth,
        height: baseHeight,
      }
    case 'horizontal':
      return {
        getX: (_index, _total, layerIndex) =>
          100 + layerIndex * 250,
        layerSpacing: 0,
        paddingTop: 60,
        width: baseWidth,
        height: baseHeight,
      }
    case 'radial':
      return {
        getX: (index, total, layerIndex) => {
          const angle = (index / total) * Math.PI * 2
          const radius = 100 + layerIndex * 80
          return 400 + Math.cos(angle) * radius
        },
        layerSpacing: 0,
        paddingTop: 0,
        width: 800,
        height: 600,
      }
    case 'compact':
      return {
        getX: (index, total, _layerIndex) =>
          80 + (index / Math.max(total - 1, 1)) * (baseWidth - 160),
        layerSpacing: 120,
        paddingTop: 40,
        width: baseWidth,
        height: baseHeight,
      }
    case 'tree':
      return {
        getX: (index, _total, layerIndex) =>
          200 + layerIndex * 200 + (index % 2) * 60,
        layerSpacing: 150,
        paddingTop: 50,
        width: 1000,
        height: 700,
      }
    default:
      return getLayoutConfig('vertical', totalNodes)
  }
}