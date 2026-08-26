// ============================================================
// storage/tag-category 领域模块测试
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
  const { getTagCategories, setTagCategories } = await import('../tag-category')
  return { getTagCategories, setTagCategories }
}

afterEach(() => { delete (globalThis as any).localStorage })

describe('storage/tag-category', () => {
  it('getTagCategories 首次返回空数组', async () => {
    const { getTagCategories } = await freshModule()
    expect(getTagCategories()).toEqual([])
  })

  it('setTagCategories 写入后返回新数据', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    const cats = [{ id: 'c1', name: '学习', color: '#7c5cfc', children: [], tags: ['vue'] }]
    setTagCategories(cats)
    expect(getTagCategories()).toHaveLength(1)
    expect(getTagCategories()[0].name).toBe('学习')
  })

  it('setTagCategories 替换已有数据', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    setTagCategories([{ id: 'c1', name: '旧', color: '#000', children: [], tags: [] }])
    setTagCategories([{ id: 'c2', name: '新', color: '#fff', children: [], tags: [] }])
    expect(getTagCategories()).toHaveLength(1)
    expect(getTagCategories()[0].id).toBe('c2')
  })

  it('setTagCategories 替换为空数组', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    setTagCategories([{ id: 'c1', name: 'x', color: '#000', children: [], tags: [] }])
    setTagCategories([])
    expect(getTagCategories()).toEqual([])
  })

  it('setTagCategories 写入多条分类', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    setTagCategories([
      { id: 'c1', name: '学习', color: '#7c5cfc', children: [], tags: ['vue', 'ts'] },
      { id: 'c2', name: '生活', color: '#4f8cff', children: [], tags: ['饮食'] },
      { id: 'c3', name: '运动', color: '#36d6e7', children: [], tags: ['跑步', '游泳'] },
    ])
    expect(getTagCategories()).toHaveLength(3)
  })

  it('setTagCategories 写入后保留 tags 数组', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    setTagCategories([{ id: 'c1', name: '学习', color: '#7c5cfc', children: [], tags: ['vue', 'react', 'ts'] }])
    expect(getTagCategories()[0].tags).toHaveLength(3)
    expect(getTagCategories()[0].tags).toEqual(['vue', 'react', 'ts'])
  })

  it('setTagCategories 写入后保留 children 数组', async () => {
    const { getTagCategories, setTagCategories } = await freshModule()
    setTagCategories([{ id: 'c1', name: '编程', color: '#7c5cfc', children: [{ id: 'sub1', name: '前端', color: '#4f8cff', children: [], tags: ['vue'] }], tags: [] }])
    expect(getTagCategories()[0].children).toHaveLength(1)
    expect(getTagCategories()[0].children[0].name).toBe('前端')
  })
})