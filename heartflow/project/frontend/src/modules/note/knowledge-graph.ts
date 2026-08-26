// ============================================================
// 思绪书房 · 知识图谱
// 蓝图要求：思维导图 + 知识图谱
// ============================================================

import { ref } from 'vue'
import type { Note } from '../../types'

// ---- 知识图谱类型 ----

export interface KnowledgeNode {
  id: string
  /** 节点标签 */
  label: string
  /** 节点类型 */
  type: 'note' | 'tag' | 'concept' | 'link'
  /** 关联笔记 ID */
  noteId?: string
  /** 节点大小（基于重要性） */
  size: number
  /** 颜色 */
  color: string
  /** 分组 */
  group: string
  /** 元数据 */
  metadata: Record<string, unknown>
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  /** 关联强度 */
  strength: number
  /** 关联类型 */
  type: 'tag-shared' | 'content-similar' | 'link' | 'sequence'
  /** 标签 */
  label?: string
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  stats: {
    totalNodes: number
    totalEdges: number
    density: number
    clusters: number
    avgDegree: number
  }
}

// ---- 思维导图类型 ----

export interface MindMapNode {
  id: string
  /** 节点文本 */
  text: string
  /** 子节点 */
  children: MindMapNode[]
  /** 笔记 ID */
  noteId?: string
  /** 是否折叠 */
  collapsed: boolean
  /** 颜色 */
  color: string
  /** 图标 */
  icon?: string
}

export interface MindMap {
  root: MindMapNode
  totalNodes: number
  maxDepth: number
}

// ---- 节点颜色 ----

const TAG_COLORS = [
  '#6b9fc4', '#8a9a7a', '#d98c7a', '#f0c040',
  '#e0a96d', '#a07c8c', '#6b9fc4', '#cf8b6b',
  '#b5707a', '#7a9a8a', '#d98c7a', '#6b9fc4',
]

const GROUP_COLORS: Record<string, string> = {
  work: '#6b9fc4',
  personal: '#8a9a7a',
  learning: '#f0c040',
  health: '#d98c7a',
  project: '#e0a96d',
  idea: '#a07c8c',
  reflection: '#6b9fc4',
  other: '#94a3b8',
}

// ============================================================
// 知识图谱
// ============================================================

export function useKnowledgeGraph(getNotes: () => Note[]) {
  const graph = ref<KnowledgeGraph | null>(null)

  /**
   * 构建知识图谱
   */
  function buildGraph(): KnowledgeGraph {
    const notes = getNotes().filter(n => !n.deletedAt)
    const nodes: KnowledgeNode[] = []
    const edges: KnowledgeEdge[] = []
    const nodeMap = new Map<string, KnowledgeNode>()

    // 1. 创建笔记节点
    let colorIdx = 0
    for (const note of notes) {
      const node: KnowledgeNode = {
        id: `note:${note.id}`,
        label: note.title || '无标题',
        type: 'note',
        noteId: note.id,
        size: calculateNoteSize(note),
        color: GROUP_COLORS[detectNoteGroup(note)] || GROUP_COLORS.other,
        group: detectNoteGroup(note),
        metadata: {
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          hasContent: !!note.content,
        },
      }
      nodes.push(node)
      nodeMap.set(node.id, node)
      colorIdx++
    }

    // 2. 创建标签节点
    const tagSet = new Set<string>()
    for (const note of notes) {
      for (const tag of note.tags) {
        tagSet.add(tag)
      }
    }

    const tagIdx = 0
    for (const tag of tagSet) {
      const tagNode: KnowledgeNode = {
        id: `tag:${tag}`,
        label: tag,
        type: 'tag',
        size: 8,
        color: TAG_COLORS[tagIdx % TAG_COLORS.length],
        group: 'tag',
        metadata: {},
      }
      nodes.push(tagNode)
      nodeMap.set(tagNode.id, tagNode)
    }

    // 3. 创建标签-笔记边
    for (const note of notes) {
      for (const tag of note.tags) {
        const edge: KnowledgeEdge = {
          id: `edge:tag:${note.id}:${tag}`,
          source: `note:${note.id}`,
          target: `tag:${tag}`,
          strength: 1,
          type: 'tag-shared',
        }
        edges.push(edge)
      }
    }

    // 4. 创建内容相似边（基于共享标签）
    const tagToNotes = new Map<string, string[]>()
    for (const note of notes) {
      for (const tag of note.tags) {
        if (!tagToNotes.has(tag)) tagToNotes.set(tag, [])
        tagToNotes.get(tag)!.push(note.id)
      }
    }

    const contentEdges = new Set<string>()
    for (const [, noteIds] of tagToNotes) {
      for (let i = 0; i < noteIds.length; i++) {
        for (let j = i + 1; j < noteIds.length; j++) {
          const key = [noteIds[i], noteIds[j]].sort().join('::')
          if (!contentEdges.has(key)) {
            contentEdges.add(key)
            edges.push({
              id: `edge:content:${key}`,
              source: `note:${noteIds[i]}`,
              target: `note:${noteIds[j]}`,
              strength: 0.5,
              type: 'content-similar',
            })
          }
        }
      }
    }

    // 5. 创建时间序列边（连续创建的笔记）
    const sortedNotes = [...notes].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    for (let i = 0; i < sortedNotes.length - 1; i++) {
      const a = sortedNotes[i]
      const b = sortedNotes[i + 1]
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      // 30分钟内创建的笔记视为连续
      if (timeDiff <= 1800000) {
        edges.push({
          id: `edge:sequence:${a.id}:${b.id}`,
          source: `note:${a.id}`,
          target: `note:${b.id}`,
          strength: 0.3,
          type: 'sequence',
        })
      }
    }

    // 计算统计
    const totalNodes = nodes.length
    const totalEdges = edges.length
    const density = totalNodes > 1
      ? Math.round((2 * totalEdges / (totalNodes * (totalNodes - 1))) * 1000) / 1000
      : 0
    const avgDegree = totalNodes > 0
      ? Math.round((2 * totalEdges / totalNodes) * 100) / 100
      : 0

    // 简单聚类（基于连通分量）
    const clusters = countClusters(nodes, edges)

    const result: KnowledgeGraph = {
      nodes,
      edges,
      stats: {
        totalNodes,
        totalEdges,
        density,
        clusters,
        avgDegree,
      },
    }

    graph.value = result
    return result
  }

  /** 计算笔记节点大小 */
  function calculateNoteSize(note: Note): number {
    let size = 5
    size += Math.min(10, note.content.length / 500)
    size += note.tags.length * 2
    if (note.archived) size *= 0.7
    return Math.min(25, Math.round(size))
  }

  /** 检测笔记分组 */
  function detectNoteGroup(note: Note): string {
    const tags = note.tags.map(t => t.toLowerCase())
    if (tags.some(t => ['工作', 'work', '项目', 'project'].includes(t))) return 'work'
    if (tags.some(t => ['个人', 'personal', '生活', 'life'].includes(t))) return 'personal'
    if (tags.some(t => ['学习', 'learning', '知识', 'knowledge'].includes(t))) return 'learning'
    if (tags.some(t => ['健康', 'health', '运动', 'exercise'].includes(t))) return 'health'
    if (tags.some(t => ['想法', 'idea', '灵感', 'inspiration'].includes(t))) return 'idea'
    if (tags.some(t => ['反思', 'reflection', '回顾', 'review'].includes(t))) return 'reflection'
    return 'other'
  }

  /** 简单连通分量计数 */
  function countClusters(nodes: KnowledgeNode[], edges: KnowledgeEdge[]): number {
    const visited = new Set<string>()
    const adj = new Map<string, string[]>()

    for (const node of nodes) {
      adj.set(node.id, [])
    }
    for (const edge of edges) {
      adj.get(edge.source)?.push(edge.target)
      adj.get(edge.target)?.push(edge.source)
    }

    let clusters = 0
    for (const node of nodes) {
      if (!visited.has(node.id)) {
        clusters++
        // BFS
        const queue = [node.id]
        visited.add(node.id)
        while (queue.length > 0) {
          const current = queue.shift()!
          for (const neighbor of adj.get(current) || []) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor)
              queue.push(neighbor)
            }
          }
        }
      }
    }

    return clusters
  }

  /**
   * 查询与指定笔记相关的节点
   */
  function queryRelatedNodes(noteId: string, depth: number = 1): {
    nodes: KnowledgeNode[]
    edges: KnowledgeEdge[]
  } {
    const g = graph.value || buildGraph()
    const visited = new Set<string>()
    const resultNodes: KnowledgeNode[] = []
    const resultEdges: KnowledgeEdge[] = []

    const startId = `note:${noteId}`
    const startNode = g.nodes.find(n => n.id === startId)
    if (!startNode) return { nodes: [], edges: [] }

    const queue: { id: string; level: number }[] = [{ id: startId, level: 0 }]
    visited.add(startId)

    while (queue.length > 0) {
      const { id, level } = queue.shift()!
      const node = g.nodes.find(n => n.id === id)
      if (node) resultNodes.push(node)

      if (level < depth) {
        for (const edge of g.edges) {
          const neighbor = edge.source === id ? edge.target : edge.target === id ? edge.source : null
          if (neighbor && !visited.has(neighbor)) {
            visited.add(neighbor)
            queue.push({ id: neighbor, level: level + 1 })
            resultEdges.push(edge)
          }
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges }
  }

  return {
    graph,
    buildGraph,
    queryRelatedNodes,
  }
}

// ============================================================
// 思维导图
// ============================================================

export function useMindMap(getNotes: () => Note[]) {
  const mindMap = ref<MindMap | null>(null)

  /**
   * 从笔记构建思维导图
   */
  function buildMindMap(): MindMap {
    const notes = getNotes().filter(n => !n.deletedAt)

    // 按标签分组
    const tagGroups = new Map<string, Note[]>()
    const untagged: Note[] = []

    for (const note of notes) {
      if (note.tags.length === 0) {
        untagged.push(note)
      } else {
        for (const tag of note.tags) {
          if (!tagGroups.has(tag)) tagGroups.set(tag, [])
          tagGroups.get(tag)!.push(note)
        }
      }
    }

    // 构建根节点
    const root: MindMapNode = {
      id: 'root',
      text: '我的笔记',
      children: [],
      collapsed: false,
      color: '#6b9fc4',
    }

    let totalNodes = 1
    let maxDepth = 0

    // 添加标签分支
    let tagColorIdx = 0
    for (const [tag, taggedNotes] of tagGroups) {
      const tagNode: MindMapNode = {
        id: `branch:${tag}`,
        text: `#${tag}`,
        children: [],
        collapsed: false,
        color: TAG_COLORS[tagColorIdx % TAG_COLORS.length],
      }
      tagColorIdx++

      for (const note of taggedNotes) {
        const noteNode = createNoteNode(note)
        tagNode.children.push(noteNode)
        totalNodes++
      }

      root.children.push(tagNode)
      totalNodes++
      maxDepth = Math.max(maxDepth, 2)
    }

    // 添加无标签笔记
    if (untagged.length > 0) {
      const untaggedNode: MindMapNode = {
        id: 'branch:untagged',
        text: '未分类',
        children: [],
        collapsed: false,
        color: '#94a3b8',
      }

      for (const note of untagged) {
        untaggedNode.children.push(createNoteNode(note))
        totalNodes++
      }

      root.children.push(untaggedNode)
      totalNodes++
    }

    const result: MindMap = {
      root,
      totalNodes,
      maxDepth,
    }

    mindMap.value = result
    return result
  }

  function createNoteNode(note: Note): MindMapNode {
    const title = note.title || '无标题'
    const hasContent = note.content && note.content.length > 0

    let icon: string | undefined
    if (note.archived) icon = '📦'
    else if (hasContent && note.content.length > 1000) icon = '📄'
    else if (hasContent) icon = '📝'

    return {
      id: `note:${note.id}`,
      text: title.length > 20 ? title.slice(0, 20) + '...' : title,
      children: [],
      noteId: note.id,
      collapsed: false,
      color: GROUP_COLORS[detectNoteGroup(note)] || GROUP_COLORS.other,
      icon,
    }
  }

  function detectNoteGroup(note: Note): string {
    const tags = note.tags.map(t => t.toLowerCase())
    if (tags.some(t => ['工作', 'work'].includes(t))) return 'work'
    if (tags.some(t => ['个人', 'personal'].includes(t))) return 'personal'
    if (tags.some(t => ['学习', 'learning'].includes(t))) return 'learning'
    if (tags.some(t => ['健康', 'health'].includes(t))) return 'health'
    if (tags.some(t => ['项目', 'project'].includes(t))) return 'project'
    return 'other'
  }

  /**
   * 查找节点
   */
  function findNode(root: MindMapNode, nodeId: string): MindMapNode | null {
    if (root.id === nodeId) return root
    for (const child of root.children) {
      const found = findNode(child, nodeId)
      if (found) return found
    }
    return null
  }

  /**
   * 切换折叠
   */
  function toggleCollapse(nodeId: string): boolean {
    if (!mindMap.value) return false
    const node = findNode(mindMap.value.root, nodeId)
    if (!node) return false
    node.collapsed = !node.collapsed
    return true
  }

  /**
   * 导出为扁平结构（用于可视化库）
   */
  function flatten(node: MindMapNode, depth: number = 0): {
    id: string
    text: string
    depth: number
    color: string
    icon: string
    noteId: string | undefined
    hasChildren: boolean
  }[] {
    const result = [{
      id: node.id,
      text: node.text,
      depth,
      color: node.color,
      icon: node.icon ?? 'note',
      noteId: node.noteId,
      hasChildren: node.children.length > 0,
    }]

    if (!node.collapsed) {
      for (const child of node.children) {
        result.push(...flatten(child, depth + 1))
      }
    }

    return result
  }

  return {
    mindMap,
    buildMindMap,
    findNode,
    toggleCollapse,
    flatten,
  }
}

// ---- 存储键 ----

export const KNOWLEDGE_GRAPH_STORAGE_KEYS = {
  GRAPH_CACHE: 'hf:note_knowledge_graph',
  MIND_MAP_CACHE: 'hf:note_mind_map',
} as const