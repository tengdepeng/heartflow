// ============================================================
// ConstitutionStatusPanel 组件测试（A2-EXT P2.1 · 逐条展开）
// 覆盖：默认收起 / 点击展开显示消费点+诚实理由 / 再次点击收起 /
// 展开全部切换。纯本地、零外部依赖。
// ============================================================

import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConstitutionStatusPanel from '@/components/ConstitutionStatusPanel.vue'

describe('ConstitutionStatusPanel · P2.1 逐条展开', () => {
  it('默认渲染卡片，消费点详情默认不显示（收起态）', () => {
    const wrapper = mount(ConstitutionStatusPanel)
    const cards = wrapper.findAll('.status-card')
    expect(cards.length).toBeGreaterThan(0)
    // 默认无展开态
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(0)
    expect(wrapper.findAll('.status-card-details').length).toBe(0)
  })

  it('点击卡片展开：显示消费点 + 诚实理由，且卡片进入 is-expanded', async () => {
    const wrapper = mount(ConstitutionStatusPanel)
    const first = wrapper.find('.status-card')
    await first.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(1)
    const details = wrapper.find('.status-card-details')
    expect(details.exists()).toBe(true)
    expect(details.text()).toContain('消费点')
  })

  it('再次点击同一卡片收起', async () => {
    const wrapper = mount(ConstitutionStatusPanel)
    const first = wrapper.find('.status-card')
    await first.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(1)
    await first.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(0)
    expect(wrapper.findAll('.status-card-details').length).toBe(0)
  })

  it('展开全部按钮：点击后所有卡片进入展开态，文案变为「收起全部」', async () => {
    const wrapper = mount(ConstitutionStatusPanel)
    const totalCards = wrapper.findAll('.status-card').length
    expect(totalCards).toBeGreaterThan(1)
    const expandAllBtn = wrapper.findAll('.stylus-btn.ghost')[0]!
    expect(expandAllBtn.text()).toContain('展开全部')
    await expandAllBtn.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(totalCards)
    expect(expandAllBtn.text()).toContain('收起全部')
  })

  it('展开全部后再点击一次收起全部', async () => {
    const wrapper = mount(ConstitutionStatusPanel)
    const expandAllBtn = wrapper.findAll('.stylus-btn.ghost')[0]!
    await expandAllBtn.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(wrapper.findAll('.status-card').length)
    await expandAllBtn.trigger('click')
    expect(wrapper.findAll('.status-card.is-expanded').length).toBe(0)
  })
})
