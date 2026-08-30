import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ExternalRoom from '../ExternalRoom.vue'
import { storage } from '../../engine/storage'

// 外链房依赖 engine/ai/external-gate 读取合规覆盖；这里固定为「未同意远程 AI」，
// 以便稳定断言出口闸的关闭态文案。
vi.mock('../../engine/ai/external-gate', () => ({
  isExternalAIConsented: () => false,
  isLocalAIModelHost: (url?: string) => !!url && /localhost|127\.0\.0\.1/.test(url),
  checkExternalAIGate: () => null,
}))

describe('外链房 /external', () => {
  beforeEach(() => {
    storage.setKV('external:tab', 'ai')
  })

  it('渲染房间标题与五个分区标签', () => {
    const wrapper = mount(ExternalRoom)
    expect(wrapper.find('.header-title').text()).toBe('外链房')
    const tabs = wrapper.findAll('.tab')
    expect(tabs).toHaveLength(5)
    const labels = tabs.map((t) => t.text().trim())
    expect(labels[0]).toContain('AI 模型与接口')
    expect(labels[1]).toContain('技能')
    expect(labels[2]).toContain('云同步')
    expect(labels[3]).toContain('写作提示词')
    expect(labels[4]).toContain('榜单通道')
  })

  it('默认停在 AI 分区并渲染模型设置面板（本轮已做实）', () => {
    const wrapper = mount(ExternalRoom)
    expect(wrapper.find('.tab.is-on').text()).toContain('AI 模型与接口')
    expect(wrapper.find('.ai-settings').exists()).toBe(true)
    expect(wrapper.find('.pending').exists()).toBe(false)
  })

  it('切到待建分区时显示「待建」占位，而不是空壳面板', async () => {
    const wrapper = mount(ExternalRoom)
    const tabs = wrapper.findAll('.tab')
    await tabs[1].trigger('click') // 技能
    expect(wrapper.find('.pending').exists()).toBe(true)
    expect(wrapper.find('.pending-badge').text()).toBe('待建')
    expect(wrapper.find('.pending-title').text()).toBe('技能 Skill')
    // 待建分区不应再渲染 AI 面板
    expect(wrapper.find('.ai-settings').exists()).toBe(false)
  })

  it('四个待建分区标签都带待建圆点，已建分区不带', () => {
    const wrapper = mount(ExternalRoom)
    const tabs = wrapper.findAll('.tab')
    expect(tabs[0].find('.tab-dot').exists()).toBe(false)
    for (let i = 1; i < 5; i++) {
      expect(tabs[i].find('.tab-dot').exists()).toBe(true)
    }
  })

  it('出口闸未同意远程 AI 时显示关闭态文案', () => {
    const wrapper = mount(ExternalRoom)
    expect(wrapper.find('.gate-banner').classes()).toContain('is-closed')
    expect(wrapper.find('.gate-text').text()).toContain('仅本地端点放行')
  })

  it('分区选择会持久化到存储', async () => {
    const wrapper = mount(ExternalRoom)
    await wrapper.findAll('.tab')[2].trigger('click') // 云同步
    expect(storage.getKV<string>('external:tab', 'ai')).toBe('sync')
  })
})
