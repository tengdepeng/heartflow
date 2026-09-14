<template>
  <section class="rap">
    <div class="rap-head">
      <div class="rap-title-wrap">
        <span class="rap-title">⚲ 羁绊档案</span>
        <span class="rap-sub">关系的温热，写在每一次记得与朝来的往来里</span>
      </div>
      <span class="rap-tag">{{ health.label }}</span>
    </div>

    <!-- 羁绊圆环 + 三轴 -->
    <div class="rap-main">
      <div class="rap-ring" :style="{ background: ringStyle }">
        <span class="rap-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="rap-axes">
        <div class="rap-axis">
          <span class="rap-axis-label">广度</span>
          <div class="rap-bar"><i :style="{ width: health.breadth + '%' }"></i></div>
          <b>{{ health.breadth }}</b>
        </div>
        <div class="rap-axis">
          <span class="rap-axis-label">频率</span>
          <div class="rap-bar"><i :style="{ width: health.cadence + '%' }"></i></div>
          <b>{{ health.cadence }}</b>
        </div>
        <div class="rap-axis">
          <span class="rap-axis-label">维系</span>
          <div class="rap-bar"><i :style="{ width: health.sustain + '%' }"></i></div>
          <b>{{ health.sustain }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="rap-metrics">
      <div class="rap-metric"><b>{{ ov.total }}</b><span>故人</span></div>
      <div class="rap-metric"><b>{{ ov.withInteraction }}</b><span>有往来</span></div>
      <div class="rap-metric"><b>{{ ov.thisMonthAdded }}</b><span>本月新增</span></div>
      <div class="rap-metric"><b>{{ ov.avgCloseness }}%</b><span>均亲密度</span></div>
      <div class="rap-metric"><b>{{ ov.memorialCount }}</b><span>留座</span></div>
    </div>

    <!-- 类型分布 -->
    <div v-if="ov.total" class="rap-types">
      <div v-for="t in types" :key="t.type" class="rap-type">
        <span class="rap-type-label">{{ t.label }}</span>
        <div class="rap-type-bar">
          <i :style="{ width: t.pct + '%', background: t.color }"></i>
        </div>
        <span class="rap-type-count">{{ t.count }}</span>
        <span class="rap-type-pct">{{ t.pct }}%</span>
      </div>
    </div>

    <!-- 互动节律 -->
    <div v-if="rhythm.totalInteractions" class="rap-rhythm">
      <span>近 7 天 <b>{{ rhythm.weeklyCount }}</b> 次</span>
      <span>· 近 30 天 <b>{{ rhythm.monthlyCount }}</b></span>
      <span v-if="rhythm.streakDays >= 1">· 连续 <b>{{ rhythm.streakDays }}</b> 天</span>
      <span v-if="rhythm.avgPerDay > 0">· 均 <b>{{ rhythm.avgPerDay }}</b> 次/日</span>
      <span v-if="rhythm.activeDays">· 活跃 <b>{{ rhythm.activeDays }}</b> 天</span>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="rap-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Person } from '../modules/relation/types'
import type { InteractionEntry } from '../modules/relation/interaction-journal'
import {
  relationOverview,
  relationTypeRows,
  relationRhythm,
  relationHealth,
  relationInsights,
} from '../modules/relation/relation-analytics'

const props = defineProps<{ persons: Person[]; interactions: InteractionEntry[] }>()

const ov = ref(relationOverview([], [], new Date()))
const types = ref(relationTypeRows([]))
const rhythm = ref(relationRhythm([], new Date()))
const health = ref(relationHealth([], [], new Date()))
const insights = ref<string[]>([])

function refresh() {
  const now = new Date()
  ov.value = relationOverview(props.persons, props.interactions, now)
  types.value = relationTypeRows(props.persons)
  rhythm.value = relationRhythm(props.interactions, now)
  health.value = relationHealth(props.persons, props.interactions, now)
  insights.value = relationInsights(props.persons, props.interactions, now, 4)
}

watch(
  () => [props.persons, props.interactions],
  () => refresh(),
  { deep: true }
)

// 羁绊圆环：低→灯下疏影褐红，高→暮色暖霞洇红
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 8 : s >= 60 ? 22 : s >= 40 ? 32 : 18
  return `conic-gradient(hsl(${hue} 62% 60%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.rap {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.rap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.rap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.rap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d8c3a5); }
.rap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.rap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #e0b88a; white-space: nowrap; }

.rap-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.rap-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.rap-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(18, 14, 11, 0.92); }
.rap-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #ecd6b5; letter-spacing: 0.5px; }
.rap-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.rap-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.rap-axis { display: flex; align-items: center; gap: 10px; }
.rap-axis-label { width: 40px; font-size: 11px; color: rgba(232, 221, 208, 0.55); flex-shrink: 0; }
.rap-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.rap-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(8 62% 60%), hsl(38 60% 62%)); }
.rap-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(232, 221, 208, 0.7); }

.rap-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.rap-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.rap-metric b { font-size: 15px; font-weight: 500; color: var(--text-high, #d8c3a5); }
.rap-metric span { font-size: 10px; color: rgba(232, 221, 208, 0.4); }

.rap-types { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.rap-type { display: flex; align-items: center; gap: 10px; }
.rap-type-label { width: 40px; font-size: 12px; color: rgba(232, 221, 208, 0.65); }
.rap-type-bar { flex: 1; height: 7px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.rap-type-bar i { display: block; height: 100%; border-radius: 999px; transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1); }
.rap-type-count { width: 22px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); }
.rap-type-pct { width: 34px; text-align: right; font-size: 10px; color: rgba(var(--accent-rgb), 0.5); }

.rap-rhythm { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; color: rgba(232, 221, 208, 0.45); margin-bottom: 12px; }
.rap-rhythm b { color: var(--accent); font-weight: 600; }

.rap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.rap-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 208, 0.6); }
.rap-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>