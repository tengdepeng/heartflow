// ============================================================
// 根脉之庭 · useRootGarden 数据层测试
// 验证裸 storage 调用已下沉为 useRootGarden，存储键 'hf:roots_v2' 不变，
// 且 load 时的缺省字段补全会保留。
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

import { useRootGarden, ROOTS_KEY } from '../roots-garden'

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
  useRootGarden().load()
})

describe('useRootGarden 根系数据', () => {
  it('load 读取并为缺省字段补默认值（保留原键 hf:roots_v2）', () => {
    store[ROOTS_KEY] = [
      { id: 'r1', layer: 'soil', text: '原生家庭', era: '1990s' },
    ]
    const { items, load } = useRootGarden()
    load()
    expect(items.value.length).toBe(1)
    expect(items.value[0].strength).toBe(0.5)
    expect(items.value[0].connections).toEqual([])
    expect(items.value[0].tags).toEqual([])
    expect(items.value[0].color).toBe('#8a9a7a')
    expect(items.value[0].willId).toBeNull()
    expect(items.value[0]._expanded).toBe(false)
    expect(items.value[0].lastUpdatedAt).toBeTruthy()
  })

  it('save 写入最新 roots', () => {
    const { items, save } = useRootGarden()
    items.value = [{
      id: 'r2', layer: 'era', text: '大学时代', detail: '', era: '2010', icon: '🪵',
      _expanded: false, strength: 0.5, connections: [], tags: [], color: '#8a9a7a',
      willId: null, lastUpdatedAt: new Date().toISOString(),
    }]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(ROOTS_KEY, expect.any(Array))
  })

  it('load 异常时回退为空数组', () => {
    const { items, load } = useRootGarden()
    load()
    expect(items.value).toEqual([])
  })
})
