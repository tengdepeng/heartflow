<template>
  <Teleport to="body">
    <Transition name="exit-overlay">
      <div v-if="visible" class="exit-overlay" :style="overlayStyle">
        <!-- 背景辉光 -->
        <div class="exit-glow" :style="glowStyle"></div>

        <!-- 装饰粒子 -->
        <div class="exit-particles" ref="particlesRef">
          <div
            v-for="p in floatingParticles"
            :key="p.id"
            class="exit-particle"
            :style="p.style"
          ></div>
        </div>

        <!-- 退出内容 -->
        <div class="exit-content" :class="{ 'exit-content--complete': isComplete }">
          <!-- 图标 -->
          <div class="exit-icon-wrap">
            <span class="exit-icon">{{ exitIcon }}</span>
          </div>

          <!-- 诗歌 -->
          <div class="exit-poem" ref="poemRef">
            <p class="exit-poem-text">{{ poem }}</p>
          </div>

          <!-- 状态描述 -->
          <p class="exit-desc">{{ description }}</p>

          <!-- 完成状态 -->
          <div v-if="isComplete" class="exit-complete">
            <span class="exit-complete-icon">✦</span>
            <p class="exit-complete-text">珍重，期待下次相遇</p>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="exit-progress">
          <div class="exit-progress-bar" :style="progressStyle"></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import type { HallExitState } from '../../modules/data-sovereignty/types'
import { HALL_EXIT_STATES } from '../../modules/data-sovereignty'

const props = defineProps<{
  visible: boolean
  exitState: HallExitState
  duration: number
  onComplete?: () => void
}>()

const emit = defineEmits<{
  (e: 'complete'): void
}>()

// ---- 退出状态信息 ----
const stateInfo = computed(() =>
  HALL_EXIT_STATES.find(s => s.id === props.exitState) || HALL_EXIT_STATES[0]
)

const exitIcon = computed(() => stateInfo.value.icon)
const poem = computed(() => stateInfo.value.poem)
const description = computed(() => stateInfo.value.description)
const transitionColor = computed(() => stateInfo.value.color)

const overlayStyle = computed(() => ({
  background: `rgba(13, 11, 9, 0.92)`,
}))

const glowStyle = computed(() => ({
  background: `radial-gradient(ellipse at center, ${transitionColor.value}30 0%, transparent 60%)`,
}))

// ---- 进度 ----
const progress = ref(0)
const isComplete = ref(false)
const progressStyle = computed(() => ({
  width: `${progress.value}%`,
  background: transitionColor.value,
}))

// ---- 浮动粒子 ----
interface FloatParticle {
  id: number
  style: Record<string, string>
}

const floatingParticles = ref<FloatParticle[]>([])

function generateParticles() {
  const particles: FloatParticle[] = []
  const count = 20
  for (let i = 0; i < count; i++) {
    const size = Math.random() * 4 + 1
    const x = Math.random() * 100
    const delay = Math.random() * props.duration
    const duration = 2000 + Math.random() * 3000
    particles.push({
      id: i,
      style: {
        width: `${size}px`,
        height: `${size}px`,
        left: `${x}%`,
        bottom: `-${size}px`,
        background: transitionColor.value,
        opacity: `${Math.random() * 0.5 + 0.1}`,
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`,
      },
    })
  }
  floatingParticles.value = particles
}

// ---- 动画控制 ----
let progressInterval: ReturnType<typeof setInterval> | null = null

function startAnimation() {
  progress.value = 0
  isComplete.value = false
  generateParticles()

  const stepMs = 50
  const totalSteps = props.duration / stepMs
  let currentStep = 0

  progressInterval = setInterval(() => {
    currentStep++
    progress.value = Math.min(100, (currentStep / totalSteps) * 100)

    if (progress.value >= 100) {
      if (progressInterval) {
        clearInterval(progressInterval)
        progressInterval = null
      }
      isComplete.value = true
      emit('complete')
      if (props.onComplete) props.onComplete()
    }
  }, stepMs)
}

function resetAnimation() {
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  progress.value = 0
  isComplete.value = false
  floatingParticles.value = []
}

watch(() => props.visible, (val) => {
  if (val) {
    startAnimation()
  } else {
    resetAnimation()
  }
})

onUnmounted(() => {
  resetAnimation()
})
</script>

<style scoped>
.exit-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  overflow: hidden;
}

.exit-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: exitGlowPulse 3s ease-in-out infinite;
}

.exit-particles {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.exit-particle {
  position: absolute;
  border-radius: 50%;
  animation: exitParticleRise linear forwards;
}

.exit-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;
  max-width: 400px;
  padding: 0 24px;
}

.exit-icon-wrap {
  animation: exitIconFloat 2s ease-in-out infinite;
}

.exit-icon {
  font-size: 64px;
  display: block;
}

.exit-poem {
  opacity: 0;
  animation: exitPoemFadeIn 1s ease 0.5s forwards;
}

.exit-poem-text {
  font-size: 18px;
  font-style: italic;
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
}

.exit-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
  opacity: 0;
  animation: exitPoemFadeIn 1s ease 1s forwards;
}

.exit-complete {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0;
  animation: exitPoemFadeIn 0.5s ease 0.3s forwards;
}

.exit-complete-icon {
  font-size: 28px;
  color: var(--accent);
}

.exit-complete-text {
  font-size: 14px;
  color: var(--text-bright);
  margin: 0;
}

.exit-progress {
  position: absolute;
  bottom: 48px;
  left: 50%;
  transform: translateX(-50%);
  width: 200px;
  height: 2px;
  background: rgba(var(--text-primary-rgb), 0.1);
  border-radius: 1px;
  overflow: hidden;
}

.exit-progress-bar {
  height: 100%;
  border-radius: 1px;
  transition: width 0.05s linear;
}

/* 过渡动画 */
.exit-overlay-enter-active {
  transition: opacity 0.4s ease;
}

.exit-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.exit-overlay-enter-from,
.exit-overlay-leave-to {
  opacity: 0;
}

/* 关键帧动画 */
@keyframes exitGlowPulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

@keyframes exitParticleRise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 0.5;
  }
  100% {
    transform: translateY(-100vh) scale(0);
    opacity: 0;
  }
}

@keyframes exitIconFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes exitPoemFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>