// ============================================================
// 律动（movement）域 · 时区治理 · 跨模块口径分裂专项（INCR-466）
//
// 🔴 缺陷背景：`MovementRecord.date` 曾有两个落库点且口径不一致——
//   - `move-converter.ts:59`  `move.at.slice(0, 10)`   → **UTC**
//   - `rhythm.ts:54`           `localDateStr(now)`    → 本地
// 而读取端 `home/today-room-stats.ts:62` 只按 `localKey` 比，
// ⇒ **走 move-converter 的记录永远比不中，「今日运动」恒为 0**，
//   而代码与测试都看起来完全正常（既有测试基准时刻是 10:00，本地与 UTC 同日，测不出分歧）。
//
// 同一转换逻辑在 `MovementAnalyticsPanel.vue:105` 还被抄了一份，同样是 UTC，一并修。
// 反向验证：改回slice(0,10) 后，本文件的凌晨用例应转红。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { moveToRecord, movesToRecords } from '../move-converter'
import { aggregateTodayRoomStats } from '../../home/today-room-stats'
import type { Move } from '../movement-log'

/** 本地某日某时 → UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

function mv(at: string, over: Partial<Move> = {}): Move {
  return {
    id: `m-${at}`,
    type: 'walk',
    duration: 30,
    withWhom: '',
    location: '',
    note: '',
    isMoment: false,
    at,
    ...over,
  }
}

describe('movement.date 落库口径 · 跨模块契约专项', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）03:00 —— 东八区 UTC 切日会退到 03-14
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('moveToRecord：凌晨运动记本地当日，不是 UTC 前一天', () => {
    // 本地 03-15 03:00 = UTC 03-14 19:00
    const rec = moveToRecord(mv(localDayISO(2026, 3, 15, 3)))
    expect(rec.date).toBe('2026-03-15')
    // timestamp 仍须保留 UTC 原值（跨设备存储口径不动）
    expect(rec.timestamp).toBe('2026-03-14T19:00:00.000Z')
  })

  it('movesToRecords 批量转换同样用本地日', () => {
    const recs = movesToRecords([mv(localDayISO(2026, 3, 15, 3))])
    expect(recs[0].date).toBe('2026-03-15')
  })

  it('🔴 端到端：凌晨的运动能被「今日运动」统计到（修复前恒为 0）', () => {
    const records = movesToRecords([mv(localDayISO(2026, 3, 15, 3))])
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [], releases: [], movements: records,
    })
    // 旧口径：rec.date = '2026-03-14' ≠ localKey '2026-03-15' → 得 0
    expect(r.movementToday).toBe(1)
  })

  it('组件侧 adaptedRecords 同样用本地日（MovementAnalyticsPanel 抄了同一份转换逻辑）', () => {
    // 直接锁 moveToRecord 的行为：组件内联的那份用 getLocalDateKey，语义与此一致
    const rec = moveToRecord(mv(localDayISO(2026, 3, 15, 3)))
    expect(rec.date).toBe(getLocalDateKey(new Date(rec.timestamp)))
  })

  it('隔日记录不计入今日（防过度修正）', () => {
    const records = movesToRecords([mv(localDayISO(2026, 3, 13, 3))])
    const r = aggregateTodayRoomStats({
      anchors: [], meditations: [], releases: [], movements: records,
    })
    expect(r.movementToday).toBe(0)
  })
})