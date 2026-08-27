// ============================================================
// 地图室 · 空间格局面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SpatialPatternPanel from '../SpatialPatternPanel.vue'

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
  return mount(SpatialPatternPanel, { props: { places } })
}

describe('SpatialPatternPanel 空间格局', () => {
  it('无定位地点时显示空洞察', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('空间格局')
    expect(wrapper.text()).toContain('0/4')
  })

  it('计算方位覆盖', () => {
    // 以原点 (0,0) 为质心，四点分别落于四个方位
    const wrapper = mountPanel([
      place({ name: '东点', lng: 1, lat: 0 }),
      place({ name: '北点', lng: 0, lat: 1 }),
      place({ name: '西点', lng: -1, lat: 0 }),
      place({ name: '南点', lng: 0, lat: -1 }),
    ])
    expect(wrapper.text()).toContain('4/4')
    expect(wrapper.text()).toContain('青龙')
    expect(wrapper.text()).toContain('朱雀')
    expect(wrapper.text()).toContain('白虎')
    expect(wrapper.text()).toContain('玄武')
  })

  it('标记未踏足盲区', () => {
    const wrapper = mountPanel([
      place({ name: '东点', lng: 120.62, lat: 31.32 }),
      place({ name: '北点', lng: 116.4, lat: 50.0 }),
    ])
    expect(wrapper.text()).toContain('2/4')
  })

  it('展示格局洞察', () => {
    const wrapper = mountPanel([
      place({ name: '东点', lng: 120.62, lat: 31.32 }),
      place({ name: '北点', lng: 116.4, lat: 50.0 }),
    ])
    expect(wrapper.text()).toContain('格局洞察')
  })

  it('主导方位高亮', () => {
    const wrapper = mountPanel([
      place({ name: 'A', lng: 120.62, lat: 31.32 }),
      place({ name: 'B', lng: 121.0, lat: 31.5 }),
      place({ name: 'C', lng: 122.0, lat: 32.0 }),
      place({ name: 'D', lng: 116.4, lat: 50.0 }),
    ])
    expect(wrapper.text()).toContain('主聚')
  })
})
