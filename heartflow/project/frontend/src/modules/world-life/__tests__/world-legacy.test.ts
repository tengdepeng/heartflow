// ============================================================
// 世界传承引擎 · 测试
// ============================================================
import { describe, expect, it, vi } from 'vitest'

const mockKV: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, def: any) => mockKV[key] ?? def),
    setKV: vi.fn((key: string, val: any) => { mockKV[key] = val }),
    getCarriers: vi.fn(() => []),
    setCarriers: vi.fn(),
    getConfig: vi.fn(() => ({ lifecycle: { segments: 27, growingThreshold: 0.3, matureThreshold: 0.7, agingDays: 30, autoProgression: true, inheritRatio: 0.3 } })),
  },
}))

vi.mock('../will', () => ({
  useWill: () => ({
    createFromCarrier: vi.fn(),
    getByCarrierId: vi.fn(() => null),
    inheritWill: vi.fn(),
  }),
}))

vi.mock('../decoration-history', () => ({
  recordDecorationHistory: vi.fn(),
}))

import { useWorldLegacy } from '../world-legacy'
import type { JadeBeadCarrier } from '../../carrier'

function makeCarrier(overrides: Partial<JadeBeadCarrier> = {}): JadeBeadCarrier {
  return {
    id: `carrier_${Date.now()}`,
    name: '测试载体',
    active: true,
    beadCount: 0,
    maxBeads: 108,
    segment: 1,
    lifecycleStage: 'newborn',
    usageCount: 0,
    createdAt: new Date().toISOString(),
    colors: { primary: '#fff', secondary: '#000', accent: '#888' },
    shape: 'sphere',
    ...overrides,
  } as JadeBeadCarrier
}

describe('world-legacy 世界传承', () => {
  it('useWorldLegacy 返回 API 对象', () => {
    const api = useWorldLegacy()
    api._reset()
    expect(api).toBeDefined()
    expect(typeof api.beginNewGeneration).toBe('function')
    expect(typeof api.load).toBe('function')
    expect(typeof api.generateLegacyNarrative).toBe('function')
  })

  it('load 初始为空', () => {
    const api = useWorldLegacy()
    api._reset()
    api.load()
    expect(api.generations.value).toHaveLength(0)
    expect(api.currentGeneration.value).toBeNull()
  })

  it('beginNewGeneration 创建第一个世代', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier = makeCarrier({ name: '初代' })
    const gen = api.beginNewGeneration(carrier)

    expect(gen.number).toBe(1)
    expect(gen.carrierName).toBe('初代')
    expect(gen.endedAt).toBeNull()
    expect(api.currentGeneration.value).not.toBeNull()
    expect(api.currentGeneration.value!.number).toBe(1)
  })

  it('beginNewGeneration 结束上一世代并开始新世代', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier1 = makeCarrier({ id: 'c1', name: '初代' })
    api.beginNewGeneration(carrier1)

    const carrier2 = makeCarrier({ id: 'c2', name: '二代' })
    const gen2 = api.beginNewGeneration(carrier2, [
      { id: 's1', name: '种子', source: 'game', sourceId: 'g1', timestamp: '', emotion: 0.5, tags: [], inherited: false, description: '', rarity: 'rare', createdAt: '' },
    ], ['w1'])

    expect(gen2.number).toBe(2)
    expect(gen2.inheritedSeedCount).toBe(1)
    expect(gen2.inheritedWillCount).toBe(1)
    expect(gen2.inheritedFromCarrierId).toBe('c1')

    // 初代已结束
    const gen1 = api.generations.value.find(g => g.number === 1)
    expect(gen1?.endedAt).not.toBeNull()
  })

  it('legacy 计算属性返回完整摘要', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier1 = makeCarrier({ name: '初代' })
    api.beginNewGeneration(carrier1)

    const carrier2 = makeCarrier({ name: '二代' })
    api.beginNewGeneration(carrier2, [
      { id: 's1', name: '种子', source: 'game', sourceId: 'g1', timestamp: '', emotion: 0.5, tags: [], inherited: false, description: '', rarity: 'rare', createdAt: '' },
    ], ['w1'])

    expect(api.legacy.value.totalGenerations).toBe(2)
    expect(api.legacy.value.totalInheritedSeeds).toBe(1)
    expect(api.legacy.value.totalInheritedWills).toBe(1)
  })

  it('updateStats 更新当前世代统计', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier = makeCarrier({ name: '初代' })
    api.beginNewGeneration(carrier)

    api.updateStats({ focusMinutes: 120, flowerCount: 5 })
    expect(api.currentGeneration.value?.focusMinutes).toBe(120)
    expect(api.currentGeneration.value?.flowerCount).toBe(5)
  })

  it('generateLegacyNarrative 生成传承叙事', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier1 = makeCarrier({ name: '初代' })
    api.beginNewGeneration(carrier1)

    const carrier2 = makeCarrier({ name: '二代' })
    api.beginNewGeneration(carrier2, [], ['w1', 'w2'])

    const narrative = api.generateLegacyNarrative()
    expect(narrative.length).toBe(1)
    expect(narrative[0]).toContain('初代')
    expect(narrative[0]).toContain('二代')
    expect(narrative[0]).toContain('遗志')
  })

  it('getLegacyTree 返回传承树结构', () => {
    const api = useWorldLegacy()
    api._reset()
    const carrier1 = makeCarrier({ name: '初代' })
    api.beginNewGeneration(carrier1)

    const tree = api.getLegacyTree()
    expect(tree.length).toBe(1)
    expect(tree[0].label).toContain('初代')
  })
})