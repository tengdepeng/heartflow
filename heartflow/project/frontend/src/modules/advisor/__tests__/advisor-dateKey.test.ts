// ============================================================
// 幕僚域 · 时区治理（INCR-466）
//
// 幕僚域 2 处 UTC 裸切日已统一为 utils/time.ts 的 getLocalDateKey：
//   - modules/advisor/celebration：庆祝事件写键 + 今日读键 + 未来 7 天边界键
//   - stores/advisor：4 处 timestampToday（completedAt/createdAt/at 的 UTC 前缀
//     匹配）改为「时间戳 → 本地日键」双侧比对
// 东八区 00:00–08:00，UTC 日期恒比本地日历日早一天，旧口径会把「今天」算错。
//
// 反向验证：把实现改回 toISOString().slice(0,10) / startsWith(UTC 前缀) 后，
// 下列用例应转红（仅在本机为非 UTC 时区时才有判别力）。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { getLocalDateKey } from '../../../utils/time'
import { storage } from '../../../engine/storage'
import { useAdvisorCelebration } from '../celebration'
import { useAdvisorStore } from '../../../stores/advisor'
import type { FocusSession, Note, EmotionRecord } from '../../../types'

/** 本地某日某时 → UTC ISO 时间戳（东八区本地 03:00 = UTC 前一天 19:00） */
function localISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function mkSession(partial: Partial<FocusSession> & { id: string }): FocusSession {
  return {
    id: partial.id,
    status: partial.status ?? 'completed',
    mode: partial.mode ?? 'focus',
    plannedDuration: partial.plannedDuration ?? 1_500_000,
    elapsed: partial.elapsed ?? 1_500_000,
    startedAt: partial.startedAt ?? null,
    pausedDuration: partial.pausedDuration ?? 0,
    pausedAt: partial.pausedAt ?? null,
    completedAt: partial.completedAt ?? null,
    tags: partial.tags ?? [],
    note: partial.note ?? '',
    carrierId: partial.carrierId ?? null,
  }
}

function mkNote(partial: Partial<Note> & { id: string }): Note {
  return {
    id: partial.id,
    title: partial.title ?? '笔记',
    content: partial.content ?? '',
    tags: partial.tags ?? [],
    createdAt: partial.createdAt ?? localISO(2026, 3, 15, 10),
    updatedAt: partial.updatedAt ?? localISO(2026, 3, 15, 10),
  }
}

function mkEmotion(partial: Partial<EmotionRecord> & { id: string }): EmotionRecord {
  return {
    id: partial.id,
    type: partial.type ?? 'calm',
    note: partial.note ?? '',
    createdAt: partial.createdAt ?? localISO(2026, 3, 15, 10),
  }
}

describe('幕僚域时区治理 · 前提', () => {
  it('本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })
})

describe('advisor celebration · 本地日历日', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15 03:00（东八区凌晨，UTC 仍是 03-14）
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('createCelebration 默认 date 用本地日历日（东八区凌晨不落 UTC 前一天）', () => {
    const { createCelebration } = useAdvisorCelebration()
    const ev = createCelebration('adv1', 'milestone', '默认日期', 'd')
    expect(ev.date).toBe('2026-03-15')
    // 旧口径会给出 2026-03-14，此断言在旧实现下转红
    expect(ev.date).not.toBe(new Date().toISOString().slice(0, 10))
  })

  it('getTodayCelebrations 只认本地当天', () => {
    const { createCelebration, getTodayCelebrations } = useAdvisorCelebration()
    createCelebration('adv1', 'milestone', '本地今天', 'd', '2026-03-15')
    createCelebration('adv1', 'milestone', '本地昨天', 'd', '2026-03-14')
    const titles = getTodayCelebrations().map(e => e.title)
    expect(titles).toContain('本地今天')
    // 旧口径 today=03-14，会错把「本地昨天」当今天
    expect(titles).not.toContain('本地昨天')
  })

  it('getUpcomingCelebrations 未来 7 天窗口末端按本地日历日', () => {
    const { createCelebration, getUpcomingCelebrations } = useAdvisorCelebration()
    createCelebration('adv1', 'milestone', '第七天', 'd', '2026-03-22')
    createCelebration('adv1', 'milestone', '第八天', 'd', '2026-03-23')
    const titles = getUpcomingCelebrations().map(e => e.title)
    // 旧口径 weekStr=03-21（UTC 切日），会漏掉本地第 7 天
    expect(titles).toContain('第七天')
    expect(titles).not.toContain('第八天')
  })
})

describe('advisor store · 今日桶按本地日历日', () => {
  beforeEach(() => {
    const memoryStorage = new Map<string, string>()
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => memoryStorage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          memoryStorage.set(key, value)
        },
        removeItem: (key: string) => {
          memoryStorage.delete(key)
        },
      },
      configurable: true,
    })

    setActivePinia(createPinia())
    storage.clear()
    vi.useFakeTimers()
    // 本地 2026-03-15 03:00（东八区凌晨，UTC 仍是 03-14）
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
    storage.setConfig({
      ...storage.getConfig(),
      advisorEnabled: true,
      advisorResetDate: '2026-03-15',
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('本地当天 10:00 的记录计入今天（其 UTC 日已跨到 03-15）', () => {
    storage.setSessions([mkSession({ id: 'today', completedAt: localISO(2026, 3, 15, 10) })])
    storage.setNotes([mkNote({ id: 'n-today', createdAt: localISO(2026, 3, 15, 10) })])
    storage.setEmotions([mkEmotion({ id: 'e-today', createdAt: localISO(2026, 3, 15, 10) })])

    const store = useAdvisorStore()
    // 旧口径 UTC 前缀=03-14，会漏掉本地今天（UTC 日 03-15）的记录
    expect(store.getQuickStats().focusCount).toBe(1)
    expect(store.getTaskAwareness().focusCount).toBe(1)
    expect(store.getTaskProgress().focus.current).toBe(1)
    expect(store.getTaskProgress().notes.current).toBe(1)
    expect(store.getTaskProgress().emotions.current).toBe(1)
  })

  it('本地昨天 22:00 的记录不计入今天（其 UTC 日仍是 03-14）', () => {
    storage.setSessions([mkSession({ id: 'yesterday', completedAt: localISO(2026, 3, 14, 22) })])
    storage.setNotes([mkNote({ id: 'n-yesterday', createdAt: localISO(2026, 3, 14, 22) })])
    storage.setEmotions([mkEmotion({ id: 'e-yesterday', createdAt: localISO(2026, 3, 14, 22) })])

    const store = useAdvisorStore()
    // 旧口径 UTC 前缀=03-14，会错把本地昨天 22:00 的记录当今天
    expect(store.getQuickStats().focusCount).toBe(0)
    expect(store.getTaskAwareness().focusCount).toBe(0)
    expect(store.getTaskProgress().focus.current).toBe(0)
    expect(store.getTaskProgress().notes.current).toBe(0)
    expect(store.getTaskProgress().emotions.current).toBe(0)
  })

  it('本地凌晨（UTC 前一日）的记录仍计入本地当天', () => {
    // 本地 03-15 03:00 = UTC 03-14 19:00：本地日键为 03-15，必须计入今天
    storage.setSessions([mkSession({ id: 'early', completedAt: localISO(2026, 3, 15, 3) })])
    const store = useAdvisorStore()
    expect(store.getQuickStats().focusCount).toBe(1)
    expect(store.getTaskProgress().focus.current).toBe(1)
  })
})