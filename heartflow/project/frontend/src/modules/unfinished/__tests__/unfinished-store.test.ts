// ============================================================
// useUnfinished 模块测试
// 未完成花园数据层：事项 + 种子的读取 / 写入
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useUnfinished } from '../unfinished-store'

const UNFINISHED_KEY = 'hf:unfinished_v2'
const SEEDS_KEY = 'hf:seeds'

function sampleItem() {
  const now = new Date().toISOString()
  return {
    id: 'uf1',
    type: 'seed' as const,
    text: '未完成的事',
    at: now,
    updatedAt: now,
    sprouted: false,
    completed: false,
  }
}

describe('useUnfinished 未完成花园数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useUnfinished().load()
  })

  it('load 从存储读取未完成事项', () => {
    store[UNFINISHED_KEY] = [sampleItem()]
    const u = useUnfinished()
    u.load()
    expect(u.items.value.length).toBe(1)
    expect(mockGetKV).toHaveBeenCalledWith(UNFINISHED_KEY, [])
  })

  it('save 持久化未完成事项', () => {
    const u = useUnfinished()
    u.items.value = [sampleItem()]
    u.save()
    expect(mockSetKV).toHaveBeenCalledWith(UNFINISHED_KEY, expect.arrayContaining([expect.objectContaining({ id: 'uf1' })]))
  })

  it('loadSeeds 从存储读取种子', () => {
    store[SEEDS_KEY] = [{ id: 's1', text: '种子', at: new Date().toISOString() }]
    const u = useUnfinished()
    u.loadSeeds()
    expect(u.seeds.value.length).toBe(1)
    expect(mockGetKV).toHaveBeenCalledWith(SEEDS_KEY, [])
  })

  it('saveSeeds 持久化种子', () => {
    const u = useUnfinished()
    u.seeds.value = [{ id: 's1', text: '种子', at: new Date().toISOString() }]
    u.saveSeeds()
    expect(mockSetKV).toHaveBeenCalledWith(SEEDS_KEY, expect.arrayContaining([expect.objectContaining({ id: 's1' })]))
  })

  it('空存储时返回默认空数组', () => {
    const u = useUnfinished()
    u.load()
    u.loadSeeds()
    expect(u.items.value).toEqual([])
    expect(u.seeds.value).toEqual([])
  })
})
