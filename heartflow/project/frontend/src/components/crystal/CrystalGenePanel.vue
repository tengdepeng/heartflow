<template>
  <section class="cry-panel" aria-label="基因谱系">
    <div class="cry-panel-head">
      <span class="cry-panel-title">🧬 基因谱系</span>
      <span class="cry-panel-sub">时间种子 · 遗传变异</span>
    </div>

    <!-- 基因概览 -->
    <div class="cry-block">
      <span class="cry-block-label">基因概览</span>
      <div class="cry-stats">
        <div class="cry-stat"><span class="cry-stat-num">{{ withGene.length }}</span><span class="cry-stat-label">带基因</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ maxGeneration }}</span><span class="cry-stat-label">最高代际</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ avgDominance }}</span><span class="cry-stat-label">均显性</span></div>
        <div class="cry-stat"><span class="cry-stat-num">{{ avgMutation }}</span><span class="cry-stat-label">均突变率</span></div>
      </div>
      <p v-if="withGene.length === 0" class="cry-empty">尚无带基因的结晶。完成专注后，时间种子将凝结为结晶的基因。</p>
    </div>

    <!-- 基因列表 -->
    <div v-if="withGene.length" class="cry-block">
      <span class="cry-block-label">基因序列 · 最近 {{ withGene.length }} 颗</span>
      <div v-for="c in withGene" :key="c.id" class="cry-gene">
        <div class="cry-gene-head">
          <span class="cry-gene-name" :style="{ color: c.geneSeed.genes.color }">{{ shapeLabel(c.shape) }}</span>
          <span class="cry-chip">第 {{ c.geneSeed.generation }} 代</span>
          <span class="cry-chip">显性 {{ Math.round(c.geneSeed.dominance * 100) }}%</span>
          <span class="cry-chip">突变 {{ Math.round(c.geneSeed.mutationRate * 100) }}%</span>
        </div>
        <div class="cry-gene-traits">
          <div v-for="t in geneTraits(c)" :key="t.label" class="cry-trait">
            <span class="cry-trait-label">{{ t.label }}</span>
            <div class="cry-trait-bar-wrap">
              <div class="cry-trait-bar" :style="{ width: t.pct + '%', background: t.color }"></div>
            </div>
            <span class="cry-trait-val">{{ t.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storage } from '../../engine/storage'
import type { TimeCrystal, CrystalShape } from '../../types'
import type { TimeCrystalWithGene } from '../../modules/crystal'

const crystals = ref<TimeCrystal[]>([])

const SHAPE_LABELS: Record<CrystalShape, string> = {
  sphere: '完美之晶',
  dodecahedron: '精雕',
  octahedron: '成色',
  tetrahedron: '初凝',
  irregular: '残晶',
}

const withGene = computed(() =>
  crystals.value.filter((c): c is TimeCrystalWithGene => 'geneSeed' in c && !!c.geneSeed),
)

const maxGeneration = computed(() =>
  withGene.value.reduce((m, c) => Math.max(m, c.geneSeed.generation), 0),
)

const avgDominance = computed(() => {
  if (!withGene.value.length) return 0
  return Math.round(withGene.value.reduce((s, c) => s + c.geneSeed.dominance, 0) / withGene.value.length * 100)
})

const avgMutation = computed(() => {
  if (!withGene.value.length) return 0
  return Math.round(withGene.value.reduce((s, c) => s + c.geneSeed.mutationRate, 0) / withGene.value.length * 100)
})

function shapeLabel(shape: CrystalShape): string {
  return SHAPE_LABELS[shape] ?? shape
}

function geneTraits(c: TimeCrystalWithGene) {
  const g = c.geneSeed.genes
  return [
    { label: '强度', pct: Math.round(g.intensity * 100), text: `${Math.round(g.intensity * 100)}%`, color: '#e0a96d' },
    { label: '发光', pct: Math.round(g.luminescence * 100), text: `${Math.round(g.luminescence * 100)}%`, color: '#f0c040' },
    { label: '复杂度', pct: Math.round(g.complexity * 100), text: `${Math.round(g.complexity * 100)}%`, color: '#6b9fc4' },
    { label: '韧性', pct: Math.round(g.resilience * 100), text: `${Math.round(g.resilience * 100)}%`, color: '#8a9a7a' },
  ]
}

onMounted(() => {
  crystals.value = [...storage.getCrystals()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
})
</script>

<style scoped>
.cry-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.cry-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.cry-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.cry-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.cry-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cry-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}

.cry-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cry-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}

.cry-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}

.cry-stat-label {
  font-size: 10px;
  color: var(--text-low);
}

.cry-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}

.cry-gene {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.cry-gene-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.cry-gene-name {
  font-size: 12px;
  font-weight: 600;
}

.cry-chip {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-medium);
}

.cry-gene-traits {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.cry-trait {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cry-trait-label {
  width: 44px;
  font-size: 10px;
  color: var(--text-low);
  flex-shrink: 0;
}

.cry-trait-bar-wrap {
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}

.cry-trait-bar {
  height: 100%;
  border-radius: 4px;
}

.cry-trait-val {
  width: 36px;
  font-size: 9px;
  color: var(--text-medium);
  text-align: right;
}
</style>
