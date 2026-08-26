import { describe, it, expect } from 'vitest'
import {
  autoArchiveGateMeta,
  collectArchivedItems,
  describeAutoArchive,
  ARCHIVE_THRESHOLD_OPTIONS,
  DEFAULT_THRESHOLD_DAYS,
} from '../auto-archive'

const MED = { id: 'm1', title: '晨间冥想', archived: true, archivedAt: '2026-01-01T00:00:00' }
const REL = { id: 'r1', title: '释怀一笔', archived: false, archivedAt: '2026-02-01T00:00:00' }
const NOTE_ARCH = { id: 'n1', title: '旧笔记', archived: true, archivedAt: '2026-03-01T00:00:00' }

const getters = {
  getId: (i: (typeof MED) & { archived?: boolean }) => i.id,
  getTitle: (i: (typeof MED) & { archived?: boolean }) => i.title,
  isArchived: (i: (typeof MED) & { archived?: boolean }) => Boolean(i.archived),
  getArchivedAt: (i: (typeof MED) & { archived?: boolean }) => i.archivedAt,
}

describe('autoArchiveGateMeta', () => {
  it('开关两种状态文案不同', () => {
    const on = autoArchiveGateMeta(true)
    const off = autoArchiveGateMeta(false)
    expect(on.label).toContain('开启')
    expect(off.label).toContain('未开启')
    expect(on.icon).not.toBe(off.icon)
  })
})

describe('collectArchivedItems', () => {
  it('只归拢已归档项并按归档时间倒序', () => {
    const items = collectArchivedItems({ meditations: [MED], releases: [REL], notes: [NOTE_ARCH], ...getters })
    expect(items).toHaveLength(2)
    expect(items[0].kind).toBe('note') // 2026-03 newest first
    expect(items[1].kind).toBe('meditation')
  })
  it('空输入返回空列表', () => {
    expect(collectArchivedItems({ meditations: [], releases: [], notes: [], ...getters })).toHaveLength(0)
  })
})

describe('describeAutoArchive', () => {
  it('skipped 与非 skipped 文案不同', () => {
    const skipped = describeAutoArchive({ skipped: true, thresholdDays: 90, archivedMeditations: 0, archivedReleases: 0, archivedNotes: 0, total: 0, ranAt: 'X' })
    expect(skipped).toContain('未开启')
    const ran = describeAutoArchive({ skipped: false, thresholdDays: 90, archivedMeditations: 2, archivedReleases: 1, archivedNotes: 3, total: 6, ranAt: 'X' })
    expect(ran).toContain('归档 6 条')
    expect(ran).toContain('冥想 2')
  })
})

describe('常量', () => {
  it('提供默认阈值与可选项', () => {
    expect(DEFAULT_THRESHOLD_DAYS).toBeGreaterThan(0)
    expect(ARCHIVE_THRESHOLD_OPTIONS.includes(DEFAULT_THRESHOLD_DAYS)).toBe(true)
  })
})