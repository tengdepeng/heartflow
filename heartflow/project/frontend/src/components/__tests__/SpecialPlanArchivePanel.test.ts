// ============================================================
// SpecialPlanArchivePanel 专项档案面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpecialPlanArchivePanel from '../SpecialPlanArchivePanel.vue'
import type { SpecialPlan } from '../../modules/goal/types'

const NOW = new Date('2026-08-20T00:00:00Z').getTime()

function mk(partial: Partial<SpecialPlan> = {}): SpecialPlan {
  return {
    id: `sp_${Math.random().toString(36).slice(2, 6)}`,
    title: '专项',
    description: '',
    relatedGoalIds: [],
    milestones: [],
    createdAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
    ...partial,
  }
}

function mountPanel(plans: SpecialPlan[]) {
  return mount(SpecialPlanArchivePanel, { props: { plans } })
}

describe('SpecialPlanArchivePanel 专项档案', () => {
  it('空态：标题 + 专项未立徽标 + 引导文案', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('专项档案')
    expect(wrapper.text()).toContain('专项未立')
    expect(wrapper.text()).toContain('还没有跨目标规划')
  })

  it('填充态：徽标为规划起步（无里程碑完成）', () => {
    const plans = [mk({ milestones: [{ label: 'a', done: false }] })]
    const wrapper = mountPanel(plans)
    const badge = wrapper.find('.spp-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toContain('规划起步')
  })

  it('填充态：徽标为推进中（部分里程碑完成）', () => {
    const plans = [
      mk({
        milestones: [
          { label: 'a', done: true },
          { label: 'b', done: false },
        ],
      }),
    ]
    const wrapper = mountPanel(plans)
    const badge = wrapper.find('.spp-badge')
    expect(badge.text()).toContain('推进中')
  })

  it('填充态：徽标为全部点亮（全部完成）', () => {
    const plans = [
      mk({
        milestones: [
          { label: 'a', done: true },
          { label: 'b', done: true },
        ],
      }),
    ]
    const wrapper = mountPanel(plans)
    const badge = wrapper.find('.spp-badge')
    expect(badge.text()).toContain('全部点亮')
  })

  it('填充态：档案概览八格', () => {
    const plans = [
      mk({
        relatedGoalIds: ['g1', 'g2'],
        milestones: [
          { label: 'a', done: true },
          { label: 'b', done: false },
        ],
      }),
      mk({ relatedGoalIds: ['g2'], milestones: [] }),
    ]
    const wrapper = mountPanel(plans)
    const overviewBlock = wrapper.findAll('.spp-block').find((b) => b.text().includes('档案概览'))!
    const cells = overviewBlock.findAll('.spp-cell')
    expect(cells.length).toBe(8)
    expect(wrapper.text()).toContain('规划总数')
    expect(wrapper.text()).toContain('关联目标')
    expect(wrapper.text()).toContain('平均完成度')
    expect(wrapper.text()).toContain('整体完成度')
  })

  it('填充态：里程碑进度渲染完成数与百分比', () => {
    const plans = [
      mk({
        milestones: [
          { label: 'a', done: true },
          { label: 'b', done: false },
        ],
      }),
    ]
    const wrapper = mountPanel(plans)
    const progressBlock = wrapper.findAll('.spp-block').find((b) => b.text().includes('里程碑进度'))!
    expect(progressBlock.exists()).toBe(true)
    expect(progressBlock.text()).toContain('1 / 2')
    expect(progressBlock.text()).toContain('50%')
  })

  it('填充态：游离专项渲染未关联目标的规划', () => {
    const plans = [
      mk({ id: 'linked', title: '已关联', relatedGoalIds: ['g1'] }),
      mk({ id: 'orphan', title: '游离专项A', relatedGoalIds: [] }),
    ]
    const wrapper = mountPanel(plans)
    const orphanBlock = wrapper.findAll('.spp-block').find((b) => b.text().includes('游离专项'))!
    expect(orphanBlock.exists()).toBe(true)
    expect(orphanBlock.text()).toContain('游离专项A')
  })

  it('温和洞察列表有界且非空', () => {
    const plans = [
      mk({ relatedGoalIds: ['g1'], milestones: [{ label: 'a', done: true }] }),
      mk({ relatedGoalIds: [], milestones: [] }),
    ]
    const wrapper = mountPanel(plans)
    const insights = wrapper.findAll('.spp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('数据联动：props 更新后从空态进入填充态', async () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('专项未立')
    await wrapper.setProps({
      plans: [mk({ milestones: [{ label: 'a', done: true }] })],
    })
    expect(wrapper.text()).not.toContain('专项未立')
    expect(wrapper.text()).toContain('档案概览')
  })

  // ============================================================
  // INCR-453：接线 planSuggestion（引擎已实现却零 UI 消费）——
  // per-plan 具名提示，与面板既有「聚合洞察」互补不重复。
  // ============================================================
  it('INCR-453 无里程碑的专项显示具名提示', () => {
    const plans = [
      mk({ title: '写作计划', milestones: [] }),
      // 部分完成 → planSuggestion 返回 null，不出现
      mk({ title: '健身计划', milestones: [{ label: '深蹲', done: true }, { label: '硬拉', done: false }] }),
    ]
    const wrapper = mountPanel(plans)
    const hints = wrapper.findAll('.spp-hint')
    expect(hints.length).toBe(1)
    expect(hints[0].text()).toContain('写作计划')
    expect(hints[0].text()).toContain('还未设定里程碑')
  })

  it('INCR-453 单里程碑即全部完成的专项也算「已全部点亮」', () => {
    const plans = [
      mk({ title: '完成的项目', milestones: [{ label: 'a', done: true }, { label: 'b', done: true }] }),
    ]
    const wrapper = mountPanel(plans)
    const hints = wrapper.findAll('.spp-hint')
    expect(hints.length).toBe(1)
    expect(hints[0].text()).toContain('里程碑已全部点亮')
  })

  it('INCR-453 无提示需求时不渲染该区块', () => {
    const plans = [mk({ title: '进行中', milestones: [{ label: 'a', done: true }, { label: 'b', done: false }] })]
    const wrapper = mountPanel(plans)
    expect(wrapper.text()).not.toContain('专项提示')
  })
})
