// ============================================================
// 空间健康引擎（useSpaceHealth）· 测试（INCR-92）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---- Storage Mock ----
const mockKV = new Map<string, any>()
const mockGetKV = vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback)
const mockSetKV = vi.fn((key: string, val: any) => { mockKV.set(key, val) })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

// ---- Room Graph Mock ----
vi.mock('../../../engine/room-graph', () => ({
  getAllRooms: () => [
    { id: 'home', name: '心流', path: '/home', adjacentTo: [] },
    { id: 'study', name: '思绪书房', path: '/study', adjacentTo: [] },
  ],
}))

import { useSpaceHealth, HEALTH_LEVELS } from '../space-health'
import type { HealthLevel } from '../space-health'

describe('useSpaceHealth 健康报告', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('生成健康报告：分数在 0-100、等级合法、落盘存储', () => {
    const sh = useSpaceHealth()
    const report = sh.generateHealthReport('home')
    expect(report.spaceId).toBe('home')
    expect(report.score).toBeGreaterThanOrEqual(0)
    expect(report.score).toBeLessThanOrEqual(100)
    expect(Object.keys(HEALTH_LEVELS)).toContain(report.level)
    expect(report.metrics.length).toBeGreaterThan(0)
    expect(mockKV.get('hf_space_health_reports')?.home?.spaceId).toBe('home')
  })

  it('批量生成所有空间报告', () => {
    const sh = useSpaceHealth()
    const reports = sh.generateAllReports()
    expect(reports.length).toBe(2)
    expect(reports.map(r => r.spaceId).sort()).toEqual(['home', 'study'])
  })

  it('健康概览：平均分/总数/等级分布/最差最佳', () => {
    const sh = useSpaceHealth()
    sh.generateAllReports()
    const overview = sh.healthOverview.value
    expect(overview).not.toBeNull()
    expect(overview!.totalSpaces).toBe(2)
    expect(overview!.avgScore).toBeGreaterThanOrEqual(0)
    expect(overview!.bestSpace).toBeTruthy()
    expect(overview!.worstSpace).toBeTruthy()
  })

  it('无报告时健康概览为 null', () => {
    const sh = useSpaceHealth()
    expect(sh.healthOverview.value).toBeNull()
  })
})

describe('useSpaceHealth 问题与告警', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('创建问题并进入活跃列表，解决后移除', () => {
    const sh = useSpaceHealth()
    sh.createIssue({
      type: 'performance',
      severity: 'high',
      description: '加载时间过长',
      suggestion: '优化组件加载',
      detectedAt: new Date().toISOString(),
    })
    expect(sh.activeIssues.value.length).toBe(1)
    const id = sh.activeIssues.value[0].id
    expect(sh.resolveIssue(id)).toBe(true)
    expect(sh.activeIssues.value.length).toBe(0)
  })

  it('创建告警并进入未读列表，标读/解除后移除', () => {
    const sh = useSpaceHealth()
    sh.createAlert({ level: 'warning', title: '空间健康下降', description: '分数下降', spaceId: 'home' })
    expect(sh.unreadAlerts.value.length).toBe(1)
    const id = sh.unreadAlerts.value[0].id
    expect(sh.markAlertRead(id)).toBe(true)
    expect(sh.unreadAlerts.value.length).toBe(0)
    expect(sh.healthAlerts.value[0].isRead).toBe(true)
  })

  it('解除告警后不再计入未读', () => {
    const sh = useSpaceHealth()
    sh.createAlert({ level: 'error', title: '空间错误', description: '渲染失败', spaceId: 'study' })
    const id = sh.unreadAlerts.value[0].id
    expect(sh.resolveAlert(id)).toBe(true)
    expect(sh.unreadAlerts.value.length).toBe(0)
    expect(sh.healthAlerts.value[0].isResolved).toBe(true)
  })

  it('健康下降触发告警（scoreDelta < -10）', () => {
    // 预置高分报告（须在 useSpaceHealth 之前写入，否则初始化读不到）
    mockKV.set('hf_space_health_reports', {
      home: { spaceId: 'home', level: 'excellent', score: 100, metrics: [], activeIssues: [], reportedAt: new Date().toISOString() },
    })
    const sh = useSpaceHealth()
    // 注入劣化指标生成低分报告，触发「健康下降」告警
    for (let i = 0; i < 5; i++) {
      sh.trackError('home', `err-${i}`, { type: 'runtime' })
    }
    sh.recordPerformanceSnapshot({ spaceId: 'home', timestamp: new Date().toISOString(), loadTimeMs: 9000, renderTimeMs: 4000, memoryUsageMB: 800, componentCount: 100, listenerCount: 50, fps: 10 })
    sh.generateHealthReport('home')
    const r = sh.getHealthReport('home')
    expect(r?.scoreDelta).toBeLessThan(-10)
    expect(sh.healthAlerts.value.length).toBeGreaterThan(0)
    expect(sh.healthAlerts.value[0].level).toBe('warning')
  })
})

describe('useSpaceHealth 性能与错误', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('记录性能快照并计算趋势', () => {
    const sh = useSpaceHealth()
    sh.recordPerformanceSnapshot({ spaceId: 'home', timestamp: new Date().toISOString(), loadTimeMs: 300, renderTimeMs: 80, memoryUsageMB: 40, componentCount: 20, listenerCount: 10, fps: 60 })
    sh.recordPerformanceSnapshot({ spaceId: 'home', timestamp: new Date().toISOString(), loadTimeMs: 500, renderTimeMs: 120, memoryUsageMB: 60, componentCount: 22, listenerCount: 12, fps: 55 })
    const trend = sh.getPerformanceTrend('home', 'loadTimeMs')
    expect(trend.length).toBe(2)
    expect(trend[1]).toBeGreaterThan(trend[0])
  })

  it('追踪错误并解决', () => {
    const sh = useSpaceHealth()
    sh.trackError('home', 'boom', { type: 'runtime' })
    const errors = sh.getSpaceErrors('home')
    expect(errors.length).toBe(1)
    expect(sh.resolveError(errors[0].id)).toBe(true)
    expect(sh.getSpaceErrors('home').length).toBe(0)
  })

  it('错误趋势按日期聚合', () => {
    const sh = useSpaceHealth()
    sh.trackError('home', 'a', { type: 'runtime' })
    sh.trackError('home', 'b', { type: 'runtime' })
    const trend = sh.errorTrend.value
    expect(trend.length).toBe(1)
    expect(trend[0].count).toBe(2)
  })
})

describe('useSpaceHealth 清理与重置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('清除已解决数据', () => {
    const sh = useSpaceHealth()
    sh.createIssue({ type: 'error', severity: 'low', description: 'd', suggestion: 's', detectedAt: new Date().toISOString() })
    sh.resolveIssue(sh.activeIssues.value[0].id)
    const result = sh.clearResolved()
    expect(result.issues).toBe(1)
    expect(sh.healthIssues.value.length).toBe(0)
  })

  it('重置清空全部状态', () => {
    const sh = useSpaceHealth()
    sh.generateHealthReport('home')
    sh.reset()
    expect(sh.getAllReports().length).toBe(0)
    expect(mockKV.get('hf_space_health_reports')).toEqual({})
  })
})

describe('HEALTH_LEVELS 常量', () => {
  it('五个等级标签齐全', () => {
    const labels = (Object.keys(HEALTH_LEVELS) as HealthLevel[]).map(k => HEALTH_LEVELS[k].label)
    expect(labels).toEqual(['优秀', '良好', '一般', '较差', '危急'])
  })
})
