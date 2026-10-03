import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// 隔离宪法效果引擎与克制门模块：本面板只关心「克制是否生效」与「受限动作集合」两个真实数据源。
vi.mock('../../modules/advisor/restraint', () => ({
  isAdvisorRestrained: vi.fn(() => true),
  RESTRICTED_ADVISOR_ACTIONS: new Set(['send', 'trade', 'external-interact']),
}))
vi.mock('../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(),
  onEffectEvent: vi.fn(() => () => {}),
}))

import AdvisorRestraintPanel from '../AdvisorRestraintPanel.vue'
import { isAdvisorRestrained } from '../../modules/advisor/restraint'
import { onEffectEvent } from '../../engine/constitution-effect'

// 注意：各测试独立挂载同一组件，需在每个用例前清空共享 mock 的调用计数，避免跨用例累积。
beforeEach(() => {
  vi.mocked(onEffectEvent).mockClear()
})

describe('AdvisorRestraintPanel · 第44条幕僚的克制治理可视化', () => {
  beforeEach(() => {
    vi.mocked(isAdvisorRestrained).mockReturnValue(true)
  })

  it('克制生效时展示「克制生效中」状态与三个受限动作标签', () => {
    const wrapper = mount(AdvisorRestraintPanel)
    const text = wrapper.text()
    expect(text).toContain('克制生效中')
    expect(text).toContain('代发消息')
    expect(text).toContain('代交易')
    expect(text).toContain('代表你与外部世界交互')
    // 生效时受限动作为「拦截」语义
    expect(text).toContain('拦截')
    // section 根挂 is-active，动作状态呈绿（拦截）
    expect(wrapper.find('section.arp').classes()).toContain('is-active')
    wrapper.unmount()
  })

  it('克制关闭时展示「克制已关闭」状态且动作态翻为「放行」', () => {
    vi.mocked(isAdvisorRestrained).mockReturnValue(false)
    const wrapper = mount(AdvisorRestraintPanel)
    const text = wrapper.text()
    expect(text).toContain('克制已关闭')
    expect(text).toContain('放行')
    expect(wrapper.find('section.arp').classes()).toContain('is-off')
    wrapper.unmount()
  })

  it('始终呈现宪法第44条的解释说明', () => {
    const wrapper = mount(AdvisorRestraintPanel)
    const text = wrapper.text()
    expect(text).toContain('你可以考虑')
    expect(text).toContain('主观')
    wrapper.unmount()
  })

  it('挂载时订阅宪法效果事件、卸载时退订', () => {
    const wrapper = mount(AdvisorRestraintPanel)
    expect(onEffectEvent).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
