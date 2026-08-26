// ============================================================
// usePlaySeeds 模块测试
// 时间种子（心情种子 / 生长系统）数据层，键 hf:play_seeds
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { usePlaySeeds, type TimeSeed } from '../seeds'

const KEY = 'hf:play_seeds'

function sampleSeed(partial: Partial<TimeSeed> = {}): TimeSeed {
  return {
    id: 's1',
    content: '今天很平静',
    mood: 'calm',
    createdAt: new Date().toISOString(),
    waterCount: 0,
    ...partial,
  }
}

describe('usePlaySeeds 时间种子数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    usePlaySeeds().load()
  })

  it('load 从存储读取种子列表', () => {
    store[KEY] = [sampleSeed()]
    const m = usePlaySeeds()
    m.load()
    expect(m.seeds.value).toHaveLength(1)
    expect(mockGetKV).toHaveBeenCalledWith(KEY, [])
  })

  it('save 覆盖并持久化到 hf:play_seeds', () => {
    const m = usePlaySeeds()
    const list = [sampleSeed({ id: 'a' }), sampleSeed({ id: 'b' })]
    m.save(list)
    expect(m.seeds.value.length).toBe(2)
    expect(mockSetKV).toHaveBeenCalledWith(KEY, list)
  })

  it('空存储时返回默认空列表', () => {
    const m = usePlaySeeds()
    m.load()
    expect(m.seeds.value).toEqual([])
  })
})
