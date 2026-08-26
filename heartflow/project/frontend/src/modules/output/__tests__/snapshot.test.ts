// ============================================================
// 输出管理 · 版本快照模块测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { OutputRecord } from '../types'

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

import { useOutputSnapshots } from '../snapshot'

function makeRecord(id: string, content: string): OutputRecord {
  return {
    id,
    type: 'note',
    content,
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: '2026-08-21T10:00:00.000Z',
    roomSource: '思绪书房',
    status: 'published',
  }
}

describe('useOutputSnapshots 版本快照', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(k => delete store[k])
    useOutputSnapshots().load()
  })

  it('初始无快照', () => {
    const api = useOutputSnapshots()
    expect(api.snapshots.value).toEqual([])
  })

  it('createSnapshot 深拷贝记录并记录数量', () => {
    const api = useOutputSnapshots()
    const records = [makeRecord('1', '第一条'), makeRecord('2', '第二条')]
    const snap = api.createSnapshot(records, '初版')
    expect(snap).not.toBeNull()
    expect(snap!.recordCount).toBe(2)
    expect(snap!.label).toBe('初版')
    expect(store['hf:output_snapshots']).toHaveLength(1)
    // 深拷贝：修改原记录不影响快照
    records[0].content = '已修改'
    const restored = api.getSnapshotRecords(snap!.id)!
    expect(restored[0].content).toBe('第一条')
  })

  it('createSnapshot 无标签时使用默认标签', () => {
    const api = useOutputSnapshots()
    const snap = api.createSnapshot([], '')
    expect(snap!.label).toContain('快照')
  })

  it('getSnapshotRecords 返回深拷贝', () => {
    const api = useOutputSnapshots()
    const snap = api.createSnapshot([makeRecord('1', '内容')], 'x')
    const restored = api.getSnapshotRecords(snap!.id)!
    expect(restored).toHaveLength(1)
    restored[0].content = '改了'
    // 再次取回仍是原始内容
    expect(api.getSnapshotRecords(snap!.id)![0].content).toBe('内容')
  })

  it('getSnapshotRecords 未知 id 返回 null', () => {
    const api = useOutputSnapshots()
    expect(api.getSnapshotRecords('nonexistent')).toBeNull()
  })

  it('deleteSnapshot 删除并保存', () => {
    const api = useOutputSnapshots()
    const snap = api.createSnapshot([], '待删')
    api.deleteSnapshot(snap!.id)
    expect(api.snapshots.value).toHaveLength(0)
    expect(store['hf:output_snapshots']).toHaveLength(0)
  })

  it('clearSnapshots 清空', () => {
    const api = useOutputSnapshots()
    api.createSnapshot([], 'a')
    api.createSnapshot([], 'b')
    api.clearSnapshots()
    expect(api.snapshots.value).toHaveLength(0)
  })

  it('load 读取已存快照', () => {
    store['hf:output_snapshots'] = [
      { id: 's1', label: '旧快照', createdAt: '2026-08-20T00:00:00.000Z', recordCount: 3, records: [] },
    ]
    const api = useOutputSnapshots()
    api.load()
    expect(api.snapshots.value).toHaveLength(1)
    expect(api.snapshots.value[0].label).toBe('旧快照')
  })
})
