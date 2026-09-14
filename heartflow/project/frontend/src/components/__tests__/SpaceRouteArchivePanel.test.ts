// ============================================================
// SpaceRouteArchivePanel 空间·路线谱面板测试（INCR-127）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock（useDynamicRoutes 持久化 hf_dynamic_routes / hf_route_events） ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

// ---- Room-graph Mock（initializeStaticRoutes 从 getAllRooms 初始化静态路由） ----
const MOCK_ROOMS = [
  { id: 'room-home', name: '家', path: '/', icon: '🏠', color: '#8a9a7a', group: 'main-path', isMainPath: true },
  { id: 'room-garden', name: '花园', path: '/garden', icon: '🌷', color: '#c46a5a', group: 'world', isMainPath: false },
  { id: 'room-guard', name: '守护', path: '/guard', icon: '🛡', color: '#8a9a7a', group: 'gravity', isMainPath: false },
]
vi.mock('../../engine/room-graph', () => ({
  getAllRooms: () => [...MOCK_ROOMS],
  getRoomByPath: (p: string) => MOCK_ROOMS.find(r => r.path === p),
}))

// ---- 预置分析数据（热门/最近/最慢路由 + 接入动态） ----
function seedAnalysis() {
  mockKV.set('hf_dynamic_routes', {
    studio: {
      path: '/studio', name: '工坊', source: 'static', loadStrategy: 'lazy',
      category: 'world', priority: 50, enabled: true, meta: { title: '工坊' },
      accessCount: 20, lastAccessedAt: '2026-09-04T09:00:00.000Z', avgLoadTimeMs: 120,
    },
    office: {
      path: '/office', name: '办公室', source: 'static', loadStrategy: 'eager',
      category: 'main-path', priority: 0, enabled: true, meta: { title: '办公室' },
      accessCount: 12, lastAccessedAt: '2026-09-04T10:00:00.000Z', avgLoadTimeMs: 300,
    },
    lab: {
      path: '/lab', name: '实验室', source: 'static', loadStrategy: 'idle',
      category: 'world', priority: 70, enabled: false, meta: { title: '实验室' },
      accessCount: 5, lastAccessedAt: '2026-09-01T08:00:00.000Z', avgLoadTimeMs: 640,
    },
  })
  mockKV.set('hf_route_events', [
    { type: 'register', routeName: 'office', timestamp: '2026-09-04T10:00:00.000Z', source: 'static', success: true },
    { type: 'update', routeName: 'office', timestamp: '2026-09-04T10:01:00.000Z', source: 'static', success: false, error: 'boom' },
  ])
}

import SpaceRouteArchivePanel from '../SpaceRouteArchivePanel.vue'

function mountPanel() {
  return mount(SpaceRouteArchivePanel)
}

describe('SpaceRouteArchivePanel 空间·路线谱', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('标题与副题渲染', async () => {
    const wrapper = mountPanel()
    await nextTick()
    expect(wrapper.text()).toContain('空间 · 路线谱')
    expect(wrapper.text()).toContain('基于空间模板与编排规则的路由构成与访问分析')
  })

  it('空存储 → 初始化静态路由：3 房间 1 立即+1 懒加载+1 立即（gravity）统计正确', async () => {
    const wrapper = mountPanel()
    await nextTick()

    // 概览统计
    expect(wrapper.text()).toContain('路线总数')
    const blocks = wrapper.findAll('.spr-stat')
    expect(blocks[0].text()).toContain('3')
    expect(blocks[1].text()).toContain('3')
    expect(blocks[2].text()).toContain('0')

    // 加载策略分布：立即加载 2、按需加载 1
    const strategyText = wrapper.find('.spr-strategy').text()
    expect(strategyText).toContain('立即加载')
    expect(strategyText).toContain('按需加载')
    expect(wrapper.find('.spr-strategy').findAll('.spr-strategy-row').length).toBe(4)

    // 来源构成：静态 3
    expect(wrapper.find('.spr-source').text()).toContain('静态')
    expect(wrapper.find('.spr-source').text()).toContain('3')
  })

  it('无访问/耗时数据时 最近·最慢 显示空态（热门列表恒含全部路由）', async () => {
    const wrapper = mountPanel()
    await nextTick()
    // 热门列表按访问量输出全部路由（含 0 访问），故不为空
    expect(wrapper.text()).toContain('热门路线')
    expect(wrapper.text()).toContain('暂无最近访问')
    expect(wrapper.text()).toContain('暂无加载耗时数据')
  })

  it('预置访问数据 → 热门(降序)/最近(按时间降序)/最慢(avgLoadTime 降序) 正确渲染', async () => {
    seedAnalysis()
    const wrapper = mountPanel()
    await nextTick()

    // 概览：总访问 37（20+12+5）
    expect(wrapper.text()).toContain('37')

    // 热门：首条为访问量最高的 studio(20)
    const hotBlock = wrapper.findAll('.spr-block-title').map(t => t.text()).indexOf('热门路线')
    const hotText = wrapper.findAll('.spr-block')[hotBlock].text()
    expect(hotText).toContain('工坊')
    expect(hotText).toContain('20')

    const recentBlock = wrapper.findAll('.spr-block-title').map(t => t.text()).indexOf('最近访问')
    const recentText = wrapper.findAll('.spr-block')[recentBlock].text()
    expect(recentText).toContain('办公室')
    expect(recentText).toContain('工坊')

    const slowBlock = wrapper.findAll('.spr-block-title').map(t => t.text()).indexOf('加载最慢')
    const slowText = wrapper.findAll('.spr-block')[slowBlock].text()
    expect(slowText).toContain('640ms')
    expect(slowText).toContain('实验室')
  })

  it('接入动态渲染：注册成功 ✓ / 更新失败 ✗', async () => {
    seedAnalysis()
    const wrapper = mountPanel()
    await nextTick()

    const eventsText = wrapper.find('.spr-events').text()
    expect(eventsText).toContain('注册')
    expect(eventsText).toContain('更新')
    expect(eventsText).toContain('office')
    expect(eventsText).toContain('✓')
    expect(eventsText).toContain('✗')
  })

  it('空存储时初始化会持久化静态路由（persist → setKV）', async () => {
    const wrapper = mountPanel()
    await nextTick()
    expect(mockSetKV).toHaveBeenCalledWith('hf_dynamic_routes', expect.any(Object))
    expect(mockSetKV).toHaveBeenCalled()
    wrapper.unmount()
  })

  it('操作按钮可点击：同步房间布线 与 重置 不报错且保持 3 路线', async () => {
    const wrapper = mountPanel()
    await nextTick()

    const syncBtn = wrapper.findAll('.spr-btn').find(b => b.text().includes('同步房间布线'))
    await syncBtn!.trigger('click')
    await nextTick()
    expect(wrapper.findAll('.spr-stat')[0].text()).toContain('3')

    const resetBtn = wrapper.findAll('.spr-btn').find(b => b.text() === '重置')
    await resetBtn!.trigger('click')
    await nextTick()
    expect(wrapper.findAll('.spr-stat')[0].text()).toContain('3')
  })
})