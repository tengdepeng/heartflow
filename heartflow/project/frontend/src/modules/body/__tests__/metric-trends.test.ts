// ============================================================
// 指标趋势引擎测试（metric-trends）
// 温和洞察 + 趋势/关联/预警
// ============================================================
import { describe, it, expect } from 'vitest'
import { metricTrendsInsights, useMetricTrends } from '../metric-trends'
import type { MetricCorrelation, TrendAlert } from '../metric-trends'
import type { BodyMetric } from '../types'

function daysAgo(n: number): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

/** 生成近 7 天 sleep + water 指标（每天两天数据），water 偏低以触发预警 */
function makeMetrics(): BodyMetric[] {
  const out: BodyMetric[] = []
  for (let i = 6; i >= 0; i--) {
    out.push({ id: `s_${i}`, type: 'sleep', value: 7.5, unit: '小时', timestamp: `${daysAgo(i)}T22:00:00.000Z`, date: daysAgo(i) })
    out.push({ id: `w_${i}`, type: 'water', value: 1100 + i * 60, unit: 'ml', timestamp: `${daysAgo(i)}T10:00:00.000Z`, date: daysAgo(i) })
  }
  return out
}

function makeCorrelation(overrides: Partial<MetricCorrelation> = {}): MetricCorrelation {
  return {
    metricA: 'sleep', metricALabel: '睡眠', metricB: 'water', metricBLabel: '饮水',
    coefficient: 0.82, strength: 'strong_positive', pValue: 0.01, isSignificant: true,
    sampleSize: 7, interpretation: '睡眠与饮水强正相关', lagDays: 0,
    ...overrides,
  }
}

function makeAlert(overrides: Partial<TrendAlert> = {}): TrendAlert {
  return {
    id: 'al_1', metricType: 'water', metricLabel: '饮水', type: 'declining_trend', severity: 'warning',
    title: '饮水呈下降趋势', description: '饮水在近 7 天中呈下降趋势', currentValue: 1100, threshold: 2000,
    changeRate: -12, suggestion: '建议关注饮水变化', generatedAt: new Date().toISOString(), acknowledged: false,
    ...overrides,
  }
}

describe('metricTrendsInsights 温和洞察', () => {
  it('无分析时给出守候引导', () => {
    const insights = metricTrendsInsights(null)
    expect(insights.length).toBe(1)
    expect(insights[0]).toContain('趋势还没生成')
  })

  it('有分析时包含追踪与达标概况', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    const insights = metricTrendsInsights(analysis)
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
    expect(insights.some(s => s.includes('共追踪'))).toBe(true)
  })

  it('包含最佳指标观察', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    const best = analysis.bestMetric
    expect(best).toBeTruthy()
    const insights = metricTrendsInsights(analysis)
    expect(insights.some(s => s.includes(best!.label))).toBe(true)
  })

  it('存在显著关联时包含关联观察', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    const insights = metricTrendsInsights(analysis, [makeCorrelation()], [])
    expect(insights.some(s => s.includes('关联线索'))).toBe(true)
  })

  it('存在预警时包含预警观察', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    const insights = metricTrendsInsights(analysis, [], [makeAlert()])
    expect(insights.some(s => s.includes('趋势预警'))).toBe(true)
  })

  it('观察不超过 4 条', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    const insights = metricTrendsInsights(analysis, [makeCorrelation()], [makeAlert()])
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})

describe('useMetricTrends 趋势/关联/预警', () => {
  it('数据充足时生成指标趋势并给出最佳指标', () => {
    const mt = useMetricTrends()
    const analysis = mt.computeTrend(makeMetrics(), { days: 30 })
    expect(analysis.metricTrends.length).toBeGreaterThanOrEqual(2)
    expect(analysis.bestMetric).toBeTruthy()
    expect(analysis.overallAssessment).toBeTruthy()
  })

  it('数据不足时不生成趋势并给引导文案', () => {
    const mt = useMetricTrends()
    const single: BodyMetric[] = [{ id: 'x', type: 'sleep', value: 7, unit: '小时', timestamp: '2026-09-01T00:00:00.000Z', date: '2026-09-01' }]
    const analysis = mt.computeTrend(single, { days: 30 })
    expect(analysis.metricTrends.length).toBe(0)
    expect(analysis.overallAssessment).toContain('暂无足够的趋势数据')
  })

  it('样本足够时找到指标关联', () => {
    const mt = useMetricTrends()
    const correlations = mt.findCorrelations(makeMetrics())
    expect(Array.isArray(correlations)).toBe(true)
    expect(correlations.length).toBeGreaterThan(0)
  })

  it('生成趋势预警返回数组', () => {
    const mt = useMetricTrends()
    const alerts = mt.generateTrendAlerts(makeMetrics())
    expect(Array.isArray(alerts)).toBe(true)
  })
})