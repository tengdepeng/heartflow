// ============================================================
// 数据流出档案引擎测试（外流气象）
// ============================================================
import { describe, expect, it } from 'vitest'
import type { GuardOutflowLog, OutflowChannel } from '../../../engine/data-outflow'
import {
  outflowOverview,
  channelDistribution,
  outflowRhythm,
  outflowInsights,
  OUTFLOW_CHANNELS,
} from '../outflow-analytics'

// 固定基准 2026-08-22（本地时区）
const NOW = new Date(2026, 7, 22, 12, 0, 0)

function iso(daysAgo: number, hour = 10): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function log(channel: OutflowChannel, daysAgo: number, hour = 10, summary = '无'): GuardOutflowLog {
  return { id: `of-${daysAgo}-${hour}-${channel}`, at: iso(daysAgo, hour), channel, channelLabel: channel, target: '外部模型API', summary }
}

describe('outflowOverview', () => {
  it('空状态各项为零', () => {
    const ov = outflowOverview([], NOW)
    expect(ov.total).toBe(0)
    expect(ov.coveredChannels).toBe(0)
    expect(ov.todayCount).toBe(0)
    expect(ov.last7Count).toBe(0)
    expect(ov.topChannel).toBeNull()
    expect(ov.topChannelCount).toBe(0)
    expect(ov.latestAt).toBeNull()
  })

  it('统计总数、覆盖渠道与今日/近7天', () => {
    const logs = [log('export', 0), log('share', 0), log('backup', 1), log('sync', 6), log('export', 8)]
    const ov = outflowOverview(logs, NOW)
    expect(ov.total).toBe(5)
    expect(ov.coveredChannels).toBe(4)
    expect(ov.todayCount).toBe(2)
    expect(ov.last7Count).toBe(4) // 0,1,6 天内 4 条，第 8 天超出
    expect(ov.topChannel).toBe('export')
    expect(ov.topChannelCount).toBe(2)
  })

  it('latestAt 取第一条记录（约定最新在前）', () => {
    const logs = [log('export', 5), log('share', 1), log('backup', 3)]
    const ov = outflowOverview(logs, NOW)
    expect(ov.latestAt).toBe(logs[0].at)
  })

  it('无重复渠道时 topChannel 为唯一渠道', () => {
    const ov = outflowOverview([log('backup', 0)], NOW)
    expect(ov.topChannel).toBe('backup')
    expect(ov.coveredChannels).toBe(1)
  })
})

describe('channelDistribution', () => {
  it('空日志返回空数组', () => {
    expect(channelDistribution([])).toEqual([])
  })

  it('占比按总数归一且过滤零渠道', () => {
    const logs = [log('export', 0), log('export', 1), log('share', 2)]
    const dist = channelDistribution(logs)
    const exportRow = dist.find(r => r.channel === 'export')
    const shareRow = dist.find(r => r.channel === 'share')
    expect(exportRow?.count).toBe(2)
    expect(exportRow?.pct).toBe(67)
    expect(shareRow?.count).toBe(1)
    expect(shareRow?.pct).toBe(33)
    expect(dist.length).toBe(2)
    expect(dist.some(r => r.channel === 'sync')).toBe(false)
  })

  it('仅一个渠道时占比 100%', () => {
    const dist = channelDistribution([log('backup', 0)])
    expect(dist).toHaveLength(1)
    expect(dist[0].pct).toBe(100)
  })

  it('渠道元信息（label/icon/color）齐全', () => {
    const row = channelDistribution([log('external-ai', 0)])[0]
    expect(row.label).toBeTruthy()
    expect(row.icon).toBeTruthy()
    expect(row.color).toBeTruthy()
    expect(OUTFLOW_CHANNELS.length).toBe(5)
  })
})

describe('outflowRhythm', () => {
  it('始终返回 7 天窗口', () => {
    expect(outflowRhythm([], NOW)).toHaveLength(7)
    expect(outflowRhythm([], NOW)[6].label).toBe('今天')
  })

  it('按本地日期聚合计数', () => {
    const logs = [log('export', 0), log('share', 0, 18), log('backup', 2)]
    const rhythm = outflowRhythm(logs, NOW)
    const today = rhythm[6]
    expect(today.count).toBe(2)
    const day2 = rhythm[4]
    expect(day2.count).toBe(1)
  })

  it('超出窗口的日志不计入', () => {
    const rhythm = outflowRhythm([log('export', 10)], NOW)
    expect(rhythm.reduce((s, d) => s + d.count, 0)).toBe(0)
  })

  it('非法时间戳被跳过', () => {
    const bad = [log('export', 0), log('share', 1, 9, `非法 ${'date'}`)]
    bad[1] = { ...bad[1], at: 'not-a-date' as string }
    expect(outflowRhythm(bad, NOW).reduce((s, d) => s + d.count, 0)).toBe(1)
  })
})

describe('outflowInsights', () => {
  it('空状态给出一条慰藉', () => {
    const ins = outflowInsights([], NOW, 10)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.some(s => s.includes('离开'))).toBe(true)
  })

  it('最常渠道被点名', () => {
    const ins = outflowInsights([log('export', 0), log('export', 1), log('share', 2)], NOW, 10)
    expect(ins.some(s => s.includes('导出') && s.includes('2 次'))).toBe(true)
  })

  it('渠道多元（≥4）提示去向多元', () => {
    const logs = [log('export', 0), log('sync', 1), log('external-ai', 2), log('share', 3), log('backup', 4)]
    const ins = outflowInsights(logs, NOW, 10)
    expect(ins.some(s => s.includes('多元'))).toBe(true)
    expect(ins.some(s => s.includes('频繁离开'))).toBe(true)
  })

  it('今日有流出给提示、近7天无则报安稳', () => {
    const withToday = outflowInsights([log('export', 0)], NOW, 10)
    expect(withToday.some(s => s.includes('今天已有'))).toBe(true)
    const quietRecently = outflowInsights([log('backup', 40)], NOW, 10)
    expect(quietRecently.some(s => s.includes('安稳'))).toBe(true)
  })

  it('最爱访问日暴露（>3 次）', () => {
    const ins = outflowInsights(
      [log('export', 0), log('share', 0, 9), log('backup', 0, 14), log('sync', 0, 20), log('export', 1)],
      NOW,
      10,
    )
    expect(ins.some(s => s.includes('最活跃'))).toBe(true)
  })

  it('备份习惯被鼓励', () => {
    const ins = outflowInsights([log('backup', 0), log('backup', 3)], NOW, 10)
    expect(ins.some(s => s.includes('2 次备份'))).toBe(true)
  })

  it('limit 截断生效', () => {
    const logs = [log('export', 0), log('sync', 1), log('external-ai', 2), log('share', 3), log('backup', 4)]
    const all = outflowInsights(logs, NOW, 10)
    expect(all.length).toBeGreaterThan(3)
    const cut = outflowInsights(logs, NOW, 2)
    expect(cut.length).toBe(2)
  })
})