<template>
  <section class="kgp-archive" aria-label="知识图谱">
    <!-- 空态（书架为空） -->
    <template v-if="notes.length === 0">
      <div class="kgp-head">
        <span class="kgp-title">🕸️ 知识图谱</span>
        <span class="kgp-badge kgp-badge-neutral">图谱未启</span>
      </div>
      <p class="kgp-empty">
        书架还空着。写下几篇带标签的笔记，知识图谱会在这里织出你的思绪网络——标签是星，笔记是光。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="kgp-head">
        <span class="kgp-title">🕸️ 知识图谱</span>
        <span class="kgp-badge kgp-badge-gold">{{ stats.nodeCount }} 节点 · {{ stats.edgeCount }} 关联</span>
      </div>

      <!-- 图谱概览 -->
      <div class="kgp-stats">
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.nodeCount }}</span><span class="kgp-stat-label">节点</span></div>
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.edgeCount }}</span><span class="kgp-stat-label">关联</span></div>
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.density }}</span><span class="kgp-stat-label">密度</span></div>
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.components }}</span><span class="kgp-stat-label">聚类</span></div>
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.isolatedNodes }}</span><span class="kgp-stat-label">孤立</span></div>
        <div class="kgp-stat"><span class="kgp-stat-num">{{ stats.hubCount }}</span><span class="kgp-stat-label">枢纽</span></div>
      </div>

      <!-- 图谱星图（标签星座） -->
      <div v-if="constellation.nodes.length > 0" class="kgp-card">
        <span class="kgp-card-t">图谱星图 · 标签星座</span>
        <svg class="kgp-svg" viewBox="0 0 320 220" role="img" aria-label="标签星座图">
          <line
            v-for="(e, i) in constellation.edges"
            :key="`e${i}`"
            class="kgp-svg-edge"
            :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2"
          />
          <g v-for="n in constellation.nodes" :key="n.id" class="kgp-svg-node">
            <circle :cx="n.x" :cy="n.y" :r="n.r" class="kgp-svg-circle" />
            <text :x="n.x" :y="n.y" class="kgp-svg-label">{{ n.label }}</text>
          </g>
        </svg>
        <p class="kgp-svg-hint">星的大小代表标签连接的笔记数，连线代表同篇笔记上的标签共现</p>
      </div>

      <!-- 知识发现 -->
      <div v-if="discoveries.length > 0" class="kgp-card">
        <span class="kgp-card-t">知识发现</span>
        <div v-for="(d, i) in discoveries" :key="`d${i}`" class="kgp-disc">
          <span class="kgp-disc-badge" :class="`kgp-disc-${d.type}`">{{ typeLabel(d.type) }}</span>
          <p class="kgp-disc-desc">{{ d.description }}</p>
          <p class="kgp-disc-action">✦ {{ d.action }}</p>
        </div>
      </div>

      <!-- 核心标签（连接 2+ 笔记的标签，按度数排序） -->
      <div v-if="hubs.length > 0" class="kgp-card">
        <span class="kgp-card-t">核心标签</span>
        <div class="kgp-hubs">
          <span v-for="h in hubs" :key="h.label" class="kgp-hub-chip">
            {{ h.label }}<em>{{ h.degree }}</em>
          </span>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="kgp-insights">
        <li v-for="ins in insights" :key="ins" class="kgp-insight">
          <span class="kgp-insight-mark">✦</span>
          <span class="kgp-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useKnowledgeBridge } from '../modules/note/knowledge-bridge'
import type { KnowledgeGraph } from '../modules/note/knowledge-graph'
import type { BridgeStats, KnowledgeDiscovery } from '../modules/note/knowledge-bridge'
import type { Note } from '../types'

// 薄委托化（INCR-230）：notes 由宿主注入，组件不再直读 study 引擎
const props = withDefaults(defineProps<{ notes?: Note[] }>(), { notes: () => [] })

const bridge = useKnowledgeBridge()

const notes = computed(() => props.notes.filter(n => !n.deletedAt))

// 图谱重建版本号：initialize 内部缓存为非响应式，需以版本号驱动重算
const graphVersion = ref(0)
const graphData = ref<KnowledgeGraph | null>(null)

watch(
  notes,
  list => {
    graphData.value = bridge.initialize(list)
    graphVersion.value++
  },
  { immediate: true },
)

const stats = computed<BridgeStats>(() => {
  void graphVersion.value
  return bridge.getBridgeStats()
})

const discoveries = computed<KnowledgeDiscovery[]>(() => {
  void graphVersion.value
  return bridge.discoverKnowledge()
})

// ---- 图谱星图：按度数取 Top 标签排布成星座 ----

interface ConstellationNode {
  id: string
  label: string
  degree: number
  x: number
  y: number
  r: number
}

interface ConstellationEdge {
  x1: number
  y1: number
  x2: number
  y2: number
}

const constellation = computed<{ nodes: ConstellationNode[]; edges: ConstellationEdge[] }>(() => {
  void graphVersion.value
  const g = graphData.value
  if (!g || g.nodes.length === 0) return { nodes: [], edges: [] }

  const adj = new Map<string, string[]>()
  for (const n of g.nodes) adj.set(n.id, [])
  for (const e of g.edges) {
    adj.get(e.source)?.push(e.target)
    adj.get(e.target)?.push(e.source)
  }

  const topTags = g.nodes
    .filter(n => n.type === 'tag')
    .map(n => ({ id: n.id, label: n.label, degree: adj.get(n.id)?.length || 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 8)

  if (topTags.length === 0) return { nodes: [], edges: [] }

  const CX = 160
  const CY = 110
  const R = 82
  const placed = topTags.map((t, i) => {
    const angle = (2 * Math.PI * i) / topTags.length - Math.PI / 2
    return {
      ...t,
      x: Math.round(CX + R * Math.cos(angle)),
      y: Math.round(CY + R * Math.sin(angle)),
      r: Math.min(26, 10 + t.degree * 2),
    }
  })

  // 标签共现边：同一篇笔记上的两个标签连成一线
  const tagIdSet = new Set(placed.map(p => p.id))
  const seen = new Set<string>()
  const edges: ConstellationEdge[] = []
  for (const note of notes.value) {
    const matched = note.tags.map(t => `tag:${t}`).filter(t => tagIdSet.has(t))
    for (let i = 0; i < matched.length; i++) {
      for (let j = i + 1; j < matched.length; j++) {
        const key = [matched[i], matched[j]].sort().join('::')
        if (seen.has(key)) continue
        seen.add(key)
        const a = placed.find(p => p.id === matched[i])
        const b = placed.find(p => p.id === matched[j])
        if (a && b) edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y })
      }
    }
  }

  return { nodes: placed, edges }
})

// ---- 核心标签：连接 2+ 笔记的标签，按度数排序 ----

const hubs = computed<{ label: string; degree: number }[]>(() => {
  void graphVersion.value
  const g = graphData.value
  if (!g || g.nodes.length === 0) return []

  const adj = new Map<string, string[]>()
  for (const n of g.nodes) adj.set(n.id, [])
  for (const e of g.edges) {
    adj.get(e.source)?.push(e.target)
    adj.get(e.target)?.push(e.source)
  }
  return g.nodes
    .filter(n => n.type === 'tag' && (adj.get(n.id)?.length || 0) >= 2)
    .map(n => ({ label: n.label, degree: adj.get(n.id)?.length || 0 }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 6)
})

// ---- 温和洞察 ----

const insights = computed(() => buildInsights(stats.value, discoveries.value))

function buildInsights(s: BridgeStats, ds: KnowledgeDiscovery[]): string[] {
  const list: string[] = []
  if (s.isolatedNodes > 0) {
    list.push(`${s.isolatedNodes} 篇笔记仍孤立在谱外，为它们添上标签，就会织进这张网`)
  }
  if (s.hubCount > 0) {
    list.push(`${s.hubCount} 个枢纽标签撑起了知识主干，值得持续深耕`)
  }
  const clusters = ds.filter(d => d.type === 'cluster')
  if (clusters.length > 0) {
    list.push(`发现 ${clusters.length} 个知识聚类，可为每个聚类写一篇专题笔记`)
  }
  const bridges = ds.filter(d => d.type === 'bridge')
  if (bridges.length > 0) {
    list.push(`${bridges.length} 个桥接标签连接着不同领域，是跨界的灵感入口`)
  }
  if (list.length === 0) {
    list.push('图谱正在生长，多写带标签的笔记，它会越来越清晰')
  }
  return list.slice(0, 4)
}

const DISCOVERY_LABELS: Record<string, string> = {
  cluster: '聚类',
  bridge: '桥接',
  isolated: '孤立',
  hub: '枢纽',
}

function typeLabel(t: string): string {
  return DISCOVERY_LABELS[t] || t
}
</script>

<style scoped>
.kgp-archive {
  display: block;
  width: 100%;
  max-width: 640px;
}
.kgp-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.kgp-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.02em;
}
.kgp-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.kgp-badge-gold {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.kgp-badge-neutral {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.kgp-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.kgp-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}
.kgp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 50%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.kgp-stat-num {
  font-size: 15px;
  font-weight: 600;
  color: #f0c040;
}
.kgp-stat-label {
  font-size: 10px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.kgp-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 12px;
}
.kgp-card-t {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  margin-bottom: 10px;
}
.kgp-svg {
  width: 100%;
  height: auto;
  display: block;
}
.kgp-svg-edge {
  stroke: color-mix(in srgb, #8a9a7a 45%, transparent);
  stroke-width: 1;
}
.kgp-svg-circle {
  fill: color-mix(in srgb, #f0c040 18%, transparent);
  stroke: #f0c040;
  stroke-width: 1.2;
}
.kgp-svg-label {
  fill: var(--text-primary, #e8e0d8);
  font-size: 10px;
  text-anchor: middle;
  dominant-baseline: middle;
}
.kgp-svg-hint {
  margin: 8px 0 0;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.kgp-disc {
  padding: 10px 12px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 60%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 8px;
}
.kgp-disc:last-child {
  margin-bottom: 0;
}
.kgp-disc-badge {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid;
  margin-bottom: 6px;
}
.kgp-disc-cluster {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 10%, transparent);
}
.kgp-disc-bridge {
  color: #8a9a7a;
  border-color: color-mix(in srgb, #8a9a7a 45%, transparent);
  background: color-mix(in srgb, #8a9a7a 10%, transparent);
}
.kgp-disc-isolated {
  color: #c46a5a;
  border-color: color-mix(in srgb, #c46a5a 45%, transparent);
  background: color-mix(in srgb, #c46a5a 10%, transparent);
}
.kgp-disc-hub {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 10%, transparent);
}
.kgp-disc-desc {
  margin: 0 0 4px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #e8e0d8);
}
.kgp-disc-action {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.kgp-hubs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.kgp-hub-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, #f0c040 40%, transparent);
  background: color-mix(in srgb, #f0c040 10%, transparent);
  color: var(--text-primary, #e8e0d8);
  font-size: 12px;
}
.kgp-hub-chip em {
  font-style: normal;
  font-size: 11px;
  color: #f0c040;
}
.kgp-insights {
  margin-top: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.kgp-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #e8e0d8);
}
.kgp-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
