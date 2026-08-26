// ============================================================
// manual-cleanup（data:cleanup · 任务② B 类样板）· 单元测试
// 验证：宪法门控、候选筛选、软归档纯函数、可逆、门控下绝不静默动数据。
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => false),
}))
vi.mock('../../../engine/storage/session', () => ({
  getSessions: vi.fn(() => []),
  updateSession: vi.fn(),
  setSessions: vi.fn(),
}))

import { isTargetActive } from '../../../engine/constitution-effect'
import { getSessions, updateSession } from '../../../engine/storage/session'
import {
  isCleanupEnabled,
  listCleanupCandidates,
  applySoftArchive,
  applyRestore,
  softCleanup,
  restoreCleanup,
  getCleanupCandidates,
  CLEANUP_RETENTION_DAYS,
} from '../manual-cleanup'
import type { FocusSession } from '../../../types'

const DAY = 86_400_000

function makeSession(over: Partial<FocusSession> = {}): FocusSession {
  return {
    id: 's1',
    status: 'completed',
    mode: 'focus',
    plannedDuration: DAY,
    elapsed: DAY,
    startedAt: null,
    pausedDuration: 0,
    pausedAt: null,
    completedAt: new Date(Date.now() - 400 * DAY).toISOString(),
    tags: [],
    note: '',
    carrierId: null,
    ...over,
  }
}

describe('isCleanupEnabled 宪法门控', () => {
  beforeEach(() => vi.clearAllMocks())

  it('直接透传 isTargetActive("data:cleanup")', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    expect(isCleanupEnabled()).toBe(true)
    expect(isTargetActive).toHaveBeenCalledWith('data:cleanup')
    vi.mocked(isTargetActive).mockReturnValue(false)
    expect(isCleanupEnabled()).toBe(false)
  })
})

describe('listCleanupCandidates 纯函数筛选', () => {
  const now = Date.now()

  it('仅选中「已完成 + 未归档 + 超期」的会话', () => {
    const sessions: FocusSession[] = [
      makeSession({ id: 'old', completedAt: new Date(now - 400 * DAY).toISOString() }),
      makeSession({ id: 'recent', completedAt: new Date(now - 10 * DAY).toISOString() }),
      makeSession({ id: 'archived', archived: true, completedAt: new Date(now - 400 * DAY).toISOString() }),
      makeSession({ id: 'incomplete', status: 'focusing', completedAt: null }),
      makeSession({ id: 'noDate', completedAt: null }),
    ]
    const got = listCleanupCandidates(sessions, 365, now)
    expect(got.map((s) => s.id)).toEqual(['old'])
  })

  it('保留期边界：恰好等于 retentionDays 天前不选入，超过才选入', () => {
    const exactly = makeSession({ id: 'exact', completedAt: new Date(now - 365 * DAY).toISOString() })
    const over = makeSession({ id: 'over', completedAt: new Date(now - 365 * DAY - 1).toISOString() })
    expect(listCleanupCandidates([exactly], 365, now).map((s) => s.id)).toEqual([])
    expect(listCleanupCandidates([over], 365, now).map((s) => s.id)).toEqual(['over'])
  })

  it('默认阈值即 CLEANUP_RETENTION_DAYS（365）', () => {
    expect(CLEANUP_RETENTION_DAYS).toBe(365)
  })
})

describe('applySoftArchive / applyRestore 纯函数', () => {
  it('applySoftArchive 标记 archived 且不修改入参', () => {
    const src = [makeSession({ id: 'a' }), makeSession({ id: 'b' })]
    const out = applySoftArchive(src, ['a'])
    expect(out.find((s) => s.id === 'a')!.archived).toBe(true)
    expect(out.find((s) => s.id === 'b')!.archived).toBeUndefined()
    // 入参未被篡改
    expect(src.find((s) => s.id === 'a')!.archived).toBeUndefined()
  })

  it('applyRestore 将 archived 复位为 false 且不修改入参', () => {
    const src = [makeSession({ id: 'a', archived: true })]
    const out = applyRestore(src, ['a'])
    expect(out.find((s) => s.id === 'a')!.archived).toBe(false)
    expect(src.find((s) => s.id === 'a')!.archived).toBe(true)
  })
})

describe('softCleanup / restoreCleanup 运行时行为', () => {
  beforeEach(() => vi.clearAllMocks())

  it('门控关闭时返回 0 且不触碰存储（绝不静默动数据）', () => {
    vi.mocked(isTargetActive).mockReturnValue(false)
    const n = softCleanup(['a', 'b'])
    expect(n).toBe(0)
    expect(updateSession).not.toHaveBeenCalled()
  })

  it('门控开启时对每个 id 调用 updateSession 并返回计数', () => {
    vi.mocked(isTargetActive).mockReturnValue(true)
    const n = softCleanup(['a', 'b', 'c'])
    expect(n).toBe(3)
    expect(updateSession).toHaveBeenCalledTimes(3)
    expect(updateSession).toHaveBeenCalledWith('a', { archived: true })
    expect(updateSession).toHaveBeenCalledWith('c', { archived: true })
  })

  it('restoreCleanup 对每个 id 调用 updateSession({ archived:false }) 并返回计数', () => {
    const n = restoreCleanup(['a', 'b'])
    expect(n).toBe(2)
    expect(updateSession).toHaveBeenCalledWith('a', { archived: false })
    expect(updateSession).toHaveBeenCalledWith('b', { archived: false })
  })
})

describe('getCleanupCandidates 便捷读取', () => {
  beforeEach(() => vi.clearAllMocks())

  it('从 getSessions() 过滤出超期可整理项', () => {
    const now = Date.now()
    vi.mocked(getSessions).mockReturnValue([
      makeSession({ id: 'old', completedAt: new Date(now - 400 * DAY).toISOString() }),
      makeSession({ id: 'recent', completedAt: new Date(now - 10 * DAY).toISOString() }),
    ])
    const got = getCleanupCandidates(365)
    expect(got.map((s) => s.id)).toEqual(['old'])
  })
})
