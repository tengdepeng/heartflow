<template>
  <section class="gp-panel" aria-label="环球投影">
    <div class="gp-panel-head">
      <span class="gp-panel-title">🌍 环球投影</span>
      <span class="gp-panel-sub">正射投影 · 足迹落点</span>
    </div>

    <div class="gp-globe-wrap">
      <svg class="gp-globe" viewBox="0 0 220 220" role="img" aria-label="全球足迹投影">
        <polygon :points="spherePoints" class="gp-sphere" />
        <g v-for="(line, i) in gratLines" :key="i">
          <polyline :points="line" class="gp-grat-line" />
        </g>
        <g v-for="pt in projected" :key="pt.id">
          <circle :cx="pt.x" :cy="pt.y" :r="pt.r" :fill="pt.color" :opacity="pt.opacity">
            <title>{{ pt.name }}</title>
          </circle>
        </g>
      </svg>
    </div>
    <p class="gp-hint">{{ projected.length }} 个地点已落点 · 共 {{ places.length }} 处记录</p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Place } from '../modules/map/map'
import { projectGeo, sphereOutline } from '../modules/map/geo-projection'

const props = defineProps<{ places: Place[] }>()

const CX = 110
const CY = 110
const RADIUS = 90
const CENTER_LNG = 105
const CENTER_LAT = 25

const PROJECT_OPTS = { centerLng: CENTER_LNG, centerLat: CENTER_LAT, cx: CX, cy: CY }

const spherePoints = computed(() =>
  sphereOutline(CX, CY, RADIUS, 48).map(p => `${p.x},${p.y}`).join(' '),
)

const gratLines = computed(() => {
  const lines: string[] = []
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: string[] = []
    for (let lng = -180; lng <= 180; lng += 15) {
      const p = projectGeo(lng, lat, RADIUS, PROJECT_OPTS)
      if (p.visible) pts.push(`${Math.round(p.x)},${Math.round(p.y)}`)
    }
    if (pts.length > 1) lines.push(pts.join(' '))
  }
  for (let lng = -180; lng <= 180; lng += 30) {
    const pts: string[] = []
    for (let lat = -90; lat <= 90; lat += 15) {
      const p = projectGeo(lng, lat, RADIUS, PROJECT_OPTS)
      if (p.visible) pts.push(`${Math.round(p.x)},${Math.round(p.y)}`)
    }
    if (pts.length > 1) lines.push(pts.join(' '))
  }
  return lines
})

const typeColors: Record<string, string> = {
  city: '#6b9fc4', nature: '#5ab8a0', coast: '#3fa3b8',
  cultural: '#d4a574', abroad: '#a07c8c',
}

const projected = computed(() => {
  const pts = props.places
    .filter(p => typeof p.lng === 'number' && isFinite(p.lng) && typeof p.lat === 'number' && isFinite(p.lat))
    .map(p => {
      const pr = projectGeo(p.lng as number, p.lat as number, RADIUS, PROJECT_OPTS)
      return {
        id: p.id,
        x: pr.x,
        y: pr.y,
        z: pr.z,
        visible: pr.visible,
        r: 2 + Math.sqrt(p.visitCount || 1),
        color: typeColors[p.type] || '#c4956a',
        opacity: pr.visible ? 0.95 - pr.z * 0.55 : 0.18,
        name: p.name,
      }
    })
  pts.sort((a, b) => a.z - b.z)
  return pts
})
</script>

<style scoped>
.gp-panel {
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
.gp-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.gp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.gp-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.gp-globe-wrap {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
  background: radial-gradient(circle at 50% 50%, rgba(90, 184, 160, 0.05), rgba(14, 16, 24, 0.6));
}
.gp-globe {
  width: 100%;
  display: block;
  aspect-ratio: 1 / 1;
}
.gp-sphere {
  fill: rgba(90, 184, 160, 0.06);
  stroke: rgba(90, 184, 160, 0.35);
  stroke-width: 1;
}
.gp-grat-line {
  fill: none;
  stroke: rgba(240, 242, 255, 0.1);
  stroke-width: 0.4;
}
.gp-hint {
  margin: 0;
  font-size: 11px;
  color: var(--text-low);
  text-align: center;
}
</style>
