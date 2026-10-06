// ============================================================
// worklog LogEntry 链 · 时区判别力测试（TZ 日键治理 INCR-466 · 日键第四批）
//
// 覆盖 entries.formatDateStr（模块唯一日键出口）及其消费端：
//  - getTodayEntries 今日桶 / generateDailySummary 日报 date / bridge 的 todayEntries
//  - worklog-analytics 的 weeklyEntries / dailyTrend
// 假时刻钉在**本地 2026-03-15 03:00（凌晨）**——必须落在缺陷窗口内：
// 本地 03:00 时 UTC 已是前一天，两种口径分属不同日期；若设正午则同值、断言退化为假绿。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'

const mockStore: Record<string, any> = {}
// ⚠️ 两个路径都要 mock：entries.ts 用 `@/engine/storage` 别名，
//    而 worklog-analytics / worklog-export / bridge 等用相对路径 '../../engine/storage'。
//    只 mock 其一 ⇒ 另一个拿到真实 storage，注入数据读不到（表现为「用例莫名全红」）。
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => (key in mockStore ? mockStore[key] : def),
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))
vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => (key in mockStore ? mockStore[key] : def),
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

import { getLocalDateKey } from '../../../utils/time'

// ---- 固定「现在」= 本地 2026-03-15 03:00（凌晨，缺陷窗口内）----
const NOW = new Date(2026, 2, 15, 3, 0, 0)
const LOCAL_TODAY = '2026-03-15'
/** 此刻的 UTC 日历日 = 03-14 */
const UTC_TODAY = '2026-03-14'
/** 本地 03-15 00:30 的日志（UTC 日期 = 03-14，正是缺陷窗口） */
const LOCAL_EARLY_ISO = new Date(2026, 2, 15, 0, 30, 0).toISOString()

function entry(overrides: Record<string, any> = {}) {
  return {
    id: 'log_1',
    type: 'work' as const,
    title: '凌晨写代码',
    content: '写代码',
    mood: undefined,
    tags: [] as string[],
    sessionIds: [] as string[],
    createdAt: LOCAL_EARLY_ISO,
    updatedAt: LOCAL_EARLY_ISO,
    ...overrides,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  for (const k of Object.keys(mockStore)) delete mockStore[k]
})
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

describe('worklog LogEntry 链时区判别力', () => {
  it('前提：本机为 UTC+8，本地 03:00 时 UTC 日历日已是前一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    expect(NOW.toISOString().slice(0, 10)).toBe(UTC_TODAY)
    expect(LOCAL_TODAY).not.toBe(UTC_TODAY)
    // 凌晨日志样本：UTC 日期昨天、本地日期今天
    expect(LOCAL_EARLY_ISO.slice(0, 10)).toBe(UTC_TODAY)
    expect(getLocalDateKey(new Date(LOCAL_EARLY_ISO))).toBe(LOCAL_TODAY)
  })

  it('getTodayEntries：本地 00:30 的日志应算今天（UTC 口径会算昨天）', async () => {
    mockStore['worklog:entries'] = [entry()]
    const { useWorklog } = await import('../entries')
    const wl = useWorklog()
    await wl.load()
    expect(wl.getTodayEntries()).toHaveLength(1)
  })

  it('generateDailySummary：今日日报的 date 应是本地今天（与 entries 同基）', async () => {
    mockStore['worklog:entries'] = [entry()]
    const { useWorklog } = await import('../entries')
    const wl = useWorklog()
    await wl.load()
    const summary = wl.generateDailySummary(new Date())
    expect(summary.date).toBe(LOCAL_TODAY)
    // 日报的当日条目数不应为 0（UTC 口径下这条凌晨日志会落到昨天）
    expect(summary.entryCount).toBe(1)
  })

  it('worklog-analytics：dailyTrend 的今日桶应归入本地今天', async () => {
    mockStore['worklog:entries'] = [entry()]
    const { useWorklog } = await import('../entries')
    const { useWorklogAnalytics } = await import('../worklog-analytics')
    const wl = useWorklog()
    await wl.load()
    const analytics = useWorklogAnalytics()
    analytics.updateAnalytics(wl.entries.value, wl.getStats())
    const todayPoint = analytics.analytics.value.dailyTrend.find(d => d.date === LOCAL_TODAY)
    expect(todayPoint).toBeTruthy()
    expect(todayPoint!.count).toBe(1)
    // UTC 口径的昨天桶不应出现
    expect(analytics.analytics.value.dailyTrend.find(d => d.date === UTC_TODAY)).toBeUndefined()
  })

  it('worklog-module-bridge：summary.todayEntries 应计入本地 00:30 的日志', async () => {
    mockStore['worklog:entries'] = [entry()]
    const { useWorklogModuleBridge } = await import('../worklog-module-bridge')
    const bridge = useWorklogModuleBridge()
    // bridge 的 load 在 initialize() 里（构造时不同步加载），须先 await 否则 entries 为空
    await bridge.initialize()
    expect(bridge.summary.value.todayEntries).toBe(1)
  })
})
