<template>
  <section class="slk-panel">
    <header class="slk-head">
      <div>
        <h4 class="slk-title">🐟 摸鱼计算机 · 下班倒计时</h4>
        <p class="slk-hint">把「上班挣的钱」和「摸的鱼」都摊开给自己看</p>
      </div>
      <span class="slk-phase" :class="phaseClass">{{ phaseText }}</span>
    </header>

    <div class="slk-grid">
      <div class="slk-cell">
        <span class="slk-num">¥{{ earnedText }}</span>
        <span class="slk-label">今日已赚</span>
      </div>
      <div class="slk-cell">
        <span class="slk-num">{{ offText }}</span>
        <span class="slk-label">{{ countdownLabel }}</span>
      </div>
      <div class="slk-cell">
        <span class="slk-num">{{ slackingText }}</span>
        <span class="slk-label">今日摸鱼</span>
      </div>
    </div>

    <!-- 上班进度 -->
    <div class="slk-progress" :aria-label="`今日上班进度 ${Math.round(progress * 100)}%`">
      <div class="slk-progress-fill" :style="{ width: (progress * 100) + '%' }"></div>
    </div>

    <!-- 摸鱼计时控制 -->
    <div class="slk-controls">
      <button v-if="!isSlacking" class="slk-btn" @click="startSlacking">开始摸鱼</button>
      <button v-else class="slk-btn slk-btn-stop" @click="stopSlacking">收手（记账）</button>
      <button class="slk-btn slk-btn-ghost" :disabled="slackingMs === 0 && !isSlacking" @click="resetSlacking">清零</button>
    </div>

    <!-- 设置 -->
    <details class="slk-settings">
      <summary>⚙️ 设置（时薪 / 班次）</summary>
      <div class="slk-form">
        <label class="slk-field">
          <span>时薪 ¥/时</span>
          <input class="slk-input" type="number" min="0" max="9999" :value="config.hourlyRate" @change="onRate" />
        </label>
        <label class="slk-field">
          <span>上班（时）</span>
          <input class="slk-input" type="number" min="0" max="23" :value="config.workStartHour" @change="onStart" />
        </label>
        <label class="slk-field">
          <span>下班（时）</span>
          <input class="slk-input" type="number" min="0" max="23" :value="config.offWorkHour" @change="onOff" />
        </label>
      </div>
      <p class="slk-tip">时薪仅用于趣味估算，不连接真实账本；改班次实时影响倒计时。</p>
    </details>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useSlackingWage } from '../modules/slacking'

const slk = useSlackingWage()

const config = slk.config
const working = slk.working
const earned = slk.earned
const msToOff = slk.msToOff
const progress = slk.progress
const slackingMs = slk.slackingMs
const isSlacking = slk.isSlacking

const earnedText = computed(() => earned.value.toFixed(2))

const phaseText = computed(() => {
  if (working.value) return '上班中'
  // 用当前时钟判断是「还没上班」还是「已下班」
  const h = slk.now.value.getHours() + slk.now.value.getMinutes() / 60
  return h < config.workStartHour ? '还没上班' : '已下班'
})
const phaseClass = computed(() => (working.value ? 'slk-phase-on' : 'slk-phase-off'))

const countdownLabel = computed(() => (working.value ? '距下班' : '距下班（非工时）'))
const offText = computed(() => formatMs(msToOff.value))
const slackingText = computed(() => formatMs(slackingMs.value))

function formatMs(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function onRate(e: Event) {
  slk.setHourlyRate(Number((e.target as HTMLInputElement).value))
}
function onStart(e: Event) {
  slk.setWorkStart(Number((e.target as HTMLInputElement).value))
}
function onOff(e: Event) {
  slk.setOffWork(Number((e.target as HTMLInputElement).value))
}
function startSlacking() {
  slk.startSlacking()
}
function stopSlacking() {
  slk.stopSlacking()
}
function resetSlacking() {
  slk.resetSlacking()
}

// 实时刷新（让倒计时 / 已赚走动），1s 一跳
let timer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  slk.refresh()
  timer = setInterval(() => slk.refresh(), 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.slk-panel {
  margin: 0 0 16px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
}
.slk-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}
.slk-title {
  margin: 0;
  font-size: 14px;
  color: var(--accent);
}
.slk-hint {
  margin: 3px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}
.slk-phase {
  flex-shrink: 0;
  font-size: 11px;
  padding: 3px 9px;
  border-radius: 999px;
  white-space: nowrap;
}
.slk-phase-on {
  color: #8ab4ff;
  background: rgba(138, 180, 255, 0.12);
}
.slk-phase-off {
  color: rgba(var(--text-medium-rgb), 0.7);
  background: rgba(var(--accent-rgb), 0.06);
}

.slk-grid {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.slk-cell {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.6);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.slk-num {
  font-size: 19px;
  font-weight: 600;
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
.slk-label {
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.45);
}

.slk-progress {
  height: 6px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
  margin-bottom: 12px;
}
.slk-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  transition: width 0.4s ease;
}

.slk-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.slk-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.slk-btn:hover {
  background: rgba(var(--accent-rgb), 0.16);
}
.slk-btn-stop {
  border-color: rgba(224, 108, 108, 0.4);
  background: rgba(224, 108, 108, 0.12);
  color: #e08c8c;
}
.slk-btn-ghost {
  border-color: rgba(var(--accent-rgb), 0.12);
  background: transparent;
  color: rgba(var(--text-medium-rgb), 0.7);
}
.slk-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.slk-settings {
  margin-top: 4px;
}
.slk-settings > summary {
  font-size: 12px;
  color: rgba(var(--text-primary-rgb), 0.55);
  cursor: pointer;
  user-select: none;
}
.slk-form {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}
.slk-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.55);
}
.slk-input {
  width: 84px;
  padding: 7px 9px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.6);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.slk-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.slk-tip {
  margin: 8px 0 0;
  font-size: 11px;
  color: rgba(var(--text-primary-rgb), 0.35);
}
</style>
