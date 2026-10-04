// ============================================================
// Timeline 视图 · 日期口径回归测试
// ------------------------------------------------------------
// 背景（缺陷）：本视图曾用 `toISOString().slice(0,10)`（UTC 日历日）
// 作为分组键与「今天/昨天」判据。在 UTC+8 这类东八区，本地 00:00–08:00
// 的记录会被 UTC 归到前一天，导致「今天」标签错位一天、分组跨日错位。
//
// 官方业务日期口径见 utils/time.ts 的 getLocalDateKey，其注释明确：
// 「业务日期不能使用 UTC ISO 日期，以避免本地午夜附近跨日」。
//
// 本文件用 process.env.TZ 构造东八区场景，把该口径钉死为回归判据。
// ============================================================
import { ref } from 'vue'
import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 时区：必须在任何 Date 被求值前设定 ----
const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 vue-router ----
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ---- 模拟 storage ----
const mockStorageVersion = ref(1)
vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => [],
    getKV: () => '[]',
    setKV: vi.fn(),
  },
  storageVersion: mockStorageVersion,
}))

// ---- 模拟 useDataPort ----
vi.mock('../../composables/useDataPort', () => ({
  useDataPort: () => ({
    downloadMarkdown: vi.fn(),
    downloadJSON: vi.fn(),
    importJSON: () => ({ sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0 }),
  }),
}))

// ---- 模拟 river 模块：暴露可变 items 供用例注入 ----
const riverItemsMock = vi.hoisted(() => ({ current: [] as any[] }))
vi.mock('../../modules/timeline/river', () => ({
  createReplayTimer: () => ({ start: vi.fn(), stop: vi.fn() }),
  createRiverItems: () => riverItemsMock.current,
  getRiverItemKey: (item: any) => item?.id || '',
  getRiverSource: () => ({
    sessions: [], crystals: [], notes: [], emotions: [], anchors: [],
    bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
  }),
}))

// ---- 模拟子组件（子标签懒挂载，默认停在「时间之河」） ----
vi.mock('../../components/CalendarView.vue', () => ({
  default: { name: 'CalendarView', template: '<div />' },
}))
vi.mock('../../components/StatsPanel.vue', () => ({
  default: { name: 'StatsPanel', template: '<div />' },
}))
vi.mock('../../components/TimeLensPanel.vue', () => ({
  default: { name: 'TimeLensPanel', template: '<div />' },
}))
vi.mock('../../components/RecordList.vue', () => ({
  default: { name: 'RecordList', template: '<div />' },
}))
vi.mock('../../components/TimelineFragment.vue', () => ({
  default: { name: 'TimelineFragment', template: '<div class="fragment-stub" />' },
}))
vi.mock('../../components/TimeCorridor.vue', () => ({
  default: { name: 'TimeCorridor', template: '<div />' },
}))
vi.mock('../../components/TimelineRadarPanel.vue', () => ({
  default: { name: 'TimelineRadarPanel', template: '<div />' },
}))
vi.mock('../../components/TimelineExportPanel.vue', () => ({
  default: { name: 'TimelineExportPanel', template: '<div />' },
}))
vi.mock('../../components/TimelineSearchPanel.vue', () => ({
  default: { name: 'TimelineSearchPanel', template: '<div />' },
}))

async function getWrapper() {
  const { default: Timeline } = await import('../Timeline.vue')
  return mount(Timeline, { global: { stubs: { Teleport: true, Transition: true } } })
}

/** 造一条带 id/ts 的河流条目（分组只依赖 ts 与 key） */
function item(id: string, d: Date) {
  return { id, ts: d.getTime(), type: 'crystal' }
}

/** 读取当前时区下的本地日期键（与被测实现同口径，用于构造期望值） */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('Timeline 日期口径（回归：禁止 UTC 切日）', () => {
  // 把「现在」钉死为 2026-03-15 10:00 本地时间。
  // 之所以选 15 号而非 1 号：断言要同时覆盖「今天/昨天」与月/日标签，
  // 固定在月中可让两条 UTC 切日样本（00:30 与 23:00）在任何时候都稳定横跨 UTC 日界。
  const NOW = new Date(2026, 2, 15, 10, 0, 0)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    riverItemsMock.current = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ
  })

  /** 相对「今天」构造本地时刻（自动处理跨月/跨年） */
  function localAt(dayOffset: number, hour: number, minute = 0): Date {
    const d = new Date(NOW)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, hour, minute, 0)
  }

  it('时区前提：本机确为东八区，UTC 切日确实会跨日', () => {
    // 若此前提不成立，本文件的所有口径断言都会退化成「UTC==本地」的同值比较而失去意义
    const probe = localAt(0, 3)
    expect(localKey(probe)).toBe('2026-03-15')
    expect(probe.toISOString().slice(0, 10)).toBe('2026-03-14')
  })

  it('本地凌晨的记录被归入「今天」而非「昨天」', async () => {
    riverItemsMock.current = [item('early', localAt(0, 0, 30)), item('noon', localAt(0, 12))]

    const wrapper = await getWrapper()
    const labels = wrapper.findAll('.date-label').map(n => n.text())

    expect(labels).toHaveLength(1)
    expect(labels[0]).toContain('今天')
  })

  it('本地昨夜的记录被归入「昨天」', async () => {
    riverItemsMock.current = [item('yEarly', localAt(-1, 0, 30))]

    const wrapper = await getWrapper()
    const labels = wrapper.findAll('.date-label').map(n => n.text())

    expect(labels).toHaveLength(1)
    expect(labels[0]).toContain('昨天')
  })

  it('「累计天数」按本地日分组：跨 UTC 日界的 00:30 与 23:00 合为一天', async () => {
    // 本地 00:30 → UTC 前一天 16:30；本地 23:00 → UTC 当天 15:00
    // 本地同属「今天」这一日，UTC 却横跨两天 → 旧实现（toISOString 切日）会分成 2 组
    riverItemsMock.current = [item('a', localAt(0, 0, 30)), item('b', localAt(0, 23))]

    const wrapper = await getWrapper()
    // 「累计天数」= 分组数；同时确认只渲染出一个日期分隔条
    const dayCountText = wrapper.findAll('.stat-card')[2]!.find('.stat-value').text()
    expect(dayCountText).toBe('1')
    expect(wrapper.findAll('.date-separator')).toHaveLength(1)
  })

  it('「今日记录」按本地日边界计数，覆盖本地 00:00–08:00 的记录', async () => {
    riverItemsMock.current = [
      item('t1', localAt(0, 0, 5)),    // UTC 下属于前一天
      item('t2', localAt(0, 7, 59)),   // UTC 下仍属于前一天
      item('t3', localAt(0, 20)),
      item('y1', localAt(-1, 23, 30)),
    ]

    const wrapper = await getWrapper()
    const todayText = wrapper.findAll('.stat-card')[1]!.find('.stat-value').text()

    expect(todayText).toBe('3')
  })

  it('月/日标签取本地分量（历史日期不误标为「今天/昨天」）', async () => {
    riverItemsMock.current = [item('old', localAt(-5, 2))]

    const wrapper = await getWrapper()
    const labels = wrapper.findAll('.date-label').map(n => n.text())

    expect(labels[0]).toContain('3月10日')
  })
})

describe('getItemsOnDate 本地日边界（Timeline 已接线消费）', () => {
  it('覆盖本地零点至次日本地零点前，且排除相邻日', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    const { getItemsOnDate } = await import('../../modules/timeline/timeline-filters')
    const today = new Date()
    const y = today.getFullYear(); const m = today.getMonth(); const d = today.getDate()

    const items = [
      { id: 'before', ts: new Date(y, m, d, 0, 0, 0).getTime() - 1 },
      { id: 'first', ts: new Date(y, m, d, 0, 0, 0).getTime() },
      { id: 'last', ts: new Date(y, m, d, 23, 59, 59, 999).getTime() },
      { id: 'after', ts: new Date(y, m, d + 1, 0, 0, 0).getTime() },
    ]

    const ids = getItemsOnDate(items as any, new Date()).map(i => (i as any).id)
    expect(ids).toEqual(['first', 'last'])
    vi.useRealTimers()
  })
})
