// ============================================================
// storage/note 领域模块测试
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

async function freshNote() {
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const { invalidateCache } = await import('../core')
  invalidateCache()
  const { getNotes, setNotes } = await import('../note')
  return { getNotes, setNotes }
}

afterEach(() => {
  delete (globalThis as any).localStorage
})

describe('storage/note', () => {
  it('getNotes 首次返回空数组', async () => {
    const { getNotes } = await freshNote()
    expect(getNotes()).toEqual([])
  })

  it('setNotes 写入后 getNotes 返回新数据', async () => {
    const { getNotes, setNotes } = await freshNote()
    const notes = [
      { id: 'n1', title: '笔记1', content: '内容1', tags: [], createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      { id: 'n2', title: '笔记2', content: '内容2', tags: ['tag1'], createdAt: '2026-01-02T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z' },
    ]
    setNotes(notes)
    expect(getNotes()).toHaveLength(2)
    expect(getNotes()[0].title).toBe('笔记1')
  })

  it('setNotes 替换已有数据', async () => {
    const { getNotes, setNotes } = await freshNote()
    setNotes([{ id: 'n1', title: '旧', content: '', tags: [], createdAt: '', updatedAt: '' }])
    setNotes([{ id: 'n2', title: '新', content: '', tags: [], createdAt: '', updatedAt: '' }])
    expect(getNotes()).toHaveLength(1)
    expect(getNotes()[0].id).toBe('n2')
  })

  it('setNotes 替换为空数组', async () => {
    const { getNotes, setNotes } = await freshNote()
    setNotes([{ id: 'n1', title: 'x', content: '', tags: [], createdAt: '', updatedAt: '' }])
    setNotes([])
    expect(getNotes()).toEqual([])
  })
})