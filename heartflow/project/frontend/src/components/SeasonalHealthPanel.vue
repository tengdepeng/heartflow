<template>
  <section class="shp">
    <div class="shp-head">
      <div class="shp-title-wrap">
        <span class="shp-title">🏮 岁时气象</span>
        <span class="shp-sub">把节气的流转看成一座院子的时序：哪些时节被拾起，哪些还候着时令</span>
      </div>
      <span class="shp-tag">{{ health.label }}</span>
    </div>

    <!-- 岁时圆环 + 三轴 -->
    <div class="shp-main">
      <div class="shp-ring" :style="{ background: ringStyle }">
        <span class="shp-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="shp-axes">
        <div class="shp-axis">
          <span class="shp-axis-label">广度 · 覆盖时节</span>
          <div class="shp-bar"><i :style="{ width: health.breadth + '%' }"></i></div>
          <b>{{ health.breadth }}</b>
        </div>
        <div class="shp-axis">
          <span class="shp-axis-label">深度 · 重复拾起</span>
          <div class="shp-bar"><i :style="{ width: health.depth + '%' }"></i></div>
          <b>{{ health.depth }}</b>
        </div>
        <div class="shp-axis">
          <span class="shp-axis-label">节律 · 近日归来</span>
          <div class="shp-bar"><i :style="{ width: health.cadence + '%' }"></i></div>
          <b>{{ health.cadence }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="shp-metrics">
      <div class="shp-metric"><b>{{ ov.total }}</b><span>仪式</span></div>
      <div class="shp-metric"><b>{{ ov.awakened }}</b><span>已拾起</span></div>
      <div class="shp-metric"><b>{{ ov.doneThisYear }}</b><span>今年完成</span></div>
      <div class="shp-metric"><b>{{ ov.coveredSeasons }}</b><span>覆盖季节</span></div>
      <div class="shp-metric"><b>{{ ov.streak }}</b><span>连续天数</span></div>
    </div>

    <!-- 季节分布 -->
    <div class="shp-seasons">
      <div v-for="row in rows" :key="row.season" class="shp-season">
        <span class="shp-season-icon">{{ row.icon }}</span>
        <span class="shp-season-label">{{ row.label }}</span>
        <div class="shp-season-bar">
          <i :style="{ width: row.doneRate + '%' }"></i>
        </div>
        <span class="shp-season-count">{{ row.completedCount }}/{{ row.ritualCount }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="shp-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { SeasonalRitual } from '../modules/seasonal'
import {
  seasonalOverview,
  seasonRows,
  seasonHealth,
  seasonalInsights,
} from '../modules/seasonal/seasonal-analytics'

const props = defineProps<{ rituals: SeasonalRitual[] }>()

const ov = ref(seasonalOverview([], new Date()))
const rows = ref(seasonRows([]))
const health = ref(seasonHealth([], new Date()))
const insights = ref<string[]>([])

function refresh() {
  const now = new Date()
  ov.value = seasonalOverview(props.rituals, now)
  rows.value = seasonRows(props.rituals)
  health.value = seasonHealth(props.rituals, now)
  insights.value = seasonalInsights(props.rituals, now, 4)
}

watch(
  () => props.rituals,
  () => refresh(),
  { deep: true }
)

// 岁时圆环：低→暖褐，高→青金节序
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 168 : s >= 60 ? 150 : s >= 40 ? 38 : 20
  return `conic-gradient(hsl(${hue} 55% 55%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.shp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.shp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.shp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.shp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.shp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.shp-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.shp-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.shp-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.shp-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(18, 14, 11, 0.92); }
.shp-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #ecd6b5; letter-spacing: 0.5px; }
.shp-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.shp-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.shp-axis { display: flex; align-items: center; gap: 10px; }
.shp-axis-label { width: 84px; font-size: 11px; color: rgba(232, 221, 208, 0.55); flex-shrink: 0; }
.shp-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.shp-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(168 55% 55%), hsl(150 50% 60%)); }
.shp-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(232, 221, 208, 0.7); }

.shp-metrics { display: flex; gap: 8px; margin-bottom: 16px; }
.shp-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.shp-metric b { font-size: 16px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.shp-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.shp-seasons { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.shp-season { display: flex; align-items: center; gap: 10px; }
.shp-season-icon { width: 20px; text-align: center; }
.shp-season-label { width: 18px; font-size: 12px; color: rgba(232, 221, 208, 0.65); }
.shp-season-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.shp-season-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(150 50% 55%), hsl(168 55% 60%)); transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.shp-season-count { width: 44px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.shp-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.shp-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 208, 0.6); }
.shp-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>