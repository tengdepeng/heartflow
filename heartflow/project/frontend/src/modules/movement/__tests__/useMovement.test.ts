// ============================================================
// 动律之间 · useMovement 数据层测试
// 验证裸 storage 调用已下沉为 useMovement，存储键 'hf:moves_v2' 不变。
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

import { useMovement, MOVES_KEY } from '../movement-log'

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
  useMovement().load()
})

describe('useMovement 运动记录', () => {
  it('load 从存储键读取 moves（保留原键 hf:moves_v2）', () => {
    store[MOVES_KEY] = [
      { id: 'm1', type: 'run', duration: 30, withWhom: '', location: '', note: '晨跑', isMoment: false, at: new Date().toISOString() },
    ]
    const { items, load } = useMovement()
    load()
    expect(items.value.length).toBe(1)
    expect(items.value[0].id).toBe('m1')
  })

  it('add 生成 id 与 at、trim 文本并持久化', () => {
    const { add, items } = useMovement()
    const m = add({ type: 'swim', duration: 45, note: ' 游泳 ' })
    expect(items.value.length).toBe(1)
    expect(m.id).toBeTruthy()
    expect(m.at).toBeTruthy()
    expect(m.note).toBe('游泳')
    expect(mockSetKV).toHaveBeenCalledWith(MOVES_KEY, expect.any(Array))
  })

  it('remove 过滤并持久化', () => {
    const { add, remove, items } = useMovement()
    const m = add({ type: 'run', duration: 30 })
    remove(m.id)
    expect(items.value.length).toBe(0)
    expect(mockSetKV).toHaveBeenCalledWith(MOVES_KEY, expect.any(Array))
  })

  it('save 写入最新 items', () => {
    const { items, save } = useMovement()
    items.value = [{ id: 'x', type: 'yoga', duration: 20, withWhom: '', location: '', note: '', isMoment: false, at: new Date().toISOString() }]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(MOVES_KEY, expect.any(Array))
  })

  it('load 异常时回退为空数组', () => {
    const { items, load } = useMovement()
    load()
    expect(items.value).toEqual([])
  })
})
