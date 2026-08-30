<script setup lang="ts">
import { computed } from 'vue'
import {
  seasonalOverview,
  seasonRows,
  seasonHealth,
  seasonalInsights,
} from '../modules/seasonal'
import type { SeasonalRitual } from '../modules/seasonal'

const props = defineProps<{ rituals: SeasonalRitual[] }>()

const ov = computed(() => seasonalOverview(props.rituals))
const rows = computed(() => seasonRows(props.rituals))
const health = computed(() => seasonHealth(props.rituals))
const insights = computed(() => seasonalInsights(props.rituals))

const empty = computed(() => props.rituals.length === 0)

const sortedRows = computed(() => [...rows.value].sort((a, b) => b.doneRate - a.doneRate))

function formatDate(iso: string | null): string {
  if (!iso) return '从未'
  const d = new Date(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}
</script>

<template>
  <section class="sap-panel" data-enter aria-label="岁时档案">
    <header class="sap-head">
      <span class="sap-title">🍂 岁时档案</span>
      <span class="sap-sub">档案概览 · 季节分布 · 岁时健康 · 温和洞察</span>
    </header>

    <div v-if="empty" class="sap-empty">
      <span class="sap-empty-icon">🌱</span>
      <p v-if="insights.length">{{ insights[0] }}</p>
      <p v-else>岁时阁还没有仪式。从顺应当下的季节，记下一个想反复做的小仪式开始。</p>
    </div>

    <template v-else>
      <!-- 档案概览 -->
      <div class="sap-card">
        <span class="sap-card-t">档案概览</span>
        <div class="sap-ov-grid">
          <div class="sap-ov-cell"><span>总仪式</span><b>{{ ov.total }}</b></div>
          <div class="sap-ov-cell"><span>已拾起</span><b>{{ ov.awakened }}</b></div>
          <div class="sap-ov-cell"><span>今年完成</span><b>{{ ov.doneThisYear }}</b></div>
          <div class="sap-ov-cell"><span>平均熟练</span><b>{{ ov.avgCount }}</b></div>
          <div class="sap-ov-cell"><span>连续天</span><b>{{ ov.streak }}</b></div>
          <div class="sap-ov-cell"><span>覆盖季节</span><b>{{ ov.coveredSeasons }}/4</b></div>
        </div>
        <p class="sap-ov-last">最近一次踏时：{{ formatDate(ov.lastActive) }}</p>
      </div>

      <!-- 季节分布 -->
      <div class="sap-card">
        <span class="sap-card-t">季节分布 · 完成进度</span>
        <div class="sap-season-list">
          <div v-for="row in sortedRows" :key="row.season" class="sap-season-row">
            <span class="sap-season-label">{{ row.icon }} {{ row.label }}</span>
            <div class="sap-season-track">
              <div class="sap-season-fill" :class="row.season" :style="{ width: row.doneRate + '%' }"></div>
            </div>
            <span class="sap-season-meta">
              {{ row.completedCount }}/{{ row.ritualCount }} · {{ row.doneRate }}%
            </span>
          </div>
        </div>
      </div>

      <!-- 岁时健康 -->
      <div class="sap-card">
        <span class="sap-card-t">岁时健康</span>
        <div class="sap-health-main">
          <strong class="sap-health-score">{{ health.score }}</strong>
          <span class="sap-health-label" :class="{ good: health.score >= 70 }">{{ health.label }}</span>
        </div>
        <div class="sap-health-bars">
          <div class="sap-hbar"><span>广度</span><div class="sap-hbar-track"><div class="sap-hbar-fill" :style="{ width: health.breadth + '%' }"></div></div><b>{{ health.breadth }}</b></div>
          <div class="sap-hbar"><span>深度</span><div class="sap-hbar-track"><div class="sap-hbar-fill" :style="{ width: health.depth + '%' }"></div></div><b>{{ health.depth }}</b></div>
          <div class="sap-hbar"><span>节律</span><div class="sap-hbar-track"><div class="sap-hbar-fill" :style="{ width: health.cadence + '%' }"></div></div><b>{{ health.cadence }}</b></div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="sap-card">
        <span class="sap-card-t">温和洞察</span>
        <ul class="sap-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.sap-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.sap-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.sap-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--accent);
}
.sap-sub {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
}
.sap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: rgba(232, 221, 208, 0.3);
}
.sap-empty-icon {
  font-size: 26px;
  opacity: 0.5;
}
.sap-empty p {
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
  margin: 0;
  max-width: 320px;
}
.sap-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.sap-card-t {
  font-size: 12px;
  font-weight: 500;
  color: rgba(var(--accent-rgb), 0.6);
  letter-spacing: 1px;
}
.sap-ov-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.sap-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
}
.sap-ov-cell span {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.45);
}
.sap-ov-cell b {
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.1;
}
.sap-ov-last {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  margin: 0;
}
.sap-season-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.sap-season-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sap-season-label {
  width: 46px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(232, 221, 208, 0.6);
}
.sap-season-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.sap-season-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
}
.sap-season-fill.spring { background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.6), rgba(var(--accent-rgb), 0.35)); }
.sap-season-fill.summer { background: linear-gradient(90deg, rgba(255, 107, 107, 0.6), rgba(255, 107, 107, 0.35)); }
.sap-season-fill.autumn { background: linear-gradient(90deg, rgba(251, 146, 60, 0.6), rgba(251, 146, 60, 0.35)); }
.sap-season-fill.winter { background: linear-gradient(90deg, rgba(124, 184, 255, 0.6), rgba(124, 184, 255, 0.35)); }
.sap-season-meta {
  width: 74px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.4);
}
.sap-health-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sap-health-score {
  font-size: 34px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.sap-health-label {
  font-size: 13px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.7);
}
.sap-health-label.good {
  background: rgba(124, 184, 255, 0.12);
  color: #8fbeff;
}
.sap-health-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sap-hbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sap-hbar span {
  width: 32px;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.sap-hbar-track {
  flex: 1;
  height: 7px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.sap-hbar-fill {
  height: 100%;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.5);
}
.sap-hbar b {
  width: 26px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(232, 221, 208, 0.5);
}
.sap-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sap-insights li {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(232, 221, 208, 0.55);
}
</style>