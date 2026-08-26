import { describe, it, expect } from 'vitest'
import { rewardLedger, redemptionMilestones, suggestReward, REWARD_MILESTONES } from '../reward-machine'
import type { SelfReward } from '../types'

function mk(overrides: Partial<SelfReward>): SelfReward {
  return {
    id: 'r1',
    title: '奖励',
    trigger: { type: 'manual' },
    status: 'pending',
    createdAt: '2026-01-01T00:00:00',
    redeemableSince: null,
    redeemedAt: null,
    ...overrides,
  }
}

describe('rewardLedger', () => {
  it('汇总次数、成本、寄语与按月分布（按兑现时间倒序的 recent）', () => {
    const list = [
      mk({ id: 'a', status: 'redeemed', redeemedAt: '2026-06-10T00:00:00', cost: 50, note: '犒赏一下' }),
      mk({ id: 'b', status: 'redeemed', redeemedAt: '2026-06-20T00:00:00', cost: 30 }),
      mk({ id: 'c', status: 'pending' }),
      mk({ id: 'd', status: 'redeemed', redeemedAt: '2026-07-05T00:00:00', cost: 20, note: '周末小酌' }),
    ]
    const l = rewardLedger(list)
    expect(l.totalRedeemed).toBe(3)
    expect(l.totalCost).toBe(100)
    expect(l.noteRate).toBe(67) // 2/3
    expect(l.byMonth[0].key).toBe('2026-07')
    expect(l.byMonth[0].count).toBe(1)
    expect(l.byMonth[1].key).toBe('2026-06')
    expect(l.byMonth[1].count).toBe(2)
    expect(l.byMonth[1].cost).toBe(80)
    expect(l.recent[0].id).toBe('d') // 最新
    expect(l.cadenceDays).not.toBeNull()
  })

  it('少于两次兑现时节奏为 null', () => {
    const l = rewardLedger([mk({ id: 'a', status: 'redeemed', redeemedAt: '2026-06-01T00:00:00' })])
    expect(l.totalRedeemed).toBe(1)
    expect(l.cadenceDays).toBeNull()
  })

  it('空库全零', () => {
    const l = rewardLedger([])
    expect(l.totalRedeemed).toBe(0)
    expect(l.totalCost).toBe(0)
    expect(l.noteRate).toBe(0)
    expect(l.byMonth).toHaveLength(0)
  })
})

describe('redemptionMilestones', () => {
  it('按已兑现次数推进里程碑', () => {
    const three = [mk({ id: '1', status: 'redeemed' }), mk({ id: '2', status: 'redeemed' }), mk({ id: '3', status: 'redeemed' })]
    const m = redemptionMilestones(three)
    expect(m.reached).toEqual([1, 3])
    expect(m.next).toBe(5)
    expect(REWARD_MILESTONES.includes(1)).toBe(true)
  })
})

describe('suggestReward', () => {
  const redeemable = mk({ id: 'rd', status: 'redeemable' })
  const pendingManual = mk({ id: 'pm', status: 'pending' })
  const pendingHabit = mk({ id: 'ph', status: 'pending', trigger: { type: 'habit-streak', habitId: 'h', streakDays: 7 } })

  it('有可兑现 → 优先建议', () => {
    expect(suggestReward([pendingHabit, redeemable, pendingManual], 0)?.id).toBe('rd')
  })
  it('无可兑现但专注足量 → 建议手动待兑现', () => {
    expect(suggestReward([pendingHabit, pendingManual], 60)?.id).toBe('pm')
  })
  it('专注不足且无可兑现 → 无建议', () => {
    expect(suggestReward([pendingHabit, pendingManual], 20)).toBeNull()
  })
  it('空列表 → 无建议', () => {
    expect(suggestReward([], 120)).toBeNull()
  })
})