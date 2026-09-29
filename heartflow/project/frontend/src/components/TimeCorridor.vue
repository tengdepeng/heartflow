<template>
  <div class="time-corridor">
    <div class="corridor-header">
      <span class="corridor-title">◈ 时间长廊</span>
      <div class="corridor-scale">
        <span>· · ·</span>
        <span class="corridor-scale-hint">按日期回看结晶</span>
      </div>
    </div>

    <div class="corridor-scroll" ref="scrollRef" @scroll.passive>
      <svg class="corridor-svg" :width="svgWidth" :height="svgHeight" @click="handleSvgClick">
        <!-- 今天标记线 -->
        <line v-if="todayMarker" class="today-marker" :x1="todayMarker.x" :y1="0" :x2="todayMarker.x" :y2="svgHeight"
          stroke="var(--accent-cyan)" stroke-width="2" stroke-dasharray="6,4" opacity="0.7"/>

        <!-- 月份刻度 -->
        <g v-for="m in monthMarkers" :key="m.label">
          <line class="month-label" :x1="m.x" :y1="0" :x2="m.x" :y2="svgHeight"
            stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
          <text :x="m.x" :y="16" text-anchor="middle" fill="rgba(255,255,255,0.2)" font-size="10">{{ m.label }}</text>
        </g>

        <!-- 时间带点 (bands) -->
        <g v-for="band in bands" :key="band.dateStr">
          <!-- 连接线 -->
          <line v-if="band.dots.length>=2" :x1="band.x" :y1="band.dots[0].y + band.dots[0].size/2"
            :x2="band.x" :y2="band.dots[band.dots.length-1].y - band.dots[band.dots.length-1].size/2"
            :stroke="band.color" stroke-width="2" opacity="0.2" stroke-linecap="round"/>
          <!-- 点 -->
          <g v-for="d in band.dots" :key="d.id" :transform="`translate(${d.x},${d.y})`">
            <g class="band-dot" :class="{today:d.isToday}"
              @mouseenter="hoveredDot=d" @mouseleave="hoveredDot=null"
              @click.stop="selectDot(d)">
              <!-- 辉光 -->
              <circle v-if="d.isToday" :r="d.glow" :fill="d.color" opacity="0.12" class="dot-glow"/>
              <circle :r="d.size" :fill="d.color" opacity="0.55" class="band-dot-inner"/>
            </g>
          </g>
        </g>

        <!-- tooltip -->
        <g v-if="hoveredDot" class="corridor-tooltip" :class="{'corridor-tooltip-visible':hoveredDot}"
          :transform="`translate(${hoveredDot.x},${hoveredDot.y-28})`">
          <rect x="-60" y="-14" width="120" height="24" rx="4" fill="rgba(0,0,0,0.7)"/>
          <text text-anchor="middle" y="4" fill="rgba(255,255,255,0.8)" font-size="10">{{ hoveredDot.label }}</text>
        </g>
      </svg>

      <!-- 左下方点击提示 -->
      <div v-if="!hoveredDot" class="click-hint">点击光点查看结晶，点击空白收起</div>
    </div>

    <!-- 结晶详情弹窗 -->
    <CrystalDetail :crystal="selectedCrystal" :session="selectedSession" @close="selectedCrystal=null"/>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CrystalDetail from './CrystalDetail.vue'
import { storage } from '../engine/storage'
import type { TimeCrystal, FocusSession } from '../types'

const props = defineProps<{
  sessionMap: Map<string, FocusSession>
}>()

const scrollRef = ref<HTMLDivElement | null>(null)
const hoveredDot = ref<Dot | null>(null)
const selectedCrystal = ref<TimeCrystal | null>(null)
const selectedSession = ref<FocusSession | null>(null)

const DOT_MIN = 6
const DOT_MAX = 16
const BAND_TOP = 48
const BAND_HEIGHT = 180
const COLUMN_W = 40
const PADDING = 40

interface Dot {
  id: string
  x: number
  y: number
  size: number
  color: string
  glow: number
  label: string
  crystal: TimeCrystal
  session?: FocusSession | null
  isToday: boolean
}

interface Band {
  dateStr: string
  x: number
  color: string
  dots: Dot[]
}

const todayStr = new Date().toISOString().slice(0, 10)

// 按日期分组、按列排列的 bands
const bands = computed<Band[]>(() => {
  const crystals = storage.getCrystals()
  const map = new Map<string, TimeCrystal[]>()
  for (const c of crystals) {
    const ds = new Date(c.createdAt).toISOString().slice(0, 10)
    if (!map.has(ds)) map.set(ds, [])
    map.get(ds)!.push(c)
  }
  const sorted = [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  const result: Band[] = []
  let colIdx = 0
  for (const [dateStr, group] of sorted) {
    const x = PADDING + colIdx * COLUMN_W
    const color = group[0].color
    const dots: Dot[] = []
    const count = group.length
    const slotH = Math.min(BAND_HEIGHT / count, 44)
    const totalH = slotH * (count - 1)
    const startY = BAND_TOP + (BAND_HEIGHT - totalH) / 2
    for (let i = 0; i < count; i++) {
      const c = group[i]
      const s = props.sessionMap.get(c.sessionId) ?? null
      const elapsed = s?.elapsed ?? 0
      const maxElapsed = 7200
      const ratio = Math.min(1, Math.sqrt(elapsed) / Math.sqrt(maxElapsed))
      const size = DOT_MIN + ratio * (DOT_MAX - DOT_MIN)
      const glow = size * 1.5
      const y = startY + i * slotH
      dots.push({
        id: c.id, x, y, size, color: c.color, glow,
        label: `${dateStr} · ${secondsToLabel(Math.floor(elapsed / 1000))}`,
        crystal: c, session: s, isToday: dateStr === todayStr,
      })
    }
    result.push({ dateStr, x, color, dots })
    colIdx++
  }
  return result
})

function secondsToLabel(s: number): string {
  if (s < 60) return `${s}秒`
  if (s < 3600) return `${Math.floor(s / 60)}分钟`
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return m ? `${h}小时${m}分钟` : `${h}小时`
}

const svgWidth = computed(() => Math.max(bands.value.length * COLUMN_W + PADDING * 2, 800))
const svgHeight = computed(() => BAND_TOP + BAND_HEIGHT + 32)

// 月份标记
const monthMarkers = computed(() => {
  const seen = new Set<string>()
  const markers: { x: number; label: string }[] = []
  for (const band of bands.value) {
    const m = band.dateStr.slice(0, 7)
    if (!seen.has(m)) {
      seen.add(m)
      markers.push({ x: band.x, label: m })
    }
  }
  return markers
})

// 今天标记线
const todayMarker = computed(() => {
  for (const band of bands.value) {
    if (band.dateStr === todayStr) {
      const todayDots = band.dots.filter(d => d.isToday)
      if (todayDots.length > 0) {
        return { x: todayDots[0].x }
      }
    }
  }
  return null
})

function selectDot(d: Dot) {
  selectedCrystal.value = d.crystal
  selectedSession.value = d.session ?? null
}

function handleSvgClick() {
  selectedCrystal.value = null
  selectedSession.value = null
}

// 自动滚动到今天
onMounted(() => {
  if (scrollRef.value && todayMarker.value) {
    const container = scrollRef.value.parentElement
    if (container) {
      scrollRef.value.scrollLeft = todayMarker.value.x - container.clientWidth / 2
    }
  }
})
</script>

<style scoped>
.time-corridor {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.corridor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  flex-shrink: 0;
}

.corridor-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #e8e0d8));
}

.corridor-scale {
  font-size: 11px;
  color: var(--text-muted, rgba(232, 224, 216, 0.44));
  cursor: default;
  user-select: none;
}

.corridor-scroll {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
}

.corridor-svg {
  display: block;
  min-width: 100%;
  cursor: pointer;
}

/* 今天标记 */
.today-marker {
  pointer-events: none;
}

/* 月份标签 */
.month-label {
  pointer-events: none;
}

/* 时间带点 */
.band-dot {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.band-dot:hover {
  transform: scale(1.3);
}

.band-dot.today .band-dot-inner {
  stroke: var(--accent-cyan);
  stroke-width: 1.5;
  stroke-opacity: 0.6;
}

.dot-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.2; }
}

/* tooltip */
.corridor-tooltip {
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.corridor-tooltip-visible {
  opacity: 1;
}

.click-hint {
  position: absolute;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: rgba(255,255,255,0.15);
  pointer-events: none;
  white-space: nowrap;
}
</style>
