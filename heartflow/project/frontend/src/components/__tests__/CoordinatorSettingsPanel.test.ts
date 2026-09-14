import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import CoordinatorSettingsPanel from '../CoordinatorSettingsPanel.vue'

describe('CoordinatorSettingsPanel', () => {
  it('挂载不崩溃，含标题、三模式与未设置协调者', () => {
    const wrapper = mount(CoordinatorSettingsPanel)
    expect(wrapper.find('.csp').exists()).toBe(true)
    expect(wrapper.text()).toContain('协调权')
    expect(wrapper.text()).toContain('镜我的总管与协调职能可转移给其他幕僚')
    expect(wrapper.findAll('.csp-mode')).toHaveLength(3)
    expect(wrapper.find('.csp-mode.on').text()).toContain('镜我任协调者')
    expect(wrapper.find('.csp-current-value--none').exists()).toBe(true)
  })

  it('切换到关闭模式并持久化', async () => {
    const wrapper = mount(CoordinatorSettingsPanel)
    await wrapper.findAll('.csp-mode')[2].trigger('click')
    expect(wrapper.find('.csp-current-value--none').exists()).toBe(true)
  })
})
