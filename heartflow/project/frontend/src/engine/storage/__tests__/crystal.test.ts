// ============================================================
// storage/crystal 领域模块测试
// ============================================================
import { describe, it, expect, vi, afterEach } from 'vitest'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

async function freshCrystal() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getCrystals, addCrystal, setCrystals, updateCrystal, removeCrystal } = await import('../crystal')
  return { getCrystals, addCrystal, setCrystals, updateCrystal, removeCrystal }
}

function makeCrystal(overrides?: Record<string, any>) {
  return {
    id: 'c1',
    sessionId: 's1',
    color: '#7c5cfc',
    intensity: 0.5,
    shape: 'sphere' as const,
    createdAt: '2026-01-01T00:00:00Z',
    tags: [],
    insight: '',
    ...overrides,
  }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/crystal', () => {
  it('getCrystals 首次返回空数组', async () => {
    const { getCrystals } = await freshCrystal()
    expect(getCrystals()).toEqual([])
  })

  it('addCrystal 追加一条记录', async () => {
    const { getCrystals, addCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    expect(getCrystals()).toHaveLength(1)
    expect(getCrystals()[0].id).toBe('c1')
  })

  it('addCrystal 支持多条记录', async () => {
    const { getCrystals, addCrystal } = await freshCrystal()
    addCrystal(makeCrystal({ id: 'c1' }))
    addCrystal(makeCrystal({ id: 'c2' }))
    expect(getCrystals()).toHaveLength(2)
  })

  it('setCrystals 替换全部记录', async () => {
    const { getCrystals, addCrystal, setCrystals } = await freshCrystal()
    addCrystal(makeCrystal({ id: 'c1' }))
    setCrystals([makeCrystal({ id: 'c2' })])
    expect(getCrystals()).toHaveLength(1)
    expect(getCrystals()[0].id).toBe('c2')
  })

  it('updateCrystal 更新指定字段', async () => {
    const { getCrystals, addCrystal, updateCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    const result = updateCrystal('c1', { intensity: 0.9, color: '#ff0000' })
    expect(result).toBe(true)
    expect(getCrystals()[0].intensity).toBe(0.9)
    expect(getCrystals()[0].color).toBe('#ff0000')
  })

  it('updateCrystal 对不存在的 id 返回 false', async () => {
    const { addCrystal, updateCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    const result = updateCrystal('nonexistent', { intensity: 0.9 })
    expect(result).toBe(false)
  })

  it('removeCrystal 删除指定记录', async () => {
    const { getCrystals, addCrystal, removeCrystal } = await freshCrystal()
    addCrystal(makeCrystal({ id: 'c1' }))
    addCrystal(makeCrystal({ id: 'c2' }))
    const result = removeCrystal('c1')
    expect(result).toBe(true)
    expect(getCrystals()).toHaveLength(1)
    expect(getCrystals()[0].id).toBe('c2')
  })

  it('removeCrystal 对不存在的 id 返回 false', async () => {
    const { addCrystal, removeCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    const result = removeCrystal('nonexistent')
    expect(result).toBe(false)
  })

  it('addCrystal 添加后直接 updateCrystal 更新新增的字段', async () => {
    const { getCrystals, addCrystal, updateCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    const result = updateCrystal('c1', { intensity: 0.9, insight: '新感悟', tags: ['important'] })
    expect(result).toBe(true)
    const updated = getCrystals()[0]
    expect(updated.intensity).toBe(0.9)
    expect(updated.insight).toBe('新感悟')
    expect(updated.tags).toEqual(['important'])
    expect(updated.id).toBe('c1')
    expect(updated.color).toBe('#7c5cfc')
  })

  it('updateCrystal 更新不存在的字段时静默忽略', async () => {
    const { getCrystals, addCrystal, updateCrystal } = await freshCrystal()
    addCrystal(makeCrystal())
    // 传入不存在于 TimeCrystal 中的字段不会导致报错
    expect(() => updateCrystal('c1', { intensity: 0.9, unknownField: 'test' } as any)).not.toThrow()
    const crystal = getCrystals()[0]
    // 已知字段正常更新
    expect(crystal.intensity).toBe(0.9)
    expect(crystal.color).toBe('#7c5cfc')
  })

  it('removeCrystal 删除所有记录后 getCrystals 返回空数组', async () => {
    const { getCrystals, addCrystal, removeCrystal } = await freshCrystal()
    addCrystal(makeCrystal({ id: 'c1' }))
    addCrystal(makeCrystal({ id: 'c2' }))
    removeCrystal('c1')
    removeCrystal('c2')
    expect(getCrystals()).toEqual([])
  })
})