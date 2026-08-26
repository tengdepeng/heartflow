// ============================================================
// storage/goal 领域模块测试
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
  const { getGoals, setGoals } = await import('../goal')
  return { getGoals, setGoals }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/goal', () => {
  it('getGoals 首次返回空数组', async () => {
    const { getGoals } = await freshModule()
    expect(getGoals()).toEqual([])
  })

  it('setGoals 写入后返回新数据', async () => {
    const { getGoals, setGoals } = await freshModule()
    const goals = [
      { id: 'g1', title: '学习Vue', description: '', tier: 'target' as const, status: 'seed' as const, domain: 'growth' as const, order: 0, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', anchorCount: 0, anchorDone: 0 },
      { id: 'g2', title: '锻炼身体', description: '', tier: 'target' as const, status: 'sprout' as const, domain: 'health' as const, order: 0, createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z', anchorCount: 0, anchorDone: 0 },
    ]
    setGoals(goals)
    expect(getGoals()).toHaveLength(2)
    expect(getGoals()[0].title).toBe('学习Vue')
  })

  it('setGoals 替换已有数据', async () => {
    const { getGoals, setGoals } = await freshModule()
    setGoals([{ id: 'g1', title: '旧', description: '', tier: 'target' as const, status: 'seed' as const, domain: 'growth' as const, order: 0, createdAt: '', updatedAt: '', anchorCount: 0, anchorDone: 0 }])
    setGoals([{ id: 'g2', title: '新', description: '', tier: 'target' as const, status: 'bloom' as const, domain: 'health' as const, order: 0, createdAt: '', updatedAt: '', anchorCount: 0, anchorDone: 0 }])
    expect(getGoals()).toHaveLength(1)
    expect(getGoals()[0].id).toBe('g2')
  })

  it('setGoals 替换为空数组', async () => {
    const { getGoals, setGoals } = await freshModule()
    setGoals([{ id: 'g1', title: 'x', description: '', tier: 'target' as const, status: 'seed' as const, domain: 'growth' as const, order: 0, createdAt: '', updatedAt: '', anchorCount: 0, anchorDone: 0 }])
    setGoals([])
    expect(getGoals()).toEqual([])
  })
})