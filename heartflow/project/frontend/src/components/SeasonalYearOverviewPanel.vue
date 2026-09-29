<template>
  <section class="syo-archive" aria-label="年度俯瞰">
    <!-- 空态（无仪式） -->
    <template v-if="!hasData">
      <div class="syo-head">
        <span class="syo-title">🗓️ 年度俯瞰</span>
        <span class="syo-badge syo-badge-neutral">岁时未启</span>
      </div>
      <p class="syo-empty">
        岁时阁还没有仪式。记下第一件想反复做的小仪式，它会落进年度俯瞰的某一格——四季轮转，仪式是锚点。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="syo-head">
        <span class="syo-title">🗓️ 年度俯瞰</span>
        <span class="syo-badge syo-badge-gold">{{ selectedYear }} 年</span>
      </div>

      <!-- 年度切换 -->
      <div v-if="years.length > 1" class="syo-years">
        <button
          v-for="y in years"
          :key="y"
          class="syo-year-chip"
          :class="{ active: y === selectedYear }"
          @click="selectedYear = y"
        >{{ y }}</button>
      </div>

      <!-- 年度概览 -->
      <div class="syo-overview">
        <div class="syo-ov-cell"><span>四季仪式</span><b>{{ overview.stats.totalRituals }}</b></div>
        <div class="syo-ov-cell"><span>最活跃月</span><b>{{ peakLabel }}</b></div>
        <div class="syo-ov-cell"><span>覆盖月数</span><b>{{ overview.stats.activeMonths }}/12</b></div>
        <div class="syo-ov-cell"><span>生命仪礼</span><b>{{ overview.stats.lifeRitualCount }}</b></div>
        <div class="syo-ov-cell"><span>私人仪式</span><b>{{ overview.stats.privateRitualCount }}</b></div>
      </div>

      <!-- 月度分布热力图 -->
      <div class="syo-card">
        <span class="syo-card-t">月度分布 · 仪式密度</span>
        <div class="syo-heatmap">
          <div v-for="m in overview.months" :key="m.month" class="syo-heat-cell" :title="`${m.label} · ${m.ritualCount} 次`">
            <div class="syo-heat-bar" :style="{ height: heatHeight(m), background: heatColor(m) }"></div>
            <span class="syo-heat-label">{{ m.month }}</span>
          </div>
        </div>
      </div>

      <!-- 年度对比 -->
      <div v-if="comparison && comparison.years.length >= 2" class="syo-card">
        <span class="syo-card-t">年度对比 · 四季仪式完成</span>
        <div class="syo-compare">
          <div v-for="(y, i) in comparison.years" :key="y" class="syo-cmp-row">
            <span class="syo-cmp-year">{{ y }}</span>
            <div class="syo-cmp-track">
              <div class="syo-cmp-fill" :style="{ width: cmpWidth(comparison.rituals[i], comparison.rituals) }"></div>
            </div>
            <span class="syo-cmp-count">{{ comparison.rituals[i] }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="syo-insights">
        <li v-for="ins in insights" :key="ins" class="syo-insight">
          <span class="syo-insight-mark">✦</span>
          <span class="syo-insight-text">{{ ins }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  buildYearOverview,
  getAvailableYears,
  buildYearComparison,
  yearOverviewInsights,
} from '../modules/seasonal'
import type { SeasonalRitual, Ritual, LifeRitual } from '../modules/seasonal'

const props = defineProps<{
  rituals: SeasonalRitual[]
  lifeRituals: LifeRitual[]
  privateRituals: Ritual[]
}>()

const hasData = computed(() =>
  props.rituals.length > 0 || props.lifeRituals.length > 0 || props.privateRituals.length > 0,
)

const years = computed(() => getAvailableYears(props.rituals, props.lifeRituals, props.privateRituals))

const selectedYear = ref(new Date().getFullYear())

const overview = computed(() =>
  buildYearOverview(selectedYear.value, props.rituals, props.lifeRituals, props.privateRituals),
)

const comparison = computed(() =>
  years.value.length >= 2
    ? buildYearComparison(years.value, props.rituals, props.lifeRituals, props.privateRituals)
    : undefined,
)

const insights = computed(() => yearOverviewInsights(overview.value, comparison.value))

const peakLabel = computed(() => {
  const s = overview.value.stats
  if (s.totalRituals === 0) return '—'
  const peak = overview.value.months[s.peakMonth - 1]
  return peak ? peak.label : `${s.peakMonth}月`
})

function heatHeight(m: { ritualCount: number; density: number }): string {
  const max = Math.max(...overview.value.months.map(x => x.ritualCount), 1)
  const pct = Math.max(8, Math.round((m.ritualCount / max) * 100))
  return `${pct}%`
}

function heatColor(m: { ritualCount: number; density: number }): string {
  if (m.ritualCount === 0) return 'rgba(240, 192, 64, 0.08)'
  const alpha = 0.22 + m.density * 0.6
  return `rgba(240, 192, 64, ${Math.min(0.92, alpha)})`
}

function cmpWidth(value: number, all: number[]): string {
  const max = Math.max(...all, 1)
  return `${Math.max(4, Math.round((value / max) * 100))}%`
}
</script>

<style scoped>
.syo-archive {
  display: block;
  width: 100%;
  max-width: 900px;
}
.syo-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.syo-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.02em;
}
.syo-badge {
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  border: 1px solid;
}
.syo-badge-gold {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.syo-badge-neutral {
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  border-color: var(--border-light, #3a332a);
  background: transparent;
}
.syo-empty {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.syo-years {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.syo-year-chip {
  padding: 3px 12px;
  border-radius: 999px;
  border: 1px solid var(--border-light, #3a332a);
  background: transparent;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.syo-year-chip.active {
  color: #f0c040;
  border-color: color-mix(in srgb, #f0c040 45%, transparent);
  background: color-mix(in srgb, #f0c040 12%, transparent);
}
.syo-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}
.syo-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 50%, transparent);
  border: 1px solid var(--border-light, #3a332a);
}
.syo-ov-cell span {
  font-size: 10px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.syo-ov-cell b {
  font-size: 15px;
  font-weight: 600;
  color: #f0c040;
}
.syo-card {
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 45%, transparent);
  border: 1px solid var(--border-light, #3a332a);
  margin-bottom: 12px;
}
.syo-card-t {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8);
  margin-bottom: 10px;
}
.syo-heatmap {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 4px;
  align-items: end;
  height: 92px;
}
.syo-heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  height: 100%;
}
.syo-heat-bar {
  width: 100%;
  max-width: 18px;
  border-radius: 4px 4px 2px 2px;
  min-height: 3px;
  transition: height 0.3s;
}
.syo-heat-label {
  font-size: 9px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
}
.syo-compare {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.syo-cmp-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.syo-cmp-year {
  width: 40px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 224, 216, 0.55));
  flex-shrink: 0;
}
.syo-cmp-track {
  flex: 1;
  height: 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 70%, transparent);
  overflow: hidden;
}
.syo-cmp-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8a9a7a, #f0c040);
  transition: width 0.3s;
}
.syo-cmp-count {
  width: 28px;
  font-size: 11px;
  color: #f0c040;
  text-align: right;
  flex-shrink: 0;
}
.syo-insights {
  margin-top: 2px;
  padding: 12px 14px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-card, #241f18) 40%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
  list-style: none;
}
.syo-insight {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-primary, #e8e0d8);
}
.syo-insight-mark {
  color: #f0c040;
  flex-shrink: 0;
}
</style>
