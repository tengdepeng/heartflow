// ============================================================
// 桌面小组件（WidgetBox）集成测试
// 覆盖：渲染与空态 / 添加小组件立即入画布 / 番茄钟计时渲染 /
//       移除清空 / 重置默认布局
// 依赖：真实 touchpoints·useWidgetManager(存储持久化)，mock
//       timer / wish-anchor / happy-box / emotion 四个外部源。
//       引擎为模块级单例，每例 vi.resetModules + 动态导入隔离。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { WIDGET_META } from '../../modules/touchpoints'

const { store, mockGetKV, mockSetKV, timer, anchorViewRef, anchorToggle, happy, moodOptions } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mkGet = (k: string) => () => (k in store ? store[k] : undefined)
  void mkGet
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })

  const timer = {
    isRunning: false,
    elapsed: 0,
    todayCompletedCount: 0,
    session: { status: null as string | null, plannedDuration: 0 },
  }
  const anchorViewRef = { value: [] as any[] }
  const anchorToggle = vi.fn()
  const happy = { todayCount: { value: 0 }, capture: vi.fn() }
  const moodOptions = [
    { type: 'happy', label: '开心', icon: '😄' },
    { type: 'calm', label: '平静', icon: '🌊' },
  ]
  return { store, mockGetKV, mockSetKV, timer, anchorViewRef, anchorToggle, happy, moodOptions }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

vi.mock('@/stores', () => ({
  useTimerStore: () => timer,
}))

vi.mock('@/modules/wish-anchor', () => ({
  useWishAnchor: () => ({
    views: anchorViewRef,
    toggleDone: anchorToggle,
  }),
}))

vi.mock('@/modules/emotion/happy-box', () => ({
  useHappyBox: () => happy,
}))

vi.mock('@/modules/emotion', () => ({
  EMOTION_OPTIONS: moodOptions,
}))

async function prepare() {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  const mod = await import('../WidgetBox.vue')
  return mount(mod.default)
}

describe('WidgetBox · 桌面小组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timer.isRunning = false
    timer.elapsed = 0
    timer.todayCompletedCount = 0
    timer.session = { status: null, plannedDuration: 0 }
    anchorViewRef.value = []
  })

  it('空桌面渲染标题与十五类添加项，并呈现空画布提示', async () => {
    const w = await prepare()
    expect(w.find('.wb-title').text()).toContain('桌面小组件')
    expect(w.findAll('.wb-add-chip').length).toBe(15)
    expect(w.find('.wb-empty').exists()).toBe(true)
    expect(w.find('.wb-empty').text()).toContain('还没有小组件')
    expect(w.find('.wb-item').exists()).toBe(false)
  })

  it('点击添加番茄钟小组件随即进入画布', async () => {
    const w = await prepare()
    await w.findAll('.wb-add-chip')[0].trigger('click') // pomodoro
    expect(w.find('.wb-item').exists()).toBe(true)
    expect(w.find('.wb-item-title').text()).toBe(WIDGET_META.pomodoro.label)
    // 空态消失
    expect(w.find('.wb-empty').exists()).toBe(false)
    // 持久化被写入
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('番茄钟小组件渲染计时值', async () => {
    timer.isRunning = true
    timer.elapsed = 300_000 // 05:00
    timer.session = { status: 'running', plannedDuration: 20 * 60_000 } // 20min
    const w = await prepare()
    await w.findAll('.wb-add-chip')[0].trigger('click')

    expect(w.find('.wfmt-clock').text()).toBe('05:00')
    expect(w.find('.wfmt-status').text()).toContain('专注进行中')
    expect(w.find('.wfmt-meta').text()).toContain('15:00') // 剩余
  })

  it('通过移除按钮清空小组件回到空态', async () => {
    const w = await prepare()
    await w.findAll('.wb-add-chip')[0].trigger('click')
    expect(w.find('.wb-item').exists()).toBe(true)

    await w.find('.wb-icon-danger').trigger('click')
    expect(w.find('.wb-item').exists()).toBe(false)
    expect(w.find('.wb-empty').exists()).toBe(true)
  })

  it('重置布局恢复默认四件套', async () => {
    const w = await prepare()
    await w.find('.wb-btn').trigger('click') // 重置
    // 默认布局：pomodoro / daily-anchor / emotion-check / quote
    expect(w.findAll('.wb-item').length).toBe(4)
  })
})