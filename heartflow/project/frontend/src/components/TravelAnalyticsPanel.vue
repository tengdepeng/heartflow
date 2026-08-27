<template>
  <section class="ta-panel" aria-label="足迹分析">
    <div class="ta-panel-head">
      <span class="ta-panel-title">🧭 足迹分析</span>
      <span class="ta-panel-sub">探索气象 · 走过多远</span>
    </div>

    <!-- 探索势能 -->
    <div class="ta-block">
      <span class="ta-block-label">探索势能</span>
      <div class="ta-momentum">
        <div class="ta-score-ring" :style="{ borderColor: momentum.color }">
          <span class="ta-score-num" :style="{ color: momentum.color }">{{ momentum.score }}</span>
        </div>
        <span class="ta-score-label" :style="{ color: momentum.color }">{{ momentum.label }}</span>
      </div>
    </div>

    <!-- 概览 -->
    <div class="ta-block">
      <span class="ta-block-label">足迹概览</span>
      <div class="ta-stats">
        <div class="ta-stat"><span class="ta-stat-num">{{ overview.totalPlaces }}</span><span class="ta-stat-label">地点</span></div>
        <div class="ta-stat"><span class="ta-stat-num">{{ overview.uniqueCities }}</span><span class="ta-stat-label">城市</span></div>
        <div class="ta-stat"><span class="ta-stat-num">{{ overview.totalVisits }}</span><span class="ta-stat-label">到访次</span></div>
        <div class="ta-stat"><span class="ta-stat-num">{{ overview.returnRate }}%</span><span class="ta-stat-label">回访率</span></div>
      </div>
      <div v-if="overview.latSpan || overview.lngSpan" class="ta-span">
        足迹跨度 纬度 {{ overview.latSpan }}° × 经度 {{ overview.lngSpan }}°
      </div>
    </div>

    <!-- 地貌分布 -->
    <div class="ta-block" v-if="types.length">
      <span class="ta-block-label">地貌分布</span>
      <div v-for="t in types" :key="t.type" class="ta-type">
        <span class="ta-type-icon" :style="{ color: t.color }">{{ t.icon }}</span>
        <span class="ta-type-label">{{ t.label }}</span>
        <div class="ta-type-bar"><div class="ta-type-fill" :style="{ width: t.pct + '%', background: t.color }" /></div>
        <span class="ta-type-count">{{ t.count }} · {{ t.pct }}%</span>
      </div>
    </div>

    <!-- 热门城市 -->
    <div class="ta-block" v-if="cities.length">
      <span class="ta-block-label">热门城市</span>
      <div v-for="(c, i) in cities" :key="c.name" class="ta-city">
        <span class="ta-city-rank">{{ i + 1 }}</span>
        <span class="ta-city-name">{{ c.name }}</span>
        <span class="ta-city-visits">{{ c.visits }} 次</span>
        <span class="ta-city-latest">{{ c.latest.slice(0, 10) }}</span>
      </div>
    </div>

    <!-- 洞察 -->
    <div class="ta-block" v-if="insights.length">
      <span class="ta-block-label">足迹洞察</span>
      <p v-for="(ins, i) in insights" :key="i" class="ta-insight">{{ ins }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../modules/map/map'
import {
  travelOverview,
  typeDistribution,
  topTravelCities,
  exploreMomentum,
  travelInsights,
} from '../modules/map/travel-analytics'

const props = defineProps<{ places: Place[] }>()

const overview = computed(() => travelOverview(props.places))
const types = computed(() => typeDistribution(props.places))
const cities = computed(() => topTravelCities(props.places, 5))
const momentum = computed(() => exploreMomentum(props.places))
const insights = computed(() => travelInsights(props.places, 4))
</script>

<style scoped>
.ta-panel {
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
.ta-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.ta-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.ta-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.ta-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.ta-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.ta-momentum {
  display: flex;
  align-items: center;
  gap: 14px;
}
.ta-score-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 3px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ta-score-num {
  font-size: 18px;
  font-weight: 600;
}
.ta-score-label {
  font-size: 14px;
  font-weight: 500;
}
.ta-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.ta-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.ta-stat-num {
  font-size: 16px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.ta-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.ta-span {
  font-size: 11px;
  color: var(--text-low);
}
.ta-type {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.ta-type-icon {
  font-size: 14px;
}
.ta-type-label {
  color: rgba(240, 242, 255, 0.8);
  min-width: 40px;
}
.ta-type-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.ta-type-fill {
  height: 100%;
  border-radius: 3px;
}
.ta-type-count {
  color: var(--text-low);
  min-width: 52px;
  text-align: right;
}
.ta-city {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 11px;
}
.ta-city-rank {
  color: var(--text-low);
  min-width: 14px;
}
.ta-city-name {
  flex: 1;
  color: rgba(240, 242, 255, 0.85);
}
.ta-city-visits {
  color: var(--text-low);
}
.ta-city-latest {
  color: var(--text-low);
  font-variant-numeric: tabular-nums;
}
.ta-insight {
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  color: rgba(240, 242, 255, 0.7);
  padding-left: 10px;
  border-left: 2px solid rgba(107, 159, 196, 0.4);
}
</style>
