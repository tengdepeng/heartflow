// ============================================================
// timeline 域引擎层 · 日期口径回归测试
// ------------------------------------------------------------
// 背景（缺陷）：`river.ts` 的 computeDailySummaries 与
// `timeline-filters.ts` 的 toDateStr 曾用 `toISOString().slice(0,10)`
// （UTC 日历日）作分组键。在 UTC+8 下本地 00:00–08:00 的记录会被 UTC
// 归到前一天，使「今天/昨天」标签、最高产日、活跃天数、连续天数整体偏移一天。
//
// 官方口径见 utils/time.ts 的 getLocalDateKey，注释明写：
// 「业务日期不能使用 UTC ISO 日期，以避免本地午夜附近跨日」。
//
// 本文件用 process.env.TZ 构造东八区场景，把该口径钉死为回归判据。
// ============================================================
import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from 'vitest'

// ---- 时区：必须在任何 Date 被求值前设定 ----
const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

// ---- 固定「现在」为 2026-03-15 10:00 本地，消除跨月/跨年浮动 ----
const NOW = new Date(2026, 2, 15, 10, 0, 0)

/** 相对「今天」构造本地时刻（自动处理跨月/跨年） */
function localAt(dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(NOW)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, hour, minute, 0)
}

/** 本地日历日键（与被测实现同口径，用于构造期望值） */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 造一条最小可用的 RiverItem（分组只依赖 ts / type / key） */
function item(id: string, d: Date, type = 'crystal'): any {
  return {
    id,
    ts: d.getTime(),
    type,
    crystal: type === 'crystal' ? { id, createdAt: d.toISOString(), content: '', tags: [] } : undefined,
    tags: [],
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => {
  vi.useRealTimers()
})
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ
})

describe('时区前提', () => {
  it('本机确为东八区：本地 03:00 的 UTC 日期是前一天', () => {
    const probe = localAt(0, 3)
    expect(localKey(probe)).toBe('2026-03-15')
    expect(probe.toISOString().slice(0, 10)).toBe('2026-03-14')
  })
})

describe('computeDailySummaries 分组键（river.ts）', () => {
  it('本地 00:30 与 23:00 合为一天（旧实现会分成两天）', async () => {
    const { computeDailySummaries } = await import('../river')
    const items = [item('a', localAt(0, 0, 30)), item('b', localAt(0, 23))]

    const summaries = computeDailySummaries(items, '2026-03-15', '2026-03-14')

    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.date).toBe('2026-03-15')
    expect(summaries[0]!.label).toBe('今天')
  })

  it('本地昨夜的记录归入「昨天」', async () => {
    const { computeDailySummaries } = await import('../river')
    const items = [item('y', localAt(-1, 0, 30))]

    const summaries = computeDailySummaries(items, '2026-03-15', '2026-03-14')

    expect(summaries[0]!.date).toBe('2026-03-14')
    expect(summaries[0]!.label).toBe('昨天')
  })

  it('跨 UTC 日界的 00:30 与 23:00 不被拆组（旧实现会拆成 2 组）', async () => {
    const { computeDailySummaries } = await import('../river')
    const items = [
      item('a', localAt(0, 0, 30)),
      item('b', localAt(0, 23)),
      item('c', localAt(0, 7, 30)),
    ]

    const summaries = computeDailySummaries(items, '2026-03-15', '2026-03-14')

    expect(summaries).toHaveLength(1)
    expect(summaries[0]!.crystalCount).toBe(3)
  })
})

describe('computeTimelineStats / groupByDate（timeline-filters.ts）', () => {
  it('groupByDate 按本地日分组并给出「今天/昨天」标签', async () => {
    const { groupByDate } = await import('../timeline-filters')
    const items = [
      item('a', localAt(0, 0, 30)),
      item('b', localAt(0, 12)),
      item('c', localAt(-1, 23)),
    ]

    const groups = groupByDate(items, '2026-03-15', '2026-03-14')

    expect(groups).toHaveLength(2)
    expect(groups.map(g => g.date)).toEqual(['2026-03-15', '2026-03-14'])
    expect(groups[0]!.label).toBe('今天')
    expect(groups[1]!.label).toBe('昨天')
  })

  it('连续天数从本地今天起算（UTC 口径下会错判为 0）', async () => {
    const { computeTimelineStats } = await import('../timeline-filters')
    const crystals = [
      { id: 'c1', createdAt: localAt(0, 0, 30).toISOString(), content: 'a', tags: [] },
      { id: 'c2', createdAt: localAt(-1, 10).toISOString(), content: 'b', tags: [] },
      { id: 'c3', createdAt: localAt(-2, 10).toISOString(), content: 'c', tags: [] },
    ]
    const source = {
      sessions: [], crystals, notes: [], emotions: [], anchors: [],
      bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
    }

    const stats = computeTimelineStats(source as any, ['crystal'])

    expect(stats.streakDays).toBe(3)
    // 最高产日也应是本地日
    expect(stats.mostActiveDay.date).toBe('2026-03-15')
  })

  it('连续天数不跨 UTC 日界误判：本地今天+昨天+前天 = 3', async () => {
    const { computeTimelineStats } = await import('../timeline-filters')
    const crystals = [
      { id: 'c1', createdAt: localAt(0, 0, 30).toISOString(), content: 'a', tags: [] },
      { id: 'c2', createdAt: localAt(-1, 0, 30).toISOString(), content: 'b', tags: [] },
      { id: 'c3', createdAt: localAt(-2, 12).toISOString(), content: 'c', tags: [] },
    ]
    const source = {
      sessions: [], crystals, notes: [], emotions: [], anchors: [],
      bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
    }

    const stats = computeTimelineStats(source as any, ['crystal'])

    expect(stats.streakDays).toBe(3)
  })

  it('热力图最近一天是本地今天（含本地 00:30 的记录）', async () => {
    const { computeTimelineStats } = await import('../timeline-filters')
    const crystals = [
      { id: 'c1', createdAt: localAt(0, 0, 30).toISOString(), content: 'a', tags: [] },
    ]
    const source = {
      sessions: [], crystals, notes: [], emotions: [], anchors: [],
      bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
    }

    const stats = computeTimelineStats(source as any, ['crystal'])

    expect(stats.heatmap).toHaveLength(14)
    const last = stats.heatmap[13]!
    expect(last.date).toBe('2026-03-15')
    // 本地 00:30 落在 0 号小时桶
    expect(last.hours[0]).toBe(1)
  })
})

// ============================================================
// 第五批B1：annual-review / timeline-patterns / emotion-curve 日键出口
// （迁出唯一日键出口后，跨 UTC 日界的记录须按本地日历日归组）
// ============================================================

/** 造一条专注会话 RiverItem（annual-review 的 focusDays 只依赖 ts + session.elapsed） */
function sessionItem(id: string, d: Date, minutes: number): any {
  return { type: 'session', id, ts: d.getTime(), session: { elapsed: minutes * 60000 } as any }
}

describe('annual-review 专注天数（本地日历日去重）', () => {
  it('本地 00:30 与 23:00 分属两天 → focusDays=2（UTC 口径会并成 1）', async () => {
    const { useAnnualReview } = await import('../annual-review')
    const review = useAnnualReview().generateReview(
      [sessionItem('s1', localAt(0, 0, 30), 30), sessionItem('s2', localAt(0, 23, 0), 45)],
      2026,
    )
    // 两条会话本地分属 03-15 与 03-15（都是 dayOffset 0）… 换算：00:30 与 23:00 同属本地同一天
    // ⇒ 正确期望是 1；此用例断言「同属一天不被 UTC 拆成两天」
    expect(review.stats.focusDays).toBe(1)
  })

  it('跨 UTC 日界的两天（本地 03-15 00:30 与 03-16 00:30）→ focusDays=2', async () => {
    const { useAnnualReview } = await import('../annual-review')
    const review = useAnnualReview().generateReview(
      [sessionItem('s1', localAt(0, 0, 30), 30), sessionItem('s2', localAt(1, 0, 30), 20)],
      2026,
    )
    expect(review.stats.focusDays).toBe(2)
  })
})
