// ============================================================
// 情绪花房 · 快乐收集 / 情绪盒子模块测试
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

import { useHappyBox, HAPPY_TAGS, HAPPY_BOX_KEY } from '../happy-box'

describe('useHappyBox 快乐收集 / 情绪盒子', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    useHappyBox().load()
  })

  it('初始为空', () => {
    const box = useHappyBox()
    expect(box.items.value).toEqual([])
    expect(box.total.value).toBe(0)
  })

  it('capture 收集快乐并持久化', () => {
    const box = useHappyBox()
    const item = box.capture('今天喝到了很好喝的咖啡', ['美食'])
    expect(item).not.toBeNull()
    expect(item!.text).toBe('今天喝到了很好喝的咖啡')
    expect(item!.tags).toEqual(['美食'])
    expect(item!.recalledCount).toBe(0)
    expect(box.total.value).toBe(1)
    expect(store[HAPPY_BOX_KEY]).toHaveLength(1)
  })

  it('capture 空内容返回 null', () => {
    const box = useHappyBox()
    expect(box.capture('   ')).toBeNull()
    expect(box.total.value).toBe(0)
  })

  it('capture 过滤空标签', () => {
    const box = useHappyBox()
    const item = box.capture('散步看到晚霞', ['自然', '', ''])
    expect(item!.tags).toEqual(['自然'])
  })

  it('recall 随机抽取并累计次数', () => {
    const box = useHappyBox()
    box.capture('第一条快乐')
    box.capture('第二条快乐')
    const picked = box.recall()
    expect(picked).not.toBeNull()
    expect(['第一条快乐', '第二条快乐']).toContain(picked!.text)
    expect(picked!.recalledCount).toBe(1)
    // 再次抽取累计
    box.recall()
    const stored = store[HAPPY_BOX_KEY] as any[]
    expect(stored.some(i => i.recalledCount >= 1)).toBe(true)
  })

  it('recall 空盒子返回 null', () => {
    const box = useHappyBox()
    expect(box.recall()).toBeNull()
  })

  it('remove 删除并持久化', () => {
    const box = useHappyBox()
    const item = box.capture('要删掉的快乐')
    box.remove(item!.id)
    expect(box.total.value).toBe(0)
    expect(store[HAPPY_BOX_KEY]).toHaveLength(0)
  })

  it('todayCount 统计今日收集', () => {
    const box = useHappyBox()
    box.capture('今天的第一件好事')
    expect(box.todayCount.value).toBe(1)
  })

  it('load 读取已存快乐', () => {
    store[HAPPY_BOX_KEY] = [
      { id: 'h1', text: '旧快乐', tags: [], createdAt: '2026-08-20T00:00:00.000Z', recalledCount: 0 },
    ]
    const box = useHappyBox()
    box.load()
    expect(box.total.value).toBe(1)
    expect(box.items.value[0].text).toBe('旧快乐')
  })

  it('HAPPY_TAGS 提供常用标签', () => {
    expect(HAPPY_TAGS.length).toBeGreaterThanOrEqual(6)
    expect(HAPPY_TAGS).toContain('美食')
  })
})
