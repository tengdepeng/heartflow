// ============================================================
// 颜色工具函数 · 测试
// ============================================================

import { describe, expect, it } from 'vitest'
import { CRYSTAL_COLORS_BY_MODE, CRYSTAL_COLORS, pickColorByMode, pickCrystalColor, hexToRgba } from './colors'

describe('CRYSTAL_COLORS_BY_MODE', () => {
  it('focus 模式有 4 个颜色', () => {
    expect(CRYSTAL_COLORS_BY_MODE.focus).toHaveLength(4)
  })

  it('nap 模式有 4 个颜色', () => {
    expect(CRYSTAL_COLORS_BY_MODE.nap).toHaveLength(4)
  })

  it('free 模式有 4 个颜色', () => {
    expect(CRYSTAL_COLORS_BY_MODE.free).toHaveLength(4)
  })
})

describe('CRYSTAL_COLORS', () => {
  it('合并所有模式颜色，每模式 4 色', () => {
    const modes = Object.keys(CRYSTAL_COLORS_BY_MODE)
    for (const m of modes) {
      expect(CRYSTAL_COLORS_BY_MODE[m as keyof typeof CRYSTAL_COLORS_BY_MODE]).toHaveLength(4)
    }
    expect(CRYSTAL_COLORS).toHaveLength(modes.length * 4)
  })

  it('所有颜色以 # 开头', () => {
    for (const c of CRYSTAL_COLORS) {
      expect(c).toMatch(/^#[0-9a-f]{6}$/)
    }
  })
})

describe('pickColorByMode', () => {
  it('focus 模式返回 focus 色板中的颜色', () => {
    const color = pickColorByMode('focus')
    expect(CRYSTAL_COLORS_BY_MODE.focus).toContain(color)
  })

  it('nap 模式返回 nap 色板中的颜色', () => {
    const color = pickColorByMode('nap')
    expect(CRYSTAL_COLORS_BY_MODE.nap).toContain(color)
  })

  it('free 模式返回 free 色板中的颜色', () => {
    const color = pickColorByMode('free')
    expect(CRYSTAL_COLORS_BY_MODE.free).toContain(color)
  })

  it('未知模式回退到 focus', () => {
    const color = pickColorByMode('unknown' as any)
    expect(CRYSTAL_COLORS_BY_MODE.focus).toContain(color)
  })
})

describe('pickCrystalColor', () => {
  it('默认从 CRYSTAL_COLORS 中选取', () => {
    const color = pickCrystalColor()
    expect(CRYSTAL_COLORS).toContain(color)
  })

  it('从自定义颜色列表中选取', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff']
    const color = pickCrystalColor(colors)
    expect(colors).toContain(color)
  })
})

describe('hexToRgba', () => {
  it('将 #7c5cfc 转为 rgba', () => {
    expect(hexToRgba('#7c5cfc')).toBe('rgba(124,92,252,1)')
  })

  it('支持透明度参数', () => {
    expect(hexToRgba('#7c5cfc', 0.5)).toBe('rgba(124,92,252,0.5)')
  })

  it('处理短十六进制颜色', () => {
    const result = hexToRgba('#fff', 0.8)
    expect(result).toMatch(/^rgba\(/)
    expect(result).toContain('0.8')
  })
})