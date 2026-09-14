// ============================================================
// useMeridianVisualization 经络可视化引擎测试（INCR-90）
// ============================================================
import { describe, it, expect } from 'vitest'
import { useMeridianVisualization } from '../meridian-visualization'
import type { MeridianRecord } from '../types'

function makeRecord(overrides: Partial<MeridianRecord> = {}): MeridianRecord {
  return {
    id: 'r1',
    meridian: 'liver',
    feeling: 'good',
    recordedAt: new Date().toISOString(),
    hour: 1,
    ...overrides,
  }
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

describe('useMeridianVisualization 经络可视化引擎', () => {
  it('computeClockNodes：生成 12 个时辰节点并统计健康率', () => {
    const { computeClockNodes } = useMeridianVisualization()
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'liver', feeling: 'bad' }),
      makeRecord({ meridian: 'lung', feeling: 'good' }),
    ]
    const nodes = computeClockNodes(records)
    expect(nodes.length).toBe(12)
    const liver = nodes.find(n => n.meridian === 'liver')
    expect(liver?.healthRate).toBe(50)
    expect(liver?.recordCount).toBe(2)
    expect(nodes.some(n => n.isCurrent)).toBe(true)
  })

  it('computeClockNodes：空记录时健康率为 0', () => {
    const { computeClockNodes } = useMeridianVisualization()
    const nodes = computeClockNodes([])
    expect(nodes.length).toBe(12)
    expect(nodes.every(n => n.healthRate === 0)).toBe(true)
  })

  it('getHourReminders：生成 12 条时辰提醒且恰有一条当前', () => {
    const { getHourReminders } = useMeridianVisualization()
    const reminders = getHourReminders()
    expect(reminders.length).toBe(12)
    expect(reminders.filter(r => r.isActive).length).toBe(1)
    expect(reminders[0].timeRange).toMatch(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  })

  it('getCurrentHourAdvice：返回当前/下一个/上一个', () => {
    const { getCurrentHourAdvice } = useMeridianVisualization()
    const advice = getCurrentHourAdvice()
    expect(advice.current.isActive).toBe(true)
    expect(advice.current.organ).toBeTruthy()
    expect(advice.next.organ).toBeTruthy()
    expect(advice.previous.organ).toBeTruthy()
  })

  it('computeHeatmapData：生成 12 经络 × 7 天数据并计算均值与趋势', () => {
    const { computeHeatmapData } = useMeridianVisualization()
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good', recordedAt: daysAgo(0) }),
      makeRecord({ meridian: 'liver', feeling: 'good', recordedAt: daysAgo(1) }),
      makeRecord({ meridian: 'liver', feeling: 'bad', recordedAt: daysAgo(2) }),
    ]
    const heatmap = computeHeatmapData(records)
    expect(heatmap.length).toBe(12)
    const liver = heatmap.find(h => h.meridian === 'liver')
    expect(liver?.dailyFeelings.length).toBe(7)
    expect(liver?.averageScore).toBeGreaterThan(0)
    expect(['improving', 'stable', 'declining']).toContain(liver?.trend)
  })

  it('computeHeatmapData：无记录时全部均值为 0', () => {
    const { computeHeatmapData } = useMeridianVisualization()
    const heatmap = computeHeatmapData([])
    expect(heatmap.every(h => h.averageScore === 0)).toBe(true)
  })

  it('getFiveElementRelations：返回 10 条生克关系', () => {
    const { getFiveElementRelations } = useMeridianVisualization()
    const relations = getFiveElementRelations()
    expect(relations.length).toBe(10)
    expect(relations.filter(r => r.type === 'generating').length).toBe(5)
    expect(relations.filter(r => r.type === 'controlling').length).toBe(5)
  })

  it('computeElementRelations：高健康率元素增强相生强度', () => {
    const { computeElementRelations } = useMeridianVisualization()
    // 木（liver/gallbladder）全部 good → 木生火强度增强
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'gallbladder', feeling: 'good' }),
    ]
    const relations = computeElementRelations(records)
    const woodFire = relations.find(r => r.label === '木生火')
    expect(woodFire?.strength).toBeGreaterThan(0.8)
  })

  it('getElementPositions：返回五行节点坐标', () => {
    const { getElementPositions } = useMeridianVisualization()
    const positions = getElementPositions()
    expect(positions.length).toBe(5)
    expect(positions.map(p => p.element).sort().join('')).toBe('土木水火金'.split('').sort().join(''))
  })

  it('computeTrendData：生成近 30 天趋势点', () => {
    const { computeTrendData } = useMeridianVisualization()
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good', recordedAt: daysAgo(0) }),
      makeRecord({ meridian: 'liver', feeling: 'good', recordedAt: daysAgo(1) }),
    ]
    const trend = computeTrendData(records, 'liver')
    expect(trend.length).toBe(30)
    const today = trend[trend.length - 1]
    expect(today.goodRate).toBe(100)
    expect(today.recordCount).toBe(1)
  })

  it('computeAggregateTrend：生成 7 天标签与 12 经络数据集', () => {
    const { computeAggregateTrend } = useMeridianVisualization()
    const result = computeAggregateTrend([])
    expect(result.labels.length).toBe(7)
    expect(result.datasets.length).toBe(12)
    expect(result.datasets[0].data.length).toBe(7)
  })

  it('computeHealthSummary：统计记录数与最佳/最差经络', () => {
    const { computeHealthSummary } = useMeridianVisualization()
    const records = [
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'liver', feeling: 'good' }),
      makeRecord({ meridian: 'lung', feeling: 'bad' }),
      makeRecord({ meridian: 'lung', feeling: 'bad' }),
      makeRecord({ meridian: 'lung', feeling: 'bad' }),
    ]
    const summary = computeHealthSummary(records)
    expect(summary.totalRecords).toBe(5)
    expect(summary.overallGoodRate).toBe(40)
    expect(summary.coveredMeridians).toBe(2)
    expect(summary.bestMeridian?.meridian).toBe('liver')
    expect(summary.worstMeridian?.meridian).toBe('lung')
    expect(['up', 'down', 'flat']).toContain(summary.recentTrend)
  })

  it('computeHealthSummary：空记录时统计为 0', () => {
    const { computeHealthSummary } = useMeridianVisualization()
    const summary = computeHealthSummary([])
    expect(summary.totalRecords).toBe(0)
    expect(summary.overallGoodRate).toBe(0)
    expect(summary.bestMeridian).toBeNull()
    expect(summary.worstMeridian).toBeNull()
  })

  it('selectMeridian / updateConfig：更新可视化配置', () => {
    const { selectMeridian, updateConfig, config } = useMeridianVisualization()
    selectMeridian('heart')
    expect(config.value.selectedMeridian).toBe('heart')
    updateConfig({ showLabels: false, animate: false })
    expect(config.value.showLabels).toBe(false)
    expect(config.value.animate).toBe(false)
  })
})
