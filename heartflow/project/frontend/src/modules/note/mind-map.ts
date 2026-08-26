// ============================================================
// 思绪书房 · 思维导图系统
// 蓝图：将笔记内容转化为思维导图结构，支持节点连接与层级展开
// ============================================================

import { ref } from 'vue'
import type { StickyNote } from './types'
import { storage } from '@/engine/storage'

// ---- 类型定义 ----

/** 思维导图节点 */
export interface MindNode {
  id: string
  label: string
  noteId?: string
  color: string
  children: MindNode[]
  expanded: boolean
  level: number
  /** 关联标签 */
  tags: string[]
  /** 是否为根节点 */
  isRoot: boolean
  /** 节点权重 */
  weight: number
  createdAt: string
  updatedAt: string
}

/** 思维导图 */
export interface MindMap {
  id: string
  title: string
  rootNode: MindNode
  createdAt: string
  updatedAt: string
  /** 关联笔记 ID 列表 */
  noteIds: string[]
}

/** 节点连接 */
export interface NodeConnection {
  id: string
  sourceId: string
  targetId: string
  label: string
  strength: number
  type: 'parent' | 'related' | 'tag' | 'manual'
}

/** 思维导图统计 */
export interface MindMapStats {
  totalMaps: number
  totalNodes: number
  totalConnections: number
  averageDepth: number
  byTag: Record<string, number>
}

// ---- 常量 ----

export const MIND_MAP_STORAGE_KEYS = {
  MAPS: 'hf:mind_maps',
  CONNECTIONS: 'hf:mind_map_connections',
} as const

/** 节点颜色预设 */
export const NODE_COLORS = [
  '#6b9fc4', '#8a9a7a', '#d98c7a', '#f0c040',
  '#e0a96d', '#b5707a', '#6b9fc4', '#cf8b6b',
  '#c46a5a', '#7a9a8a',
]

// ---- 思维导图管理 ----

export function useMindMap() {
  const maps = ref<MindMap[]>([])
  const connections = ref<NodeConnection[]>([])

  function loadMaps(): MindMap[] {
    const stored = storage.getKV<MindMap[]>(MIND_MAP_STORAGE_KEYS.MAPS, [])
    if (stored) maps.value = stored
    return maps.value
  }

  function loadConnections(): NodeConnection[] {
    const stored = storage.getKV<NodeConnection[]>(MIND_MAP_STORAGE_KEYS.CONNECTIONS, [])
    if (stored) connections.value = stored
    return connections.value
  }

  /** 创建思维导图 */
  function createMap(title: string, rootLabel: string): MindMap {
    const rootNode: MindNode = {
      id: `node-${Date.now()}`,
      label: rootLabel,
      color: NODE_COLORS[0],
      children: [],
      expanded: true,
      level: 0,
      tags: [],
      isRoot: true,
      weight: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const map: MindMap = {
      id: `map-${Date.now()}`,
      title,
      rootNode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      noteIds: [],
    }

    maps.value.push(map)
    saveMaps()
    return map
  }

  /** 添加子节点 */
  function addChildNode(
    mapId: string,
    parentId: string,
    label: string,
    tags: string[] = [],
    noteId?: string,
  ): MindNode | null {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return null

    const parent = findNode(map.rootNode, parentId)
    if (!parent) return null

    const colorIndex = parent.children.length % NODE_COLORS.length
    const node: MindNode = {
      id: `node-${Date.now()}`,
      label,
      noteId,
      color: NODE_COLORS[(colorIndex + 1) % NODE_COLORS.length],
      children: [],
      expanded: true,
      level: parent.level + 1,
      tags,
      isRoot: false,
      weight: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    parent.children.push(node)
    map.updatedAt = new Date().toISOString()

    // 创建父子连接
    const conn: NodeConnection = {
      id: `conn-${Date.now()}`,
      sourceId: parentId,
      targetId: node.id,
      label: '子节点',
      strength: 0.8,
      type: 'parent',
    }
    connections.value.push(conn)

    saveMaps()
    saveConnections()
    return node
  }

  /** 切换节点展开/折叠 */
  function toggleNode(mapId: string, nodeId: string): boolean {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return false

    const node = findNode(map.rootNode, nodeId)
    if (!node) return false

    node.expanded = !node.expanded
    map.updatedAt = new Date().toISOString()
    saveMaps()
    return true
  }

  /** 更新节点标签 */
  function updateNodeLabel(mapId: string, nodeId: string, label: string): boolean {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return false

    const node = findNode(map.rootNode, nodeId)
    if (!node) return false

    node.label = label
    node.updatedAt = new Date().toISOString()
    map.updatedAt = new Date().toISOString()
    saveMaps()
    return true
  }

  /** 删除节点及其子节点 */
  function removeNode(mapId: string, nodeId: string): boolean {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return false

    if (map.rootNode.id === nodeId) return false

    const removed = removeNodeFromParent(map.rootNode, nodeId)
    if (removed) {
      // 移除相关连接
      connections.value = connections.value.filter(
        c => c.sourceId !== nodeId && c.targetId !== nodeId,
      )
      map.updatedAt = new Date().toISOString()
      saveMaps()
      saveConnections()
    }
    return removed
  }

  /** 关联笔记到节点 */
  function linkNote(mapId: string, nodeId: string, noteId: string): boolean {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return false

    const node = findNode(map.rootNode, nodeId)
    if (!node) return false

    node.noteId = noteId
    if (!map.noteIds.includes(noteId)) {
      map.noteIds.push(noteId)
    }
    node.updatedAt = new Date().toISOString()
    map.updatedAt = new Date().toISOString()
    saveMaps()
    return true
  }

  /** 创建节点间手动连接 */
  function createConnection(
    sourceId: string,
    targetId: string,
    label: string,
    strength = 0.5,
  ): NodeConnection {
    const conn: NodeConnection = {
      id: `conn-${Date.now()}`,
      sourceId,
      targetId,
      label,
      strength,
      type: 'manual',
    }
    connections.value.push(conn)
    saveConnections()
    return conn
  }

  /** 从笔记自动生成思维导图 */
  function generateFromNotes(title: string, notes: StickyNote[]): MindMap {
    const map = createMap(title, title)

    // 按标签构建一级节点
    const tagGroups = new Map<string, StickyNote[]>()
    notes.forEach(note => {
      note.tags.forEach(tag => {
        if (!tagGroups.has(tag)) tagGroups.set(tag, [])
        tagGroups.get(tag)!.push(note)
      })
    })

    // 无标签笔记放在"未分类"下
    const uncategorized = notes.filter(n => n.tags.length === 0)
    if (uncategorized.length > 0) {
      tagGroups.set('未分类', uncategorized)
    }

    let colorIdx = 0
    tagGroups.forEach((groupNotes, tag) => {
      const tagNode = addChildNode(map.id, map.rootNode.id, tag, [tag])
      if (tagNode) {
        groupNotes.forEach(note => {
          addChildNode(map.id, tagNode.id, note.title, note.tags, note.id)
        })
      }
      colorIdx++
    })

    return map
  }

  /** 计算思维导图深度 */
  function computeDepth(node: MindNode): number {
    if (node.children.length === 0) return node.level
    return Math.max(...node.children.map(c => computeDepth(c)))
  }

  /** 统计节点数 */
  function countNodes(node: MindNode): number {
    return 1 + node.children.reduce((s, c) => s + countNodes(c), 0)
  }

  /** 计算统计 */
  function computeStats(): MindMapStats {
    const byTag: Record<string, number> = {}
    let totalNodes = 0

    maps.value.forEach(map => {
      totalNodes += countNodes(map.rootNode)
      collectTags(map.rootNode, byTag)
    })

    const depths = maps.value.map(m => computeDepth(m.rootNode))
    const averageDepth = depths.length > 0
      ? depths.reduce((a, b) => a + b, 0) / depths.length
      : 0

    return {
      totalMaps: maps.value.length,
      totalNodes,
      totalConnections: connections.value.length,
      averageDepth: Math.round(averageDepth * 10) / 10,
      byTag,
    }
  }

  /** 扁平化所有节点 */
  function flattenNodes(mapId: string): MindNode[] {
    const map = maps.value.find(m => m.id === mapId)
    if (!map) return []
    return flattenNode(map.rootNode)
  }

  function saveMaps(): void {
    storage.setKV(MIND_MAP_STORAGE_KEYS.MAPS, maps.value)
  }

  function saveConnections(): void {
    storage.setKV(MIND_MAP_STORAGE_KEYS.CONNECTIONS, connections.value)
  }

  return {
    maps,
    connections,
    loadMaps,
    loadConnections,
    createMap,
    addChildNode,
    toggleNode,
    updateNodeLabel,
    removeNode,
    linkNote,
    createConnection,
    generateFromNotes,
    computeDepth,
    countNodes,
    computeStats,
    flattenNodes,
  }
}

// ---- 辅助函数 ----

function findNode(root: MindNode, nodeId: string): MindNode | null {
  if (root.id === nodeId) return root
  for (const child of root.children) {
    const found = findNode(child, nodeId)
    if (found) return found
  }
  return null
}

function removeNodeFromParent(parent: MindNode, nodeId: string): boolean {
  const idx = parent.children.findIndex(c => c.id === nodeId)
  if (idx !== -1) {
    parent.children.splice(idx, 1)
    return true
  }
  for (const child of parent.children) {
    if (removeNodeFromParent(child, nodeId)) return true
  }
  return false
}

function flattenNode(node: MindNode): MindNode[] {
  return [node, ...node.children.flatMap(c => flattenNode(c))]
}

function collectTags(node: MindNode, byTag: Record<string, number>): void {
  node.tags.forEach(tag => {
    byTag[tag] = (byTag[tag] || 0) + 1
  })
  node.children.forEach(c => collectTags(c, byTag))
}