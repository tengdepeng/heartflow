// ============================================================
//匠庐徽章 · 时区治理（INCR-466）
// CraftWork.createdAt 是 UTC ISO 时间戳（跨设备存储，正确写法），
// 但按「业务日期」分组/连续天数时必须取本地日历日——
// 东八区 00:00–08:00 创作的作品，UTC 切日会把它算到前一天。
// computeStreak / computeWeekendStreak 是自洽簇（过滤键与边界键同为 UTC），
// 按铁律须双侧一起改，否则「今天」永不命中。
// 反向验证：改回 split('T')[0] / toISOString().split('T')[0] 后，
// 「凌晨作品算今天」用例应转红（期望 3 实得 0）。
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import { computeStreak, computeWeekendStreak } from '../craft-badges'
import type { CraftWork } from '../types'

function makeWork(createdAt: string, type: CraftWork['type'] = 'writing'): CraftWork {
  return {
    id: `w-${createdAt}-${Math.random().toString(36).slice(2, 6)}`,
    name: '测试作品',
    icon: '🔨',
    description: '',
    color: '#b8a080',
    status: 'draft',
    type,
    date: createdAt.slice(0, 7),
    evolution: 0,
    tags: [],
    createdAt,
    updatedAt: createdAt,
  }
}

/** 本地某日某时 → UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

describe('craft-badges · 连续创作天数 本地日历日口径', () => {
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

  it('凌晨创作的作品算「今天」，连续天数不被腰斩', () => {
    //本地 03-15 03:00（UTC 03-14 19:00）、03-14 20:00、03-13 10:00 三个连续本地日
    const works = [
      makeWork(localDayISO(2026, 3, 15, 3)),
      makeWork(localDayISO(2026, 3, 14, 20)),
      makeWork(localDayISO(2026, 3, 13, 10)),
    ]
    // 旧口径：首作UTC 键是 03-14，边界键查03-15 查不到 → streak = 0
    expect(computeStreak(works)).toBe(3)
  })

  it('连续天数只数有创作的本地日，中间断一天即止', () => {
    const works = [
      makeWork(localDayISO(2026, 3, 15, 1)),
      makeWork(localDayISO(2026, 3, 14, 12)),
      // 03-13 缺失
    ]
    expect(computeStreak(works)).toBe(2)
  })

  it('跨 UTC 午夜的两次同日创作不会被重计为两天', () => {
    // 同一本地日 03-15 的凌晨与傍晚：UTC 分属03-14 / 03-15
    const works = [
      makeWork(localDayISO(2026, 3, 15, 3)),
      makeWork(localDayISO(2026, 3, 15, 22)),
    ]
    // 旧口径下两者UTC 键不同但都会与边界对上，仍为 2 —— 此用例锁「不把一天算成两天」的语义
    expect(computeStreak(works)).toBe(1)
  })

  it('连续周末创作按本地日历日判定（口径统一化迁移）', () => {
    // 旧口径下过滤键与边界键同为 UTC，本函数自洽、结果等价；
    // 本次迁移把 getDay() 判定的本地周末与日期键口径统一，属防御性收敛，
    // 故此处只锁功能不回退（判别力由上面 computeStreak 用例承担）。
    const works = [
      makeWork(localDayISO(2026, 3, 15, 2)), // 本地周日
      makeWork(localDayISO(2026, 3, 8, 2)), // 上一个周日
      makeWork(localDayISO(2026, 3, 1, 2)), // 再上一个周日
    ]
    expect(computeWeekendStreak(works)).toBeGreaterThanOrEqual(3)
  })
})