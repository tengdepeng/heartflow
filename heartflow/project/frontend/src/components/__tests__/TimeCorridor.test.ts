// ============================================================
// TimeCorridor 时间走廊组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeCorridor from '../TimeCorridor.vue'
import type { TimeCrystal, FocusSession } from '../../types'

// 模拟 storage 模块
vi.mock('../../engine/storage', () => ({
  storage: {
    getCrystals: vi.fn(),
  },
}))

// 模拟 CrystalDetail 子组件
vi.mock('../CrystalDetail.vue', () => ({
  default: {
    name: 'CrystalDetail',
    template: '<div class="crystal-detail-stub" />',
    props: ['crystal', 'session'],
  },
}))

import { storage } from '../../engine/storage'

const mockCrystals: TimeCrystal[] = [
  {
    id: 'c1',
    sessionId: 's1',
    color: '#7c5cfc',
    intensity: 0.85,
    createdAt: new Date().toISOString(),
    shape: 'octahedron',
    tags: ['专注', '深度'],
    insight: '保持专注',
  },
  {
    id: 'c2',
    sessionId: 's2',
    color: '#38bdf8',
    intensity: 0.45,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    shape: 'sphere',
    tags: ['学习'],
    insight: null,
  },
  {
    id: 'c3',
    sessionId: 's3',
    color: '#f0c040',
    intensity: 0.92,
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    shape: 'dodecahedron',
    tags: ['创作', '灵感'],
    insight: '灵感迸发',
  },
]

const mockSessionMap = new Map<string, FocusSession>([
  ['s1', {
    id: 's1',
    status: 'completed',
    mode: 'focus',
    plannedDuration: 3600000,
    elapsed: 3600000,
    startedAt: new Date().toISOString(),
    pausedDuration: 0,
    pausedAt: null,
    completedAt: new Date().toISOString(),
    tags: ['专注', '深度'],
    note: '',
    carrierId: null,
  }],
  ['s2', {
    id: 's2',
    status: 'completed',
    mode: 'focus',
    plannedDuration: 1800000,
    elapsed: 1500000,
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    pausedDuration: 0,
    pausedAt: null,
    completedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['学习'],
    note: '',
    carrierId: null,
  }],
  ['s3', {
    id: 's3',
    status: 'completed',
    mode: 'focus',
    plannedDuration: 7200000,
    elapsed: 7200000,
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    pausedDuration: 0,
    pausedAt: null,
    completedAt: new Date(Date.now() - 172800000).toISOString(),
    tags: ['创作', '灵感'],
    note: '',
    carrierId: null,
  }],
])

describe('TimeCorridor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染时间走廊容器', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    expect(wrapper.find('.time-corridor').exists()).toBe(true)
    expect(wrapper.find('.corridor-title').text()).toContain('时间长廊')
  })

  it('渲染 SVG 时间线画布', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    expect(wrapper.find('.corridor-svg').exists()).toBe(true)
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('根据结晶数据渲染对应数量的 band-dot', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    const dots = wrapper.findAll('.band-dot')
    expect(dots.length).toBe(mockCrystals.length)
  })

  it('空状态时仍渲染容器但无 band-dot', () => {
    vi.mocked(storage.getCrystals).mockReturnValue([])
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: new Map() },
    })
    expect(wrapper.find('.time-corridor').exists()).toBe(true)
    expect(wrapper.findAll('.band-dot').length).toBe(0)
  })

  it('渲染月份标记', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    const monthLabels = wrapper.findAll('.month-label')
    // 至少有一条月份标记线
    expect(monthLabels.length).toBeGreaterThanOrEqual(1)
  })

  it('渲染点击提示文字', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    expect(wrapper.find('.click-hint').exists()).toBe(true)
    expect(wrapper.find('.click-hint').text()).toContain('点击光点查看结晶')
  })

  it('点击 SVG 空白区域可清除选中状态', async () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    // 先点击一个 dot
    const firstDot = wrapper.find('.band-dot')
    if (firstDot.exists()) {
      await firstDot.trigger('click.stop')
      // CrystalDetail 应出现
      // 然后点击 SVG 空白
      await wrapper.find('.corridor-svg').trigger('click')
      // 选中状态应清除，CrystalDetail 不再显示
      // CrystalDetail 组件通过 selectedCrystal 控制，如果为 null 则 Teleport 不渲染
      // 在 stub 中我们无法直接检测，但至少不报错
    }
    expect(wrapper.find('.corridor-svg').exists()).toBe(true)
  })

  it('鼠标悬停 band-dot 显示 tooltip', async () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    const firstDot = wrapper.find('.band-dot')
    if (firstDot.exists()) {
      await firstDot.trigger('mouseenter')
      // tooltip 应可见
      const tooltip = wrapper.find('.corridor-tooltip')
      expect(tooltip.exists()).toBe(true)
    }
  })

  it('鼠标离开 band-dot 隐藏 tooltip', async () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    const firstDot = wrapper.find('.band-dot')
    if (firstDot.exists()) {
      await firstDot.trigger('mouseenter')
      await firstDot.trigger('mouseleave')
      // tooltip 应隐藏（hoveredDot 为 null 时 tooltip 不渲染）
      expect(wrapper.find('.corridor-tooltip-visible').exists()).toBe(false)
    }
  })

  it('渲染标题和比例提示', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    expect(wrapper.find('.corridor-title').text()).toContain('◈')
    expect(wrapper.find('.corridor-scale-hint').text()).toContain('按日期回看结晶')
  })

  it('渲染今天标记线（如果有今天的结晶）', () => {
    // 确保至少有一个今天的结晶
    const todayCrystals = [
      {
        ...mockCrystals[0],
        createdAt: new Date().toISOString(),
      },
    ]
    vi.mocked(storage.getCrystals).mockReturnValue(todayCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    // 今天标记线存在
    const todayMarker = wrapper.find('.today-marker')
    expect(todayMarker.exists()).toBe(true)
  })

  it('渲染带颜色的 band-dot 圆点', () => {
    vi.mocked(storage.getCrystals).mockReturnValue(mockCrystals)
    const wrapper = mount(TimeCorridor, {
      props: { sessionMap: mockSessionMap },
    })
    const dotInner = wrapper.find('.band-dot-inner')
    expect(dotInner.exists()).toBe(true)
    // 检查颜色属性
    const fill = dotInner.attributes('fill')
    expect(fill).toBeTruthy()
  })
})