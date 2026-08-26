import { computed, onUnmounted, watch, type Ref } from 'vue'

/**
 * 画布呼吸效果 — 独立 rAF 直接写容器 style（CSS 变量），不经过 Vue 响应式。
 *
 * - 原实现每帧把 breathPhase 写入响应式 ref，驱动组件重渲染并强制 style 重算；
 *   重构后 rAF 循环直接写容器的 --breathing-scale / --breathing-opacity /
 *   --glow-opacity / --glow-color，零 Vue 响应式开销。
 * - 循环统一受 visibilitychange 门控：document.hidden 时 cancel，可见时恢复。
 * - isPaused（Sanctuary 激活）真正接入循环：激活时停止 rAF，退出后恢复。
 */
export function useCanvasBreathing(
  intensity: Ref<number>,
  isSanctuaryActive: Ref<boolean>,
  containerRef: Ref<HTMLElement | null>
) {
  let animationFrameId: number | null = null
  let running = false
  let startTime = performance.now()

  // 相位量化粒度：只有跨过该步长才写一次 CSS 变量。
  // 呼吸周期 4s 时更新频率约 12 次/秒，周期 20s 时约 2.5 次/秒，
  // 视觉步进约为 scale 0.0008 / opacity 0.003，不可感知。
  const PHASE_QUANTUM = 0.02
  let lastQuantizedStep = -1

  const BASE_CYCLE_DURATION = 4000
  const MIN_CYCLE_DURATION = 20000

  let lastGlowHour = -1
  let cachedGlowColor = '#d4a574'
  let lastAppliedColor = ''

  function computeGlowColor(): string {
    const hour = new Date().getHours()
    if (hour === lastGlowHour) return cachedGlowColor
    lastGlowHour = hour

    const colorStops: { hour: number; hex: string }[] = [
      { hour: 0, hex: '#c49a6a' },
      { hour: 6, hex: '#d4a574' },
      { hour: 12, hex: '#e8c49a' },
      { hour: 18, hex: '#c49a6a' },
    ]

    let lower = colorStops[0]
    let upper = colorStops[colorStops.length - 1]
    for (let i = 0; i < colorStops.length - 1; i++) {
      if (hour >= colorStops[i].hour && hour < colorStops[i + 1].hour) {
        lower = colorStops[i]
        upper = colorStops[i + 1]
        break
      }
    }

    const range = upper.hour - lower.hour
    const t = range === 0 ? 0 : (hour - lower.hour) / range

    const parseHex = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    })

    const lowerRgb = parseHex(lower.hex)
    const upperRgb = parseHex(upper.hex)

    const r = Math.round(lowerRgb.r + (upperRgb.r - lowerRgb.r) * t)
    const g = Math.round(lowerRgb.g + (upperRgb.g - lowerRgb.g) * t)
    const b = Math.round(lowerRgb.b + (upperRgb.b - lowerRgb.b) * t)

    const toHex = (c: number) => c.toString(16).padStart(2, '0')
    cachedGlowColor = `#${toHex(r)}${toHex(g)}${toHex(b)}`
    return cachedGlowColor
  }

  /** 将量化后的相位直接写入容器 style（CSS 变量），不触发 Vue 响应式 */
  function applyPhase(phase: number) {
    const el = containerRef.value
    if (!el) return
    const i = intensity.value
    el.style.setProperty('--breathing-scale', String(0.98 + phase * 0.04 * i))
    el.style.setProperty('--breathing-opacity', String(0.85 + phase * 0.15 * i))
    el.style.setProperty('--glow-opacity', String(phase * i))
    // glow-color 仅在小时变化时重算（值不变则跳过写，避免无谓样式失效）
    const color = computeGlowColor()
    if (color !== lastAppliedColor) {
      lastAppliedColor = color
      el.style.setProperty('--glow-color', color)
    }
  }

  function tick(timestamp: number) {
    if (!running) return

    // isPaused（Sanctuary 激活）与文档隐藏：都真正暂停循环
    if (isSanctuaryActive.value || document.hidden) {
      stopLoop()
      return
    }

    const elapsed = timestamp - startTime
    const effectiveDuration =
      MIN_CYCLE_DURATION - (MIN_CYCLE_DURATION - BASE_CYCLE_DURATION) * intensity.value

    const rawPhase = (elapsed % effectiveDuration) / effectiveDuration
    const phase = (Math.sin(rawPhase * Math.PI * 2 - Math.PI / 2) + 1) / 2

    const step = Math.round(phase / PHASE_QUANTUM)
    if (step !== lastQuantizedStep) {
      lastQuantizedStep = step
      applyPhase(step * PHASE_QUANTUM)
    }

    animationFrameId = requestAnimationFrame(tick)
  }

  function stopLoop() {
    running = false
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }
  }

  /** 恢复循环：Sanctuary 未激活且文档可见时允许运行；恢复时相位从 0 重新起跑 */
  function ensureLoop() {
    if (running) return
    if (isSanctuaryActive.value || document.hidden) return
    running = true
    startTime = performance.now()
    animationFrameId = requestAnimationFrame(tick)
  }

  // ---- visibilitychange 统一暂停/恢复 ----
  function handleVisibilityChange() {
    if (document.hidden) stopLoop()
    else ensureLoop()
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  // 容器就绪后启动（组件挂载时序）
  watch(containerRef, (el) => {
    if (el) ensureLoop()
  })

  // Sanctuary 激活/退出真正接入循环
  watch(isSanctuaryActive, (active) => {
    if (active) stopLoop()
    else ensureLoop()
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    stopLoop()
  })

  // 粒子相关派生值仍保持响应式（仅依赖 intensity，低频变化，不参与每帧循环）
  const particleSpeed = computed(() => {
    return 0.2 + 0.8 * intensity.value
  })

  const particleCount = computed(() => {
    return Math.round(50 * intensity.value)
  })

  const isPaused = computed(() => isSanctuaryActive.value)

  return {
    particleSpeed,
    particleCount,
    isPaused,
  }
}