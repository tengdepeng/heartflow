// ============================================================
// storage/relation 领域模块测试
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
  const { getRelations, setRelations } = await import('../relation')
  return { getRelations, setRelations }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/relation', () => {
  it('getRelations 首次返回空数组', async () => {
    const { getRelations } = await freshModule()
    expect(getRelations()).toEqual([])
  })

  it('setRelations 写入后返回新数据', async () => {
    const { getRelations, setRelations } = await freshModule()
    const persons = [
      { id: 'p1', name: '张三', relation: 'friend' as const, tags: [], notes: '', closeness: 0.5, color: '#7c5cfc', lastContact: null, importantDates: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'p2', name: '李四', relation: 'colleague' as const, tags: [], notes: '', closeness: 0.3, color: '#4f8cff', lastContact: null, importantDates: [], createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
    ]
    setRelations(persons)
    expect(getRelations()).toHaveLength(2)
    expect(getRelations()[0].name).toBe('张三')
  })

  it('setRelations 替换已有数据', async () => {
    const { getRelations, setRelations } = await freshModule()
    setRelations([{ id: 'p1', name: '旧', relation: 'friend' as const, tags: [], notes: '', closeness: 0, color: '#000', lastContact: null, importantDates: [], createdAt: '', updatedAt: '' }])
    setRelations([{ id: 'p2', name: '新', relation: 'colleague' as const, tags: [], notes: '', closeness: 0, color: '#fff', lastContact: null, importantDates: [], createdAt: '', updatedAt: '' }])
    expect(getRelations()).toHaveLength(1)
    expect(getRelations()[0].id).toBe('p2')
  })

  it('setRelations 替换为空数组', async () => {
    const { getRelations, setRelations } = await freshModule()
    setRelations([{ id: 'p1', name: 'x', relation: 'friend' as const, tags: [], notes: '', closeness: 0, color: '#000', lastContact: null, importantDates: [], createdAt: '', updatedAt: '' }])
    setRelations([])
    expect(getRelations()).toEqual([])
  })
})