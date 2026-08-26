// ============================================================
// 先祖遗志 · 核心逻辑测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useWill } from '../index'
import type { JadeBeadCarrier } from '../../../types'

// 模拟 storage
const { mockKV } = vi.hoisted(() => {
  const mockKV: Record<string, any> = {}
  return { mockKV }
})
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, def: T) => mockKV[key] ?? def,
    setKV: (key: string, val: any) => { mockKV[key] = val },
  },
}))

function sampleCarrier(overrides: Partial<JadeBeadCarrier> = {}): JadeBeadCarrier {
  return {
    id: 'carrier_1',
    name: '测试载体',
    type: 'jade-bead',
    beadCount: 80,
    maxBeads: 108,
    segment: 3,
    colors: { primary: '#7c5cfc', secondary: '#4f8cff', accent: '#f0c040' },
    active: false,
    advisorId: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    lifecycleStage: 'mature',
    lastUsedAt: '2026-06-01T00:00:00.000Z',
    usageCount: 30,
    inheritedTo: null,
    inheritedFrom: null,
    ...overrides,
  }
}

describe('先祖遗志模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV['hf:wills'] = []
    useWill().load()
  })

  it('创建遗志：从载体生成', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1', name: '专注之链', usageCount: 30 })
    const result = will.createFromCarrier(carrier, ['坚持就是胜利'], '完成 100 次专注')
    expect(result.name).toBe('专注之链的遗志')
    expect(result.grade).toBe('common')
    expect(result.sourceCarrierId).toBe('c1')
    expect(result.carrierSnapshot.finalBeadCount).toBe(80)
    expect(result.insights).toEqual(['坚持就是胜利'])
  })

  it('遗志等级判定：精粹（usageCount >= 50）', () => {
    const will = useWill()
    const carrier = sampleCarrier({ usageCount: 60 })
    const result = will.createFromCarrier(carrier, [], null)
    expect(result.grade).toBe('essence')
  })

  it('遗志等级判定：传承（usageCount >= 200）', () => {
    const will = useWill()
    const carrier = sampleCarrier({ usageCount: 250 })
    const result = will.createFromCarrier(carrier, [], null)
    expect(result.grade).toBe('heritage')
  })

  it('继承遗志：标记已继承', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1' })
    const created = will.createFromCarrier(carrier, [], null)
    expect(created.inheritedByCarrierId).toBeNull()

    const result = will.inheritWill(created.id, 'carrier_new')
    expect(result).not.toBeNull()
    expect(result!.inheritedByCarrierId).toBe('carrier_new')
    expect(result!.inheritedAt).not.toBeNull()
  })

  it('继承遗志：已继承的遗志不可重复继承', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1' })
    const created = will.createFromCarrier(carrier, [], null)

    will.inheritWill(created.id, 'carrier_new1')
    const result = will.inheritWill(created.id, 'carrier_new2')
    expect(result).toBeNull()
  })

  it('获取传承链：从子遗志追溯到最早的祖先', () => {
    const will = useWill()
    // 三代传承
    const c1 = sampleCarrier({ id: 'c1', name: '一代' })
    const w1 = will.createFromCarrier(c1, [], null)

    const c2 = sampleCarrier({ id: 'c2', name: '二代' })
    // 模拟 c2 继承 w1
    will.inheritWill(w1.id, 'c2')
    const w2 = will.createFromCarrier(c2, [], null)
    expect(w2.parentWillId).toBe(w1.id)

    const c3 = sampleCarrier({ id: 'c3', name: '三代' })
    will.inheritWill(w2.id, 'c3')
    const w3 = will.createFromCarrier(c3, [], null)
    expect(w3.parentWillId).toBe(w2.id)

    const chain = will.getInheritanceChain(w3.id)
    expect(chain).toHaveLength(3)
    expect(chain[0].carrierSnapshot.name).toBe('一代')
    expect(chain[1].carrierSnapshot.name).toBe('二代')
    expect(chain[2].carrierSnapshot.name).toBe('三代')
  })

  it('获取未继承的遗志', () => {
    const will = useWill()
    const c1 = sampleCarrier({ id: 'c1' })
    const c2 = sampleCarrier({ id: 'c2' })
    will.createFromCarrier(c1, [], null)
    const w2 = will.createFromCarrier(c2, [], null)
    will.inheritWill(w2.id, 'c3')

    expect(will.uninheritedWills.value).toHaveLength(1)
    expect(will.inheritedWills.value).toHaveLength(1)
  })

  it('按载体 ID 查找遗志', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1' })
    will.createFromCarrier(carrier, [], null)

    const found = will.getByCarrierId('c1')
    expect(found).toBeDefined()
    expect(found!.sourceCarrierId).toBe('c1')
  })

  it('删除遗志', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1' })
    const created = will.createFromCarrier(carrier, [], null)

    expect(will.allWills.value).toHaveLength(1)
    will.remove(created.id)
    expect(will.allWills.value).toHaveLength(0)
  })

  it('重复生成同一载体的遗志：更新而非新建', () => {
    const will = useWill()
    const carrier = sampleCarrier({ id: 'c1', usageCount: 30 })
    const w1 = will.createFromCarrier(carrier, ['旧见解'], null)
    expect(w1.grade).toBe('common')

    // 更新 usageCount 后再次生成
    carrier.usageCount = 60
    const w2 = will.createFromCarrier(carrier, ['新见解'], null)
    expect(w2.id).toBe(w1.id)
    expect(w2.grade).toBe('essence')
    expect(w2.insights).toEqual(['新见解'])
    expect(will.allWills.value).toHaveLength(1)
  })
})