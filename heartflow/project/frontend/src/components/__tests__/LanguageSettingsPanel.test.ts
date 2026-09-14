import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LanguageSettingsPanel from '../LanguageSettingsPanel.vue'

describe('LanguageSettingsPanel', () => {
  it('挂载不崩溃且含标题与三语卡片', () => {
    const wrapper = mount(LanguageSettingsPanel)
    expect(wrapper.find('.lsp').exists()).toBe(true)
    expect(wrapper.text()).toContain('语言设置')
    expect(wrapper.findAll('.lsp-card')).toHaveLength(3)
  })

  it('切换语言不崩溃', async () => {
    const wrapper = mount(LanguageSettingsPanel)
    const cards = wrapper.findAll('.lsp-card')
    await cards[1].trigger('click')
    await cards[2].trigger('click')
    expect(wrapper.find('.lsp').exists()).toBe(true)
  })
})
