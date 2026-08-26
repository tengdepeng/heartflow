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

import { useCognitionReflections, COGNITION_REFLECTIONS_KEY, type Reflection } from '../reflections'

function sample(id = 'r1'): Reflection {
  return { id, title: '反思', body: '内容', at: new Date().toISOString() }
}

describe('useCognitionReflections', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[COGNITION_REFLECTIONS_KEY] = []
    // 重置模块级单例，避免跨用例泄漏
    useCognitionReflections().load()
  })

  it('load 从存储读取反思笔记', () => {
    store[COGNITION_REFLECTIONS_KEY] = [sample()]
    const { items, load } = useCognitionReflections()
    load()
    expect(items.value).toHaveLength(1)
    expect(items.value[0].title).toBe('反思')
  })

  it('save 写入 hf:cognition_reflections', () => {
    const { items, save } = useCognitionReflections()
    items.value.push(sample())
    save()
    expect(mockSetKV).toHaveBeenCalledWith(COGNITION_REFLECTIONS_KEY, expect.any(Array))
    expect(store[COGNITION_REFLECTIONS_KEY]).toHaveLength(1)
  })

  it('load 缺失键时回退空数组', () => {
    delete store[COGNITION_REFLECTIONS_KEY]
    const { items, load } = useCognitionReflections()
    load()
    expect(items.value).toEqual([])
  })
})
