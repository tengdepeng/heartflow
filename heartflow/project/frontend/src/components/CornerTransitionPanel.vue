<script setup lang="ts">
// ============================================================
// 全局 UI · 角落缩放展开转场（演示面板）
// 四个角落各一个触发按钮，点击后弹层从该按钮中心生长展开；
// 可调时长 / 起始缩放 / 原点模式（跟随触发元素或固定角落）。
// 借鉴 96 APK anim grow_from_*/shrink_from_*（8 向）转场。
// ============================================================
import { ref, computed } from 'vue'
import {
  useCornerTransition,
  CORNERS,
  MIN_DURATION,
  MAX_DURATION,
  MIN_SCALE,
  MAX_SCALE,
} from '../modules/corner-transition'
import type { Corner, CornerMode } from '../modules/corner-transition'
import CornerGrowModal from './CornerGrowModal.vue'

const { durationMs, scaleFrom, mode, setDuration, setScaleFrom, setMode, reset } = useCornerTransition()

const open = ref(false)
const activeId = ref<Corner | null>(null)
const triggerEls: Record<string, HTMLElement> = {}

function setTrigger(id: string, el: unknown): void {
  if (el instanceof HTMLElement) triggerEls[id] = el
}

const activeTrigger = computed<HTMLElement | null>(() =>
  activeId.value ? triggerEls[activeId.value] ?? null : null,
)
const activeLabel = computed(
  () => CORNERS.find((c) => c.id === activeId.value)?.label ?? '中心',
)

function openFrom(corner: Corner): void {
  activeId.value = corner
  open.value = true
}

function onDuration(e: Event): void {
  setDuration(Number((e.target as HTMLInputElement).value))
}
function onScale(e: Event): void {
  setScaleFrom(Number((e.target as HTMLInputElement).value))
}
function onMode(e: Event): void {
  setMode((e.target as HTMLSelectElement).value as CornerMode)
}
function onReset(): void {
  open.value = false
  activeId.value = null
  reset()
}
</script>

<template>
  <section class="ctp-panel">
    <header class="ctp-head">
      <span class="ctp-kicker">全局 UI · 弹层转场</span>
      <h3 class="ctp-title">角落缩放展开</h3>
      <p class="ctp-sub">弹层从被点元素的角落生长展开、收缩归位（8 向 grow / shrink）</p>
    </header>

    <div class="ctp-canvas">
      <button
        v-for="c in CORNERS"
        :key="c.id"
        :ref="(el) => setTrigger(c.id, el)"
        class="ctp-trigger"
        :class="'is-' + c.id"
        type="button"
        @click="openFrom(c.id)"
      >{{ c.label }}</button>
      <span class="ctp-hint">点击任一角落按钮，观察弹层生长方向</span>
    </div>

    <div class="ctp-controls">
      <label class="ctp-field">
        <span class="ctp-label">时长 {{ durationMs }}ms</span>
        <input
          class="ctp-range"
          type="range"
          :min="MIN_DURATION"
          :max="MAX_DURATION"
          :step="20"
          :value="durationMs"
          @input="onDuration"
        />
      </label>
      <label class="ctp-field">
        <span class="ctp-label">起始缩放 {{ scaleFrom.toFixed(2) }}</span>
        <input
          class="ctp-range"
          type="range"
          :min="MIN_SCALE"
          :max="MAX_SCALE"
          :step="0.01"
          :value="scaleFrom"
          @input="onScale"
        />
      </label>
      <label class="ctp-field ctp-field-row">
        <span class="ctp-label">原点</span>
        <select class="ctp-select" :value="mode" @change="onMode">
          <option value="auto">跟随触发元素</option>
          <option v-for="c in CORNERS" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>
      </label>
    </div>

    <button class="ctp-reset" type="button" @click="onReset">恢复默认</button>

    <CornerGrowModal
      :open="open"
      :trigger="activeTrigger"
      :mode="mode"
      :duration-ms="durationMs"
      :scale-from="scaleFrom"
      @close="open = false"
    >
      <h4 class="ctp-modal-title">从「{{ activeLabel }}」展开</h4>
      <p class="ctp-modal-text">
        transform-origin 指向触发元素中心，弹层由 {{ scaleFrom.toFixed(2) }} 生长到 1，历时 {{ durationMs }}ms。
      </p>
    </CornerGrowModal>
  </section>
</template>

<style scoped>
.ctp-panel {
  margin: 18px 0;
  padding: 18px 20px 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(var(--bg-card-rgb), 0.55), rgba(var(--bg-card-rgb), 0.4));
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
  color: var(--text-primary);
}

.ctp-head { margin-bottom: 14px; }
.ctp-kicker { font-size: 12px; letter-spacing: 0.12em; color: rgba(var(--accent-rgb), 0.7); }
.ctp-title { margin: 2px 0 0; font-size: 17px; font-weight: 600; }
.ctp-sub { margin: 6px 0 0; font-size: 12px; color: rgba(var(--accent-rgb), 0.55); }

.ctp-canvas {
  position: relative;
  height: 190px;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  box-shadow: inset 0 0 0 1px rgba(var(--accent-rgb), 0.12);
}

.ctp-trigger {
  position: absolute;
  padding: 7px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: rgba(var(--accent-rgb), 0.9);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}
.ctp-trigger:hover { background: rgba(var(--accent-rgb), 0.22); transform: scale(1.05); }
.ctp-trigger.is-top-left { left: 14px; top: 14px; }
.ctp-trigger.is-top-right { right: 14px; top: 14px; }
.ctp-trigger.is-bottom-left { left: 14px; bottom: 14px; }
.ctp-trigger.is-bottom-right { right: 14px; bottom: 14px; }

.ctp-hint {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.45);
  white-space: nowrap;
}

.ctp-controls { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 14px; }
.ctp-field { flex: 1; min-width: 140px; display: flex; flex-direction: column; gap: 6px; }
.ctp-field-row { flex-direction: row; align-items: center; justify-content: space-between; }
.ctp-label { font-size: 11px; color: rgba(var(--accent-rgb), 0.6); }
.ctp-range { width: 100%; accent-color: var(--accent); }
.ctp-select {
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.24);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
}

.ctp-reset {
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
.ctp-reset:hover { color: var(--text-primary); }

.ctp-modal-title { margin: 0 0 8px; font-size: 15px; font-weight: 600; }
.ctp-modal-text { margin: 0; font-size: 12px; line-height: 1.7; color: rgba(var(--accent-rgb), 0.7); }
</style>
