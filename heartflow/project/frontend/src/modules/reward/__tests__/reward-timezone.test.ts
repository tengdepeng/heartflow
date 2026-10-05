// ============================================================
// 劳酬（reward）域 · 时区治理（INCR-466）
// RewardRecord.at / recordedAt 是 UTC ISO 时间戳（跨设备存储，正确写法），
// 但「今日是否已记账 / 连续记账天数 / 月度活跃日 / 净资产截止日」都是
// 业务日期比较，必须取本地日历日——东八区 00:00-08:00 的记录会被算到前一天。
// 这批缺陷属闸门第 4 类形态（`r.at.slice(0,10)`），2026-10-05 补闸门后才暴露。
// 反向验证：改回 slice(0,10) / toISOString().slice(0,10) 后用例应转红。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { recordedDays, hasRecordToday, recordStreak, monthActivity } from '../daily-reminder'
import { buildExportRows } from '../export'
import { applyWeek } from '../saving-plan'
// ⚠️ 本域有两个同名 RewardRecord：./types 的是 recordedAt，./reward-list 的才是 at
import type { RewardRecord } from '../reward-list'

/** 本地某日某时 → UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function rec(at: string, over: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: `r-${at}`,
    type: 'income',
    category: 'salary',
    amount: 100,
    description: '',
    at,
    ...over,
  } as RewardRecord
}

describe('reward 域 · 业务日期键 本地日历日口径', () => {
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

  it('凌晨记的账算「今天」，hasRecordToday 命中', () => {
    // 本地 03-15 03:00（UTC 03-14 19:00）
    const r = rec(localDayISO(2026, 3, 15, 3))
    expect(hasRecordToday([r])).toBe(true)
    expect([...recordedDays([r])]).toEqual(['2026-03-15'])
  })

  it('连续记账天数不被腰斩', () => {
    const rs = [
      rec(localDayISO(2026, 3, 15, 3)),
      rec(localDayISO(2026, 3, 14, 20)),
      rec(localDayISO(2026, 3, 13, 9)),
    ]
    // 旧口径：首作UTC 键是 03-14，今天被判未记账 → streak 从昨天起算 = 2
    expect(recordStreak(rs)).toBe(3)
  })

  it('月度活跃日按本地日历日归日', () => {
    const rs = [rec(localDayISO(2026, 3, 15, 3)), rec(localDayISO(2026, 3, 15, 20))]
    const act = monthActivity(rs, '2026-03')
    expect(act.count).toBe(2)
    expect(act.activeDays).toBe(1)
    expect(Object.keys(act.byDay)).toEqual(['2026-03-15'])
  })

  it('导出按日期区间筛选时用本地日历日（凌晨记录不该漏出区间）', () => {
    const rs = [rec(localDayISO(2026, 3, 15, 3)), rec(localDayISO(2026, 3, 10, 12))]
    const rows = buildExportRows(rs, { scope: 'range', from: '2026-03-15', to: '2026-03-15' })
    expect(rows).toHaveLength(1)
    expect(rows[0].日期).toBe('2026-03-15')
  })

  it('52 周计划的存款日键是本地日历日', () => {
    const plan = {
      id: 'p1', mode: '52week', name: 'test', targetAmount: 0, baseAmount: 100,
      currentAmount: 0, deposits: [],
      // 本地 03-15 03:00 → UTC 03-14 19:00
      createdAt: localDayISO(2026, 3, 15, 3),
      weeksDone: [], done: false,
    } as any
    const next = applyWeek(plan, 1)
    // 旧口径写成 03-14（UTC 前一天）
    expect(next.deposits[0].at).toBe('2026-03-15')
  })
})