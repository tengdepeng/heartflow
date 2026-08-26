<template>
  <section class="ob-panel" aria-label="观星指数">
    <div class="ob-panel-head">
      <span class="ob-panel-title">🔭 观星指数</span>
      <span class="ob-panel-sub">月相 · 时段 · 光害 · 云况</span>
    </div>

    <!-- 今日评分 -->
    <div class="ob-block">
      <span class="ob-block-label">今日观星指数</span>
      <div v-if="score" class="ob-score-row">
        <div class="ob-score-ring">
          <svg viewBox="0 0 36 36" class="ob-score-svg">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" />
            <circle cx="18" cy="18" r="15.5" fill="none" :stroke="ratingColor(score.rating)" stroke-width="3" stroke-linecap="round" :stroke-dasharray="`${score.total * 1.02} 102`" transform="rotate(-90 18 18)" />
          </svg>
          <div class="ob-score-val">{{ score.total }}</div>
        </div>
        <div class="ob-score-info">
          <span class="ob-rating" :style="{ color: ratingColor(score.rating) }">{{ ratingLabel(score.rating) }}</span>
          <span class="ob-tip">{{ score.tip }}</span>
          <button class="ob-btn" @click="scoreToday">重新评分</button>
        </div>
      </div>
      <div v-else class="ob-empty">正在计算今日观星指数…</div>
      <div v-if="score" class="ob-factors">
        <div v-for="f in factorRows" :key="f.label" class="ob-factor">
          <span class="ob-factor-label">{{ f.label }}</span>
          <div class="ob-factor-bar-wrap"><div class="ob-factor-bar" :style="{ width: f.value + '%', background: f.color }"></div></div>
          <span class="ob-factor-val">{{ f.value }}</span>
        </div>
      </div>
    </div>

    <!-- 配置 -->
    <div class="ob-block">
      <span class="ob-block-label">观测偏好</span>
      <label class="ob-slider-row">
        <span>光害等级 <em>{{ config.lightPollution }}</em></span>
        <input type="range" min="0" max="10" :value="config.lightPollution" @input="setLight(Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="ob-toggle-row">
        <span>天象事件加成</span>
        <input type="checkbox" :checked="config.boostOnEvents" @change="patch({ boostOnEvents: ($event.target as HTMLInputElement).checked })" />
      </label>
    </div>

    <!-- 历史趋势 -->
    <div class="ob-block">
      <span class="ob-block-label">近 7 日趋势 · 均 {{ average }}</span>
      <div v-if="trend.length" class="ob-trend">
        <div v-for="d in trend" :key="d.date" class="ob-trend-col" :title="`${d.date} · ${d.score}`">
          <div class="ob-trend-bar" :style="{ height: d.score + '%', background: ratingColor(ratingFor(d.score)) }"></div>
          <span class="ob-trend-day">{{ d.date.slice(5) }}</span>
        </div>
      </div>
      <p v-else class="ob-empty">暂无历史记录，点击「重新评分」生成今日指数。</p>
      <button v-if="trend.length" class="ob-btn ob-btn-danger" @click="clear">清空历史</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useObserving, OBSERVING_META } from '../modules/observing'
import type { ObservingRating, ObservingScore } from '../modules/observing'

const observing = useObserving()
const config = computed(() => observing.config.value)
const score = ref<ObservingScore | null>(null)
const average = computed(() => observing.average.value)
const trend = computed(() => observing.recentTrend(7))

const FACTOR_META: { key: keyof ObservingScore['factors']; label: string; color: string }[] = [
  { key: 'time', label: '时段', color: '#6b9fc4' },
  { key: 'moon', label: '月相', color: '#a07c8c' },
  { key: 'light', label: '光害', color: '#f0c040' },
  { key: 'cloud', label: '云况', color: '#8a9a7a' },
  { key: 'eventBonus', label: '天象', color: '#e0a96d' },
]

const factorRows = computed(() =>
  score.value ? FACTOR_META.map((f) => ({ label: f.label, value: score.value!.factors[f.key], color: f.color })) : [],
)

function scoreToday() {
  score.value = observing.scoreToday({ hasAstroEvent: config.value.boostOnEvents })
}
function setLight(v: number) {
  observing.setLightPollution(v)
}
function patch(p: Partial<typeof config.value>) {
  observing.patch(p)
}
function clear() {
  observing.clearHistory()
}
function ratingColor(r: ObservingRating): string {
  return OBSERVING_META[r].color
}
function ratingLabel(r: ObservingRating): string {
  return OBSERVING_META[r].label
}
function ratingFor(s: number): ObservingRating {
  return observing.ratingForScore(s)
}
onMounted(scoreToday)
</script>

<style scoped>
.ob-panel {
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
.ob-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ob-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ob-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.ob-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ob-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.ob-score-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ob-score-ring {
  width: 84px;
  height: 84px;
  position: relative;
  flex-shrink: 0;
}
.ob-score-svg {
  width: 100%;
  height: 100%;
}
.ob-score-val {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.ob-score-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ob-rating {
  font-size: 14px;
  font-weight: 600;
}
.ob-tip {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-low);
}
.ob-btn {
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.ob-btn-danger {
  align-self: flex-start;
  color: #c46a5a;
  border-color: rgba(196, 106, 90, 0.3);
}
.ob-factors {
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.ob-factor {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ob-factor-label {
  width: 36px;
  font-size: 10px;
  color: var(--text-low);
  flex-shrink: 0;
}
.ob-factor-bar-wrap {
  flex: 1;
  height: 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.ob-factor-bar {
  height: 100%;
  border-radius: 4px;
}
.ob-factor-val {
  width: 28px;
  font-size: 9px;
  color: var(--text-medium);
  text-align: right;
}
.ob-slider-row,
.ob-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 12px;
  color: rgba(240, 242, 255, 0.8);
}
.ob-slider-row em {
  font-style: normal;
  color: #f0c040;
}
.ob-slider-row input[type='range'] {
  flex: 1;
  max-width: 200px;
  accent-color: #6b9fc4;
}
.ob-toggle-row input[type='checkbox'] {
  accent-color: #8a9a7a;
}
.ob-trend {
  display: flex;
  align-items: flex-end;
  gap: 6px;
  height: 72px;
  padding: 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.ob-trend-col {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 3px;
}
.ob-trend-bar {
  width: 100%;
  border-radius: 3px 3px 0 0;
  opacity: 0.8;
}
.ob-trend-day {
  font-size: 8px;
  color: var(--text-low);
}
.ob-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}
</style>
