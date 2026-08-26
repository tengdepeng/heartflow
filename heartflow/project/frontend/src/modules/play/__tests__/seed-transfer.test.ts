// ============================================================
// 时间种子传递治理层测试（宪法第46/47/48条）
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// 共享 kvStore 状态（参考 advisor 测试已验证的 vi.hoisted 模式）
const { getKvStore, resetKvStore } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
  }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: unknown) => {
      const store = getKvStore()
      return store[key] !== undefined ? (store[key] as unknown) : def
    },
    setKV: (key: string, val: unknown) => { getKvStore()[key] = val },
  },
}))

// 宪法效果引擎 mock：默认全部条款启用（保证既有用例维持原行为），门控用例中按目标切换
vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn((_t: string) => true),
}))

import {
  seedTransferType,
  defaultAuthorization,
  buildTransferPreview,
  recordTransfer,
  getTransferLogs,
  getTransferLog,
  revokeTransfer,
  isTransferViewable,
  isSeedInheritEnabled,
  isSeedScopeEnabled,
  isSeedRevokeEnabled,
  TRANSFER_TYPE_LABELS,
} from '../seed-transfer'
import { isTargetActive } from '../../../engine/constitution-effect'
import type { TimeSeed } from '../time-seed'

function setAllActive(active: boolean): void {
  vi.mocked(isTargetActive).mockImplementation(() => active)
}
function setActiveFor(map: Record<string, boolean>): void {
  vi.mocked(isTargetActive).mockImplementation((t: string) => map[t] ?? false)
}

function makeSeed(over: Partial<TimeSeed> = {}): TimeSeed {
  return {
    id: `seed_${Math.random()}`,
    name: '测试种子',
    source: 'game',
    sourceId: 'src_1',
    timestamp: '2026-01-01T00:00:00.000Z',
    emotion: 0.5,
    tags: ['游戏'],
    inherited: false,
    description: '完整描述：玩了100小时',
    rarity: 'rare',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

describe('seed-transfer · 类型映射', () => {
  it('seedTransferType — 逸趣阁种子统一归为「游戏记录」', () => {
    expect(seedTransferType(makeSeed({ source: 'game' }))).toBe('game')
    expect(seedTransferType(makeSeed({ source: 'toy' }))).toBe('game')
    expect(seedTransferType(makeSeed({ source: 'model' }))).toBe('game')
    expect(seedTransferType(makeSeed({ source: 'other' }))).toBe('game')
  })

  it('TRANSFER_TYPE_LABELS — 5 类传递类型齐全', () => {
    expect(Object.keys(TRANSFER_TYPE_LABELS)).toEqual(['exercise', 'game', 'movie', 'travel', 'focus'])
  })
})

describe('seed-transfer · 发送前预览（第47条）', () => {
  const seeds = [
    makeSeed({ id: 'a', name: 'A', description: '完整A', tags: ['游戏', 'RPG'] }),
    makeSeed({ id: 'b', name: 'B', description: '完整B', tags: ['游戏'] }),
  ]

  it('buildTransferPreview — 仅含授权类型，其余过滤', () => {
    const preview = buildTransferPreview(seeds, { types: ['game'], granularity: 'highlight', permanent: false })
    expect(preview.itemCount).toBe(2)
    expect(preview.authorizedTypes).toEqual([{ key: 'game', label: '游戏记录' }])
  })

  it('buildTransferPreview — 全细节粒度展示完整描述', () => {
    const preview = buildTransferPreview(seeds, { types: ['game'], granularity: 'full', permanent: false })
    expect(preview.granularityLabel).toBe('全部细节')
    expect(preview.items[0].content).toBe('完整A')
  })

  it('buildTransferPreview — 高亮摘要粒度裁剪为「名称/标签」', () => {
    const preview = buildTransferPreview(seeds, { types: ['game'], granularity: 'highlight', permanent: false })
    expect(preview.items[0].content).toBe('「A」游戏/RPG')
  })

  it('buildTransferPreview — 永久赠予标记透传', () => {
    const preview = buildTransferPreview(seeds, { types: ['game'], granularity: 'highlight', permanent: true })
    expect(preview.permanent).toBe(true)
  })
})

describe('seed-transfer · 传递日志（第47条·守护室日志）', () => {
  beforeEach(() => { resetKvStore() })

  it('recordTransfer — 写入日志并返回记录', () => {
    const log = recordTransfer(['a', 'b'], { types: ['game'], granularity: 'highlight', permanent: false }, 'receiver_x')!
    expect(log.id).toMatch(/^transfer_/)
    expect(log.seedIds).toEqual(['a', 'b'])
    expect(log.recipient).toBe('receiver_x')
    expect(log.revoked).toBe(false)
  })

  it('getTransferLogs — 按时间倒序返回全部', () => {
    const first = recordTransfer(['a'], defaultAuthorization())!
    const second = recordTransfer(['b'], defaultAuthorization())!
    const logs = getTransferLogs()
    // 倒序：后写入的 second 排在最前
    expect(logs[0].id).toBe(second.id)
    expect(logs[1].id).toBe(first.id)
    expect(logs.find(l => l.id === first.id)?.seedIds).toEqual(['a'])
  })

  it('getTransferLog — 按 ID 命中', () => {
    const created = recordTransfer(['a'], defaultAuthorization())!
    expect(getTransferLog(created.id)?.id).toBe(created.id)
    expect(getTransferLog('nope')).toBeUndefined()
  })
})

describe('seed-transfer · 收回（第48条·遗传的停止）', () => {
  beforeEach(() => { resetKvStore() })

  it('revokeTransfer — 可收回已发送的种子，标记 revoked', () => {
    const log = recordTransfer(['a'], { types: ['game'], granularity: 'highlight', permanent: false })!
    const res = revokeTransfer(log.id)
    expect(res.ok).toBe(true)
    expect(res.log?.revoked).toBe(true)
    expect(res.log?.revokedAt).toBeTruthy()
    expect(isTransferViewable(res.log!)).toBe(false)
  })

  it('revokeTransfer — 重复收回失败', () => {
    const log = recordTransfer(['a'], { types: ['game'], granularity: 'highlight', permanent: false })!
    revokeTransfer(log.id)
    const res = revokeTransfer(log.id)
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('该传递已收回')
  })

  it('revokeTransfer — 永久赠予不可收回', () => {
    const log = recordTransfer(['a'], { types: ['game'], granularity: 'highlight', permanent: true })!
    const res = revokeTransfer(log.id)
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('永久赠予的种子不可收回')
    expect(isTransferViewable(getTransferLog(log.id)!)).toBe(true)
  })

  it('revokeTransfer — 不存在的 ID 返回失败', () => {
    const res = revokeTransfer('transfer_ghost')
    expect(res.ok).toBe(false)
    expect(res.reason).toBe('未找到该传递记录')
  })
})

describe('seed-transfer · 宪法第46/47/48条门控（真实运行时生效）', () => {
  beforeEach(() => { resetKvStore(); setAllActive(true) })

  it('谓词随 isTargetActive 翻转（默认启用→true，全关→false）', () => {
    setAllActive(true)
    expect(isSeedInheritEnabled()).toBe(true)
    expect(isSeedScopeEnabled()).toBe(true)
    expect(isSeedRevokeEnabled()).toBe(true)
    setAllActive(false)
    expect(isSeedInheritEnabled()).toBe(false)
    expect(isSeedScopeEnabled()).toBe(false)
    expect(isSeedRevokeEnabled()).toBe(false)
  })

  it('谓词按目标分别判断', () => {
    setActiveFor({ 'seed:inherit': true, 'seed:scope': true, 'seed:revoke': false })
    expect(isSeedInheritEnabled()).toBe(true)
    expect(isSeedScopeEnabled()).toBe(true)
    expect(isSeedRevokeEnabled()).toBe(false)
  })

  it('第46条关闭：recordTransfer 返回 null 且不写日志', () => {
    setActiveFor({ 'seed:inherit': false, 'seed:scope': true, 'seed:revoke': true })
    const before = getTransferLogs().length
    const log = recordTransfer(['a'], defaultAuthorization())
    expect(log).toBeNull()
    expect(getTransferLogs().length).toBe(before)
  })

  it('第46条启用：recordTransfer 正常写入', () => {
    const log = recordTransfer(['a', 'b'], { types: ['game'], granularity: 'highlight', permanent: false }, 'rx')
    expect(log).not.toBeNull()
    expect(log!.seedIds).toEqual(['a', 'b'])
    expect(log!.recipient).toBe('rx')
  })

  it('第47条关闭：忽略用户范围，强制默认授权（仅游戏·高亮·可收回）', () => {
    setActiveFor({ 'seed:inherit': true, 'seed:scope': false, 'seed:revoke': true })
    const log = recordTransfer(
      ['a'],
      { types: ['game', 'movie', 'focus'], granularity: 'full', permanent: true },
    )
    expect(log).not.toBeNull()
    const def = defaultAuthorization()
    expect(log!.types).toEqual(def.types)
    expect(log!.granularity).toBe(def.granularity)
    expect(log!.permanent).toBe(def.permanent)
  })

  it('第47条启用：尊重用户选择的范围', () => {
    const log = recordTransfer(['a'], { types: ['game', 'movie'], granularity: 'full', permanent: true })
    expect(log!.types).toEqual(['game', 'movie'])
    expect(log!.granularity).toBe('full')
    expect(log!.permanent).toBe(true)
  })

  it('第48条关闭：revokeTransfer 拒绝收回并提示宪法第48条', () => {
    const log = recordTransfer(['a'], defaultAuthorization())!
    setActiveFor({ 'seed:inherit': true, 'seed:scope': true, 'seed:revoke': false })
    const res = revokeTransfer(log.id)
    expect(res.ok).toBe(false)
    expect(res.reason).toContain('第48条')
    expect(getTransferLog(log.id)?.revoked).toBe(false)
  })
})
