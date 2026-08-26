<template>
  <canvas ref="canvasRef" class="canvas-particles" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = withDefaults(defineProps<{
  speed?: number
  colorTheme?: 'default' | 'aurora' | 'ice' | 'warm'
  particleCount?: number
}>(), {
  speed: 0.6,
  colorTheme: 'default',
  particleCount: 100,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  alpha: number
  alphaSpeed: number
  hue: number
}

const THEME_COLORS: Record<string, { hue: number; sat: number; light: number }> = {
  default: { hue: 250, sat: 70, light: 60 },
  aurora:  { hue: 180, sat: 80, light: 65 },
  ice:     { hue: 210, sat: 50, light: 75 },
  warm:    { hue: 30,  sat: 50, light: 55 },
}

let particles: Particle[] = []
let animId = 0
let mouseX = -9999
let mouseY = -9999
// 宪法视觉接线：--hf-silence（启用=1）开启静默留白，降低粒子活跃度并跳过连线
let silenceMode = false

function readCssNumber(name: string, fallback: number): number {
  if (typeof document === 'undefined') return fallback
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name)
  const n = parseFloat(raw)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function initParticles(w: number, h: number): Particle[] {
  // 宪法视觉接线：粒子密度受 --hf-particle-density 控制（默认 1，宪法降低至 50%/40%）
  const density = readCssNumber('--hf-particle-density', 1)
  // 宪法视觉接线：--hf-silence（启用=1）开启静默留白，降低粒子初始透明度与呼吸幅度
  silenceMode = readCssNumber('--hf-silence', 0) >= 1
  const count = Math.max(1, Math.round(props.particleCount * density))
  const theme = THEME_COLORS[props.colorTheme] || THEME_COLORS.default
  return Array.from({ length: count }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * props.speed,
    vy: (Math.random() - 0.5) * props.speed,
    size: 1.5 + Math.random() * 3,
    alpha: silenceMode ? 0.08 + Math.random() * 0.18 : 0.2 + Math.random() * 0.5,
    alphaSpeed: silenceMode ? 0.001 + Math.random() * 0.004 : 0.002 + Math.random() * 0.008,
    hue: theme.hue + (Math.random() - 0.5) * 30,
  }))
}

function draw(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)

  const theme = THEME_COLORS[props.colorTheme] || THEME_COLORS.default

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]

    // Move
    p.x += p.vx
    p.y += p.vy

    // Wrap
    if (p.x < 0) p.x = w
    if (p.x > w) p.x = 0
    if (p.y < 0) p.y = h
    if (p.y > h) p.y = 0

    // Breath alpha（静默模式以更低的上限呼吸，更克制）
    if (silenceMode) {
      p.alpha += p.alphaSpeed
      if (p.alpha > 0.3 || p.alpha < 0.05) p.alphaSpeed *= -1
    } else {
      p.alpha += p.alphaSpeed
      if (p.alpha > 0.7 || p.alpha < 0.15) p.alphaSpeed *= -1
    }

    // Draw particle
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fillStyle = `hsla(${p.hue}, ${theme.sat}%, ${theme.light}%, ${p.alpha})`
    ctx.fill()

    // 静默模式跳过所有连线，仅保留呼吸的粒子本体，营造留白
    if (!silenceMode) {
      // Mouse connection
      const dx = p.x - mouseX
      const dy = p.y - mouseY
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 150) {
        ctx.beginPath()
        ctx.moveTo(p.x, p.y)
        ctx.lineTo(mouseX, mouseY)
        ctx.strokeStyle = `hsla(${theme.hue}, ${theme.sat}%, ${theme.light}%, ${(1 - dist / 150) * 0.3})`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Inter-particle connection
      for (let j = i + 1; j < particles.length; j++) {
        const p2 = particles[j]
        const dx2 = p.x - p2.x
        const dy2 = p.y - p2.y
        const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
        if (dist2 < 80) {
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `hsla(${theme.hue}, ${theme.sat}%, ${theme.light}%, ${(1 - dist2 / 80) * 0.12})`
          ctx.lineWidth = 0.3
          ctx.stroke()
        }
      }
    }
  }
}

function loop() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  draw(ctx, w, h)
  animId = requestAnimationFrame(loop)
}

function onResize() {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight

  const w = canvas.width
  const h = canvas.height
  particles = initParticles(w, h)
}

function onMouseMove(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = e.clientX - rect.left
  mouseY = e.clientY - rect.top
}

function onMouseLeave() {
  mouseX = -9999
  mouseY = -9999
}

watch(() => [props.speed, props.colorTheme, props.particleCount], () => {
  const canvas = canvasRef.value
  if (!canvas) return
  particles = initParticles(canvas.width || 800, canvas.height || 600)
})

onMounted(() => {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  canvas.width = parent.clientWidth
  canvas.height = parent.clientHeight
  particles = initParticles(canvas.width, canvas.height)

  window.addEventListener('resize', onResize)
  canvas.addEventListener('mousemove', onMouseMove)
  canvas.addEventListener('mouseleave', onMouseLeave)

  loop()
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousemove', onMouseMove)
    canvas.removeEventListener('mouseleave', onMouseLeave)
  }
})
</script>

<style scoped>
.canvas-particles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}
</style>
