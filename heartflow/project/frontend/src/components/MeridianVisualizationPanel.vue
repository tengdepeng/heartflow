<template>
  <section class="mvp" aria-label="经络可视化">
    <div class="mvp-head">
      <span class="mvp-title">🧭 经络可视化</span>
      <span class="mvp-sub">子午流注 · 热力 · 五行 · 趋势</span>
    </div>

    <!-- 标签页 -->
    <div class="mvp-tabs">
      <button v-for="t in tabs" :key="t.key" class="mvp-tab" :class="{ on: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <!-- 概览 -->
    <div v-if="tab === 'overview'" class="mvp-block">
      <span class="mvp-block-label">经络健康概览</span>
      <div class="mvp-stats">
        <div class="mvp-stat">
          <span class="mvp-stat-value">{{ summary.totalRecords }}</span>
          <span class="mvp-stat-label">记录</span>
        </div>
        <div class="mvp-stat">
          <span class="mvp-stat-value">{{ summary.overallGoodRate }}%</span>
          <span class="mvp-stat-label">良好率</span>
        </div>
        <div class="mvp-stat">
          <span class="mvp-stat-value">{{ summary.coveredMeridians }}/{{ summary.totalMeridians }}</span>
          <span class="mvp-stat-label">覆盖经络</span>
        </div>
        <div class="mvp-stat">
          <span class="mvp-stat-value">{{ trendText(summary.recentTrend) }}</span>
          <span class="mvp-stat-label">近期趋势</span>
        </div>
      </div>
      <div v-if="summary.bestMeridian || summary.worstMeridian" class="mvp-best-worst">
        <span v-if="summary.bestMeridian" class="mvp-bw-chip good">
          最佳 {{ organOf(summary.bestMeridian.meridian) }} {{ summary.bestMeridian.rate }}%
        </span>
        <span v-if="summary.worstMeridian" class="mvp-bw-chip bad">
          关注 {{ organOf(summary.worstMeridian.meridian) }} {{ summary.worstMeridian.rate }}%
        </span>
      </div>
      <p v-if="summary.totalRecords === 0" class="mvp-empty">还没有经络记录，在身体层记录感受后这里会生成可视化。</p>

      <span class="mvp-block-label mvp-block-label--gap">时辰养生提醒</span>
      <div class="mvp-hour-advice">
        <div class="mvp-hour-item">
          <span class="mvp-hour-tag">上一个</span>
          <span class="mvp-hour-organ">{{ hourAdvice.previous.organ }}</span>
          <span class="mvp-hour-time">{{ hourAdvice.previous.timeRange }}</span>
        </div>
        <div class="mvp-hour-item current">
          <span class="mvp-hour-tag">当前</span>
          <span class="mvp-hour-organ">{{ hourAdvice.current.organ }}</span>
          <span class="mvp-hour-time">{{ hourAdvice.current.timeRange }}</span>
          <span class="mvp-hour-advice">{{ hourAdvice.current.advice }}</span>
        </div>
        <div class="mvp-hour-item">
          <span class="mvp-hour-tag">下一个</span>
          <span class="mvp-hour-organ">{{ hourAdvice.next.organ }}</span>
          <span class="mvp-hour-time">{{ hourAdvice.next.timeRange }}</span>
        </div>
      </div>
    </div>

    <!-- 时钟 -->
    <div v-if="tab === 'clock'" class="mvp-block">
      <span class="mvp-block-label">子午流注时钟 · 12 时辰</span>
      <div class="mvp-clock">
        <div v-for="n in clockNodes" :key="n.meridian" class="mvp-clock-node" :class="{ current: n.isCurrent }">
          <span class="mvp-clock-time">{{ n.startTime }}-{{ n.endTime }}</span>
          <span class="mvp-clock-organ">{{ n.organ }}</span>
          <span class="mvp-clock-meridian">{{ meridianName(n.meridian) }}</span>
          <div class="mvp-clock-bar"><span class="mvp-clock-fill" :style="{ width: n.healthRate + '%' }"></span></div>
          <span class="mvp-clock-rate">{{ n.healthRate }}% · {{ n.recordCount }} 条</span>
        </div>
      </div>
      <p v-if="clockNodes.length === 0" class="mvp-empty">暂无经络数据。</p>
    </div>

    <!-- 热力 -->
    <div v-if="tab === 'heatmap'" class="mvp-block">
      <span class="mvp-block-label">经络热力图 · 近 7 天</span>
      <div class="mvp-heatmap">
        <div v-for="h in heatmap" :key="h.meridian" class="mvp-heat-row">
          <span class="mvp-heat-organ">{{ h.organ }}</span>
          <div class="mvp-heat-cells">
            <span
              v-for="(d, i) in h.dailyFeelings"
              :key="i"
              class="mvp-heat-cell"
              :class="`lv-${Math.round(d.score / 25)}`"
              :title="`${d.date} ${feelingText(d.feeling)}`"
            ></span>
          </div>
          <span class="mvp-heat-score">{{ h.averageScore }}</span>
          <span class="mvp-heat-trend" :class="h.trend">{{ trendArrow(h.trend) }}</span>
        </div>
      </div>
      <p v-if="heatmap.every(h => h.averageScore === 0)" class="mvp-empty">近 7 天暂无经络感受记录。</p>
    </div>

    <!-- 五行 -->
    <div v-if="tab === 'element'" class="mvp-block">
      <span class="mvp-block-label">五脏五行生克</span>
      <div class="mvp-elements">
        <div v-for="p in elementPositions" :key="p.element" class="mvp-element" :style="{ borderColor: p.color }">
          <span class="mvp-element-name">{{ p.element }}</span>
        </div>
      </div>
      <div class="mvp-relations">
        <span v-for="r in elementRelations" :key="r.label" class="mvp-relation" :class="r.type">{{ r.label }}</span>
      </div>
    </div>

    <!-- 趋势 -->
    <div v-if="tab === 'trend'" class="mvp-block">
      <span class="mvp-block-label">经络趋势 · 近 30 天</span>
      <div class="mvp-trend-select">
        <button class="mvp-trend-chip" :class="{ on: selectedMeridian === null }" @click="selectedMeridian = null">全部</button>
        <button
          v-for="mh in MERIDIAN_HOURS"
          :key="mh.meridian"
          class="mvp-trend-chip"
          :class="{ on: selectedMeridian === mh.meridian }"
          @click="selectedMeridian = mh.meridian"
        >{{ mh.organ }}</button>
      </div>
      <div class="mvp-trend">
        <div v-for="p in trend" :key="p.date" class="mvp-trend-point">
          <span class="mvp-trend-date">{{ p.date }}</span>
          <div class="mvp-trend-bar"><span class="mvp-trend-fill" :style="{ width: p.goodRate + '%' }"></span></div>
          <span class="mvp-trend-rate">{{ p.goodRate }}%</span>
        </div>
      </div>
      <p v-if="trend.every(p => p.recordCount === 0)" class="mvp-empty">该经络近 30 天暂无记录。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMeridianVisualization, MERIDIAN_HOURS } from '../modules/body-wisdom'
import type { MeridianRecord, MeridianType } from '../modules/body-wisdom'

const props = defineProps<{ records: MeridianRecord[] }>()

const {
  computeClockNodes,
  computeHeatmapData,
  computeElementRelations,
  getElementPositions,
  computeTrendData,
  computeHealthSummary,
  getCurrentHourAdvice,
} = useMeridianVisualization()

const tabs = [
  { key: 'overview', label: '概览' },
  { key: 'clock', label: '时钟' },
  { key: 'heatmap', label: '热力' },
  { key: 'element', label: '五行' },
  { key: 'trend', label: '趋势' },
] as const

const tab = ref<(typeof tabs)[number]['key']>('overview')
const selectedMeridian = ref<MeridianType | null>(null)

const summary = computed(() => computeHealthSummary(props.records))
const clockNodes = computed(() => computeClockNodes(props.records))
const heatmap = computed(() => computeHeatmapData(props.records))
const elementRelations = computed(() => computeElementRelations(props.records))
const elementPositions = computed(() => getElementPositions())
const hourAdvice = computed(() => getCurrentHourAdvice())
const trend = computed(() => computeTrendData(props.records, selectedMeridian.value ?? undefined))

const MERIDIAN_NAME: Record<string, string> = {
  lung: '手太阴肺经',
  'large-intestine': '手阳明大肠经',
  stomach: '足阳明胃经',
  spleen: '足太阴脾经',
  heart: '手少阴心经',
  'small-intestine': '手太阳小肠经',
  bladder: '足太阳膀胱经',
  kidney: '足少阴肾经',
  pericardium: '手厥阴心包经',
  'triple-burner': '手少阳三焦经',
  gallbladder: '足少阳胆经',
  liver: '足厥阴肝经',
}

function meridianName(m: string): string {
  return MERIDIAN_NAME[m] ?? m
}

function organOf(m: string): string {
  return MERIDIAN_HOURS.find(h => h.meridian === m)?.organ ?? m
}

function feelingText(f: string | null): string {
  if (f === 'good') return '好'
  if (f === 'ok') return '一般'
  if (f === 'bad') return '不适'
  return '未记录'
}

function trendText(t: string): string {
  if (t === 'up') return '↑ 上升'
  if (t === 'down') return '↓ 下降'
  return '→ 平稳'
}

function trendArrow(t: string): string {
  if (t === 'improving') return '↑'
  if (t === 'declining') return '↓'
  return '→'
}
</script>

<style scoped>
.mvp {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border, rgba(120, 140, 120, 0.25));
  border-radius: 12px;
  background: var(--surface, rgba(20, 26, 20, 0.6));
}
.mvp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mvp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.mvp-sub {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
}
.mvp-tabs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mvp-tab {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: var(--text-dim, #9aa59a);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.mvp-tab:hover {
  color: var(--text, #e8ece4);
  border-color: rgba(138, 154, 122, 0.3);
}
.mvp-tab.on {
  background: rgba(138, 154, 122, 0.15);
  border-color: rgba(138, 154, 122, 0.35);
  color: #8a9a7a;
}
.mvp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.mvp-block-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent, #8a9a7a);
}
.mvp-block-label--gap {
  margin-top: 6px;
}
.mvp-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.mvp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.mvp-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text, #e8ece4);
  font-variant-numeric: tabular-nums;
}
.mvp-stat-label {
  font-size: 11px;
  color: var(--text-dim, #9aa59a);
}
.mvp-best-worst {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mvp-bw-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.mvp-bw-chip.good {
  background: rgba(138, 154, 122, 0.2);
  color: #8a9a7a;
}
.mvp-bw-chip.bad {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}
.mvp-hour-advice {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.mvp-hour-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.02);
}
.mvp-hour-item.current {
  background: rgba(138, 154, 122, 0.1);
  border: 1px solid rgba(138, 154, 122, 0.25);
}
.mvp-hour-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-dim, #9aa59a);
  white-space: nowrap;
}
.mvp-hour-item.current .mvp-hour-tag {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}
.mvp-hour-organ {
  font-weight: 600;
  color: var(--text, #e8ece4);
  min-width: 24px;
}
.mvp-hour-time {
  color: var(--text-dim, #9aa59a);
  font-variant-numeric: tabular-nums;
}
.mvp-hour-advice {
  color: var(--text-dim, #9aa59a);
  flex: 1;
  text-align: right;
}
.mvp-clock {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mvp-clock-node {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 6px;
}
.mvp-clock-node.current {
  background: rgba(138, 154, 122, 0.1);
}
.mvp-clock-time {
  color: var(--text-dim, #9aa59a);
  min-width: 96px;
  font-variant-numeric: tabular-nums;
}
.mvp-clock-organ {
  font-weight: 600;
  color: var(--text, #e8ece4);
  min-width: 24px;
}
.mvp-clock-meridian {
  color: var(--text-dim, #9aa59a);
  min-width: 96px;
}
.mvp-clock-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.mvp-clock-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent, #8a9a7a);
}
.mvp-clock-rate {
  color: var(--text-dim, #9aa59a);
  min-width: 56px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mvp-heatmap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.mvp-heat-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.mvp-heat-organ {
  color: var(--text, #e8ece4);
  min-width: 24px;
  font-weight: 600;
}
.mvp-heat-cells {
  display: flex;
  gap: 3px;
  flex: 1;
}
.mvp-heat-cell {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.04);
}
.mvp-heat-cell.lv-0 {
  background: rgba(255, 255, 255, 0.04);
}
.mvp-heat-cell.lv-1 {
  background: rgba(196, 106, 90, 0.35);
}
.mvp-heat-cell.lv-2 {
  background: rgba(196, 106, 90, 0.65);
}
.mvp-heat-cell.lv-3 {
  background: rgba(138, 154, 122, 0.7);
}
.mvp-heat-cell.lv-4 {
  background: #8a9a7a;
}
.mvp-heat-score {
  color: var(--text-dim, #9aa59a);
  min-width: 24px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mvp-heat-trend {
  min-width: 16px;
  text-align: center;
}
.mvp-heat-trend.improving {
  color: #8a9a7a;
}
.mvp-heat-trend.declining {
  color: #c46a5a;
}
.mvp-heat-trend.stable {
  color: #a07c8c;
}
.mvp-elements {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  padding: 12px 0;
}
.mvp-element {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.03);
}
.mvp-element-name {
  font-size: 16px;
  font-weight: 600;
  color: var(--text, #e8ece4);
}
.mvp-relations {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.mvp-relation {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.mvp-relation.generating {
  background: rgba(138, 154, 122, 0.2);
  color: #8a9a7a;
}
.mvp-relation.controlling {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}
.mvp-trend-select {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mvp-trend-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: transparent;
  color: var(--text-dim, #9aa59a);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;

  min-height: 26px;
}
.mvp-trend-chip:hover {
  color: var(--text, #e8ece4);
}
.mvp-trend-chip.on {
  background: rgba(138, 154, 122, 0.15);
  border-color: rgba(138, 154, 122, 0.35);
  color: #8a9a7a;
}
.mvp-trend {
  display: flex;
  flex-direction: column;
  gap: 3px;
  max-height: 220px;
  overflow-y: auto;
}
.mvp-trend-point {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.mvp-trend-date {
  color: var(--text-dim, #9aa59a);
  min-width: 44px;
  font-variant-numeric: tabular-nums;
}
.mvp-trend-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.mvp-trend-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent, #8a9a7a);
}
.mvp-trend-rate {
  color: var(--accent, #8a9a7a);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.mvp-empty {
  font-size: 12px;
  color: var(--text-dim, #9aa59a);
  margin: 0;
}
</style>
