// ============================================================
// storage/emotion 领域模块测试
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

async function freshEmotion() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getEmotions, setEmotions } = await import('../emotion')
  return { getEmotions, setEmotions }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/emotion', () => {
  it('getEmotions 首次返回空数组', async () => {
    const { getEmotions } = await freshEmotion()
    expect(getEmotions()).toEqual([])
  })

  it('setEmotions 写入后 getEmotions 返回新数据', async () => {
    const { getEmotions, setEmotions } = await freshEmotion()
    const emotions = [
      { id: 'e1', type: 'happy' as const, note: '开心', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'e2', type: 'calm' as const, note: '平静', createdAt: '2026-01-02T00:00:00Z' },
    ]
    setEmotions(emotions)
    expect(getEmotions()).toHaveLength(2)
    expect(getEmotions()[0].type).toBe('happy')
  })

  it('setEmotions 替换已有数据', async () => {
    const { getEmotions, setEmotions } = await freshEmotion()
    setEmotions([{ id: 'e1', type: 'happy' as const, note: '', createdAt: '' }])
    setEmotions([{ id: 'e2', type: 'calm' as const, note: '', createdAt: '' }])
    expect(getEmotions()).toHaveLength(1)
    expect(getEmotions()[0].id).toBe('e2')
  })

  it('setEmotions 替换为空数组', async () => {
    const { getEmotions, setEmotions } = await freshEmotion()
    setEmotions([{ id: 'e1', type: 'happy' as const, note: '', createdAt: '' }])
    setEmotions([])
    expect(getEmotions()).toEqual([])
  })
})