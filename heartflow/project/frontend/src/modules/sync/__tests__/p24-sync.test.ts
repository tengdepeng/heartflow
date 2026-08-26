// ============================================================
// P24-2 同步引擎 · 核心流程测试
// 覆盖：addTarget/removeTarget/updateTarget / exportPayload /
//       exportIncremental / importPayload / importPayloadWithConflictCheck /
//       createSnapshot / restoreSnapshot / resolveConflict /
//       resolveAllConflicts / updateConfig / sync 流程
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { SyncTarget } from '../types'
import {
  SYNC_CONFIG_KEY, SYNC_TARGETS_KEY, SYNC_SNAPSHOTS_KEY,
  SYNC_CURSOR_KEY,
} from '../types'

// ---- 共享可变状态 ----

const { getKvStore, resetKvStore, getStorageArrays, resetStorageArrays } = vi.hoisted(() => {
  let _kvStore: Record<string, any> = {}
  let _storageArrays: Record<string, any[]> = {
    sessions: [],
    crystals: [],
    notes: [],
    emotions: [],
    anchors: [],
    goals: [],
    relations: [],
    ledger: [],
    carriers: [],
    constitution: [],
  }

  return {
    getKvStore: () => _kvStore,
    resetKvStore: () => { _kvStore = {} },
    getStorageArrays: () => _storageArrays,
    resetStorageArrays: () => {
      _storageArrays = {
        sessions: [],
        crystals: [],
        notes: [],
        emotions: [],
        anchors: [],
        goals: [],
        relations: [],
        ledger: [],
        carriers: [],
        constitution: [],
      }
    },
  }
})

// ---- Mock engine/storage ----

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T,>(key: string, def: T): T => {
      const store = getKvStore()
      return store[key] !== undefined ? store[key] as T : def
    },
    setKV: (key: string, val: any) => {
      const store = getKvStore()
      store[key] = val
    },
    getSessions: () => getStorageArrays().sessions,
    getCrystals: () => getStorageArrays().crystals,
    getNotes: () => getStorageArrays().notes,
    getEmotions: () => getStorageArrays().emotions,
    getAnchors: () => getStorageArrays().anchors,
    getGoals: () => getStorageArrays().goals,
    getRelations: () => getStorageArrays().relations,
    getLedger: () => getStorageArrays().ledger,
    getCarriers: () => getStorageArrays().carriers,
    getConstitution: () => getStorageArrays().constitution,
  },
}))

// ---- Mock engine/data-port ----

let importResult = { sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, relations: 0, ledger: 0, carriers: 0, constitution: 0 }

vi.mock('../../../engine/data-port', () => ({
  importJSON: (_json: string) => importResult,
}))

// ---- 动态导入 ----

async function importSync() {
  const mod = await import('../index')
  return mod.useSync()
}

// ---- 辅助函数 ----

function makeTarget(overrides?: Partial<SyncTarget>): SyncTarget {
  return {
    id: 'device_1',
    name: '测试设备',
    type: 'remote',
    lastSyncAt: null,
    lastSyncStatus: 'idle',
    ...overrides,
  }
}

function makePayload(entries: Record<string, any[]>) {
  return {
    exportedAt: '2026-01-01T00:00:00.000Z',
    version: 2,
    ...entries,
  }
}

// ============================================================
// P24-2 同步引擎测试
// ============================================================

describe('P24-2 同步引擎', () => {
  let sync: ReturnType<typeof import('../index').useSync>

  // ---- 空状态 ----
  describe('空状态', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      importResult = { sessions: 0, crystals: 0, notes: 0, emotions: 0, anchors: 0, goals: 0, relations: 0, ledger: 0, carriers: 0, constitution: 0 }
      sync = await importSync()
    })

    describe('初始化', () => {
      it('config 合并默认配置', () => {
        expect(sync.config.value).toBeDefined()
        expect(sync.config.value.deviceId).toBeDefined()
      })

      it('targets 初始为空数组', () => {
        expect(Array.isArray(sync.targets.value)).toBe(true)
        expect(sync.targets.value.length).toBe(0)
      })

      it('logs 初始为空数组', () => {
        expect(sync.logs.value.length).toBe(0)
      })

      it('conflicts 初始为空数组', () => {
        expect(sync.conflicts.value.length).toBe(0)
      })

      it('snapshots 初始为空数组', () => {
        expect(sync.snapshots.value.length).toBe(0)
      })

      it('syncStatus 初始为 idle', () => {
        expect(sync.syncStatus.value).toBe('idle')
      })

      it('unresolvedConflictCount 为 0', () => {
        expect(sync.unresolvedConflictCount.value).toBe(0)
      })
    })
  })

  // ---- 目标管理 ----
  describe('目标管理', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      sync = await importSync()
    })

    describe('addTarget', () => {
      it('添加新目标', () => {
        const target = makeTarget()
        sync.addTarget(target)
        expect(sync.targets.value.length).toBe(1)
        expect(sync.targets.value[0].id).toBe('device_1')
      })

      it('重复添加相同 ID 合并属性', () => {
        sync.addTarget(makeTarget({ id: 'dev_x', name: '旧名称' }))
        sync.addTarget(makeTarget({ id: 'dev_x', name: '新名称' }))
        expect(sync.targets.value.length).toBe(1)
        expect(sync.targets.value[0].name).toBe('新名称')
      })

      it('添加后持久化', () => {
        sync.addTarget(makeTarget())
        const store = getKvStore()
        const saved = store[SYNC_TARGETS_KEY]
        expect(saved.length).toBe(1)
      })
    })

    describe('removeTarget', () => {
      it('删除存在的目标', () => {
        sync.addTarget(makeTarget({ id: 'dev_1' }))
        sync.addTarget(makeTarget({ id: 'dev_2' }))
        sync.removeTarget('dev_1')
        expect(sync.targets.value.length).toBe(1)
        expect(sync.targets.value[0].id).toBe('dev_2')
      })

      it('删除不存在的目标不报错', () => {
        expect(() => sync.removeTarget('nonexistent')).not.toThrow()
      })
    })

    describe('updateTarget', () => {
      it('部分更新目标属性', () => {
        sync.addTarget(makeTarget({ id: 'dev_1', name: '原始名称' }))
        sync.updateTarget('dev_1', { name: '更新名称' })
        expect(sync.targets.value[0].name).toBe('更新名称')
      })

      it('更新不存在的目标不报错', () => {
        expect(() => sync.updateTarget('nonexistent', { name: 'X' })).not.toThrow()
      })
    })
  })

  // ---- 配置管理 ----
  describe('配置管理', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      sync = await importSync()
    })

    it('updateConfig 部分更新', () => {
      sync.updateConfig({ deviceName: '新设备名' })
      expect(sync.config.value.deviceName).toBe('新设备名')
      expect(sync.config.value.conflictStrategy).toBe('last-write-wins')
    })

    it('updateConfig 保留未修改字段', () => {
      sync.updateConfig({ deviceName: 'X' })
      expect(sync.config.value.logRetentionLimit).toBe(50)
    })

    it('updateConfig 持久化', () => {
      sync.updateConfig({ deviceName: '持久化设备' })
      const store = getKvStore()
      const saved = store[SYNC_CONFIG_KEY]
      expect(saved.deviceName).toBe('持久化设备')
    })
  })

  // ---- 数据导出 ----
  describe('数据导出', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      const arr = getStorageArrays()
      arr.sessions = [{ id: 's1', name: 'session1', createdAt: '2026-01-01' }]
      arr.crystals = [{ id: 'c1', color: 'blue', createdAt: '2026-01-01' }]
      sync = await importSync()
    })

    describe('exportPayload', () => {
      it('导出包含 exportedAt 和 version', () => {
        const payload = sync.exportPayload()
        expect(payload.exportedAt).toBeDefined()
        expect(payload.version).toBe(2)
      })

      it('导出包含 sessions 数据', () => {
        const payload = sync.exportPayload()
        expect(payload.sessions).toBeDefined()
        expect(payload.sessions!.length).toBe(1)
      })

      it('导出包含 crystals 数据', () => {
        const payload = sync.exportPayload()
        expect(payload.crystals).toBeDefined()
        expect(payload.crystals!.length).toBe(1)
      })
    })

    describe('exportIncremental', () => {
      it('无游标时导出全部数据', () => {
        const result = sync.exportIncremental(['sessions'])
        expect(result.sessions).toBeDefined()
        expect(result.sessions!.length).toBe(1)
      })

      it('有游标时只导出增量', () => {
        const cursorStore = getKvStore()
        cursorStore[SYNC_CURSOR_KEY] = { sessions: '2027-01-01T00:00:00.000Z' }
        const result = sync.exportIncremental(['sessions'])
        expect(result.sessions).toBeUndefined()
      })

      it('游标晚于数据时间时导出空', async () => {
        const arr = getStorageArrays()
        arr.sessions = [{ id: 's1', createdAt: '2025-01-01' }]
        sync = await importSync()

        const cursorStore = getKvStore()
        cursorStore[SYNC_CURSOR_KEY] = { sessions: '2026-06-01T00:00:00.000Z' }
        const result = sync.exportIncremental(['sessions'])
        expect(result.sessions).toBeUndefined()
      })
    })
  })

  // ---- 快照管理 ----
  describe('快照管理', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      sync = await importSync()
    })

    describe('createSnapshot', () => {
      it('创建快照返回有效 Snapshot', () => {
        const snap = sync.createSnapshot()
        expect(snap.id).toBeDefined()
        expect(snap.totalEntries).toBe(0)
        expect(snap.sizeBytes).toBeGreaterThan(0)
      })

      it('快照添加到 snapshots 列表', () => {
        sync.createSnapshot()
        expect(sync.snapshots.value.length).toBe(1)
      })

      it('快照数据持久化', () => {
        const snap = sync.createSnapshot()
        const store = getKvStore()
        const payload = store[`${SYNC_SNAPSHOTS_KEY}:${snap.id}`]
        expect(payload).toBeDefined()
      })
    })

    describe('loadSnapshotPayload', () => {
      it('加载存在的快照', () => {
        const snap = sync.createSnapshot()
        const payload = sync.loadSnapshotPayload(snap.id)
        expect(payload).toBeDefined()
        expect(payload!.version).toBe(2)
      })

      it('加载不存在的快照返回 null', () => {
        const payload = sync.loadSnapshotPayload('nonexistent')
        expect(payload).toBeNull()
      })
    })

    describe('restoreSnapshot', () => {
      it('恢复存在的快照返回 true', () => {
        const snap = sync.createSnapshot()
        const result = sync.restoreSnapshot(snap.id)
        expect(result).toBe(true)
      })

      it('恢复不存在的快照返回 false', () => {
        const result = sync.restoreSnapshot('nonexistent')
        expect(result).toBe(false)
      })
    })
  })

  // ---- 冲突检测与解决 ----
  describe('冲突检测与解决', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      const arr = getStorageArrays()
      arr.sessions = [{ id: 's1', name: '本地会话', createdAt: '2026-01-01' }]
      arr.crystals = [{ id: 'c1', color: 'red', createdAt: '2026-01-01' }]
      sync = await importSync()
    })

    describe('importPayloadWithConflictCheck', () => {
      it('相同数据不产生冲突', () => {
        const payload = makePayload({
          sessions: [{ id: 's1', name: '本地会话', createdAt: '2026-01-01' }],
        })
        const result = sync.importPayloadWithConflictCheck(payload, 'device_2')
        expect(result.conflicts).toBe(0)
      })

      it('不同数据产生冲突', () => {
        const payload = makePayload({
          sessions: [{ id: 's1', name: '远程会话', createdAt: '2026-01-01' }],
        })
        const result = sync.importPayloadWithConflictCheck(payload, 'device_2')
        expect(result.conflicts).toBeGreaterThan(0)
      })

      it('已存在未解决冲突不重复创建', () => {
        const payload = makePayload({
          sessions: [{ id: 's1', name: '远程会话', createdAt: '2026-01-01' }],
        })
        sync.importPayloadWithConflictCheck(payload, 'device_2')
        const firstCount = sync.conflicts.value.length
        sync.importPayloadWithConflictCheck(payload, 'device_2')
        expect(sync.conflicts.value.length).toBe(firstCount)
      })

      it('无 id 的条目不参与冲突检测', () => {
        const payload = makePayload({
          sessions: [{ name: 'no-id-session', createdAt: '2026-01-01' }],
        })
        const result = sync.importPayloadWithConflictCheck(payload, 'device_2')
        expect(result.conflicts).toBe(0)
      })
    })

    describe('resolveConflict', () => {
      it('local 策略保留本地数据', async () => {
        const arr = getStorageArrays()
        arr.sessions = [{ id: 's1', name: '本地', createdAt: '2026-01-01' }]
        sync = await importSync()

        const payload = makePayload({
          sessions: [{ id: 's1', name: '远程', createdAt: '2026-01-02' }],
        })
        sync.importPayloadWithConflictCheck(payload, 'device_2')
        const conflict = sync.conflicts.value[0]
        const result = sync.resolveConflict(conflict.id, 'local')
        expect(result).toBe(true)
        expect(conflict.resolution).toBe('local')
        expect(conflict.resolvedAt).not.toBeNull()
      })

      it('remote 策略覆盖本地数据', async () => {
        const arr = getStorageArrays()
        arr.sessions = [{ id: 's1', name: '本地', createdAt: '2026-01-01' }]
        sync = await importSync()

        const payload = makePayload({
          sessions: [{ id: 's1', name: '远程', createdAt: '2026-01-02' }],
        })
        sync.importPayloadWithConflictCheck(payload, 'device_2')
        const conflict = sync.conflicts.value[0]
        const result = sync.resolveConflict(conflict.id, 'remote')
        expect(result).toBe(true)
        expect(conflict.resolution).toBe('remote')
      })

      it('解决不存在的冲突返回 false', () => {
        const result = sync.resolveConflict('nonexistent', 'local')
        expect(result).toBe(false)
      })
    })

    describe('resolveAllConflicts', () => {
      it('批量解决所有冲突', async () => {
        const arr = getStorageArrays()
        arr.sessions = [
          { id: 's1', name: '本地1', createdAt: '2026-01-01' },
          { id: 's2', name: '本地2', createdAt: '2026-01-01' },
        ]
        sync = await importSync()

        const payload = makePayload({
          sessions: [
            { id: 's1', name: '远程1', createdAt: '2026-01-02' },
            { id: 's2', name: '远程2', createdAt: '2026-01-02' },
          ],
        })
        sync.importPayloadWithConflictCheck(payload, 'device_2')
        const count = sync.resolveAllConflicts('local')
        expect(count).toBe(2)
      })

      it('无冲突时返回 0', () => {
        const count = sync.resolveAllConflicts('local')
        expect(count).toBe(0)
      })
    })
  })

  // ---- 同步执行流程 ----
  describe('同步执行', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      const arr = getStorageArrays()
      arr.sessions = [{ id: 's1', createdAt: '2026-01-01' }]
      sync = await importSync()
    })

    it('目标不存在时返回 error', async () => {
      const status = await sync.sync('nonexistent', 'export')
      expect(status).toBe('error')
      expect(sync.syncError.value).toBe('同步目标不存在')
    })

    it('export 方向同步成功', async () => {
      sync.addTarget(makeTarget({ id: 'target_1' }))
      const status = await sync.sync('target_1', 'export')
      expect(status).toBe('success')
      expect(sync.logs.value.length).toBeGreaterThan(0)
    })

    it('export 同步后更新目标状态', async () => {
      sync.addTarget(makeTarget({ id: 'target_1' }))
      await sync.sync('target_1', 'export')
      const target = sync.targets.value.find(t => t.id === 'target_1')
      expect(target!.lastSyncStatus).toBe('success')
      expect(target!.lastSyncAt).not.toBeNull()
    })

    it('bidirectional 同步成功', async () => {
      sync.addTarget(makeTarget({ id: 'target_1' }))
      const status = await sync.sync('target_1', 'bidirectional')
      expect(['success', 'conflict']).toContain(status)
    })
  })

  // ---- 完整工作流 ----
  describe('完整工作流', () => {
    beforeEach(async () => {
      vi.clearAllMocks()
      resetKvStore()
      resetStorageArrays()
      const arr = getStorageArrays()
      arr.sessions = [{ id: 's1', name: '工作会话', createdAt: '2026-01-01' }]
      arr.crystals = [{ id: 'c1', color: 'gold', createdAt: '2026-01-01' }]
      sync = await importSync()
    })

    it('添加目标 → 创建快照 → 同步 → 解决冲突', async () => {
      sync.addTarget(makeTarget({ id: 'device_a' }))
      sync.createSnapshot()
      expect(sync.snapshots.value.length).toBe(1)

      const status = await sync.sync('device_a', 'export')
      expect(status).toBe('success')
      expect(sync.logs.value.length).toBe(1)
    })

    it('配置更新 → 创建多个快照 → 快照超限自动淘汰', () => {
      sync.updateConfig({ snapshotRetentionLimit: 3 })
      for (let i = 0; i < 5; i++) {
        sync.createSnapshot()
      }
      expect(sync.snapshots.value.length).toBe(3)
    })

    it('日志保留上限', async () => {
      sync.updateConfig({ logRetentionLimit: 3 })
      sync.addTarget(makeTarget({ id: 't1' }))
      for (let i = 0; i < 5; i++) {
        await sync.sync('t1', 'export')
      }
      expect(sync.logs.value.length).toBeLessThanOrEqual(3)
    })
  })
})