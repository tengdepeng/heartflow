// ============================================================
// 时间线索引 · 时区治理（分片键 UTC 日 → 本地日历日）
//
// 覆盖三处 UTC 裸切日已统一为 utils/time.ts 的 getLocalDateKey：
//   - index.extractDate（分片键，D 类形态 iso.slice(0,10)）
//   - index.generateDateRange（日期范围推进）
//   - aggregation.getWeekKey / getHourKey / getKeyForGranularity（聚合键）
// 另修 rebuildSecondaryIndex 用 localStorage.key(i) 枚举分片的隐性缺陷
// （分片实际存在 kvStore 里，顶层 localStorage 看不到）。
// 东八区 00:00–08:00 发生的记录，用旧口径会被算到「前一天」。
//
// 反向验证：把实现改回 slice(0,10) / toISOString() 后，带「前提」标注的用例
// 应转红（非 UTC 时区下才有意义）。
// ============================================================

import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { IndexEntry } from '../types'

// ---- mock 辅助（与 index.test.ts 同惯例）----
function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

afterEach(() => {
  delete (globalThis as any).localStorage
})

/** 每个用例隔离模块与 localStorage，返回同一代际的 index 与 storage */
async function freshEnv() {
  vi.resetModules()
  mockLocalStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockLocalStorage
  const core = await import('../../../engine/storage/core')
  core.invalidateCache()
  const { storage } = await import('../../../engine/storage')
  const { useTimelineIndex } = await import('../index')
  return { idx: useTimelineIndex(), storage }
}

/** 本地某日某时 → UTC ISO 时间戳（东八区本地 03:00 = UTC 前一天 19:00） */
function localISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function mkEntry(ts: string, id: string): IndexEntry {
  return {
    indexId: id,
    timestamp: ts,
    type: 'note',
    roomSource: 'study',
    payloadRef: 'n1',
    summary: { snippet: '条目' },
    weight: 0.7,
    governance: {
      ageLevel: 1, agedAt: null, archived: false, archivedAt: null,
      released: false, releasedAt: null, deleted: false,
    },
    createdAt: ts,
    updatedAt: ts,
  }
}

/** 当前 kvStore 内的日期分片键（排除二级索引 meta 与迁移标记） */
function shardKeys(storage: { listKVKeys(): string[] }): string[] {
  return storage
    .listKVKeys()
    .filter(k => k.startsWith('hf:timeline_index:') && k !== 'hf:timeline_index:meta')
}

// ============================================================
// 分片键本地日历日
// ============================================================
describe('timeline-index · 分片键本地日历日', () => {
  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('凌晨条目归入本地当日分片，而非 UTC 前一天分片', async () => {
    const { idx, storage } = await freshEnv()
    const ts = localISO(2026, 3, 15, 3) // 本地 03-15 03:00 = UTC 03-14 19:00
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '凌晨笔记' }, timestamp: ts })

    const keys = shardKeys(storage)
    expect(keys).toContain('hf:timeline_index:2026-03-15')
    expect(keys).not.toContain('hf:timeline_index:2026-03-14')
  })

  it('queryByTime 按本地日范围能查到凌晨条目（旧口径会落到前一天）', async () => {
    const { idx } = await freshEnv()
    const ts = localISO(2026, 3, 15, 3)
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '凌晨笔记' }, timestamp: ts })

    const local = idx.queryByTime({ startDate: '2026-03-15', endDate: '2026-03-15' })
    expect(local.entries).toHaveLength(1)

    const utcDay = idx.queryByTime({ startDate: '2026-03-14', endDate: '2026-03-14' })
    expect(utcDay.entries).toHaveLength(0)
  })
})

// ============================================================
// rebuildSecondaryIndex · 从 kvStore 枚举分片
// ============================================================
describe('timeline-index · 二级索引重建枚举', () => {
  it('从 kvStore 枚举分片重建索引（不再依赖 localStorage.key）', async () => {
    const { idx, storage } = await freshEnv()
    const entry = mkEntry(localISO(2026, 3, 15, 10), 'e_seed')
    storage.setKV('hf:timeline_index:2026-03-15', [entry])

    expect(idx.rebuildSecondaryIndex()).toBe(true)
    // 旧实现用 localStorage.key(i) 枚举必然落空 → byId 为空 → 此处转红
    expect(idx.queryById('e_seed')).toBeDefined()
    expect(idx.getStats().totalEntries).toBe(1)
  })
})

// ============================================================
// 存量重分片迁移
// ============================================================
describe('timeline-index · 存量重分片迁移', () => {
  it('把 UTC 旧分片按本地日重归片，二级索引同步', async () => {
    const { idx, storage } = await freshEnv()
    const ts = localISO(2026, 3, 15, 3) // 本地 03-15，UTC 03-14
    // 旧实现会把它存进 UTC 日分片 03-14
    storage.setKV('hf:timeline_index:2026-03-14', [mkEntry(ts, 'e_old')])

    const r = idx.migrateShardKeysToLocalDay()
    expect(r.alreadyDone).toBe(false)
    expect(r.movedEntries).toBe(1)

    const keys = shardKeys(storage)
    expect(keys).toContain('hf:timeline_index:2026-03-15')
    expect(keys).not.toContain('hf:timeline_index:2026-03-14')
    expect(idx.queryById('e_old')?.timestamp).toBe(ts)
  })

  it('同日多条目跨旧分片合并到同一本地日分片', async () => {
    const { idx, storage } = await freshEnv()
    // 本地 03-15 00:00（UTC 03-14）与本地 03-15 23:00（UTC 03-15）
    const early = mkEntry(localISO(2026, 3, 15, 0), 'e_early')
    const late = mkEntry(localISO(2026, 3, 15, 23), 'e_late')
    storage.setKV('hf:timeline_index:2026-03-14', [early])
    storage.setKV('hf:timeline_index:2026-03-15', [late])

    const r = idx.migrateShardKeysToLocalDay()
    expect(r.movedEntries).toBe(2)
    expect(shardKeys(storage)).toEqual(['hf:timeline_index:2026-03-15'])
    expect(
      idx.queryByTime({ startDate: '2026-03-15', endDate: '2026-03-15' }).entries,
    ).toHaveLength(2)
  })

  it('迁移幂等：第二次调用跳过且分片不变', async () => {
    const { idx, storage } = await freshEnv()
    storage.setKV('hf:timeline_index:2026-03-14', [mkEntry(localISO(2026, 3, 15, 3), 'e_old')])

    idx.migrateShardKeysToLocalDay()
    const before = shardKeys(storage).sort()

    const r2 = idx.migrateShardKeysToLocalDay()
    expect(r2.alreadyDone).toBe(true)
    expect(shardKeys(storage).sort()).toEqual(before)
  })
})

// ============================================================
// 聚合键本地日历日
// ============================================================
describe('timeline-index · 聚合键本地日历日', () => {
  it('日粒度按本地日分组（凌晨条目不被算到 UTC 前一天）', async () => {
    const { useAggregation } = await import('../aggregation')
    const entries = [mkEntry(localISO(2026, 3, 15, 3), 'e1')]
    const { aggregate } = useAggregation(() => entries)
    const result = aggregate({ granularity: 'day', startDate: '2026-03-15', endDate: '2026-03-15' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0].key).toBe('2026-03-15')
  })

  it('小时粒度键的日期部分用本地日', async () => {
    const { useAggregation } = await import('../aggregation')
    const entries = [mkEntry(localISO(2026, 3, 15, 3), 'e1')]
    const { aggregate } = useAggregation(() => entries)
    const result = aggregate({ granularity: 'hour', startDate: '2026-03-15', endDate: '2026-03-15' })
    expect(result.items[0].key).toBe('2026-03-15T03')
  })

  it('周粒度键为本地周一', async () => {
    const { useAggregation } = await import('../aggregation')
    const entries = [mkEntry(localISO(2026, 3, 18, 12), 'e1')] // 2026-03-18 周三
    const { aggregate } = useAggregation(() => entries)
    const result = aggregate({ granularity: 'week', startDate: '2026-03-16', endDate: '2026-03-22' })
    expect(result.items[0].key).toBe('2026-03-16')
  })
})