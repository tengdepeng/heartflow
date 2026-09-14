<template>
  <section class="jy-panel">
    <h4 class="jy-title">🧭 旅程回望 · 足迹连成的路</h4>

    <div class="jy-stats" v-if="journeys.length">
      <span>旅程 <b>{{ stats.total }}</b></span>
      <span>覆盖 <b>{{ stats.totalDays }}</b> 天</span>
      <span>均长 <b>{{ stats.avgDays }}</b> 天</span>
      <span>最长 <b>{{ stats.longestDays }}</b> 天</span>
    </div>

    <label class="jy-config">
      <span>旅程分界间隔（天）</span>
      <input v-model.number="gapInput" type="range" min="1" max="120" @input="applyGap" />
      <b>{{ config.maxGapDays }}</b>
    </label>

    <ul v-if="journeys.length" class="jy-list">
      <li v-for="j in journeys" :key="j.id" class="jy-item">
        <div class="jy-head">
          <span class="jy-range">{{ j.startDate }} → {{ j.endDate }}</span>
          <span class="jy-span">全程 {{ j.spanDays }} 天 · {{ j.stops }} 站</span>
        </div>
        <div class="jy-regions">
          <span v-for="r in j.regions" :key="r" class="jy-region">{{ r }}</span>
        </div>
        <div class="jy-score">
          <span class="jy-score-label">旅程跨度</span>
          <div class="jy-score-track"><span class="jy-score-fill" :style="{ width: spanScore(j) + '%' }"></span></div>
          <span class="jy-score-val">{{ spanScore(j) }}</span>
        </div>
      </li>
    </ul>
    <p v-else class="jy-empty">尚未累积足迹，书写第一段旅程吧。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useJourneyEngine, journeySpanScore, type Journey } from '../modules/journey'
import { useFootprint } from '../modules/footprint'

const { records } = useFootprint()
const { config, setMaxGapDays, journeysFrom } = useJourneyEngine()

const gapInput = ref(config.value.maxGapDays)
const journeys = computed(() => journeysFrom(records.value))
const stats = computed(() => journeys.value.length
  ? {
      total: journeys.value.length,
      totalDays: journeys.value.reduce((s, j) => s + j.spanDays, 0),
      avgDays: Math.round(journeys.value.reduce((s, j) => s + j.spanDays, 0) / journeys.value.length),
      longestDays: Math.max(...journeys.value.map((j) => j.spanDays)),
    }
  : { total: 0, totalDays: 0, avgDays: 0, longestDays: 0 })

function spanScore(j: Journey): number {
  return journeySpanScore(j)
}
function applyGap(): void {
  setMaxGapDays(gapInput.value)
}
</script>

<style scoped>
.jy-panel { border: 1px solid rgba(148, 163, 184, 0.15); border-radius: 14px; padding: 16px; background: rgba(255, 255, 255, 0.02); }
.jy-title { margin: 0 0 12px; font-size: 1rem; color: var(--color-text, #e2e8f0); }
.jy-stats { font-size: 0.85rem; color: var(--color-sub, #94a3b8); display: flex; flex-wrap: wrap; gap: 14px; margin-bottom: 10px; }
.jy-stats b { color: var(--color-text, #e2e8f0); }
.jy-config { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: var(--color-sub, #94a3b8); margin-bottom: 12px; }
.jy-config input { flex: 1; }
.jy-config b { color: var(--color-text, #e2e8f0); }
.jy-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.jy-item { padding: 11px 12px; border-radius: 10px; border: 1px solid rgba(148, 163, 184, 0.15); }
.jy-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
.jy-range { color: var(--color-text, #e2e8f0); font-weight: 600; }
.jy-span { color: var(--color-sub, #94a3b8); font-size: 0.8rem; }
.jy-regions { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
.jy-region { font-size: 0.75rem; background: rgba(107, 159, 196, 0.12); color: #6b9fc4; padding: 2px 8px; border-radius: 999px; }
.jy-score { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--color-sub, #94a3b8); }
.jy-score-track { flex: 1; height: 5px; border-radius: 3px; background: rgba(148, 163, 184, 0.2); overflow: hidden; }
.jy-score-fill { display: block; height: 100%; background: linear-gradient(90deg, #6b9fc4, #22c55e); border-radius: 3px; }
.jy-score-val { color: var(--color-text, #e2e8f0); font-weight: 600; }
.jy-empty { color: var(--color-sub, #94a3b8); font-size: 0.85rem; }
input[type='range'] { accent-color: #6b9fc4; }
</style>