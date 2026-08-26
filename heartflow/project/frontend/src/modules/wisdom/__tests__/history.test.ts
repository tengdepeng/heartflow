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

import { useWisdomHistory, WISDOM_HISTORY_KEY, type HistoryItem } from '../history'

function sample(id = 'wh1'): HistoryItem {
  return { id, q: '问题', a: '回答', at: new Date().toISOString() }
}

describe('useWisdomHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store[WISDOM_HISTORY_KEY] = []
    // 重置模块级单例，避免跨用例泄漏
    useWisdomHistory().load()
  })

  it('load 从存储读取对话历史', () => {
    store[WISDOM_HISTORY_KEY] = [sample()]
    const { items, load } = useWisdomHistory()
    load()
    expect(items.value).toHaveLength(1)
    expect(items.value[0].q).toBe('问题')
  })

  it('save 写入 hf:wisdom_history', () => {
    const { items, save } = useWisdomHistory()
    items.value.unshift(sample())
    save()
    expect(mockSetKV).toHaveBeenCalledWith(WISDOM_HISTORY_KEY, expect.any(Array))
    expect(store[WISDOM_HISTORY_KEY]).toHaveLength(1)
  })

  it('load 缺失键时回退空数组', () => {
    delete store[WISDOM_HISTORY_KEY]
    const { items, load } = useWisdomHistory()
    load()
    expect(items.value).toEqual([])
  })
})
