// ============================================================
// 地图室 · 足迹分析面板测试
// ============================================================
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TravelAnalyticsPanel from '../TravelAnalyticsPanel.vue'

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
  return mount(TravelAnalyticsPanel, { props: { places } })
}

describe('TravelAnalyticsPanel 足迹分析', () => {
  it('空状态显示探索势能 0', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('足迹分析')
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('步履未发')
  })

  it('展示足迹概览统计', () => {
    const wrapper = mountPanel([
      place({ name: '苏州', city: '苏州', visitCount: 2 }),
      place({ name: '黄山', city: '黄山', type: 'nature' }),
    ])
    expect(wrapper.text()).toContain('足迹概览')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('3')
  })

  it('展示地貌分布', () => {
    const wrapper = mountPanel([
      place({ type: 'city' }),
      place({ type: 'nature' }),
    ])
    expect(wrapper.text()).toContain('地貌分布')
    expect(wrapper.text()).toContain('城市')
    expect(wrapper.text()).toContain('自然')
  })

  it('展示热门城市与洞察', () => {
    const wrapper = mountPanel([
      place({ name: '苏州', city: '苏州', visitCount: 3, at: '2026-08-01T08:00:00.000Z' }),
      place({ name: '杭州', city: '杭州', at: '2026-08-02T08:00:00.000Z' }),
    ])
    expect(wrapper.text()).toContain('热门城市')
    expect(wrapper.text()).toContain('苏州')
    expect(wrapper.text()).toContain('足迹洞察')
  })

  it('探索势能随足迹增长', () => {
    const wrapper = mountPanel([
      place({ city: '北京' }), place({ city: '上海' }), place({ city: '成都' }),
      place({ city: '广州' }), place({ city: '深圳', type: 'coast' }),
    ])
    expect(wrapper.text()).not.toContain('步履未发')
  })
})
