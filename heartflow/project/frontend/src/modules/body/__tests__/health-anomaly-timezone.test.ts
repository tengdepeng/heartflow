// ============================================================
// 身体温室 · 健康异常检测 时区治理（INCR-466）
// BodyMetric.timestamp 是 UTC ISO 时间戳（跨设备存储，正确写法），
// 但「最近 7 天是否有记录」是业务日期比较，必须取本地日历日——
// 东八区 00:00–08:00 记录的指标，UTC 切日会把它算到前一天，
// 于是「今天明明记了却报规律中断」。
// detectConsistencyBreak 是自洽簇（过滤键与边界键同为 UTC），须双侧一起改。
// 反向验证：改回 split('T')[0] / toISOString().split('T')[0] 后用例转红。
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { detectHealthAnomalies } from '../health-anomaly'
import type { BodyMetric } from '../types'

/** 本地某日某时 → UTC ISO 时间戳 */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function makeMetric(timestamp: string, value = 70): BodyMetric {
  return {
    id: `m-${timestamp}`,
    type: 'heart_rate',
    value,
    unit: 'bpm',
    timestamp,
    date: getLocalDateKey(new Date(timestamp)),
  }
}

describe('health-anomaly · 规律中断检测 本地日历日口径', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）10:00
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('今天凌晨有记录就不该报「规律中断」', () => {
    // 今天 03:00 与05:00 两条 + 昨天/前天各一条（保证 >= 5 条不被数据量门槛挡掉）
    const metrics: BodyMetric[] = [
      makeMetric(localDayISO(2026, 3, 15, 3)),
      makeMetric(localDayISO(2026, 3, 15, 5)),
      makeMetric(localDayISO(2026, 3, 14, 10)),
      makeMetric(localDayISO(2026, 3, 13, 10)),
      makeMetric(localDayISO(2026, 3, 12, 10)),
    ]
    const report = detectHealthAnomalies(metrics, [], { consistencyMaxGap: 3 })
    const consistency = report.anomalies.filter(a => a.category === 'consistency_break')
    // 今天有记录 → 最近 7 天里最多连续缺 4 天（第 4 天前那批旧的之后）
    // 旧口径下今天凌晨记录被算到 03-14，今天被判为缺失 → 报中断
    expect(consistency.length).toBe(0)
  })

  it('真的连续多天无记录时仍要报中断（不漏报）', () => {
    // 最近 5 天全无记录，只有更早的 5 条
    const metrics: BodyMetric[] = [1, 2, 3, 4, 5].map(i =>
      makeMetric(localDayISO(2026, 3, 10 - i, 10)),
    )
    const report = detectHealthAnomalies(metrics, [], { consistencyMaxGap: 2 })
    const consistency = report.anomalies.filter(a => a.category === 'consistency_break')
    expect(consistency.length).toBeGreaterThan(0)
  })
})