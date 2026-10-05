// ============================================================
// 逐日心锚 · 手札上下文（建议卡 + 元数据条）单元测试
// 纯函数为主；时间戳取 12:00Z（东八区当日 20:00），规避 UTC 偏移漂移。
//
// TODAY / YDAY 必须**从系统「今天」派生**，不能写死日期字符串：
// useJournalContext 内部调 getLocalDateKey() 取真实本地日历日，一旦写死
// （原为 '2026-10-04'）跨过真实日期后，全部当日断言会静默失配——
// 表现为「明明记了却读到 0 条」，且不会报任何错。
// ============================================================

process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import { getLocalDateKey } from '../../../utils/time'
import type { FocusSession } from '../../../types'
import type { EmotionRecord } from '../../emotion/types'
import type { ExerciseRecord } from '../../body/exercise-tracker'
import type { Anchor } from '../types'
import type { AnchorJournal } from '../anchor-journal'
import type { PhotoEntry } from '../photo-diary'

// 本地零点构造，避开 UTC 偏移导致的跨日
function localDayOffset(days: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const TODAY = localDayOffset(0)
const YDAY = localDayOffset(-1)

function setup(kvStore: Record<string, any> = {}, extra: Record<string, any> = {}) {
  vi.resetModules()
  const mock = createMockStorage()
  mock.setItem(
    'heartflow:storage',
    JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [], ...extra }),
  )
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  return mock
}

async function loadModule() {
  return await import('../journal-context')
}

// ---- 夹具 ----

function focus(over: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 'f1',
    status: 'completed',
    mode: 'focus',
    plannedDuration: 1500000,
    elapsed: 1500000,
    startedAt: `${TODAY}T12:00:00.000Z`,
    pausedDuration: 0,
    pausedAt: null,
    completedAt: `${TODAY}T12:25:00.000Z`,
    tags: [],
    note: '',
    carrierId: null,
    ...over,
  }
}

function emo(over: Partial<EmotionRecord> = {}): EmotionRecord {
  return { id: 'm1', type: 'calm', note: '', createdAt: `${TODAY}T12:00:00.000Z`, ...over }
}

function exr(over: Partial<ExerciseRecord> = {}): ExerciseRecord {
  return {
    id: 'x1',
    type: 'walking',
    name: '散步',
    duration: 30,
    intensity: 'light',
    calories: 120,
    moodAfter: 7,
    energyAfter: 4,
    date: TODAY,
    timestamp: `${TODAY}T12:00:00.000Z`,
    completion: 1,
    ...over,
  }
}

function anc(over: Partial<Anchor> = {}): Anchor {
  return {
    id: 'a1',
    text: '写完报告',
    done: false,
    targetDate: TODAY,
    createdAt: `${TODAY}T08:00:00.000Z`,
    priority: 'can',
    stage: 'active',
    driftCount: 0,
    ...over,
  }
}

function jrn(over: Partial<AnchorJournal> = {}): AnchorJournal {
  return {
    id: 'j1',
    anchorId: 'a1',
    title: '手札',
    content: '内容',
    type: 'diary',
    linkedAnchorIds: [],
    createdAt: `${TODAY}T12:00:00.000Z`,
    updatedAt: `${TODAY}T12:00:00.000Z`,
    ...over,
  }
}

function ph(over: Partial<PhotoEntry> = {}): PhotoEntry {
  return {
    id: 'p1',
    date: TODAY,
    images: ['A', 'B'],
    thumbs: ['a', 'b'],
    captions: ['', ''],
    caption: '',
    createdAt: `${TODAY}T12:00:00.000Z`,
    ...over,
  }
}

// ---- collectDaySignals ----

describe('collectDaySignals 当日信号汇总', () => {
  it('空输入 → 全零基线', async () => {
    const { collectDaySignals, emptyDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [],
      anchors: [],
      journals: [],
      photos: [],
    })
    expect(s).toEqual(emptyDaySignals(TODAY))
  })

  it('专注仅计当日已完成，跨日与中断不计', async () => {
    const { collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [
        focus({ id: 'f1', elapsed: 1500000 }),
        focus({ id: 'f2', elapsed: 2100000 }),
        focus({ id: 'f3', completedAt: `${YDAY}T12:25:00.000Z` }),
        focus({ id: 'f4', status: 'interrupted' }),
      ],
      emotionRecords: [],
      exerciseRecords: [],
      anchors: [],
      journals: [],
      photos: [],
    })
    expect(s.focusCount).toBe(2)
    expect(s.focusMinutes).toBe(60)
  })

  it('情绪统计次数与主导类型，天气取当日首条', async () => {
    const { collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [
        emo({ id: 'm1', type: 'calm' }),
        emo({ id: 'm2', type: 'calm', weather: 'sunny' }),
        emo({ id: 'm3', type: 'happy' }),
        emo({ id: 'm4', type: 'sad', createdAt: `${YDAY}T12:00:00.000Z` }),
      ],
      exerciseRecords: [],
      anchors: [],
      journals: [],
      photos: [],
    })
    expect(s.emotionCount).toBe(3)
    expect(s.dominantEmotion).toBe('calm')
    expect(s.weather).toBe('sunny')
  })

  it('运动统计时长/次数/热量，跨日不计', async () => {
    const { collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [
        exr({ id: 'x1', duration: 30, calories: 120 }),
        exr({ id: 'x2', duration: 20, calories: 80 }),
        exr({ id: 'x3', date: YDAY, duration: 60, calories: 300 }),
      ],
      anchors: [],
      journals: [],
      photos: [],
    })
    expect(s.exerciseMinutes).toBe(50)
    expect(s.exerciseCount).toBe(2)
    expect(s.exerciseCalories).toBe(200)
  })

  it('心锚仅计当日 active，汇总完成数与未完成文本', async () => {
    const { collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [],
      anchors: [
        anc({ id: 'a1', done: true }),
        anc({ id: 'a2', done: true }),
        anc({ id: 'a3', text: '写周报', done: false }),
        anc({ id: 'a4', stage: 'pool', targetDate: '' }),
        anc({ id: 'a5', targetDate: YDAY }),
      ],
      journals: [],
      photos: [],
    })
    expect(s.anchorTotal).toBe(3)
    expect(s.anchorDone).toBe(2)
    expect(s.pendingAnchorTexts).toEqual(['写周报'])
  })

  it('手札与照片按当日统计', async () => {
    const { collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [],
      anchors: [],
      journals: [
        jrn({ id: 'j1' }),
        jrn({ id: 'j2' }),
        jrn({ id: 'j3', createdAt: `${YDAY}T12:00:00.000Z` }),
      ],
      photos: [ph({ id: 'p1', images: ['A', 'B'] }), ph({ id: 'p2', images: ['C'] }), ph({ id: 'p3', date: YDAY, images: ['D', 'E', 'F'] })],
    })
    expect(s.journalCount).toBe(2)
    expect(s.photoCount).toBe(3)
  })
})

// ---- buildMetadataBar ----

describe('buildMetadataBar 元数据条', () => {
  it('空信号 → 空条', async () => {
    const { buildMetadataBar, emptyDaySignals } = await loadModule()
    expect(buildMetadataBar(emptyDaySignals(TODAY))).toEqual([])
  })

  it('逐维度生成 chip，顺序与 tone 稳定', async () => {
    const { buildMetadataBar, collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [focus({ elapsed: 5400000 })],
      emotionRecords: [emo({ type: 'happy', weather: 'rainy' })],
      exerciseRecords: [exr({ duration: 30 })],
      anchors: [anc({ done: true }), anc({ id: 'a2' })],
      journals: [jrn()],
      photos: [ph({ images: ['A', 'B'] })],
    })
    const chips = buildMetadataBar(s)
    expect(chips.map(c => c.key)).toEqual(['focus', 'emotion', 'weather', 'body', 'anchor', 'photo', 'journal'])
    expect(chips[0].value).toBe('1 小时 30 分')
    expect(chips[1].label).toBe('轻快')
    expect(chips[2].value).toBe('雨')
    expect(chips[4].value).toBe('1/2')
    expect(chips[5].value).toBe('2 张')
    expect(chips.map(c => c.tone)).toEqual(['focus', 'emotion', 'weather', 'body', 'anchor', 'memory', 'memory'])
  })

  it('仅呈现有数据维度', async () => {
    const { buildMetadataBar, collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [exr({ duration: 15 })],
      anchors: [],
      journals: [],
      photos: [],
    })
    const chips = buildMetadataBar(s)
    expect(chips.map(c => c.key)).toEqual(['body'])
  })
})

// ---- generateSuggestionCards ----

describe('generateSuggestionCards 建议卡', () => {
  async function cardsFor(over: Record<string, any>) {
    const { generateSuggestionCards, collectDaySignals } = await loadModule()
    const s = collectDaySignals({
      date: TODAY,
      focusSessions: [],
      emotionRecords: [],
      exerciseRecords: [],
      anchors: [],
      journals: [],
      photos: [],
      ...over,
    })
    return generateSuggestionCards(s)
  }

  it('空信号 → 兜底卡 empty-day', async () => {
    const cards = await cardsFor({})
    expect(cards).toHaveLength(1)
    expect(cards[0].id).toBe('empty-day')
    expect(cards[0].source).toBe('empty')
    expect(cards[0].prefill.length).toBeGreaterThan(0)
  })

  it('无手札 → first-journal 高优先置顶', async () => {
    const cards = await cardsFor({ focusSessions: [focus({ elapsed: 3600000 })] })
    expect(cards[0].id).toBe('first-journal')
    expect(cards[0].priority).toBe('high')
    expect(cards.some(c => c.id === 'focus-review')).toBe(true)
  })

  it('专注 ≥30 分钟 → focus-review 标题含时长', async () => {
    const cards = await cardsFor({
      focusSessions: [focus({ elapsed: 5400000 })],
      journals: [jrn()],
    })
    const card = cards.find(c => c.id === 'focus-review')!
    expect(card).toBeTruthy()
    expect(card.title).toContain('1 小时 30 分')
    expect(card.type).toBe('review')
  })

  it('专注 <30 分钟 → 不生成专注卡', async () => {
    const cards = await cardsFor({ focusSessions: [focus({ elapsed: 600000 })], journals: [jrn()] })
    expect(cards.some(c => c.id === 'focus-review')).toBe(false)
  })

  it('情绪 → emotion-note 标题含主导标签', async () => {
    const cards = await cardsFor({
      emotionRecords: [emo({ type: 'anxious' }), emo({ id: 'm2', type: 'anxious' })],
      journals: [jrn()],
    })
    const card = cards.find(c => c.id === 'emotion-note')!
    expect(card.title).toContain('紧绷')
    expect(card.hint).toContain('2 次')
  })

  it('运动 → body-note 含热量', async () => {
    const cards = await cardsFor({ exerciseRecords: [exr({ duration: 45, calories: 200 })], journals: [jrn()] })
    const card = cards.find(c => c.id === 'body-note')!
    expect(card.title).toContain('45 分钟')
    expect(card.hint).toContain('200 千卡')
  })

  it('心锚未完成 → anchor-pending 预填含未完成文本', async () => {
    const cards = await cardsFor({
      anchors: [anc({ id: 'a1', done: true }), anc({ id: 'a2', text: '写周报' })],
      journals: [jrn()],
    })
    const card = cards.find(c => c.id === 'anchor-pending')!
    expect(card.title).toContain('1 个心锚未完成')
    expect(card.prefill).toContain('写周报')
  })

  it('心锚全完成 → anchor-done 感恩卡', async () => {
    const cards = await cardsFor({ anchors: [anc({ done: true })], journals: [jrn()] })
    const card = cards.find(c => c.id === 'anchor-done')!
    expect(card.type).toBe('gratitude')
    expect(cards.some(c => c.id === 'anchor-pending')).toBe(false)
  })

  it('照片 → photo-caption', async () => {
    const cards = await cardsFor({ photos: [ph({ images: ['A', 'B', 'C'] })], journals: [jrn()] })
    const card = cards.find(c => c.id === 'photo-caption')!
    expect(card.title).toContain('3 张照片')
  })

  it('高优先在前且最多 4 张', async () => {
    const cards = await cardsFor({
      focusSessions: [focus({ elapsed: 5400000 })],
      emotionRecords: [emo()],
      exerciseRecords: [exr()],
      anchors: [anc()],
      photos: [ph()],
    })
    expect(cards).toHaveLength(4)
    expect(cards[0].priority).toBe('high')
    expect(cards[1].priority).toBe('high')
    expect(cards.slice(2).every(c => c.priority === 'medium')).toBe(true)
  })
})

// ---- formatMinutes ----

describe('formatMinutes 时长格式化', () => {
  it('分档正确', async () => {
    const { formatMinutes } = await loadModule()
    expect(formatMinutes(0)).toBe('0 分钟')
    expect(formatMinutes(45)).toBe('45 分钟')
    expect(formatMinutes(60)).toBe('1 小时')
    expect(formatMinutes(90)).toBe('1 小时 30 分')
  })
})

// ---- useJournalContext 组合式接线 ----

describe('useJournalContext 组合式接线', () => {
  it('从各引擎读取当日数据生成信号 / 元数据条 / 建议卡', async () => {
    setup(
      {
        'hf:body:exercise:records': JSON.stringify([exr({ duration: 30 })]),
        'hf:anchor_journals': [jrn()],
        'hf:anchor:photo_diary': [ph({ images: ['A', 'B'] })],
      },
      { sessions: [focus({ elapsed: 1500000 })], emotions: [emo({ type: 'calm' })] },
    )
    const { useJournalContext } = await loadModule()
    const anchors = ref<Anchor[]>([anc({ done: true })])
    const ctx = useJournalContext(anchors)
    ctx.refresh()

    expect(ctx.signals.value.date).toBe(getLocalDateKey())
    expect(ctx.signals.value.focusMinutes).toBe(25)
    expect(ctx.signals.value.emotionCount).toBe(1)
    expect(ctx.signals.value.exerciseMinutes).toBe(30)
    expect(ctx.signals.value.anchorDone).toBe(1)
    expect(ctx.signals.value.journalCount).toBe(1)
    expect(ctx.signals.value.photoCount).toBe(2)
    expect(ctx.metadataBar.value.map(c => c.key)).toEqual([
      'focus',
      'emotion',
      'body',
      'anchor',
      'photo',
      'journal',
    ])
    expect(ctx.suggestions.value.length).toBeGreaterThan(0)
  })
})
