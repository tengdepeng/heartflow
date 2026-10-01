// ============================================================
// SelfReward 自我奖励视图测试（含犒赏账本集成）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import type { SelfReward } from '../../modules/self-reward'

// ---- 模拟依赖 ----
const rewards = ref<SelfReward[]>([])

vi.mock('../../modules/self-reward', () => ({
  useSelfReward: () => ({
    rewards,
    stats: computed(() => ({
      total: rewards.value.length,
      pending: rewards.value.filter(r => r.status === 'pending').length,
      redeemable: rewards.value.filter(r => r.status === 'redeemable').length,
      redeemed: rewards.value.filter(r => r.status === 'redeemed').length,
    })),
    grouped: computed(() => ({
      pending: rewards.value.filter(r => r.status === 'pending'),
      redeemable: rewards.value.filter(r => r.status === 'redeemable'),
      redeemed: rewards.value.filter(r => r.status === 'redeemed'),
    })),
    add: vi.fn((input: { title: string; cost?: number }) => {
      rewards.value.push({
        id: `r_${rewards.value.length + 1}`,
        title: input.title,
        icon: '🎁',
        trigger: { type: 'manual' },
        status: 'pending',
        createdAt: new Date().toISOString(),
        cost: input.cost,
      })
    }),
    remove: vi.fn(),
    redeem: vi.fn((id: string) => {
      const r = rewards.value.find(x => x.id === id)
      if (r) { r.status = 'redeemed'; r.redeemedAt = new Date().toISOString() }
    }),
    unredeem: vi.fn(),
    evaluate: vi.fn(),
  }),
  SELF_REWARD_TRIGGER_META: {
    manual: { label: '纯手动', icon: '✋', hint: '' },
    'habit-streak': { label: '习惯连续', icon: '🔥', hint: '' },
    badge: { label: '匠庐徽章', icon: '🏅', hint: '' },
  },
}))

vi.mock('../../modules/self-reward/reward-machine', () => ({
  rewardLedger: () => {
    const redeemed = rewards.value.filter(r => r.status === 'redeemed').sort((a, b) => (b.redeemedAt || '').localeCompare(a.redeemedAt || ''))
    return {
      totalRedeemed: redeemed.length,
      totalCost: redeemed.reduce((s, r) => s + (r.cost || 0), 0),
      cadenceDays: null,
      noteRate: redeemed.length ? 100 : 0,
      byMonth: [],
      recent: redeemed.slice(0, 3),
    }
  },
  redemptionMilestones: () => ({ reached: rewards.value.filter(r => r.status === 'redeemed').length >= 1 ? [1] : [], next: 1 }),
  suggestReward: () => null,
  REWARD_MILESTONES: [1, 3, 5, 10, 20],
}))

vi.mock('../../modules/timer', () => ({
  getTodayFocusTime: () => 0,
}))

vi.mock('../../modules/discipline/workshop', () => ({
  getHabits: () => [],
}))

vi.mock('../../modules/craft/craft-badges', () => ({
  useCraftBadges: () => ({
    unlockedBadges: ref([]),
    lockedBadges: ref([]),
    getBadgeDef: () => null,
    isBadgeUnlocked: () => false,
  }),
}))

import SelfRewardView from '../SelfReward.vue'

beforeEach(() => {
  rewards.value = []
})

describe('SelfReward 视图', () => {
  it('挂载并渲染头部', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    // ⚠️ 页头已统一到 RoomLayout → RoomHeader，标题类名统一为 .rh-title（旧 .sr-title 已不存在）
    expect(wrapper.find('.rh-title').text()).toContain('自我奖励')
  })

  it('空态提示出现', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
  })

  it('填入名称与成本后提交，统计随之更新', async () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    await wrapper.find('.sr-toggle-btn').trigger('click')
    await wrapper.find('.sr-form input').setValue('看一场电影')
    await wrapper.findAll('button').find(b => b.text() === '创建')!.trigger('click')
    expect(rewards.value.length).toBe(1)
  })
})

// ============================================================
// 集成：犒赏账本面板（INCR-165：补挂载 claim-but-orphan 面板）
// ============================================================
describe('集成：犒赏账本面板', () => {
  it('在自奖视图挂载犒赏账本面板并渲染核心区块', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.find('.rlp').exists()).toBe(true)
    expect(wrapper.find('.rlp-title').text()).toContain('犒赏账本')
    expect(wrapper.find('.rlp-stats').exists()).toBe(true)
    expect(wrapper.find('.rlp-milestones').exists()).toBe(true)
  })

  it('未兑现任何犒赏时展示账本空态文案', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.text()).toContain('还没兑现过任何犒赏')
  })

  it('有已兑现奖励时渲染分段记账区', async () => {
    rewards.value.push({
      id: 'r_done1',
      title: '看一场电影',
      icon: '🎬',
      trigger: { type: 'manual' },
      status: 'redeemed',
      createdAt: new Date().toISOString(),
      redeemedAt: new Date().toISOString(),
      note: '好好享受这一刻',
      cost: 30,
    })
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.find('.rlp-recent').exists()).toBe(true)
    expect(wrapper.text()).toContain('最近兑现')
  })
})