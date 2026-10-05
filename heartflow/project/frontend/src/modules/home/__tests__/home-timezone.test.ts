// ============================================================
// 家（home）域 · 时区治理（INCR-466）
// RoomActivity.createdAt / timestamp 是 UTC ISO 时间戳（跨设备存储，正确写法），
// 但「今日活动数 / 14 天热力图 / 房间活跃度」都是业务日期比较，必须取本地日历日——
// 东八区 00:00-08:00 的活动会被算到前一天。
// 这三处是**自洽簇**（过滤键与边界键同为 UTC），按铁律须双侧一起改。
// 反向验证：改回 slice(0,10) / toISOString().slice(0,10) 后用例应转红。
// ============================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getLocalDateKey } from '../../../utils/time'
import type { RoomActivity } from '../home-interaction-engine'

/** 本地某日某时→ UTC ISO 时间戳（本地 03:00 = UTC 前一天 19:00） */
function localDayISO(y: number, m: number, d: number, h: number): string {
  return new Date(y, m - 1, d, h, 0, 0).toISOString()
}

const mockActivities: any[] = []
const mockKV: Record<string, any> = {}

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (k: string, d: any) => (k in mockKV ? mockKV[k] : d),
    setKV: (k: string, v: any) => { mockKV[k] = v },
    getNotes: () => [],
    getSessions: () => [],
    getConfig: () => ({}),
  },
}))

function act(createdAt: string, over: Partial<RoomActivity> = {}): RoomActivity {
  return {
    id: `a-${createdAt}`,
    roomId: 'r1',
    type: 'visit',
    label: '',
    description: '',
    duration: 10,
    createdAt,
    ...over,
  } as RoomActivity
}

describe('home 域 · 今日活动口径本地日历日', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 本地 2026-03-15（周日）10:00
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    mockActivities.length = 0
    Object.keys(mockKV).forEach(k => delete mockKV[k])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('前提：本机须为非 UTC 时区，否则时区敏感断言无意义', () => {
    const iso = '2026-03-14T19:00:00.000Z'
    expect(getLocalDateKey(new Date(iso))).not.toBe(iso.slice(0, 10))
  })

  it('凌晨的交互活动算「今天」，不被算到昨天', async () => {
    const { useHomeInteractionEngine } = await import('../home-interaction-engine')
    mockKV['hf:home:activities'] = JSON.stringify([
      // 本地 03-15 03:00（UTC 03-14 19:00）
      act(localDayISO(2026, 3, 15, 3)),
      // 前一天本地 20:00
      act(localDayISO(2026, 3, 14, 20)),
    ])
    const engine = useHomeInteractionEngine()
    // 旧口径：首作 UTC 键是 03-14 → 今日数 = 1
    expect(engine.todayActivityCount.value).toBe(1)
  })

  it('房间活跃度的「今日访问」用本地日历日（todayVisits）', async () => {
    const { useHomeAtmosphereEngine } = await import('../home-atmosphere-engine')
    const engine = useHomeAtmosphereEngine()
    // 注入凌晨活动：本地 03-15 03:00
    ;(engine as any).activities.value = [
      { roomId: 'r1', type: 'visit', timestamp: localDayISO(2026, 3, 15, 3), duration: 30, mood: 5 },
    ]
    const todayActs = (engine as any).todayActivities.value
    expect(todayActs).toHaveLength(1)
  })
})