<template>
  <Teleport to="body">
    <Transition name="ritual-overlay">
      <div v-if="visible" class="ritual-overlay" @click.self="handleCancel">
        <!-- 背景辉光 -->
        <div class="ritual-glow" :style="{ background: `radial-gradient(ellipse at center, ${glowColor}40 0%, transparent 70%)` }"></div>

        <!-- 仪式内容 -->
        <div class="ritual-content" ref="contentRef">
          <!-- 标题 -->
          <div class="ritual-header">
            <span class="ritual-icon">{{ ritualIcon }}</span>
            <h3 class="ritual-title">遗忘仪式</h3>
            <p class="ritual-desc">即将遗忘「{{ moduleName }}」的所有数据</p>
          </div>

          <!-- 阶段指示器 -->
          <div class="ritual-phases">
            <div
              v-for="(phase, idx) in phases"
              :key="phase.id"
              class="ritual-phase"
              :class="{
                active: currentPhaseIndex === idx,
                completed: currentPhaseIndex > idx,
              }"
            >
              <span class="phase-dot"></span>
              <span class="phase-label">{{ phase.label }}</span>
            </div>
          </div>

          <!-- 粒子动画画布 -->
          <div class="ritual-canvas" ref="canvasRef">
            <canvas ref="particleCanvasRef" class="particle-canvas"></canvas>
            <div class="ritual-text" v-if="currentPhase === 'complete'">
              <span class="complete-icon">✦</span>
              <p class="complete-text">遗忘完成</p>
              <p class="complete-detail">已释放 {{ formatBytes(freedBytes) }} · {{ affectedCount }} 项数据</p>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="ritual-actions">
            <button
              v-if="currentPhase === 'idle'"
              class="ritual-btn ritual-btn--start"
              @click="startRitual"
            >
              开始仪式
            </button>
            <button
              v-if="currentPhase === 'idle'"
              class="ritual-btn ritual-btn--cancel"
              @click="handleCancel"
            >
              取消
            </button>
            <button
              v-if="currentPhase === 'complete'"
              class="ritual-btn ritual-btn--done"
              @click="handleDone"
            >
              完成
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import type { RitualPhase } from '../../modules/data-sovereignty/types'
import { FORGET_METHODS } from '../../modules/data-sovereignty'

const props = defineProps<{
  visible: boolean
  moduleName: string
  affectedCount: number
  freedBytes: number
  method?: string
}>()

const emit = defineEmits<{
  (e: 'complete'): void
  (e: 'cancel'): void
}>()

// ---- 仪式阶段 ----
const phases = [
  { id: 'dissolving' as RitualPhase, label: '粒子消散' },
  { id: 'fading' as RitualPhase, label: '渐隐' },
  { id: 'fragmenting' as RitualPhase, label: '碎片化' },
  { id: 'complete' as RitualPhase, label: '完成' },
]

const currentPhase = ref<RitualPhase>('idle')
const currentPhaseIndex = ref(0)
const contentRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLDivElement | null>(null)
const particleCanvasRef = ref<HTMLCanvasElement | null>(null)

// ---- 颜色和图标 ----
const methodInfo = computed(() =>
  FORGET_METHODS.find(m => m.id === props.method) || FORGET_METHODS[2]
)

const glowColor = computed(() => {
  switch (props.method) {
    case 'natural-aging': return '#a8d5ba'
    case 'seal': return '#a0c4e8'
    case 'release': return '#e8a0a0'
    case 'hibernate': return '#c8a0e8'
    case 'forgetting-ritual': return '#f0c040'
    default: return '#d4a574'
  }
})

const ritualIcon = computed(() => methodInfo.value.icon)

// ---- 粒子系统 ----
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  color: string
  life: number
  maxLife: number
}

let animationId: number | null = null
let particles: Particle[] = []
let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null

function initCanvas() {
  if (!particleCanvasRef.value || !canvasRef.value) return
  canvas = particleCanvasRef.value
  ctx = canvas.getContext('2d')
  if (!ctx) return

  const rect = canvasRef.value.getBoundingClientRect()
  canvas.width = rect.width * devicePixelRatio
  canvas.height = rect.height * devicePixelRatio
  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`
  ctx.scale(devicePixelRatio, devicePixelRatio)
}

function createParticles(count: number) {
  if (!canvas) return
  const w = canvas.width / devicePixelRatio
  const h = canvas.height / devicePixelRatio
  const centerX = w / 2
  const centerY = h / 2

  const colors = ['#d4a574', '#e8c8a0', '#f0d8b8', '#c89060', '#a07050']
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * Math.min(w, h) * 0.3
    particles.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: Math.random() * 4 + 1,
      alpha: Math.random() * 0.6 + 0.4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: 60 + Math.random() * 60,
    })
  }
}

function animateParticles() {
  if (!ctx || !canvas) return
  const w = canvas.width / devicePixelRatio
  const h = canvas.height / devicePixelRatio

  ctx.clearRect(0, 0, w, h)

  const shouldContinue = particles.some(p => p.life < p.maxLife)
  if (!shouldContinue) {
    if (animationId !== null) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    return
  }

  for (const p of particles) {
    p.life++
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.05 // 轻微重力

    const lifeRatio = p.life / p.maxLife
    p.alpha = Math.max(0, (1 - lifeRatio) * 0.8)
    p.size = Math.max(0, p.size * (1 - lifeRatio * 0.5))

    if (p.alpha > 0 && p.size > 0) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = p.color
      ctx.globalAlpha = p.alpha
      ctx.fill()
    }
  }

  ctx.globalAlpha = 1
  animationId = requestAnimationFrame(animateParticles)
}

// ---- 仪式流程 ----
function startRitual() {
  currentPhase.value = 'dissolving'
  currentPhaseIndex.value = 0

  nextTick(() => {
    initCanvas()
    createParticles(80)
    animateParticles()
  })

  // Phase progression
  setTimeout(() => {
    currentPhase.value = 'fading'
    currentPhaseIndex.value = 1
  }, 1500)

  setTimeout(() => {
    currentPhase.value = 'fragmenting'
    currentPhaseIndex.value = 2
    // 二次粒子爆发
    nextTick(() => {
      createParticles(40)
    })
  }, 3000)

  setTimeout(() => {
    currentPhase.value = 'complete'
    currentPhaseIndex.value = 3
    emit('complete')
  }, 4500)
}

function handleCancel() {
  resetRitual()
  emit('cancel')
}

function handleDone() {
  resetRitual()
  emit('complete')
}

function resetRitual() {
  currentPhase.value = 'idle'
  currentPhaseIndex.value = 0
  particles = []
  if (animationId !== null) {
    cancelAnimationFrame(animationId)
    animationId = null
  }
}

// ---- 格式化 ----
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0B'
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1048576).toFixed(1)}MB`
}

// ---- 生命周期 ----
watch(() => props.visible, (val) => {
  if (!val) resetRitual()
})

onUnmounted(() => {
  resetRitual()
})
</script>

<style scoped>
.ritual-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(13, 11, 9, 0.85);
  backdrop-filter: blur(8px);
}

.ritual-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ritual-content {
  position: relative;
  z-index: 1;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.ritual-header {
  text-align: center;
}

.ritual-icon {
  font-size: 48px;
  display: block;
  margin-bottom: 12px;
}

.ritual-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.ritual-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 6px 0 0;
}

.ritual-phases {
  display: flex;
  gap: 8px;
  align-items: center;
}

.ritual-phase {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.08);
  transition: all 0.3s ease;
}

.ritual-phase.active {
  background: rgba(var(--accent-rgb), 0.2);
}

.ritual-phase.completed {
  background: rgba(var(--accent-rgb), 0.12);
}

.phase-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-secondary);
  transition: all 0.3s ease;
}

.ritual-phase.active .phase-dot {
  background: var(--accent);
  box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.5);
}

.ritual-phase.completed .phase-dot {
  background: var(--success);
}

.phase-label {
  font-size: 11px;
  color: var(--text-secondary);
}

.ritual-phase.active .phase-label {
  color: var(--accent);
}

.ritual-phase.completed .phase-label {
  color: var(--text-bright);
}

.ritual-canvas {
  position: relative;
  width: 300px;
  height: 200px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  overflow: hidden;
}

.particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.ritual-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  animation: ritualCompleteFadeIn 0.5s ease;
}

.complete-icon {
  font-size: 36px;
  color: var(--accent);
}

.complete-text {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.complete-detail {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.ritual-actions {
  display: flex;
  gap: 12px;
}

.ritual-btn {
  padding: 10px 24px;
  border-radius: 8px;
  border: none;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.ritual-btn--start {
  background: var(--accent);
  color: var(--bg-primary);
}

.ritual-btn--start:hover {
  background: #c89560;
}

.ritual-btn--cancel {
  background: rgba(var(--text-primary-rgb), 0.08);
  color: var(--text-bright);
}

.ritual-btn--cancel:hover {
  background: rgba(var(--text-primary-rgb), 0.12);
}

.ritual-btn--done {
  background: var(--accent);
  color: var(--bg-primary);
}

.ritual-btn--done:hover {
  background: #c89560;
}

/* 过渡动画 */
.ritual-overlay-enter-active {
  transition: opacity 0.3s ease;
}

.ritual-overlay-leave-active {
  transition: opacity 0.2s ease;
}

.ritual-overlay-enter-from,
.ritual-overlay-leave-to {
  opacity: 0;
}

@keyframes ritualCompleteFadeIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>