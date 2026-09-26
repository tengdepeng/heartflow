import { computed, onUnmounted, ref, type Ref } from 'vue'

/**
 * 画布呼吸效果 — 纯 CSS 动画驱动（零 rAF、零每帧样式写入）。
 *
 * 演进史：
 * - v1：每帧把 breathPhase 写响应式 ref，驱动组件重渲染并强制 style 重算；
 * - v2：rAF 循环直写容器 --breathing-scale / --breathing-opacity / --glow-opacity
 *   （PHASE_QUANTUM 量化后约 12 次/秒）；
 * - v3（本版）：彻底删除 rAF。真机（Android WebView）实测 v2 的 12Hz 变更会让
 *   全屏 .canvas-room 反复「样式失效→合成层重提交→box-shadow 全屏重绘」，
 *   表现为结晶层高频频闪。与 BreathingLayer / crystal-float 修复同范式：
 *   动画只动合成属性（transform/opacity），JS 不参与每帧。
 *
 * 本函数现在只做两件低频的事：
 * 1. 产出呼吸参数 CSS 变量（--cb-cycle / --cb-amp / --cb-glow），
 *    仅在 intensity 变化时重算，由 .canvas-room 的 CSS keyframes 消费；
 * 2. 维护时段辉光色 --glow-color（小时级变化，每分钟对表一次）。
 * 呼吸本身、辉光明暗全部交给 CSS 动画（见 CanvasRoom.vue 样式块）。
 */

/** 时段辉光色：按小时在四个色标间线性插值（与 v2 一致） */
export function computeCanvasGlowColor(now: Date = new Date()): string {
  const colorStops: { hour: number; hex: string }[] = [
    { hour: 0, hex: '#c49a6a' },
    { hour: 6, hex: '#d4a574' },
    { hour: 12, hex: '#e8c49a' },
    { hour: 18, hex: '#c49a6a' },
  ]

  const hour = now.getHours()
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
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** 呼吸周期：intensity 1 → 4s（满强度明显呼吸），intensity 0 → 20s（几乎静止）。与 v2 公式一致 */
export function canvasBreathCycleMs(intensity: number): number {
  const i = Math.min(1, Math.max(0, intensity))
  return Math.round(20000 - 16000 * i)
}

export function useCanvasBreathing(
  intensity: Ref<number>,
  isSanctuaryActive: Ref<boolean>,
) {
  // ---- 时段辉光色（小时级低频：每分钟对表一次，值不变时 Vue 自动去重） ----
  const glowColor = ref(computeCanvasGlowColor())
  const colorTimer = setInterval(() => {
    glowColor.value = computeCanvasGlowColor()
  }, 60_000)

  onUnmounted(() => clearInterval(colorTimer))

  // ---- 呼吸参数（仅随 intensity 低频重算，交给 CSS keyframes 消费） ----
  const breathVars = computed<Record<string, string>>(() => {
    const i = Math.min(1, Math.max(0, intensity.value))
    return {
      '--cb-cycle': `${canvasBreathCycleMs(i)}ms`,
      '--cb-amp': String(i),
      '--cb-glow': String(i),
      '--glow-color': glowColor.value,
    }
  })

  // 粒子相关派生值（仅依赖 intensity，低频变化）
  const particleSpeed = computed(() => {
    return 0.2 + 0.8 * intensity.value
  })

  const particleCount = computed(() => {
    return Math.round(50 * intensity.value)
  })

  const isPaused = computed(() => isSanctuaryActive.value)

  return {
    /** 呼吸参数 + 辉光色 CSS 变量（低频，绑定到 .canvas-room 容器） */
    breathVars,
    glowColor,
    particleSpeed,
    particleCount,
    isPaused,
  }
}
