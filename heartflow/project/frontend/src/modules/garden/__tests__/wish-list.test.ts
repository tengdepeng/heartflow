// ============================================================
// 成长庭院 · 心愿清单测试
// 验证：习惯联动解锁进度、完成次数汇总、清单概览、温和小结、
//       心愿存储与自动点亮。
// ============================================================

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  wishProgress,
  habitCompletionCounts,
  wishlistOverview,
  wishlistInsights,
  useWishList,
} from '../wish-list'
import type { Wish } from '../wish-list'

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

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(store).forEach(k => delete store[k])
})

function mkWish(partial: Partial<Wish> & { id: string }): Wish {
  return {
    title: '心愿',
    icon: '✨',
    linkedHabitIds: [],
    requiredCounts: {},
    unlocked: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    ...partial,
  }
}

describe('wishProgress 解锁进度', () => {
  const wish = mkWish({
    id: 'w1',
    title: '去旅行',
    linkedHabitIds: ['h1', 'h2'],
    requiredCounts: { h1: 10, h2: 5 },
  })

  it('未开始时进度为 0', () => {
    const p = wishProgress(wish, {})
    expect(p.completed).toBe(false)
    expect(p.percent).toBe(0)
    expect(p.doneHabits).toBe(0)
    expect(p.totalHabits).toBe(2)
  })

  it('部分达标时按比例累计', () => {
    const p = wishProgress(wish, { h1: 5, h2: 5 })
    expect(p.percent).toBe(75) // (5/10 + 5/5)/2 = 0.75
    expect(p.doneHabits).toBe(1)
    expect(p.nextHabit).toEqual({ habitId: 'h1', current: 5, required: 10 })
  })

  it('全部达标时点亮', () => {
    const p = wishProgress(wish, { h1: 10, h2: 5 })
    expect(p.completed).toBe(true)
    expect(p.percent).toBe(100)
    expect(p.nextHabit).toBeNull()
  })

  it('无关联习惯时视为未点亮', () => {
    const p = wishProgress(mkWish({ id: 'w2', linkedHabitIds: [] }), {})
    expect(p.completed).toBe(false)
    expect(p.percent).toBe(0)
  })

  it('超出要求次数按 100% 计', () => {
    const p = wishProgress(wish, { h1: 20, h2: 5 })
    expect(p.percent).toBe(100)
  })
})

describe('habitCompletionCounts 完成次数汇总', () => {
  it('按 ticks 数组长度统计', () => {
    const counts = habitCompletionCounts([
      { id: 'h1', ticks: ['2026-08-01', '2026-08-02'] },
      { id: 'h2', ticks: [] },
    ])
    expect(counts).toEqual({ h1: 2, h2: 0 })
  })
})

describe('wishlistOverview 清单概览', () => {
  const wishes = [
    mkWish({ id: 'w1', title: '已点亮', unlocked: true, unlockedAt: '2026-08-02T00:00:00.000Z' }),
    mkWish({ id: 'w2', title: '进行中', linkedHabitIds: ['h1'], requiredCounts: { h1: 10 } }),
    mkWish({ id: 'w3', title: '未开始', linkedHabitIds: ['h2'], requiredCounts: { h2: 5 } }),
  ]
  const counts = { h1: 5 }

  it('统计总数/点亮/未点亮', () => {
    const o = wishlistOverview(wishes, counts)
    expect(o.total).toBe(3)
    expect(o.unlocked).toBe(1)
    expect(o.locked).toBe(2)
  })

  it('整体进度为各心愿均值', () => {
    const o = wishlistOverview(wishes, counts)
    // w1=100, w2=50, w3=0 → 50
    expect(o.overallPercent).toBe(50)
  })

  it('最近点亮按时间倒序', () => {
    const o = wishlistOverview(wishes, counts)
    expect(o.recentlyUnlocked.map(w => w.id)).toEqual(['w1'])
  })
})

describe('wishlistInsights 温和小结', () => {
  it('有已点亮心愿时陈述', () => {
    const wishes = [mkWish({ id: 'w1', unlocked: true })]
    const insights = wishlistInsights(wishes, {})
    expect(insights.some(s => s.includes('已点亮 1 个心愿'))).toBe(true)
  })

  it('提示最接近点亮的心愿', () => {
    const wishes = [
      mkWish({ id: 'w1', title: '近的', linkedHabitIds: ['h1'], requiredCounts: { h1: 10 } }),
      mkWish({ id: 'w2', title: '远的', linkedHabitIds: ['h2'], requiredCounts: { h2: 10 } }),
    ]
    const insights = wishlistInsights(wishes, { h1: 8 })
    expect(insights.some(s => s.includes('近的') && s.includes('80%'))).toBe(true)
  })

  it('统计等待首次行动的心愿', () => {
    const wishes = [
      mkWish({ id: 'w1', linkedHabitIds: ['h1'], requiredCounts: { h1: 3 } }),
      mkWish({ id: 'w2', linkedHabitIds: ['h2'], requiredCounts: { h2: 3 } }),
    ]
    const insights = wishlistInsights(wishes, { h1: 1 })
    expect(insights.some(s => s.includes('1 个心愿还在等待'))).toBe(true)
  })
})

describe('useWishList 心愿存储', () => {
  it('addWish 新增并持久化', () => {
    const wl = useWishList()
    wl.load()
    const w = wl.addWish({ title: '学画画', linkedHabitIds: ['h1'], requiredCounts: { h1: 7 } })
    expect(w.id).toBeTruthy()
    expect(w.unlocked).toBe(false)
    expect(wl.wishes.value.length).toBe(1)
    expect(store['hf:garden:wishes'].length).toBe(1)
  })

  it('load 从存储恢复', () => {
    store['hf:garden:wishes'] = [
      { id: 'w1', title: 'x', icon: '✨', linkedHabitIds: [], requiredCounts: {}, unlocked: false, createdAt: '2026-08-01T00:00:00.000Z' },
    ]
    const wl = useWishList()
    wl.load()
    expect(wl.wishes.value.length).toBe(1)
  })

  it('updateWish 局部更新', () => {
    const wl = useWishList()
    wl.load()
    const w = wl.addWish({ title: 'x' })
    wl.updateWish(w.id, { icon: '🌟' })
    expect(wl.wishes.value[0].icon).toBe('🌟')
  })

  it('removeWish 删除', () => {
    const wl = useWishList()
    wl.load()
    const w = wl.addWish({ title: 'x' })
    expect(wl.removeWish(w.id)).toBe(true)
    expect(wl.wishes.value.length).toBe(0)
    expect(wl.removeWish('nope')).toBe(false)
  })

  it('refreshUnlocks 自动点亮达标心愿', () => {
    const wl = useWishList()
    wl.load()
    wl.addWish({ title: '达标', linkedHabitIds: ['h1'], requiredCounts: { h1: 3 } })
    wl.addWish({ title: '未达标', linkedHabitIds: ['h2'], requiredCounts: { h2: 3 } })
    const newly = wl.refreshUnlocks({ h1: 3, h2: 1 })
    expect(newly.length).toBe(1)
    expect(newly[0].title).toBe('达标')
    expect(wl.wishes.value.find(w => w.title === '达标')!.unlocked).toBe(true)
    expect(wl.wishes.value.find(w => w.title === '未达标')!.unlocked).toBe(false)
  })

  it('refreshUnlocks 不重复点亮已点亮心愿', () => {
    const wl = useWishList()
    wl.load()
    wl.addWish({ title: 'x', linkedHabitIds: ['h1'], requiredCounts: { h1: 1 } })
    wl.refreshUnlocks({ h1: 1 })
    const again = wl.refreshUnlocks({ h1: 1 })
    expect(again.length).toBe(0)
  })
})
