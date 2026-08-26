// ============================================================
// useTransformGallery 数据层测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

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

import { useTransformGallery } from '../gallery'
import type { Transformation } from '../gallery'

const KEY = 'hf:transformations'

function mkrec(over: Partial<Transformation> = {}): Transformation {
  return {
    id: over.id || 'trans_1',
    type: over.type || 'body',
    description: over.description || '锻炼身体',
    duration: over.duration ?? 30,
    createdAt: over.createdAt || '2026-01-15T00:00:00.000Z',
  }
}

describe('useTransformGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[KEY] = []
    useTransformGallery().load()
  })

  it('load 从存储载入记录', () => {
    store[KEY] = [mkrec({ id: 'a', description: 'A' }), mkrec({ id: 'b', description: 'B' })]
    const { records, load } = useTransformGallery()
    load()
    expect(records.value).toHaveLength(2)
    expect(records.value[0].description).toBe('A')
  })

  it('load 在存储为空时回退默认空数组', () => {
    const { records } = useTransformGallery()
    expect(records.value).toEqual([])
  })

  it('save 持久化当前列表', () => {
    const { records, save } = useTransformGallery()
    records.value = [mkrec({ id: 'x' })]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(KEY, records.value)
    expect(store[KEY]).toHaveLength(1)
  })

  it('add 追加到列表头部并持久化', () => {
    store[KEY] = [mkrec({ id: 'a' })]
    const { add, records, load } = useTransformGallery()
    load()
    add(mkrec({ id: 'b', description: '新蜕变' }))
    expect(records.value[0].id).toBe('b')
    expect(records.value).toHaveLength(2)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('remove 删除指定记录', () => {
    store[KEY] = [mkrec({ id: 'a' }), mkrec({ id: 'b' })]
    const { remove, records, load } = useTransformGallery()
    load()
    remove('a')
    expect(records.value.map((r) => r.id)).toEqual(['b'])
  })
})
