// ============================================================
// data-port 导出时间线 · 时区治理（INCR-466）
//
// exportTimelineMarkdown 把 UTC ISO 时间戳切日期键后与 today/yesterday 比较分组，
// 东八区 00:00–08:00 的记录会被归到「昨天」组。
// 这批缺陷此前**不在基线内也不在闸门内**——闸门只认toISOString()/.split('T')[0]，
// 而 `w.createdAt.slice(0,10)` 这种「时间戳属性直接切键」形态完全漏检，
// 2026-10-05 给闸门补了第 4 类形态后才把这批暴露出来。
//
// 反向验证：改回 slice(0,10)/ toISOString().slice(0,10) 后用例应转红。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../utils/time'
import type { Anchor } from '../../modules/anchor/types'
import type { EmotionRecord, FocusSession, Note } from '../../types'

const mockData = {
  sessions: [] as any[], crystals: [] as any[], notes: [] as any[],
  emotions: [] as any[], anchors: [] as any[],
  goals: [] as any[], relations: [] as any[], ledger: [] as any[], carriers: [] as any[],
  kvStore: {} as Record<string, any>,
}

const mockStorage = {
  getSessions: () => mockData.sessions,
  getCrystals: () => mockData.crystals,
  getNotes: () => mockData.notes,
  getEmotions: () => mockData.emotions,
  getAnchors: () => mockData.anchors,
  getGoals: () => mockData.goals,
  getRelations: () => mockData.relations,
  getLedger: () => mockData.ledger,
  getCarriers: () => mockData.carriers,
  getConstitution: () => null,
  getConfig: () => ({ display: { statsWindowDays: 30 } }),
  getKV: <T,>(key: string, d: T) => (mockData.kvStore[key] !== undefined ? mockData.kvStore[key] : d),
  setKV: (key: string, v: any) => { mockData.kvStore[key] = v },
  setSessions: (s: any[]) => { mockData.sessions = s },
  setNotes: (s: any[]) => { mockData.notes = s },
  setEmotions: (s: any[]) => { mockData.emotions = s },
  setAnchors: (s: any[]) => { mockData.anchors = s },
}

vi.mock('../storage', () => ({ storage: mockStorage }))

/** 本地某日某时 → UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

describe('data-port · 导出时间线分组 本地日历日口径', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）10:00
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
    mockData.sessions = []; mockData.notes = []; mockData.emotions = []; mockData.anchors = []
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('凌晨创建的记录归入「今天」而非「昨天」', async () => {
    const { exportTimelineMarkdown } = await import('../data-port')
    // 本地 03-15 03:00（UTC 03-14 19:00）——旧口径会被判成「昨天」
    const session: FocusSession = {
      id: 's1', status: 'completed', mode: 'focus', plannedDuration: 1, elapsed: 60000,
      startedAt: localDayISO(2026, 3, 15, 3), pausedDuration: 0, pausedAt: null,
      completedAt: localDayISO(2026, 3, 15, 3), tags: [], note: '', carrierId: null,
    }
    mockData.sessions.push(session)

    const md = exportTimelineMarkdown()
    expect(md).toContain('## 今天')
    expect(md).not.toContain('## 昨天')
  })

  it('时间戳缺失的记录被跳过，不产出 NaN-NaN-NaN 假分组', async () => {
    const { exportTimelineMarkdown } = await import('../data-port')
    const bad: any = {
      id: 's2', status: 'completed', mode: 'focus', plannedDuration: 1, elapsed: 60000,
      startedAt: null, pausedDuration: 0, pausedAt: null, completedAt: null,
      tags: [], note: '', carrierId: null,
    }
    mockData.sessions.push(bad)

    const md = exportTimelineMarkdown()
    expect(md).not.toContain('NaN')
    expect(md).not.toContain('Invalid')
  })

  it('心锚 / 笔记 / 情绪 时间戳缺失时同样被跳过（不留空标题）', async () => {
    const { exportTimelineMarkdown } = await import('../data-port')
    mockData.anchors.push({ id: 'a0', text: '无时间戳心锚', done: false, targetDate: null, createdAt: null, priority: 'must', driftCount: 0 } as any)
    mockData.notes.push({ id: 'n0', title: '无时间戳笔记', content: '', tags: [], createdAt: null, updatedAt: null } as any)
    mockData.emotions.push({ id: 'e0', type: 'calm', note: '', createdAt: null } as any)

    const md = exportTimelineMarkdown()
    // 四处（含 sessions）现在统一走dayKeyOf + if(!date) continue
    expect(md).not.toContain('无时间戳心锚')
    expect(md).not.toContain('无时间戳笔记')
    expect(md).not.toContain('NaN')
    // 不应出现空标题行「## 」后直接换行
    expect(md).not.toMatch(/##\s*\n/)
  })

  it('情绪 / 心锚 / 笔记的日期键同样按本地日历日', async () => {
    const { exportTimelineMarkdown } = await import('../data-port')
    const ts = localDayISO(2026, 3, 15, 2)
    const emotion: EmotionRecord = { id: 'e1', type: 'calm', note: '凌晨记录', createdAt: ts }
    const anchor: Anchor = {
      id: 'a1', text: '凌晨心锚', done: true, targetDate: '2026-03-15', createdAt: ts,
      priority: 'must', driftCount: 0,
    }
    const note: Note = {
      id: 'n1', title: '凌晨笔记', content: '', tags: [], createdAt: ts, updatedAt: ts,
    }
    mockData.emotions.push(emotion)
    mockData.anchors.push(anchor)
    mockData.notes.push(note)

    const md = exportTimelineMarkdown()
    expect(md).toContain('## 今天')
    expect(md).toContain('凌晨心锚')
    expect(md).toContain('凌晨笔记')
    expect(md).not.toContain('## 昨天')
  })
})