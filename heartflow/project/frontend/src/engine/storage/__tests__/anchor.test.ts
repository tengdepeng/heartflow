// ============================================================
// storage/anchor 领域模块测试
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

async function freshAnchor() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getAnchors, setAnchors } = await import('../anchor')
  return { getAnchors, setAnchors }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/anchor', () => {
  it('getAnchors 首次返回空数组', async () => {
    const { getAnchors } = await freshAnchor()
    expect(getAnchors()).toEqual([])
  })

  it('setAnchors 写入后 getAnchors 返回新数据', async () => {
    const { getAnchors, setAnchors } = await freshAnchor()
    const anchors = [
      { id: 'a1', text: '晨间冥想', done: false, targetDate: '2026-01-01', createdAt: '2026-01-01T08:00:00Z', priority: 'must' as const, driftCount: 0 },
      { id: 'a2', text: '晚间阅读', done: false, targetDate: '2026-01-01', createdAt: '2026-01-01T22:00:00Z', priority: 'can' as const, driftCount: 0 },
    ]
    setAnchors(anchors)
    expect(getAnchors()).toHaveLength(2)
    expect(getAnchors()[0].id).toBe('a1')
  })

  it('setAnchors 替换已有数据', async () => {
    const { getAnchors, setAnchors } = await freshAnchor()
    setAnchors([{ id: 'a1', text: '旧', done: false, targetDate: '2026-01-01', createdAt: '2026-01-01T00:00:00Z', priority: 'must' as const, driftCount: 0 }])
    setAnchors([{ id: 'a2', text: '新', done: false, targetDate: '2026-01-02', createdAt: '2026-01-02T00:00:00Z', priority: 'can' as const, driftCount: 0 }])
    expect(getAnchors()).toHaveLength(1)
    expect(getAnchors()[0].id).toBe('a2')
  })

  it('setAnchors 替换为空数组', async () => {
    const { getAnchors, setAnchors } = await freshAnchor()
    setAnchors([{ id: 'a1', text: 'x', done: false, targetDate: '', createdAt: '', priority: 'must' as const, driftCount: 0 }])
    setAnchors([])
    expect(getAnchors()).toEqual([])
  })
})