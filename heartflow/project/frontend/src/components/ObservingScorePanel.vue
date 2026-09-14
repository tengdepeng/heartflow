<template>
  <section class="obs-panel">
    <h4 class="obs-title">🌌 今夜观星指数</h4>
    <p class="obs-hint">天文通式综合评分 · 月相 / 时段 / 光害 / 云况 本地计算</p>

    <div class="obs-main">
      <!-- 评分环 -->
      <div class="obs-gauge" :style="{ '--color-accent': meta?.color }">
        <ProgressRing :value="current.total" :size="118" :stroke="9" label="观星指数">
          <div class="gauge-center">
            <span class="gauge-num" :style="{ color: meta?.color }">{{ current.total }}</span>
            <span class="gauge-rate">{{ meta?.label }}</span>
          </div>
        </ProgressRing>
      </div>

      <!-- 分解 -->
      <div class="obs-factors">
        <div class="obs-factor" v-for="f in factorRows" :key="f.key">
          <div class="obs-factor-top">
            <span>{{ f.label }}</span>
            <span class="obs-factor-val" :style="{ color: f.color }">{{ f.score }}</span>
          </div>
          <div class="obs-bar"><span class="obs-bar-fill" :style="{ width: f.score + '%', background: f.color }"></span></div>
        </div>
      </div>
    </div>

    <p class="obs-tip">💡 {{ current.tip }}</p>

    <!-- 环境调节 -->
    <div class="obs-env">
      <label class="obs-env-label">光害等级 <span>{{ lightPollution }}</span></label>
      <input class="obs-range" type="range" min="0" max="10" step="1" :value="lightPollution"
        @input="onLight($event)" />
      <label class="obs-cloud"><input type="checkbox" v-model="showHistory" /> 7 日趋势</label>
    </div>

    <!-- 7 日趋势迷你图 -->
    <div class="obs-history" v-if="showHistory && trend.length">
      <div class="obs-hist-bar" v-for="d in trend" :key="d.date" :title="`${d.date}: ${d.score}`">
        <span class="obs-hist-fill" :style="{ height: d.score + '%', background: colorFor(d.score) }"></span>
        <span class="obs-hist-day">{{ shortDay(d.date) }}</span>
      </div>
    </div>
    <p v-else-if="showHistory" class="obs-empty">暂无历史，先记录今晚。</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import ProgressRing from './ProgressRing.vue'
import {
  useObserving,
  computeObservingScore,
  OBSERVING_META,
  ratingForScore,
} from '../modules/observing'

const { config, recentTrend, setLightPollution, scoreToday } = useObserving()

const showHistory = ref(true)
const current = ref(newScore())

function newScore() {
  return computeObservingScore({
    hour: new Date().getHours(),
    illumination: 0.2,
    lightPollution: config.value.lightPollution,
    cloud: 0,
  })
}

const meta = computed(() => OBSERVING_META[current.value.rating])
const trend = computed(() => recentTrend(7))
const lightPollution = computed(() => config.value.lightPollution)

const factorRows = computed(() => {
  const f = current.value.factors
  return [
    { key: 'time', label: '时段', score: f.time, color: '#6b9fc4' },
    { key: 'moon', label: '月相', score: f.moon, color: '#b5707a' },
    { key: 'light', label: '光害', score: f.light, color: '#f0c040' },
    { key: 'cloud', label: '云况', score: f.cloud, color: '#5ab8a0' },
  ]
})

function onLight(e: Event) {
  setLightPollution(Number((e.target as HTMLInputElement).value))
  current.value = newScore()
}

function colorFor(v: number): string {
  return OBSERVING_META[ratingForScore(v)].color
}

function shortDay(date: string): string {
  return date.slice(5).replace('-', '/')
}

onMounted(() => {
  current.value = scoreToday()
})
</script>

<style scoped>
.obs-panel {
  margin-top: 18px; padding-top: 14px; border-top: 1px dashed rgba(255, 255, 255, 0.12);
}
.obs-title { margin: 0; }
.obs-hint { margin: 4px 0 14px; font-size: 12px; opacity: 0.62; }
.obs-main { display: flex; gap: 22px; flex-wrap: wrap; align-items: center; }
.obs-gauge { display: flex; align-items: center; }
.gauge-center { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.gauge-num { font-size: 26px; font-weight: 800; line-height: 1; }
.gauge-rate { font-size: 11px; opacity: 0.75; }
.obs-factors { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 9px; }
.obs-factor-top { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 3px; }
.obs-factor-val { font-weight: 700; }
.obs-bar { height: 6px; border-radius: 999px; background: rgba(255, 255, 255, 0.08); overflow: hidden; }
.obs-bar-fill { display: block; height: 100%; border-radius: 999px; }
.obs-tip { margin: 14px 0 6px; font-size: 13px; opacity: 0.85; }
.obs-env { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12px; }
.obs-env-label span { color: #f0c040; font-weight: 700; }
.obs-range { width: 140px; accent-color: #6b9fc4; }
.obs-cloud { display: inline-flex; align-items: center; gap: 5px; opacity: 0.8; }
.obs-history { display: flex; align-items: flex-end; gap: 8px; height: 70px; margin-top: 14px; }
.obs-hist-bar { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; height: 100%; }
.obs-hist-fill { width: 60%; min-height: 3px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
.obs-hist-day { font-size: 10px; opacity: 0.55; }
.obs-empty { font-size: 12px; opacity: 0.5; margin-top: 10px; }
</style>