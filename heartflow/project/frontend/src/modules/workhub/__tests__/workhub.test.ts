// ============================================================
// useWorkHub 模块测试
// 工作中心通用列表数据层：按种类键读取 / 写入，保留 K(k) 键拼接。
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
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useWorkHub } from '../workhub'

describe('useWorkHub 通用列表数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
  })

  it('load 按种类键读取列表（默认空数组）', () => {
    const wh = useWorkHub()
    expect(wh.load('marks')).toEqual([])
    expect(mockGetKV).toHaveBeenCalledWith('hf:work_marks', [])
  })

  it('save 按种类键写入列表并保留键拼接', () => {
    const wh = useWorkHub()
    const list = [{ id: 'mk1' }]
    wh.save('marks', list)
    expect(store['hf:work_marks']).toEqual(list)
    expect(mockSetKV).toHaveBeenCalledWith('hf:work_marks', list)
  })

  it('load 返回存储中的已有数据', () => {
    store['hf:work_values'] = [{ id: 'vl1' }]
    const wh = useWorkHub()
    expect(wh.load('values')).toEqual([{ id: 'vl1' }])
  })

  it('读取不同种类键互不干扰', () => {
    const wh = useWorkHub()
    wh.save('skills', [{ id: 'sk1' }])
    wh.save('breaks', [{ id: 'br1' }])
    expect(wh.load('skills')).toEqual([{ id: 'sk1' }])
    expect(wh.load('breaks')).toEqual([{ id: 'br1' }])
    expect(wh.load('works')).toEqual([])
  })

  it('存储异常时 load 返回空数组', () => {
    mockGetKV.mockImplementation(() => {
      throw new Error('boom')
    })
    const wh = useWorkHub()
    expect(wh.load('works')).toEqual([])
  })
})
