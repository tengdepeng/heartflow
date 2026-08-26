<template>
  <section class="sm-panel" aria-label="自体星盘">
    <div class="sm-panel-head">
      <span class="sm-panel-title">🌌 自体星盘</span>
      <span class="sm-panel-sub">覆盖 {{ astrolabe.coverage }}%</span>
    </div>

    <div class="sm-astro-wrap">
      <svg viewBox="0 0 200 200" class="sm-astro-svg">
        <!-- 外环 -->
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" />
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="2 4" />
        <circle cx="100" cy="100" r="31" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1" stroke-dasharray="2 4" />

        <!-- 雷达连线 -->
        <polygon
          v-if="points.length"
          :points="polygonPoints"
          fill="rgba(var(--accent-rgb), 0.08)"
          stroke="rgba(var(--accent-rgb), 0.35)"
          stroke-width="1"
        />

        <!-- 刻度点 -->
        <g v-for="(p, i) in points" :key="i">
          <line
            :x1="100" :y1="100"
            :x2="ptX(p)" :y2="ptY(p)"
            stroke="rgba(255,255,255,0.06)"
            stroke-width="1"
          />
          <circle
            :cx="ptX(p)" :cy="ptY(p)"
            :r="p.value > 0 ? 3.5 : 2"
            :fill="p.color"
            :opacity="p.value > 0 ? 0.95 : 0.25"
          />
        </g>

        <!-- 中心 -->
        <circle cx="100" cy="100" r="14" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
        <text x="100" y="97" text-anchor="middle" class="sm-astro-center">{{ astrolabe.centerLabel }}</text>
        <text x="100" y="109" text-anchor="middle" class="sm-astro-coverage">{{ astrolabe.coverage }}%</text>
      </svg>
    </div>

    <!-- 图例 -->
    <div class="sm-legend">
      <span v-for="p in points" :key="p.label" class="sm-legend-item">
        <span class="sm-legend-dot" :style="{ background: p.color }"></span>
        <span class="sm-legend-label">{{ p.icon }} {{ p.label }}</span>
        <span class="sm-legend-val">{{ p.value }}/5</span>
      </span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getSelfMirrorHousesStore } from '../modules/self-mirror'
import { housesToAstrolabe } from '../modules/self-mirror'
import type { AstrolabePoint } from '../modules/self-mirror'

const store = getSelfMirrorHousesStore()
const houses = computed(() => store.houses.value)
const astrolabe = computed(() => housesToAstrolabe(houses.value))
const points = computed(() => astrolabe.value.points)

function ptX(p: AstrolabePoint): number {
  return 100 + Math.cos(p.angle) * p.radius * 80
}

function ptY(p: AstrolabePoint): number {
  return 100 + Math.sin(p.angle) * p.radius * 80
}

const polygonPoints = computed(() =>
  points.value.map(p => `${ptX(p).toFixed(1)},${ptY(p).toFixed(1)}`).join(' '),
)
</script>

<style scoped>
.sm-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.sm-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.sm-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}

.sm-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}

.sm-astro-wrap {
  display: flex;
  justify-content: center;
}

.sm-astro-svg {
  width: 100%;
  max-width: 260px;
  height: auto;
}

.sm-astro-center {
  font-size: 7px;
  fill: rgba(240, 242, 255, 0.85);
  letter-spacing: 0.5px;
}

.sm-astro-coverage {
  font-size: 7px;
  fill: rgba(var(--accent-rgb), 0.8);
}

.sm-legend {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.sm-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  color: var(--text-medium);
}

.sm-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.sm-legend-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sm-legend-val {
  font-size: 9px;
  color: var(--text-low);
  flex-shrink: 0;
}
</style>
