import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('经略阁 SM-2 间隔重复引擎', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('sm2Schedule：首次成功间隔 1 天', async () => {
    const { sm2Schedule } = await import('../spaced-repetition')
    const base = { repetitions: 0, easiness: 2.5, interval: 0, lastReviewedAt: null, nextReviewAt: null }
    const next = sm2Schedule(base, 4, new Date('2026-01-01T00:00:00Z'))
    expect(next.interval).toBe(1)
    expect(next.repetitions).toBe(1)
  })

  it('sm2Schedule：第二次成功间隔 6 天', async () => {
    const { sm2Schedule } = await import('../spaced-repetition')
    const base = { repetitions: 1, easiness: 2.5, interval: 1, lastReviewedAt: null, nextReviewAt: null }
    const next = sm2Schedule(base, 4, new Date('2026-01-01T00:00:00Z'))
    expect(next.interval).toBe(6)
    expect(next.repetitions).toBe(2)
  })

  it('sm2Schedule：失败重置为 1 天', async () => {
    const { sm2Schedule } = await import('../spaced-repetition')
    const base = { repetitions: 3, easiness: 2.5, interval: 20, lastReviewedAt: null, nextReviewAt: null }
    const next = sm2Schedule(base, 1, new Date('2026-01-01T00:00:00Z'))
    expect(next.repetitions).toBe(0)
    expect(next.interval).toBe(1)
  })

  it('sm2Schedule：易度因子下限 1.3', async () => {
    const { sm2Schedule } = await import('../spaced-repetition')
    const base = { repetitions: 0, easiness: 1.3, interval: 0, lastReviewedAt: null, nextReviewAt: null }
    const next = sm2Schedule(base, 0, new Date('2026-01-01T00:00:00Z'))
    expect(next.easiness).toBeGreaterThanOrEqual(1.3)
  })

  it('useFlashcards：添加/待复习/复习闭环', async () => {
    const mod = await import('../spaced-repetition')
    const api = mod.useFlashcards()
    const card = api.add('什么是心流？', '全神贯注的沉浸状态', '默认', ['心流'])
    expect(api.stats().total).toBe(1)
    // 新卡创建即到期（nextReviewAt = 创建时刻）
    expect(api.dueCards().map(c => c.id)).toContain(card.id)
    const result = api.review(card.id, 4)
    expect(result).not.toBeNull()
    expect(result!.intervalDays).toBe(1)
    // 复习后当天不再到期
    expect(api.dueCards().map(c => c.id)).not.toContain(card.id)
  })

  it('useFlashcards：牌组统计与删除', async () => {
    const mod = await import('../spaced-repetition')
    const api = mod.useFlashcards()
    api.add('A', 'a', '牌组一')
    api.add('B', 'b', '牌组二')
    expect(api.decks()).toEqual(['牌组一', '牌组二'])
    const cards = api.load()
    api.remove(cards[0].id)
    expect(api.stats().total).toBe(1)
  })
})
