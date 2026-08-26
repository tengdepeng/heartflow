// ============================================================
// 根脉之庭 · 根脉可视化 + 家族树
// 蓝图：根脉可视化布局算法、家族树生成、连接线渲染
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { Root, RootLayer } from './types'

// ---- 可视化节点 ----

export interface VisualNode {
  id: string
  rootId: string
  label: string
  layer: RootLayer
  x: number
  y: number
  width: number
  height: number
  color: string
  strength: number
  children: VisualNode[]
  parentId: string | null
  depth: number
  generation: number
  isCollapsed: boolean
}

export interface VisualEdge {
  id: string
  sourceId: string
  targetId: string
  type: 'parent-child' | 'connection' | 'layer-bridge'
  strength: number
  color: string
  dashed: boolean
}

export type LayoutType = 'vertical' | 'horizontal' | 'radial' | 'compact'

export interface VisualTree {
  id: string
  title: string
  layoutType: LayoutType
  nodes: VisualNode[]
  edges: VisualEdge[]
  maxDepth: number
  maxGeneration: number
  totalNodes: number
  createdAt: string
  updatedAt: string
}

export interface GenerationStats {
  generation: number
  nodeCount: number
  avgStrength: number
  layers: Record<RootLayer, number>
  dominantLayer: RootLayer
}

// ---- 布局常量 ----

const NODE_WIDTH = 180
const NODE_HEIGHT = 60
const HORIZONTAL_GAP = 40
const VERTICAL_GAP = 80
const RADIAL_RADIUS_INCREMENT = 120

const LAYER_COLORS: Record<RootLayer, string> = {
  soil: '#8B6914',
  era: '#4A7C59',
  branch: '#6B8E9B',
}

// ---- 存储键 ----

const VISUAL_TREE_STORAGE_KEY = 'hf:roots:visual-trees'

// ============================================================
// useVisualTree
// ============================================================

export function useVisualTree() {
  const visualTrees = ref<VisualTree[]>([])
  const currentLayoutType = ref<LayoutType>('vertical')

  // ---- 持久化 ----

  function loadVisualTrees(): VisualTree[] {
    const stored = storage.getKV<VisualTree[]>(VISUAL_TREE_STORAGE_KEY, [])
    if (stored) visualTrees.value = stored
    return visualTrees.value
  }

  function saveVisualTrees(): void {
    storage.setKV(VISUAL_TREE_STORAGE_KEY, visualTrees.value)
  }

  // ---- 构建可视化树 ----

  function buildVisualTree(
    roots: Root[],
    title: string,
    layoutType: LayoutType = 'vertical',
  ): VisualTree {
    if (roots.length === 0) {
      return {
        id: `vt-${Date.now()}`,
        title,
        layoutType,
        nodes: [],
        edges: [],
        maxDepth: 0,
        maxGeneration: 0,
        totalNodes: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    }

    const nodes: VisualNode[] = []
    const edges: VisualEdge[] = []

    // 构建节点映射
    const rootMap = new Map<string, Root>()
    roots.forEach((r) => rootMap.set(r.id, r))

    // 找出所有根节点（没有 connection 或被引用的节点）
    const childIds = new Set<string>()
    roots.forEach((r) => {
      r.connections.forEach((c) => childIds.add(c))
    })
    const rootNodes = roots.filter((r) => !childIds.has(r.id))

    // 如果没有明确的根节点，以第一层为根
    const actualRoots = rootNodes.length > 0 ? rootNodes : roots.filter((r) => r.layer === 'soil')

    // 递归构建节点树
    function buildNodeTree(
      root: Root,
      depth: number,
      generation: number,
      parentId: string | null,
    ): VisualNode {
      const node: VisualNode = {
        id: `vn-${root.id}`,
        rootId: root.id,
        label: root.text,
        layer: root.layer,
        x: 0,
        y: 0,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        color: root.color || LAYER_COLORS[root.layer],
        strength: root.strength,
        children: [],
        parentId,
        depth,
        generation,
        isCollapsed: false,
      }

      // 构建子节点
      const childRoots = roots.filter((r) => root.connections.includes(r.id))
      childRoots.forEach((child) => {
        const childNode = buildNodeTree(child, depth + 1, generation + 1, node.id)
        node.children.push(childNode)
      })

      return node
    }

    // 构建所有根节点树
    const rootVisualNodes = actualRoots.map((r) => buildNodeTree(r, 0, 0, null))

    // 收集所有节点（扁平化）
    function collectAllNodes(vn: VisualNode): VisualNode[] {
      const result: VisualNode[] = [vn]
      vn.children.forEach((c) => result.push(...collectAllNodes(c)))
      return result
    }

    rootVisualNodes.forEach((rvn) => nodes.push(...collectAllNodes(rvn)))

    // 构建边
    nodes.forEach((node) => {
      const root = rootMap.get(node.rootId)
      if (!root) return

      // 父子边
      if (node.parentId) {
        edges.push({
          id: `edge-pc-${node.rootId}`,
          sourceId: node.parentId,
          targetId: node.id,
          type: 'parent-child',
          strength: node.strength,
          color: node.color,
          dashed: false,
        })
      }

      // 连接边（跨分支连接）
      root.connections.forEach((connId) => {
        const targetNode = nodes.find((n) => n.rootId === connId)
        if (targetNode && targetNode.id !== node.parentId && !node.children.find((c) => c.rootId === connId)) {
          const connRoot = rootMap.get(connId)
          if (connRoot) {
            edges.push({
              id: `edge-conn-${node.rootId}-${connId}`,
              sourceId: node.id,
              targetId: targetNode.id,
              type: root.layer === connRoot.layer ? 'connection' : 'layer-bridge',
              strength: connRoot.strength,
              color: connRoot.color || LAYER_COLORS[connRoot.layer],
              dashed: true,
            })
          }
        }
      })
    })

    // 计算布局
    applyLayout(nodes, rootVisualNodes, layoutType)

    // 计算统计
    const maxDepth = Math.max(...nodes.map((n) => n.depth), 0)
    const maxGeneration = Math.max(...nodes.map((n) => n.generation), 0)

    const tree: VisualTree = {
      id: `vt-${Date.now()}`,
      title,
      layoutType,
      nodes,
      edges,
      maxDepth,
      maxGeneration,
      totalNodes: nodes.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    visualTrees.value.push(tree)
    saveVisualTrees()

    return tree
  }

  // ---- 布局算法 ----

  function applyLayout(
    nodes: VisualNode[],
    rootNodes: VisualNode[],
    layoutType: LayoutType,
  ): void {
    switch (layoutType) {
      case 'vertical':
        applyVerticalLayout(nodes, rootNodes)
        break
      case 'horizontal':
        applyHorizontalLayout(nodes, rootNodes)
        break
      case 'radial':
        applyRadialLayout(nodes, rootNodes)
        break
      case 'compact':
        applyCompactLayout(nodes, rootNodes)
        break
    }
  }

  /** 垂直布局：从上到下，根节点居中 */
  function applyVerticalLayout(_nodes: VisualNode[], rootNodes: VisualNode[]): void {
    // 按深度分组
    const depthGroups = new Map<number, VisualNode[]>()
    function groupByDepth(vn: VisualNode): void {
      const group = depthGroups.get(vn.depth) || []
      group.push(vn)
      depthGroups.set(vn.depth, group)
      vn.children.forEach(groupByDepth)
    }
    rootNodes.forEach(groupByDepth)

    // 计算总宽度
    const maxNodesInDepth = Math.max(...Array.from(depthGroups.values()).map((g) => g.length), 1)
    const totalWidth = maxNodesInDepth * (NODE_WIDTH + HORIZONTAL_GAP)

    depthGroups.forEach((group, depth) => {
      const groupWidth = group.length * (NODE_WIDTH + HORIZONTAL_GAP) - HORIZONTAL_GAP
      const startX = (totalWidth - groupWidth) / 2

      group.forEach((node, index) => {
        node.x = startX + index * (NODE_WIDTH + HORIZONTAL_GAP)
        node.y = depth * (NODE_HEIGHT + VERTICAL_GAP)
      })
    })
  }

  /** 水平布局：从左到右 */
  function applyHorizontalLayout(_nodes: VisualNode[], rootNodes: VisualNode[]): void {
    // 按深度分组（横向）
    const depthGroups = new Map<number, VisualNode[]>()
    function groupByDepth(vn: VisualNode): void {
      const group = depthGroups.get(vn.depth) || []
      group.push(vn)
      depthGroups.set(vn.depth, group)
      vn.children.forEach(groupByDepth)
    }
    rootNodes.forEach(groupByDepth)

    const maxNodesInDepth = Math.max(...Array.from(depthGroups.values()).map((g) => g.length), 1)
    const totalHeight = maxNodesInDepth * (NODE_HEIGHT + VERTICAL_GAP)

    depthGroups.forEach((group, depth) => {
      const groupHeight = group.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP
      const startY = (totalHeight - groupHeight) / 2

      group.forEach((node, index) => {
        node.x = depth * (NODE_WIDTH + HORIZONTAL_GAP)
        node.y = startY + index * (NODE_HEIGHT + VERTICAL_GAP)
      })
    })
  }

  /** 径向布局：以根节点为中心，同心圆展开 */
  function applyRadialLayout(_nodes: VisualNode[], rootNodes: VisualNode[]): void {
    const centerX = 600
    const centerY = 400

    // 根节点居中
    rootNodes.forEach((root, idx) => {
      if (rootNodes.length === 1) {
        root.x = centerX - NODE_WIDTH / 2
        root.y = centerY - NODE_HEIGHT / 2
      } else {
        const angle = (2 * Math.PI * idx) / rootNodes.length
        root.x = centerX + RADIAL_RADIUS_INCREMENT * Math.cos(angle) - NODE_WIDTH / 2
        root.y = centerY + RADIAL_RADIUS_INCREMENT * Math.sin(angle) - NODE_HEIGHT / 2
      }
    })

    // 按深度分组
    const depthGroups = new Map<number, VisualNode[]>()
    function groupByDepth(vn: VisualNode): void {
      const group = depthGroups.get(vn.depth) || []
      group.push(vn)
      depthGroups.set(vn.depth, group)
      vn.children.forEach(groupByDepth)
    }
    rootNodes.forEach(groupByDepth)

    depthGroups.forEach((group, depth) => {
      if (depth === 0) return // 根节点已处理

      const radius = (depth + 1) * RADIAL_RADIUS_INCREMENT
      group.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / group.length - Math.PI / 2
        node.x = centerX + radius * Math.cos(angle) - NODE_WIDTH / 2
        node.y = centerY + radius * Math.sin(angle) - NODE_HEIGHT / 2
      })
    })
  }

  /** 紧凑布局：基于父子关系紧凑排列 */
  function applyCompactLayout(_nodes: VisualNode[], rootNodes: VisualNode[]): void {
    let currentX = 0
    let currentY = 0

    function layoutSubtree(vn: VisualNode, startX: number, startY: number): number {
      vn.x = startX
      vn.y = startY

      if (vn.children.length === 0) {
        return NODE_WIDTH + HORIZONTAL_GAP
      }

      let childX = startX
      const childY = startY + NODE_HEIGHT + VERTICAL_GAP

      let totalWidth = 0
      vn.children.forEach((child) => {
        totalWidth += layoutSubtree(child, childX, childY)
        childX += totalWidth
      })

      // 居中父节点
      const childrenWidth = vn.children.reduce((sum) => sum + NODE_WIDTH + HORIZONTAL_GAP, 0) - HORIZONTAL_GAP
      const parentCenter = startX + NODE_WIDTH / 2
      const childrenCenter = vn.children[0].x + childrenWidth / 2
      const offset = parentCenter - childrenCenter

      vn.children.forEach((child) => {
        child.x += offset
      })

      return Math.max(NODE_WIDTH + HORIZONTAL_GAP, childrenWidth + HORIZONTAL_GAP)
    }

    rootNodes.forEach((root, _i) => {
      layoutSubtree(root, currentX, currentY)
      currentX += NODE_WIDTH + HORIZONTAL_GAP * 3
    })
  }

  // ---- 查询 ----

  function getVisualTree(treeId: string): VisualTree | undefined {
    return visualTrees.value.find((t) => t.id === treeId)
  }

  function getLatestVisualTree(): VisualTree | undefined {
    return visualTrees.value[visualTrees.value.length - 1]
  }

  function removeVisualTree(treeId: string): void {
    visualTrees.value = visualTrees.value.filter((t) => t.id !== treeId)
    saveVisualTrees()
  }

  // ---- 世代统计 ----

  function computeGenerationStats(tree: VisualTree): GenerationStats[] {
    const genMap = new Map<number, VisualNode[]>()

    tree.nodes.forEach((node) => {
      const gen = genMap.get(node.generation) || []
      gen.push(node)
      genMap.set(node.generation, gen)
    })

    const stats: GenerationStats[] = []
    const maxGen = Math.max(...genMap.keys(), 0)

    for (let g = 0; g <= maxGen; g++) {
      const nodes = genMap.get(g) || []
      const layerCounts: Record<RootLayer, number> = { soil: 0, era: 0, branch: 0 }

      nodes.forEach((n) => {
        layerCounts[n.layer]++
      })

      const totalStrength = nodes.reduce((sum, n) => sum + n.strength, 0)
      const avgStrength = nodes.length > 0 ? totalStrength / nodes.length : 0

      // 找出主导层级
      let maxCount = 0
      let dominantLayer: RootLayer = 'soil'
      ;(Object.keys(layerCounts) as RootLayer[]).forEach((layer) => {
        if (layerCounts[layer] > maxCount) {
          maxCount = layerCounts[layer]
          dominantLayer = layer
        }
      })

      stats.push({
        generation: g,
        nodeCount: nodes.length,
        avgStrength: Math.round(avgStrength * 100) / 100,
        layers: layerCounts,
        dominantLayer,
      })
    }

    return stats
  }

  // ---- 连接线路径生成 ----

  function generateEdgePath(
    _edge: VisualEdge,
    sourceNode: VisualNode,
    targetNode: VisualNode,
    layoutType: LayoutType,
  ): string {
    const sx = sourceNode.x + NODE_WIDTH / 2
    const sy = sourceNode.y + NODE_HEIGHT
    const tx = targetNode.x + NODE_WIDTH / 2
    const ty = targetNode.y

    if (layoutType === 'radial') {
      const scx = sourceNode.x + NODE_WIDTH / 2
      const scy = sourceNode.y + NODE_HEIGHT / 2
      const tcx = targetNode.x + NODE_WIDTH / 2
      const tcy = targetNode.y + NODE_HEIGHT / 2
      return `M${scx},${scy} Q${(scx + tcx) / 2},${(scy + tcy) / 2 - 30} ${tcx},${tcy}`
    }

    // 垂直/水平/紧凑：贝塞尔曲线
    const midY = (sy + ty) / 2
    return `M${sx},${sy} C${sx},${midY} ${tx},${midY} ${tx},${ty}`
  }

  // ---- 初始化 ----

  loadVisualTrees()

  return {
    visualTrees,
    currentLayoutType,
    buildVisualTree,
    getVisualTree,
    getLatestVisualTree,
    removeVisualTree,
    computeGenerationStats,
    generateEdgePath,
    applyLayout,
    loadVisualTrees,
  }
}