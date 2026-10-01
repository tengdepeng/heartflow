<script setup lang="ts">
import { computed, ref } from 'vue'
import { useKnowledgeBridge } from '../modules/knowledge/knowledge-bridge'
import type { GraphNode, GraphEdge } from '../modules/knowledge/graph-visualization'
import EmptyState from '../components/EmptyState.vue'

// 经略阁关系图谱：消费 knowledge-bridge（及其底层的 graph-visualization 成熟引擎）
// 接上此前悬空的 useKnowledgeBridge(knowledge 侧) 孤儿链路。
const bridge = useKnowledgeBridge()

const base = bridge.graphData
const layout = ref<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null)
const display = computed(() => layout.value ?? base.value)
const nodeMap = computed(() => new Map(display.value.nodes.map((n) => [n.id, n])))

const selectedId = ref<string | null>(null)
const hoveredId = ref<string | null>(null)

function relayout() {
  const res = bridge.applyLayout()
  layout.value = { nodes: res.nodes, edges: base.value.edges }
}
function resetLayout() {
  layout.value = null
}

function neighborsOf(id: string): Set<string> {
  const s = new Set<string>()
  for (const e of display.value.edges) {
    if (e.source === id) s.add(e.target)
    if (e.target === id) s.add(e.source)
  }
  return s
}
function focusId(): string | null {
  return hoveredId.value ?? selectedId.value
}
function dim(id: string): boolean {
  const f = focusId()
  if (!f) return false
  return f !== id && !neighborsOf(f).has(id)
}
function active(id: string): boolean {
  const f = focusId()
  return f === id || (f != null && neighborsOf(f).has(id))
}

const viewBox = computed(() => {
  const ns = display.value.nodes
  if (!ns.length) return '0 0 800 600'
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of ns) {
    minX = Math.min(minX, n.x - n.radius)
    minY = Math.min(minY, n.y - n.radius)
    maxX = Math.max(maxX, n.x + n.radius)
    maxY = Math.max(maxY, n.y + n.radius)
  }
  const pad = 48
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`
})
</script>

<template>
  <div class="kg-view">
    <header class="kg-bar">
      <h2 class="kg-title">经略阁 · 关系图谱</h2>
      <div class="kg-actions">
        <button type="button" @click="relayout">重新布局</button>
        <button type="button" @click="resetLayout">复位</button>
      </div>
      <p class="kg-meta">节点 {{ display.nodes.length }} · 关系 {{ display.edges.length }}</p>
    </header>

    <EmptyState
      v-if="display.nodes.length === 0"
      icon="🕸"
      title="还没有知识节点。"
      hint="去「知识塔」创建节点并建立关系，图谱会自动生长。"
      :glow="false"
      cta-label=""
    />

    <svg
      v-else
      class="kg-canvas"
      :viewBox="viewBox"
      preserveAspectRatio="xMidYMid meet"
    >
      <line
        v-for="e in display.edges"
        :key="e.id"
        :x1="nodeMap.get(e.source)?.x ?? 0"
        :y1="nodeMap.get(e.source)?.y ?? 0"
        :x2="nodeMap.get(e.target)?.x ?? 0"
        :y2="nodeMap.get(e.target)?.y ?? 0"
        :stroke="e.color"
        :stroke-opacity="dim(e.source) || dim(e.target) ? 0.1 : 0.45"
        stroke-width="1.2"
      />
      <g
        v-for="n in display.nodes"
        :key="n.id"
        :transform="`translate(${n.x},${n.y})`"
        class="kg-node"
        :class="{ active: active(n.id), dim: dim(n.id) }"
        @mouseenter="hoveredId = n.id"
        @mouseleave="hoveredId = null"
        @click="selectedId = selectedId === n.id ? null : n.id"
      >
        <circle :r="n.radius" :fill="n.color" />
        <text class="kg-label" :y="n.radius + 13" text-anchor="middle">{{ n.label }}</text>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.kg-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.kg-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  flex-wrap: wrap;
}
.kg-title {
  font-size: 15px;
  margin: 0;
  font-weight: 600;
}
.kg-actions {
  display: flex;
  gap: 8px;
}
.kg-actions button {
  border: 1px solid var(--glass-border, rgba(255, 255, 255, 0.18));
  background: var(--glass-fill, rgba(255, 255, 255, 0.06));
  color: var(--text, #e8e3da);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
}
.kg-actions button:hover {
  background: var(--glass-fill-hover, rgba(255, 255, 255, 0.12));
}
.kg-meta {
  margin: 0;
  opacity: 0.6;
  font-size: 12px;
}
/* ---- Empty（已迁共享 EmptyState，原 .kg-empty 死 CSS 删除） ---- */
.kg-canvas {
  flex: 1;
  width: 100%;
  min-height: 0;
}
.kg-node {
  cursor: pointer;
  transition: opacity 0.18s ease;
}
.kg-node.active circle {
  stroke: #fff;
  stroke-width: 2;
}
.kg-node.dim {
  opacity: 0.22;
}
.kg-label {
  font-size: 11px;
  fill: var(--text, #e8e3da);
  paint-order: stroke;
  stroke: rgba(0, 0, 0, 0.45);
  stroke-width: 2.5px;
  pointer-events: none;
}
</style>
