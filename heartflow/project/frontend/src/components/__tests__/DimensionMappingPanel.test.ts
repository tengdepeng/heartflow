import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DimensionMappingPanel from '../DimensionMappingPanel.vue'

function mountPanel() {
  return mount(DimensionMappingPanel)
}

describe('DimensionMappingPanel（INCR-403：维度映射定义 + 实时演示）', () => {
  it('渲染标题与 7 条维度映射定义', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('维度映射')
    const items = wrapper.findAll('.dmp-item')
    expect(items).toHaveLength(7)
    expect(wrapper.text()).toContain('数值→颜色')
    expect(wrapper.text()).toContain('趋势→方向')
    expect(wrapper.text()).toContain('紧急度→发光')
    expect(wrapper.text()).toContain('进度→位置')
  })

  it('默认选中「数值」：实时演示展示色块与色值', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.dmp-demo-dim').text()).toBe('数值')
    expect(wrapper.find('.dmp-swatch').exists()).toBe(true)
    // 默认中值 0.5 → 渐变区间 [0, 0.5] 左端点色（暖鼠尾草）
    expect(wrapper.find('.dmp-result').text()).toBe('#8a9a7a')
  })

  it('点击「趋势」项切换演示为方向箭头', async () => {
    const wrapper = mountPanel()
    const trend = wrapper.findAll('.dmp-item').find((w) => w.text().includes('趋势→方向'))!
    await trend.trigger('click')
    expect(wrapper.find('.dmp-demo-dim').text()).toBe('趋势')
    expect(wrapper.find('.dmp-arrow').exists()).toBe(true)
    // 默认中值 0 → 持平 → 方向标签「持平」
    expect(wrapper.find('.dmp-result').text()).toBe('持平')
  })

  it('点击「复杂度」项切换为纹理 SVG 与密度标签', async () => {
    const wrapper = mountPanel()
    const complexity = wrapper.findAll('.dmp-item').find((w) => w.text().includes('复杂度→纹理'))!
    await complexity.trigger('click')
    expect(wrapper.find('.dmp-texture').exists()).toBe(true)
    // 默认中值 0.5 → 中等
    expect(wrapper.find('.dmp-result').text()).toBe('中等')
  })

  it('点击「紧急度」项切换为发光圆', async () => {
    const wrapper = mountPanel()
    const urgency = wrapper.findAll('.dmp-item').find((w) => w.text().includes('紧急度→发光'))!
    await urgency.trigger('click')
    expect(wrapper.find('.dmp-glow').exists()).toBe(true)
  })

  it('滑块拖动改变演示输出', async () => {
    const wrapper = mountPanel()
    const progress = wrapper.findAll('.dmp-item').find((w) => w.text().includes('进度→位置'))!
    await progress.trigger('click')
    expect(wrapper.find('.dmp-track').exists()).toBe(true)
    expect(wrapper.find('.dmp-result').text()).toBe('50%')
    await wrapper.find('.dmp-slider').setValue(0.8)
    expect(wrapper.find('.dmp-result').text()).toBe('80%')
  })

  it('切换维度时滑块值重置为该维度默认范围中值', async () => {
    const wrapper = mountPanel()
    const trend = wrapper.findAll('.dmp-item').find((w) => w.text().includes('趋势→方向'))!
    await trend.trigger('click')
    const slider = wrapper.find<HTMLInputElement>('.dmp-slider')
    // 趋势默认范围 [-1, 1]，中值 0
    expect(Number(slider.element.value)).toBe(0)
    expect((slider.element as HTMLInputElement).min).toBe('-1')
    expect((slider.element as HTMLInputElement).max).toBe('1')
  })
})
