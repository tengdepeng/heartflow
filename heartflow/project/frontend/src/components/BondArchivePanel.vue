<template>
  <section class="bap-panel" aria-label="羁绊档案">
    <header class="bap-head">
      <span class="bap-title">🧶 羁绊档案</span>
      <span class="bap-sub">档案概览 · 羁绊健康 · 类型分布 · 互动节律 · 温和洞察</span>
    </header>

    <!-- 档案概览 -->
    <div class="bap-stats">
      <div class="bap-stat"><span>总人数</span><b>{{ ov.total }}</b></div>
      <div class="bap-stat"><span>本月新增</span><b>{{ ov.thisMonthAdded }}</b></div>
      <div class="bap-stat"><span>有互动</span><b>{{ ov.withInteraction }}</b></div>
      <div class="bap-stat"><span>沉伏</span><b>{{ ov.dormantCount }}</b></div>
      <div class="bap-stat"><span>从未互动</span><b>{{ ov.neverInteracted }}</b></div>
      <div class="bap-stat"><span>留座</span><b>{{ ov.memorialCount }}</b></div>
    </div>

    <div v-if="ov.total > 0 && ov.closest" class="bap-closest">
      <span class="bap-closest-label">最亲密</span>
      <span class="bap-closest-name">{{ ov.closest.name }}</span>
      <span class="bap-closest-val">{{ Math.round(ov.closest.closeness * 100) }}%</span>
      <span class="bap-closest-sep">·</span>
      <span class="bap-closest-label">平均亲密度</span>
      <span class="bap-closest-val">{{ Math.round(ov.avgCloseness * 100) }}%</span>
    </div>

    <!-- 羁绊健康 -->
    <div class="bap-health">
      <div class="bap-health-main">
        <div class="bap-health-ring" :style="healthRing">
          <span class="bap-health-score">{{ health.score }}</span>
        </div>
        <span class="bap-health-label">{{ health.label }}</span>
      </div>
      <div class="bap-health-metrics">
        <div class="bap-hm-row">
          <span class="bap-hm-label">广度</span>
          <div class="bap-hm-track"><div class="bap-hm-fill" :style="{ width: health.breadth + '%', background: healthColor }" /></div>
          <span class="bap-hm-val">{{ health.breadth }}</span>
        </div>
        <div class="bap-hm-row">
          <span class="bap-hm-label">频率</span>
          <div class="bap-hm-track"><div class="bap-hm-fill" :style="{ width: health.cadence + '%', background: healthColor }" /></div>
          <span class="bap-hm-val">{{ health.cadence }}</span>
        </div>
        <div class="bap-hm-row">
          <span class="bap-hm-label">维系</span>
          <div class="bap-hm-track"><div class="bap-hm-fill" :style="{ width: health.sustain + '%', background: healthColor }" /></div>
          <span class="bap-hm-val">{{ health.sustain }}</span>
        </div>
      </div>
    </div>

    <!-- 类型分布 -->
    <div v-if="typeRows.length" class="bap-types">
      <span class="bap-types-t">按关系类型分布</span>
      <div v-for="r in typeRows" :key="r.type" class="bap-type-row">
        <span class="bap-type-label">{{ r.label }}</span>
        <div class="bap-type-track"><div class="bap-type-fill" :style="{ width: r.pct + '%', background: r.color }" /></div>
        <span class="bap-type-val">{{ r.count }} 人 · {{ r.pct }}%</span>
      </div>
    </div>

    <!-- 互动节律 -->
    <div class="bap-rhythm">
      <span class="bap-rhythm-t">互动节律</span>
      <div class="bap-rhythm-grid">
        <div class="bap-rt-cell"><span>总互动</span><b>{{ rhythm.totalInteractions }}</b></div>
        <div class="bap-rt-cell"><span>近 7 天</span><b>{{ rhythm.weeklyCount }}</b></div>
        <div class="bap-rt-cell"><span>近 30 天</span><b>{{ rhythm.monthlyCount }}</b></div>
        <div class="bap-rt-cell"><span>有互动天数</span><b>{{ rhythm.activeDays }}</b></div>
        <div class="bap-rt-cell"><span>连续天数</span><b>{{ rhythm.streakDays }}</b></div>
        <div class="bap-rt-cell"><span>日均</span><b>{{ rhythm.avgPerDay }}</b></div>
      </div>
    </div>

    <!-- 温和洞察 -->
    <div v-if="insights.length" class="bap-insights">
      <span class="bap-insights-t">温和洞察</span>
      <ul class="bap-insights-list">
        <li v-for="(t, i) in insights" :key="i">💡 {{ t }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { Person } from '../modules/relation/types'
import { useInteractionJournal } from '../modules/relation/interaction-journal'
import {
  relationOverview,
  relationTypeRows,
  relationRhythm,
  relationHealth,
  relationInsights,
} from '../modules/relation/relation-analytics'

const props = defineProps<{ persons: Person[] }>()

const journal = useInteractionJournal()
onMounted(() => journal.loadInteractions())
const interactions = computed(() => journal.interactions.value)

const ov = computed(() =>
  relationOverview(props.persons, interactions.value),
)
const health = computed(() =>
  relationHealth(props.persons, interactions.value),
)
const rhythm = computed(() =>
  relationRhythm(interactions.value),
)
const typeRows = computed(() =>
  relationTypeRows(props.persons).filter((r) => r.count > 0),
)
const insights = computed(() => relationInsights(props.persons, interactions.value))

const healthColor = computed(() =>
  health.value.score >= 70 ? '#8aca70' : health.value.score >= 45 ? '#e8c060' : health.value.score >= 20 ? '#e0a96d' : '#c46a5a',
)
// 羁绊健康弧线环（并入自 RelationArchivePanel）：score 0~100 映射为弧线
const healthRing = computed(() =>
  `conic-gradient(${healthColor.value} ${health.value.score * 3.6}deg, rgba(255,255,255,0.06) ${health.value.score * 3.6}deg)`,
)
</script>

<style scoped>
.bap-panel { background: #20241f; border: 1px solid #333a33; border-radius: 12px; padding: 14px; margin-bottom: 14px; color: #d9decf; }
.bap-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.bap-title { font-weight: 600; }
.bap-sub { font-size: 12px; color: #8a9a7a; flex: 1; min-width: 160px; }

.bap-stats { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 8px; }
.bap-stat { background: #161a15; border-radius: 10px; padding: 9px; display: flex; flex-direction: column; gap: 3px; }
.bap-stat span { font-size: 11px; color: #8a9a7a; }
.bap-stat b { font-size: 15px; font-variant-numeric: tabular-nums; }

.bap-closest { display: flex; align-items: baseline; gap: 7px; background: #161a15; border-radius: 10px; padding: 9px 11px; margin-bottom: 8px; font-size: 12px; flex-wrap: wrap; }
.bap-closest-label { color: #8a9a7a; }
.bap-closest-name { color: #e8c060; font-weight: 600; }
.bap-closest-val { color: #d9decf; font-variant-numeric: tabular-nums; }
.bap-closest-sep { color: #4a4f44; }

.bap-health { background: #161a15; border-radius: 10px; padding: 11px; margin-bottom: 8px; display: flex; gap: 16px; align-items: center; }
.bap-health-main { display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 64px; }
.bap-health-ring { width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative; }
.bap-health-ring::before { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: #161a15; }
.bap-health-score { position: relative; font-size: 20px; font-weight: 600; color: #e8c060; font-variant-numeric: tabular-nums; line-height: 1; }
.bap-health-label { font-size: 12px; color: #8a9a7a; }
.bap-health-metrics { flex: 1; display: flex; flex-direction: column; gap: 7px; }
.bap-hm-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.bap-hm-label { width: 36px; color: #b7c0a8; }
.bap-hm-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.05); overflow: hidden; }
.bap-hm-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.bap-hm-val { width: 30px; text-align: right; color: #b7c0a8; font-variant-numeric: tabular-nums; }

.bap-types { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 8px; display: flex; flex-direction: column; gap: 7px; }
.bap-types-t, .bap-rhythm-t, .bap-insights-t { font-size: 12px; color: #e8c060; }
.bap-type-row { display: flex; align-items: center; gap: 8px; font-size: 12px; }
.bap-type-label { width: 44px; color: #d9decf; }
.bap-type-track { flex: 1; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.05); overflow: hidden; }
.bap-type-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.bap-type-val { width: 74px; text-align: right; color: #b7c0a8; font-variant-numeric: tabular-nums; white-space: nowrap; }

.bap-rhythm { background: #161a15; border-radius: 10px; padding: 10px; margin-bottom: 8px; }
.bap-rhythm-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-top: 8px; }
.bap-rt-cell { display: flex; flex-direction: column; gap: 3px; }
.bap-rt-cell span { font-size: 11px; color: #8a9a7a; }
.bap-rt-cell b { font-size: 15px; font-variant-numeric: tabular-nums; }

.bap-insights { background: #161a15; border-radius: 10px; padding: 10px; }
.bap-insights-list { margin: 6px 0 0; padding-left: 2px; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.bap-insights-list li { font-size: 12px; color: #b7c0a8; line-height: 1.5; }

@media (max-width: 720px) {
  .bap-stats { grid-template-columns: repeat(3, 1fr); }
  .bap-rhythm-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 520px) {
  .bap-health { flex-direction: column; }
}
</style>