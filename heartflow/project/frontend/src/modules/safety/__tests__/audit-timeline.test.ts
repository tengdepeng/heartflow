// ============================================================
// 守护室 · 审计时间线引擎测试（INCR-81 · audit-timeline.ts）
// 时间线事件 · 分段 · 聚合 · 趋势 · 热力图 · 异常摘要 · 导出 · 搜索
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { AuditLogEntry } from '../incident-response'

function entry(id: string, over: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id,
    action: 'login',
    actor: 'user',
    target: 'system',
    result: 'success',
    detail: '',
    timestamp: '2026-09-01T10:00:00.000Z',
    ...over,
  }
}

async function makeEngine(entries: AuditLogEntry[] = []) {
  const { useAuditTimeline } = await import('../audit-timeline')
  return useAuditTimeline(() => entries)
}

describe('useAuditTimeline 审计时间线', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('默认配置加载', async () => {
    const engine = await makeEngine()
    expect(engine.config.value.segmentGranularity).toBe('hour')
    expect(engine.config.value.maxEvents).toBe(500)
    expect(engine.config.value.showResolved).toBe(true)
    expect(engine.config.value.showLowRisk).toBe(true)
    expect(engine.config.value.autoRefresh).toBe(false)
  })

  it('toTimelineEvents 推断严重程度与分组', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { action: 'login', result: 'success' }),
      entry('e2', { action: 'login', result: 'failure' }),
      entry('e3', { action: 'data_export', result: 'blocked' }),
      entry('e4', { action: 'backup', result: 'success' }),
    ])
    expect(events[0].severity).toBe('info')
    expect(events[0].group).toBe('认证')
    expect(events[1].severity).toBe('danger')
    expect(events[1].isAnomaly).toBe(true)
    expect(events[2].severity).toBe('critical')
    expect(events[2].isAnomaly).toBe(true)
    expect(events[3].group).toBe('备份')
  })

  it('toTimelineEvents 关联 60 秒内同类操作', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { timestamp: '2026-09-01T10:00:00.000Z', action: 'login' }),
      entry('e2', { timestamp: '2026-09-01T10:00:30.000Z', action: 'login' }),
      entry('e3', { timestamp: '2026-09-01T10:05:00.000Z', action: 'login' }),
    ])
    expect(events[0].relatedEventIds).toContain('e2')
    expect(events[1].relatedEventIds).toContain('e1')
    expect(events[2].relatedEventIds).not.toContain('e1')
  })

  it('createSegments 按小时分段并统计成功率与高危', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { timestamp: '2026-09-01T10:00:00.000Z', result: 'success' }),
      entry('e2', { timestamp: '2026-09-01T10:30:00.000Z', action: 'backup', result: 'failure' }),
      entry('e3', { timestamp: '2026-09-01T11:00:00.000Z', result: 'blocked' }),
    ])
    const segments = engine.createSegments(events)
    expect(segments.length).toBe(2)
    expect(segments[0].eventCount).toBe(2)
    expect(segments[0].successRate).toBe(50)
    expect(segments[0].hasCriticalEvents).toBe(false)
    expect(segments[1].eventCount).toBe(1)
    expect(segments[1].hasCriticalEvents).toBe(true)
  })

  it('createSegments 空事件返回空数组', async () => {
    const engine = await makeEngine()
    expect(engine.createSegments([])).toEqual([])
  })

  it('aggregateEvents 按操作/主体/结果/小时/星期聚合', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { action: 'login', actor: 'a', result: 'success', timestamp: '2026-09-01T10:00:00.000Z' }),
      entry('e2', { action: 'login', actor: 'a', result: 'failure', timestamp: '2026-09-01T10:30:00.000Z' }),
      entry('e3', { action: 'backup', actor: 'b', result: 'success', timestamp: '2026-09-01T11:00:00.000Z' }),
    ])
    const byAction = engine.aggregateEvents(events, 'action')
    expect(byAction[0].key).toBe('login')
    expect(byAction[0].count).toBe(2)
    expect(byAction[0].percentage).toBe(66.7)
    const byResult = engine.aggregateEvents(events, 'result')
    expect(byResult[0].key).toBe('success')
    expect(byResult[0].count).toBe(2)
    const byHour = engine.aggregateEvents(events, 'hour')
    expect(byHour.length).toBe(2)
    const byDay = engine.aggregateEvents(events, 'day')
    expect(byDay[0].label).toBe('周二')
  })

  it('analyzeTrends 空数据返回稳定趋势', async () => {
    const engine = await makeEngine()
    const trend = engine.analyzeTrends([])
    expect(trend.direction).toBe('stable')
    expect(trend.changeRate).toBe(0)
    expect(trend.dataPoints).toEqual([])
    expect(trend.anomalies).toEqual([])
  })

  it('analyzeTrends 检测突增异常点', async () => {
    const engine = await makeEngine()
    const now = Date.now()
    const entries: AuditLogEntry[] = []
    // 前 12 小时每小时 2 条，最后 1 小时 100 条 → 突增（z 分数 > 2.5）
    for (let h = 12; h >= 1; h--) {
      for (let i = 0; i < 2; i++) {
        entries.push(entry(`n${h}_${i}`, {
          timestamp: new Date(now - h * 3600 * 1000).toISOString(),
        }))
      }
    }
    for (let i = 0; i < 100; i++) {
      entries.push(entry(`spike_${i}`, { timestamp: new Date(now).toISOString() }))
    }
    const trend = engine.analyzeTrends(entries, 24)
    expect(trend.dataPoints.length).toBeGreaterThanOrEqual(2)
    expect(trend.anomalies.some(a => a.type === 'spike')).toBe(true)
  })

  it('generateHeatmap 生成 7 天 24 小时矩阵', async () => {
    const engine = await makeEngine()
    const ts = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const heatmap = engine.generateHeatmap([
      entry('e1', { timestamp: ts }),
      entry('e2', { timestamp: ts }),
    ], 7)
    expect(heatmap.rows.length).toBe(7)
    expect(heatmap.columns.length).toBe(24)
    expect(heatmap.data.length).toBe(7)
    expect(heatmap.maxValue).toBe(2)
    expect(heatmap.data.flat().some(v => v === 2)).toBe(true)
  })

  it('getAnomalySummary 统计异常并按严重程度/分组归类', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { action: 'login', result: 'failure' }),
      entry('e2', { action: 'data_export', result: 'blocked' }),
      entry('e3', { action: 'backup', result: 'success' }),
    ])
    const summary = engine.getAnomalySummary(events)
    expect(summary.totalAnomalies).toBe(2)
    expect(summary.bySeverity.danger).toBe(1)
    expect(summary.bySeverity.critical).toBe(1)
    expect(summary.recentAnomalies.length).toBe(2)
  })

  it('exportTimeline 支持 json/csv/markdown 三种格式', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { action: 'login', result: 'success' }),
    ])
    const json = engine.exportTimeline(events, 'json')
    expect(json.format).toBe('json')
    expect(json.filename.endsWith('.json')).toBe(true)
    expect(JSON.parse(json.content)[0].action).toBe('login')
    expect(json.sizeBytes).toBeGreaterThan(0)

    const csv = engine.exportTimeline(events, 'csv')
    expect(csv.content).toContain('ID,时间,操作,主体,目标,结果,详情,严重程度,分组')
    expect(csv.content).toContain('login')

    const md = engine.exportTimeline(events, 'markdown')
    expect(md.content).toContain('# 审计时间线报告')
    expect(md.content).toContain('| 时间 | 操作 |')
  })

  it('searchEvents 按操作/主体/目标/分组/严重程度匹配', async () => {
    const engine = await makeEngine()
    const events = engine.toTimelineEvents([
      entry('e1', { action: 'login', actor: 'alice', target: 'system' }),
      entry('e2', { action: 'backup', actor: 'bob', target: 'vault' }),
    ])
    expect(engine.searchEvents(events, 'login').length).toBe(1)
    expect(engine.searchEvents(events, 'alice').length).toBe(1)
    expect(engine.searchEvents(events, '认证').length).toBe(1)
    expect(engine.searchEvents(events, 'vault').length).toBe(1)
    expect(engine.searchEvents(events, 'zzz').length).toBe(0)
  })

  it('updateConfig 持久化配置', async () => {
    const engine = await makeEngine()
    engine.updateConfig({ segmentGranularity: 'day', maxEvents: 100 })
    expect(engine.config.value.segmentGranularity).toBe('day')
    expect(engine.config.value.maxEvents).toBe(100)

    const { useAuditTimeline } = await import('../audit-timeline')
    const reloaded = useAuditTimeline(() => [])
    expect(reloaded.config.value.segmentGranularity).toBe('day')
  })
})
