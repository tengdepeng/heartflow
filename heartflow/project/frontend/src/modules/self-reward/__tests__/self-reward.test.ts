import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock storage before importing modules that depend on it
const store = new Map<string, unknown>()
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(k: string, def: T) => (store.has(k) ? (store.get(k) as T) : def),
    setKV: (k: string, v: unknown) => { store.set(k, v) },
  },
}))

// Mock discipline getHabits
let mockHabitsData: any[] = []
vi.mock('../../discipline/workshop', () => ({
  getHabits: () => mockHabitsData,
}))

// Mock craft badges
let mockUnlockedBadges = new Set<string>()
vi.mock('../../craft/craft-badges', () => ({
  useCraftBadges: () => ({
    isBadgeUnlocked: (id: string) => mockUnlockedBadges.has(id),
    unlockedBadges: { value: [] },
    lockedBadges: { value: [] },
    getBadgeDef: () => undefined,
  }),
}))

import { useSelfReward, evaluateSelfRewards } from '../store'

const KEY = 'hf:self_rewards'

beforeEach(() => {
  store.clear()
  mockHabitsData = []
  mockUnlockedBadges = new Set()
})

describe('self-reward store', () => {
  it('新增 manual 奖励落盘', () => {
    const { add, stats } = useSelfReward()
    add({ title: '看电影', trigger: { type: 'manual' } })
    expect(stats.value.total).toBe(1)
    const raw = store.get(KEY) as any[]
    expect(raw[0].status).toBe('pending')
    expect(raw[0].title).toBe('看电影')
  })

  it('manual 奖励可直接兑现', () => {
    const { add, redeem, grouped } = useSelfReward()
    const id = add({ title: '奶茶', trigger: { type: 'manual' } })
    redeem(id)
    expect(grouped.value.redeemed).toHaveLength(1)
    expect(grouped.value.pending).toHaveLength(0)
  })

  it('habit-streak 未达标不兑现', () => {
    mockHabitsData = [{ id: 'h1', streak: 3 }]
    const { add, grouped } = useSelfReward()
    add({ title: '奖', trigger: { type: 'habit-streak', habitId: 'h1', streakDays: 7 } })
    evaluateSelfRewards()
    expect(grouped.value.pending).toHaveLength(1)
    expect(grouped.value.redeemable).toHaveLength(0)
  })

  it('habit-streak 达标自动标记可兑现', () => {
    mockHabitsData = [{ id: 'h1', streak: 7 }]
    const { add, grouped } = useSelfReward()
    add({ title: '奖', trigger: { type: 'habit-streak', habitId: 'h1', streakDays: 7 } })
    evaluateSelfRewards()
    expect(grouped.value.redeemable).toHaveLength(1)
    expect(grouped.value.pending).toHaveLength(0)
  })

  it('badge 解锁后自动标记可兑现', () => {
    mockUnlockedBadges = new Set(['b1'])
    const { add, grouped } = useSelfReward()
    add({ title: '奖', trigger: { type: 'badge', badgeId: 'b1' } })
    evaluateSelfRewards()
    expect(grouped.value.redeemable).toHaveLength(1)
  })

  it('badge 未解锁保持 pending', () => {
    mockUnlockedBadges = new Set()
    const { add, grouped } = useSelfReward()
    add({ title: '奖', trigger: { type: 'badge', badgeId: 'b1' } })
    evaluateSelfRewards()
    expect(grouped.value.pending).toHaveLength(1)
  })

  it('删除奖励', () => {
    const { add, remove, stats } = useSelfReward()
    const id = add({ title: '临时', trigger: { type: 'manual' } })
    remove(id)
    expect(stats.value.total).toBe(0)
  })

  it('撤销兑现回到可兑现', () => {
    const { add, redeem, unredeem, grouped } = useSelfReward()
    const id = add({ title: '奶茶', trigger: { type: 'manual' } })
    redeem(id)
    unredeem(id)
    expect(grouped.value.redeemable).toHaveLength(1)
    expect(grouped.value.redeemed).toHaveLength(0)
  })

  it('不可降级：已兑现不因 evaluate 回退', () => {
    mockHabitsData = [{ id: 'h1', streak: 7 }]
    const { add, redeem, grouped } = useSelfReward()
    const id = add({ title: '奖', trigger: { type: 'habit-streak', habitId: 'h1', streakDays: 7 } })
    redeem(id)
    mockHabitsData = [{ id: 'h1', streak: 0 }]
    evaluateSelfRewards()
    expect(grouped.value.redeemed).toHaveLength(1)
  })
})
