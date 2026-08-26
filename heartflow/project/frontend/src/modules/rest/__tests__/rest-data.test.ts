// ============================================================
// useRest 模块测试
// 休息数据层：休憩方式 + 休息记录的读取 / 写入
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

import { useRest, DEFAULT_PRACTICES } from '../rest-data'

const PRACTICES_KEY = 'rest:practices'
const BREAK_RECORDS_KEY = 'rest:break_records'

function samplePractice() {
  return { ...DEFAULT_PRACTICES[0] }
}

function sampleRecord() {
  return {
    id: 'r1',
    activity: 'meditation',
    duration: 15,
    mood: 4,
    note: '很放松',
    date: '2026-07-27',
  }
}

describe('useRest 休息数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    useRest().load()
  })

  it('load 从存储读取休憩方式与休息记录（恰好 8 条时直接采用）', () => {
    store[PRACTICES_KEY] = DEFAULT_PRACTICES.slice(0, 8)
    store[BREAK_RECORDS_KEY] = [sampleRecord()]
    const r = useRest()
    r.load()
    expect(r.practicesData.value.length).toBe(8)
    expect(r.breakRecords.value.length).toBe(1)
    expect(mockGetKV).toHaveBeenCalledWith(PRACTICES_KEY, DEFAULT_PRACTICES)
    expect(mockGetKV).toHaveBeenCalledWith(BREAK_RECORDS_KEY, [])
  })

  it('load 在存储条数非 8 时以默认定义为基底补全', () => {
    store[PRACTICES_KEY] = [samplePractice(), samplePractice()]
    const r = useRest()
    r.load()
    expect(r.practicesData.value.length).toBe(DEFAULT_PRACTICES.length)
    expect(r.practicesData.value[0].id).toBe('meditation')
  })

  it('save 整体持久化休憩方式与休息记录', () => {
    const r = useRest()
    r.practicesData.value = [samplePractice()]
    r.breakRecords.value = [sampleRecord()]
    r.save()
    expect(mockSetKV).toHaveBeenCalledWith(PRACTICES_KEY, expect.arrayContaining([expect.objectContaining({ id: 'meditation' })]))
    expect(mockSetKV).toHaveBeenCalledWith(BREAK_RECORDS_KEY, expect.arrayContaining([expect.objectContaining({ id: 'r1' })]))
  })

  it('savePractices 仅持久化休憩方式', () => {
    const r = useRest()
    r.practicesData.value = [samplePractice()]
    r.savePractices()
    expect(mockSetKV).toHaveBeenCalledWith(PRACTICES_KEY, expect.any(Array))
    expect(mockSetKV).not.toHaveBeenCalledWith(BREAK_RECORDS_KEY, expect.anything())
  })

  it('saveBreakRecords 仅持久化休息记录', () => {
    const r = useRest()
    r.breakRecords.value = [sampleRecord()]
    r.saveBreakRecords()
    expect(mockSetKV).toHaveBeenCalledWith(BREAK_RECORDS_KEY, expect.any(Array))
    expect(mockSetKV).not.toHaveBeenCalledWith(PRACTICES_KEY, expect.anything())
  })

  it('空存储时休憩方式回退到默认 12 种、记录为空', () => {
    const r = useRest()
    r.load()
    expect(r.practicesData.value.length).toBe(DEFAULT_PRACTICES.length)
    expect(r.breakRecords.value).toEqual([])
  })
})
