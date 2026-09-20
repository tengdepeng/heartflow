import { describe, it, expect } from 'vitest'
import {
  getDimensionMappings,
  getMappingByDimension,
  applyDimensionMapping,
  applyAllMappings,
  type DimensionData,
  type TextureResult,
  type PositionResult,
  type DirectionResult,
} from '../dimension-mapping'

const CONFIG = {
  baseSize: 40,
  chartRange: { width: 100, height: 100 },
  metaphor: {
    palette: {
      primary: '#8a9a7a',
      secondary: '#a8b59a',
      accent: '#c46a5a',
      muted: '#6a7a6a',
      bg: '#f4f1ea',
      surface: '#fffdf7',
      border: '#d8d2c4',
      positive: '#8a9a7a',
      negative: '#c46a5a',
      neutral: '#b8b2a4',
      gradient: [[0, '#8a9a7a'], [0.5, '#f0c040'], [1, '#c46a5a']] as [number, string][],
    },
  },
}

describe('dimension-mapping 定义查询', () => {
  it('getDimensionMappings 返回 7 条维度映射定义', () => {
    const mappings = getDimensionMappings()
    expect(mappings).toHaveLength(7)
    expect(mappings.map((m) => m.dataDimension).sort()).toEqual([
      'complexity', 'density', 'magnitude', 'progress', 'trend', 'urgency', 'value',
    ])
    for (const m of mappings) {
      expect(m.name).toBeTruthy()
      expect(m.description).toBeTruthy()
      expect(m.defaultRange).toHaveLength(2)
    }
  })

  it('getMappingByDimension 按维度命中并返回视觉维度', () => {
    expect(getMappingByDimension('value')?.visualDimension).toBe('color')
    expect(getMappingByDimension('trend')?.visualDimension).toBe('direction')
    expect(getMappingByDimension('magnitude')?.visualDimension).toBe('size')
    expect(getMappingByDimension('density')?.visualDimension).toBe('opacity')
    expect(getMappingByDimension('complexity')?.visualDimension).toBe('texture')
    expect(getMappingByDimension('urgency')?.visualDimension).toBe('glow')
    expect(getMappingByDimension('progress')?.visualDimension).toBe('position')
    expect(getMappingByDimension('nope' as never)).toBeUndefined()
  })
})

describe('applyDimensionMapping 七类映射执行', () => {
  it('value → color：低值取渐变起点色，高值取终点色，区间取左端色', () => {
    const low = applyDimensionMapping(0, 'value', CONFIG)
    expect(low).toEqual({ dimension: 'color', value: '#8a9a7a' })
    const high = applyDimensionMapping(1, 'value', CONFIG)
    expect(high).toEqual({ dimension: 'color', value: '#c46a5a' })
    // 0.5 落入 [0, 0.5] 区间取左端点色；0.75 落入 [0.5, 1] 区间取中间色
    expect(applyDimensionMapping(0.5, 'value', CONFIG).value).toBe('#8a9a7a')
    expect(applyDimensionMapping(0.75, 'value', CONFIG).value).toBe('#f0c040')
  })

  it('trend → direction：上升/下降/持平', () => {
    const up = applyDimensionMapping(0.5, 'trend', CONFIG)
    expect(up).toEqual({ dimension: 'direction', value: { direction: 'up', angle: -90, arrow: '↑' } })
    const down = applyDimensionMapping(-0.5, 'trend', CONFIG)
    expect(down).toEqual({ dimension: 'direction', value: { direction: 'down', angle: 90, arrow: '↓' } })
    const flat = applyDimensionMapping(0, 'trend', CONFIG)
    expect(flat).toEqual({ dimension: 'direction', value: { direction: 'flat', angle: 0, arrow: '→' } })
  })

  it('magnitude → size：0→min 1→max（baseSize 缩放）', () => {
    const min = applyDimensionMapping(0, 'magnitude', CONFIG)
    expect(min.dimension).toBe('size')
    expect(min.value).toBeCloseTo(12, 5) // 40*0.3
    const max = applyDimensionMapping(1, 'magnitude', CONFIG)
    expect(max.value).toBeCloseTo(100, 5) // 40*2.5
    const mid = applyDimensionMapping(0.5, 'magnitude', CONFIG)
    expect(mid.value).toBeCloseTo(56, 5)
  })

  it('density → opacity：0→1 不透明，1→0.3 高密度低透明', () => {
    expect(applyDimensionMapping(0, 'density', CONFIG)).toEqual({ dimension: 'opacity', value: 1 })
    const full = applyDimensionMapping(1, 'density', CONFIG)
    expect(full.dimension).toBe('opacity')
    expect(full.value).toBeCloseTo(0.3, 10)
  })

  it('complexity → texture：稀疏/中等/致密三档', () => {
    const sparse = applyDimensionMapping(0.1, 'complexity', CONFIG) as { dimension: 'texture'; value: TextureResult }
    expect(sparse.dimension).toBe('texture')
    expect(sparse.value.density).toBe('sparse')
    const medium = applyDimensionMapping(0.5, 'complexity', CONFIG) as { dimension: 'texture'; value: TextureResult }
    expect(medium.value.density).toBe('medium')
    const dense = applyDimensionMapping(0.9, 'complexity', CONFIG) as { dimension: 'texture'; value: TextureResult }
    expect(dense.value.density).toBe('dense')
    expect(dense.value.pattern).toContain('M')
  })

  it('urgency → glow：0 无光，1 高光且用强调色', () => {
    const none = applyDimensionMapping(0, 'urgency', CONFIG)
    expect(none).toEqual({ dimension: 'glow', value: { intensity: 0, radius: 0, color: '#8a9a7a' } })
    const full = applyDimensionMapping(1, 'urgency', CONFIG)
    expect(full).toEqual({ dimension: 'glow', value: { intensity: 1, radius: 20, color: '#c46a5a' } })
  })

  it('progress → position：0.5 → normalized 0.5 / coordinate 50', () => {
    const pos = applyDimensionMapping(0.5, 'progress', CONFIG) as { dimension: 'position'; value: PositionResult }
    expect(pos.dimension).toBe('position')
    expect(pos.value.normalized).toBeCloseTo(0.5, 5)
    expect(pos.value.coordinate).toBeCloseTo(50, 5)
  })

  it('越界值被钳制到默认范围', () => {
    const over = applyDimensionMapping(2, 'density', CONFIG)
    expect(over.value).toBeCloseTo(0.3, 10)
    const under = applyDimensionMapping(-1, 'magnitude', CONFIG)
    expect(under.value).toBeCloseTo(12, 5)
  })
})

describe('applyAllMappings 批量应用', () => {
  const data: DimensionData = {
    value: 0.8, trend: 0.5, magnitude: 0.3, density: 0.6, complexity: 0.2, urgency: 0.9, progress: 0.4,
  }

  it('仅应用激活的维度', () => {
    const results = applyAllMappings(data, { value: true, trend: true, density: true }, CONFIG)
    expect(Object.keys(results).sort()).toEqual(['density', 'trend', 'value'])
    expect(results.value?.dimension).toBe('color')
    const trend = results.trend as { dimension: 'direction'; value: DirectionResult }
    expect(trend.value.arrow).toBe('↑')
  })

  it('全量激活返回 7 个映射结果', () => {
    const results = applyAllMappings(
      data,
      { value: true, trend: true, magnitude: true, density: true, complexity: true, urgency: true, progress: true },
      CONFIG,
    )
    expect(Object.keys(results)).toHaveLength(7)
  })
})
