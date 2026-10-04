import { storage } from '../../engine/storage'
import type { TimeCrystal, FocusSession, Note } from '../../types'
import type { EmotionRecord } from '../emotion'
import type { Anchor } from '../anchor'
import { PHOTO_DIARY_KEY, type PhotoEntry } from '../anchor/photo-diary'
import { getLocalDateKey } from '../../utils/time'
import { getBodyRingLogs } from '../body/rings'
import type { DailyRingLog } from '../body/rings'
import { getHabits } from '../discipline'
import type { Habit } from '../discipline'
import { getMovementRecords } from '../movement'
import type { MovementRecord } from '../movement'
import { getBreakRecords } from '../rest'
import type { BreakRecord } from '../rest'
import { getDialogueSessions } from '../mirror'
import type { DialogueSession } from '../mirror'

export type RiverItemType = 'crystal' | 'note' | 'emotion' | 'session' | 'anchor' | 'body' | 'habit' | 'movement' | 'rest' | 'dialogue' | 'photo'

export interface RiverItem {
  type: RiverItemType
  id: string
  ts: number
  crystal?: TimeCrystal
  session?: FocusSession
  note?: Note
  emotion?: EmotionRecord
  anchor?: Anchor
  body?: DailyRingLog
  habit?: Habit
  movement?: MovementRecord
  rest?: BreakRecord
  dialogue?: DialogueSession
  photo?: PhotoEntry
}

/** 返回跨时间线类型唯一且稳定的项键。 */
export function getRiverItemKey(item: Pick<RiverItem, 'type' | 'id'>): string {
  return `${item.type}:${item.id}`
}

export interface RiverSource {
  crystals: TimeCrystal[]
  sessions: FocusSession[]
  notes: Note[]
  emotions: EmotionRecord[]
  anchors: Anchor[]
  bodyLogs: DailyRingLog[]
  habits: Habit[]
  movementRecords: MovementRecord[]
  breakRecords: BreakRecord[]
  dialogueSessions: DialogueSession[]
  photoEntries?: PhotoEntry[]
}

/** 管理可变播放速率的单一回看计时器。 */
export function createReplayTimer(onTick: () => void) {
  let timer: ReturnType<typeof setInterval> | null = null

  function stop() {
    if (timer) clearInterval(timer)
    timer = null
  }

  function start(speed: number) {
    stop()
    timer = setInterval(onTick, 3000 / speed)
  }

  return { start, stop }
}

export function createRiverItems(
  source: RiverSource,
  activeFilters: RiverItemType[],
): RiverItem[] {
  const items: RiverItem[] = []
  const enabled = new Set(activeFilters)
  const sessionMap = new Map(source.sessions.map(session => [session.id, session]))

  if (enabled.has('crystal')) {
    for (const crystal of source.crystals) {
      items.push({
        type: 'crystal',
        id: crystal.id,
        ts: new Date(crystal.createdAt).getTime(),
        crystal,
        session: sessionMap.get(crystal.sessionId),
      })
    }
  }

  if (enabled.has('note')) {
    for (const note of source.notes) {
      items.push({
        type: 'note',
        id: note.id,
        ts: new Date(note.updatedAt).getTime(),
        note,
      })
    }
  }

  if (enabled.has('emotion')) {
    for (const emotion of source.emotions) {
      items.push({
        type: 'emotion',
        id: emotion.id,
        ts: new Date(emotion.createdAt).getTime(),
        emotion,
      })
    }
  }

  if (enabled.has('session')) {
    for (const session of source.sessions) {
      const ts = session.completedAt || session.startedAt
      if (!ts) continue
      items.push({
        type: 'session',
        id: session.id,
        ts: new Date(ts).getTime(),
        session,
      })
    }
  }

  if (enabled.has('anchor')) {
    for (const anchor of source.anchors) {
      const ts = anchor.doneAt || anchor.createdAt
      items.push({
        type: 'anchor',
        id: anchor.id,
        ts: new Date(ts).getTime(),
        anchor,
      })
    }
  }

  if (enabled.has('body')) {
    for (const log of source.bodyLogs) {
      items.push({
        type: 'body',
        id: `body-${log.date}`,
        ts: new Date(`${log.date}T00:00:00`).getTime(),
        body: log,
      })
    }
  }

  if (enabled.has('habit')) {
    for (const habit of source.habits) {
      for (const date of habit.completedDates) {
        items.push({
          type: 'habit',
          id: `habit-${habit.id}-${date}`,
          ts: new Date(`${date}T12:00:00`).getTime(),
          habit,
        })
      }
    }
  }

  if (enabled.has('movement')) {
    for (const record of source.movementRecords) {
      items.push({
        type: 'movement',
        id: `movement-${record.id}`,
        ts: new Date(record.timestamp).getTime(),
        movement: record,
      })
    }
  }

  if (enabled.has('rest')) {
    for (const record of source.breakRecords) {
      items.push({
        type: 'rest',
        id: `rest-${record.id}`,
        ts: new Date(`${record.date}T12:00:00`).getTime(),
        rest: record,
      })
    }
  }

  if (enabled.has('dialogue')) {
    for (const session of source.dialogueSessions) {
      items.push({
        type: 'dialogue',
        id: `dialogue-${session.id}`,
        ts: new Date(session.createdAt).getTime(),
        dialogue: session,
      })
    }
  }

  if (enabled.has('photo')) {
    for (const entry of source.photoEntries ?? []) {
      items.push({
        type: 'photo',
        id: `photo-${entry.id}`,
        ts: new Date(entry.createdAt).getTime(),
        photo: entry,
      })
    }
  }

  return items.sort((a, b) => b.ts - a.ts)
}

export function getRiverSource(): RiverSource {
  return {
    crystals: storage.getCrystals(),
    sessions: storage.getSessions(),
    notes: storage.getNotes(),
    emotions: storage.getEmotions(),
    anchors: storage.getAnchors(),
    bodyLogs: getBodyRingLogs(),
    habits: getHabits(),
    movementRecords: getMovementRecords(),
    breakRecords: getBreakRecords(),
    dialogueSessions: getDialogueSessions(),
    photoEntries: storage.getKV<PhotoEntry[]>(PHOTO_DIARY_KEY, []),
  }
}

/** 每日摘要统计 */
export interface DailySummary {
  date: string
  label: string
  crystalCount: number
  noteCount: number
  emotionCount: number
  sessionCount: number
  anchorCount: number
  bodyCount: number
  habitCount: number
  movementCount: number
  restCount: number
  dialogueCount: number
  totalFocusMinutes: number
  completedAnchors: number
  uniqueTags: string[]
}

/** 计算指定日期范围内的所有可用标签（去重排序） */
export function getAllTags(source: RiverSource): string[] {
  const tagSet = new Set<string>()
  for (const c of source.crystals) c.tags?.forEach(t => tagSet.add(t))
  for (const s of source.sessions) s.tags?.forEach(t => tagSet.add(t))
  for (const n of source.notes) n.tags?.forEach(t => tagSet.add(t))
  for (const a of source.anchors) a.tags?.forEach(t => tagSet.add(t))
  return [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

/** 按 tag 筛选 RiverItem */
export function filterByTag(items: RiverItem[], tag: string): RiverItem[] {
  if (!tag) return items
  const t = tag.toLowerCase()
  return items.filter(i => {
    const tags = [
      ...(i.note?.tags || []),
      ...(i.session?.tags || []),
      ...(i.crystal?.tags || []),
      ...(i.anchor?.tags || []),
    ]
    return tags.some(s => s.toLowerCase() === t)
  })
}

/**
 * 计算每日摘要，按日期分组聚合。
 *
 * 分组键取**本地日历日**（utils/time.ts 的 getLocalDateKey），不可用 UTC ISO 日期——
 * 后者在东八区会让本地 00:00–08:00 的记录归到前一天。调用方传入的
 * `todayStr` / `yesterdayStr` 必须同为本地日历日键，否则「今天/昨天」标签会与分组错位。
 */
export function computeDailySummaries(
  items: RiverItem[],
  todayStr: string,
  yesterdayStr: string,
): DailySummary[] {
  const groups = new Map<string, RiverItem[]>()
  for (const item of items) {
    const ds = getLocalDateKey(new Date(item.ts))
    if (!groups.has(ds)) groups.set(ds, [])
    groups.get(ds)!.push(item)
  }

  const summaries: DailySummary[] = []
  for (const [date, dayItems] of groups) {
    const label = date === todayStr ? '今天' : date === yesterdayStr ? '昨天' : `${new Date(date).getMonth() + 1}月${new Date(date).getDate()}日`
    const s: DailySummary = {
      date,
      label,
      crystalCount: 0,
      noteCount: 0,
      emotionCount: 0,
      sessionCount: 0,
      anchorCount: 0,
      bodyCount: 0,
      habitCount: 0,
      movementCount: 0,
      restCount: 0,
      dialogueCount: 0,
      totalFocusMinutes: 0,
      completedAnchors: 0,
      uniqueTags: [],
    }
    const tagSet = new Set<string>()
    for (const item of dayItems) {
      if (item.type === 'crystal') { s.crystalCount++; item.crystal?.tags?.forEach(t => tagSet.add(t)) }
      if (item.type === 'note') { s.noteCount++; item.note?.tags?.forEach(t => tagSet.add(t)) }
      if (item.type === 'emotion') s.emotionCount++
      if (item.type === 'session') {
        s.sessionCount++
        if (item.session?.elapsed) s.totalFocusMinutes += Math.round(item.session.elapsed / 60000)
        item.session?.tags?.forEach(t => tagSet.add(t))
      }
      if (item.type === 'anchor') {
        s.anchorCount++
        if (item.anchor?.done) s.completedAnchors++
        item.anchor?.tags?.forEach(t => tagSet.add(t))
      }
      if (item.type === 'body') s.bodyCount++
      if (item.type === 'habit') s.habitCount++
      if (item.type === 'movement') s.movementCount++
      if (item.type === 'rest') s.restCount++
      if (item.type === 'dialogue') s.dialogueCount++
    }
    s.uniqueTags = [...tagSet].sort((a, b) => a.localeCompare(b, 'zh-CN'))
    summaries.push(s)
  }
  return summaries.sort((a, b) => b.date.localeCompare(a.date))
}
