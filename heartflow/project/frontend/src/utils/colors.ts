// ============================================================
// 颜色工具函数
// ============================================================

import type { FocusMode } from '../types'
import { CATEGORY_PALETTE } from '../theme/categoryColors'

/** 专注模式 → 结晶色系映射（暖琥珀同温层，源自 theme/categoryColors） */
export const CRYSTAL_COLORS_BY_MODE: Record<FocusMode, string[]> = {
  focus: [CATEGORY_PALETTE[7], CATEGORY_PALETTE[11], CATEGORY_PALETTE[10], CATEGORY_PALETTE[6]],
  nap:   [CATEGORY_PALETTE[8], CATEGORY_PALETTE[9], CATEGORY_PALETTE[3], CATEGORY_PALETTE[10]],
  free:  [CATEGORY_PALETTE[4], CATEGORY_PALETTE[5], CATEGORY_PALETTE[3], CATEGORY_PALETTE[14]],
}

/** 所有颜色平铺（向后兼容） */
export const CRYSTAL_COLORS: string[] = Object.values(CRYSTAL_COLORS_BY_MODE).flat()

/** 根据专注模式选择一个颜色 */
export function pickColorByMode(mode: FocusMode): string {
  const palette = CRYSTAL_COLORS_BY_MODE[mode] ?? CRYSTAL_COLORS_BY_MODE.focus
  return palette[Math.floor(Math.random() * palette.length)]
}

/** 随机选色（旧版兼容，无模式时备用） */
export function pickCrystalColor(colors: string[] = CRYSTAL_COLORS): string {
  return colors[Math.floor(Math.random() * colors.length)]
}

export function hexToRgba(hex: string, alpha: number = 1): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}
