// ============================================================
// useMemorialSeats 模块测试
// 留座（纪念座位）数据层：从 storage 载入、整体保存、增删
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getKV, setKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const getKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const setKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { getKV, setKV }
})

vi.mock('../../../engine/storage', () => ({ storage: { getKV, setKV } }))

import { useMemorialSeats } from '../memorial-seats'

const KEY = 'relationhall_memorial_seats'

function sampleSeat(partial: Partial<Parameters<ReturnType<typeof useMemorialSeats>['add']>[0]> = {}) {
  return {
    id: 's1',
    name: '怀念的人',
    relation: '好友',
    reason: 'passed' as const,
    message: '想你',
    createdAt: Date.now(),
    ...partial,
  }
}

describe('useMemorialSeats 留座数据层', () => {
  beforeEach(() => {
    getKV.mockClear()
    setKV.mockClear()
    getKV.mockImplementation((_k: string, d: any) => d)
    // 重置模块级单例
    useMemorialSeats().load()
  })

  it('load 从存储读取留座列表', () => {
    getKV.mockImplementation((k: string, d: any) => (k === KEY ? [sampleSeat()] : d))
    const m = useMemorialSeats()
    m.load()
    expect(m.seats.value.length).toBe(1)
    expect(m.seats.value[0].name).toBe('怀念的人')
    expect(getKV).toHaveBeenCalledWith(KEY, [])
  })

  it('add 追加一条留座并持久化', () => {
    const m = useMemorialSeats()
    m.add(sampleSeat({ id: 'a' }))
    expect(m.seats.value.length).toBe(1)
    expect(setKV).toHaveBeenCalledWith(KEY, expect.arrayContaining([expect.objectContaining({ id: 'a' })]))
  })

  it('remove 删除指定 id 的留座', () => {
    const m = useMemorialSeats()
    m.add(sampleSeat({ id: 'a' }))
    m.add(sampleSeat({ id: 'b' }))
    m.remove('a')
    expect(m.seats.value.map((s) => s.id)).toEqual(['b'])
  })

  it('save 整体覆盖并持久化', () => {
    const m = useMemorialSeats()
    const list = [sampleSeat({ id: 'a' }), sampleSeat({ id: 'b' })]
    m.save(list)
    expect(m.seats.value.length).toBe(2)
    expect(setKV).toHaveBeenCalledWith(KEY, list)
  })

  it('空存储时返回默认空列表', () => {
    const m = useMemorialSeats()
    m.load()
    expect(m.seats.value).toEqual([])
  })
})
