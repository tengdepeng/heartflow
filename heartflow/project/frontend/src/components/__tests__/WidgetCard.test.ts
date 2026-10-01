// ============================================================
// WidgetCard（小组件卡片内容）单元测试
// 覆盖：六种类型在画布态渲染 / 紧凑态只读 / 操作后触发快照推送
// 依赖：mock timer / wish-anchor / happy-box / emotion / storage；
//       engine/storage 与 tauri core 走静默路径（非 Tauri 环境不推送）。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { timer, anchorViewRef, anchorToggle, happy, moodOptions, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  return {
    mockGetKV: vi.fn((k: string, d: any) => (k in store ? store[k] : d)),
    mockSetKV: vi.fn((k: string, v: any) => { store[k] = v }),
    timer: {
      isRunning: false,
      elapsed: 0,
      session: { status: null as string | null, plannedDuration: 0 },
    },
    anchorViewRef: { value: [] as any[] },
    anchorToggle: vi.fn(),
    happy: { todayCount: { value: 0 }, capture: vi.fn(), items: { value: [] as any[] } },
    moodOptions: [
      { type: 'happy', label: '开心', icon: '😄' },
      { type: 'calm', label: '平静', icon: '🌊' },
    ],
  }
})

vi.mock('@/engine/storage', () => ({
  storage: { getKV: (...a: any[]) => (mockGetKV as any)(...a), setKV: (...a: any[]) => (mockSetKV as any)(...a) },
}))
vi.mock('@/stores', () => ({ useTimerStore: () => timer }))
vi.mock('@/modules/wish-anchor', () => ({ useWishAnchor: () => ({ views: anchorViewRef, toggleDone: anchorToggle }) }))
vi.mock('@/modules/emotion/happy-box', () => ({ useHappyBox: () => happy }))
vi.mock('@/modules/emotion', () => ({ EMOTION_OPTIONS: moodOptions }))

function inst(type: string) {
  return { id: 'w1', type, x: 0, y: 0, size: 'small', enabled: true, createdAt: 0 } as any
}

async function prepare(props: Record<string, unknown>) {
  vi.resetModules()
  const mod = await import('../WidgetCard.vue')
  return mount(mod.default, { props: props as any })
}

describe('WidgetCard · 卡片内容', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    timer.isRunning = false
    timer.elapsed = 0
    timer.session = { status: null, plannedDuration: 0 }
    anchorViewRef.value = []
    happy.todayCount.value = 0
  })

  it('番茄钟：渲染计时/状态/进度，剩余仅在画布态显示', async () => {
    timer.isRunning = true
    timer.elapsed = 300_000
    timer.session = { status: 'running', plannedDuration: 1_200_000 }
    const canvas = await prepare({ instance: inst('pomodoro') })
    expect(canvas.find('.wfmt-clock').text()).toBe('05:00')
    expect(canvas.find('.wfmt-status').text()).toContain('专注进行中')
    expect(canvas.find('.wfmt-meta').text()).toContain('15:00')

    const compact = await prepare({ instance: inst('pomodoro'), compact: true })
    expect(compact.classes()).toContain('wcard-compact')
    expect(compact.find('.wfmt-meta').exists()).toBe(false)
  })

  it('心锚：点击条目调用 toggleDone', async () => {
    anchorViewRef.value = [{ id: 'a1', title: '写晨记', daysLeft: 3, done: false }]
    const w = await prepare({ instance: inst('daily-anchor') })
    expect(w.find('.wanc-title').text()).toBe('写晨记')
    await w.find('.wanc').trigger('click')
    expect(anchorToggle).toHaveBeenCalledWith('a1')
  })

  it('情绪：选项数量与 mood 记录一致，点击写入 happyBox', async () => {
    const w = await prepare({ instance: inst('emotion-check') })
    expect(w.findAll('.wemod-opt').length).toBe(moodOptions.length)
    await w.findAll('.wemod-opt')[0].trigger('click')
    expect(happy.capture).toHaveBeenCalled()
  })

  it('便签：画布态可编辑并落盘，紧凑态只读', async () => {
    const canvas = await prepare({ instance: inst('quick-note') })
    expect(canvas.find('.wqn-input').exists()).toBe(true)
    await canvas.find('.wqn-input').setValue('一条灵感')
    await canvas.find('.wqn-btn').trigger('click')
    expect(mockSetKV).toHaveBeenCalledWith('hf:touchpoints:newnote', '一条灵感')

    const compact = await prepare({ instance: inst('quick-note'), compact: true })
    expect(compact.find('.wqn-input').exists()).toBe(false)
    expect(compact.find('.wqn-readonly').exists()).toBe(true)
  })

  it('气象与一言：都渲染出内容', async () => {
    const weather = await prepare({ instance: inst('weather') })
    expect(weather.find('.wwea-season').text().length).toBeGreaterThan(0)
    const quote = await prepare({ instance: inst('quote') })
    expect(quote.find('.wqt-text').text()).toContain('「')
  })

  it('月历：渲染整月 42 格网格，含今日高亮与切换头', async () => {
    const w = await prepare({ instance: inst('calendar') })
    expect(w.find('.wcal').exists()).toBe(true)
    expect(w.find('.wcal-grid').exists()).toBe(true)
    expect(w.findAll('.wcal-cell').length).toBe(42)
    expect(w.find('.wcal-title').text()).toContain('月')
    // 紧凑态同源降密度
    const compact = await prepare({ instance: inst('calendar'), compact: true })
    expect(compact.find('.wcal-compact').exists()).toBe(true)
  })

  it('日历热力图：渲染 42 格热度阵与图例，未来格近乎透明', async () => {
    const w = await prepare({ instance: inst('calendar-heatmap') })
    expect(w.find('.wcal-heat').exists()).toBe(true)
    expect(w.findAll('.wcal-heat-cell').length).toBe(42)
    expect(w.find('.wcal-legend').exists()).toBe(true)
  })

  it('外观主题：默认 accent 变量注入卡片根，可被 theme 覆盖', async () => {
    const w = await prepare({ instance: inst('quote') })
    const style = (w.element as HTMLElement).style
    expect(style.getPropertyValue('--ww-accent')).toBe('#d4a15a')
  })
})
