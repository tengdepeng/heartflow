<template>
  <div class="jade-bead-container" :class="`bead--${beadState}`">
    <!-- 外层光晕 -->
    <div class="bead-aura" :class="{ 'aura--pulse': pulseActive }" />

    <!-- 玉珠本体 -->
    <svg
      class="bead-svg"
      viewBox="0 0 200 200"
      @click="$emit('toggle')"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
    >
      <defs>
        <!-- 玉质径向渐变 -->
        <radialGradient :id="gradientId" cx="38%" cy="32%" r="60%">
          <stop offset="0%" :stop-color="highlightColor" />
          <stop offset="35%" :stop-color="midColor" />
          <stop offset="70%" :stop-color="bodyColor" />
          <stop offset="100%" :stop-color="edgeColor" />
        </radialGradient>
        <!-- 光泽 -->
        <radialGradient :id="glossId" cx="30%" cy="28%" r="30%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.35)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <!-- 内光晕 -->
        <filter id="innerGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- 主体圆 -->
      <circle
        cx="100" cy="100" r="62"
        :fill="`url(#${gradientId})`"
        filter="url(#innerGlow)"
        class="bead-body"
      />
      <!-- 光泽层 -->
      <circle
        cx="100" cy="100" r="62"
        :fill="`url(#${glossId})`"
        class="bead-gloss"
      />
      <!-- 呼吸环 -->
      <circle
        cx="100" cy="100" r="68"
        fill="none"
        :stroke="ringColor"
        stroke-width="0.8"
        opacity="0.3"
        class="bead-ring"
      />
      <!-- 进度弧（专注中显示） -->
      <circle
        v-if="beadState === 'focusing'"
        cx="100" cy="100" r="72"
        fill="none"
        :stroke="ringColor"
        stroke-width="1.5"
        stroke-linecap="round"
        :stroke-dasharray="progressCircumference"
        :stroke-dashoffset="progressOffset"
        transform="rotate(-90, 100, 100)"
        opacity="0.6"
        class="bead-progress"
      />
    </svg>

    <!-- 计时显示（玉珠下方） -->
    <div class="bead-timer" @click="$emit('toggle')">
      <span class="bead-time">{{ displayTime }}</span>
    </div>

    <!-- 微珠粒子 -->
    <div class="bead-particles">
      <span
        v-for="i in beadCount"
        :key="i"
        class="bead-particle"
        :style="particleStyle(i)"
      />
    </div>

    <!-- 完成脉冲 -->
    <Transition name="pulse">
      <div v-if="pulseActive" class="pulse-ring" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{
  displayTime: string
  isRunning: boolean
  isPaused: boolean
  isFocusing: boolean
  beadCount: number
  progress: number
}>()

defineEmits<{
  toggle: []
}>()

// 玉珠状态
const beadState = computed(() => {
  if (props.isFocusing) return 'focusing'
  if (props.isPaused) return 'paused'
  if (props.isRunning) return 'running'
  return 'idle'
})

// 各状态颜色
const stateColors: Record<string, { highlight: string; mid: string; body: string; edge: string; ring: string }> = {
  idle: {
    highlight: 'rgba(180,160,120,0.9)',
    mid: 'rgba(140,120,80,0.7)',
    body: 'rgba(100,80,50,0.6)',
    edge: 'rgba(60,45,25,0.8)',
    ring: 'rgba(180,150,100,0.4)',
  },
  focusing: {
    highlight: 'rgba(255,220,140,0.95)',
    mid: 'rgba(220,170,80,0.75)',
    body: 'rgba(170,120,40,0.55)',
    edge: 'rgba(100,65,20,0.8)',
    ring: 'rgba(255,200,100,0.5)',
  },
  running: {
    highlight: 'rgba(255,220,140,0.95)',
    mid: 'rgba(220,170,80,0.75)',
    body: 'rgba(170,120,40,0.55)',
    edge: 'rgba(100,65,20,0.8)',
    ring: 'rgba(255,200,100,0.5)',
  },
  paused: {
    highlight: 'rgba(140,130,120,0.7)',
    mid: 'rgba(100,90,80,0.5)',
    body: 'rgba(70,60,50,0.45)',
    edge: 'rgba(40,35,25,0.7)',
    ring: 'rgba(130,120,100,0.3)',
  },
}

const cs = computed(() => stateColors[beadState.value] ?? stateColors.idle)

const gradientId = 'jadeGradient'
const glossId = 'jadeGloss'

const highlightColor = computed(() => cs.value.highlight)
const midColor = computed(() => cs.value.mid)
const bodyColor = computed(() => cs.value.body)
const edgeColor = computed(() => cs.value.edge)
const ringColor = computed(() => cs.value.ring)

// 进度环
const progressCircumference = 2 * Math.PI * 72
const progressOffset = computed(() => progressCircumference * (1 - props.progress))

// 脉冲（专注完成时触发）
const pulseActive = ref(false)

watch(() => props.beadCount, (next, prev) => {
  if (next > prev) {
    pulseActive.value = true
    setTimeout(() => { pulseActive.value = false }, 1800)
  }
})

// 按压状态
const pressing = ref(false)
let pressTimer: ReturnType<typeof setTimeout> | null = null

function onPointerDown() {
  pressing.value = true
}
function onPointerUp() {
  pressing.value = false
  if (pressTimer) clearTimeout(pressTimer)
}

// 微珠粒子样式
function particleStyle(i: number) {
  const angle = (i / Math.max(props.beadCount, 1)) * Math.PI * 2 + Date.now() / 8000
  const orbitRadius = 100 + Math.sin(i * 2.5) * 15
  const size = 3 + Math.sin(i * 3.1) * 1.5
  return {
    '--orbit-angle': `${angle}rad`,
    '--orbit-radius': `${orbitRadius}px`,
    '--particle-size': `${size}px`,
    '--particle-delay': `${i * 0.4}s`,
  }
}
</script>

<style scoped>
.jade-bead-container {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  z-index: 10;
  user-select: none;
}

/* ---- 外光晕 ---- */
.bead-aura {
  position: absolute;
  inset: -40px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, rgba(180,150,100,0.06) 0%, transparent 70%);
  animation: aura-breathe 8s ease-in-out infinite;
}

.bead--focusing .bead-aura {
  background: radial-gradient(circle at 50% 50%, rgba(255,200,100,0.03) 0%, transparent 70%);
  animation-duration: 12s;
}

.bead--paused .bead-aura {
  background: radial-gradient(circle at 50% 50%, rgba(130,120,100,0.04) 0%, transparent 70%);
  animation-duration: 10s;
}

@keyframes aura-breathe {
  0%, 100% { transform: scale(0.95); opacity: 0.5; }
  50% { transform: scale(1.08); opacity: 0.9; }
}

/* ---- SVG ---- */
.bead-svg {
  width: 140px;
  height: 140px;
  cursor: pointer;
  filter: drop-shadow(0 0 16px rgba(180,150,100,0.25));
  transition: transform 0.3s ease;
}

.bead-svg:active {
  transform: scale(0.95);
}

.bead--focusing .bead-svg {
  filter: drop-shadow(0 0 24px rgba(255,200,100,0.35));
}

.bead--paused .bead-svg {
  filter: drop-shadow(0 0 10px rgba(130,120,100,0.15));
}

/* 玉珠呼吸 */
.bead-body {
  transform-origin: 100px 100px;
  animation: bead-breathe 6s ease-in-out infinite;
}

.bead--focusing .bead-body {
  animation-duration: 10s;
}

@keyframes bead-breathe {
  0%, 100% { transform: scale(0.97); }
  50% { transform: scale(1.02); }
}

.bead-ring {
  animation: ring-pulse 4s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { r: 70px; opacity: 0.2; }
  50% { r: 76px; opacity: 0.45; }
}

/* 进度弧 */
.bead-progress {
  transition: stroke-dashoffset 0.3s ease;
}

/* ---- 计时显示 ---- */
.bead-timer {
  cursor: pointer;
  text-align: center;
}

.bead-time {
  font-size: 42px;
  font-weight: 300;
  letter-spacing: 4px;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
  transition: opacity 0.5s;
}

.bead--paused .bead-time {
  opacity: 0.5;
}

/* ---- 微珠粒子 ---- */
.bead-particles {
  position: absolute;
  inset: -60px;
  pointer-events: none;
}

.bead-particle {
  position: absolute;
  left: calc(50% + cos(var(--orbit-angle)) * var(--orbit-radius));
  top: calc(50% + sin(var(--orbit-angle)) * var(--orbit-radius));
  width: var(--particle-size, 4px);
  height: var(--particle-size, 4px);
  border-radius: 50%;
  background: rgba(180,150,100,0.5);
  animation: particle-twinkle 2s ease-in-out infinite;
  animation-delay: var(--particle-delay, 0s);
}

.bead--focusing .bead-particle {
  background: rgba(255,200,100,0.6);
}

@keyframes particle-twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.8; }
}

/* ---- 完成脉冲环 ---- */
.pulse-ring {
  position: absolute;
  width: 200px;
  height: 200px;
  border-radius: 50%;
  border: 1px solid rgba(255,200,100,0.5);
  animation: pulse-expand 1.8s ease-out forwards;
  pointer-events: none;
}

@keyframes pulse-expand {
  0% {
    transform: scale(0.5);
    opacity: 0.9;
  }
  100% {
    transform: scale(2.5);
    opacity: 0;
  }
}

.pulse-enter-active { transition: opacity 0.1s; }
.pulse-leave-active { transition: opacity 0.5s; }
.pulse-enter-from, .pulse-leave-to { opacity: 0; }
</style>
