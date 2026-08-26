// ============================================================
// 数据可视化基础框架 · 配置管理
// 从 AppConfig 读取可视化配置，提供默认值回退和自定义覆盖
// 纯函数，无 Vue/Pinia 依赖
// ============================================================

import type { MetaphorConfig, MetaphorPalette, MetaphorType } from './types'
import { METAPHOR_MAP } from './metaphors'

// ---- 类型（与 AppConfig 中的 visualization 字段对齐） ----

export interface VisualizationConfigSource {
  /** 当前激活的隐喻类型 */
  activeMetaphor: string
  /** 预置色板ID */
  builtinPaletteId: string
  /** 自定义调色板 */
  customPalette: {
    primary?: string
    secondary?: string
    accent?: string
    muted?: string
    bg?: string
    surface?: string
    border?: string
    positive?: string
    negative?: string
    neutral?: string
    gradient?: [number, string][]
  } | null
}

// ---- 内置色板 ----

const BUILTIN_PALETTES: Record<string, Partial<MetaphorPalette>> = {
  gold: {
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
    gradient: [[0, '#2a2420'], [0.5, '#d4a574'], [1, '#f0d6b0']],
  },
  cool: {
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
    gradient: [[0, '#1e242a'], [0.5, '#7a9ec8'], [1, '#c0d8f0']],
  },
  nature: {
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
    gradient: [[0, '#1e2a1e'], [0.5, '#7aa87a'], [1, '#c0e0c0']],
  },
}

// ---- 公共函数 ----

/**
 * 获取生效的隐喻配置（考虑用户自定义覆盖）
 *
 * 优先级：
 * 1. 用户自定义调色板 (customPalette) 覆盖 specific 字段
 * 2. 预置色板 (builtinPaletteId) 覆盖隐喻的默认调色板
 * 3. 隐喻的默认调色板作为基础
 */
export function getEffectiveMetaphor(config: VisualizationConfigSource): MetaphorConfig {
  const base = { ...METAPHOR_MAP[config.activeMetaphor as MetaphorType] ?? METAPHOR_MAP.light }

  // 如果没有自定义，直接返回基础隐喻
  if (!config.customPalette && !config.builtinPaletteId) {
    return base
  }

  // 深拷贝 palette 防止修改原始数据
  const palette = { ...base.palette }

  // 应用预置色板
  if (config.builtinPaletteId) {
    const builtin = BUILTIN_PALETTES[config.builtinPaletteId]
    if (builtin) {
      Object.assign(palette, builtin)
    }
  }

  // 应用用户自定义调色板
  if (config.customPalette) {
    for (const [key, val] of Object.entries(config.customPalette)) {
      if (val !== null && val !== undefined) {
        ;(palette as Record<string, unknown>)[key] = val
      }
    }
  }

  return {
    ...base,
    palette,
    defaults: { ...base.defaults },
  }
}

/**
 * 获取所有可用的预置色板名称
 */
export function getBuiltinPaletteIds(): string[] {
  return Object.keys(BUILTIN_PALETTES)
}

/**
 * 获取预置色板的调色板（用于预览）
 */
export function getBuiltinPalette(id: string): Partial<MetaphorPalette> | null {
  return BUILTIN_PALETTES[id] ?? null
}