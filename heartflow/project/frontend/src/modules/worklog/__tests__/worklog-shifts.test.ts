// ============================================================
// useWorkLog 模块测试
// 更漏班次 / 时薪数据层：从 storage 载入、整体保存、时薪持久化
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useWorkLog } from '../worklog-shifts'
import type { WorkShift } from '../worklog-shifts'

const SHIFTS_KEY = 'heartflow:shifts'
const HOURLY_RATE_KEY = 'heartflow:hourly_rate'

function sampleShift(partial: Partial<WorkShift> = {}): WorkShift {
  return {
    id: 's1',
    type: 'regular',
    date: '2026-07-27',
    start: '09:00',
    end: '18:00',
    hours: 9,
    ...partial,
  }
}

describe('useWorkLog 班次/时薪数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 清空存储与模块级单例，避免用例间状态泄漏
    Object.keys(store).forEach((k) => delete store[k])
    useWorkLog().load()
  })

  it('load 从存储读取班次列表', () => {
    store[SHIFTS_KEY] = [sampleShift({ id: 'a' }), sampleShift({ id: 'b' })]
    const wl = useWorkLog()
    wl.load()
    expect(wl.shifts.value.length).toBe(2)
    expect(wl.shifts.value[0].id).toBe('a')
    expect(mockGetKV).toHaveBeenCalledWith(SHIFTS_KEY, [])
  })

  it('load 从存储读取时薪并还原为数值', () => {
    store[HOURLY_RATE_KEY] = '120'
    const wl = useWorkLog()
    wl.load()
    expect(wl.hourlyRate.value).toBe(120)
    expect(typeof wl.hourlyRate.value).toBe('number')
    expect(mockGetKV).toHaveBeenCalledWith(HOURLY_RATE_KEY, 0)
  })

  it('空存储时返回默认空列表与 0 时薪', () => {
    const wl = useWorkLog()
    wl.load()
    expect(wl.shifts.value).toEqual([])
    expect(wl.hourlyRate.value).toBe(0)
  })

  it('save 覆盖班次列表并持久化到存储', () => {
    const wl = useWorkLog()
    const list = [sampleShift({ id: 'a' }), sampleShift({ id: 'b' })]
    wl.save(list)
    expect(wl.shifts.value.length).toBe(2)
    expect(mockSetKV).toHaveBeenCalledWith(SHIFTS_KEY, list)
  })

  it('saveHourlyRate 以字符串形式持久化时薪，与重构前一致', () => {
    const wl = useWorkLog()
    wl.hourlyRate.value = 88
    wl.saveHourlyRate()
    expect(mockSetKV).toHaveBeenCalledWith(HOURLY_RATE_KEY, '88')
    expect(typeof store[HOURLY_RATE_KEY]).toBe('string')
  })

  it('单例共享：多次调用返回同一份状态', () => {
    const a = useWorkLog()
    const b = useWorkLog()
    a.save([sampleShift({ id: 'x' })])
    expect(b.shifts.value.map((s) => s.id)).toEqual(['x'])
  })
})
