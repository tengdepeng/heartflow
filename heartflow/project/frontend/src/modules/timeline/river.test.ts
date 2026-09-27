import { describe, expect, it, vi } from 'vitest'
import { createReplayTimer, createRiverItems, getRiverItemKey } from './river'
import type { RiverSource } from './river'

const source: RiverSource = {
  crystals: [
    {
      id: 'crystal-1',
      sessionId: 'session-1',
      color: '#fff',
      intensity: 0.8,
      createdAt: '2026-07-17T09:00:00.000Z',
      shape: 'sphere',
      tags: [],
      insight: null,
    },
  ],
  sessions: [
    {
      id: 'session-1',
      status: 'completed',
      mode: 'focus',
      plannedDuration: 1500000,
      elapsed: 1500000,
      startedAt: '2026-07-17T08:30:00.000Z',
      pausedDuration: 0,
      pausedAt: null,
      completedAt: '2026-07-17T08:55:00.000Z',
      tags: [],
      note: '',
      carrierId: null,
    },
  ],
  notes: [
    {
      id: 'note-1',
      title: 'note',
      content: 'hello',
      tags: [],
      createdAt: '2026-07-17T07:00:00.000Z',
      updatedAt: '2026-07-17T10:00:00.000Z',
    },
  ],
  emotions: [
    {
      id: 'emotion-1',
      type: 'calm',
      note: 'steady',
      createdAt: '2026-07-17T06:00:00.000Z',
    },
  ],
  anchors: [
    {
      id: 'anchor-1',
      text: 'call mom',
      done: true,
      targetDate: '2026-07-17',
      createdAt: '2026-07-17T05:00:00.000Z',
      doneAt: '2026-07-17T11:00:00.000Z',
      priority: 'must',
      driftCount: 0,
    },
  ],
  bodyLogs: [],
  habits: [],
  movementRecords: [],
  breakRecords: [],
  dialogueSessions: [],
}

describe('createRiverItems', () => {
  it('为跨类型相同 ID 生成不同的稳定项键', () => {
    expect(getRiverItemKey({ type: 'crystal', id: 'shared-id' })).toBe('crystal:shared-id')
    expect(getRiverItemKey({ type: 'note', id: 'shared-id' })).toBe('note:shared-id')
    expect(getRiverItemKey({ type: 'crystal', id: 'shared-id' })).not.toBe(
      getRiverItemKey({ type: 'note', id: 'shared-id' }),
    )
  })

  it('按时间倒序聚合所有启用类型', () => {
    const items = createRiverItems(source, ['anchor', 'note', 'crystal', 'session', 'emotion'])

    expect(items.map(item => item.type)).toEqual(['anchor', 'note', 'crystal', 'session', 'emotion'])
    expect(items[2].session?.id).toBe('session-1')
  })

  it('按筛选结果返回对应类型', () => {
    const items = createRiverItems(source, ['anchor', 'emotion'])

    expect(items).toHaveLength(2)
    expect(items.every(item => item.type === 'anchor' || item.type === 'emotion')).toBe(true)
  })

  it('锚点优先使用完成时间，未完成时回退到创建时间', () => {
    const items = createRiverItems(
      {
        ...source,
        anchors: [
          {
            id: 'anchor-2',
            text: 'draft',
            done: false,
            targetDate: '2026-07-17',
            createdAt: '2026-07-17T12:00:00.000Z',
            priority: 'can',
            driftCount: 1,
          },
        ],
      },
      ['anchor'],
    )

    expect(items[0].ts).toBe(new Date('2026-07-17T12:00:00.000Z').getTime())
  })

  it('聚合 body 日志为按日身体条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        bodyLogs: [{ date: '2026-07-17', activityMinutes: 30, restMinutes: 60, feeling: 2 }],
      },
      ['body'],
    )

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('body')
    expect(items[0].body?.activityMinutes).toBe(30)
    expect(items[0].id).toBe('body-2026-07-17')
  })

  it('未启用 body 筛选时不聚合身体条目', () => {
    const items = createRiverItems(
      {
        ...source,
        bodyLogs: [{ date: '2026-07-17', activityMinutes: 30, restMinutes: 60, feeling: 2 }],
      },
      ['crystal'],
    )

    expect(items.every(i => i.type !== 'body')).toBe(true)
  })

  it('聚合 habit 完成日期为独立习惯条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        habits: [
          {
            id: 'habit-1',
            title: '喝水',
            description: '',
            icon: '💧',
            difficulty: 'easy',
            frequency: 'daily',
            target: 1,
            streak: 5,
            bestStreak: 10,
            totalCompleted: 20,
            enabled: true,
            createdAt: '2026-07-01T00:00:00.000Z',
            completedDates: ['2026-07-17', '2026-07-18'],
          },
        ],
      },
      ['habit'],
    )

    expect(items).toHaveLength(2)
    expect(items.every(i => i.type === 'habit' && i.habit?.id === 'habit-1')).toBe(true)
    expect(items[0].id).toBe('habit-habit-1-2026-07-18')
    expect(items[1].id).toBe('habit-habit-1-2026-07-17')
  })

  it('未启用 habit 筛选时不聚合习惯条目', () => {
    const items = createRiverItems(
      {
        ...source,
        habits: [
          {
            id: 'habit-1',
            title: '喝水',
            description: '',
            icon: '💧',
            difficulty: 'easy',
            frequency: 'daily',
            target: 1,
            streak: 5,
            bestStreak: 10,
            totalCompleted: 20,
            enabled: true,
            createdAt: '2026-07-01T00:00:00.000Z',
            completedDates: ['2026-07-17'],
          },
        ],
      },
      ['crystal'],
    )

    expect(items.every(i => i.type !== 'habit')).toBe(true)
  })

  it('聚合 movement 记录为独立运动条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        movementRecords: [
          {
            id: 'mv-1', type: 'running', duration: 30, intensity: 'moderate',
            calories: 300, distance: 5, date: '2026-07-17',
            timestamp: '2026-07-17T08:00:00.000Z',
          },
        ],
      },
      ['movement'],
    )

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('movement')
    expect(items[0].movement?.duration).toBe(30)
    expect(items[0].id).toBe('movement-mv-1')
  })

  it('聚合 rest 记录为独立休息条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        breakRecords: [
          { id: 'br-1', activity: '冥想', duration: 15, mood: 4, date: '2026-07-17' },
        ],
      },
      ['rest'],
    )

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('rest')
    expect(items[0].rest?.activity).toBe('冥想')
    expect(items[0].id).toBe('rest-br-1')
  })

  it('聚合 dialogue 会话为独立对话条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        dialogueSessions: [
          {
            id: 'dlg-1', title: '今晚复盘', entries: [], createdAt: '2026-07-17T09:00:00.000Z',
            lastActiveAt: '2026-07-17T09:30:00.000Z', tags: [], primaryIntents: [],
            archived: false, summary: '',
          },
        ],
      },
      ['dialogue'],
    )

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('dialogue')
    expect(items[0].dialogue?.title).toBe('今晚复盘')
    expect(items[0].id).toBe('dialogue-dlg-1')
  })

  it('聚合照片日记为独立照片条目（启用时）', () => {
    const items = createRiverItems(
      {
        ...source,
        photoEntries: [
          {
            id: 'ph-1', date: '2026-07-17', images: ['data:image/jpeg;base64,AAA'],
            thumbs: ['data:image/jpeg;base64,BBB'], captions: ['日落'], createdAt: '2026-07-17T20:00:00.000Z',
          },
        ],
      },
      ['photo'],
    )

    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('photo')
    expect(items[0].photo?.images.length).toBe(1)
    expect(items[0].id).toBe('photo-ph-1')
    expect(items[0].ts).toBe(new Date('2026-07-17T20:00:00.000Z').getTime())
  })

  it('未启用 photo 筛选时不聚合照片条目', () => {
    const items = createRiverItems(
      {
        ...source,
        photoEntries: [
          {
            id: 'ph-1', date: '2026-07-17', images: ['data:image/jpeg;base64,AAA'],
            thumbs: [], captions: [], createdAt: '2026-07-17T20:00:00.000Z',
          },
        ],
      },
      ['crystal'],
    )

    expect(items.every(i => i.type !== 'photo')).toBe(true)
  })
})

describe('createReplayTimer', () => {
  it('重启时清理旧计时器并采用新速度', () => {
    vi.useFakeTimers()
    const tick = vi.fn()
    const timer = createReplayTimer(tick)
    timer.start(1)
    vi.advanceTimersByTime(2999)
    expect(tick).not.toHaveBeenCalled()
    timer.start(2)
    vi.advanceTimersByTime(1500)
    expect(tick).toHaveBeenCalledTimes(1)
    timer.stop()
    vi.advanceTimersByTime(5000)
    expect(tick).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })
})
