<template>
  <div class="timer-controls">
    <div class="timer-status" :class="`timer-status--${statusTone}`">
      <span class="timer-status__dot" />
      <span class="timer-status__label">{{ statusLabel }}</span>
      <span class="timer-status__meta">{{ modeMeta }}</span>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button
        v-for="m in modes"
        :key="m.key"
        :class="['mode-tab', { active: currentMode === m.key }]"
        type="button"
        @click="$emit('switchMode', m.key)"
      >
        {{ m.label }}
      </button>
    </div>

    <!-- Timer Display -->
    <div class="timer-display">
      <span class="time-caption">{{ modeLabel }}</span>
      <span class="time">{{ displayTime }}</span>
      <span class="time-progress">已流动 {{ progressPercent }}%</span>
    </div>

    <!-- Progress Ring -->
    <svg class="progress-ring" :viewBox="`0 0 120 120`" width="200" height="200">
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        stroke="var(--border)"
        stroke-width="3"
      />
      <circle
        cx="60" cy="60" r="52"
        fill="none"
        :stroke="ringColor"
        stroke-width="3"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90, 60, 60)"
        class="progress-fill"
      />
    </svg>

    <!-- Controls -->
    <div class="action-row">
      <button class="btn btn-primary" type="button" @click="$emit('toggle')">
        {{ isRunning ? '停一停' : isPaused ? '接续' : '开始流动' }}
      </button>
      <button class="btn btn-secondary" type="button" :disabled="!canReset" @click="$emit('reset')">
        归零
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  displayTime: string
  isRunning: boolean
  isPaused: boolean
  currentMode: string
  remainingSeconds: number
  totalSeconds: number
}>()

defineEmits<{
  toggle: []
  reset: []
  switchMode: [mode: string]
}>()

const modes = [
  { key: 'focus', label: '🍅 专注' },
  { key: 'nap',   label: '☕ 小憩' },
  { key: 'free',  label: '✨ 自由' },
]

const circumference = 2 * Math.PI * 52

const dashOffset = computed(() => {
  const total = props.totalSeconds || 1500
  const ratio = Math.max(0, Math.min(1, props.remainingSeconds / total))
  return circumference * (1 - ratio)
})

const ringColor = computed(() => {
  switch (props.currentMode) {
    case 'focus': return 'var(--accent)'
    case 'nap':   return 'var(--accent-cyan)'
    case 'free':  return 'var(--accent-purple)'
    default:      return 'var(--accent)'
  }
})

const modeLabel = computed(() => {
  switch (props.currentMode) {
    case 'focus': return '专注模式'
    case 'nap': return '小憩模式'
    case 'free': return '自由模式'
    default: return '计时模式'
  }
})

const statusLabel = computed(() => {
  if (props.isRunning) return '正在流动'
  if (props.isPaused) return '暂时停驻'
  return '等待开始'
})

const statusTone = computed(() => {
  if (props.isRunning) return 'running'
  if (props.isPaused) return 'paused'
  return 'idle'
})

const modeMeta = computed(() => `剩余 ${Math.max(0, props.remainingSeconds)} 秒`)

const progressPercent = computed(() => {
  const total = props.totalSeconds || 1500
  const ratio = Math.max(0, Math.min(1, 1 - props.remainingSeconds / total))
  return Math.round(ratio * 100)
})

const canReset = computed(() => props.isRunning || props.isPaused || props.remainingSeconds !== props.totalSeconds)
</script>

<style scoped>
.timer-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  position: relative;
  z-index: 10;
  opacity: 0.92;
}

.timer-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(12px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
}

.timer-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.42);
  box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.06);
}

.timer-status__label {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.92);
}

.timer-status__meta {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.52);
}

.timer-status--running .timer-status__dot {
  background: rgba(95, 237, 187, 0.95);
  box-shadow: 0 0 0 5px rgba(95, 237, 187, 0.14), 0 0 12px rgba(95, 237, 187, 0.4);
}

.timer-status--paused .timer-status__dot {
  background: rgba(255, 205, 107, 0.92);
  box-shadow: 0 0 0 5px rgba(255, 205, 107, 0.14), 0 0 12px rgba(255, 205, 107, 0.36);
}

/* ── Mode Tabs ── */
.mode-tabs {
  display: flex;
  width: 100%;
  gap: 6px;
  background: rgba(255, 255, 255, 0.045);
  border-radius: 999px;
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

/* 等宽分段控件：每个模式按键 flex:1 → 宽度一致、文字居中、间距统一 */
.mode-tab {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 999px;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all var(--transition);
}

.mode-tab:hover {
  color: rgba(255, 255, 255, 0.84);
  background: rgba(255, 255, 255, 0.06);
  transform: translateY(-1px);
}

.mode-tab.active {
  background: linear-gradient(180deg, rgba(124, 108, 240, 0.26), rgba(124, 108, 240, 0.16));
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 18px rgba(124, 108, 240, 0.22);
}

/* ── Timer Display ── */
.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.time-caption {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
}

.time {
  font-size: 60px;
  font-weight: 300;
  letter-spacing: 3px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.92);
}

.time-progress {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.56);
}

/* ── Progress Ring ── */
.progress-ring {
  position: relative;
  filter: drop-shadow(0 12px 32px rgba(0, 0, 0, 0.18));
}

.progress-fill {
  transition: stroke-dashoffset 0.3s ease;
  filter: drop-shadow(0 0 6px currentColor);
  opacity: 0.75;
}

/* ── Action Row ── */
.action-row {
  display: flex;
  gap: 10px;
  width: 100%;
}

.btn {
  min-width: 120px;
  padding: 10px 20px;
  border: 1px solid transparent;
  border-radius: 40px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
}

.btn-primary {
  background: linear-gradient(180deg, rgba(124, 108, 240, 0.22), rgba(124, 108, 240, 0.14));
  border-color: rgba(124, 108, 240, 0.26);
  color: rgba(255, 255, 255, 0.92);
}

.btn-primary:hover {
  background: linear-gradient(180deg, rgba(124, 108, 240, 0.28), rgba(124, 108, 240, 0.18));
  transform: translateY(-1px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.07);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}
</style>
