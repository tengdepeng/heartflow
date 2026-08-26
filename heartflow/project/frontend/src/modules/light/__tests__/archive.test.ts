// ============================================================
// 留光阁 · 归档能力测试（第34条：允许遗忘，归档而非删除）
// ============================================================
import { describe, expect, it } from 'vitest'
import { useLightPavilion } from '../pavilion'

describe('留光阁 归档', () => {
  const pavilion = useLightPavilion()

  it('冥想记录默认未归档，active 包含它、archived 为空', () => {
    const rec = pavilion.recordMeditation('breath', 10, 'anxious', 'calm')
    expect(rec.archived).toBeFalsy()
    expect(pavilion.activeMeditations.value.some(m => m.id === rec.id)).toBe(true)
    expect(pavilion.archivedMeditations.value.some(m => m.id === rec.id)).toBe(false)
  })

  it('archiveMeditation 将冥想移入已归档、移出活跃', () => {
    const rec = pavilion.recordMeditation('body_scan', 15, 'neutral', 'peaceful')
    expect(pavilion.archiveMeditation(rec.id)).toBe(true)
    expect(pavilion.archivedMeditations.value.some(m => m.id === rec.id)).toBe(true)
    expect(pavilion.activeMeditations.value.some(m => m.id === rec.id)).toBe(false)
  })

  it('restoreMeditation 将冥想移回活跃', () => {
    const rec = pavilion.recordMeditation('mantra', 5, 'clouded', 'neutral')
    pavilion.archiveMeditation(rec.id)
    expect(pavilion.restoreMeditation(rec.id)).toBe(true)
    expect(pavilion.activeMeditations.value.some(m => m.id === rec.id)).toBe(true)
    expect(pavilion.archivedMeditations.value.some(m => m.id === rec.id)).toBe(false)
  })

  it('archiveMeditation 对不存在的 id 返回 false', () => {
    expect(pavilion.archiveMeditation('nope')).toBe(false)
  })

  it('释怀条目归档后进入 archivedReleases 并移出活跃', () => {
    const entry = pavilion.release('放下', 'write', '轻松')
    expect(pavilion.activeReleases.value.some(r => r.id === entry.id)).toBe(true)
    expect(pavilion.archiveRelease(entry.id)).toBe(true)
    expect(pavilion.archivedReleases.value.some(r => r.id === entry.id)).toBe(true)
    expect(pavilion.activeReleases.value.some(r => r.id === entry.id)).toBe(false)
  })

  it('restoreRelease 将释怀移回活跃', () => {
    const entry = pavilion.release('执念', 'burn')
    pavilion.archiveRelease(entry.id)
    expect(pavilion.restoreRelease(entry.id)).toBe(true)
    expect(pavilion.activeReleases.value.some(r => r.id === entry.id)).toBe(true)
  })
})
