// ============================================================
// useReward 模块测试
// 劳酬视图数据层：收支记录列表的读取与写入
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
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useReward } from '../reward-list'
import type { RewardRecord } from '../reward-list'

const REWARDS_KEY = 'rewards'

function sampleRecord(partial: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: 'r-x',
    type: 'income',
    category: 'salary',
    amount: 1000,
    description: '月薪',
    at: '2026-07-01T00:00:00Z',
    ...partial,
  }
}

describe('useReward 劳酬数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((k: string, d: any) => (k in store ? store[k] : d))
    // 重置模块级单例
    useReward().load()
  })

  it('load 从空存储读取空列表', () => {
    const m = useReward()
    expect(m.records.value).toEqual([])
    expect(mockGetKV).toHaveBeenCalledWith(REWARDS_KEY, [])
  })

  it('load 读取已存储的收支记录', () => {
    store[REWARDS_KEY] = [sampleRecord({ id: 'r1' }), sampleRecord({ id: 'r2' })]
    const m = useReward()
    m.load()
    expect(m.records.value.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('save 覆盖并持久化记录列表', () => {
    const m = useReward()
    const list = [sampleRecord({ id: 'a' }), sampleRecord({ id: 'b' })]
    m.save(list)
    expect(m.records.value.map((r) => r.id)).toEqual(['a', 'b'])
    expect(mockSetKV).toHaveBeenCalledWith(REWARDS_KEY, list)
  })
})
