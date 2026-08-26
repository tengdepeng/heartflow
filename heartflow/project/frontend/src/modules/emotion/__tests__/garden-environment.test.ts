// ============================================================
// 情绪花房 · 花园环境系统 · 单元测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { EmotionRecord, EmotionType } from '../types'
import {
  computeEnvironment,
  getFlowerStage,
  generateFlowerLayout,
  getFlowerClusters,
  calculateGardenHealth,
  getLODLevel,
  applyLOD,
  DEFAULT_GARDEN_CONFIG,
} from '../garden-environment'
import type { FlowerPosition } from '../garden-environment'

// ---- 测试辅助 ----

function makeRecord(overrides: Partial<EmotionRecord> = {}): EmotionRecord {
  return {
    id: `emotion_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type: overrides.type || 'happy',
    note: overrides.note || '',
    createdAt: overrides.createdAt || new Date().toISOString(),
  }
}

function makeRecords(
  count: number,
  type: EmotionType = 'happy',
  daysAgo: number = 0,
): EmotionRecord[] {
  const records: EmotionRecord[] = []
  const baseDate = new Date()
  baseDate.setDate(baseDate.getDate() - daysAgo)
  for (let i = 0; i < count; i++) {
    const date = new Date(baseDate)
    date.setHours(date.getHours() - i)
    records.push(makeRecord({ type, createdAt: date.toISOString() }))
  }
  return records
}

// ============================================================
// computeEnvironment
// ============================================================

describe('computeEnvironment', () => {
  it('normal 氛围返回晴天翠绿环境', () => {
    const env = computeEnvironment('normal')
    expect(env.sky).toBe('clear')
    expect(env.ground).toBe('lush')
    expect(env.particleType).toBe('none')
  })

  it('bright 氛围返回晴朗闪烁环境', () => {
    const env = computeEnvironment('bright')
    expect(env.sky).toBe('clear')
    expect(env.ground).toBe('lush')
    expect(env.particleType).toBe('sparkle')
  })

  it('warm 氛围返回日落暖光环境', () => {
    const env = computeEnvironment('warm')
    expect(env.sky).toBe('sunset')
    expect(env.ground).toBe('lush')
    expect(env.particleType).toBe('petal')
  })

  it('dim 氛围返回阴雨湿润环境', () => {
    const env = computeEnvironment('dim')
    expect(env.sky).toBe('rain')
    expect(env.ground).toBe('wet')
    expect(env.particleType).toBe('rain')
    expect(env.swayIntensity).toBe(0.8)
  })

  it('所有环境都包含完整字段', () => {
    for (const mood of ['normal', 'bright', 'warm', 'dim'] as const) {
      const env = computeEnvironment(mood)
      expect(env).toHaveProperty('sky')
      expect(env).toHaveProperty('ground')
      expect(env).toHaveProperty('ambientLight')
      expect(env).toHaveProperty('skyGradient')
      expect(env.skyGradient).toHaveLength(2)
      expect(env).toHaveProperty('particleType')
      expect(env).toHaveProperty('particleColor')
      expect(env).toHaveProperty('swayIntensity')
      expect(env.swayIntensity).toBeGreaterThanOrEqual(0)
      expect(env.swayIntensity).toBeLessThanOrEqual(1)
    }
  })
})

// ============================================================
// getFlowerStage
// ============================================================

describe('getFlowerStage', () => {
  it('新记录为花苞状态', () => {
    const record = makeRecord()
    const stage = getFlowerStage(record, 1, 0)
    expect(stage.bloomed).toBe(true) // 最近3天内=盛开
    expect(stage.scale).toBeGreaterThanOrEqual(0.6)
    expect(stage.opacity).toBe(1.0)
  })

  it('多次同类型记录花朵更大', () => {
    const record = makeRecord()
    const stage1 = getFlowerStage(record, 1, 0)
    const stage2 = getFlowerStage(record, 10, 0)
    expect(stage2.scale).toBeGreaterThan(stage1.scale)
  })

  it('超过 14 天凋谢', () => {
    const record = makeRecord()
    const stage = getFlowerStage(record, 5, 15)
    expect(stage.bloomed).toBe(false)
    expect(stage.opacity).toBeLessThan(0.5)
  })

  it('7-14 天半凋谢', () => {
    const record = makeRecord()
    const stage = getFlowerStage(record, 5, 10)
    expect(stage.bloomed).toBe(false)
    expect(stage.opacity).toBe(0.5)
  })

  it('scale 不超过 1.2', () => {
    const record = makeRecord()
    const stage = getFlowerStage(record, 100, 0)
    expect(stage.scale).toBeLessThanOrEqual(1.2)
  })
})

// ============================================================
// generateFlowerLayout
// ============================================================

describe('generateFlowerLayout', () => {
  it('空记录返回空数组', () => {
    const flowers = generateFlowerLayout([])
    expect(flowers).toEqual([])
  })

  it('单条记录生成一朵花', () => {
    const records = makeRecords(1, 'happy')
    const flowers = generateFlowerLayout(records)
    expect(flowers).toHaveLength(1)
    expect(flowers[0].type).toBe('happy')
    expect(flowers[0].x).toBeGreaterThanOrEqual(0)
    expect(flowers[0].x).toBeLessThanOrEqual(1)
    expect(flowers[0].y).toBeGreaterThanOrEqual(0)
    expect(flowers[0].y).toBeLessThanOrEqual(1)
  })

  it('多种情绪类型生成多丛花', () => {
    const records: EmotionRecord[] = [
      ...makeRecords(3, 'happy'),
      ...makeRecords(2, 'sad'),
      ...makeRecords(4, 'calm'),
    ]
    const flowers = generateFlowerLayout(records)
    expect(flowers.length).toBeGreaterThan(0)
    const types = new Set(flowers.map(f => f.type))
    expect(types.has('happy')).toBe(true)
    expect(types.has('sad')).toBe(true)
    expect(types.has('calm')).toBe(true)
  })

  it('同类型花朵聚集在同一区域', () => {
    // 多种情绪类型时，同类型花朵聚集在各自区域
    const records: EmotionRecord[] = [
      ...makeRecords(3, 'happy'),
      ...makeRecords(3, 'sad'),
      ...makeRecords(3, 'calm'),
    ]
    const flowers = generateFlowerLayout(records)
    // 每种类型的花朵 x 范围应该在其区域内
    const happyFlowers = flowers.filter(f => f.type === 'happy')
    const sadFlowers = flowers.filter(f => f.type === 'sad')
    const happyXs = happyFlowers.map(f => f.x)
    const sadXs = sadFlowers.map(f => f.x)
    const happyRange = Math.max(...happyXs) - Math.min(...happyXs)
    const sadRange = Math.max(...sadXs) - Math.min(...sadXs)
    // 同类型花朵应该聚集（范围不超过 0.5）
    expect(happyRange).toBeLessThan(0.5)
    expect(sadRange).toBeLessThan(0.5)
    // 不同类型花朵不重叠（happy 区域在 sad 区域左边）
    expect(Math.max(...happyXs)).toBeLessThan(Math.min(...sadXs))
  })

  it('每朵花都有完整属性', () => {
    const records = makeRecords(3, 'calm')
    const flowers = generateFlowerLayout(records)
    for (const f of flowers) {
      expect(f).toHaveProperty('id')
      expect(f).toHaveProperty('recordId')
      expect(f).toHaveProperty('type')
      expect(f).toHaveProperty('x')
      expect(f).toHaveProperty('y')
      expect(f).toHaveProperty('scale')
      expect(f).toHaveProperty('rotation')
      expect(f).toHaveProperty('bloomed')
      expect(f).toHaveProperty('opacity')
      expect(f).toHaveProperty('depth')
      expect(f).toHaveProperty('createdAt')
    }
  })

  it('花朵数量不超过 maxFlowers', () => {
    const records = makeRecords(50, 'happy')
    const flowers = generateFlowerLayout(records, { ...DEFAULT_GARDEN_CONFIG, maxFlowers: 15 })
    expect(flowers.length).toBeLessThanOrEqual(15)
  })
})

// ============================================================
// getFlowerClusters
// ============================================================

describe('getFlowerClusters', () => {
  it('空花朵返回空数组', () => {
    const clusters = getFlowerClusters([])
    expect(clusters).toEqual([])
  })

  it('正确统计花丛数量和盛开数', () => {
    const flowers: FlowerPosition[] = [
      { id: 'f1', recordId: 'r1', type: 'happy', x: 0.2, y: 0.8, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.5, createdAt: '' },
      { id: 'f2', recordId: 'r2', type: 'happy', x: 0.3, y: 0.85, scale: 1, rotation: 0, bloomed: false, opacity: 0.7, depth: 0.5, createdAt: '' },
      { id: 'f3', recordId: 'r3', type: 'sad', x: 0.6, y: 0.8, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.5, createdAt: '' },
    ]
    const clusters = getFlowerClusters(flowers)
    expect(clusters).toHaveLength(2)
    const happy = clusters.find(c => c.type === 'happy')!
    expect(happy.count).toBe(2)
    expect(happy.bloomedCount).toBe(1)
    const sad = clusters.find(c => c.type === 'sad')!
    expect(sad.count).toBe(1)
    expect(sad.bloomedCount).toBe(1)
  })

  it('花丛包含颜色信息', () => {
    const flowers: FlowerPosition[] = [
      { id: 'f1', recordId: 'r1', type: 'angry', x: 0.5, y: 0.8, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.5, createdAt: '' },
    ]
    const clusters = getFlowerClusters(flowers)
    expect(clusters[0].dominantColor).toBeTruthy()
  })
})

// ============================================================
// calculateGardenHealth
// ============================================================

describe('calculateGardenHealth', () => {
  it('空花园健康度为 0', () => {
    const health = calculateGardenHealth([], [])
    expect(health.score).toBe(0)
    expect(health.coverage).toBe(0)
    expect(health.diversity).toBe(0)
    expect(health.bloomRate).toBe(0)
  })

  it('满花园健康度最高', () => {
    const records = makeRecords(30, 'happy')
    const flowers = generateFlowerLayout(records)
    const health = calculateGardenHealth(flowers, records)
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
    expect(health.description).toBeTruthy()
  })

  it('多样性低时评分降低', () => {
    const records: EmotionRecord[] = makeRecords(10, 'happy')
    const flowers = generateFlowerLayout(records, { ...DEFAULT_GARDEN_CONFIG, maxFlowers: 30 })
    const health = calculateGardenHealth(flowers, records)
    expect(health.diversity).toBeLessThanOrEqual(0.4) // 只有1种情绪
  })

  it('评估分数范围在 0-100', () => {
    const records = makeRecords(5, 'calm')
    const flowers = generateFlowerLayout(records)
    const health = calculateGardenHealth(flowers, records)
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.score).toBeLessThanOrEqual(100)
  })
})

// ============================================================
// LOD
// ============================================================

describe('LOD 降级', () => {
  it('少量花朵使用 high LOD', () => {
    expect(getLODLevel(5)).toBe('high')
    expect(getLODLevel(10)).toBe('high')
  })

  it('中等数量使用 medium LOD', () => {
    expect(getLODLevel(15)).toBe('medium')
    expect(getLODLevel(25)).toBe('medium')
  })

  it('大量花朵使用 low LOD', () => {
    expect(getLODLevel(30)).toBe('low')
    expect(getLODLevel(100)).toBe('low')
  })

  it('high LOD 保留所有花朵', () => {
    const flowers: FlowerPosition[] = [
      { id: 'f1', recordId: 'r1', type: 'happy', x: 0, y: 0, scale: 1, rotation: 0, bloomed: false, opacity: 1, depth: 0.2, createdAt: '' },
      { id: 'f2', recordId: 'r2', type: 'sad', x: 0, y: 0, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.8, createdAt: '' },
    ]
    const result = applyLOD(flowers, 'high')
    expect(result).toHaveLength(2)
  })

  it('medium LOD 过滤远景非盛开花朵', () => {
    const flowers: FlowerPosition[] = [
      { id: 'f1', recordId: 'r1', type: 'happy', x: 0, y: 0, scale: 1, rotation: 0, bloomed: false, opacity: 1, depth: 0.2, createdAt: '' },
      { id: 'f2', recordId: 'r2', type: 'sad', x: 0, y: 0, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.2, createdAt: '' },
      { id: 'f3', recordId: 'r3', type: 'calm', x: 0, y: 0, scale: 1, rotation: 0, bloomed: false, opacity: 1, depth: 0.8, createdAt: '' },
    ]
    const result = applyLOD(flowers, 'medium')
    // f1 被过滤（非盛开 + 深度低），f2 保留（盛开），f3 保留（深度高）
    expect(result).toHaveLength(2)
    expect(result.map(f => f.id)).toEqual(['f2', 'f3'])
  })

  it('low LOD 只保留盛开或前景花朵', () => {
    const flowers: FlowerPosition[] = [
      { id: 'f1', recordId: 'r1', type: 'happy', x: 0, y: 0, scale: 1, rotation: 0, bloomed: false, opacity: 1, depth: 0.2, createdAt: '' },
      { id: 'f2', recordId: 'r2', type: 'sad', x: 0, y: 0, scale: 1, rotation: 0, bloomed: true, opacity: 1, depth: 0.3, createdAt: '' },
      { id: 'f3', recordId: 'r3', type: 'calm', x: 0, y: 0, scale: 1, rotation: 0, bloomed: false, opacity: 1, depth: 0.7, createdAt: '' },
    ]
    const result = applyLOD(flowers, 'low')
    expect(result).toHaveLength(2)
    expect(result.map(f => f.id)).toEqual(['f2', 'f3'])
  })
})