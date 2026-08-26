// ============================================================
// 通用跨域关联引擎 · 本地力导向布局（零依赖 / 零外网）
// C1-EXT：把 computeAssociationGraph() 的图数据投影到二维坐标，
// 纯本地计算，不引入 d3 / 任何布局库。算法为简化 Fruchterman-Reingold
// 变体：斥力（节点间）+ 引力（仅连边）+ 轻微向心跳聚（避免飞散）。
// ============================================================

import type { AssociationGraph } from './types'

export interface LayoutNode {
  /** 与 graph.nodes 同源的键 `${domain}:${id}` */
  key: string
  domain: string
  id: string
  label: string
  x: number
  y: number
  /** 度数（连边数），用于节点半径缩放 */
  degree: number
}

export interface LayoutEdge {
  id: string
  source: string
  target: string
  linkType: string
  strength: number
}

export interface GraphLayout {
  nodes: LayoutNode[]
  edges: LayoutEdge[]
  width: number
  height: number
}

export interface LayoutOptions {
  width?: number
  height?: number
  iterations?: number
}

/** 稳定伪随机：同一 seed 总是得到同一序列，避免每次渲染抖动 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 计算关联图布局。纯函数（给定相同输入总是相同输出），可单测。
 * @param graph 关联图（来自 computeAssociationGraph）
 * @param options 画布尺寸与迭代次数
 */
export function computeLayout(
  graph: AssociationGraph,
  options: LayoutOptions = {},
): GraphLayout {
  const width = options.width ?? 800
  const height = options.height ?? 600
  const iterations = options.iterations ?? 200

  const nodes = graph.nodes.map(n => ({
    domain: n.domain,
    id: n.id,
    key: `${n.domain}:${n.id}`,
    label: n.label,
  }))
  const keyToIndex = new Map(nodes.map((n, i) => [n.key, i]))

  const edges: LayoutEdge[] = graph.links.map(l => ({
    id: l.id,
    source: `${l.sourceDomain}:${l.sourceId}`,
    target: `${l.targetDomain}:${l.targetId}`,
    linkType: l.linkType,
    strength: l.strength,
  }))

  // 度数统计（仅统计两端都存在的边）
  const degree = new Array(nodes.length).fill(0)
  const validEdges = edges.filter(e => keyToIndex.has(e.source) && keyToIndex.has(e.target))
  for (const e of validEdges) {
    degree[keyToIndex.get(e.source)!]++
    degree[keyToIndex.get(e.target)!]++
  }

  // 初始位置：以中心为原点、环上均匀撒点 + 轻微伪随机扰动（确定性）
  const rng = mulberry32(0x9e3779b9 ^ nodes.length)
  const cx = width / 2
  const cy = height / 2
  const radius = Math.min(width, height) * 0.32
  const pos = nodes.map((_, i) => {
    if (nodes.length === 1) return { x: cx, y: cy }
    const ang = (i / Math.max(1, nodes.length)) * Math.PI * 2
    return {
      x: cx + Math.cos(ang) * radius + (rng() - 0.5) * 40,
      y: cy + Math.sin(ang) * radius + (rng() - 0.5) * 40,
    }
  })

  // 力导向迭代
  const k = Math.sqrt((width * height) / Math.max(1, nodes.length)) // 理想边长
  const repulse = k * k
  let temp = width * 0.1 // 模拟温度，逐轮降温

  for (let iter = 0; iter < iterations; iter++) {
    const disp = pos.map(() => ({ x: 0, y: 0 }))

    // 斥力：所有节点两两
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        let dx = pos[i].x - pos[j].x
        let dy = pos[i].y - pos[j].y
        let dist = Math.hypot(dx, dy) || 0.01
        const force = repulse / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        disp[i].x += fx
        disp[i].y += fy
        disp[j].x -= fx
        disp[j].y -= fy
      }
    }

    // 引力：仅连边（按 strength 加权）
    for (const e of validEdges) {
      const si = keyToIndex.get(e.source)!
      const ti = keyToIndex.get(e.target)!
      let dx = pos[si].x - pos[ti].x
      let dy = pos[si].y - pos[ti].y
      let dist = Math.hypot(dx, dy) || 0.01
      const force = (dist * dist) / k * (0.4 + 0.6 * e.strength)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      disp[si].x -= fx
      disp[si].y -= fy
      disp[ti].x += fx
      disp[ti].y += fy
    }

    // 向心微力：防止整体飘移 / 飞散
    for (let i = 0; i < nodes.length; i++) {
      const dx = cx - pos[i].x
      const dy = cy - pos[i].y
      disp[i].x += dx * 0.005
      disp[i].y += dy * 0.005
    }

    // 应用位移（受温度裁剪）+ 边界回弹
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01
      const limited = Math.min(d, temp)
      pos[i].x += (disp[i].x / d) * limited
      pos[i].y += (disp[i].y / d) * limited
      const pad = 24
      pos[i].x = Math.max(pad, Math.min(width - pad, pos[i].x))
      pos[i].y = Math.max(pad, Math.min(height - pad, pos[i].y))
    }

    temp *= 0.96 // 降温
  }

  return {
    nodes: nodes.map((n, i) => ({
      ...n,
      x: Math.round(pos[i].x * 100) / 100,
      y: Math.round(pos[i].y * 100) / 100,
      degree: degree[i],
    })),
    edges: validEdges,
    width,
    height,
  }
}
