import { describe, it, expect, vi, beforeEach } from 'vitest'

// 内存版 KV 存储，供模块级单例读写（vi.hoisted 确保工厂闭包可访问）
const { store } = vi.hoisted(() => ({ store: {} as Record<string, unknown> }))

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, def: T): T => (key in store ? (store[key] as T) : def),
    setKV: (key: string, val: unknown): void => {
      store[key] = val
    },
  },
}))

async function loadComposable() {
  vi.resetModules()
  for (const k of Object.keys(store)) delete store[k]
  return await import('../tool-cards')
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
})

describe('useMirrorToolCards', () => {
  it('无存储记录时回退到 11 个默认种子卡（含 finance 记账）', async () => {
    const { useMirrorToolCards, MIRROR_TOOL_CARDS_KEY } = await loadComposable()
    const { cards } = useMirrorToolCards()
    expect(cards.value.length).toBe(11)
    // 种子卡以 seed- 前缀命名，且均引用真实意图
    expect(cards.value.every((c) => c.id.startsWith('seed-'))).toBe(true)
    // 默认状态下存储未被写入（沉默默认）
    expect(MIRROR_TOOL_CARDS_KEY in store).toBe(false)
  })

  it('addCard 新增自定义卡并持久化', async () => {
    const { useMirrorToolCards, MIRROR_TOOL_CARDS_KEY } = await loadComposable()
    const { cards, addCard } = useMirrorToolCards()
    const before = cards.value.length
    const added = addCard({ category: 'note', label: '随手记', icon: '📝', description: '自定义笔记卡' })
    expect(cards.value.length).toBe(before + 1)
    expect(added.id).toMatch(/^card-/)
    expect(cards.value.some((c) => c.id === added.id)).toBe(true)
    // 持久化到存储
    const saved = store[MIRROR_TOOL_CARDS_KEY] as { id: string }[]
    expect(saved.some((c) => c.id === added.id)).toBe(true)
  })

  it('removeCard 删除指定卡并持久化', async () => {
    const { useMirrorToolCards, MIRROR_TOOL_CARDS_KEY } = await loadComposable()
    const { cards, addCard, removeCard } = useMirrorToolCards()
    const added = addCard({ category: 'rest', label: '小憩', icon: '☕', description: '自定义休息卡' })
    const afterAdd = cards.value.length
    removeCard(added.id)
    expect(cards.value.length).toBe(afterAdd - 1)
    expect(cards.value.some((c) => c.id === added.id)).toBe(false)
    const saved = store[MIRROR_TOOL_CARDS_KEY] as { id: string }[]
    expect(saved.some((c) => c.id === added.id)).toBe(false)
  })

  it('持久化后再次加载复用已保存的卡集合', async () => {
    const { useMirrorToolCards } = await loadComposable()
    const { addCard } = useMirrorToolCards()
    addCard({ category: 'learn', label: '读点什么', icon: '📚', description: '自定义学习卡' })

    // 重新加载模块（模拟刷新），store 不清理，应读到已保存的自定义集合而非种子
    vi.resetModules()
    const mod2 = await import('../tool-cards')
    const { cards: cards2 } = mod2.useMirrorToolCards()
    expect(cards2.value.some((c) => c.label === '读点什么')).toBe(true)
    expect(cards2.value.every((c) => c.id.startsWith('seed-'))).toBe(false)
  })
})
