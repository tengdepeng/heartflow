<template>
  <section class="mtp">
    <div class="mtp-head">
      <span class="mtp-title">🧭 足迹档案</span>
      <span class="mtp-sub">你走过的版图 —— 多远、踏过哪、还想去哪</span>
    </div>

    <!-- 探索势能圆环 + 指标 -->
    <div class="mtp-hero">
      <div class="mtp-ring" :style="ringStyle">
        <div class="mtp-ring-inner">
          <b :style="{ color: m.color }">{{ m.score }}</b>
          <span>{{ m.label }}</span>
        </div>
      </div>
      <div class="mtp-metrics">
        <div class="mtp-metric"><b>{{ ov.uniqueCities }}</b><span>城市</span></div>
        <div class="mtp-metric"><b>{{ ov.totalVisits }}</b><span>到访</span></div>
        <div class="mtp-metric"><b>{{ ov.coveredTypes }}</b><span>地貌</span></div>
        <div class="mtp-metric"><b>{{ ov.returnRate }}<i>%</i></b><span>回访率</span></div>
      </div>
    </div>

    <!-- 地理跨度 -->
    <div class="mtp-span">
      <span class="mtp-span-row">📍 南北纬度跨度 <b>{{ ov.latSpan }}°</b></span>
      <span class="mtp-span-row">📏 东西经度跨度 <b>{{ ov.lngSpan }}°</b></span>
    </div>

    <!-- 地貌分布 -->
    <div v-if="types.length" class="mtp-types">
      <div v-for="t in types" :key="t.type" class="mtp-type">
        <span class="mtp-type-label" :style="{ color: t.color }">{{ t.icon }} {{ t.label }}</span>
        <span class="mtp-type-bar"><i :style="{ width: t.pct + '%', background: t.color }"></i></span>
        <span class="mtp-type-count">{{ t.count }}</span>
      </div>
    </div>

    <!-- 热门城市 -->
    <div v-if="top.length" class="mtp-top">
      <h4>🏙 去得最多</h4>
      <span v-for="c in top" :key="c.name" class="mtp-top-chip">{{ c.name }} ×{{ c.visits }}</span>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="mtp-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Place } from '../modules/map/map'
import {
  travelOverview,
  typeDistribution,
  topTravelCities,
  exploreMomentum,
  travelInsights,
} from '../modules/map/travel-analytics'

const props = defineProps<{ places: Place[] }>()

const ov = ref(travelOverview([]))
const types = ref(typeDistribution([]))
const top = ref(topTravelCities([]))
const m = ref(exploreMomentum([]))
const insights = ref<string[]>([])

function refresh() {
  ov.value = travelOverview(props.places)
  types.value = typeDistribution(props.places)
  top.value = topTravelCities(props.places, 4)
  m.value = exploreMomentum(props.places)
  insights.value = travelInsights(props.places, 4)
}

watch(() => props.places, () => refresh(), { deep: true })

const ringStyle = computed(() => ({
  background: `conic-gradient(${m.value.color} ${m.value.score * 3.6}deg, rgba(var(--accent-rgb), 0.08) 0deg)`,
}))

refresh()
</script>

<style scoped>
.mtp {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.mtp-head { margin-bottom: 14px; }
.mtp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high); display: block; }
.mtp-sub { font-size: 11px; color: var(--text-faint); }

/* ---- 势能圆环 + 指标 ---- */
.mtp-hero { display: flex; align-items: center; gap: 16px; margin-bottom: 12px; }
.mtp-ring { width: 104px; height: 104px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.mtp-ring-inner { width: 78px; height: 78px; border-radius: 50%; background: var(--card-bg); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.mtp-ring-inner b { font-size: 24px; font-weight: 300; line-height: 1; }
.mtp-ring-inner span { font-size: 10px; color: var(--text-faint); }

.mtp-metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; flex: 1; }
.mtp-metric { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.mtp-metric b { font-size: 17px; font-weight: 300; color: rgba(var(--text-primary-rgb), 0.85); }
.mtp-metric b i { font-style: normal; font-size: 10px; opacity: 0.5; }
.mtp-metric span { font-size: 10px; color: var(--text-faint); }

/* ---- 地理跨度 ---- */
.mtp-span { display: flex; gap: 8px; margin-bottom: 12px; }
.mtp-span-row { flex: 1; font-size: 11px; color: var(--text-dim); padding: 8px 10px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.05); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.mtp-span-row b { font-weight: 500; color: rgba(var(--text-primary-rgb), 0.8); margin-left: 4px; }

/* ---- 地貌分布 ---- */
.mtp-types { margin-bottom: 12px; }
.mtp-type { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.mtp-type-label { width: 68px; font-size: 11px; }
.mtp-type-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.07); overflow: hidden; }
.mtp-type-bar i { display: block; height: 100%; border-radius: 4px; }
.mtp-type-count { font-size: 11px; color: var(--text-dim); width: 18px; text-align: right; }

/* ---- 热门城市 ---- */
.mtp-top { margin-bottom: 12px; }
.mtp-top h4 { font-size: 12px; margin: 0 0 6px; color: var(--text-low); font-weight: 500; }
.mtp-top-chip { display: inline-block; font-size: 11px; padding: 3px 9px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.08); border: 1px solid rgba(var(--accent-rgb), 0.12); color: rgba(var(--text-primary-rgb), 0.7); margin: 0 4px 4px 0; }

/* ---- 洞察 ---- */
.mtp-insights { margin: 0; padding-left: 18px; }
.mtp-insights li { font-size: 11px; color: var(--text-dim); line-height: 1.7; margin-bottom: 3px; }

@media (max-width: 480px) {
  .mtp-hero { flex-direction: column; align-items: center; }
  .mtp-metrics { width: 100%; }
  .mtp-span { flex-direction: column; }
}
</style>