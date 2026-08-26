// ============================================================
// 七维映射规则引擎 · 测试
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  SevenDimensionEngine,
  createSevenDimensionEngine,
  applyDataSourceFilter,
  getShapeAtomRenderParams,
  applySizeMapping,
  applyEnhancedColorMapping,
  applyRelationMapping,
  applyTimeMapping,
  getInteractionConfigs,
  createInteractionEvent,
  parseNaturalLanguage,
  nlpConfigToSevenDimensionConfig,
  getAllShapeAtomTypes,
  getAllSizeMappingModes,
  getAllColorMappingModes,
  getAllRelationMappingModes,
  getAllTimeMappingModes,
  getAllInteractionTypes,
  SHAPE_ATOM_LABELS,
  SIZE_MAPPING_LABELS,
  COLOR_MAPPING_LABELS,
  RELATION_MAPPING_LABELS,
  TIME_MAPPING_LABELS,
  INTERACTION_LABELS,
} from '../seven-dimensions'
import type {
  SevenDimensionDataItem,
  DataSourceFilterConfig,
  ShapeAtomConfig,
  SizeMappingConfig,
  EnhancedColorMappingConfig,
  RelationMappingConfig,
  TimeMappingConfig,
  InteractionMappingConfig,
} from '../seven-dimensions'

// ============================================================
// 测试数据
// ============================================================

function makeTestItems(count: number): SevenDimensionDataItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    label: `项目 ${i}`,
    values: {
      value: Math.random() * 100,
      usage: 10 + Math.random() * 90,
      score: Math.random() * 100,
    },
    categories: {
      type: i % 3 === 0 ? 'A' : i % 3 === 1 ? 'B' : 'C',
      group: i % 2 === 0 ? 'even' : 'odd',
    },
    timestamp: Date.now() - (count - i) * 3600000,
    metadata: { index: i },
  }))
}

// ============================================================
// 维度 1: 数据源与过滤
// ============================================================

describe('DataSourceFilter - 数据源与过滤', () => {
  const items = makeTestItems(10)

  it('should filter by time range', () => {
    const now = Date.now()
    const config: DataSourceFilterConfig = {
      mode: 'single',
      sourceIds: [],
      timeRange: {
        start: now - 5 * 3600000,
        end: now,
        enabled: true,
      },
    }

    const result = applyDataSourceFilter(items, config)
    expect(result.filteredCount).toBeGreaterThan(0)
    expect(result.filteredCount).toBeLessThanOrEqual(10)
    expect(result.appliedTimeRange).not.toBeNull()
    expect(result.appliedTimeRange!.start).toBe(now - 5 * 3600000)
  })

  it('should skip time filter when disabled', () => {
    const config: DataSourceFilterConfig = {
      mode: 'single',
      sourceIds: [],
      timeRange: { start: 0, end: 0, enabled: false },
    }
    const result = applyDataSourceFilter(items, config)
    expect(result.filteredCount).toBe(10)
    expect(result.appliedTimeRange).toBeNull()
  })

  it('should group by category field', () => {
    const config: DataSourceFilterConfig = {
      mode: 'single',
      sourceIds: [],
      timeRange: { start: 0, end: 0, enabled: false },
      faceting: { field: 'type', mode: 'group' },
    }
    const result = applyDataSourceFilter(items, config)
    expect(result.groups.length).toBe(3) // A, B, C
    expect(result.groups[0].key).toBeDefined()
    expect(result.groups[0].count).toBeGreaterThan(0)
  })

  it('should limit groups by maxGroups', () => {
    const config: DataSourceFilterConfig = {
      mode: 'single',
      sourceIds: [],
      timeRange: { start: 0, end: 0, enabled: false },
      faceting: { field: 'type', mode: 'group', maxGroups: 2 },
    }
    const result = applyDataSourceFilter(items, config)
    expect(result.groups.length).toBeLessThanOrEqual(2)
  })

  it('should sort groups by count', () => {
    const config: DataSourceFilterConfig = {
      mode: 'single',
      sourceIds: [],
      timeRange: { start: 0, end: 0, enabled: false },
      faceting: { field: 'type', mode: 'group', sortBy: 'count', sortOrder: 'desc' },
    }
    const result = applyDataSourceFilter(items, config)
    expect(result.groups.length).toBeGreaterThan(0)
    // 校验降序
    for (let i = 0; i < result.groups.length - 1; i++) {
      expect(result.groups[i].count).toBeGreaterThanOrEqual(result.groups[i + 1].count)
    }
  })
})

// ============================================================
// 维度 2: 形状原子
// ============================================================

describe('ShapeAtom - 形状原子', () => {
  it('should return all 10 shape types', () => {
    const types = getAllShapeAtomTypes()
    expect(types).toHaveLength(10)
    expect(types).toContain('light-point')
    expect(types).toContain('light-arc')
    expect(types).toContain('custom-svg')
  })

  it('should have Chinese labels for all shapes', () => {
    const types = getAllShapeAtomTypes()
    for (const type of types) {
      expect(SHAPE_ATOM_LABELS[type]).toBeTruthy()
      expect(typeof SHAPE_ATOM_LABELS[type]).toBe('string')
    }
  })

  it('should return render params for light-point', () => {
    const config: ShapeAtomConfig = { type: 'light-point' }
    const params = getShapeAtomRenderParams(config)
    expect(params.type).toBe('light-point')
    expect(params.label).toBe('光点')
    expect(params.pathDef).toBeTruthy()
    expect(params.defaultSize.width).toBeGreaterThan(0)
  })

  it('should return render params for light-arc', () => {
    const config: ShapeAtomConfig = { type: 'light-arc' }
    const params = getShapeAtomRenderParams(config)
    expect(params.type).toBe('light-arc')
    expect(params.label).toBe('光弧')
    expect(params.pathDef).toContain('A')
  })

  it('should support dynamic shape by field', () => {
    const config: ShapeAtomConfig = {
      type: 'light-point',
      dynamicByField: 'type',
      dynamicShapeMap: {
        A: 'light-arc',
        B: 'light-column',
        C: 'light-point',
      },
    }
    const itemA: SevenDimensionDataItem = {
      id: 'a',
      values: {},
      categories: { type: 'A' },
    }
    const itemB: SevenDimensionDataItem = {
      id: 'b',
      values: {},
      categories: { type: 'B' },
    }

    const paramsA = getShapeAtomRenderParams(config, itemA)
    const paramsB = getShapeAtomRenderParams(config, itemB)

    expect(paramsA.type).toBe('light-arc')
    expect(paramsB.type).toBe('light-column')
  })

  it('should support custom SVG', () => {
    const customSvg = '<circle cx="10" cy="10" r="8" />'
    const config: ShapeAtomConfig = { type: 'custom-svg', customSvg }
    const params = getShapeAtomRenderParams(config)
    expect(params.type).toBe('custom-svg')
    expect(params.customSvg).toBe(customSvg)
  })
})

// ============================================================
// 维度 3: 大小映射
// ============================================================

describe('SizeMapping - 大小映射', () => {
  const item: SevenDimensionDataItem = {
    id: 'test',
    values: { value: 50, usage: 75 },
    categories: {},
  }

  it('should map value to size linearly', () => {
    const config: SizeMappingConfig = {
      mode: 'size-by-value',
      field: 'value',
      domain: [0, 100],
      range: [4, 40],
    }
    const result = applySizeMapping(item, config)
    expect(result.mode).toBe('size-by-value')
    expect(result.normalized).toBeCloseTo(0.5)
    expect(result.value).toBeCloseTo(22) // 4 + 0.5*36
    expect(result.targetProperty).toBe('shapeSize')
  })

  it('should support sqrt scale', () => {
    const config: SizeMappingConfig = {
      mode: 'size-by-value',
      field: 'value',
      domain: [0, 100],
      range: [0, 100],
      scale: 'sqrt',
    }
    const result = applySizeMapping(item, config)
    expect(result.normalized).toBeCloseTo(Math.sqrt(0.5))
    expect(result.value).toBeCloseTo(Math.sqrt(0.5) * 100)
  })

  it('should support pow scale', () => {
    const config: SizeMappingConfig = {
      mode: 'size-by-value',
      field: 'value',
      domain: [0, 100],
      range: [0, 100],
      scale: 'pow',
      exponent: 2,
    }
    const result = applySizeMapping(item, config)
    expect(result.normalized).toBeCloseTo(0.25)
  })

  it('should support reverse', () => {
    const config: SizeMappingConfig = {
      mode: 'size-by-value',
      field: 'value',
      domain: [0, 100],
      range: [0, 100],
      reverse: true,
    }
    const result = applySizeMapping(item, config)
    expect(result.normalized).toBeCloseTo(0.5)
    expect(result.value).toBeCloseTo(50)
  })

  it('should clamp to domain', () => {
    const config: SizeMappingConfig = {
      mode: 'size-by-value',
      field: 'value',
      domain: [0, 100],
      range: [0, 100],
    }
    const lowItem = { ...item, values: { value: -50 } }
    const highItem = { ...item, values: { value: 200 } }

    expect(applySizeMapping(lowItem, config).normalized).toBe(0)
    expect(applySizeMapping(highItem, config).normalized).toBe(1)
  })

  it('should have all 7 size mapping modes', () => {
    const modes = getAllSizeMappingModes()
    expect(modes).toHaveLength(7)
    for (const mode of modes) {
      expect(SIZE_MAPPING_LABELS[mode]).toBeTruthy()
    }
  })
})

// ============================================================
// 维度 4: 颜色映射（增强版）
// ============================================================

describe('ColorMapping - 颜色映射（增强版）', () => {
  const item: SevenDimensionDataItem = {
    id: 'test',
    values: { value: 50 },
    categories: { type: 'A' },
    timestamp: Date.now(),
  }

  it('should map by category', () => {
    const config: EnhancedColorMappingConfig = {
      mode: 'category',
      category: {
        field: 'type',
        colorMap: { A: '#ff0000', B: '#00ff00', C: '#0000ff' },
        defaultColor: '#888888',
      },
    }
    const result = applyEnhancedColorMapping(item, config)
    expect(result.mode).toBe('category')
    expect(result.color).toBe('#ff0000')
    expect(result.categoryLabel).toBe('A')
  })

  it('should use default color for unknown category', () => {
    const config: EnhancedColorMappingConfig = {
      mode: 'category',
      category: {
        field: 'type',
        colorMap: { B: '#00ff00' },
        defaultColor: '#888888',
      },
    }
    const result = applyEnhancedColorMapping(item, config)
    expect(result.color).toBe('#888888')
  })

  it('should map by continuous gradient', () => {
    const config: EnhancedColorMappingConfig = {
      mode: 'continuous',
      continuous: {
        field: 'value',
        domain: [0, 100],
        stops: [[0, '#000000'], [1, '#ffffff']],
      },
    }
    const result = applyEnhancedColorMapping(item, config)
    expect(result.mode).toBe('continuous')
    expect(result.color).toBeTruthy()
    expect(result.normalized).toBeCloseTo(0.5)
  })

  it('should map by unified color', () => {
    const config: EnhancedColorMappingConfig = {
      mode: 'unified',
      unified: { color: '#d4a574' },
    }
    const result = applyEnhancedColorMapping(item, config)
    expect(result.mode).toBe('unified')
    expect(result.color).toBe('#d4a574')
  })

  it('should map by time period', () => {
    const config: EnhancedColorMappingConfig = {
      mode: 'time-period',
      timePeriod: {
        field: 'timestamp',
        periodType: 'hour',
        periodMap: { '0': '#ff0000', '12': '#00ff00' },
      },
    }
    const result = applyEnhancedColorMapping(item, config)
    expect(result.mode).toBe('time-period')
    expect(result.color).toBeTruthy()
  })

  it('should have all 5 color mapping modes', () => {
    const modes = getAllColorMappingModes()
    expect(modes).toHaveLength(5)
    for (const mode of modes) {
      expect(COLOR_MAPPING_LABELS[mode]).toBeTruthy()
    }
  })
})

// ============================================================
// 维度 5: 关系映射
// ============================================================

describe('RelationMapping - 关系映射', () => {
  const items = makeTestItems(6)
  const chartSize = { width: 800, height: 600 }

  it('should layout around same center', () => {
    const config: RelationMappingConfig = { mode: 'around-same-center' }
    const result = applyRelationMapping(items, config, chartSize)
    expect(result.mode).toBe('around-same-center')
    expect(result.positions).toHaveLength(6)
    expect(result.positions[0]).toHaveLength(2)
  })

  it('should layout left-to-right', () => {
    const config: RelationMappingConfig = { mode: 'left-to-right', spacing: 20 }
    const result = applyRelationMapping(items, config, chartSize)
    expect(result.positions).toHaveLength(6)
    // All y should be the same (center)
    const firstY = result.positions[0][1]
    for (const pos of result.positions) {
      expect(pos[1]).toBeCloseTo(firstY)
    }
    // x should be increasing
    for (let i = 1; i < result.positions.length; i++) {
      expect(result.positions[i][0]).toBeGreaterThan(result.positions[i - 1][0])
    }
  })

  it('should layout grid', () => {
    const config: RelationMappingConfig = { mode: 'grid', gridColumns: 3, spacing: 20 }
    const result = applyRelationMapping(items, config, chartSize)
    expect(result.positions).toHaveLength(6)
  })

  it('should generate connections for light-thread-connected', () => {
    const config: RelationMappingConfig = { mode: 'light-thread-connected' }
    const result = applyRelationMapping(items, config, chartSize)
    expect(result.connections).toBeDefined()
    expect(result.connections!.length).toBe(6)
    expect(result.connections![0].path).toContain('M')
    expect(result.connections![0].path).toContain('L')
  })

  it('should handle empty items', () => {
    const config: RelationMappingConfig = { mode: 'free-scatter' }
    const result = applyRelationMapping([], config, chartSize)
    expect(result.positions).toHaveLength(0)
    expect(result.boundingBox.minX).toBe(0)
  })

  it('should have all 10 relation mapping modes', () => {
    const modes = getAllRelationMappingModes()
    expect(modes).toHaveLength(10)
    for (const mode of modes) {
      expect(RELATION_MAPPING_LABELS[mode]).toBeTruthy()
    }
  })
})

// ============================================================
// 维度 6: 时间映射
// ============================================================

describe('TimeMapping - 时间映射', () => {
  const now = Date.now()
  const item: SevenDimensionDataItem = {
    id: 'test',
    values: {},
    categories: {},
    timestamp: now - 3600000, // 1 hour ago
  }

  it('should map time with left-to-right mode', () => {
    const config: TimeMappingConfig = {
      mode: 'left-to-right',
      field: 'timestamp',
      timeRange: { start: now - 7200000, end: now },
      granularity: 'hour',
    }
    const result = applyTimeMapping(item, config)
    expect(result.mode).toBe('left-to-right')
    expect(result.normalizedTime).toBeCloseTo(0.5)
    expect(result.label).toBeTruthy()
    expect(result.visible).toBe(true)
  })

  it('should return visible=false when currentTime < normalizedTime', () => {
    const config: TimeMappingConfig = {
      mode: 'left-to-right',
      field: 'timestamp',
      timeRange: { start: now - 7200000, end: now },
    }
    const result = applyTimeMapping(item, config, 0.3)
    expect(result.visible).toBe(false)
  })

  it('should return visible=true when currentTime >= normalizedTime', () => {
    const config: TimeMappingConfig = {
      mode: 'left-to-right',
      field: 'timestamp',
      timeRange: { start: now - 7200000, end: now },
    }
    const result = applyTimeMapping(item, config, 0.7)
    expect(result.visible).toBe(true)
  })

  it('should handle none mode', () => {
    const config: TimeMappingConfig = { mode: 'none', field: 'timestamp' }
    const result = applyTimeMapping(item, config)
    expect(result.mode).toBe('none')
    expect(result.visible).toBe(true)
  })

  it('should handle missing timestamp', () => {
    const config: TimeMappingConfig = { mode: 'left-to-right', field: 'timestamp' }
    const noTsItem = { ...item, timestamp: undefined }
    const result = applyTimeMapping(noTsItem, config)
    expect(result.normalizedTime).toBe(0)
    expect(result.visible).toBe(true)
  })

  it('should have all 5 time mapping modes', () => {
    const modes = getAllTimeMappingModes()
    expect(modes).toHaveLength(5)
    for (const mode of modes) {
      expect(TIME_MAPPING_LABELS[mode]).toBeTruthy()
    }
  })
})

// ============================================================
// 维度 7: 交互与响应映射
// ============================================================

describe('InteractionMapping - 交互与响应映射', () => {
  it('should filter enabled interactions', () => {
    const config: InteractionMappingConfig = {
      interactions: [
        { type: 'click-expand', enabled: true },
        { type: 'hover-label', enabled: true },
        { type: 'click-navigate', enabled: false },
        { type: 'none', enabled: false },
      ],
      responsive: true,
    }
    const active = getInteractionConfigs(config)
    expect(active).toHaveLength(2)
    expect(active[0].type).toBe('click-expand')
    expect(active[1].type).toBe('hover-label')
  })

  it('should return empty when no interactions enabled', () => {
    const config: InteractionMappingConfig = {
      interactions: [
        { type: 'click-expand', enabled: false },
        { type: 'hover-label', enabled: false },
      ],
      responsive: false,
    }
    const active = getInteractionConfigs(config)
    expect(active).toHaveLength(0)
  })

  it('should create interaction event', () => {
    const event = createInteractionEvent('click-expand', 3, { detail: 'test' })
    expect(event.type).toBe('click-expand')
    expect(event.targetIndex).toBe(3)
    expect(event.payload.detail).toBe('test')
  })

  it('should have all 9 interaction types', () => {
    const types = getAllInteractionTypes()
    expect(types).toHaveLength(9)
    for (const type of types) {
      expect(INTERACTION_LABELS[type]).toBeTruthy()
    }
  })
})

// ============================================================
// 七维映射引擎
// ============================================================

describe('SevenDimensionEngine - 七维映射引擎', () => {
  const items = makeTestItems(8)

  it('should apply all 7 dimensions with default config', () => {
    const engine = new SevenDimensionEngine()
    const output = engine.apply(items, { width: 800, height: 600 })

    expect(output.dataSource).toBeDefined()
    expect(output.dataSource.filteredCount).toBe(8)
    expect(output.relation).toBeDefined()
    expect(output.relation.positions).toHaveLength(8)
    expect(output.items).toHaveLength(8)

    // 检查每个 item 的渲染参数
    for (const item of output.items) {
      expect(item.itemId).toBeTruthy()
      expect(item.shape).toBeDefined()
      expect(item.shape.type).toBe('light-point')
      expect(item.size).toBeDefined()
      expect(item.size.mode).toBe('size-by-value')
      expect(item.color).toBeDefined()
      expect(item.color.mode).toBe('unified')
      expect(item.color.color).toBe('#d4a574')
      expect(item.position).toHaveLength(2)
      expect(item.time).toBeDefined()
      expect(item.interaction).toBeDefined()
      expect(item.opacity).toBeGreaterThanOrEqual(0)
      expect(item.opacity).toBeLessThanOrEqual(1)
      expect(item.raw).toBeDefined()
    }
  })

  it('should support custom config', () => {
    const engine = new SevenDimensionEngine({
      shape: { type: 'light-arc' },
      color: {
        mode: 'category',
        category: {
          field: 'type',
          colorMap: { A: '#ff0000', B: '#00ff00', C: '#0000ff' },
          defaultColor: '#888888',
        },
      },
      relation: { mode: 'around-same-center' },
      interaction: {
        interactions: [
          { type: 'click-expand', enabled: true },
          { type: 'hover-label', enabled: true },
        ],
        responsive: true,
      },
    })

    const output = engine.apply(items, { width: 800, height: 600 })

    expect(output.items[0].shape.type).toBe('light-arc')
    expect(output.items[0].color.mode).toBe('category')
    expect(output.relation.mode).toBe('around-same-center')
    expect(output.items[0].interaction).toHaveLength(2)
  })

  it('should update config after creation', () => {
    const engine = new SevenDimensionEngine({ shape: { type: 'light-point' } })

    engine.updateConfig({ shape: { type: 'light-column' } })
    const config = engine.getConfig()
    expect(config.shape!.type).toBe('light-column')
  })

  it('factory function should create engine', () => {
    const engine = createSevenDimensionEngine({ shape: { type: 'glow' } })
    const output = engine.apply(items, { width: 800, height: 600 })
    expect(output.items[0].shape.type).toBe('glow')
  })

  it('should handle empty items', () => {
    const engine = new SevenDimensionEngine()
    const output = engine.apply([], { width: 800, height: 600 })
    expect(output.items).toHaveLength(0)
    expect(output.relation.positions).toHaveLength(0)
    expect(output.dataSource.filteredCount).toBe(0)
  })

  it('should handle single item', () => {
    const engine = new SevenDimensionEngine()
    const singleItem = makeTestItems(1)
    const output = engine.apply(singleItem, { width: 800, height: 600 })
    expect(output.items).toHaveLength(1)
    expect(output.relation.positions).toHaveLength(1)
  })
})

// ============================================================
// 自然语言解析
// ============================================================

describe('NaturalLanguageParser - 自然语言解析', () => {
  it('should parse the example description', () => {
    const desc = '用光弧来表示每个应用。应用的使用时长决定光弧的长度。应用的类别决定光弧的颜色。所有光弧围绕同一个圆心排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-arc')
    expect(result.subject).toBe('应用')
    expect(result.sizeMappings.length).toBeGreaterThan(0)
    expect(result.sizeMappings[0].field).toBe('使用时长')
    expect(result.sizeMappings[0].mode).toBe('height-length-by-value')
    expect(result.colorMappings.length).toBeGreaterThan(0)
    expect(result.colorMappings[0].field).toBe('类别')
    expect(result.colorMappings[0].mode).toBe('category')
    expect(result.relation).toBe('around-same-center')
    expect(result.success).toBe(true)
  })

  it('should parse light-point description', () => {
    const desc = '用光点来表示每个用户。用户的活跃度决定光点的大小。所有光点以网格排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-point')
    expect(result.subject).toBe('用户')
    expect(result.sizeMappings.length).toBeGreaterThan(0)
    expect(result.relation).toBe('grid')
  })

  it('should parse light-column description', () => {
    const desc = '用光柱来表示每个城市。城市的GDP决定光柱的高度。城市所在区域决定光柱的颜色。所有光柱从左到右排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-column')
    expect(result.sizeMappings.length).toBeGreaterThan(0)
    expect(result.colorMappings.length).toBeGreaterThan(0)
    expect(result.relation).toBe('left-to-right')
  })

  it('should parse light-thread-connected', () => {
    const desc = '用光丝连接来表示数据之间的关系。从中心向外辐射排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-thread')
    expect(result.relation).toBe('center-outward-radial')
  })

  it('should parse spiral layout', () => {
    const desc = '用光泡来表示每个事件。事件按时间螺旋向外排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-bubble')
    expect(result.relation).toBe('spiral')
  })

  it('should parse stacked layout', () => {
    const desc = '用光矩来表示每个部门。所有部门堆叠排列。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-rectangle')
    expect(result.relation).toBe('stacked')
  })

  it('should handle "no time dimension"', () => {
    const desc = '用光点表示数据。没有时间维度。'

    const result = parseNaturalLanguage(desc)

    expect(result.time).toBe('none')
  })

  it('should convert parsed result to config', () => {
    const desc = '用光弧来表示每个应用。应用的使用时长决定光弧的长度。应用的类别决定光弧的颜色。所有光弧围绕同一个圆心排列。'

    const parsed = parseNaturalLanguage(desc)
    const items = makeTestItems(5)
    const config = nlpConfigToSevenDimensionConfig(parsed, items)

    expect(config.shape).toBeDefined()
    expect(config.shape!.type).toBe('light-arc')
    expect(config.size).toBeDefined()
    expect(config.size!.mode).toBe('height-length-by-value')
    expect(config.size!.field).toBe('使用时长')
    expect(config.color).toBeDefined()
    expect(config.color!.mode).toBe('category')
    expect(config.relation).toBeDefined()
    expect(config.relation!.mode).toBe('around-same-center')
  })

  it('should handle unrecognized sentences', () => {
    const desc = '用光点表示数据。这是一段无法识别的描述。'

    const result = parseNaturalLanguage(desc)

    expect(result.shape).toBe('light-point')
    expect(result.unrecognized.length).toBeGreaterThan(0)
    expect(result.unrecognized[0]).toContain('无法识别')
  })

  it('should return success=false for completely unrecognized', () => {
    const desc = '这是一段完全无法识别的描述文本。'

    const result = parseNaturalLanguage(desc)

    expect(result.success).toBe(false)
    expect(result.shape).toBeNull()
    expect(result.unrecognized.length).toBeGreaterThan(0)
  })
})

// ============================================================
// 标签完整性
// ============================================================

describe('Labels - 标签完整性', () => {
  it('SHAPE_ATOM_LABELS should have all 10 entries', () => {
    expect(Object.keys(SHAPE_ATOM_LABELS)).toHaveLength(10)
  })

  it('SIZE_MAPPING_LABELS should have all 7 entries', () => {
    expect(Object.keys(SIZE_MAPPING_LABELS)).toHaveLength(7)
  })

  it('COLOR_MAPPING_LABELS should have all 5 entries', () => {
    expect(Object.keys(COLOR_MAPPING_LABELS)).toHaveLength(5)
  })

  it('RELATION_MAPPING_LABELS should have all 10 entries', () => {
    expect(Object.keys(RELATION_MAPPING_LABELS)).toHaveLength(10)
  })

  it('TIME_MAPPING_LABELS should have all 5 entries', () => {
    expect(Object.keys(TIME_MAPPING_LABELS)).toHaveLength(5)
  })

  it('INTERACTION_LABELS should have all 9 entries', () => {
    expect(Object.keys(INTERACTION_LABELS)).toHaveLength(9)
  })
})

// ============================================================
// 综合场景测试
// ============================================================

describe('Integration - 综合场景', () => {
  it('should handle full pipeline from NLP to rendering', () => {
    const desc = '用光柱来表示每个城市。城市的GDP决定光柱的高度。城市所在区域决定光柱的颜色。从左到右排列。'
    const items = makeTestItems(5)

    const parsed = parseNaturalLanguage(desc)
    expect(parsed.success).toBe(true)

    const config = nlpConfigToSevenDimensionConfig(parsed, items)
    const engine = new SevenDimensionEngine(config)
    const output = engine.apply(items, { width: 800, height: 600 })

    expect(output.items).toHaveLength(5)
    expect(output.items[0].shape.type).toBe('light-column')
    expect(output.items[0].size.mode).toBe('height-length-by-value')
    expect(output.relation.mode).toBe('left-to-right')
  })

  it('should handle all relation modes with data', () => {
    const allModes: RelationMappingConfig['mode'][] = [
      'around-same-center',
      'left-to-right',
      'top-to-bottom',
      'center-outward-radial',
      'stacked',
      'nested',
      'free-scatter',
      'grid',
      'spiral',
      'light-thread-connected',
    ]

    const items = makeTestItems(6)
    const chartSize = { width: 800, height: 600 }

    for (const mode of allModes) {
      const config: RelationMappingConfig = { mode }
      const result = applyRelationMapping(items, config, chartSize)
      expect(result.mode).toBe(mode)
      expect(result.positions).toHaveLength(6)
      expect(result.boundingBox).toBeDefined()

      // 所有位置应在图表范围内
      for (const [x, y] of result.positions) {
        expect(x).toBeGreaterThanOrEqual(0)
        expect(x).toBeLessThanOrEqual(chartSize.width)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(y).toBeLessThanOrEqual(chartSize.height)
      }
    }
  })
})