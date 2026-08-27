<template>
  <section class="ec-panel" aria-label="护眼模式">
    <div class="ec-panel-head">
      <span class="ec-panel-title">👁 护眼模式</span>
      <span class="ec-panel-sub">蓝光过滤 · 灰度 · 亮度遮罩</span>
      <span class="ec-status" :class="{ on: enabled }">{{ enabled ? '已开启' : '已关闭' }}</span>
    </div>

    <div class="ec-block">
      <span class="ec-block-label">预设组合</span>
      <div class="ec-row ec-wrap">
        <button
          v-for="p in EYE_PRESETS"
          :key="p.id"
          class="ec-chip"
          @click="applyPreset(p.id)"
        >
          <span class="ec-chip-icon">{{ p.icon }}</span>{{ p.label }}
        </button>
      </div>
      <div class="ec-row">
        <button class="ec-btn ec-btn-primary" @click="toggleEnabled()">
          {{ enabled ? '关闭护眼' : '开启护眼' }}
        </button>
        <button class="ec-btn" @click="reset()">重置</button>
      </div>
    </div>

    <div class="ec-block">
      <span class="ec-block-label">微调</span>
      <div class="ec-slider-row">
        <span class="ec-slider-label">蓝光过滤</span>
        <input type="range" min="0" max="100" :value="blueLight" @input="onBlueLight" />
        <span class="ec-slider-val">{{ blueLight }}</span>
      </div>
      <div class="ec-slider-row">
        <span class="ec-slider-label">灰度</span>
        <input type="range" min="0" max="100" :value="grayscale" @input="onGrayscale" />
        <span class="ec-slider-val">{{ grayscale }}</span>
      </div>
      <div class="ec-slider-row">
        <span class="ec-slider-label">亮度遮罩</span>
        <input type="range" min="0" max="80" :value="brightness" @input="onBrightness" />
        <span class="ec-slider-val">{{ brightness }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useEyeCare, EYE_PRESETS } from '../modules/guard/eye-care'

const {
  enabled,
  blueLight,
  grayscale,
  brightness,
  load,
  toggleEnabled,
  setBlueLight,
  setGrayscale,
  setBrightness,
  applyPreset,
  reset,
} = useEyeCare()

onMounted(() => load())

function onBlueLight(e: Event) {
  setBlueLight(Number((e.target as HTMLInputElement).value))
}
function onGrayscale(e: Event) {
  setGrayscale(Number((e.target as HTMLInputElement).value))
}
function onBrightness(e: Event) {
  setBrightness(Number((e.target as HTMLInputElement).value))
}
</script>

<style scoped>
.ec-panel {
  margin: 22px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.ec-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}
.ec-panel-title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-high);
}
.ec-panel-sub {
  font-size: 12px;
  color: var(--text-dim);
}
.ec-status {
  margin-left: auto;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(232, 224, 216, 0.08);
  color: var(--text-dim);
}
.ec-status.on {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
}
.ec-block {
  padding: 12px 0;
  border-top: 1px dashed var(--border);
}
.ec-block:first-of-type {
  border-top: none;
}
.ec-block-label {
  display: block;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-medium);
  margin-bottom: 10px;
}
.ec-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ec-wrap {
  flex-wrap: wrap;
}
.ec-chip {
  padding: 6px 12px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.ec-chip:hover {
  border-color: var(--accent);
  color: var(--text-high);
}
.ec-chip-icon {
  margin-right: 4px;
}
.ec-btn {
  padding: 7px 16px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-medium);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.ec-btn:hover {
  border-color: var(--accent);
  color: var(--text-high);
}
.ec-btn-primary {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--bg);
  font-weight: 600;
}
.ec-btn-primary:hover {
  color: var(--bg);
  opacity: 0.9;
}
.ec-slider-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}
.ec-slider-label {
  flex: 0 0 88px;
  font-size: 12px;
  color: var(--text-medium);
}
.ec-slider-row input[type='range'] {
  flex: 1;
  accent-color: var(--accent);
}
.ec-slider-val {
  flex: 0 0 34px;
  text-align: right;
  font-size: 13px;
  color: var(--text-high);
  font-variant-numeric: tabular-nums;
}
</style>
