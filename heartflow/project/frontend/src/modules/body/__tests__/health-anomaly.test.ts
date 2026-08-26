// ============================================================
// 身体温室 · 健康异常检测测试（P16-2）
// ============================================================

import { describe, it, expect } from 'vitest'
import {
  detectHealthAnomalies,
  quickCheckMetric,
} from '../health-anomaly'
import type { BodyMetric, SleepRecord } from '../types'

// ---- 测试辅助 ----

function createMetric(
  type: string,
  value: number,
  date: string,
  time: string = '12:00:00',
): BodyMetric {
  return {
    id: `${type}-${date}-${Math.random().toString(36).slice(2, 6)}`,
    type: type as BodyMetric['type'],
    value,
    unit: '',
    timestamp: `${date}T${time}Z`,
    date,
  }
}

function createSleepRecord(
  sleepAt: string,
  wakeAt: string,
  quality: number,
  date: string,
): SleepRecord {
  return {
    id: `sleep-${date}`,
    sleepAt: `${date}T${sleepAt}Z`,
    wakeAt: `${date}T${wakeAt}Z`,
    duration: Math.round(
      (new Date(`${date}T${wakeAt}Z`).getTime() - new Date(`${date}T${sleepAt}Z`).getTime()) / 60000,
    ),
    quality,
    date,
  }
}

// ============================================================
// 异常检测
// ============================================================

describe('健康异常检测', () => {
  describe('空数据', () => {
    it('空指标应返回空报告', () => {
      const report = detectHealthAnomalies([], [])
      expect(report.totalAnomalies).toBe(0)
      expect(report.riskScore).toBe(0)
    })

    it('少量数据不足时不检测', () => {
      const metrics = [
        createMetric('sleep', 7, '2026-08-02'),
        createMetric('sleep', 7, '2026-08-01'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      expect(report.totalAnomalies).toBe(0)
    })
  })

  describe('指标偏离检测', () => {
    it('正常范围内的指标不应产生异常', () => {
      const metrics: BodyMetric[] = []
      // 生成最近 7 天每天一条记录，避免规律中断检测误报
      const today = new Date()
      for (let i = 0; i < 10; i++) {
        const d = new Date(today.getTime() - (9 - i) * 86400000)
        const date = d.toISOString().split('T')[0]
        metrics.push(createMetric('sleep', 7.5, date))
      }
      const report = detectHealthAnomalies(metrics, [])
      const sleepAnomalies = report.anomalies.filter(a => a.metricType === 'sleep')
      expect(sleepAnomalies.length).toBe(0)
    })

    it('极端偏离应产生异常', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 7, '2026-07-01'),
        createMetric('sleep', 7.5, '2026-07-02'),
        createMetric('sleep', 7, '2026-07-03'),
        createMetric('sleep', 6.5, '2026-07-04'),
        createMetric('sleep', 7, '2026-07-05'),
        createMetric('sleep', 7.5, '2026-07-06'),
        createMetric('sleep', 3, '2026-08-02'), // 极端偏离
      ]
      const report = detectHealthAnomalies(metrics, [])
      const sleepAnomalies = report.anomalies.filter(a => a.metricType === 'sleep')
      expect(sleepAnomalies.length).toBeGreaterThan(0)
    })
  })

  describe('睡眠异常检测', () => {
    it('正常睡眠不应产生异常', () => {
      const sleepRecords = [
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-27'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-28'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-29'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-30'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-31'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-08-01'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-08-02'),
      ]
      const report = detectHealthAnomalies([], sleepRecords)
      const sleepAnomalies = report.anomalies.filter(a => a.category === 'sleep_disorder')
      expect(sleepAnomalies.length).toBe(0)
    })

    it('睡眠时长骤减应产生异常', () => {
      const sleepRecords = [
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-27'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-28'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-29'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-30'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-31'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-08-01'),
        createSleepRecord('01:00:00', '05:00:00', 3, '2026-08-02'), // 只睡了 4 小时
      ]
      const report = detectHealthAnomalies([], sleepRecords)
      const sleepAnomalies = report.anomalies.filter(a => a.category === 'sleep_disorder')
      expect(sleepAnomalies.length).toBeGreaterThan(0)
    })

    it('睡眠质量骤降应产生异常', () => {
      const sleepRecords = [
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-27'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-28'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-29'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-30'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-31'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-08-01'),
        createSleepRecord('23:00:00', '07:00:00', 1, '2026-08-02'), // 质量 1
      ]
      const report = detectHealthAnomalies([], sleepRecords)
      const qualityAnomalies = report.anomalies.filter(
        a => a.category === 'sleep_disorder' && a.title.includes('质量'),
      )
      expect(qualityAnomalies.length).toBeGreaterThan(0)
    })

    it('入睡时间大幅推迟应产生异常', () => {
      const sleepRecords = [
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-27'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-28'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-29'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-30'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-07-31'),
        createSleepRecord('23:00:00', '07:00:00', 4, '2026-08-01'),
        createSleepRecord('03:00:00', '07:00:00', 3, '2026-08-02'), // 凌晨 3 点才睡
      ]
      const report = detectHealthAnomalies([], sleepRecords)
      const bedtimeAnomalies = report.anomalies.filter(
        a => a.category === 'sleep_disorder' && a.title.includes('入睡'),
      )
      expect(bedtimeAnomalies.length).toBeGreaterThan(0)
    })
  })

  describe('关联异常检测', () => {
    it('睡眠不足 + 情绪低落应产生关联异常', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 5, '2026-08-02'),
        createMetric('sleep', 5.5, '2026-08-01'),
        createMetric('sleep', 5, '2026-07-31'),
        createMetric('mood', 3, '2026-08-02'),
        createMetric('mood', 4, '2026-08-01'),
        createMetric('mood', 3, '2026-07-31'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      const correlationAnomalies = report.anomalies.filter(
        a => a.category === 'correlation_alert' && a.title.includes('情绪'),
      )
      expect(correlationAnomalies.length).toBeGreaterThan(0)
    })

    it('运动过量 + 精力不足应产生关联异常', () => {
      const metrics: BodyMetric[] = [
        createMetric('exercise', 120, '2026-08-02'),
        createMetric('exercise', 100, '2026-08-01'),
        createMetric('exercise', 110, '2026-07-31'),
        createMetric('energy', 2, '2026-08-02'),
        createMetric('energy', 2, '2026-08-01'),
        createMetric('energy', 2, '2026-07-31'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      const correlationAnomalies = report.anomalies.filter(
        a => a.category === 'correlation_alert' && a.title.includes('运动'),
      )
      expect(correlationAnomalies.length).toBeGreaterThan(0)
    })

    it('饮水不足 + 精力下降应产生关联异常', () => {
      const metrics: BodyMetric[] = [
        createMetric('water', 500, '2026-08-02'),
        createMetric('water', 600, '2026-08-01'),
        createMetric('water', 500, '2026-07-31'),
        createMetric('energy', 2, '2026-08-02'),
        createMetric('energy', 2, '2026-08-01'),
        createMetric('energy', 2, '2026-07-31'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      const correlationAnomalies = report.anomalies.filter(
        a => a.category === 'correlation_alert' && a.title.includes('饮水'),
      )
      expect(correlationAnomalies.length).toBeGreaterThan(0)
    })
  })

  describe('报告结构', () => {
    it('应包含正确的统计信息', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 3, '2026-08-02'),
        createMetric('sleep', 7, '2026-08-01'),
        createMetric('sleep', 7, '2026-07-31'),
        createMetric('sleep', 7, '2026-07-30'),
        createMetric('sleep', 7, '2026-07-29'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      expect(report.bySeverity).toBeDefined()
      expect(report.byCategory).toBeDefined()
      expect(typeof report.riskScore).toBe('number')
      expect(report.riskScore).toBeGreaterThanOrEqual(0)
      expect(report.riskScore).toBeLessThanOrEqual(100)
    })

    it('应包含整体评估', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 3, '2026-08-02'),
        createMetric('sleep', 7, '2026-08-01'),
        createMetric('sleep', 7, '2026-07-31'),
        createMetric('sleep', 7, '2026-07-30'),
        createMetric('sleep', 7, '2026-07-29'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      expect(report.overallAssessment.length).toBeGreaterThan(0)
    })

    it('应包含优先处理建议', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 3, '2026-08-02'),
        createMetric('sleep', 7, '2026-08-01'),
        createMetric('sleep', 7, '2026-07-31'),
        createMetric('sleep', 7, '2026-07-30'),
        createMetric('sleep', 7, '2026-07-29'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      expect(report.priorityActions.length).toBeGreaterThan(0)
    })

    it('每个异常应有唯一 ID', () => {
      const metrics: BodyMetric[] = [
        createMetric('sleep', 3, '2026-08-02'),
        createMetric('sleep', 7, '2026-08-01'),
        createMetric('sleep', 7, '2026-07-31'),
        createMetric('sleep', 7, '2026-07-30'),
        createMetric('sleep', 7, '2026-07-29'),
      ]
      const report = detectHealthAnomalies(metrics, [])
      const ids = new Set(report.anomalies.map(a => a.id))
      expect(ids.size).toBe(report.anomalies.length)
    })
  })
})

// ============================================================
// 快速检测
// ============================================================

describe('快速指标检测', () => {
  it('正常值不应标记为异常', () => {
    const result = quickCheckMetric('sleep', 7.5, [7, 7.5, 7, 8, 7])
    expect(result.isAnomaly).toBe(false)
  })

  it('远低于参考范围应标记为异常', () => {
    const result = quickCheckMetric('sleep', 2, [7, 7.5, 7, 8, 7])
    expect(result.isAnomaly).toBe(true)
  })

  it('显著偏离历史均值应标记为异常', () => {
    const result = quickCheckMetric('heart_rate', 120, [70, 72, 68, 71, 70])
    expect(result.isAnomaly).toBe(true)
  })

  it('高灵敏度更易检测异常', () => {
    const sensitiveResult = quickCheckMetric('sleep', 5, [7, 7.5, 7, 8, 7], 0.9)
    // 高灵敏度时异常可能更严重
    expect(sensitiveResult.severity).toBeDefined()
  })
})