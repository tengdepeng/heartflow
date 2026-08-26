// ============================================================
// 统一时间投入聚合 + 礼包（第47条五类真实数据源 / 第46条礼包载体）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: unknown) => {
      const store = getKvStore()
      return store[key] !== undefined ? (store[key] as unknown) : def
    },
    setKV: (key: string, val: unknown) => { getKvStore()[key] = val },
    getSessions: () => ([
      {
        id: 'sess1', status: 'completed', mode: 'focus', plannedDuration: 1500000, elapsed: 1500000,
        startedAt: '2026-01-01T00:00:00Z', pausedDuration: 0, pausedAt: null,
        completedAt: '2026-01-01T00:25:00Z', tags: ['deep'], note: '读完一章', carrierId: null,
      },
    ]),
  },
}))

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => true),
}))

import {
  collectTimeInvestments,
  buildInvestmentPreview,
  exportSeedGift,
  parseSeedGift,
  stringifySeedGift,
  type TransferAuthorization,
} from '../seed-transfer'
import type { TimeSeed } from '../time-seed'

beforeEach(() => {
  resetKvStore()
  // 预置一条运动记录（动律之间以 JSON 字符串存储）
  getKvStore()['hf:movement:records'] = JSON.stringify([
    {
      id: 'm1', type: 'running', duration: 30, intensity: 'moderate', distance: 5, calories: 300,
      feeling: '畅快', note: '', date: '2026-01-01', timestamp: '2026-01-01T08:00:00.000Z',
    },
  ])
})

function gameSeed(over: Partial<TimeSeed> = {}): TimeSeed {
  return {
    id: 'g1', name: '塞尔达', source: 'game', sourceId: 'x', timestamp: '2026-01-01T00:00:00Z',
    emotion: 0.5, tags: ['游戏'], inherited: false, description: '100小时', rarity: 'legendary',
    createdAt: '2026-01-01T00:00:00Z', ...over,
  }
}

describe('collectTimeInvestments · 五类真实数据源（修复 G2 数据源造假）', () => {
  it('game — 来自传入的逸趣阁收藏种子', () => {
    const recs = collectTimeInvestments(['game'], [gameSeed()])
    expect(recs).toHaveLength(1)
    expect(recs[0].category).toBe('game')
    expect(recs[0].rarity).toBe('legendary')
    expect(recs[0].id).toBe('game:g1')
    expect(recs[0].originalId).toBe('g1')
  })

  it('focus — 来自已完成专注会话', () => {
    const recs = collectTimeInvestments(['focus'], [])
    expect(recs).toHaveLength(1)
    expect(recs[0].category).toBe('focus')
    expect(recs[0].name).toBe('专注 · focus')
    expect(recs[0].description).toBe('读完一章')
  })

  it('exercise — 来自动律之间运动记录', () => {
    const recs = collectTimeInvestments(['exercise'], [])
    expect(recs).toHaveLength(1)
    expect(recs[0].category).toBe('exercise')
    expect(recs[0].name).toContain('跑步')
  })

  it('movie / travel — 当前应用无对应存储，返回空（诚实，不造假数据）', () => {
    expect(collectTimeInvestments(['movie'], [])).toHaveLength(0)
    expect(collectTimeInvestments(['travel'], [])).toHaveLength(0)
  })

  it('多类聚合 — 合并 game/focus/exercise 三类真实记录', () => {
    const recs = collectTimeInvestments(['game', 'focus', 'exercise'], [gameSeed()])
    expect(recs).toHaveLength(3)
    expect(new Set(recs.map(r => r.category))).toEqual(new Set(['game', 'focus', 'exercise']))
  })
})

describe('buildInvestmentPreview', () => {
  it('按授权类型过滤 + 高亮粒度裁剪为「名称/标签」', () => {
    const recs = collectTimeInvestments(['game', 'focus'], [gameSeed()])
    const auth: TransferAuthorization = { types: ['game'], granularity: 'highlight', permanent: false }
    const p = buildInvestmentPreview(recs, auth)
    expect(p.itemCount).toBe(1)
    expect(p.items[0].seedId).toBe('game:g1')
    expect(p.items[0].content).toBe('「塞尔达」游戏')
  })
})

describe('exportSeedGift / parseSeedGift（第46条礼包载体）', () => {
  it('打包并解析往返，内容快照与来源标记保留', () => {
    const recs = collectTimeInvestments(['game'], [gameSeed()])
    const gift = exportSeedGift(
      recs,
      { types: ['game'], granularity: 'highlight', permanent: false },
      { giftId: 't1', senderName: '此方庭院' },
    )
    expect(gift.giftId).toBe('t1')
    expect(gift.items).toHaveLength(1)
    expect(gift.items[0].originalId).toBe('g1')

    const parsed = parseSeedGift(stringifySeedGift(gift))
    expect(parsed?.giftId).toBe('t1')
    expect(parsed?.items[0].name).toBe('塞尔达')
    expect(parsed?.senderName).toBe('此方庭院')
  })

  it('parseSeedGift — 损坏/版本不符返回 null', () => {
    expect(parseSeedGift('bad')).toBeNull()
    expect(parseSeedGift(JSON.stringify({ version: '9.9', items: [] }))).toBeNull()
  })
})
