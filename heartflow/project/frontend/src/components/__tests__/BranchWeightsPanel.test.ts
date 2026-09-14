// ============================================================
// 分支权重面板测试（桩恢复：消费 useBranchWeights）
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { WorldBranch } from '../../modules/parallel-world/types'
import BranchWeightsPanel from '../BranchWeightsPanel.vue'

function makeBranch(overrides: Partial<WorldBranch> = {}): WorldBranch {
  return {
    id: 'b-1',
    name: '主干',
    description: '',
    color: '#4A90D9',
    createdAt: '2026-08-01T00:00:00.000Z',
    isActive: true,
    checkpointCount: 1,
    ...overrides,
  }
}

function getWrapper(branches: WorldBranch[]) {
  return mount(BranchWeightsPanel, { props: { branches } })
}

describe('BranchWeightsPanel · 分支权重（桩恢复）', () => {
  it('空态：无分支时显示引导文案', () => {
    const wrapper = getWrapper([])
    expect(wrapper.find('.bwp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有时间分支')
  })

  it('权重配置：为每个分支渲染一行并显示未设置', () => {
    const wrapper = getWrapper([
      makeBranch(),
      makeBranch({ id: 'b-2', name: '副线', color: '#7B68EE' }),
    ])
    expect(wrapper.findAll('.bwp-row')).toHaveLength(2)
    expect(wrapper.text()).toContain('主干')
    expect(wrapper.text()).toContain('副线')
    expect(wrapper.text()).toContain('未设置')
  })

  it('设置权重：滑动后显示综合权重与关注度', async () => {
    const wrapper = getWrapper([makeBranch()])
    const slider = wrapper.find('.bwp-slider')
    await slider.setValue(0.8)
    await slider.trigger('change')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('综合权重')
    expect(wrapper.text()).toContain('关注度')
  })

  it('需关注：高优先级分支进入需关注列表', async () => {
    const wrapper = getWrapper([makeBranch()])
    const select = wrapper.find('.bwp-select')
    await select.setValue('high')
    await select.trigger('change')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('需要关注')
    expect(wrapper.text()).toContain('高')
  })
})
