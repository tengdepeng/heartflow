// ============================================================
// 健康报告引擎测试（health-report）
// 温和洞察 + 报告生成
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import { healthReportInsights } from '../health-report'
import type { HealthReport } from '../health-report'
import type { BodyMetric } from '../types'

function makeReport(overrides: Partial<HealthReport> = {}): HealthReport {
  return {
    id: 'rpt_test',
    title: '测试健康周报',
    period: 'weekly',
    dateRange: { start: '2026-08-25', end: '2026-08-31' },
    generatedAt: '2026-09-01T00:00:00.000Z',
    summary: {
      overallScore: 78,
      grade: 'good',
      scoreChange: 5,
      keyFindings: ['整体健康状况良好，各项指标正常'],
      highlights: ['睡眠时长良好，平均 7.5 小时/天'],
      concerns: ['运动量不足，本周仅 60 分钟（推荐 150 分钟）'],
      trackingDays: 7,
      dataCompleteness: 0.8,
    },
    sections: [],
    anomalyReport: null,
    recommendations: [],
    templateId: 'template-weekly-default',
    read: false,
    bookmarked: false,
    ...overrides,
  }
}

describe('healthReportInsights 温和洞察', () => {
  it('无报告时给出守候引导', () => {
    const insights = healthReportInsights(null)
    expect(insights.length).toBe(1)
    expect(insights[0]).toContain('暂无健康报告')
  })

  it('有报告时包含亮点/需关注与追踪信息', () => {
    const insights = healthReportInsights(makeReport())
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
    expect(insights.some(s => s.includes('亮点'))).toBe(true)
    expect(insights.some(s => s.includes('需关注'))).toBe(true)
    expect(insights.some(s => s.includes('已追踪 7 天'))).toBe(true)
  })

  it('存在异常时仍输出温和洞察', () => {
    const report = makeReport({
      anomalyReport: {
        totalAnomalies: 2,
        bySeverity: { critical: 0, warning: 1, info: 1 },
        byCategory: { metric_deviation: 0, sleep_disorder: 1, trend_reversal: 0, correlation_alert: 0, consistency_break: 1, threshold_breach: 0 },
        riskScore: 60,
        generatedAt: '2026-08-31T00:00:00.000Z',
        overallAssessment: '存在轻度异常',
        priorityActions: ['提前就寝'],
        anomalies: [
          { id: 'a1', severity: 'warning', category: 'sleep_disorder', metricType: 'sleep', title: '睡眠不足', description: '平均睡眠时长偏低', detectedValue: 5.5, expectedRange: [7, 9], deviationPercent: 21, detectedAt: '2026-08-30', relatedDataPoints: 7, suggestedAction: '提前就寝', acknowledged: false, resolved: false },
        ],
      },
    })
    const insights = healthReportInsights(report)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})

describe('useHealthReport 报告生成', () => {
  async function setup() {
    vi.resetModules()
    const storageMock = createMockStorage()
    storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
    ;(globalThis as any).localStorage = storageMock
    invalidateCache()
    return await import('../health-report')
  }

  it('generateReport 生成周报并持久化', async () => {
    const { useHealthReport } = await setup()
    const hr = useHealthReport()
    const now = new Date()
    const metrics: BodyMetric[] = [
      { id: 'm1', type: 'sleep', value: 7.5, unit: '小时', timestamp: now.toISOString(), date: now.toISOString().split('T')[0] },
      { id: 'm2', type: 'exercise', value: 30, unit: '分钟', timestamp: now.toISOString(), date: now.toISOString().split('T')[0] },
    ]
    const sleep = [
      { id: 's1', sleepAt: now.toISOString(), wakeAt: now.toISOString(), duration: 450, quality: 4, date: now.toISOString().split('T')[0] },
    ]
    const report = hr.generateReport('weekly', { metrics, sleepRecords: sleep })
    expect(report.period).toBe('weekly')
    expect(report.summary.overallScore).toBeGreaterThanOrEqual(0)
    expect(report.summary.overallScore).toBeLessThanOrEqual(100)
    expect(hr.getLatestReport('weekly')?.id).toBe(report.id)
    expect(hr.getHistoricalReports('weekly').length).toBe(1)
  })

  it('空数据生成报告评分为 0', async () => {
    const { useHealthReport } = await setup()
    const hr = useHealthReport()
    const report = hr.generateReport('daily')
    expect(report.summary.overallScore).toBe(0)
    expect(report.summary.grade).toBe('poor')
  })
})
