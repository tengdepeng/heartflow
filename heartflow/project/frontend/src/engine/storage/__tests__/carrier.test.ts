// ============================================================
// storage/carrier 领域模块测试
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

async function freshModule() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getCarriers, setCarriers } = await import('../carrier')
  return { getCarriers, setCarriers }
}

afterEach(() => { delete (globalThis as any).localStorage })

const sampleCarrier = {
  id: 'car1', name: '笔记载体', type: 'jade-bead' as const,
  beadCount: 0, maxBeads: 108, segment: 0,
  colors: { primary: '#7c5cfc', secondary: '#4f8cff', accent: '#36d6e7' },
  active: true, advisorId: null, createdAt: '2026-01-01T00:00:00Z',
  lifecycleStage: 'newborn' as const,
  lastUsedAt: null,
  usageCount: 0,
  inheritedTo: null,
  inheritedFrom: null,
}

describe('storage/carrier', () => {
  it('getCarriers 首次返回空数组', async () => {
    const { getCarriers } = await freshModule()
    expect(getCarriers()).toEqual([])
  })

  it('setCarriers 写入后返回新数据', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([sampleCarrier])
    expect(getCarriers()).toHaveLength(1)
    expect(getCarriers()[0].name).toBe('笔记载体')
  })

  it('setCarriers 替换已有数据', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([{ ...sampleCarrier, id: 'car1', name: '旧' }])
    setCarriers([{ ...sampleCarrier, id: 'car2', name: '新' }])
    expect(getCarriers()).toHaveLength(1)
    expect(getCarriers()[0].id).toBe('car2')
  })

  it('setCarriers 写入空数组', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([sampleCarrier])
    setCarriers([])
    expect(getCarriers()).toEqual([])
  })

  it('setCarriers 写入多条数据', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([
      { ...sampleCarrier, id: 'car1', name: '第一' },
      { ...sampleCarrier, id: 'car2', name: '第二' },
      { ...sampleCarrier, id: 'car3', name: '第三' },
    ])
    expect(getCarriers()).toHaveLength(3)
  })

  it('setCarriers 写入后保留 beadCount 字段', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([{ ...sampleCarrier, beadCount: 42 }])
    expect(getCarriers()[0].beadCount).toBe(42)
  })

  it('setCarriers 写入后保留 active 字段', async () => {
    const { getCarriers, setCarriers } = await freshModule()
    setCarriers([{ ...sampleCarrier, active: false }])
    expect(getCarriers()[0].active).toBe(false)
  })
})