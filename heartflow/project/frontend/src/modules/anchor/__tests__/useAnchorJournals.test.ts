// ============================================================
// 逐日心锚 · useAnchorJournals 数据层测试
// 验证裸 storage 调用已下沉为 useAnchorJournals，存储键 'anchor_journals' 不变。
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

import { useAnchorJournals, ANCHOR_JOURNALS_KEY } from '../anchor-journals'

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
  useAnchorJournals().load()
})

describe('useAnchorJournals 手札日记', () => {
  it('load 从 anchor_journals 读取', () => {
    store[ANCHOR_JOURNALS_KEY] = [
      { anchorId: 'a1', content: '今天很平静', createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z' },
    ]
    const { items, load } = useAnchorJournals()
    load()
    expect(items.value.length).toBe(1)
    expect(items.value[0].anchorId).toBe('a1')
  })

  it('save 写入最新 journals（保留原键 anchor_journals）', () => {
    const { items, save } = useAnchorJournals()
    items.value = [{ anchorId: 'a2', content: '记录', createdAt: '2026-08-02T00:00:00.000Z', updatedAt: '2026-08-02T00:00:00.000Z' }]
    save()
    expect(mockSetKV).toHaveBeenCalledWith(ANCHOR_JOURNALS_KEY, expect.any(Array))
  })

  it('load 缺省为空数组', () => {
    const { items, load } = useAnchorJournals()
    load()
    expect(items.value).toEqual([])
  })
})
