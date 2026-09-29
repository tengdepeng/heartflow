<template>
  <section class="jap">
    <div class="jap-head">
      <div class="jap-title-wrap">
        <span class="jap-title">🧭 旅程档案</span>
        <span class="jap-sub">出发、停留、归来，皆是足迹的叙事</span>
      </div>
      <span v-if="stats.total" class="jap-tag" :style="tagStyle">{{ stats.total }} 段旅程</span>
    </div>

    <!-- 旅程分界间隔调参（并入 JourneyPanel 独有能力 INCR-395） -->
    <label class="jap-config">
      <span class="jap-config-label">旅程分界间隔</span>
      <input v-model.number="gapInput" type="range" min="1" max="120" @input="applyGap" class="jap-config-range" />
      <span class="jap-config-val"><b>{{ gapInput }}</b> 天</span>
    </label>
    <p class="jap-config-hint">相邻两次足迹相隔超过该天数，视为一段新旅程。</p>

    <!-- 空态引导 -->
    <div v-if="!stats.total" class="jap-empty">
      <p class="jap-empty-title">旅程未启</p>
      <p class="jap-empty-desc">
        足迹还空着。记下第一段行程，它会在这里串成一段旅程——出发、停留、归来，皆是足迹的叙事。
      </p>
    </div>

    <template v-else>
      <!-- 旅程概览 -->
      <div class="jap-stats">
        <div class="jap-stat"><b>{{ stats.total }}</b><span>旅程</span></div>
        <div class="jap-stat"><b>{{ stats.totalDays }}</b><span>覆盖天数</span></div>
        <div class="jap-stat"><b>{{ stats.avgDays }}</b><span>平均时长</span></div>
        <div class="jap-stat"><b>{{ stats.longestDays }}</b><span>最长旅程</span></div>
      </div>

      <!-- 旅程清单 -->
      <div class="jap-block">
        <span class="jap-block-title">旅程足迹 · {{ journeys.length }}</span>
        <div v-for="j in journeys" :key="j.id" class="jap-row">
          <div class="jap-row-head">
            <span class="jap-row-regions">{{ j.regions.join('、') }}</span>
            <span class="jap-row-days">{{ j.spanDays }} 天</span>
          </div>
          <div class="jap-row-meta">
            {{ j.startDate }} → {{ j.endDate }} · {{ j.stops }} 站
            <span class="jap-span" :style="{ color: spanColor(j) }">· 跨度 {{ journeySpanScore(j) }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul v-if="insights.length" class="jap-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useJourneyEngine, journeySpanScore, journeyInsights } from '../modules/journey'
import type { Journey } from '../modules/journey'
import type { FootprintRecord } from '../modules/footprint'

const props = defineProps<{ records: FootprintRecord[] }>()

const engine = useJourneyEngine()

const gapInput = ref(engine.config.value.maxGapDays)
function applyGap(): void {
  engine.setMaxGapDays(gapInput.value)
}

const journeys = computed(() => engine.journeysFrom(props.records))
const stats = computed(() => engine.computeJourneyStats(journeys.value))
const insights = computed(() => journeyInsights(journeys.value))

const tagStyle = computed(() => ({
  background: 'rgba(240, 192, 64, 0.12)',
  color: '#f0c040',
}))

function spanColor(j: Journey): string {
  const s = journeySpanScore(j)
  if (s >= 70) return '#f0c040'
  if (s >= 40) return '#8a9a7a'
  return '#c46a5a'
}
</script>

<style scoped>
.jap {
  margin: 8px auto 0;
  max-width: 560px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.jap-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.jap-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.jap-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.jap-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.jap-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; white-space: nowrap; }

.jap-config { display: flex; align-items: center; gap: 10px; font-size: 11px; color: rgba(232, 221, 200, 0.5); margin: 0 4px 4px; }
.jap-config-range { flex: 1; accent-color: #f0c040; }
.jap-config-val { color: rgba(232, 221, 200, 0.7); white-space: nowrap; }
.jap-config-val b { color: #f0c040; font-weight: 500; }
.jap-config-hint { margin: 0 4px 12px; font-size: 10px; color: rgba(232, 221, 200, 0.35); }

.jap-empty { padding: 10px 0 4px; }
.jap-empty-title { font-size: 13px; color: rgba(232, 221, 200, 0.7); margin: 0 0 6px; }
.jap-empty-desc { font-size: 12px; line-height: 1.7; color: rgba(232, 221, 200, 0.45); margin: 0; }

.jap-stats { display: flex; gap: 8px; margin-bottom: 14px; }
.jap-stat {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03));
}
.jap-stat b { font-size: 15px; font-weight: 500; color: #f0c040; }
.jap-stat span { font-size: 10px; color: rgba(232, 221, 200, 0.4); }

.jap-block { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.jap-block-title { font-size: 11px; color: rgba(232, 221, 200, 0.5); margin-bottom: 2px; }
.jap-row {
  display: flex; flex-direction: column; gap: 3px;
  padding: 8px 10px; border-radius: 8px; background: var(--bg-card, rgba(255,255,255,0.03));
}
.jap-row-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.jap-row-regions { font-size: 12px; color: rgba(232, 221, 200, 0.8); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jap-row-days { font-size: 11px; color: #f0c040; flex-shrink: 0; }
.jap-row-meta { font-size: 11px; color: rgba(232, 221, 200, 0.45); }
.jap-span { font-size: 11px; }

.jap-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.jap-insights li { font-size: 12px; line-height: 1.65; color: rgba(232, 221, 200, 0.6); }
.jap-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>
