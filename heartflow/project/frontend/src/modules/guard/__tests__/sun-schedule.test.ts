// ============================================================
// 守护室 · 日出日落自动启停 模块测试
// 纯函数断言采用时区无关策略：
// - 极昼/极夜由纬度+日期决定，与机器时区无关
// - 赤道春分昼夜长度 ≈ 12h，为绝对时间差，与机器时区无关
// - 自定义时间回退为纯时钟逻辑
// storage 调用 mock 到内存 store。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import {
  computeSunTimes,
  dayPhaseAt,
  isNightAt,
  minutesUntilTransition,
  parseClockTime,
  isNightByCustom,
  useSunSchedule,
} from '../sun-schedule'

const HOUR = 3600 * 1000

describe('computeSunTimes 日出日落计算', () => {
  it('赤道春分昼夜长度约 12 小时', () => {
    // 2026-03-20 春分，赤道
    const t = computeSunTimes(0, 0, new Date(2026, 2, 20, 12, 0))
    expect(t.polarDay).toBe(false)
    expect(t.polarNight).toBe(false)
    const dayLen = t.sunset.getTime() - t.sunrise.getTime()
    expect(dayLen).toBeGreaterThan(11.5 * HOUR)
    expect(dayLen).toBeLessThan(12.5 * HOUR)
  })

  it('北纬 80° 夏至为极昼', () => {
    const t = computeSunTimes(80, 0, new Date(2026, 5, 21, 12, 0))
    expect(t.polarDay).toBe(true)
    expect(t.polarNight).toBe(false)
  })

  it('南纬 80° 夏至为极夜', () => {
    const t = computeSunTimes(-80, 0, new Date(2026, 5, 21, 12, 0))
    expect(t.polarNight).toBe(true)
    expect(t.polarDay).toBe(false)
  })

  it('日出早于日落（正常纬度）', () => {
    const t = computeSunTimes(39.9, 116.4, new Date(2026, 5, 21, 12, 0))
    expect(t.sunrise.getTime()).toBeLessThan(t.sunset.getTime())
  })
})

describe('dayPhaseAt / isNightAt 相位判断', () => {
  it('极昼地区恒为 day', () => {
    expect(dayPhaseAt(80, 0, new Date(2026, 5, 21, 3, 0))).toBe('polar-day')
    expect(isNightAt(80, 0, new Date(2026, 5, 21, 3, 0))).toBe(false)
  })

  it('极夜地区恒为 night', () => {
    expect(dayPhaseAt(-80, 0, new Date(2026, 5, 21, 12, 0))).toBe('polar-night')
    expect(isNightAt(-80, 0, new Date(2026, 5, 21, 12, 0))).toBe(true)
  })
})

describe('minutesUntilTransition 切换倒计时', () => {
  it('极昼极夜返回 0', () => {
    expect(minutesUntilTransition(80, 0, new Date(2026, 5, 21, 12, 0))).toBe(0)
    expect(minutesUntilTransition(-80, 0, new Date(2026, 5, 21, 12, 0))).toBe(0)
  })

  it('正常纬度返回 0..1440 分钟', () => {
    const m = minutesUntilTransition(39.9, 116.4, new Date(2026, 5, 21, 12, 0))
    expect(m).toBeGreaterThanOrEqual(0)
    expect(m).toBeLessThanOrEqual(1440)
  })
})

describe('parseClockTime 时间解析', () => {
  it('合法 HH:mm', () => {
    expect(parseClockTime('20:00')).toBe(1200)
    expect(parseClockTime('06:30')).toBe(390)
    expect(parseClockTime('0:05')).toBe(5)
  })

  it('非法输入返回 null', () => {
    expect(parseClockTime(null)).toBeNull()
    expect(parseClockTime('')).toBeNull()
    expect(parseClockTime('25:00')).toBeNull()
    expect(parseClockTime('12:60')).toBeNull()
    expect(parseClockTime('abc')).toBeNull()
  })
})

describe('isNightByCustom 自定义时间回退', () => {
  it('同日区间（06:00→20:00）', () => {
    expect(isNightByCustom('06:00', '20:00', new Date(2026, 5, 21, 12, 0))).toBe(true)
    expect(isNightByCustom('06:00', '20:00', new Date(2026, 5, 21, 22, 0))).toBe(false)
  })

  it('跨午夜区间（20:00→06:00）', () => {
    expect(isNightByCustom('20:00', '06:00', new Date(2026, 5, 21, 23, 0))).toBe(true)
    expect(isNightByCustom('20:00', '06:00', new Date(2026, 5, 21, 3, 0))).toBe(true)
    expect(isNightByCustom('20:00', '06:00', new Date(2026, 5, 21, 12, 0))).toBe(false)
  })

  it('未设置时间返回 false', () => {
    expect(isNightByCustom(null, null, new Date(2026, 5, 21, 23, 0))).toBe(false)
  })
})

describe('useSunSchedule 存储与自动启停', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    useSunSchedule().load()
  })

  it('默认状态：未开启、无定位', () => {
    const s = useSunSchedule()
    expect(s.state.value.autoEnabled).toBe(false)
    expect(s.state.value.lat).toBeNull()
    expect(s.state.value.autoPreset).toBe('night')
  })

  it('setLocation 持久化经纬度', () => {
    const s = useSunSchedule()
    s.setLocation(39.9, 116.4)
    expect(store['hf:guard:sun_schedule'].lat).toBe(39.9)
    expect(store['hf:guard:sun_schedule'].lng).toBe(116.4)
  })

  it('clearLocation 清空定位', () => {
    const s = useSunSchedule()
    s.setLocation(39.9, 116.4)
    s.clearLocation()
    expect(s.state.value.lat).toBeNull()
    expect(s.state.value.lng).toBeNull()
  })

  it('setAutoEnabled / setAutoPreset / setCustomTimes 持久化', () => {
    const s = useSunSchedule()
    s.setAutoEnabled(true)
    s.setAutoPreset('extreme')
    s.setCustomTimes('20:00', '06:00')
    expect(store['hf:guard:sun_schedule']).toMatchObject({
      autoEnabled: true,
      autoPreset: 'extreme',
      customNightStart: '20:00',
      customNightEnd: '06:00',
    })
  })

  it('load 恢复持久化状态', () => {
    store['hf:guard:sun_schedule'] = {
      autoEnabled: true,
      autoPreset: 'focus',
      lat: 39.9,
      lng: 116.4,
      customNightStart: '21:00',
      customNightEnd: '05:00',
    }
    const s = useSunSchedule()
    s.load()
    expect(s.state.value.autoEnabled).toBe(true)
    expect(s.state.value.autoPreset).toBe('focus')
    expect(s.state.value.lat).toBe(39.9)
  })

  it('shouldEnableEyeCare 未开启时恒 false', () => {
    const s = useSunSchedule()
    s.setLocation(-80, 0)
    expect(s.shouldEnableEyeCare(new Date(2026, 5, 21, 12, 0))).toBe(false)
  })

  it('shouldEnableEyeCare 极夜定位自动开启', () => {
    const s = useSunSchedule()
    s.setAutoEnabled(true)
    s.setLocation(-80, 0)
    expect(s.shouldEnableEyeCare(new Date(2026, 5, 21, 12, 0))).toBe(true)
  })

  it('shouldEnableEyeCare 极昼定位不开启', () => {
    const s = useSunSchedule()
    s.setAutoEnabled(true)
    s.setLocation(80, 0)
    expect(s.shouldEnableEyeCare(new Date(2026, 5, 21, 12, 0))).toBe(false)
  })

  it('shouldEnableEyeCare 无定位回退自定义时间', () => {
    const s = useSunSchedule()
    s.setAutoEnabled(true)
    s.setCustomTimes('20:00', '06:00')
    expect(s.shouldEnableEyeCare(new Date(2026, 5, 21, 23, 0))).toBe(true)
    expect(s.shouldEnableEyeCare(new Date(2026, 5, 21, 12, 0))).toBe(false)
  })

  it('todayTimes 无定位返回 null，有定位返回时刻', () => {
    const s = useSunSchedule()
    expect(s.todayTimes(new Date(2026, 5, 21, 12, 0))).toBeNull()
    s.setLocation(39.9, 116.4)
    const t = s.todayTimes(new Date(2026, 5, 21, 12, 0))
    expect(t).not.toBeNull()
    expect(t!.sunrise.getTime()).toBeLessThan(t!.sunset.getTime())
  })

  it('minutesToNext 无定位返回 0', () => {
    const s = useSunSchedule()
    expect(s.minutesToNext(new Date(2026, 5, 21, 12, 0))).toBe(0)
  })
})
