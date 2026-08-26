<template>
  <Teleport to="body">
    <div class="celeb-layer" aria-hidden="true">
      <!-- 里程碑光晕 -->
      <div
        v-if="effect && isMilestone"
        class="celeb-milestone-glow"
        :style="milestoneGlowStyle"
      />
      <!-- 粒子 -->
      <span
        v-for="p in particles"
        :key="p.id"
        class="celeb-particle"
        :style="particleStyle(p)"
      />
      <!-- 中心涟漪 -->
      <span
        v-if="effect && (effect.type === 'ripple' || effect.type === 'glow')"
        class="celeb-center"
        :class="`celeb-center--${effect.type}`"
        :style="centerStyle"
      />
      <!-- 里程碑文案 -->
      <div v-if="effect && isMilestone" class="celeb-banner" :style="bannerStyle">
        <span class="celeb-banner__text">{{ milestoneLabel }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import type { CelebrationEffect } from '../modules/anchor/celebration'

const props = defineProps<{
  effect: CelebrationEffect | null
}>()

interface Particle {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  size: number
  rot: number
  vr: number
  color: string
  delay: number
}

const particles = ref<Particle[]>([])
let timer: number | null = null

const isMilestone = computed(() => !!props.effect && props.effect.intensity === 'grand')

const milestoneLabel = computed(() => {
  if (!props.effect) return ''
  const t = props.effect.type
  if (t === 'star-burst') return '里程碑达成'
  return '完成'
})

const centerStyle = computed(() => {
  if (!props.effect) return {}
  const c = props.effect.config
  return {
    width: '12px',
    height: '12px',
    background: c.colors[0] || 'var(--accent)',
    boxShadow: `0 0 24px 8px ${c.colors[0] || 'var(--accent)'}`,
  }
})

const milestoneGlowStyle = computed(() => {
  if (!props.effect) return {}
  const c = props.effect.config.colors
  return {
    background: `radial-gradient(ellipse 60% 50% at 50% 42%, ${c[0] || 'var(--accent)'}22 0%, transparent 70%)`,
  }
})

const bannerStyle = computed(() => {
  if (!props.effect) return {}
  const c = props.effect.config.colors
  return { color: c[0] || 'var(--accent)' }
})

function particleStyle(p: Particle): Record<string, string> {
  return {
    left: `${p.x}px`,
    top: `${p.y}px`,
    width: `${p.size}px`,
    height: `${p.size}px`,
    background: p.color,
    transform: `translate(-50%, -50%) rotate(${p.rot}deg)`,
    animationDelay: `${p.delay}ms`,
  }
}

// 根据效果类型生成粒子
function generateParticles(effect: CelebrationEffect) {
  const cfg = effect.config
  const count = cfg.particleCount
  const cx = window.innerWidth / 2
  const cy = window.innerHeight * 0.42
  const list: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const speed = cfg.speed * (0.6 + Math.random() * 0.6)
    list.push({
      id: i,
      x: cx,
      y: cy,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed - 120,
      size: cfg.size.min + Math.random() * (cfg.size.max - cfg.size.min),
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 20,
      color: cfg.colors[i % cfg.colors.length],
      delay: Math.floor(Math.random() * 120),
    })
  }
  particles.value = list
  // 动画用 CSS keyframe 驱动（见 style），这里仅做一次性生成；
  // 用 JS 更新位置以模拟重力，确保各类型都有可见运动。
  const start = performance.now()
  const duration = effect.duration
  const spread = cfg.spread
  const gravity = cfg.gravity * 600
  const step = (now: number) => {
    const t = (now - start) / 1000
    if (t >= duration / 1000) {
      particles.value = []
      return
    }
    particles.value.forEach((p) => {
      p.x = cx + p.dx * t + (Math.random() - 0.5) * spread * 0.1
      p.y = cy + p.dy * t + 0.5 * gravity * t * t
      p.rot += p.vr
    })
    timer = requestAnimationFrame(step)
  }
  cancelAnimationFrame(timer as number)
  timer = requestAnimationFrame(step)
}

watch(
  () => props.effect,
  (eff) => {
    if (timer) {
      cancelAnimationFrame(timer)
      timer = null
    }
    particles.value = []
    if (eff) generateParticles(eff)
  },
  { immediate: true },
)

onUnmounted(() => {
  if (timer) cancelAnimationFrame(timer)
})
</script>

<style scoped>
.celeb-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.celeb-particle {
  position: absolute;
  border-radius: 2px;
  opacity: 0.9;
  /* 位置由 JS 驱动；此处仅做淡出收尾 */
  animation: celebFade 1.4s ease-out forwards;
  box-shadow: 0 0 6px currentColor;
  will-change: transform, top, left;
}

@keyframes celebFade {
  0% { opacity: 1; }
  80% { opacity: 0.8; }
  100% { opacity: 0; }
}

.celeb-center {
  position: absolute;
  left: 50%;
  top: 42%;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: celebPulse 1.2s ease-out infinite;
}

.celeb-center--ripple {
  animation: celebRipple 1.6s ease-out infinite;
  border: 2px solid currentColor;
  background: transparent !important;
  box-shadow: none;
}

.celeb-center--glow {
  animation: celebGlowPulse 2s ease-in-out infinite;
}

@keyframes celebPulse {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
}

@keyframes celebRipple {
  0% { width: 8px; height: 8px; opacity: 0.8; }
  100% { width: 220px; height: 220px; opacity: 0; }
}

@keyframes celebGlowPulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(2.2); opacity: 0.9; }
}

.celeb-milestone-glow {
  position: absolute;
  inset: 0;
  animation: celebGlowIn 0.6s ease-out;
}

@keyframes celebGlowIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.celeb-banner {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 4px;
  font-family: var(--font-heading-zh, serif);
  text-shadow: 0 0 20px currentColor, 0 2px 6px rgba(0, 0, 0, 0.4);
  animation: celebBanner 2.4s ease-out forwards;
}

@keyframes celebBanner {
  0% { opacity: 0; transform: translate(-50%, -40%) scale(0.8); }
  20% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
  80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -58%) scale(1); }
}
</style>
