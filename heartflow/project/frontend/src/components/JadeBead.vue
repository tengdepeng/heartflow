<template>
  <div class="jade-bead-container" :class="[`bead--${beadState}`, { 'bead--translucent': translucent }]">
    <!-- 外层光晕 -->
    <div class="bead-aura" :class="{ 'aura--pulse': pulseActive }" />

    <!-- 玉珠本体：translucent 时以 HTML 玻璃层呈现，材质与幕僚球（MirrorSelf .ms-orb）完全同源 -->
    <div class="bead-stage">
      <!-- 幕僚球同款玻璃层（与 MirrorSelf .ms-orb 同一配方：净透琉璃 + 焦散 + 高光 + 厚边环） -->
      <div v-if="translucent" class="bead-glass" aria-hidden="true">
        <div class="bgl-caustic" />
        <div class="bgl-spec" />
        <div class="bgl-sheen" />
        <div class="bgl-rim" />
      </div>
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
        <!-- 月白珠体（对调后：计时大珠 = 月华光晕 + 玉白核） -->
        <radialGradient id="moonDisc" cx="34%" cy="28%" r="76%">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="26%" stop-color="#f7faff" />
          <stop offset="56%" stop-color="#e9f0fa" />
          <stop offset="80%" stop-color="#d3dfef" />
          <stop offset="100%" stop-color="#b9c9e3" />
        </radialGradient>
        <!-- 玉白核：柔和发光心 -->
        <radialGradient id="moonCore" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(255,255,255,1)" />
          <stop offset="48%" stop-color="rgba(255,255,255,0.45)" />
          <stop offset="100%" stop-color="rgba(255,255,255,0)" />
        </radialGradient>
        <!-- 内光晕 -->
        <filter id="innerGlow">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      <!-- 主体圆（translucent 时由 .bead-glass 接管，此层经 CSS 隐藏） -->
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
      <!-- 白色实心核（对调后：大珠 = 弥散光晕 + 白核） -->
      <circle
        cx="100" cy="100" r="40"
        fill="url(#moonCore)"
        class="bead-core"
      />
      <!-- translucent 时珠体由 .bead-glass 接管，SVG 各珠体层经 CSS 隐藏（呼吸环/进度弧除外） -->
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
    </div>

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
  /** 通透玻璃模式：珠体低透明、背景透出，对齐幕僚玻璃球质感 */
  translucent?: boolean
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
  0%, 100% { transform: scale(0.92); opacity: 0.45; }
  50% { transform: scale(1.14); opacity: 1; }
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
  0%, 100% { transform: scale(0.94); }
  50% { transform: scale(1.06); }
}

.bead-ring {
  animation: ring-pulse 4s ease-in-out infinite;
}

@keyframes ring-pulse {
  0%, 100% { r: 70px; opacity: 0.18; }
  50% { r: 78px; opacity: 0.6; }
}

/* 进度弧 */
.bead-progress {
  transition: stroke-dashoffset 0.3s ease;
}

/* 玉白核：柔和发光心（对调后：大珠 = 月华光晕 + 玉白核） */
.bead-core {
  filter: drop-shadow(0 0 24px rgba(226, 238, 255, 0.9));
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

/* ---- 通透玻璃模式（translucent prop）：与幕僚球（MirrorSelf .ms-orb）完全同源 ----
   直接复刻 .ms-orb 的净透琉璃配方：层叠背景 + 1px 亮边 + backdrop-filter + 内阴影组，
   外加焦散/高光/掠光/厚边环四层，保证两颗球同材质。
   .bead-glass 绝对定位对齐 SVG 珠体圆（viewBox 200 / r62 → 19% 偏移 + 62% 直径），
   SVG 各珠体层在 translucent 下隐藏，进度弧/计时不受影响。 */
.bead-stage {
  position: relative;
}

.bead-glass {
  position: absolute;
  left: 19%;
  top: 19%;
  width: 62%;
  height: 62%;
  border-radius: 50%;
  pointer-events: none;
  background:
    linear-gradient(178deg, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0.07) 24%, rgba(255, 255, 255, 0) 44%),
    radial-gradient(ellipse 80% 32% at 50% 97%, rgba(255, 255, 255, 0.26), rgba(255, 255, 255, 0) 74%),
    radial-gradient(circle at 74% 66%, rgba(150, 176, 216, 0.15), rgba(150, 176, 216, 0) 58%),
    radial-gradient(circle at 40% 34%, rgba(255, 255, 255, 0.09), rgba(255, 255, 255, 0.025) 56%, rgba(255, 255, 255, 0.008) 100%);
  border: 1px solid rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  -webkit-backdrop-filter: blur(3px) saturate(1.5) brightness(1.08);
  box-shadow:
    inset 0 1px 1.5px rgba(255, 255, 255, 0.78),
    inset 2px 3px 7px rgba(255, 255, 255, 0.28),
    inset -3px -4px 10px rgba(142, 172, 216, 0.2),
    inset 0 -2px 5px rgba(255, 255, 255, 0.22),
    0 4px 14px rgba(4, 8, 16, 0.3),
    0 0 19px rgba(150, 168, 215, 0.28);
}

/* 下缘焦散亮弧：光自玻璃底缘汇聚（screen 只加光不减光） */
.bgl-caustic {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  mix-blend-mode: screen;
  filter: blur(0.6px);
  background: radial-gradient(ellipse 54% 22% at 50% 91%, rgba(255, 255, 255, 0.62), rgba(255, 255, 255, 0) 72%);
}

/* 上缘锐高光 + 柔光斑：玻璃第一高光 */
.bgl-spec {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(ellipse 24% 15% at 30% 21%, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0) 72%),
    radial-gradient(ellipse 38% 20% at 34% 29%, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0) 76%);
}

/* 游走高光 sheen：玉珠水头（9s 缓扫一次，克制） */
.bgl-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
}
.bgl-sheen::after {
  content: '';
  position: absolute;
  top: -60%;
  left: -60%;
  width: 220%;
  height: 220%;
  background: linear-gradient(115deg, transparent 38%, rgba(255, 255, 255, 0.14) 50%, transparent 62%);
  transform: translateX(-32%);
  animation: bead-sheen-sweep 9s ease-in-out infinite;
  will-change: transform;
}
@keyframes bead-sheen-sweep {
  0% { transform: translateX(-32%); }
  50% { transform: translateX(32%); }
  100% { transform: translateX(-32%); }
}

/* 玻璃厚边环：利落珠缘 */
.bgl-rim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow:
    inset 0 0 0 1.4px rgba(255, 255, 255, 0.2),
    inset 0 0 5px rgba(255, 255, 255, 0.13);
}

/* translucent 下隐藏 SVG 珠体各层（玻璃层接管）；呼吸环一并隐去（幕僚球无环）。
   注意 bead-ring 的 ring-pulse 动画会覆盖 opacity，须用 display:none */
.bead--translucent .bead-body,
.bead--translucent .bead-gloss,
.bead--translucent .bead-core {
  opacity: 0;
}
.bead--translucent .bead-ring {
  display: none;
}
.bead--translucent .bead-svg {
  filter: none;
}
.bead--translucent .bead-aura {
  background: radial-gradient(circle at 50% 50%, rgba(150, 168, 215, 0.28) 0%, transparent 68%);
}
.bead--translucent .bead-particle {
  background: rgba(172, 200, 235, 0.55);
}
</style>
