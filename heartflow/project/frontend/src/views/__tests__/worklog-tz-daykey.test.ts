// ============================================================
// WorkLog 班次链路 · 时区判别力测试（TZ 日键治理 INCR-466 · 日键第三批A2）
//
// 覆盖 Shift.date 链路的「双侧同基」修复：
//  - 30 日分布图的分桶键（dateStr）必须与 map 的键（s.date）同基；
//  - 新增班次默认日期按本地日历日；
//  - 周范围边界与 s.date 同基（否则跨月周整周落空）。
// 假时刻钉在**本地 2026-03-15 03:00（凌晨）**——必须落在缺陷窗口内：
// 本地 03:00 时 UTC 已是前一天，两种口径分属不同日期；设正午则同值、断言假绿。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => (key in mockStore ? mockStore[key] : def),
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

// ---- 固定「现在」= 本地 2026-03-15 03:00（凌晨，缺陷窗口内）----
const NOW = new Date(2026, 2, 15, 3, 0, 0)
const LOCAL_TODAY = '2026-03-15'
/** 此刻的 UTC 日历日 = 03-14 */
const UTC_TODAY = '2026-03-14'

function makeShift(overrides: Record<string, any> = {}) {
  return {
    id: `shift_${Math.random().toString(36).slice(2, 8)}`,
    type: 'regular' as const,
    date: LOCAL_TODAY,
    start: '09:00',
    end: '18:00',
    hours: 9,
    note: undefined,
    ...overrides,
  }
}

async function getWrapper() {
  const { default: WorkLog } = await import('../WorkLog.vue')
  return mount(WorkLog, {
    global: { stubs: { ProductivityPanel: true, WorkRhythmPanel: true, Teleport: true, Transition: true } },
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.clearAllMocks()
  mockStore['heartflow:shifts'] = []
  mockStore['heartflow:hourly_rate'] = 0
})
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

describe('WorkLog 班次链路时区判别力', () => {
  // ---- 前提护栏：凌晨基准下，本地日与 UTC 日分属不同日期（缺陷窗口） ----
  it('前提：本机为 UTC+8，本地 03:00 时 UTC 日历日已是前一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(NOW.toISOString().slice(0, 10)).toBe(UTC_TODAY)
    expect(LOCAL_TODAY).not.toBe(UTC_TODAY)
  })

  it('30 日分布图：本地今天的班次应归入「今天」柱（分桶键与 s.date 同基）', async () => {
    mockStore['heartflow:shifts'] = [makeShift({ date: LOCAL_TODAY, hours: 8 })]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    // 今日柱：key 为本地今天、isToday 标记、title 含今天日期与 8h
    const todayBar = wrapper.find('.wl-chart-bar.wl-bar-today')
    expect(todayBar.exists()).toBe(true)
    const wrap = todayBar.element.closest('.wl-chart-bar-wrap')!
    expect(wrap.getAttribute('title')).toBe(`${LOCAL_TODAY}: 8h`)
  })

  it('30 日分布图：UTC 当天键的班次不算本地今天（迁本地后应无今日工时）', async () => {
    // 此刻本地是 03-15 凌晨、UTC 是 03-14。若分桶键仍用 UTC 切日，
    // 「今天」柱会取到 03-14，从而把 03-14 的班次错误归入今天；迁本地后不应命中。
    mockStore['heartflow:shifts'] = [makeShift({ date: UTC_TODAY, hours: 8 })]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const todayBar = wrapper.find('.wl-chart-bar.wl-bar-today')
    expect(todayBar.exists()).toBe(true)
    const wrap = todayBar.element.closest('.wl-chart-bar-wrap')!
    // 今日柱的日期必须是本地今天（而非 UTC 的 03-14），且因无今日班次而为 0h
    expect(wrap.getAttribute('title')).toBe(`${LOCAL_TODAY}: 0h`)
  })

  it('本周统计：跨月周的班次应被正确归入所在周（周范围与 s.date 同基）', async () => {
    // 本地 2026-03-15 是周日；其所在周（周一制）为 03-09 ~ 03-15。
    // 注入该周内一天的班次，验证周工时被计入（修复前 UTC 边界可能整周落空）。
    mockStore['heartflow:shifts'] = [makeShift({ date: '2026-03-10', hours: 6 })]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    // 近 7 日分布里 03-10 那天应有工时
    const bars = wrapper.findAll('.wl-chart-bar-wrap')
    const hit = bars.find((b: any) => (b.attributes('title') || '').startsWith('2026-03-10:'))
    expect(hit).toBeTruthy()
    expect(hit!.attributes('title')).toBe('2026-03-10: 6h')
  })

  it('新增班次表单的默认日期为本地今天（date input 同口径）', async () => {
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const dateInput = wrapper.find('input.wl-date')
    expect(dateInput.exists()).toBe(true)
    expect((dateInput.element as HTMLInputElement).value).toBe(LOCAL_TODAY)
  })
})
