// ============================================================
// 藏象阁 · 经络自检（five-movements / useMeridianCheck）测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useMeridianCheck } from '../five-movements'
import { storage } from '../../../engine/storage'
import type { MeridianRecord, MeridianType } from '../types'

const CHECK_KEY = 'hf:body-wisdom:check-reports'

function rec(meridian: MeridianType, feeling: MeridianRecord['feeling'], hour: number, date: string): MeridianRecord {
  return { id: `${meridian}-${hour}`, meridian, feeling, hour, recordedAt: `${date}T${String(hour).padStart(2, '0')}:00:00.000Z` }
}

describe('performMeridianCheck', () => {
  beforeEach(() => {
    storage.setKV(CHECK_KEY, [])
  })

  it('无记录时评分为 100、无问题经络', () => {
    const c = useMeridianCheck()
    const r = c.performMeridianCheck([])
    expect(r.overallScore).toBe(100)
    expect(r.issues).toHaveLength(0)
    expect(r.worstMeridian).toBeNull()
    expect(r.recommendations.length).toBeGreaterThan(0)
  })

  it('负面占比超 50% 记 severe 问题', () => {
    const c = useMeridianCheck()
    const r = c.performMeridianCheck([
      rec('heart', 'bad', 11, '2026-08-01'),
      rec('heart', 'bad', 11, '2026-08-02'),
    ])
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toMatchObject({ meridian: 'heart', severity: 'severe', organ: '心' })
    expect(r.issues[0].relatedEmotion).toBe('狂喜')
    expect(r.issues[0].remedy.length).toBeGreaterThan(0)
    expect(r.worstMeridian).toBe('heart')
    expect(r.overallScore).toBe(0)
    expect(r.recommendations.some(x => x.includes('及时就医'))).toBe(true)
  })

  it('负面占比 30%-50% 记 moderate', () => {
    const c = useMeridianCheck()
    const r = c.performMeridianCheck([
      rec('kidney', 'ok', 17, '2026-08-01'),
      rec('kidney', 'bad', 17, '2026-08-02'),
    ])
    expect(r.issues).toHaveLength(1)
    expect(r.issues[0]).toMatchObject({ meridian: 'kidney', severity: 'moderate', organ: '肾' })
    expect(r.overallScore).toBe(25)
  })

  it('整体评分取各经络平均', () => {
    const c = useMeridianCheck()
    const r = c.performMeridianCheck([
      rec('heart', 'good', 11, '2026-08-01'),
      rec('kidney', 'bad', 17, '2026-08-01'),
    ])
    // heart: (100+0)/1=100, kidney: 0 → 平均 50
    expect(r.overallScore).toBe(50)
  })
})

describe('报告持久化与最新报告', () => {
  beforeEach(() => {
    storage.setKV(CHECK_KEY, [])
  })

  it('每次自检保存并可回溯，latestReport 取最新', () => {
    const c = useMeridianCheck()
    expect(c.loadCheckReports()).toEqual([])
    c.performMeridianCheck([rec('heart', 'bad', 11, '2026-08-01')])
    const second = c.performMeridianCheck([rec('heart', 'bad', 11, '2026-08-02')])
    expect(c.checkReports.value).toHaveLength(2)
    expect(c.latestReport.value?.checkedAt).toBe(second.checkedAt)
  })
})