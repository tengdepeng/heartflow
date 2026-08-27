<template>
  <section class="ss-panel" aria-label="日出日落自动启停">
    <div class="ss-panel-head">
      <span class="ss-panel-title">🌅 日出日落自动启停</span>
      <span class="ss-panel-sub">NOAA 太阳算法 · 本地计算</span>
      <span class="ss-status" :class="{ on: autoEnabled }">{{ autoEnabled ? '自动已开' : '自动未开' }}</span>
    </div>

    <div class="ss-block">
      <span class="ss-block-label">自动启停</span>
      <div class="ss-row">
        <button class="ss-btn ss-btn-primary" @click="setAutoEnabled(!autoEnabled)">
          {{ autoEnabled ? '关闭自动启停' : '开启自动启停' }}
        </button>
        <span class="ss-hint">{{ nightNow ? '当前处于夜间，护眼应开启' : '当前处于白天，护眼应关闭' }}</span>
      </div>
    </div>

    <div class="ss-block">
      <span class="ss-block-label">位置（经纬度）</span>
      <div class="ss-row">
        <input v-model.number="latInput" type="number" step="0.01" min="-90" max="90" class="ss-input ss-num" placeholder="纬度" />
        <input v-model.number="lngInput" type="number" step="0.01" min="-180" max="180" class="ss-input ss-num" placeholder="经度" />
        <button class="ss-btn" :disabled="latInput === null || lngInput === null || !isFinite(latInput) || !isFinite(lngInput)" @click="applyLocation">定位</button>
        <button class="ss-btn" :disabled="lat === null && lng === null" @click="clearLocation()">清除</button>
      </div>
      <p v-if="lat === null || lng === null" class="ss-hint">未设置位置，将使用自定义夜间时段判断。</p>
      <div v-else class="ss-times">
        <span class="ss-time">日出 {{ fmt(sunrise) }}</span>
        <span class="ss-time">日落 {{ fmt(sunset) }}</span>
        <span v-if="nextMinutes > 0" class="ss-time">距下次切换 {{ nextMinutes }} 分钟</span>
      </div>
    </div>

    <div class="ss-block">
      <span class="ss-block-label">自定义夜间时段（无定位回退）</span>
      <div class="ss-row">
        <input :value="customNightStart ?? ''" type="time" class="ss-input" @change="onStartChange" />
        <span class="ss-sep">→</span>
        <input :value="customNightEnd ?? ''" type="time" class="ss-input" @change="onEndChange" />
      </div>
      <div class="ss-row">
        <span class="ss-block-label" style="margin:0">夜间预设</span>
        <select :value="autoPreset" class="ss-select" @change="onPresetChange">
          <option v-for="p in EYE_PRESETS" :key="p.id" :value="p.id">{{ p.icon }} {{ p.label }}</option>
        </select>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSunSchedule } from '../modules/guard/sun-schedule'
import { EYE_PRESETS } from '../modules/guard/eye-care'

const {
  state,
  load,
  setLocation,
  clearLocation,
  setAutoEnabled,
  setAutoPreset,
  setCustomTimes,
  shouldEnableEyeCare,
  todayTimes,
  minutesToNext,
} = useSunSchedule()

onMounted(() => load())

const latInput = ref<number | null>(null)
const lngInput = ref<number | null>(null)

const autoEnabled = computed(() => state.value.autoEnabled)
const lat = computed(() => state.value.lat)
const lng = computed(() => state.value.lng)
const autoPreset = computed(() => state.value.autoPreset)
const customNightStart = computed(() => state.value.customNightStart)
const customNightEnd = computed(() => state.value.customNightEnd)

const nightNow = computed(() => shouldEnableEyeCare())
const nextMinutes = computed(() => minutesToNext())
const times = computed(() => todayTimes())
const sunrise = computed(() => times.value?.sunrise ?? null)
const sunset = computed(() => times.value?.sunset ?? null)

function fmt(d: Date | null): string {
  if (!d) return '--:--'
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function applyLocation() {
  if (latInput.value === null || lngInput.value === null) return
  if (!isFinite(latInput.value) || !isFinite(lngInput.value)) return
  setLocation(latInput.value, lngInput.value)
}

function onStartChange(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  setCustomTimes(v, state.value.customNightEnd)
}
function onEndChange(e: Event) {
  const v = (e.target as HTMLInputElement).value || null
  setCustomTimes(state.value.customNightStart, v)
}
function onPresetChange(e: Event) {
  setAutoPreset((e.target as HTMLSelectElement).value)
}
</script>

<style scoped>
.ss-panel {
  margin: 22px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.ss-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.ss-panel-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.ss-panel-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.ss-status {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 224, 216, 0.08);
  color: var(--text-dim);
}
.ss-status.on {
  background: rgba(240, 192, 64, 0.15);
  color: #f0c040;
}
.ss-block {
  padding: 12px 0;
  border-top: 1px dashed var(--border);
}
.ss-block:first-of-type {
  border-top: none;
}
.ss-block-label {
  display: inline-block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
  margin-bottom: 10px;
}
.ss-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ss-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.ss-btn:hover {
  border-color: var(--accent);
  color: var(--text-high);
}
.ss-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ss-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
  font-weight: 600;
}
.ss-btn-primary:hover {
  color: var(--bg);
  opacity: 0.9;
}
.ss-input {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-high);
  font-size: 13px;
}
.ss-num {
  width: 90px;
}
.ss-select {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-high);
  font-size: 13px;
}
.ss-sep {
  color: var(--text-dim);
  font-size: 13px;
}
.ss-hint {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
.ss-times {
  display: flex;
  gap: 14px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.ss-time {
  font-size: 13px;
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
</style>
