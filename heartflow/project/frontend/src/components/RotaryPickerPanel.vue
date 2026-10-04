<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRotaryPicker } from '../modules/rotary-picker'

const { value, min, max, step, unit, presets, setValue, stepBy, savePreset, applyPreset, removePreset, reset } =
  useRotaryPicker()

const knobRef = ref<HTMLElement | null>(null)
const dragging = ref(false)
const angle = ref(0)
const presetName = ref('')

const TICKS = 24

function valueToAngle(v: number): number {
  const span = max.value - min.value
  return span > 0 ? ((v - min.value) / span) * 360 : 0
}

function syncFromValue() {
  angle.value = valueToAngle(value.value)
}

onMounted(syncFromValue)

function angleFromEvent(e: PointerEvent): number {
  const el = knobRef.value
  if (!el) return angle.value
  const rect = el.getBoundingClientRect()
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI
}

let lastAngle = 0

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  lastAngle = angleFromEvent(e)
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const a = angleFromEvent(e)
  let delta = a - lastAngle
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  lastAngle = a
  angle.value += delta
  const norm = ((angle.value % 360) + 360) % 360
  setValue(min.value + (norm / 360) * (max.value - min.value))
  angle.value = valueToAngle(value.value)
}

function onPointerUp() {
  dragging.value = false
}

function onKey(delta: number) {
  stepBy(delta)
  syncFromValue()
}

function onApply(id: string) {
  applyPreset(id)
  syncFromValue()
}

function onReset() {
  reset()
  syncFromValue()
}

function onSave() {
  if (savePreset(presetName.value)) presetName.value = ''
}

const tickMarks = computed(() =>
  Array.from({ length: TICKS }, (_, i) => ({ deg: (360 / TICKS) * i, major: i % 6 === 0 })),
)
</script>

<template>
  <section class="rot-panel">
    <header class="rot-head">
      <div class="rot-head-text">
        <span class="rot-kicker">触角 · 数值选择</span>
        <h3 class="rot-title">滚轮旋钮选择器</h3>
      </div>
      <span class="rot-range">{{ min }}–{{ max }} {{ unit }}</span>
    </header>

    <div
      ref="knobRef"
      class="rot-knob"
      :class="{ 'is-dragging': dragging }"
      role="slider"
      :aria-valuemin="min"
      :aria-valuemax="max"
      :aria-valuenow="value"
      :aria-label="`滚轮选择器，当前 ${value} ${unit}`"
      tabindex="0"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown.up.prevent="onKey(1)"
      @keydown.right.prevent="onKey(1)"
      @keydown.down.prevent="onKey(-1)"
      @keydown.left.prevent="onKey(-1)"
    >
      <svg class="rot-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="100" r="88" class="rot-rim" />
        <line
          v-for="t in tickMarks"
          :key="t.deg"
          x1="100"
          y1="15"
          x2="100"
          :y2="t.major ? 27 : 22"
          class="rot-tick"
          :class="{ 'is-major': t.major }"
          :transform="`rotate(${t.deg} 100 100)`"
        />
        <g :transform="`rotate(${angle} 100 100)`">
          <line x1="100" y1="100" x2="100" y2="34" class="rot-needle" />
          <circle cx="100" cy="34" r="6.5" class="rot-needle-cap" />
        </g>
        <circle cx="100" cy="100" r="54" class="rot-hub" />
      </svg>
      <div class="rot-readout">
        <span class="rot-value">{{ value }}</span>
        <span class="rot-unit">{{ unit }}</span>
      </div>
    </div>

    <p class="rot-hint">按住旋钮拖动，或方向键微调 · 步进 {{ step }} {{ unit }}</p>

    <div class="rot-presets">
      <span v-for="p in presets" :key="p.id" class="rot-preset-wrap">
        <button
          class="rot-preset"
          :class="{ 'is-active': p.value === value }"
          type="button"
          @click="onApply(p.id)"
        >
          {{ p.label }}<small>{{ p.value }}</small>
        </button>
        <button class="rot-preset-del" type="button" aria-label="删除预设" @click="removePreset(p.id)">×</button>
      </span>
    </div>

    <div class="rot-actions">
      <input
        v-model="presetName"
        class="rot-input"
        type="text"
        maxlength="8"
        placeholder="命名当前值…"
        @keydown.enter="onSave"
      />
      <button class="rot-btn" type="button" @click="onSave">存为预设</button>
      <button class="rot-btn rot-btn--ghost" type="button" @click="onReset">复位</button>
    </div>
  </section>
</template>

<style scoped>
.rot-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(122, 168, 178, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(28, 44, 52, 0.55), rgba(20, 34, 42, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #dceef0;
}

.rot-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.rot-kicker { font-size: 12px; letter-spacing: 0.12em; color: #7ab0ba; opacity: 0.9; }
.rot-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; color: #eaf6f7; }

.rot-range {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(122, 168, 178, 0.16);
  font-size: 12px;
  color: #a9d2d8;
}

.rot-knob {
  position: relative;
  width: 220px;
  height: 220px;
  margin: 4px auto 6px;
  cursor: grab;
  touch-action: none;
  user-select: none;
  outline: none;
}

.rot-knob:focus-visible { filter: drop-shadow(0 0 10px rgba(122, 168, 178, 0.7)); }
.rot-knob.is-dragging { cursor: grabbing; }

.rot-svg { width: 100%; height: 100%; display: block; }
.rot-rim { fill: rgba(14, 30, 40, 0.7); stroke: rgba(122, 168, 178, 0.35); stroke-width: 1.5; }
.rot-tick { stroke: rgba(169, 210, 216, 0.4); stroke-width: 1.6; }
.rot-tick.is-major { stroke: rgba(169, 210, 216, 0.8); stroke-width: 2.4; }
.rot-needle { stroke: #eaf6f7; stroke-width: 3; stroke-linecap: round; }
.rot-needle-cap { fill: #7ab0ba; }
.rot-hub { fill: rgba(20, 38, 46, 0.92); stroke: rgba(122, 168, 178, 0.4); stroke-width: 1; }

.rot-readout {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.rot-value { font-size: 40px; font-weight: 700; color: #eaf6f7; font-variant-numeric: tabular-nums; line-height: 1; }
.rot-unit { margin-top: 4px; font-size: 12px; letter-spacing: 0.1em; color: #8fb4ba; }

.rot-hint { margin: 0 0 12px; text-align: center; font-size: 12px; color: #8fb4ba; }

.rot-presets { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.rot-preset-wrap { display: inline-flex; align-items: center; }

.rot-preset {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  padding: 5px 12px;
  border: 1px solid rgba(122, 168, 178, 0.3);
  border-right: none;
  border-radius: 999px 0 0 999px;
  background: rgba(0, 0, 0, 0.18);
  color: #b9d8dc;
  font-size: 12px;
  cursor: pointer;
}

.rot-preset small { color: #7ab0ba; font-size: 11px; }
.rot-preset.is-active { border-color: #7ab0ba; color: #eaf6f7; box-shadow: 0 0 0 1px #7ab0ba inset; }

.rot-preset-del {
  padding: 5px 8px;
  border: 1px solid rgba(122, 168, 178, 0.3);
  border-radius: 0 999px 999px 0;
  background: rgba(0, 0, 0, 0.18);
  color: #7f9ea4;
  font-size: 12px;
  cursor: pointer;
}

.rot-preset-del:hover { color: #f0c6bb; }

.rot-actions { display: flex; gap: 8px; margin-top: 14px; }

.rot-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(122, 168, 178, 0.3);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  color: #dceef0;
  font-size: 13px;
}

.rot-input::placeholder { color: #7f9ea4; }

.rot-btn {
  flex: none;
  padding: 8px 14px;
  border: 1px solid rgba(122, 168, 178, 0.4);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: #dceef0;
  font-size: 13px;
  cursor: pointer;
}

.rot-btn:hover { background: rgba(122, 168, 178, 0.2); }
.rot-btn--ghost { color: #a9d2d8; }
</style>
