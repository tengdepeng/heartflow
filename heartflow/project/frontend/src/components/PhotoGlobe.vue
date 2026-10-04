<template>
  <div class="pgb" data-test="pgb">
    <svg
      class="pgb-svg"
      :viewBox="`0 0 ${SIZE} ${SIZE}`"
      role="img"
      aria-label="照片地图地球"
      @pointerdown="onDown"
      @pointermove="onMove"
      @pointerup="onUp"
      @pointerleave="onUp"
    >
      <circle class="pgb-sphere" :cx="CX" :cy="CY" :r="R" />
      <path v-for="(d, i) in graticule" :key="`g${i}`" class="pgb-graticule" :d="d" />

      <g
        v-for="pin in renderPins"
        :key="pin.placeId"
        class="pgb-pin"
        :class="{ 'pgb-pin--active': pin.placeId === props.selectedId }"
        :transform="`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`"
        :style="{ opacity: pin.opacity }"
        :data-test="`pgb-pin-${pin.placeId}`"
        @click.stop="emit('select', pin.placeId)"
      >
        <circle class="pgb-pin-halo" :r="pin.r + 4" />
        <circle class="pgb-pin-dot" :r="pin.r" />
        <text class="pgb-pin-count" y="3.5">{{ pin.count }}</text>
        <text class="pgb-pin-name" :y="-pin.r - 5">{{ pin.name }}</text>
      </g>
    </svg>

    <div class="pgb-controls">
      <button type="button" class="pgb-btn" data-test="pgb-rotate-left" @click="rotate(-20)">◀</button>
      <button type="button" class="pgb-btn pgb-btn--wide" data-test="pgb-recenter" @click="recenter">回到数据</button>
      <button type="button" class="pgb-btn" data-test="pgb-rotate-right" @click="rotate(20)">▶</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { projectGeo } from '../modules/map/geo-projection'
import type { PhotoMapPin } from '../modules/anchor/photo-map'
import { pinsCentroid } from '../modules/anchor/photo-map'

const props = defineProps<{
  pins: PhotoMapPin[]
  selectedId?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', placeId: string): void
}>()

const SIZE = 320
const CX = 160
const CY = 160
const R = 130

const DEFAULT_LNG = 105
const DEFAULT_LAT = 25

const centerLng = ref(DEFAULT_LNG)
const centerLat = ref(DEFAULT_LAT)

function wrapLng(l: number): number {
  return ((l + 540) % 360) - 180
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v))
}

function projection() {
  return { centerLng: centerLng.value, centerLat: centerLat.value, cx: CX, cy: CY }
}

interface RenderPin {
  placeId: string
  name: string
  count: number
  x: number
  y: number
  r: number
  opacity: number
}

const renderPins = computed<RenderPin[]>(() => {
  const out: RenderPin[] = []
  for (const pin of props.pins) {
    const p = projectGeo(pin.lng, pin.lat, R, projection())
    if (!p.visible) continue
    out.push({
      placeId: pin.placeId,
      name: pin.name,
      count: pin.photos.length,
      x: p.x,
      y: p.y,
      r: 6 + Math.min(6, pin.photos.length),
      opacity: 1 - p.z * 0.55,
    })
  }
  // 近者（不透明度高）绘制在上层
  return out.sort((a, b) => a.opacity - b.opacity)
})

/** 经纬网：逐点投影，遇不可见半球处断开子路径，避免跨球面连弦 */
function buildPath(points: Array<{ x: number; y: number; visible: boolean }>): string {
  let d = ''
  let pen = false
  for (const p of points) {
    if (p.visible) {
      d += `${pen ? ' L' : ' M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
      pen = true
    } else {
      pen = false
    }
  }
  return d.trim()
}

const graticule = computed<string[]>(() => {
  const paths: string[] = []
  // 纬线：每 30°
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: Array<{ x: number; y: number; visible: boolean }> = []
    for (let lng = -180; lng <= 180; lng += 6) {
      const p = projectGeo(lng, lat, R, projection())
      pts.push({ x: p.x, y: p.y, visible: p.visible })
    }
    const d = buildPath(pts)
    if (d) paths.push(d)
  }
  // 经线：每 30°
  for (let lng = -180; lng < 180; lng += 30) {
    const pts: Array<{ x: number; y: number; visible: boolean }> = []
    for (let lat = -90; lat <= 90; lat += 6) {
      const p = projectGeo(lng, lat, R, projection())
      pts.push({ x: p.x, y: p.y, visible: p.visible })
    }
    const d = buildPath(pts)
    if (d) paths.push(d)
  }
  return paths
})

const dragging = ref(false)
let lastX = 0
let lastY = 0

function onDown(e: PointerEvent): void {
  dragging.value = true
  lastX = e.clientX
  lastY = e.clientY
}

function onMove(e: PointerEvent): void {
  if (!dragging.value) return
  const dx = e.clientX - lastX
  const dy = e.clientY - lastY
  lastX = e.clientX
  lastY = e.clientY
  centerLng.value = wrapLng(centerLng.value - dx * 0.5)
  centerLat.value = clamp(centerLat.value + dy * 0.5, -85, 85)
}

function onUp(): void {
  dragging.value = false
}

function rotate(delta: number): void {
  centerLng.value = wrapLng(centerLng.value + delta)
}

function recenter(): void {
  const c = pinsCentroid(props.pins)
  if (!c) {
    centerLng.value = DEFAULT_LNG
    centerLat.value = DEFAULT_LAT
    return
  }
  centerLng.value = wrapLng(c.lng)
  centerLat.value = clamp(c.lat, -85, 85)
}
</script>

<style scoped>
.pgb {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pgb-svg {
  width: 100%;
  max-width: 320px;
  height: auto;
  cursor: grab;
  touch-action: none;
}

.pgb-sphere {
  fill: rgba(159, 196, 232, 0.06);
  stroke: rgba(159, 196, 232, 0.38);
  stroke-width: 1.2;
}

.pgb-graticule {
  fill: none;
  stroke: rgba(159, 196, 232, 0.16);
  stroke-width: 0.6;
}

.pgb-pin {
  cursor: pointer;
}

.pgb-pin-halo {
  fill: rgba(240, 192, 64, 0.16);
}

.pgb-pin--active .pgb-pin-halo {
  fill: rgba(240, 192, 64, 0.4);
}

.pgb-pin-dot {
  fill: #f0c040;
  stroke: rgba(120, 96, 32, 0.6);
  stroke-width: 0.8;
}

.pgb-pin--active .pgb-pin-dot {
  fill: #c46a5a;
}

.pgb-pin-count {
  font-size: 7px;
  font-weight: 600;
  text-anchor: middle;
  fill: #3a3018;
  pointer-events: none;
}

.pgb-pin-name {
  font-size: 8px;
  text-anchor: middle;
  fill: rgba(220, 228, 240, 0.85);
  pointer-events: none;
}

.pgb-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pgb-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: #c7d3e4;
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
}

.pgb-btn--wide {
  padding: 4px 14px;
}

.pgb-btn:hover {
  background: rgba(240, 192, 64, 0.18);
}
</style>
