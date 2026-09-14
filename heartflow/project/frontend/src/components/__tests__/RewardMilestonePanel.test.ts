// ============================================================
// RewardMilestonePanel 组件测试 - INCR-149 里程碑面板
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const store: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in store ? store[k] : def),
    setKV: (k: string, v: any) => {
      store[k] = v
    },
  },
}))

import { useRewardMilestones } from '@/modules/reward/milestones'
import RewardMilestonePanel from '../RewardMilestonePanel.vue'

describe('RewardMilestonePanel (INCR-149)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题且不崩溃', async () => {
    const bridge = useRewardMilestones()
    const wrapper = mount(RewardMilestonePanel, { props: { bridge } })
    // 等待 load() 异步填充里程碑
    await new Promise(r => setTimeout(r, 0))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.rmp').exists()).toBe(true)
    expect(wrapper.text()).toContain('里程碑')
  })

  it('里程碑全部未达成时 achievedCount 为 0', () => {
    const bridge = {
      milestones: { value: [{ id: 'm1', title: 'T', description: 'D', achieved: false }] },
      load: vi.fn(),
    } as any
    const wrapper = mount(RewardMilestonePanel, { props: { bridge } })
    expect(wrapper.find('.rmp-sub').text()).toContain('已达成 0 / 1')
  })
})
