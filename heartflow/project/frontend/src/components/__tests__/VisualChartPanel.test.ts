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
    expect(svg).toContain('<line') // 轴/网格/刻度线
    expect(svg).toContain('fill') // 面积/图例
    // 数值字段自动取第一个，图例含字段名
    expect(wrapper.text()).toContain('value')
  })

  it('折线/柱状图渲染刻度数值标签（Y 轴真实值 + X 轴唯一序号）', () => {
    const items: SevenDimensionDataItem[] = [
      makeItem({ id: 'a', values: { value: 3 } }),
      makeItem({ id: 'b', values: { value: 5 } }),
      makeItem({ id: 'c', values: { value: 2 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    // Y 轴刻度含数据值域内的真实数值（默认边界适配开启：数据 3/5/2 → 值域 [2,5]，值域<10 保留一位小数）
    expect(svg).toContain('>5.0</text>')
    expect(svg).toContain('>2.0</text>')
    // X 轴序号刻度：3 个数据点逐点标注，序号唯一不重复（font-size="10" 标识 X 序号）
    const xLabels = [...svg.matchAll(/font-size="10"[^>]*>(\d+)<\/text>/g)].map((m) => m[1])
    expect(xLabels).toEqual(['0', '1', '2'])
  })

  it('图例包裹在 <svg> 内渲染（色块 swatch 可见）', () => {
    const items = [makeItem({ id: 'a', values: { value: 3 } }), makeItem({ id: 'b', values: { value: 5 } })]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const html = wrapper.get('[data-testid="vcp-svg"]').html()
    const legend = html.match(/<svg class="vcp-legend"[\s\S]*?<\/svg>/)?.[0] ?? ''
    expect(legend).not.toBe('')
    expect(legend).toContain('<line') // 折线 swatch
    expect(legend).toContain('>value</text>')
  })

  it('刻度短线渲染为真实 path 元素（generateAxisPaths 返回路径数据须包进 <path>）', () => {
    const items: SevenDimensionDataItem[] = [
      makeItem({ id: 'a', values: { value: 3 } }),
      makeItem({ id: 'b', values: { value: 5 } }),
      makeItem({ id: 'c', values: { value: 2 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    // 刻度短线须为可渲染的 path 元素
    expect(svg).toContain('class="vcp-tick"')
    // 且不得把原始路径数据当作裸文本泄漏进 SVG
    expect(svg).not.toMatch(/>\s*M [\d.]+ [\d.]+ L [\d.]+ [\d.]+M/)
  })

  it('边界适配开启时 Y 轴贴合数据值域，关闭时回到零基准，且折线始终铺满宽度', async () => {
    const items = [
      makeItem({ id: 'a', values: { value: 20 } }),
      makeItem({ id: 'b', values: { value: 40 } }),
      makeItem({ id: 'c', values: { value: 60 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const yLabels = (h: string) => [...h.matchAll(/font-size="11"[^>]*>([\d.]+)<\/text>/g)].map((m) => m[1])
    // 默认开启：Y 轴贴合数据值域（20–60，非零基准）
    let svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(yLabels(svg)).toEqual(['20', '40', '60'])
    // X 始终铺满宽度：末点落在绘图区右边界（pad.left + plotW = 62 + 552 = 614）
    expect(svg).toContain('cx="614"')
    // 关闭：回到零基准（0–60）
    await wrapper.get('[data-testid="vcp-fit"]').setValue(false)
    svg = wrapper.get('[data-testid="vcp-svg"]').html()
    expect(yLabels(svg)).toEqual(['0', '30', '60'])
  })

  it('垂直/水平网格线以暖金淡描渲染（可见性，非近乎透明的默认白）', () => {
    const items: SevenDimensionDataItem[] = [
      makeItem({ id: 'a', values: { value: 3 } }),
      makeItem({ id: 'b', values: { value: 5 } }),
      makeItem({ id: 'c', values: { value: 2 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    // 垂直网格线须纵贯绘图区（y0=28 → y1=272）且用暖金描边
    const verticals = [...svg.matchAll(/<line x1="([\d.]+)" y1="28" x2="([\d.]+)" y2="272"[^>]*stroke="([^"]+)"/g)]
    expect(verticals.length).toBeGreaterThan(0)
    expect(verticals[0][1]).toBe(verticals[0][2]) // 垂直线 x 首尾一致
    expect(verticals[0][3]).toBe('rgba(212, 165, 116, 0.18)')
    // 不得残留近乎不可见的默认白网格
    expect(svg).not.toContain('rgba(255,255,255,0.06)')
  })

  it('柱状图始终以零为基准（边界适配不扭曲柱长）', async () => {
    const items = [
      makeItem({ id: 'a', values: { value: 20 } }),
      makeItem({ id: 'b', values: { value: 40 } }),
      makeItem({ id: 'c', values: { value: 60 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    // 折线默认开启边界适配时值域贴合数据（20–60）
    const yLabels = (h: string) => [...h.matchAll(/font-size="11"[^>]*>([\d.]+)<\/text>/g)].map((m) => m[1])
    expect(yLabels(wrapper.get('[data-testid="vcp-svg"]').html())).toEqual(['20', '40', '60'])
    const chips = wrapper.findAll('[data-testid="vcp-charttype"] .vcp-chip')
    await chips[1].trigger('click') // 柱条
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    // 切柱条后回到零基准（0–60），柱长比例不被扭曲
    expect(yLabels(svg)).toEqual(['0', '30', '60'])
    // 柱条模式不提供边界适配开关（该开关仅对折线有意义）
    expect(wrapper.find('[data-testid="vcp-fit"]').exists()).toBe(false)
  })

  it('柱状图单系列同色且与图例一致', async () => {
    const items = [
      makeItem({ id: 'a', values: { value: 4 } }),
      makeItem({ id: 'b', values: { value: 7 } }),
      makeItem({ id: 'c', values: { value: 5 } }),
    ]
    const wrapper = mount(VisualChartPanel, { props: { items } })
    const chips = wrapper.findAll('[data-testid="vcp-charttype"] .vcp-chip')
    await chips[1].trigger('click') // 柱条
    const svg = wrapper.get('[data-testid="vcp-svg"]').html()
    // 柱条路径（d 含圆角 Q 指令）填充色唯一（单系列），且与图例色块同色
    const barFills = [...svg.matchAll(/<path d="([^"]*)" fill="(#[0-9a-f]{6})"/g)]
      .filter((m) => m[1].includes('Q'))
      .map((m) => m[2])
    expect(barFills.length).toBe(3)
    expect(new Set(barFills).size).toBe(1)
    expect(barFills[0]).toBe('#d4a574')
    expect(svg).toContain('fill="#d4a574"')
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