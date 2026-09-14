// ============================================================
// anomaly-detector 引擎测试（INCR-84：实时异常检测）
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

const storageMock = new Map<string, unknown>()

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, defaultValue: T): T => {
      const val = storageMock.get(key)
      return val !== undefined ? (val as T) : defaultValue
    },
    setKV: (key: string, value: unknown) => { storageMock.set(key, value) },
    removeKV: (key: string) => { storageMock.delete(key) },
  },
}))

import {
  useAnomalyDetector,
  ANOMALY_DIMENSION_META,
  ANOMALY_SEVERITY_META,
  ANOMALY_DETECTOR_STORAGE_KEYS,
} from '../anomaly-detector'

beforeEach(() => {
  storageMock.clear()
})

describe('useAnomalyDetector', () => {
  it('默认加载 8 条规则与窗口配置', () => {
    const d = useAnomalyDetector()
    expect(d.rules.value).toHaveLength(8)
    expect(d.windowConfig.value.windowSize).toBe(100)
    expect(d.windowConfig.value.minDataPoints).toBe(20)
  })

  it('recordDataPoint 记录并持久化数据点', () => {
    const d = useAnomalyDetector()
    const p = d.recordDataPoint('login_frequency', 10)
    expect(p.dimension).toBe('login_frequency')
    expect(p.value).toBe(10)
    expect(d.dataPoints.value).toHaveLength(1)
    expect(storageMock.get(ANOMALY_DETECTOR_STORAGE_KEYS.DATA_POINTS)).toHaveLength(1)
  })

  it('recordBatch 批量记录', () => {
    const d = useAnomalyDetector()
    const pts = d.recordBatch([
      { dimension: 'login_frequency', value: 1 },
      { dimension: 'error_rate', value: 2 },
    ])
    expect(pts).toHaveLength(2)
    expect(d.dataPoints.value).toHaveLength(2)
  })

  it('calculateBaseline 数据不足返回 null，足够返回基线', () => {
    const d = useAnomalyDetector()
    expect(d.calculateBaseline('login_frequency')).toBeNull()
    for (let i = 0; i < 25; i++) {
      d.recordDataPoint('login_frequency', 10 + i)
    }
    const b = d.calculateBaseline('login_frequency')
    expect(b).not.toBeNull()
    expect(b!.sampleCount).toBe(25)
    expect(b!.mean).toBeCloseTo(22, 0)
    expect(d.baselines.value.has('login_frequency')).toBe(true)
  })

  it('阈值规则检测异常并生成结果', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    const a = d.anomalies.value[0]
    expect(a).toBeDefined()
    expect(a!.dimension).toBe('permission_changes')
    expect(a!.severity).toBe('high')
    expect(a!.suggestion).toContain('权限')
    expect(d.anomalies.value).toHaveLength(1)
  })

  it('统计规则基于基线 z-score 检测', () => {
    const d = useAnomalyDetector()
    for (let i = 0; i < 25; i++) {
      d.recordDataPoint('login_frequency', 10 + i)
    }
    d.calculateBaseline('login_frequency')
    d.recordDataPoint('login_frequency', 100)
    const a = d.anomalies.value[0]
    expect(a).toBeDefined()
    expect(a!.zScore).toBeGreaterThan(3)
  })

  it('冷却期内同规则不重复触发', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    d.recordDataPoint('permission_changes', 10)
    expect(d.anomalies.value).toHaveLength(1)
  })

  it('禁用规则后不再触发', () => {
    const d = useAnomalyDetector()
    d.toggleRule('rule_permission_anomaly', false)
    d.recordDataPoint('permission_changes', 10)
    expect(d.anomalies.value).toHaveLength(0)
  })

  it('updateRule 更新规则，resetRules 恢复默认', () => {
    const d = useAnomalyDetector()
    d.updateRule('rule_permission_anomaly', { severity: 'critical' })
    expect(d.rules.value.find(r => r.id === 'rule_permission_anomaly')?.severity).toBe('critical')
    d.resetRules()
    expect(d.rules.value.find(r => r.id === 'rule_permission_anomaly')?.severity).toBe('high')
  })

  it('resolveAnomaly 解决异常并写入时间', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    const a = d.anomalies.value[0]
    expect(d.resolveAnomaly(a!.id)).toBe(true)
    expect(d.resolveAnomaly('nonexistent')).toBe(false)
    expect(d.anomalies.value[0].isResolved).toBe(true)
    expect(d.anomalies.value[0].resolvedAt).toBeDefined()
  })

  it('getDetectionStats 统计分布与未解决数', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    d.recordDataPoint('config_modifications', 20)
    d.resolveAnomaly(d.anomalies.value[0].id)
    const s = d.getDetectionStats()
    expect(s.totalDetections).toBe(2)
    expect(s.totalAnomalies).toBe(2)
    expect(s.unresolvedCount).toBe(1)
    expect(s.byDimension.permission_changes).toBe(1)
    expect(s.bySeverity.high).toBe(1)
    expect(s.bySeverity.medium).toBe(1)
  })

  it('getCriticalAnomalies 只返回未解决的高/严重异常', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    d.resolveAnomaly(d.anomalies.value[0].id)
    expect(d.getCriticalAnomalies()).toHaveLength(0)
    d.recordDataPoint('error_rate', 25)
    expect(d.getCriticalAnomalies().length).toBeGreaterThan(0)
  })

  it('updateWindowConfig 更新并持久化', () => {
    const d = useAnomalyDetector()
    d.updateWindowConfig({ sensitivity: 0.9 })
    expect(d.windowConfig.value.sensitivity).toBe(0.9)
    expect((storageMock.get(ANOMALY_DETECTOR_STORAGE_KEYS.WINDOW_CONFIG) as { sensitivity: number }).sensitivity).toBe(0.9)
  })

  it('purgeOldData 清除旧数据点与已解决异常', () => {
    const d = useAnomalyDetector()
    d.recordDataPoint('permission_changes', 10)
    const a = d.anomalies.value[0]
    d.resolveAnomaly(a.id)
    const old = new Date()
    old.setDate(old.getDate() - 10)
    a.resolvedAt = old.toISOString()
    d.dataPoints.value.push({ timestamp: old.toISOString(), dimension: 'login_frequency', value: 1 })
    const removed = d.purgeOldData(7)
    expect(removed).toBeGreaterThan(0)
    expect(d.anomalies.value).toHaveLength(0)
  })

  it('runFullDetection 遍历全维度', () => {
    const d = useAnomalyDetector()
    for (let i = 0; i < 25; i++) {
      d.recordDataPoint('login_frequency', 10)
    }
    d.calculateBaseline('login_frequency')
    const results = d.runFullDetection()
    expect(Array.isArray(results)).toBe(true)
  })
})

describe('元数据', () => {
  it('维度与严重程度元数据齐全', () => {
    expect(Object.keys(ANOMALY_DIMENSION_META)).toHaveLength(8)
    expect(Object.keys(ANOMALY_SEVERITY_META)).toHaveLength(4)
    expect(ANOMALY_DIMENSION_META.login_frequency.label).toBe('登录频率')
    expect(ANOMALY_SEVERITY_META.critical.label).toBe('严重')
  })
})
