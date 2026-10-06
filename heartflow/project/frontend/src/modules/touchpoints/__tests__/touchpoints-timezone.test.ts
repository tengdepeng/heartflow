// ============================================================
// 殿堂触角 · 时区判别力测试（TZ 日键治理 INCR-466 · 第二批）
//
// 覆盖 touchpoints 域 + happy-box 跨域契约簇的「今日桶」本地日历日口径。
// 关键：所有样本用**本地 00:30**（UTC 落在前一天）与**本地 23:00**（UTC 当天），
// 二者本地同属一天、UTC 横跨两天，这才咬得住「UTC 切日早一天」的缺陷。
// 假时刻钉在 2026-03-15 10:00 本地（月中，避开跨月/跨年算术）。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'

// ---- 模拟 storage：忠实还原真实 storage 对象契约（index.ts 的 storage 只有
//      getKV/setKV 等，**不含 getSessions**——getSessions 是 session.ts 的具名导出，
//      不挂在 storage 上。故 activityMarks 的专注会话分支在生产中即走不通（try/catch 静默），
//      本测试只验证快乐速记分支这处真半迁点，不编造不存在的 storage 方法）。
//      ⚠️ 路径是 ../../../（不是 ../../）：本文件在 __tests__/ 子目录，比被测模块多一层。
const mockStore: Record<string, any> = {}
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => (key in mockStore ? mockStore[key] : def),
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

import { getLocalDateKey } from '../../../utils/time'
import { useTouchAnalytics } from '../touch-analytics'
import { activityMarks } from '../widget-calendar'
import { useHappyBox } from '../../emotion/happy-box'
import type { PushRecord } from '../push-channel'

// ---- 固定「现在」= 本地 2026-03-15 10:00 ----
const NOW = new Date(2026, 2, 15, 10, 0, 0) // 本地 03-15 10:00
const TODAY_KEY = '2026-03-15'

/** 本地 03-15 00:30 —— UTC 是 03-14T16:30Z，UTC 切日会误判成 03-14（早一天） */
const LOCAL_EARLY = new Date(2026, 2, 15, 0, 30, 0).toISOString() // → 2026-03-14T16:30:00.000Z
/** 本地 03-15 23:00 —— UTC 当天，两种口径同值（放行对照） */
const LOCAL_LATE = new Date(2026, 2, 15, 23, 0, 0).toISOString()   // → 2026-03-15T15:00:00.000Z

function makeRecord(overrides: Partial<PushRecord> = {}): PushRecord {
  return {
    id: 'rec_' + Math.random().toString(36).slice(2, 8),
    channel: 'browser',
    title: 'T',
    message: 'M',
    success: true,
    error: undefined,
    openedAt: null,
    clickedAt: null,
    dismissedAt: null,
    pushedAt: LOCAL_EARLY,
    responseTimeMs: 3000,
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

describe('touchpoints 时区判别力（本地日历日口径）', () => {
  // ---- 前提护栏：本机确为 UTC+8，否则所有口径断言退化为同值比较而假绿 ----
  it('前提：本机时区为 UTC+8，且本地 00:30 的 UTC 日期早一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480) // UTC+8
    // 样本前提：LOCAL_EARLY 的 UTC 日期确实比本地日早一天
    expect(LOCAL_EARLY.slice(0, 10)).toBe('2026-03-14') // UTC 口径 = 昨天
    expect(getLocalDateKey(new Date(LOCAL_EARLY))).toBe(TODAY_KEY) // 本地口径 = 今天
  })

  // ---- 形态 A/D：aggregateByDay 的「今日桶」应按本地日归集 ----
  it('aggregateByDay：本地 00:30 的推送应归入今天（UTC 口径会漏计）', () => {
    const analytics = useTouchAnalytics()
    // 只放一条「本地 00:30」记录：本地与 UTC 横跨两天
    const result = analytics.aggregateByDay([makeRecord({ pushedAt: LOCAL_EARLY })], 1)
    // days=1 → 数组长度 1，代表「今天」这一列；该记录属今天 ⇒ deliveries[0] === 1
    expect(result.deliveries).toEqual([1])
  })

  it('aggregateByDay：本地 00:30 与 23:00 同属今天，应聚合为 2', () => {
    const analytics = useTouchAnalytics()
    const result = analytics.aggregateByDay(
      [makeRecord({ pushedAt: LOCAL_EARLY }), makeRecord({ pushedAt: LOCAL_LATE })],
      1,
    )
    expect(result.deliveries).toEqual([2])
  })

  // ---- 跨域契约簇：happy-box 今日计数（widget-calendar 读同一份 HAPPY_BOX_KEY） ----
  it('happy-box 今日计数：本地 00:30 的速记应算今天（UTC 口径会算昨天）', () => {
    const hb = useHappyBox()
    // 直接注入「本地 00:30」的速记（capture() 造的是 UTC 当天，两口径同值测不出差异）
    hb.items.value = [{
      id: 'h1', text: 'x', tags: [], createdAt: LOCAL_EARLY, recalledCount: 0,
    }]
    expect(hb.todayCount.value).toBe(1)
  })

  // ---- 半迁点：widget-calendar 快乐速记分支应与同文件本地日键口径一致 ----
  it('activityMarks：快乐速记本地 00:30 应记到今天（半迁点修复）', () => {
    // 只注入快乐速记（storage 契约下专注会话分支读不到，见上方 mock 注释）
    mockStore['hf:happy_box'] = [{ id: 'h1', text: 'x', tags: [], createdAt: LOCAL_EARLY, recalledCount: 0 }]
    const marks = activityMarks()
    // 本地 00:30 的速记属今天 ⇒ 记到本地日键 2026-03-15（UTC 口径会记到 03-14）
    expect(marks[TODAY_KEY]).toBe(1)
    // UTC 键（昨天）不应有值
    expect(marks['2026-03-14']).toBeUndefined()
  })
})
