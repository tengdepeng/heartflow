// ============================================================
// 数据可视化基础框架 · 色彩映射工具
// 颜色插值、色标生成、语义色映射
// ============================================================

import type { ColorMapping, MappingRule } from './types'

// ============================================================
// 颜色解析
// ============================================================

/** 将 hex 颜色字符串解析为 RGB 数组 */
export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b]
  }
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ]
}

/** 将 RGB 数组转为 rgba 字符串 */
export function rgbToRgba(r: number, g: number, b: number, a = 1): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/** 将 RGB 数组转为 hex 字符串 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

// ============================================================
// 颜色插值
// ============================================================

/** 在两个颜色之间线性插值 */
export function lerpColor(
  c1: [number, number, number],
  c2: [number, number, number],
  t: number,
): [number, number, number] {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return [
    clamp(c1[0] + (c2[0] - c1[0]) * t),
    clamp(c1[1] + (c2[1] - c1[1]) * t),
    clamp(c1[2] + (c2[2] - c1[2]) * t),
  ]
}

/** 在多个颜色之间分段插值 */
export function lerpColorMulti(
  stops: [number, string][],
  t: number,
): [number, number, number] {
  if (stops.length === 0) return [0, 0, 0]
  if (stops.length === 1) return hexToRgb(stops[0][1])

  const sorted = [...stops].sort((a, b) => a[0] - b[0])
  const clampedT = Math.max(0, Math.min(1, t))

  // 边界情况
  if (clampedT <= sorted[0][0]) return hexToRgb(sorted[0][1])
  if (clampedT >= sorted[sorted.length - 1][0]) return hexToRgb(sorted[sorted.length - 1][1])

  // 找到插值区间
  for (let i = 0; i < sorted.length - 1; i++) {
    const [posA, colorA] = sorted[i]
    const [posB, colorB] = sorted[i + 1]
    if (clampedT >= posA && clampedT <= posB) {
      const localT = posB - posA === 0 ? 0 : (clampedT - posA) / (posB - posA)
      return lerpColor(hexToRgb(colorA), hexToRgb(colorB), localT)
    }
  }

  return hexToRgb(sorted[sorted.length - 1][1])
}

// ============================================================
// 色标生成
// ============================================================

/** 生成渐变色标数组 */
export function generateGradientStops(
  colors: string[],
  positions?: number[],
): [number, string][] {
  if (colors.length === 0) return []
  if (colors.length === 1) return [[0, colors[0]]]

  const pos = positions ?? colors.map((_, i) => i / (colors.length - 1))
  return colors.map((c, i) => [pos[i] ?? i / (colors.length - 1), c] as [number, string])
}

/** 生成连续色标（从起始色到结束色，n 个阶梯） */
export function generateColorScale(
  from: string,
  to: string,
  steps: number,
): string[] {
  if (steps <= 1) return [from]
  const rgbFrom = hexToRgb(from)
  const rgbTo = hexToRgb(to)
  const colors: string[] = []
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1)
    const [r, g, b] = lerpColor(rgbFrom, rgbTo, t)
    colors.push(rgbToHex(r, g, b))
  }
  return colors
}

// ============================================================
// 颜色映射
// ============================================================

/** 根据颜色映射规则获取颜色 */
export function getColorFromMapping(
  value: number | null | undefined,
  mapping: ColorMapping,
): string {
  if (value === null || value === undefined) {
    return mapping.nullColor ?? 'transparent'
  }

  const t = value
  // 遍历色标
  const sorted = [...mapping.stops].sort((a, b) => a[0] - b[0])
  if (sorted.length === 0) return mapping.defaultColor ?? '#888'

  if (t <= sorted[0][0]) return sorted[0][1]
  if (t >= sorted[sorted.length - 1][0]) return sorted[sorted.length - 1][1]

  for (let i = 0; i < sorted.length - 1; i++) {
    if (t >= sorted[i][0] && t <= sorted[i + 1][0]) {
      const localT = (t - sorted[i][0]) / (sorted[i + 1][0] - sorted[i][0])
      const [r, g, b] = lerpColor(hexToRgb(sorted[i][1]), hexToRgb(sorted[i + 1][1]), localT)
      return rgbToHex(r, g, b)
    }
  }

  return sorted[sorted.length - 1][1]
}

// ============================================================
// 数值映射
// ============================================================

/** 根据映射规则将数值映射到输出范围 */
export function applyMappingRule(
  value: number,
  rule: MappingRule,
): number {
  const [dMin, dMax] = rule.domain
  const [rMin, rMax] = rule.range
  const dRange = dMax - dMin || 1
  let t = (value - dMin) / dRange
  t = Math.max(0, Math.min(1, t))

  switch (rule.mode) {
    case 'log': {
      const base = 10
      const logMin = Math.log(1 + t * (base - 1)) / Math.log(base)
      return rMin + logMin * (rMax - rMin)
    }
    case 'pow': {
      const exp = rule.exponent ?? 2
      return rMin + Math.pow(t, exp) * (rMax - rMin)
    }
    case 'sqrt': {
      return rMin + Math.sqrt(t) * (rMax - rMin)
    }
    case 'step': {
      const thresholds = rule.thresholds ?? [0.25, 0.5, 0.75]
      let step = 0
      for (const th of thresholds) {
        if (t >= th) step++
      }
      const stepSize = (rMax - rMin) / (thresholds.length + 1)
      return rMin + step * stepSize
    }
    case 'quantile': {
      // 分位数映射：等分输出范围
      const qThresholds = rule.thresholds ?? [0.2, 0.4, 0.6, 0.8]
      let q = 0
      for (const th of qThresholds) {
        if (t >= th) q++
      }
      const qStep = (rMax - rMin) / (qThresholds.length + 1)
      return rMin + q * qStep
    }
    default: {
      // linear
      return rMin + t * (rMax - rMin)
    }
  }
}

// ============================================================
// 语义色
// ============================================================

/** 根据数值获取语义色（正/负/中性） */
export function getSemanticColor(
  value: number,
  palette: {
    positive: string
    negative: string
    neutral: string
  },
  threshold = 0,
): string {
  if (value > threshold) return palette.positive
  if (value < -threshold) return palette.negative
  return palette.neutral
}

/** 透明度调整 */
export function adjustOpacity(color: string, opacity: number): string {
  const rgb = hexToRgb(color)
  return rgbToRgba(rgb[0], rgb[1], rgb[2], Math.max(0, Math.min(1, opacity)))
}

/** 变亮颜色 */
export function lightenColor(color: string, amount: number): string {
  const [r, g, b] = hexToRgb(color)
  const factor = Math.max(0, Math.min(1, amount))
  return rgbToHex(
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  )
}

/** 变暗颜色 */
export function darkenColor(color: string, amount: number): string {
  const [r, g, b] = hexToRgb(color)
  const factor = Math.max(0, Math.min(1, amount))
  return rgbToHex(
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  )
}

// ============================================================
// 预置色板
// ============================================================

/** 暖金色系（默认） */
export const PALETTE_GOLD = {
  primary: '#d4a574',
  secondary: '#e8c49a',
  accent: '#f0d6b0',
  muted: '#8a7a6a',
  bg: '#1a1612',
  surface: '#2a2420',
  border: '#3a3430',
  positive: '#7ec8a0',
  negative: '#c87a7a',
  neutral: '#8a8a8a',
  gradient: [[0, '#2a2420'], [0.5, '#d4a574'], [1, '#f0d6b0']] as [number, string][],
}

/** 冷静蓝系 */
export const PALETTE_COOL = {
  primary: '#7a9ec8',
  secondary: '#a0c0e0',
  accent: '#c0d8f0',
  muted: '#6a7a8a',
  bg: '#12161a',
  surface: '#1e242a',
  border: '#2e343a',
  positive: '#7ec8a0',
  negative: '#c87a7a',
  neutral: '#8a8a8a',
  gradient: [[0, '#1e242a'], [0.5, '#7a9ec8'], [1, '#c0d8f0']] as [number, string][],
}

/** 自然绿系 */
export const PALETTE_NATURE = {
  primary: '#7aa87a',
  secondary: '#a0c8a0',
  accent: '#c0e0c0',
  muted: '#6a7a6a',
  bg: '#121a12',
  surface: '#1e2a1e',
  border: '#2e3a2e',
  positive: '#7ec8a0',
  negative: '#c87a7a',
  neutral: '#8a8a8a',
  gradient: [[0, '#1e2a1e'], [0.5, '#7aa87a'], [1, '#c0e0c0']] as [number, string][],
}

/** 预设色板集合 */
export const BUILTIN_PALETTES = {
  gold: PALETTE_GOLD,
  cool: PALETTE_COOL,
  nature: PALETTE_NATURE,
} as const