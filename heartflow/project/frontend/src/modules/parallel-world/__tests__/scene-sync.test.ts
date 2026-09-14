// ============================================================
// 平行世界 · 场景同步引擎测试（INCR-78 · scene-sync.ts）
// 预览 · 冲突识别 · 策略执行 · 差异率 · 持久化
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Checkpoint, WorldBranch } from '../types'

describe('useSceneSync 场景同步', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  function cp(id: string, branchId: string, over: Record<string, unknown> = {}): Checkpoint {
    return {
      id, branchId, label: id, description: '',
      snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'], ...over,
    } as Checkpoint
  }

  function br(id: string, name: string): WorldBranch {
    return {
      id, name, description: '', color: '#8a9a7a',
      createdAt: '2026-01-01T00:00:00.000Z', isActive: false, checkpointCount: 0,
    } as WorldBranch
  }

  // 构造一个可在测试中自检写入的容器
  async function makeSync(branches: WorldBranch[] = [], checkpoints: Checkpoint[] = []) {
    const { useSceneSync } = await import('../scene-sync')
    const replica: Checkpoint[] = checkpoints.map(c => ({ ...c, tags: [...c.tags] }))
    const created: unknown[] = []
    const updated: unknown[] = []
    const sync = useSceneSync(
      () => branches,
      () => replica,
      (branchId: string) => replica.filter(c => c.branchId === branchId),
      (branchId, label, description = '', snapshot = {}, tags: string[] = []) => {
        const createdCp: Checkpoint = {
          id: `n-${replica.length}`,
          branchId, label, description,
          snapshot, createdAt: new Date().toISOString(), tags: [...tags],
        }
        replica.push(createdCp)
        created.push(createdCp)
        return createdCp
      },
      (checkpointId, updates: Partial<Checkpoint>) => {
        const idx = replica.findIndex(c => c.id === checkpointId)
        if (idx < 0) return undefined
        replica[idx] = { ...replica[idx], ...updates }
        updated.push({ checkpointId, updates })
        return replica[idx]
      },
    )
    return { sync, replica, created, updated }
  }

  it('默认配置与空历史', async () => {
    const { sync } = await makeSync()
    expect(sync.history.value.length).toBe(0)
    expect(sync.config.value.defaultStrategy).toBe('manual')
    expect(sync.config.value.autoSyncTargets).toEqual(['tags'])
  })

  it('previewSync 识别新增/更新/冲突', async () => {
    const { sync } = await makeSync(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
        cp('a1', 'a'),
        cp('b1', 'b'),
      ],
    )
    const preview = sync.previewSync('a', 'b', ['all'])
    expect(preview.newCheckpoints.map(c => c.id)).toContain('a1')
    expect(preview.updatedCheckpoints.length).toBe(1)
    expect(preview.conflicts.length).toBe(1)
    expect(preview.conflicts[0].description).toContain('快照数据冲突')
  })

  it('手动策略遇冲突置为 pending，可手动解决冲突', async () => {
    const { sync } = await makeSync(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
        cp('a1', 'a'),
      ],
    )
    const event = await sync.pushSync('a', 'b', ['all'], 'manual')
    expect(event.status).toBe('pending')
    expect(event.conflictCount).toBe(1)
    expect(sync.conflicts.value.length).toBe(1)

    sync.resolveConflict(sync.conflicts.value[0].id, 'keep-target')
    expect(sync.conflicts.value[0].resolved).toBe(true)
  })

  it('auto 策略自动解决冲突并完成同步，计入写入', async () => {
    const { sync, created, updated } = await makeSync(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
        cp('a1', 'a'),
      ],
    )
    sync.updateConfig({ autoResolveConflicts: true })
    const event = await sync.pushSync('a', 'b', ['all'], 'auto')
    expect(event.status).toBe('completed')
    expect(event.addedCount).toBe(1)
    expect(event.updatedCount).toBe(1)
    expect(created.length).toBe(1)
    expect(updated.length).toBeGreaterThanOrEqual(1)
  })

  it('getSyncDiff 计算分支差异率', async () => {
    const { sync } = await makeSync(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
        cp('a1', 'a'),
        cp('b1', 'b'),
      ],
    )
    const diff = sync.getSyncDiff('a', 'b')
    expect(diff.aOnly.map(c => c.id)).toContain('a1')
    expect(diff.bOnly.map(c => c.id)).toContain('b1')
    expect(diff.common.length).toBe(1)
    expect(diff.common[0].diverged).toBe(true)
    expect(diff.divergenceRate).toBe(100)
  })

  it('双向同步产生两个事件并可持久化回读', async () => {
    const { sync } = await makeSync(
      [br('a', '主'), br('b', '平行')],
      [cp('a1', 'a'), cp('b1', 'b')],
    )
    // 双向同步会来回补全，先走简单两分支
    const res = await sync.bidirectionalSync('a', 'b', ['tags'], 'auto')
    expect(['completed', 'pending']).toContain(res.aToB.status)
    expect(res.bToA.status).toBe('completed')
    // 新实例可读回历史
    const { sync: sync2 } = await makeSync()
    expect(sync2.history.value.length).toBe(2)
  })
})