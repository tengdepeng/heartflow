// ============================================================
// 地图室 · 环球投影面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GeoProjectionPanel from '../GeoProjectionPanel.vue'

function place(overrides: Record<string, any> = {}) {
  return {
    id: `p_${Math.random().toString(36).slice(2, 8)}`,
    name: '苏州',
    city: '苏州',
    type: 'city',
    note: '',
    visitCount: 1,
    at: '2026-08-01T08:00:00.000Z',
    lng: 120.62,
    lat: 31.32,
    _expanded: false,
    ...overrides,
  }
}

function mountPanel(places: any[] = []) {
  return mount(GeoProjectionPanel, { props: { places } })
}

describe('GeoProjectionPanel 环球投影', () => {
  it('渲染地球球面', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('环球投影')
    expect(wrapper.find('svg.gp-globe').exists()).toBe(true)
    expect(wrapper.find('polygon.gp-sphere').exists()).toBe(true)
  })

  it('无定位点时提示落点数为 0', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('0 个地点已落点')
  })

  it('为已定位地点渲染落点圆', () => {
    const wrapper = mountPanel([
      place({ name: '苏州' }),
      place({ name: '巴黎', lng: 2.35, lat: 48.86 }),
    ])
    const circles = wrapper.findAll('circle')
    expect(circles.length).toBe(2)
    expect(wrapper.text()).toContain('2 个地点已落点')
  })

  it('未定位地点不落点', () => {
    const wrapper = mountPanel([
      place({ name: '无坐标', lng: undefined, lat: undefined }),
      place({ name: '苏州' }),
    ])
    const circles = wrapper.findAll('circle')
    expect(circles.length).toBe(1)
    expect(wrapper.text()).toContain('1 个地点已落点')
  })
})
