<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDecisionWheel } from '../modules/decision-wheel'
import type { WheelOption } from '../modules/decision-wheel'

const { options, history, canSpin, addOption, removeOption, spin, clearHistory, resetOptions } =
  useDecisionWheel()

const SECTOR_COLORS = [
  '#c98a5a',
  '#8a9a7a',
  '#b5785f',
  '#a98a4f',
  '#7f9aa8',
  '#c46a5a',
  '#9a7fae',
  '#6f9c8c',
]

const rotation = ref(0)
const spinning = ref(false)
const result = ref<string | null>(null)
const newLabel = ref('')

const sectorAngle = computed(() => (options.value.length ? 360 / options.value.length : 360))

interface Sector {
  d: string
  fill: string
  label: string
  labelX: number
  labelY: number
  labelRot: number
}

function pointOnWheel(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180
  return { x: 100 + radius * Math.sin(rad), y: 100 - radius * Math.cos(rad) }
}

const sectors = computed<Sector[]>(() => {
  const list = options.value
  const n = list.length
  if (n < 2) return []
  const step = 360 / n
  const R = 100
  return list.map((opt, i) => {
    const a0 = i * step
    const a1 = a0 + step
    const p0 = pointOnWheel(a0, R)
    const p1 = pointOnWheel(a1, R)
    const large = step > 180 ? 1 : 0
    const mid = a0 + step / 2
    const lp = pointOnWheel(mid, 66)
    return {
      d: `M100,100 L${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${R},${R} 0 ${large},1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)} Z`,
      fill: SECTOR_COLORS[i % SECTOR_COLORS.length],
      label: opt.label.length > 7 ? `${opt.label.slice(0, 7)}…` : opt.label,
      labelX: lp.x,
      labelY: lp.y,
      labelRot: mid,
    }
  })
})

function doSpin() {
  if (spinning.value || !canSpin.value) return
  const res = spin()
  if (!res) return
  spinning.value = true
  result.value = null
  const step = sectorAngle.value
  const centerAngle = res.index * step + step / 2
  const desired = 360 - centerAngle
  const base = Math.floor(rotation.value / 360) * 360
  rotation.value = base + 360 * 6 + desired
  window.setTimeout(() => {
    spinning.value = false
    result.value = res.option.label
  }, 4200)
}

function onAdd() {
  if (addOption(newLabel.value)) newLabel.value = ''
}

function onRemove(opt: WheelOption) {
  if (spinning.value) return
  removeOption(opt.id)
}
</script>

<template>
  <section class="dw-panel">
    <header class="dw-head">
      <div class="dw-head-text">
        <span class="dw-kicker">幕僚 · 决策</span>
        <h3 class="dw-title">决定转盘</h3>
      </div>
      <span class="dw-count">{{ options.length }} 个选项</span>
    </header>

    <div class="dw-stage">
      <div class="dw-pointer" aria-hidden="true"></div>

      <div class="dw-wheel-wrap">
        <div
          v-if="sectors.length"
          class="dw-disc"
          :class="{ 'is-spinning': spinning }"
          :style="{ transform: `rotate(${rotation}deg)` }"
        >
          <svg class="dw-svg" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="100" fill="#241c16" />
            <path v-for="(s, i) in sectors" :key="i" :d="s.d" :fill="s.fill" stroke="rgba(20,14,10,0.55)" stroke-width="0.8" />
            <text
              v-for="(s, i) in sectors"
              :key="'t' + i"
              class="dw-sector-label"
              :x="s.labelX"
              :y="s.labelY"
              :transform="`rotate(${s.labelRot} ${s.labelX} ${s.labelY})`"
            >{{ s.label }}</text>
            <circle cx="100" cy="100" r="15" fill="#2f241b" stroke="rgba(212,163,90,0.6)" stroke-width="1.4" />
          </svg>
        </div>
        <p v-else class="dw-need">至少保留两个选项才能转盘。</p>
      </div>

      <button class="dw-spin" type="button" :disabled="!canSpin || spinning" @click="doSpin">
        {{ spinning ? '转…' : '转一转' }}
      </button>
    </div>

    <transition name="dw-pop">
      <p v-if="result" class="dw-result">转盘决定：<strong>{{ result }}</strong></p>
    </transition>

    <div class="dw-manage">
      <div class="dw-add">
        <input
          v-model="newLabel"
          class="dw-input"
          type="text"
          maxlength="20"
          placeholder="添加一个选项…"
          @keydown.enter="onAdd"
        />
        <button class="dw-add-btn" type="button" @click="onAdd">添加</button>
      </div>
      <ul class="dw-options">
        <li v-for="opt in options" :key="opt.id" class="dw-option">
          <span class="dw-option-label">{{ opt.label }}</span>
          <button
            class="dw-option-del"
            type="button"
            :disabled="options.length <= 2 || spinning"
            aria-label="移除选项"
            @click="onRemove(opt)"
          >×</button>
        </li>
      </ul>
      <button class="dw-reset" type="button" :disabled="spinning" @click="resetOptions">恢复默认选项</button>
    </div>

    <div class="dw-history">
      <div class="dw-history-head">
        <span class="dw-history-title">转动留痕</span>
        <button v-if="history.length" class="dw-history-clear" type="button" @click="clearHistory">清空</button>
      </div>
      <ul v-if="history.length" class="dw-history-list">
        <li v-for="h in history" :key="h.id" class="dw-history-item">
          <span class="dw-history-label">{{ h.label }}</span>
        </li>
      </ul>
      <p v-else class="dw-history-empty">还没有转过，试试手气。</p>
    </div>
  </section>
</template>

<style scoped>
.dw-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(212, 163, 90, 0.28);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(52, 40, 30, 0.55), rgba(36, 28, 22, 0.5));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.2);
  color: #f2e7d6;
}

.dw-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.dw-kicker {
  font-size: 12px;
  letter-spacing: 0.12em;
  color: #d4a35a;
  opacity: 0.9;
}

.dw-title {
  margin: 2px 0 0;
  font-size: 17px;
  font-weight: 600;
  color: #f7eddb;
}

.dw-count {
  flex: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(212, 163, 90, 0.16);
  font-size: 12px;
  color: #e2c290;
  font-variant-numeric: tabular-nums;
}

.dw-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 10px 0 4px;
}

.dw-pointer {
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 11px solid transparent;
  border-right: 11px solid transparent;
  border-top: 18px solid #d4a35a;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.45));
  z-index: 3;
}

.dw-wheel-wrap {
  position: relative;
  width: 220px;
  height: 220px;
}

.dw-disc {
  width: 100%;
  height: 100%;
  transition: transform 4.2s cubic-bezier(0.17, 0.67, 0.12, 1);
  will-change: transform;
}

.dw-svg { width: 100%; height: 100%; display: block; }

.dw-sector-label {
  fill: #fbf3e6;
  font-size: 11px;
  text-anchor: middle;
  dominant-baseline: middle;
  letter-spacing: 0.02em;
  pointer-events: none;
}

.dw-need {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  margin: 0;
  text-align: center;
  font-size: 13px;
  color: #cbb79a;
}

.dw-spin {
  padding: 9px 34px;
  border-radius: 999px;
  border: 1px solid rgba(212, 163, 90, 0.55);
  background: linear-gradient(160deg, rgba(212, 163, 90, 0.9), rgba(176, 126, 60, 0.9));
  color: #2a1d10;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.08em;
  cursor: pointer;
  transition: transform 0.12s ease, box-shadow 0.15s ease;
}

.dw-spin:hover:not(:disabled) { box-shadow: 0 0 16px rgba(212, 163, 90, 0.45); }
.dw-spin:active:not(:disabled) { transform: scale(0.95); }
.dw-spin:disabled { opacity: 0.45; cursor: not-allowed; }

.dw-result {
  margin: 16px 0 0;
  text-align: center;
  font-size: 14px;
  color: #e2c290;
}

.dw-result strong {
  color: #f7eddb;
  font-size: 17px;
}

.dw-pop-enter-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.dw-pop-enter-from { opacity: 0; transform: translateY(6px); }

.dw-manage { margin-top: 16px; }

.dw-add { display: flex; gap: 8px; }

.dw-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid rgba(212, 163, 90, 0.3);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  color: #f2e7d6;
  font-size: 13px;
}

.dw-input::placeholder { color: #a8937a; }

.dw-add-btn {
  flex: none;
  padding: 8px 16px;
  border: 1px solid rgba(212, 163, 90, 0.4);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: #e2c290;
  font-size: 13px;
  cursor: pointer;
}

.dw-add-btn:hover { background: rgba(212, 163, 90, 0.18); }

.dw-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.dw-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px 4px 11px;
  border: 1px solid rgba(212, 163, 90, 0.26);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.16);
  font-size: 12px;
  color: #e7d6bb;
}

.dw-option-del {
  width: 18px;
  height: 18px;
  line-height: 1;
  border: none;
  border-radius: 50%;
  background: rgba(196, 106, 90, 0.28);
  color: #f0c6bb;
  font-size: 13px;
  cursor: pointer;
}

.dw-option-del:disabled { opacity: 0.35; cursor: not-allowed; }

.dw-reset {
  margin-top: 12px;
  padding: 5px 12px;
  border: 1px solid rgba(212, 163, 90, 0.24);
  border-radius: 8px;
  background: none;
  color: #c2ad8d;
  font-size: 12px;
  cursor: pointer;
}

.dw-reset:hover { color: #e2c290; }

.dw-history { margin-top: 16px; border-top: 1px solid rgba(212, 163, 90, 0.16); padding-top: 12px; }

.dw-history-head { display: flex; align-items: center; justify-content: space-between; }

.dw-history-title { font-size: 12px; letter-spacing: 0.1em; color: #d4a35a; opacity: 0.85; }

.dw-history-clear {
  border: none;
  background: none;
  color: #b39a78;
  font-size: 12px;
  cursor: pointer;
}

.dw-history-list { margin: 10px 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }

.dw-history-item {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(212, 163, 90, 0.12);
  font-size: 12px;
  color: #dcc9a8;
}

.dw-history-empty { margin: 10px 0 0; font-size: 12px; color: #a8937a; }
</style>
