<!-- ============================================================
  SeedLineageGraphPanel · 种子遗传图谱（INCR-409）
  薄委托直引 modules/play/play-bridge（数据取 allSeeds）
  + modules/play/seed-share（buildSeedGraph/computeGraphSummary 纯函数）
  呈现逸趣阁收藏种子之间的「标签相似血脉网络」与图谱摘要
  ============================================================ -->
<template>
  <section class="slg" data-testid="slg-panel">
    <header class="slg-header">
      <h3 class="slg-title">
        <svg class="slg-title-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="5" r="2.4" />
          <circle cx="4.5" cy="18" r="2.4" />
          <circle cx="19.5" cy="18" r="2.4" />
          <path d="M11 7.2 5.4 16M13 7.2 18.6 16M6.9 18h10.2" />
        </svg>
        遗传种子图谱
      </h3>
      <p class="slg-sub">{{ seedCount }} 枚收藏种子 · 共享标签自动连成血脉网络</p>
    </header>

    <!-- 图摘要指标 -->
    <div class="slg-metrics">
      <div class="slg-metric">
        <b class="slg-metric-num" data-testid="slg-node-count">{{ summary.nodeCount }}</b>
        <span class="slg-metric-label">种子数</span>
      </div>
      <div class="slg-metric">
        <b class="slg-metric-num" data-testid="slg-edge-count">{{ summary.edgeCount }}</b>
        <span class="slg-metric-label">连接边</span>
      </div>
      <div class="slg-metric">
        <b class="slg-metric-num" data-testid="slg-max-degree">{{ summary.maxDegree }}</b>
        <span class="slg-metric-label">最密集连接</span>
      </div>
      <div class="slg-metric">
        <b class="slg-metric-num" data-testid="slg-avg-degree">{{ summary.avgDegree }}</b>
        <span class="slg-metric-label">平均连接</span>
      </div>
    </div>

    <!-- 稀有度分布 -->
    <div v-if="hasSeeds" class="slg-rarity">
      <div
        v-for="r in summary.rarityDistribution"
        :key="r.rarity"
        class="slg-rarity-row"
      >
        <span class="slg-rarity-dot" :style="{ background: RARITY_COLORS[r.rarity] }"></span>
        <span class="slg-rarity-label">{{ r.label }}</span>
        <div class="slg-rarity-bar"><span
          class="slg-rarity-fill"
          :style="{ width: rarityPct(r.count), background: RARITY_COLORS[r.rarity] }"
        ></span></div>
        <span class="slg-rarity-num">{{ r.count }}</span>
      </div>
    </div>

    <!-- 图谱网络节点 -->
    <div v-if="hasSeeds" class="slg-nodes">
      <div class="slg-block-title">血脉网络</div>
      <p v-if="!selectedSeed" class="slg-hint">点击种子节点，查看它与哪些种子共享血脉（标签）。</p>
      <div class="slg-node-grid">
        <button
          v-for="n in graph.nodes"
          :key="n.id"
          type="button"
          class="slg-node"
          :class="{ 'slg-node--selected': selectedId === n.id, 'slg-node--root': n.isRoot }"
          :style="{ '--node-color': n.color }"
          :data-testid="'slg-node-' + n.id"
          @click="toggleSelect(n.id)"
          :title="n.name + ' · ' + n.degree + ' 条连接'"
        >
          <span class="slg-node-dot" :style="{ background: n.color }"></span>
          <span class="slg-node-name">{{ n.name }}</span>
          <span class="slg-node-degree">×{{ n.degree }}</span>
        </button>
      </div>
    </div>

    <!-- 选中种子 → 其血脉连接 -->
    <div v-if="selectedSeed" class="slg-edges" data-testid="slg-selected-edges">
      <div class="slg-block-title">「{{ selectedSeed.name }}」的血脉</div>
      <p class="slg-edge-summary">与 {{ friendsOf(selectedSeed.id).length }} 枚种子共享标签</p>
      <div v-if="friendsOf(selectedSeed.id).length" class="slg-edge-list">
        <div v-for="f in friendsOf(selectedSeed.id)" :key="f.id" class="slg-edge-row">
          <span class="slg-node-dot" :style="{ background: f.color }"></span>
          <span class="slg-edge-friend">{{ f.name }}</span>
          <span class="slg-edge-tags">共享：{{ sharedTags(selectedSeed.id, f.id).join(' · ') }}</span>
        </div>
      </div>
      <p v-else class="slg-edge-empty">这枚种子尚未与其它种子共享标签——孤独却独特。</p>
    </div>

    <!-- 最连接种子 Top -->
    <div v-if="summary.mostConnected.length" class="slg-top">
      <div class="slg-block-title">最连接种子</div>
      <div class="slg-top-list">
        <div v-for="(m, i) in summary.mostConnected" :key="m.id" class="slg-top-row">
          <span class="slg-top-rank">{{ i + 1 }}</span>
          <span class="slg-top-name">{{ m.name }}</span>
          <span class="slg-top-degree">{{ m.degree }} 条连接</span>
        </div>
      </div>
    </div>

    <div v-if="!hasSeeds" class="slg-empty">
      还没有收藏种子。先记录游戏、玩具、模型或藏品，它们会自动生成种子并在此连成血脉图谱。
    </div>

    <footer class="slg-footnote">根种子以稀有度为标识；图谱按共享标签自动连接，遗传记录随分享与接收逐步累积。</footer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlayBridge } from '../modules/play/play-bridge'
import { buildSeedGraph, computeGraphSummary, SEED_RARITY_COLORS } from '../modules/play/seed-share'
import type { TimeSeed } from '../modules/play/time-seed'

const RARITY_COLORS = SEED_RARITY_COLORS

const bridge = usePlayBridge()
const allSeeds = computed<TimeSeed[]>(() => bridge.allSeeds.value)
const graph = computed(() => buildSeedGraph(allSeeds.value))
const summary = computed(() => computeGraphSummary(graph.value))

const seedCount = computed(() => allSeeds.value.length)
const hasSeeds = computed(() => graph.value.nodes.length > 0)

const selectedId = ref<string | null>(null)
const selectedSeed = computed(() => graph.value.nodes.find(n => n.id === selectedId.value) ?? null)

function friendsOf(id: string) {
  const g = graph.value
  const friends: typeof g.nodes[number][] = []
  for (const e of g.edges) {
    if (e.source === id) {
      const t = g.nodes.find(n => n.id === e.target)
      if (t) friends.push(t)
    } else if (e.target === id) {
      const s = g.nodes.find(n => n.id === e.source)
      if (s) friends.push(s)
    }
  }
  return friends
}

function sharedTags(aId: string, bId: string): string[] {
  const a = allSeeds.value.find(s => s.id === aId)
  const b = allSeeds.value.find(s => s.id === bId)
  if (!a || !b) return []
  return a.tags.filter(t => b.tags.includes(t))
}

function rarityPct(count: number): string {
  if (!summary.value.nodeCount) return '0%'
  return Math.round((count / summary.value.nodeCount) * 100) + '%'
}

function toggleSelect(id: string) {
  selectedId.value = selectedId.value === id ? null : id
}
</script>

<style scoped>
.slg {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}
.slg-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.slg-title { display: flex; align-items: center; gap: 7px; font-size: 15px; font-weight: 600; color: rgba(var(--text-primary-rgb), 0.9); margin: 0; }
.slg-title-icon { color: var(--accent); opacity: 0.7; }
.slg-sub { font-size: 11px; color: var(--text-secondary); margin: 0; }
.slg-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.slg-metric { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.1); }
.slg-metric-num { font-size: 20px; font-weight: 700; color: var(--accent); line-height: 1.1; }
.slg-metric-label { font-size: 10px; color: var(--text-secondary); }

.slg-block-title { font-size: 12px; font-weight: 500; color: var(--text-secondary); letter-spacing: 1px; margin: 12px 0 8px; }
.slg-rarity { display: grid; gap: 5px; margin-bottom: 4px; }
.slg-rarity-row { display: flex; align-items: center; gap: 8px; }
.slg-rarity-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.slg-rarity-label { font-size: 11px; color: var(--text-secondary); width: 42px; flex-shrink: 0; }
.slg-rarity-bar { flex: 1; height: 6px; border-radius: 3px; background: var(--bg-card); overflow: hidden; }
.slg-rarity-fill { display: block; height: 100%; border-radius: 3px; transition: width 0.4s; }
.slg-rarity-num { font-size: 11px; font-weight: 600; color: var(--text-bright); min-width: 18px; text-align: right; }

.slg-nodes { margin-top: 4px; }
.slg-hint { font-size: 11px; color: var(--text-low); margin: 0 0 8px; }
.slg-node-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 6px; }
.slg-node { display: flex; align-items: center; gap: 6px; padding: 7px 9px; border-radius: 8px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.1); cursor: pointer; font-family: inherit; text-align: left; transition: all 0.15s; }
.slg-node:hover { border-color: rgba(var(--accent-rgb), 0.3); }
.slg-node--selected { border-color: var(--node-color, var(--accent)); background: color-mix(in srgb, var(--node-color, var(--accent)) 12%, transparent); }
.slg-node--root { box-shadow: inset 0 0 0 1px var(--node-color); }
.slg-node-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.slg-node-name { flex: 1; font-size: 12px; color: var(--text-high); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slg-node-degree { font-size: 10px; color: var(--text-secondary); flex-shrink: 0; }

.slg-edges { margin-top: 6px; }
.slg-edge-summary { font-size: 11px; color: var(--text-secondary); margin: 0 0 6px; }
.slg-edge-list { display: grid; gap: 5px; }
.slg-edge-row { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 8px; background: var(--bg-card); }
.slg-edge-friend { font-size: 12px; font-weight: 500; color: var(--text-high); flex-shrink: 0; }
.slg-edge-tags { font-size: 11px; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slg-edge-empty { font-size: 11px; color: var(--text-low); margin: 0; }

.slg-top { margin-top: 4px; }
.slg-top-list { display: grid; gap: 5px; }
.slg-top-row { display: flex; align-items: center; gap: 8px; padding: 7px 9px; border-radius: 8px; background: var(--bg-card); }
.slg-top-rank { width: 16px; height: 16px; border-radius: 50%; background: rgba(var(--accent-rgb), 0.14); color: var(--accent); font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.slg-top-name { flex: 1; font-size: 12px; color: var(--text-high); }
.slg-top-degree { font-size: 11px; color: var(--text-secondary); flex-shrink: 0; }

.slg-empty { text-align: center; padding: 18px 0; font-size: 12px; color: var(--text-secondary); }
.slg-footnote { margin-top: 12px; font-size: 10px; color: var(--text-dim); }
</style>