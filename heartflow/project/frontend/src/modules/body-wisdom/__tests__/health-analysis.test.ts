// ============================================================
// 藏象阁 · 健康分析引擎（health-analysis）测试
// 经络评分 / 经络详情 / 情绪脏腑关联 / 作息评分 / 综合报告 / 建议
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useHealthAnalysis } from '../health-analysis'
import { storage } from '../../../engine/storage'
import type { MeridianRecord, MoodRecord, MeridianType, ConstitutionType, OrganType } from '../types'

const ANALYSIS_KEY = 'hf:body-wisdom:health-analysis'

function makeMeridian(meridian: MeridianType, feeling: MeridianRecord['feeling'], hour: number, recordedAt: string): MeridianRecord {
  return { id: `${meridian}-${hour}-${recordedAt}`, meridian, feeling, recordedAt, hour }
}

function makeMood(mood: MoodRecord['mood'], relatedOrgan?: OrganType): MoodRecord {
  return { id: mood + '-' + Math.random(), mood, insight: '', recordedAt: '2026-08-01T10:00:00.000Z', relatedOrgan }
}

describe('calculateMeridianScore', () => {
  const h = useHealthAnalysis()

  it('空记录评分为 0', () => {
    expect(h.calculateMeridianScore([])).toBe(0)
  })

  it('全部良好为 100', () => {
    const recs = [
      makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z'),
      makeMeridian('liver', 'good', 1, '2026-08-01T01:00:00.000Z'),
    ]
    expect(h.calculateMeridianScore(recs)).toBe(100)
  })

  it('良好记 100、一般记 60、不良记 0', () => {
    const recs = [
      makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z'),
      makeMeridian('liver', 'ok', 1, '2026-08-01T01:00:00.000Z'),
      makeMeridian('kidney', 'bad', 17, '2026-08-01T17:00:00.000Z'),
    ]
    expect(h.calculateMeridianScore(recs)).toBe(Math.round(((100 + 60 + 0) / 300) * 100))
  })
})

describe('getMeridianDetails', () => {
  const h = useHealthAnalysis()

  it('按良好率升序排列，弱经在前', () => {
    const recs = [
      makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z'),
      makeMeridian('heart', 'good', 11, '2026-08-02T11:00:00.000Z'),
      makeMeridian('kidney', 'bad', 17, '2026-08-01T17:00:00.000Z'),
    ]
    const details = h.getMeridianDetails(recs)
    expect(details).toHaveLength(2)
    expect(details[0].meridian).toBe('kidney')
    expect(details[0].goodRate).toBe(0)
    expect(details[1].meridian).toBe('heart')
    expect(details[1].goodRate).toBe(1)
  })

  it('填充脏腑、五行与时辰建议', () => {
    const recs = [makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z')]
    const details = h.getMeridianDetails(recs)
    expect(details[0].organ).toBe('心')
    expect(details[0].element).toBe('fire')
    expect(details[0].hourAdvice).toContain('小憩')
  })

  it('趋势按最近7天前后半场良好比较', () => {
    const bad = (d: string) => makeMeridian('lung', 'bad', 3, d)
    const good = (d: string) => makeMeridian('lung', 'good', 3, d)
    // 数据按时间序为 先差后好 → 近期（最新优先切片的首半）良好率高于早期 → improving
    const improving = h.getMeridianDetails(
      [bad('2026-08-01T03:00:00.000Z'), bad('2026-08-02T03:00:00.000Z'), bad('2026-08-03T03:00:00.000Z'), good('2026-08-04T03:00:00.000Z'), good('2026-08-05T03:00:00.000Z')],
    )
    expect(improving.find(x => x.meridian === 'lung')?.trend).toBe('improving')
  })
})

describe('analyzeMoodOrganLinks', () => {
  const h = useHealthAnalysis()

  it('将情绪映射到对应脏腑并计算强度', () => {
    const moods = [
      makeMood('angry'),
      makeMood('angry'),
      makeMood('calm'),
    ]
    const links = h.analyzeMoodOrganLinks(moods)
    const angry = links.find(l => l.mood === 'angry')
    expect(angry?.organ).toBe('liver')
    expect(angry?.element).toBe('wood')
    expect(angry?.count).toBe(2)
    expect(angry?.strength).toBeCloseTo(2 / 3, 5)
  })

  it('优先使用记录的关联脏腑', () => {
    const moods = [makeMood('calm', 'kidney')]
    const links = h.analyzeMoodOrganLinks(moods)
    expect(links[0]).toMatchObject({ mood: 'calm', organ: 'kidney', element: 'water' })
  })

  it('按强度降序排列', () => {
    const moods = [makeMood('calm'), makeMood('sad'), makeMood('sad'), makeMood('sad')]
    const links = h.analyzeMoodOrganLinks(moods)
    expect(links[0].mood).toBe('sad')
  })
})

describe('calculateRhythmScore', () => {
  const h = useHealthAnalysis()

  it('空记录为 0', () => {
    expect(h.calculateRhythmScore([])).toBe(0)
  })

  it('覆盖 3 个时辰得对应比例', () => {
    const recs = [
      makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z'),
      makeMeridian('liver', 'ok', 1, '2026-08-01T01:00:00.000Z'),
      makeMeridian('kidney', 'good', 17, '2026-08-01T17:00:00.000Z'),
    ]
    expect(h.calculateRhythmScore(recs)).toBe(Math.round((3 / 12) * 100))
  })
})

describe('analyzeConstitutionTrend', () => {
  const h = useHealthAnalysis()

  it('按日期升序返回最近 30 条', () => {
    const points = [
      { date: '2026-08-03T00:00:00.000Z', type: 'balanced' as ConstitutionType, score: 60 },
      { date: '2026-08-01T00:00:00.000Z', type: 'balanced' as ConstitutionType, score: 70 },
    ]
    const out = h.analyzeConstitutionTrend(points)
    expect(out[0].date).toBe('2026-08-01T00:00:00.000Z')
    expect(out[1].score).toBe(60)
  })
})

describe('generateReport / 报告状态', () => {
  beforeEach(() => {
    storage.setKV(ANALYSIS_KEY, '[]')
  })

  it('综合评分按权重加权', () => {
    const h = useHealthAnalysis()
    const mer = [makeMeridian('heart', 'good', 11, '2026-08-01T11:00:00.000Z')]
    const mood = [makeMood('calm')]
    const trend = [{ date: '2026-08-01T00:00:00.000Z', type: 'balanced' as ConstitutionType, score: 80 }]
    const r = h.generateReport(mer, mood, trend)
    expect(r.meridianScore).toBe(100)
    expect(r.moodScore).toBe(100)
    expect(r.constitutionScore).toBe(80)
    expect(r.rhythmScore).toBeGreaterThan(0)
    expect(r.overallScore).toBe(
      Math.round(100 * 0.3 + 80 * 0.25 + 100 * 0.25 + r.rhythmScore * 0.2),
    )
    expect(r.id).toMatch(/^health_/)
    expect(r.generatedAt).toBeTruthy()
  })

  it('报告被持久化并可回溯历史', () => {
    const h = useHealthAnalysis()
    const first = h.generateReport([], [], [])
    const second = h.generateReport([], [], [])
    expect(h.reports.value).toHaveLength(2)
    expect(h.getReportHistory()).toHaveLength(2)
    expect(h.getReportHistory(1)).toHaveLength(1)
    // 最新报告为最近生成的一份
    expect(h.latestReport.value?.id).toBe(second.id)
    // id 现由 `health_${Date.now()}_${rand}` 生成，连续生成亦唯一
    expect(first.id).toMatch(/^health_/)
    expect(second.id).toMatch(/^health_/)
    expect(first.id).not.toBe(second.id)
  })

  it('弱经生成高优先建议', () => {
    const h = useHealthAnalysis()
    const recs = [
      makeMeridian('kidney', 'bad', 17, '2026-08-01T17:00:00.000Z'),
      makeMeridian('kidney', 'bad', 17, '2026-08-02T17:00:00.000Z'),
    ]
    const r = h.generateReport(recs, [], [])
    const rec = r.recommendations.find(x => x.category === 'lifestyle' && x.title.includes('肾'))
    expect(rec).toBeTruthy()
    expect(rec?.priority).toBe('high')
  })

  it('情绪强关联生成静心建议', () => {
    const h = useHealthAnalysis()
    const moods = [makeMood('angry'), makeMood('angry'), makeMood('angry')]
    const r = h.generateReport([], moods, [])
    expect(r.moodOrganLinks[0].strength).toBe(1)
    expect(r.recommendations.some(x => x.category === 'mindfulness')).toBe(true)
  })
})