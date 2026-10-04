<template>
  <section class="sg-panel">
    <header class="sg-head">
      <div>
        <h4 class="sg-title">🌌 时间星图</h4>
        <p class="sg-hint">观星/AR星座式 · 本地赤道→地平投影 · 四季轮转「时间回溯」</p>
        <p class="sg-spot" v-if="selectedSpot">📍 观测地：{{ selectedSpot.name }} · {{ selectedSpot.bortle }} 级暗夜</p>
      </div>
      <span class="sg-meta">{{ visibleStars }} 星可见</span>
    </header>

    <!-- 季节 / 时间切换 -->
    <div class="sg-toolbar">
      <div class="sg-seasons">
        <button
          v-for="s in seasons"
          :key="s.key"
          class="sg-season"
          :class="{ active: season === s.key }"
          @click="season = s.key"
        >{{ s.icon }}<span>{{ s.label }}</span></button>
      </div>
      <label class="sg-time">
        <span class="sg-time-icon">🕒</span>
        <input class="sg-range" type="range" min="18" max="30" step="1" v-model.number="nightSlot"
          @input="onHourChange" />
        <code class="sg-clock">{{ displayHour }}</code>
      </label>
    </div>

    <!-- 星图 SVG -->
    <div class="sg-stage">
      <svg :viewBox="`0 0 ${vw} ${vh}`" class="sg-svg" role="img" aria-label="可交互星座星图">
        <defs>
          <radialGradient id="skyCard" cx="50%" cy="42%" r="75%">
            <stop offset="0%" stop-color="rgba(30,24,60,0.55)" />
            <stop offset="100%" stop-color="rgba(10,10,24,0.85)" />
          </radialGradient>
        </defs>

        <circle :cx="cx" :cy="cy" :r="radius" fill="url(#skyCard)" stroke="rgba(148,163,184,0.28)" />
        <circle :cx="cx" :cy="cy" :r="radius * 0.5" fill="none" stroke="rgba(148,163,184,0.16)" stroke-dasharray="3 5" />

        <!-- 方位标记 -->
        <text v-for="d in cardinals" :key="d.label" :x="d.x" :y="d.y"
          class="sg-cardinal" text-anchor="middle">{{ d.label }}</text>

        <!-- 星座连线 -->
        <polyline
          v-for="(c, i) in groupedConstellations"
          :key="'line-' + c.constellation.id + i"
          :points="c.linePoints"
          class="sg-link" />
        <!-- 星座分组标签 -->
        <g v-for="c in groupedConstellations" :key="c.constellation.id"
          @mouseenter="hover = c.constellation" @mouseleave="hover = null">
          <!-- 星点 -->
          <circle
            v-for="s in c.visibleStars" :key="s.star.name"
            :cx="s.x" :cy="s.y" :r="s.size"
            :class="['sg-star', { dim: s.size < 1.6 }]" />
          <!-- 星名（亮星标注） -->
          <template v-for="s in c.visibleStars" :key="'t' + s.star.name">
            <text
              v-if="s.size > 2.5"
              :x="s.x" :y="s.y - s.size - 4"
              class="sg-star-label" text-anchor="middle">{{ s.star.name }}</text>
          </template>
        </g>
      </svg>

      <!-- 星座故事卡 -->
      <div v-if="hover" class="sg-card" :style="cardPos">
        <span class="sg-card-icon">{{ hover.icon }}</span>
        <div>
          <b>{{ hover.name }} <i>{{ hover.alias }}</i></b>
          <p>{{ hover.myth }}</p>
          <small>{{ hover.stars.length }} 颗亮星 · {{ hoverSeasonLabel(hover) }}</small>
        </div>
      </div>
    </div>

    <!-- 北斗时刻语 -->
    <p v-if="ladleNote" class="sg-ladle">🧭 {{ ladleNote }}</p>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  seasonAtMonth,
  SEASONS,
  skyMapAt,
  ladlePointSeason,
  useStargazingSpots,
} from '../modules/sky'
import type { SeasonKey, Constellation, ProjectedStar, ProjectedConstellation } from '../modules/sky'

const cx = 205
const cy = 205
const radius = 156
const vw = 410
const vh = 410

const today = new Date()
const season = ref<SeasonKey>(seasonAtMonth(today.getMonth()))
const nightSlot = ref(22) // 18..30（余数即小时）
const hover = ref<Constellation | null>(null)

const seasons = SEASONS

// INCR-511：观测地来源于观星地点库（选中即驱动投影，否则默认北京）
const { selectedSpot } = useStargazingSpots()

const skyDate = computed<Date>(() => {
  const d = new Date()
  d.setHours(nightSlot.value % 24, 0, 0, 0)
  return d
})

const map = computed(() => skyMapAt(skyDate.value, {
  latDeg: selectedSpot.value ? selectedSpot.value.lat : 39.9,
  lngDeg: selectedSpot.value ? selectedSpot.value.lng : 116.4,
  cx, cy, radius,
  season: season.value,
}))

const visibleStars = computed(() => map.value.visibleStars)

const displayHour = computed(() => {
  const h = nightSlot.value % 24
  return `${String(h).padStart(2, '0')}:00`
})

function onHourChange() {
  hover.value = null
}

const cardinals = computed(() => {
  const r = radius + 20
  return [
    { label: '北', x: cx, y: cy - r },
    { label: '东', x: cx + r, y: cy },
    { label: '南', x: cx, y: cy + r },
    { label: '西', x: cx - r, y: cy },
  ]
})

interface Grouped {
  constellation: ProjectedConstellation['constellation']
  visibleStars: ProjectedStar[]
  linePoints: string
}

const groupedConstellations = computed<Grouped[]>(() =>
  map.value.constellations.map(c => {
    const visible = c.stars.filter(s => s.visible)
    const linePoints = visible
      .map(s => `${round(s.x)},${round(s.y)}`)
      .join(' ')
    return { constellation: c.constellation, visibleStars: visible, linePoints }
  }),
)

const ladleNote = computed(() => {
  const major = map.value.constellations.find(c => c.constellation.id === 'ursa-major')
  const s = major?.stars.find(x => x.visible)
  if (!s) return ''
  return `${ladlePointSeason(s.altDeg)} · 本地恒星时 ${Math.round(map.value.lstDeg / 15)}h`
})

const cardPos = computed(() => {
  const x = (cx / vw) * 100
  return { left: `${x}%`, top: '4px' }
})

function round(v: number): string {
  return v.toFixed(1)
}

function hoverSeasonLabel(c: Constellation): string {
  const s = SEASONS.find(x => x.key === c.season)
  return s ? `${s.label} · 最佳` : '终年可见'
}
</script>

<style scoped>
.sg-panel {
  margin-top: 20px; padding-top: 16px; border-top: 1px dashed rgba(255, 255, 255, 0.14);
}
.sg-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.sg-title { margin: 0; }
.sg-spot { margin: 4px 0 0; font-size: 12px; color: #8ab4ff; opacity: 0.9; }
.sg-hint { margin: 4px 0 12px; font-size: 12px; opacity: 0.62; }
.sg-meta { font-size: 12px; color: #8ab4ff; opacity: 0.9; white-space: nowrap; }
.sg-toolbar { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
.sg-seasons { display: flex; gap: 8px; }
.sg-season {
  display: inline-flex; align-items: center; gap: 3px; padding: 4px 9px; font-size: 12px;
  border: 1px solid rgba(148, 163, 184, 0.25); border-radius: 999px; background: rgba(255, 255, 255, 0.03);
  color: inherit; cursor: pointer; transition: all 0.16s;
}
.sg-season.active { border-color: #8ab4ff; color: #8ab4ff; background: rgba(138, 180, 255, 0.12); }
.sg-time { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; }
.sg-range { width: 130px; accent-color: #8ab4ff; }
.sg-clock { font-size: 13px; color: #8ab4ff; letter-spacing: 0.5px; }
.sg-stage { position: relative; max-width: 430px; }
.sg-svg { width: 100%; height: auto; display: block; }
.sg-cardinal { font-size: 12px; fill: rgba(226, 232, 240, 0.5); }
.sg-link { fill: none; stroke: rgba(138, 180, 255, 0.5); stroke-width: 1; }
.sg-star { fill: #eaf0ff; stroke: rgba(255, 255, 255, 0.25); stroke-width: 0.4; filter: drop-shadow(0 0 2px rgba(160, 190, 255, 0.5)); cursor: pointer; }
.sg-star.dim { opacity: 0.62; }
.sg-star-label { font-size: 8.5px; fill: rgba(200, 214, 240, 0.75); pointer-events: none; }
.sg-ladle { margin: 14px 0 4px; font-size: 12px; color: #8ab4ff; opacity: 0.9; }
.sg-card {
  position: absolute; transform: translateX(-14px); z-index: 5;
  display: flex; gap: 10px; max-width: 300px; padding: 10px 12px;
  border: 1px solid rgba(138, 180, 255, 0.4); border-radius: 10px;
  background: rgba(14, 18, 34, 0.92); box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}
.sg-card-icon { font-size: 20px; }
.sg-card b { font-size: 13px; }
.sg-card b i { font-style: normal; font-weight: 400; opacity: 0.6; font-size: 11px; margin-left: 4px; }
.sg-card p { margin: 4px 0; font-size: 12px; line-height: 1.5; opacity: 0.85; }
.sg-card small { font-size: 11px; opacity: 0.6; }
</style>