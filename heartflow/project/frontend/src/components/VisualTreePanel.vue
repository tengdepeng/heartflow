<template>
  <section class="vt-panel" aria-label="根脉可视化">
    <div class="vt-panel-head">
      <span class="vt-panel-title">🌿 根脉可视化</span>
      <span class="vt-panel-sub">四种布局 · 世代统计</span>
    </div>

    <!-- 布局选择 -->
    <div class="vt-block">
      <span class="vt-block-label">布局方式</span>
      <div class="vt-layout-row">
        <button
          v-for="l in LAYOUTS"
          :key="l.value"
          class="vt-layout-btn"
          :class="{ 'vt-layout-btn--active': layoutType === l.value }"
          @click="layoutType = l.value"
        >{{ l.label }}</button>
        <button class="vt-btn vt-btn-primary" @click="buildTree">生成视图</button>
      </div>
    </div>

    <!-- 树渲染 -->
    <div v-if="currentTree" class="vt-block">
      <div class="vt-tree-head">
        <span class="vt-block-label">{{ currentTree.title }} · {{ currentTree.totalNodes }} 节点 · {{ currentTree.edges.length }} 连线</span>
        <button class="vt-btn vt-btn-danger" @click="removeTree">移除</button>
      </div>
      <svg :viewBox="viewBox" class="vt-svg">
        <path
          v-for="e in currentTree.edges"
          :key="e.id"
          :d="edgePath(e)"
          :stroke="e.color"
          :stroke-dasharray="e.dashed ? '4 3' : undefined"
          fill="none"
          stroke-width="1.5"
          opacity="0.6"
        />
        <g v-for="n in currentTree.nodes" :key="n.id" :transform="`translate(${n.x}, ${n.y})`">
          <rect
            :width="n.width"
            :height="n.height"
            rx="8"
            :fill="n.color"
            fill-opacity="0.18"
            :stroke="n.color"
            stroke-width="1"
          />
          <text
            :x="n.width / 2"
            :y="n.height / 2 + 4"
            text-anchor="middle"
            :fill="n.color"
            font-size="11"
          >{{ truncate(n.label, 12) }}</text>
        </g>
      </svg>
    </div>

    <!-- 世代统计 -->
    <div v-if="generationStats.length" class="vt-block">
      <span class="vt-block-label">世代统计</span>
      <div v-for="g in generationStats" :key="g.generation" class="vt-gen-row">
        <span class="vt-gen-name">第 {{ g.generation + 1 }} 代</span>
        <span class="vt-gen-count">{{ g.nodeCount }} 节点</span>
        <span class="vt-gen-strength">均强度 {{ g.avgStrength }}</span>
        <span class="vt-gen-layer">主导：{{ layerLabel(g.dominantLayer) }}</span>
      </div>
    </div>

    <p v-if="!currentTree" class="vt-hint">选择布局后点击「生成视图」，将根脉编织为可视化树。</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useVisualTree } from '../modules/roots/visual-tree'
import type { LayoutType, VisualEdge } from '../modules/roots/visual-tree'
import type { Root } from '../modules/roots/roots-garden'

const props = defineProps<{ roots: Root[] }>()

const LAYOUTS: { value: LayoutType; label: string }[] = [
  { value: 'vertical', label: '垂直' },
  { value: 'horizontal', label: '水平' },
  { value: 'radial', label: '径向' },
  { value: 'compact', label: '紧凑' },
]

const visualTree = useVisualTree()
const layoutType = ref<LayoutType>('vertical')

const currentTree = computed(() => visualTree.getLatestVisualTree())
const generationStats = computed(() => {
  const t = currentTree.value
  return t ? visualTree.computeGenerationStats(t) : []
})

const viewBox = computed(() => {
  const t = currentTree.value
  if (!t || t.nodes.length === 0) return '0 0 800 600'
  const maxX = Math.max(...t.nodes.map(n => n.x + n.width)) + 40
  const maxY = Math.max(...t.nodes.map(n => n.y + n.height)) + 40
  return `0 0 ${Math.max(800, maxX)} ${Math.max(600, maxY)}`
})

function buildTree() {
  visualTree.buildVisualTree(props.roots, '根脉之庭', layoutType.value)
}

function removeTree() {
  const t = currentTree.value
  if (t) visualTree.removeVisualTree(t.id)
}

function edgePath(e: VisualEdge): string {
  const t = currentTree.value
  if (!t) return ''
  const source = t.nodes.find(n => n.id === e.sourceId)
  const target = t.nodes.find(n => n.id === e.targetId)
  if (!source || !target) return ''
  return visualTree.generateEdgePath(e, source, target, t.layoutType)
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

function layerLabel(layer: string): string {
  return { soil: '根系', era: '树干', branch: '枝桠' }[layer] || layer
}
</script>

<style scoped>
.vt-panel {
  border: 1px solid rgba(139, 155, 122, 0.25);
  border-radius: 14px;
  padding: 18px 20px;
  background: rgba(20, 24, 20, 0.35);
  margin-top: 16px;
}
.vt-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.vt-panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #e8e4d8;
}
.vt-panel-sub {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.55);
}
.vt-block {
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.vt-block-label {
  display: block;
  font-size: 12px;
  color: rgba(232, 228, 216, 0.6);
  margin-bottom: 10px;
  letter-spacing: 0.05em;
}
.vt-layout-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.vt-layout-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: rgba(232, 228, 216, 0.7);
  font-size: 13px;
  cursor: pointer;
}
.vt-layout-btn--active {
  background: rgba(138, 154, 122, 0.35);
  color: #e8e4d8;
  border-color: rgba(138, 154, 122, 0.6);
}
.vt-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
  color: #e8e4d8;
  background: rgba(139, 155, 122, 0.2);
}
.vt-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.vt-btn-danger {
  background: rgba(196, 106, 90, 0.3);
}
.vt-tree-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.vt-svg {
  width: 100%;
  height: auto;
  max-height: 420px;
  background: rgba(10, 12, 10, 0.3);
  border-radius: 10px;
}
.vt-gen-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.12);
  font-size: 12px;
}
.vt-gen-row:last-child {
  border-bottom: none;
}
.vt-gen-name {
  color: #e8e4d8;
  font-weight: 600;
}
.vt-gen-count,
.vt-gen-strength,
.vt-gen-layer {
  color: rgba(232, 228, 216, 0.55);
}
.vt-hint {
  font-size: 12px;
  color: rgba(232, 228, 216, 0.5);
}
</style>
