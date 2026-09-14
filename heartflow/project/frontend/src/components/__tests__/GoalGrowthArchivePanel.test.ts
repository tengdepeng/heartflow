// ============================================================
// GoalGrowthArchivePanel 目标生长进度档案面板测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import type { Goal } from '../../modules/goal'

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import GoalGrowthArchivePanel from '../GoalGrowthArchivePanel.vue'

function mkGoal(over: Partial<Goal> = {}): Goal {
  return {
    id: `g_${Math.random().toString(36).slice(2, 6)}`,
    title: '目标',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'work',
    order: 0,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    anchorCount: 4,
    anchorDone: 1,
    ...over,
  }
}

async function mountPanel(goals: Goal[]) {
  const wrapper = mount(GoalGrowthArchivePanel, { props: { goals } })
  await nextTick()
  return wrapper
}

describe('GoalGrowthArchivePanel 目标生长进度档案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('空态：标题 + 尚未启程徽标 + 引导文案', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('目标生长进度档案')
    expect(wrapper.text()).toContain('尚未启程')
    expect(wrapper.text()).toContain('留光阁尚未点亮目标')
    expect(wrapper.findAll('.ggap-cell').length).toBe(0)
  })

  it('空态：不渲染档案概览', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).not.toContain('档案概览')
  })

  it('填充态：渲染档案概览六格', async () => {
    const goals = [mkGoal({ status: 'growing', anchorDone: 2 }), mkGoal({ status: 'bloom', anchorCount: 1, anchorDone: 1 })]
    const wrapper = await mountPanel(goals)
    const overview = wrapper.findAll('.ggap-block').find(b => b.text().includes('档案概览'))!
    expect(overview.findAll('.ggap-cell').length).toBe(6)
    expect(wrapper.text()).toContain('总目标')
    expect(wrapper.text()).toContain('进行中')
    expect(wrapper.text()).toContain('已开花')
  })

  it('填充态：徽标为生长中（非全开花）', async () => {
    const wrapper = await mountPanel([mkGoal({ status: 'growing' })])
    expect(wrapper.text()).toContain('生长中')
  })

  it('填充态：全部开花时徽标为满园收获', async () => {
    const goals = [mkGoal({ status: 'bloom', anchorCount: 1, anchorDone: 1 }), mkGoal({ status: 'bloom', anchorCount: 1, anchorDone: 1 })]
    const wrapper = await mountPanel(goals)
    expect(wrapper.text()).toContain('满园收获')
  })

  it('填充态：生长阶段分布渲染五行', async () => {
    const goals = [mkGoal({ status: 'growing' }), mkGoal({ status: 'bloom', anchorCount: 1, anchorDone: 1 })]
    const wrapper = await mountPanel(goals)
    const block = wrapper.findAll('.ggap-block').find(b => b.text().includes('生长阶段分布'))!
    expect(block.findAll('.ggap-phase-row').length).toBe(5)
  })

  it('填充态：渲染目标标签并可切换详情', async () => {
    const g1 = mkGoal({ title: '第一步' })
    const g2 = mkGoal({ title: '第二步' })
    const wrapper = await mountPanel([g1, g2])
    expect(wrapper.text()).toContain('第一步')
    expect(wrapper.text()).toContain('第二步')
    // 默认选中第一个目标，显示其进度
    expect(wrapper.text()).toContain('进度')
  })

  it('交互：点击记录快照按钮后写入快照', async () => {
    const g = mkGoal({ anchorDone: 2 })
    const wrapper = await mountPanel([g])
    await wrapper.find('.ggap-snap-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('已记录快照 1 次')
  })

  it('交互：添加里程碑后里程碑出现', async () => {
    const g = mkGoal()
    const wrapper = await mountPanel([g])
    await wrapper.find('.ggap-ms-input').setValue('交付初稿')
    await wrapper.find('.ggap-ms-add-btn').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('交付初稿')
  })
})