// ============================================================
// 数据可视化基础框架 · 测试
// ============================================================

import { describe, it, expect } from 'vitest'
import { hexToRgb, rgbToHex, rgbToRgba, lerpColor, lerpColorMulti, applyMappingRule, getColorFromMapping, generateGradientStops, generateColorScale, adjustOpacity, lightenColor, darkenColor } from '../color'
import { catmullRomInterpolate, linearInterpolate, stepInterpolate, getInterpolator, generateArcPath, generateRingSectors, mapDataToPlot, generateAreaPath, getPointsBBox, scalePointsToFit } from '../svg'
import { getMetaphor, getAllMetaphors, METAPHOR_LIGHT, METAPHOR_INK, METAPHOR_WOOD } from '../metaphors'
import type { Point2D, ChartSize, ColorMapping, MappingRule } from '../types'

// ============================================================
// 色彩工具测试
// ============================================================

describe('hexToRgb', () => {
  it('should parse 6-digit hex', () => {
    expect(hexToRgb('#d4a574')).toEqual([212, 165, 116])
  })

  it('should parse 3-digit hex', () => {
    expect(hexToRgb('#abc')).toEqual([170, 187, 204])
  })

  it('should handle hex without hash', () => {
    expect(hexToRgb('ff0000')).toEqual([255, 0, 0])
  })
})

describe('rgbToHex', () => {
  it('should convert rgb to hex', () => {
    expect(rgbToHex(212, 165, 116)).toBe('#d4a574')
  })

  it('should clamp values', () => {
    expect(rgbToHex(300, -10, 0)).toBe('#ff0000')
  })
})

describe('rgbToRgba', () => {
  it('should produce rgba string', () => {
    expect(rgbToRgba(212, 165, 116, 0.5)).toBe('rgba(212, 165, 116, 0.5)')
  })
})

describe('lerpColor', () => {
  it('should interpolate between two colors', () => {
    const result = lerpColor([0, 0, 0], [255, 255, 255], 0.5)
    expect(result).toEqual([128, 128, 128])
  })

  it('should return c1 at t=0', () => {
    expect(lerpColor([255, 0, 0], [0, 255, 0], 0)).toEqual([255, 0, 0])
  })

  it('should return c2 at t=1', () => {
    expect(lerpColor([255, 0, 0], [0, 255, 0], 1)).toEqual([0, 255, 0])
  })
})

describe('lerpColorMulti', () => {
  const stops: [number, string][] = [[0, '#000000'], [0.5, '#888888'], [1, '#ffffff']]

  it('should return first color at t=0', () => {
    const [r, g, b] = lerpColorMulti(stops, 0)
    expect(r).toBe(0)
    expect(g).toBe(0)
    expect(b).toBe(0)
  })

  it('should return last color at t=1', () => {
    const [r, g, b] = lerpColorMulti(stops, 1)
    expect(r).toBe(255)
    expect(g).toBe(255)
    expect(b).toBe(255)
  })

  it('should return middle color at midpoint', () => {
    const [r, g, b] = lerpColorMulti(stops, 0.5)
    expect(r).toBe(136)
    expect(g).toBe(136)
    expect(b).toBe(136)
  })
})

describe('generateGradientStops', () => {
  it('should generate evenly spaced stops', () => {
    const stops = generateGradientStops(['#000', '#fff'])
    expect(stops).toEqual([[0, '#000'], [1, '#fff']])
  })

  it('should handle single color', () => {
    expect(generateGradientStops(['#000'])).toEqual([[0, '#000']])
  })
})

describe('generateColorScale', () => {
  it('should generate n steps', () => {
    const scale = generateColorScale('#000000', '#ffffff', 3)
    expect(scale).toHaveLength(3)
    expect(scale[0]).toBe('#000000')
    expect(scale[2]).toBe('#ffffff')
  })

  it('should handle 1 step', () => {
    const scale = generateColorScale('#000', '#fff', 1)
    expect(scale).toHaveLength(1)
    expect(scale[0]).toBe('#000') // 入参 <= 1 时直接返回起始色
  })
})

describe('applyMappingRule', () => {
  it('should apply linear mapping', () => {
    const rule: MappingRule = {
      dataKey: 'test',
      mode: 'linear',
      domain: [0, 100],
      range: [0, 1],
    }
    expect(applyMappingRule(50, rule)).toBeCloseTo(0.5)
  })

  it('should apply pow mapping', () => {
    const rule: MappingRule = {
      dataKey: 'test',
      mode: 'pow',
      domain: [0, 100],
      range: [0, 100],
      exponent: 2,
    }
    expect(applyMappingRule(50, rule)).toBeCloseTo(25, 0)
  })

  it('should clamp to domain', () => {
    const rule: MappingRule = {
      dataKey: 'test',
      mode: 'linear',
      domain: [0, 100],
      range: [0, 1],
    }
    expect(applyMappingRule(-10, rule)).toBeCloseTo(0)
    expect(applyMappingRule(200, rule)).toBeCloseTo(1)
  })
})

describe('getColorFromMapping', () => {
  const mapping: ColorMapping = {
    dataKey: 'test',
    stops: [[0, '#000000'], [1, '#ffffff']],
  }

  it('should return color at position', () => {
    expect(getColorFromMapping(0, mapping)).toBe('#000000')
    expect(getColorFromMapping(1, mapping)).toBe('#ffffff')
  })

  it('should handle null', () => {
    expect(getColorFromMapping(null, mapping)).toBe('transparent')
  })

  it('should handle empty stops', () => {
    const emptyMapping: ColorMapping = { dataKey: 'test', stops: [] }
    expect(getColorFromMapping(0.5, emptyMapping)).toBe('#888')
  })
})

describe('adjustOpacity', () => {
  it('should produce correct rgba', () => {
    expect(adjustOpacity('#ff0000', 0.5)).toBe('rgba(255, 0, 0, 0.5)')
  })
})

describe('lightenColor', () => {
  it('should lighten a color', () => {
    const result = lightenColor('#000000', 0.5)
    expect(result).toBe('#808080')
  })
})

describe('darkenColor', () => {
  it('should darken a color', () => {
    const result = darkenColor('#ffffff', 0.5)
    expect(result).toBe('#808080')
  })
})

// ============================================================
// SVG 工具测试
// ============================================================

describe('catmullRomInterpolate', () => {
  it('should return empty for empty points', () => {
    expect(catmullRomInterpolate([])).toBe('')
  })

  it('should return single point for 1 point', () => {
    expect(catmullRomInterpolate([{ x: 10, y: 20 }])).toBe('M 10 20')
  })

  it('should return line for 2 points', () => {
    const result = catmullRomInterpolate([{ x: 0, y: 0 }, { x: 100, y: 100 }])
    expect(result).toBe('M 0 0 L 100 100')
  })

  it('should produce cubic bezier for 3+ points', () => {
    const points: Point2D[] = [{ x: 0, y: 0 }, { x: 50, y: 100 }, { x: 100, y: 0 }]
    const result = catmullRomInterpolate(points)
    expect(result).toContain('C ')
  })
})

describe('linearInterpolate', () => {
  it('should produce straight line path', () => {
    const points: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
    expect(linearInterpolate(points)).toBe('M 0 0 L 100 100')
  })
})

describe('stepInterpolate', () => {
  it('should produce step-before path', () => {
    const points: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
    const result = stepInterpolate(points, 'before')
    expect(result).toContain('L 100 0')
    expect(result).toContain('L 100 100')
  })
})

describe('getInterpolator', () => {
  it('should return catmull-rom interpolator', () => {
    const fn = getInterpolator('catmull-rom')
    expect(fn([{ x: 0, y: 0 }, { x: 10, y: 10 }])).toBe('M 0 0 L 10 10')
  })

  it('should return valid interpolator for all types', () => {
    for (const type of ['catmull-rom', 'linear', 'step-before', 'step-after'] as const) {
      const fn = getInterpolator(type)
      const result = fn([{ x: 0, y: 0 }, { x: 10, y: 10 }])
      expect(result).toBeTruthy()
    }
  })
})

describe('generateArcPath', () => {
  it('should generate a valid arc path', () => {
    const path = generateArcPath(100, 100, 60, 80, 0, 90)
    expect(path).toContain('M')
    expect(path).toContain('A')
    expect(path).toContain('Z')
  })

  it('should handle full circle', () => {
    const path = generateArcPath(100, 100, 60, 80, 0, 360)
    expect(path).toContain('A')
  })
})

describe('generateRingSectors', () => {
  it('should generate sectors proportional to values', () => {
    const data = [{ value: 50, color: '#ff0000' }, { value: 50, color: '#0000ff' }]
    const sectors = generateRingSectors(data, 100, 100, 60, 80)
    expect(sectors).toHaveLength(2)
    expect(sectors[0].path).toContain('M')
    expect(sectors[1].path).toContain('M')
  })

  it('should handle empty data', () => {
    expect(generateRingSectors([], 100, 100, 60, 80)).toEqual([])
  })
})

describe('mapDataToPlot', () => {
  const size: ChartSize = {
    width: 400,
    height: 300,
    padding: { top: 20, right: 20, bottom: 30, left: 40 },
  }

  it('should map data points to plot coordinates', () => {
    const data = [
      { x: 0, y: 0, value: 0 },
      { x: 1, y: 1, value: 100 },
    ]
    const mapped = mapDataToPlot(data, size, [0, 100])
    expect(mapped).toHaveLength(2)
    expect(mapped[0].y).toBe(20 + 250) // top + plotH
    expect(mapped[1].y).toBe(20) // top
  })

  it('should handle single data point', () => {
    const data = [{ x: 0, y: 0, value: 50 }]
    const mapped = mapDataToPlot(data, size, [0, 100])
    expect(mapped).toHaveLength(1)
  })
})

describe('generateAreaPath', () => {
  it('should generate closed area path', () => {
    const points: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
    const path = generateAreaPath(points, 200)
    expect(path).toContain('Z')
  })

  it('should return empty for no points', () => {
    expect(generateAreaPath([], 200)).toBe('')
  })
})

describe('getPointsBBox', () => {
  it('should calculate bounding box', () => {
    const points: Point2D[] = [{ x: 10, y: 20 }, { x: 100, y: 200 }]
    const bbox = getPointsBBox(points)
    expect(bbox).toEqual({ minX: 10, minY: 20, maxX: 100, maxY: 200 })
  })
})

describe('scalePointsToFit', () => {
  it('should scale points to fit target size', () => {
    const points: Point2D[] = [{ x: 0, y: 0 }, { x: 100, y: 100 }]
    const scaled = scalePointsToFit(points, 50, 50, 0)
    expect(scaled[1].x).toBe(50)
    expect(scaled[1].y).toBe(50)
  })

  it('should handle empty array', () => {
    expect(scalePointsToFit([], 100, 100)).toEqual([])
  })
})

// ============================================================
// 隐喻系统测试
// ============================================================

describe('getMetaphor', () => {
  it('should return light metaphor', () => {
    const meta = getMetaphor('light')
    expect(meta.type).toBe('light')
    expect(meta.name).toBe('光')
  })

  it('should return ink metaphor', () => {
    const meta = getMetaphor('ink')
    expect(meta.type).toBe('ink')
    expect(meta.name).toBe('墨')
  })

  it('should return wood metaphor', () => {
    const meta = getMetaphor('wood')
    expect(meta.type).toBe('wood')
    expect(meta.name).toBe('木')
  })
})

describe('getAllMetaphors', () => {
  it('should return all ten metaphors', () => {
    const metaphors = getAllMetaphors()
    expect(metaphors).toHaveLength(10)
  })
})

describe('metaphor palettes', () => {
  it('light metaphor should have required palette keys', () => {
    const palette = METAPHOR_LIGHT.palette
    expect(palette.primary).toBeTruthy()
    expect(palette.secondary).toBeTruthy()
    expect(palette.accent).toBeTruthy()
    expect(palette.muted).toBeTruthy()
    expect(palette.bg).toBeTruthy()
    expect(palette.surface).toBeTruthy()
    expect(palette.border).toBeTruthy()
    expect(palette.positive).toBeTruthy()
    expect(palette.negative).toBeTruthy()
    expect(palette.neutral).toBeTruthy()
    expect(palette.gradient).toHaveLength(3)
  })

  it('ink metaphor should have required palette keys', () => {
    const palette = METAPHOR_INK.palette
    expect(palette.primary).toBeTruthy()
    expect(palette.gradient).toHaveLength(3)
  })

  it('wood metaphor should have required palette keys', () => {
    const palette = METAPHOR_WOOD.palette
    expect(palette.primary).toBeTruthy()
    expect(palette.gradient).toHaveLength(3)
  })
})