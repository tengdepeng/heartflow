// ============================================================
// 接收端时间种子测试（第46条落点 / 第48条反收回变暗）
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
    getSessions: () => [],
  },
}))

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => true),
}))

import {
  addReceivedSeedsFromGift,
  importSeedGift,
  getReceivedSeeds,
  getReceivedSeed,
  plantSeed,
  admireSeed,
  rejectSeed,
  removeReceivedSeed,
  markRevokedByGift,
} from '../received-seed'
import type { SeedGiftPayload } from '../seed-transfer'

function makeItem(over: Partial<SeedGiftPayload['items'][number]> = {}) {
  return {
    category: 'game' as const,
    name: '塞尔达',
    description: '100小时',
    tags: ['游戏'],
    rarity: 'legendary' as const,
    timestamp: '2026-01-01T00:00:00.000Z',
    originalId: 's1',
    ...over,
  }
}

function makeGift(over: Partial<SeedGiftPayload> = {}) {
  return {
    version: '1.0' as const,
    giftId: `transfer_${Math.random().toString(36).slice(2, 7)}`,
    senderName: '友方庭院',
    granularity: 'highlight' as const,
    permanent: false,
    exportedAt: '2026-01-01T00:00:00.000Z',
    items: [makeItem(), makeItem({ category: 'focus', name: '专注·focus', description: '30分钟', tags: ['deep'], rarity: undefined, originalId: 'f1' })],
    ...over,
  }
}

describe('received-seed · 导入落匣（第46条）', () => {
  beforeEach(() => resetKvStore())

  it('addReceivedSeedsFromGift — 每条礼包记录落为一枚 floating 切片，来源标记不可篡改', () => {
    const added = addReceivedSeedsFromGift(makeGift())
    expect(added).toHaveLength(2)
    expect(added.every(s => s.state === 'floating')).toBe(true)
    expect(added[0].senderName).toBe('友方庭院')
    expect(added[0].giftId).toBe(added[1].giftId)
    expect(getReceivedSeeds()).toHaveLength(2)
  })

  it('importSeedGift — JSON 往返成功，损坏/版本不符返回 null', () => {
    const json = JSON.stringify(makeGift())
    expect(importSeedGift(json)).toHaveLength(2)
    expect(importSeedGift('not json')).toBeNull()
    expect(importSeedGift(JSON.stringify({ version: '9.9', items: [] }))).toBeNull()
  })
})

describe('received-seed · 状态机（种下/观赏/拒绝）', () => {
  beforeEach(() => resetKvStore())

  it('plant → admire → reject 切换状态', () => {
    const [s] = addReceivedSeedsFromGift(makeGift({ items: [makeItem()] }))
    expect(plantSeed(s.id)).toBe(true)
    expect(getReceivedSeed(s.id)!.state).toBe('planted')
    expect(admireSeed(s.id)).toBe(true)
    expect(getReceivedSeed(s.id)!.state).toBe('admired')
    expect(rejectSeed(s.id)).toBe(true)
    expect(getReceivedSeed(s.id)!.state).toBe('rejected')
  })

  it('removeReceivedSeed — 移除并返回 true；未知 id 返回 false', () => {
    const [s] = addReceivedSeedsFromGift(makeGift({ items: [makeItem()] }))
    expect(removeReceivedSeed(s.id)).toBe(true)
    expect(getReceivedSeeds()).toHaveLength(0)
    expect(removeReceivedSeed('nope')).toBe(false)
  })
})

describe('received-seed · 第48条反收回联动（变暗不可展开）', () => {
  beforeEach(() => resetKvStore())

  it('markRevokedByGift — 同 giftId 切片变暗(revoked)，已拒绝的不受影响', () => {
    const gift = makeGift()
    const added = addReceivedSeedsFromGift(gift)
    rejectSeed(added[0].id) // 先拒绝第一枚
    const n = markRevokedByGift(gift.giftId)
    expect(n).toBe(1) // 仅未拒绝的那枚变暗
    expect(getReceivedSeed(added[0].id)!.state).toBe('rejected')
    expect(getReceivedSeed(added[1].id)!.state).toBe('revoked')
  })

  it('revoked 切片不可再 setState', () => {
    const gift = makeGift()
    const [s] = addReceivedSeedsFromGift(gift)
    markRevokedByGift(gift.giftId)
    expect(plantSeed(s.id)).toBe(false)
    expect(admireSeed(s.id)).toBe(false)
    expect(rejectSeed(s.id)).toBe(false)
  })

  it('markRevokedByGift — 未知 giftId 返回 0', () => {
    expect(markRevokedByGift('ghost')).toBe(0)
  })
})
