import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import VisualChartPanel from '../VisualChartPanel.vue'
import type { SevenDimensionDataItem } from '../../modules/visualization/dimension-mapping/seven-dimensions'

function makeItem(partial: Partial<SevenDimensionDataItem> & { id: string }): SevenDimensionDataItem {
  return {
    label: partial.id,
    values: { value: 1 },
    categories: { type: 'default' },
    ...partial,
  }
}

describe('VisualChartPanel（INCR-413：图表渲染 svg.ts 零消费引擎薄委托）', () => {
  it('空 items 渲染空态引导', () => {
    const wrapper = mount(VisualChartPanel, { props: { items: [] } })
    expect(wrapper.find('[data-testid="vcp-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="vcp-svg"]').exists()).toBe(false)
  })

  it('有数据默认折线图并渲染 SVG 轴/网格/图例', () => {
    const items: SevenDimensionDataItem[] = [
      makeItem({ id: 'a', values: { value: 3 } }),
      makeItem({ id: 'b', values: { value: 5 } }),
      makeItem({ id: 'c', values: { value: 2 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(svg).toContain('<svg')
    expect(svg).toContain('stroke=') // 折线路径
    expect(svg).toContain('<line') // 轴/网格
    expect(svg).toContain('fill') // 面积/图例
    // 数值字段自动取第一个，图例含字段名
    expect(wrapper.text()).toContain('value')
  })

  it('切换柱状图渲染柱条矩形', async () => {
    const items = [makeItem({ id: 'a', values: { value: 4 } }), makeItem({ id: 'b', values: { value: 7 } })]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const chips = wrapper.findAll('[data-testid="vcp-charttype"] .vcp-chip')
    await chips[1].trigger('click') // 柱条
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(svg).toContain('Q ') // 圆角柱路径
  })

  it('切换环影按类别归组并渲染环段', async () => {
    const items = [
      makeItem({ id: 'a', values: { value: 2 }, categories: { type: 'happy' } }),
      makeItem({ id: 'b', values: { value: 3 }, categories: { type: 'happy' } }),
      makeItem({ id: 'c', values: { value: 5 }, categories: { type: 'calm' } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const chips = wrapper.findAll('[data-testid="vcp-charttype"] .vcp-chip')
    await chips[2].trigger('click') // 环影
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(svg).toContain('A ') // 环形弧段路径
    // 中心汇总总数 = 2+3+5 = 10
    expect(svg).toContain('>10</text>')
    // 图例含类别名
    expect(svg).toContain('happy')
    expect(svg).toContain('calm')
  })

  it('边界适配开关切换数据边界标签', async () => {
    const items = [makeItem({ id: 'a', values: { value: 3 } }), makeItem({ id: 'b', values: { value: 9 } })]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    expect(wrapper.find('[data-testid="vcp-bbox"]').text()).toContain('数据边界')
    const box = wrapper.get('[data-testid="vcp-fit"]')
    await box.setValue(false)
    expect(wrapper.find('[data-testid="vcp-bbox"]').text()).toContain('数据边界')
  })

  it('折线插值切换可行（平滑/线性/阶梯）', async () => {
    const items = [makeItem({ id: 'a', values: { value: 1 } }), makeItem({ id: 'b', values: { value: 6 } })]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const interpChips = wrapper.findAll('[data-testid="vcp-interp"] .vcp-chip')
    expect(interpChips.length).toBe(3)
    await interpChips[1].trigger('click')
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(svg).toContain('<svg')
  })

  it('数值字段下拉列出 items 的 values 键，切换后重渲染', async () => {
    const items = [makeItem({ id: 'a', values: { v1: 2, v2: 8 } })]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const options = wrapper.findAll('[data-testid="vcp-field"] option')
    expect(options.length).toBe(2)
    await wrapper.get('[data-testid="vcp-field"]').setValue('v2')
    expect(wrapper.find('[data-testid="vcp-note"]').text()).toContain('v2')
  })
})