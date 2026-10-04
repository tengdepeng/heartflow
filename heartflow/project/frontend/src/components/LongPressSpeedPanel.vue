<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'
import {
  useLongPressSpeed,
  computeSpeed,
  computeProgress,
  MIN_BASE_SPEED,
  MAX_BASE_SPEED,
  MIN_HOLD_SPEED,
  MAX_HOLD_SPEED,
  MIN_RAMP_MS,
  MAX_RAMP_MS,
} from '../modules/long-press-speed'

const {
  enabled,
  baseSpeed,
  holdSpeed,
  rampMs,
  ripple,
  setEnabled,
  setBaseSpeed,
  setHoldSpeed,
  setRampMs,
  toggleRipple,
  reset,
} = useLongPressSpeed()

const holding = ref(false)
const elapsed = ref(0)
let startAt = 0
let timer: number | null = null

const cfg = computed(() => ({
  enabled: enabled.value,
  baseSpeed: baseSpeed.value,
  holdSpeed: holdSpeed.value,
  rampMs: rampMs.value,
  ripple: ripple.value,
}))

const liveSpeed = computed(() => (holding.value ? computeSpeed(elapsed.value, cfg.value) : baseSpeed.value))
const progress = computed(() => (holding.value ? computeProgress(elapsed.value, cfg.value) : 0))

function stop() {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
}

function tick() {
  elapsed.value = Date.now() - startAt
}

function startHold() {
  if (!enabled.value) return
  holding.value = true
  startAt = Date.now()
  elapsed.value = 0
  stop()
  timer = window.setInterval(tick, 50)
}

function endHold() {
  holding.value = false
  elapsed.value = 0
  stop()
}

onBeforeUnmount(stop)

function onBaseRange(e: Event) {
  setBaseSpeed(Number((e.target as HTMLInputElement).value))
}

function onHoldRange(e: Event) {
  setHoldSpeed(Number((e.target as HTMLInputElement).value))
}

function onRampRange(e: Event) {
  setRampMs(Number((e.target as HTMLInputElement).value))
}

function onReset() {
  endHold()
  reset()
}
</script>

<template>
  <section class="lps-panel">
    <header class="lps-head">
      <span class="lps-kicker">阅览 · 交互范式</span>
      <h3 class="lps-title">长按变速</h3>
      <p class="lps-sub">按住内容区，速度由基准线性爬升至按住倍速；松手回落</p>
    </header>

    <div
      class="lps-target"
      :class="{ holding }"
      @pointerdown="startHold"
      @pointerup="endHold"
      @pointerleave="endHold"
    >
      <span
        v-if="ripple"
        class="lps-ripple"
        :style="{ transform: `translate(-50%, -50%) scale(${1 + progress * 0.8})`, opacity: holding ? 0.5 - progress * 0.25 : 0 }"
      />
      <span class="lps-target-text">按住此处体验加速</span>
      <span class="lps-badge" :class="{ holding }">{{ liveSpeed.toFixed(1) }}x</span>
      <span class="lps-hint" :class="{ show: holding }">长按加速中</span>
    </div>

    <div class="lps-progress">
      <span class="lps-progress-fill" :style="{ width: progress * 100 + '%' }" />
    </div>

    <div class="lps-controls">
      <label class="lps-check">
        <input type="checkbox" :checked="enabled" @change="setEnabled(!enabled)" />
        <span>启用长按变速</span>
      </label>
      <label class="lps-check">
        <input type="checkbox" :checked="ripple" @change="toggleRipple" />
        <span>涟漪反馈</span>
      </label>
    </div>

    <div class="lps-fields">
      <div class="lps-field">
        <span class="lps-label">基准 {{ baseSpeed.toFixed(1) }}x</span>
        <input
          class="lps-range"
          type="range"
          :min="MIN_BASE_SPEED"
          :max="MAX_BASE_SPEED"
          :step="0.1"
          :value="baseSpeed"
          @input="onBaseRange"
        />
      </div>
      <div class="lps-field">
        <span class="lps-label">按住 {{ holdSpeed.toFixed(1) }}x</span>
        <input
          class="lps-range"
          type="range"
          :min="MIN_HOLD_SPEED"
          :max="MAX_HOLD_SPEED"
          :step="0.5"
          :value="holdSpeed"
          @input="onHoldRange"
        />
      </div>
      <div class="lps-field">
        <span class="lps-label">爬升 {{ (rampMs / 1000).toFixed(2) }}s</span>
        <input
          class="lps-range"
          type="range"
          :min="MIN_RAMP_MS"
          :max="MAX_RAMP_MS"
          :step="50"
          :value="rampMs"
          @input="onRampRange"
        />
      </div>
    </div>

    <button class="lps-reset" type="button" @click="onReset">恢复默认</button>
  </section>
</template>

<style scoped>
.lps-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.lps-head { margin-bottom: 14px; }
.lps-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.lps-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }
.lps-sub { margin: 6px 0 0; font-size: 12px; color: rgba(var(--accent-rgb), 0.55); }

.lps-target {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  touch-action: none;
  transition: background 0.2s ease;
}

.lps-target.holding { background: rgba(var(--accent-rgb), 0.14); }

.lps-target-text { font-size: 13px; color: rgba(var(--accent-rgb), 0.6); }

.lps-ripple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.5), transparent 70%);
  pointer-events: none;
  transition: transform 0.12s linear, opacity 0.12s linear;
}

.lps-badge {
  position: absolute;
  right: 14px;
  top: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.3);
  color: rgba(var(--accent-rgb), 0.85);
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s ease, transform 0.2s ease;
}

.lps-badge.holding { background: var(--accent); color: var(--bg-primary); transform: scale(1.08); }

.lps-hint {
  position: absolute;
  left: 14px;
  bottom: 12px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.lps-hint.show { opacity: 1; }

.lps-progress {
  height: 4px;
  margin-top: 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.lps-progress-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--accent);
  transition: width 0.12s linear;
}

.lps-controls { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; }

.lps-check { display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer; }
.lps-check input { accent-color: var(--accent); }

.lps-fields { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
.lps-field { flex: 1; min-width: 150px; display: flex; flex-direction: column; gap: 6px; }
.lps-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }
.lps-range { width: 100%; accent-color: var(--accent); }

.lps-reset {
  display: block;
  margin: 16px auto 0;
  padding: 5px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  border-radius: 8px;
  background: none;
  color: rgba(var(--accent-rgb), 0.7);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.lps-reset:hover { color: var(--text-primary); }
</style>
