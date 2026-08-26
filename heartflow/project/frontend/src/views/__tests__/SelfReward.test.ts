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
  rewardLedger: () => ({
    totalRedeemed: 0,
    totalCost: 0,
    cadenceDays: null,
    noteRate: 0,
    byMonth: [],
    recent: [],
  }),
  redemptionMilestones: () => ({ reached: [], next: 1 }),
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
  it('挂载并渲染头部与犒赏账本', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.find('.sr-title').text()).toContain('自我奖励')
    expect(wrapper.find('.rlp').exists()).toBe(true)
    expect(wrapper.find('.rlp-title').text()).toContain('犒赏账本')
  })

  it('空态提示出现', () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    expect(wrapper.find('.sr-empty').exists()).toBe(true)
  })

  it('填入名称与成本后提交，统计随之更新', async () => {
    const wrapper = mount(SelfRewardView, { global: { stubs: { 'router-link': true } } })
    await wrapper.find('.sr-toggle-btn').trigger('click')
    await wrapper.find('.sr-form input').setValue('看一场电影')
    await wrapper.findAll('button').find(b => b.text() === '创建')!.trigger('click')
    expect(rewards.value.length).toBe(1)
  })
})