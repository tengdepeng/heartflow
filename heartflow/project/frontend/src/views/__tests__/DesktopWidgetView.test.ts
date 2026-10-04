// ============================================================
// 系统桌面小窗（DesktopWidgetView）集成测试
// 覆盖：空态引导 / 标题栏展开添加面板（七类）/ 添加即入窗并同步快照 /
//       手动刷新 / 隐藏与移除回空态
// 依赖：真实 touchpoints·useWidgetManager（storage mock 持久化），
//       mock 快照同步出口 + WidgetCard（避免牵入卡片内部数据源）。
//       模块级引擎单例 → 每例 vi.resetModules + 动态导入隔离。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { store, mockGetKV, mockSetKV, pushSnapshot } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  const pushSnapshot = vi.fn()
  return { store, mockGetKV, mockSetKV, pushSnapshot }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

// 快照同步出口：只关心「有没有在用户操作后立刻推一次（不节流）」
vi.mock('@/modules/desktop-widget/sync', () => ({
  pushWidgetSnapshotNow: (...a: any[]) => (pushSnapshot as any)(...a),
  refreshAndroidWidgets: vi.fn(async () => {}),
  readWidgetNote: () => '',
  WIDGET_NOTE_KEY: 'hf:touchpoints:newnote',
}))

// 卡片本体由 WidgetCard 单一实现承载，小窗测试只关心外壳编排
vi.mock('@/components/WidgetCard.vue', () => ({
  default: {
    name: 'WidgetCard',
    props: { instance: { type: Object, required: true }, compact: { type: Boolean, default: false } },
    template: '<div class="widget-card-stub" />',
  },
}))

async function prepare() {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  const mod = await import('../DesktopWidgetView.vue')
  return mount(mod.default)
}

describe('DesktopWidgetView · 系统桌面小窗', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空窗态给出「点 ＋ 添加」引导', async () => {
    const w = await prepare()
    expect(w.find('.dw-empty').text()).toContain('＋')
    expect(w.find('.dw-card').exists()).toBe(false)
    // 自动同步已提升为全局启动（App.vue onMounted），小窗自身不再挂载，
    // 此处仅校验空态引导与外壳编排。
  })

  it('点 ＋ 展开十五类添加面板（与首页画布同源）', async () => {
    const w = await prepare()
    expect(w.find('.dw-add').exists()).toBe(false)
    await w.findAll('.dw-act')[0].trigger('click')
    expect(w.find('.dw-add').exists()).toBe(true)
    expect(w.findAll('.dw-chip').length).toBe(15)
  })

  it('在面板里添加一类即入窗，并立即推一次快照（不节流）', async () => {
    const w = await prepare()
    await w.findAll('.dw-act')[0].trigger('click')
    await w.findAll('.dw-chip')[0].trigger('click') // pomodoro

    expect(w.find('.dw-card').exists()).toBe(true)
    expect(w.find('.dw-empty').exists()).toBe(false)
    // 添加是用户操作：立即推送，参数 falsy（不走 5s 节流）
    expect(pushSnapshot).toHaveBeenCalledWith()
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('点 ↻ 手动刷新：重建快照并留下时间戳', async () => {
    const w = await prepare()
    pushSnapshot.mockClear()
    await w.findAll('.dw-act')[1].trigger('click')

    expect(pushSnapshot).toHaveBeenCalledWith()
    expect(w.find('.dw-stamp').exists()).toBe(true)
    expect(w.find('.dw-stamp').text()).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })

  it('隐藏 / 移除都会把卡片收回空态并同步一次', async () => {
    const w = await prepare()
    await w.findAll('.dw-act')[0].trigger('click')
    await w.findAll('.dw-chip')[0].trigger('click')
    expect(w.find('.dw-card').exists()).toBe(true)

    // 隐藏（主窗可恢复）
    pushSnapshot.mockClear()
    await w.find('.dw-card-btn').trigger('click')
    expect(w.find('.dw-card').exists()).toBe(false)
    expect(pushSnapshot).toHaveBeenCalledWith()

    // 再加一个后移除
    await w.findAll('.dw-act')[0].trigger('click')
    await w.findAll('.dw-chip')[6].trigger('click') // quadrant
    expect(w.find('.dw-card').exists()).toBe(true)
    await w.find('.dw-card-btn-danger').trigger('click')
    expect(w.find('.dw-card').exists()).toBe(false)
    expect(w.find('.dw-empty').exists()).toBe(true)
  })
})
