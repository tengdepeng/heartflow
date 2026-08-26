import { describe, it, expect, beforeEach } from 'vitest'
import { useHomeReplica, type HomeReplicaManifest } from '../useHomeReplica'
import { storage } from '../../../engine/storage'

const REPLICA_KEY = 'hf:home_replica_assets'

const validManifest: HomeReplicaManifest = {
  version: 1,
  unit: 'm',
  camera: { position: [6, 4, 9], target: [0, 1, 0] },
  rooms: [
    { id: 'living-room', name: '客厅', model: '/home-replica/living-room.glb', position: [0, 0, 0] },
  ],
  note: 'test',
}

describe('useHomeReplica · 资产清单契约', () => {
  beforeEach(() => {
    storage.setKV(REPLICA_KEY, null)
  })

  it('初始默认加载随包真实家清单（M3 加载接入）', () => {
    const { hasManifest, roomCount, rooms } = useHomeReplica()
    expect(hasManifest.value).toBe(true)
    expect(roomCount.value).toBe(5)
    const ids = rooms.value.map((r) => r.id)
    expect(ids).toEqual(
      expect.arrayContaining(['living-room', 'bedroom', 'kitchen', 'study', 'balcony']),
    )
  })

  it('save 合法 manifest 后可 load 并读取房间', () => {
    const a = useHomeReplica()
    expect(a.save(validManifest)).toBe(true)
    const b = useHomeReplica()
    expect(b.hasManifest.value).toBe(true)
    expect(b.roomCount.value).toBe(1)
    expect(b.rooms.value[0].name).toBe('客厅')
  })

  it('save 非法 manifest（缺 rooms / 版本错）返回 false 且不写入', () => {
    const a = useHomeReplica()
    expect(a.save({ version: 2, unit: 'm', rooms: [] } as unknown as HomeReplicaManifest)).toBe(false)
    expect(a.save({ version: 1, unit: 'cm', rooms: [] } as unknown as HomeReplicaManifest)).toBe(false)
    // 非法 save 不写入；默认仍兜底随包真实家清单
    expect(a.hasManifest.value).toBe(true)
  })

  it('reset 清空清单', () => {
    const a = useHomeReplica()
    a.save(validManifest)
    expect(a.hasManifest.value).toBe(true)
    a.reset()
    expect(a.hasManifest.value).toBe(false)
  })

  it('KV 中非法/空数据 → 兜底随包真实清单（不崩溃）', () => {
    storage.setKV(REPLICA_KEY, { foo: 'bar' })
    const { hasManifest, manifest } = useHomeReplica()
    // 非法 KV 不再置 null，而是优雅兜底随包真实家清单
    expect(hasManifest.value).toBe(true)
    expect(manifest.value?.rooms.length).toBe(5)
  })

  it('save 含多格式 kind（plan/image）合法通过', () => {
    const a = useHomeReplica()
    const mixed: HomeReplicaManifest = {
      version: 1,
      unit: 'm',
      rooms: [
        { id: 'home-plan', name: '户型图', kind: 'plan', model: '/home-replica/home-plan.svg' },
        { id: 'living-art', name: '客厅挂画', kind: 'image', model: '/home-replica/living.jpg' },
        { id: 'living', name: '客厅', model: '/home-replica/living.glb' },
      ],
    }
    expect(a.save(mixed)).toBe(true)
    const b = useHomeReplica()
    expect(b.roomCount.value).toBe(3)
    expect(b.rooms.value[0].kind).toBe('plan')
  })

  it('save 含非法 kind（如 video）返回 false 且不写入', () => {
    const a = useHomeReplica()
    const bad = {
      version: 1,
      unit: 'm',
      rooms: [{ id: 'x', name: 'X', model: '/x.jpg', kind: 'video' }],
    }
    expect(a.save(bad as unknown as HomeReplicaManifest)).toBe(false)
    // 非法 save 不写入；默认仍兜底随包真实家清单
    expect(a.hasManifest.value).toBe(true)
  })
})
