// ============================================================
// 自动归档引擎测试（任务② · data:auto-archive）
// 覆盖：宪法门控跳过 / 超阈值归档触发 / 近期不动 / 审计日志 / 可逆
// ============================================================

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { runAutoArchive, selectInactive, getAutoArchiveLog } from '../auto-archive'
import { useLightPavilion } from '../../light/pavilion'
import { getNoteStore } from '../../note'
import { storage } from '../../../engine/storage'
import type { MeditationRecord, ReleaseEntry } from '../../light/types'
import type { Note } from '../../../types'

// 隔离宪法门控：默认关闭，测试内按用例开启
vi.mock('../../../engine/constitution-effect', () => ({
  isTargetActive: vi.fn(() => false),
}))
import { isTargetActive } from '../../../engine/constitution-effect'

const DAY = 86_400_000
function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString()
}

function medRecord(id: string, ts: string): MeditationRecord {
  return {
    id, type: 'breath', duration: 5, stateBefore: 'a', stateAfter: 'b',
    date: ts.split('T')[0], timestamp: ts,
  }
}
function relEntry(id: string, dateIso: string): ReleaseEntry {
  return { id, content: 'x', method: 'write', released: true, date: dateIso.split('T')[0] }
}
function makeNote(id: string, updatedAt: string): Note {
  return {
    id, title: id, content: '', tags: [],
    createdAt: updatedAt, updatedAt,
  } as Note
}

describe('selectInactive（纯函数）', () => {
  it('仅选中「活跃且超阈值」条目', () => {
    const items = [
      { id: 'a', t: daysAgoIso(100), active: true },
      { id: 'b', t: daysAgoIso(10), active: true },
      { id: 'c', t: daysAgoIso(100), active: false },
    ]
    const sel = selectInactive(items, (i) => i.t, (i) => i.active, 90, new Date())
    expect(sel.map((s) => s.id)).toEqual(['a'])
  })
  it('iso 非法 → 永不选入', () => {
    const items = [{ id: 'x', t: 'not-a-date', active: true }]
    expect(selectInactive(items, (i) => i.t, (i) => i.active, 90, new Date())).toHaveLength(0)
  })
})

describe('runAutoArchive 宪法门控', () => {
  beforeEach(() => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)
    localStorage.clear()
    const p = useLightPavilion()
    p.meditations.value = []
    p.releases.value = []
    storage.setNotes([])
  })

  function seedNotes(...notes: Note[]) {
    storage.setNotes(notes)
    getNoteStore().load()
  }

  it('条款未启用 → skipped，零归档且无任何副作用', () => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(false)
    const p = useLightPavilion()
    p.meditations.value.push(medRecord('m1', daysAgoIso(200)))
    const res = runAutoArchive()
    expect(res.skipped).toBe(true)
    expect(res.total).toBe(0)
    expect(p.meditations.value[0].archived).toBeFalsy()
    expect(getAutoArchiveLog()).toHaveLength(0)
  })

  it('条款启用 → 超阈值冥想/释怀/笔记归档，近期不动', () => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const p = useLightPavilion()
    p.meditations.value = [medRecord('m1', daysAgoIso(200)), medRecord('m2', daysAgoIso(10))]
    p.releases.value = [relEntry('r1', daysAgoIso(200))]
    seedNotes(makeNote('n1', daysAgoIso(200)), makeNote('n2', daysAgoIso(10)))

    const res = runAutoArchive({ thresholdDays: 90 })
    expect(res.archivedMeditations).toBe(1)
    expect(res.archivedReleases).toBe(1)
    expect(res.archivedNotes).toBe(1)
    expect(res.total).toBe(3)

    // 近期项不被动
    expect(p.meditations.value.find((m) => m.id === 'm2')!.archived).toBeFalsy()
    expect(getNoteStore().allNotes.value.find((n) => n.id === 'n2')!.archived).toBeFalsy()
    // 超阈值项已归档
    expect(p.meditations.value.find((m) => m.id === 'm1')!.archived).toBe(true)
    expect(getNoteStore().allNotes.value.find((n) => n.id === 'n1')!.archived).toBe(true)
  })

  it('条款启用但无超阈值项 → total 0 且不写审计日志', () => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const p = useLightPavilion()
    p.meditations.value = [medRecord('m1', daysAgoIso(10))]
    seedNotes(makeNote('n1', daysAgoIso(10)))
    const before = getAutoArchiveLog().length
    const res = runAutoArchive({ thresholdDays: 90 })
    expect(res.total).toBe(0)
    expect(getAutoArchiveLog().length).toBe(before)
  })

  it('实际归档写入审计日志（含阈值与计数）', () => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const p = useLightPavilion()
    p.meditations.value = [medRecord('m1', daysAgoIso(200))]
    seedNotes(makeNote('n1', daysAgoIso(200)))
    runAutoArchive({ thresholdDays: 90 })
    const log = getAutoArchiveLog()
    expect(log).toHaveLength(1)
    expect(log[0].archivedMeditations).toBe(1)
    expect(log[0].archivedNotes).toBe(1)
    expect(log[0].thresholdDays).toBe(90)
  })

  it('归档可逆——restore 仍可将已归档项还原', () => {
    ;(isTargetActive as unknown as ReturnType<typeof vi.fn>).mockReturnValue(true)
    const p = useLightPavilion()
    p.meditations.value = [medRecord('m1', daysAgoIso(200))]
    runAutoArchive({ thresholdDays: 90 })
    expect(p.meditations.value[0].archived).toBe(true)
    // 还原机制来自留光阁既有能力，自动归档不破坏它
    expect(p.restoreMeditation('m1')).toBe(true)
    expect(p.meditations.value[0].archived).toBeFalsy()
  })
})
