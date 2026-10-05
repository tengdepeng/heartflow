// ============================================================
// 伤痕可视化 · 时区治理（INCR-466）
// BodyMark.recordedAt 是 UTC ISO 时间戳（跨设备存储，正确写法），
// 但愈合时间线的 date 与预测愈合日是给用户看的「业务日期」，
// 必须取本地日历日——东八区 00:00–08:00 记录的伤痕会显示成前一天。
// 反向验证：改回 split('T')[0] / toISOString().split('T')[0] 后用例转红。
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { useScarVisualization } from '../narrative-template'
import type { BodyMark } from '../types'

function makeScar(recordedAt: string, healingProgress = 30): BodyMark {
  return {
    id: `s-${recordedAt}`,
    bodyPart: 'arm',
    severity: 2,
    description: '测试伤痕描述',
    scarType: 'cut',
    recordedAt,
    healingStage: 'acute',
    healingProgress,
    transformed: false,
  }
}

/** 本地某日某时 → UTC ISO 时间戳 */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

describe('scar-visualization · 愈合日期 本地日历日口径', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）03:00 —— 落在东八区 UTC 会退一天的窗口内
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('凌晨记录的伤痕，愈合时间线显示本地当日而非 UTC 前一天', () => {
    const scar = makeScar(localDayISO(2026, 3, 15, 3))
    const viz = useScarVisualization()
    const timeline = viz.buildHealingTimeline([scar])
    expect(timeline.length).toBe(1)
    // 本地 03-15 03:00 = UTC 03-14 19:00，旧口径会显示 03-14
    expect(timeline[0].date).toBe('2026-03-15')
  })

  it('预测完全愈合日期按本地日历日返回', () => {
    // 10 天前（03-05 03:00）记录、进度 50% → 剩余 10 天 → 预测 03-25 03:00
    const scar = makeScar(localDayISO(2026, 3, 5, 3), 50)
    const viz = useScarVisualization()
    const predicted = viz.predictHealingDate(scar)
    // 旧口径：本地 03-25 03:00 → UTC 03-24 19:00 → 显示 03-24
    expect(predicted).toBe('2026-03-25')
  })
})