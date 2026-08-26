// ============================================================
// useScarMarks 模块测试
// 痕记数据层：从 storage 载入、整体保存、增删改
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

import { useScarMarks } from '../marks'
import { SCAR_STORAGE_KEYS } from '../types'
import type { ScarMark } from '../marks'

function sampleMark(partial: Partial<ScarMark> = {}): ScarMark {
  return {
    id: 'm1',
    bodyPart: '腰',
    severity: 3,
    description: '久坐腰酸',
    scarType: 'wear',
    at: '2026-06-15T08:00:00.000Z',
    ...partial,
  }
}

describe('useScarMarks 痕记数据层', () => {
  beforeEach(() => {
    getKV.mockClear()
    setKV.mockClear()
    // 清空存储与模块级单例，避免用例间状态泄漏
    getKV.mockImplementation((_k: string, d: any) => d)
    useScarMarks().load()
  })

  it('load 从存储读取痕记列表', () => {
    getKV.mockImplementation((k: string, d: any) =>
      k === SCAR_STORAGE_KEYS.MARKS ? [sampleMark()] : d,
    )
    const m = useScarMarks()
    m.load()
    expect(m.marks.value.length).toBe(1)
    expect(m.marks.value[0].bodyPart).toBe('腰')
    expect(getKV).toHaveBeenCalledWith(SCAR_STORAGE_KEYS.MARKS, [])
  })

  it('save 覆盖列表并持久化到存储', () => {
    const m = useScarMarks()
    const list = [sampleMark({ id: 'a' }), sampleMark({ id: 'b' })]
    m.save(list)
    expect(m.marks.value.length).toBe(2)
    expect(setKV).toHaveBeenCalledWith(SCAR_STORAGE_KEYS.MARKS, list)
  })

  it('add 追加一条痕记并持久化', () => {
    const m = useScarMarks()
    m.save([sampleMark({ id: 'a' })])
    m.add(sampleMark({ id: 'b' }))
    expect(m.marks.value.map((x) => x.id)).toEqual(['a', 'b'])
    expect(setKV).toHaveBeenLastCalledWith(
      SCAR_STORAGE_KEYS.MARKS,
      expect.arrayContaining([expect.objectContaining({ id: 'b' })]),
    )
  })

  it('remove 删除指定 id 的痕记', () => {
    const m = useScarMarks()
    m.save([sampleMark({ id: 'a' }), sampleMark({ id: 'b' })])
    m.remove('a')
    expect(m.marks.value.map((x) => x.id)).toEqual(['b'])
  })

  it('update 更新指定 id 的痕记', () => {
    const m = useScarMarks()
    m.save([sampleMark({ id: 'a', severity: 3 })])
    m.update(sampleMark({ id: 'a', severity: 5 }))
    expect(m.marks.value[0].severity).toBe(5)
    expect(m.marks.value.length).toBe(1)
  })

  it('空存储时返回默认空列表', () => {
    const m = useScarMarks()
    m.load()
    expect(m.marks.value).toEqual([])
  })
})
