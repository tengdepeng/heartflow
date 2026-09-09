<template>
  <section class="rvp" aria-label="根系可视化">
    <div class="rvp-head">
      <span class="rvp-title">🌳 根系可视化</span>
      <span class="rvp-sub">生命力地图 · 根系图谱 · 标签聚类</span>
    </div>

    <div v-if="roots.length === 0" class="rvp-empty">
      <span>🌱</span>
      <p>还没有根系记录，种下第一株根后这里会展开你的根脉图谱与生命力地图。</p>
    </div>

    <template v-else>
      <!-- 生命力地图 -->
      <div class="rvp-vitality">
        <div class="rvp-vitality-main">
          <div class="rvp-vitality-ring" :style="{ background: vitalityRingStyle }">
            <div class="rvp-vitality-inner">
              <b class="rvp-vitality-num">{{ vitality.avgVitality }}</b>
              <span class="rvp-vitality-label">生命力</span>
            </div>
          </div>
          <div class="rvp-vitality-info">
            <span class="rvp-vitality-rating" :class="'vr-' + vitality.rating">{{ vitalitySummary?.ratingLabel }}</span>
            <span class="rvp-vitality-weak">最弱层：{{ vitalitySummary?.weakestLayer }}</span>
          </div>
        </div>
        <div class="rvp-layer-bars">
          <div v-for="(v, layer) in vitality.layerVitality" :key="layer" class="rvp-layer-bar">
            <span class="rvp-layer-name">{{ LAYER_LABEL[layer] ?? layer }}</span>
            <div class="rvp-layer-track"><i :style="{ width: v + '%' }" :class="'lb-' + layer"></i></div>
            <span class="rvp-layer-val">{{ v }}</span>
          </div>
        </div>
      </div>

      <!-- 根系图谱 -->
      <div class="rvp-block">
        <div class="rvp-block-head">
          <span class="rvp-block-label">根脉图谱 · {{ tree.totalNodes }} 节点 / {{ tree.totalEdges }} 连接</span>
          <span class="rvp-block-note">节点大小随强度，连线为根系关联</span>
        </div>
        <div class="rvp-tree">
          <svg :viewBox="`0 0 ${tree.width} ${tree.height}`" class="rvp-tree-svg">
            <line
              v-for="e in tree.edges"
              :key="e.id"
              :x1="nodeX(e.sourceId)" :y1="nodeY(e.sourceId)"
              :x2="nodeX(e.targetId)" :y2="nodeY(e.targetId)"
              :stroke="e.color" :stroke-width="e.width"
              :stroke-dasharray="e.dashed ? '4 3' : undefined"
              :opacity="0.4 + e.strength * 0.6"
            />
            <g
              v-for="n in tree.nodes"
              :key="n.id"
              :transform="`translate(${n.x}, ${n.y})`"
              class="rvp-tree-node"
              :class="{ 'rvp-tree-node--selected': selectedId === n.id }"
              @click="selectedId = n.id"
            >
              <circle
                :r="n.radius"
                :fill="n.color"
                :fill-opacity="0.22"
                :stroke="n.color"
                :stroke-width="selectedId === n.id ? 2 : 1"
              />
              <text text-anchor="middle" :dy="3" :fill="n.color" class="rvp-tree-text">{{ n.label }}</text>
            </g>
          </svg>
        </div>
        <div class="rvp-legend">
          <span v-for="l in layerLegend" :key="l.key" class="rvp-legend-item">
            <i :style="{ background: l.color }"></i>{{ l.label }}
          </span>
        </div>
      </div>

      <!-- 根系聚类 -->
      <div class="rvp-block" v-if="clusters.length > 0">
        <span class="rvp-block-label">根系聚类 · {{ clusters.length }} 组</span>
        <div class="rvp-clusters">
          <div v-for="c in clusters" :key="c.id" class="rvp-cluster" :style="{ borderColor: c.color + '55' }">
            <div class="rvp-cluster-head">
              <span class="rvp-cluster-name" :style="{ color: c.color }">{{ c.name }}</span>
              <span class="rvp-cluster-size">{{ c.size }} 株</span>
            </div>
            <div class="rvp-cluster-strength"><i :style="{ width: c.avgStrength * 100 + '%', background: c.color }"></i></div>
            <div class="rvp-cluster-themes">
              <span v-for="t in c.themes.slice(0, 3)" :key="t" class="rvp-cluster-theme">{{ t }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRootGarden } from '../modules/roots/roots-garden'
import { useRootVisualization } from '../modules/roots/root-visualization'
import type { TraceTree } from '../modules/roots/root-tree'
import type { RootLayer } from '../modules/roots/types'

const rootGarden = useRootGarden()
const viz = useRootVisualization()

const selectedId = ref<string | null>(null)

onMounted(() => rootGarden.load())

const roots = computed(() => rootGarden.items.value)
const tree = computed(() => viz.generateVisualTree(roots.value, {} as TraceTree, '根脉之庭', 'vertical'))
const vitality = computed(() => viz.generateVitalityMap(roots.value))
const vitalitySummary = computed(() => viz.vitalitySummary.value)
const clusters = computed(() => viz.clusterRoots(roots.value))

const LAYER_LABEL: Record<RootLayer, string> = {
  soil: '根系', era: '树干', branch: '枝桠',
}
const LAYER_COLOR: Record<RootLayer, string> = {
  soil: '#8a9a7a', era: '#6b9fc4', branch: '#cf8b6b',
}

const vitalityRingStyle = computed(
  () => `conic-gradient(#8a9a7a ${vitality.value.avgVitality * 3.6}deg, rgba(138,154,122,0.15) 0deg)`,
)

const layerLegend = computed(() =>
  (['soil', 'era', 'branch'] as RootLayer[]).map(key => ({ key, label: LAYER_LABEL[key], color: LAYER_COLOR[key] })),
)

function nodeX(id: string): number {
  const n = tree.value.nodes.find(x => x.id === id)
  return n ? n.x : 0
}
function nodeY(id: string): number {
  const n = tree.value.nodes.find(x => x.id === id)
  return n ? n.y : 0
}
</script>

<style scoped>
.rvp {
  padding: 16px; border-radius: 14px;
  background: var(--card-bg); border: 1px solid rgba(138, 154, 122, 0.18);
  display: flex; flex-direction: column; gap: 16px;
}
.rvp-head { display: flex; flex-direction: column; gap: 2px; }
.rvp-title { font-size: 14px; font-weight: 600; color: #8a9a7a; letter-spacing: 1px; }
.rvp-sub { font-size: 11px; color: rgba(138, 154, 122, 0.5); }
.rvp-empty { text-align: center; padding: 36px 16px; color: rgba(138, 154, 122, 0.35); }
.rvp-empty span { font-size: 30px; display: block; margin-bottom: 8px; }
.rvp-empty p { font-size: 12px; }

/* 生命力 */
.rvp-vitality { display: flex; align-items: center; gap: 18px; padding: 14px; border-radius: 12px; background: rgba(138,154,122,0.05); border: 1px solid rgba(138,154,122,0.1); flex-wrap: wrap; }
.rvp-vitality-main { display: flex; align-items: center; gap: 14px; }
.rvp-vitality-ring { width: 84px; height: 84px; border-radius: 50%; flex: 0 0 84px; display: flex; align-items: center; justify-content: center; }
.rvp-vitality-inner { width: 64px; height: 64px; border-radius: 50%; background: var(--card-bg); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.rvp-vitality-num { font-size: 22px; color: #8a9a7a; font-weight: 700; }
.rvp-vitality-label { font-size: 8px; color: rgba(138,154,122,0.5); }
.rvp-vitality-info { display: flex; flex-direction: column; gap: 4px; }
.rvp-vitality-rating { font-size: 13px; font-weight: 600; padding: 3px 10px; border-radius: 8px; width: fit-content; }
.rvp-vitality-rating.vr-excellent { background: rgba(138,154,122,0.2); color: #8a9a7a; }
.rvp-vitality-rating.vr-good { background: rgba(107,159,196,0.2); color: #6b9fc4; }
.rvp-vitality-rating.vr-fair { background: rgba(232,182,76,0.2); color: #e8b64c; }
.rvp-vitality-rating.vr-poor, .rvp-vitality-rating.vr-critical { background: rgba(196,106,90,0.2); color: #c46a5a; }
.rvp-vitality-weak { font-size: 10px; color: rgba(138,154,122,0.6); }
.rvp-layer-bars { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 160px; }
.rvp-layer-bar { display: grid; grid-template-columns: 36px 1fr 22px; align-items: center; gap: 8px; }
.rvp-layer-name { font-size: 10px; color: rgba(200,220,210,0.7); }
.rvp-layer-track { height: 6px; border-radius: 3px; background: rgba(138,154,122,0.12); overflow: hidden; }
.rvp-layer-track i { display: block; height: 100%; transition: width 0.4s; }
.rvp-layer-track .lb-soil { background: #8a9a7a; }
.rvp-layer-track .lb-era { background: #6b9fc4; }
.rvp-layer-track .lb-branch { background: #cf8b6b; }
.rvp-layer-val { font-size: 10px; color: rgba(138,154,122,0.6); text-align: right; }

/* 区块 */
.rvp-block { display: flex; flex-direction: column; gap: 10px; }
.rvp-block-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.rvp-block-label { font-size: 12px; font-weight: 600; color: rgba(138,154,122,0.75); letter-spacing: 1px; }
.rvp-block-note { font-size: 9px; color: rgba(138,154,122,0.45); }

/* 图谱 */
.rvp-tree { display: flex; justify-content: center; }
.rvp-tree-svg { width: 100%; max-width: 520px; max-height: 460px; }
.rvp-tree-node { cursor: pointer; }
.rvp-tree-node--selected circle { stroke-width: 2.5; }
.rvp-tree-text { font-size: 9px; }
.rvp-legend { display: flex; gap: 14px; flex-wrap: wrap; }
.rvp-legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: rgba(138,154,122,0.7); }
.rvp-legend-item i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }

/* 聚类 */
.rvp-clusters { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
.rvp-cluster { padding: 10px 12px; border-radius: 10px; background: rgba(138,154,122,0.04); border: 1px solid; display: flex; flex-direction: column; gap: 6px; }
.rvp-cluster-head { display: flex; justify-content: space-between; align-items: center; }
.rvp-cluster-name { font-size: 12px; font-weight: 600; }
.rvp-cluster-size { font-size: 9px; color: rgba(138,154,122,0.5); }
.rvp-cluster-strength { height: 4px; border-radius: 2px; background: rgba(138,154,122,0.1); overflow: hidden; }
.rvp-cluster-strength i { display: block; height: 100%; }
.rvp-cluster-themes { display: flex; flex-wrap: wrap; gap: 4px; }
.rvp-cluster-theme { font-size: 9px; padding: 2px 6px; border-radius: 6px; background: rgba(138,154,122,0.1); color: rgba(138,154,122,0.75); }
</style>