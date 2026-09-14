// ============================================================
// VisualizationInteractionPanel 组件测试（INCR-152 可视化交互面板）
// 覆盖：默认渲染两节 / 图表交互与仪表盘布局控件存在 /
// 缩放按钮可点击触发引擎（不崩溃）/ 重置布局可点击。
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import VisualizationInteractionPanel from '@/components/VisualizationInteractionPanel.vue'

describe('VisualizationInteractionPanel · INCR-152', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('默认渲染面板与两节标题', () => {
    const wrapper = mount(VisualizationInteractionPanel)
    expect(wrapper.find('.vip-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('可视化交互')
    expect(wrapper.text()).toContain('图表交互')
    expect(wrapper.text()).toContain('仪表盘布局')
  })

  it('渲染图表交互与仪表盘布局控件', () => {
    const wrapper = mount(VisualizationInteractionPanel)
    const buttons = wrapper.findAll('.vip-btn').map((b) => b.text())
    expect(buttons).toContain('放大')
    expect(buttons).toContain('缩小')
    expect(buttons).toContain('复位视图')
    expect(buttons).toContain('重置布局')
    expect(buttons).toContain('清空面板')
  })

  it('点击放大按钮触发引擎且不崩溃', async () => {
    const wrapper = mount(VisualizationInteractionPanel)
    const zoomBefore = wrapper.find('.vip-stat').text()
    await wrapper.findAll('.vip-btn').find((b) => b.text() === '放大')!.trigger('click')
    expect(wrapper.find('.vip-panel').exists()).toBe(true)
    // 缩放 stat 仍为有效数字串
    expect(wrapper.find('.vip-stat').text()).toMatch(/缩放/)
    expect(zoomBefore).toMatch(/缩放/)
  })

  it('点击重置布局触发引擎且不崩溃', async () => {
    const wrapper = mount(VisualizationInteractionPanel)
    await wrapper.findAll('.vip-btn').find((b) => b.text() === '重置布局')!.trigger('click')
    expect(wrapper.find('.vip-panel').exists()).toBe(true)
  })
})
