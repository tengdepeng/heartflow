// ============================================================
// 字镜阁 · 业务日期口径（UTC 裸切日 → getLocalDateKey）回归测试
// 覆盖：useWritingEnhance.getStats 连续天数、usePersonalVocabulary.getProgress
// 今日/周复习计数。判别样本跨 UTC 午夜（本地 03-15 03:00 = UTC 03-14 19:00）。
// 前提守卫：本机为非 UTC 时区，否则所有口径断言退化为同值比较而假绿。
// 反向验证：把实现改回 UTC 切日写法，本组用例应变红。
// ============================================================
import { describe, it, expect, vi, afterEach } from 'vitest'
import { getLocalDateKey } from '@/utils/time'
import type { WordEntry } from '../types'
import type { WritingSession } from '../writing-enhance'
import { useWritingEnhance } from '../writing-enhance'
import { usePersonalVocabulary } from '../personal-vocabulary'

// 本地「2026-03-15 03:00」= UTC「2026-03-14 19:00」：在东八区本地/UTC 日历日不同日
const SAMPLE = new Date('2026-03-14T19:00:00Z')
const SAMPLE_UTC_DAY = SAMPLE.toISOString().slice(0, 10) // '2026-03-14'
const SAMPLE_LOCAL_DAY = getLocalDateKey(SAMPLE) // 东八区 '2026-03-15'

// 判别前提：本地日 != UTC 日（机器非 UTC）才有判别意义，否则跳过
const TZ_SPLITS = SAMPLE_LOCAL_DAY !== SAMPLE_UTC_DAY

function makeWord(word: string, lastReviewedAt: string): WordEntry {
  return {
    id: word,
    word,
    definition: '释义占位',
    proficiency: 3,
    favorite: false,
    tags: [],
    createdAt: lastReviewedAt,
    lastReviewedAt,
    reviewCount: 1,
  }
}

function makeSess(id: string, startedAt: string): WritingSession {
  return {
    id,
    title: '标题',
    content: '正文',
    category: 'daily',
    startedAt,
    wordCount: 1,
    usedWordIds: [],
    discoveredWords: [],
    moodTags: [],
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('useWritingEnhance.getStats · 连续天数本地口径', () => {
  it.runIf(TZ_SPLITS)('两个本地连续日（UTC 归并为同一日）不误合并', () => {
    vi.useFakeTimers()
    vi.setSystemTime(SAMPLE)
    const we = useWritingEnhance()
    // 本地今日 03-15 06:00 与本地昨日 03-14 20:00：本地为相邻两日，但 UTC 下都归入 03-14
    const sessions = [
      makeSess('a', '2026-03-14T22:00:00Z'), // 本地 03-15
      makeSess('b', '2026-03-14T12:00:00Z'), // 本地 03-14
    ]
    const s = we.getStats(sessions)
    expect(s.totalDays).toBe(2)
    expect(s.currentStreak).toBe(2)
    expect(s.longestStreak).toBe(2)
  })

  it.runIf(TZ_SPLITS)('仅跨 UTC 日界的今日会话仍被计为连续 1 天', () => {
    vi.useFakeTimers()
    vi.setSystemTime(SAMPLE)
    const we = useWritingEnhance()
    const sessions = [makeSess('a', '2026-03-14T23:00:00Z')] // 本地 03-15 07:00 = 今日
    const s = we.getStats(sessions)
    expect(s.totalDays).toBe(1)
    expect(s.currentStreak).toBe(1)
  })
})

describe('usePersonalVocabulary.getProgress · 今日/周复习本地口径', () => {
  it.runIf(TZ_SPLITS)('本地昨日的复习不误计为今日', () => {
    vi.useFakeTimers()
    vi.setSystemTime(SAMPLE)
    const pv = usePersonalVocabulary()
    // 本地 03-14 20:00（昨日）→ UTC 03-14：旧代码取 UTC 日会把它误判为“今日”
    const words = [makeWord('w_yest', '2026-03-14T12:00:00Z')]
    const prog = pv.getProgress(words)
    expect(prog.reviewedToday).toBe(0)
  })

  it.runIf(TZ_SPLITS)('本地今日的复习仍被计为今日', () => {
    vi.useFakeTimers()
    vi.setSystemTime(SAMPLE)
    const pv = usePersonalVocabulary()
    // 本地 03-15 07:00（今日）→ UTC 03-14
    const words = [makeWord('w_today', '2026-03-14T23:00:00Z')]
    const prog = pv.getProgress(words)
    expect(prog.reviewedToday).toBe(1)
  })

  it.runIf(TZ_SPLITS)('动静混合样本只计真正今日的复习', () => {
    vi.useFakeTimers()
    vi.setSystemTime(SAMPLE)
    const pv = usePersonalVocabulary()
    const words = [
      makeWord('w_today', '2026-03-14T23:00:00Z'), // 本地今日 03-15
      makeWord('w_yest', '2026-03-14T12:00:00Z'), // 本地昨日 03-14
    ]
    const prog = pv.getProgress(words)
    expect(prog.reviewedToday).toBe(1)
  })
})