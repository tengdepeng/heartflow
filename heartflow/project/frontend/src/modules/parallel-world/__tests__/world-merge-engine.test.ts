// ============================================================
// 平行世界 · 世界融合引擎测试（INCR-79 · world-merge-engine.ts）
// 合并预览 · 冲突检测/解决 · 策略执行 · 遗产继承 · 回滚
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Checkpoint, WorldBranch, WorldSnapshot } from '../types'

describe('useWorldMergeEngine 世界融合', () => {
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

  function br(id: string, name: string, over: Record<string, unknown> = {}): WorldBranch {
    return {
      id, name, description: '', color: '#8a9a7a',
      createdAt: '2026-01-01T00:00:00.000Z', isActive: false, checkpointCount: 0, ...over,
    } as WorldBranch
  }

  async function makeEngine(
    branches: WorldBranch[] = [],
    checkpoints: Checkpoint[] = [],
    snapshots: WorldSnapshot[] = [],
  ) {
    const { useWorldMergeEngine } = await import('../world-merge-engine')
    const persisted: unknown[] = []
    const engine = useWorldMergeEngine(
      () => branches,
      () => checkpoints,
      () => snapshots,
      async () => { persisted.push(1) },
    )
    return { engine, branches, checkpoints, snapshots, persisted }
  }

  it('默认配置与空状态', async () => {
    const { engine } = await makeEngine()
    expect(engine.mergeConfig.value.defaultStrategy).toBe('three-way')
    expect(engine.mergeConfig.value.autoResolveNonCritical).toBe(true)
    expect(engine.successfulMergeCount.value).toBe(0)
    expect(engine.latestMergeResult.value).toBeNull()
    expect(engine.getRollbackHistory().length).toBe(0)
  })

  it('previewMerge 识别新增/修改/冲突', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
        cp('a1', 'a'),
      ],
    )
    const preview = engine.previewMerge('a', 'b')
    expect(preview).not.toBeNull()
    expect(preview!.newCheckpoints).toBe(1)
    expect(preview!.modifiedCheckpoints).toBe(1)
    // s1 同标签 → label 冲突；快照 v 不同 → data 冲突；同 tags → tag 冲突
    expect(preview!.totalConflicts).toBe(3)
    expect(preview!.allResolved).toBe(false)
  })

  it('previewMerge 分支不存在返回 null', async () => {
    const { engine } = await makeEngine([br('a', '主')], [])
    expect(engine.previewMerge('a', 'missing')).toBeNull()
    expect(engine.previewMerge('missing', 'a')).toBeNull()
  })

  it('autoResolveNonCritical 只解决非关键冲突', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
      ],
    )
    const preview = engine.previewMerge('a', 'b')
    const resolved = engine.autoResolveNonCritical(preview!.id)
    // tag(info) + label(warning) 被自动解决，data(critical) 保留
    expect(resolved).toBe(2)
    expect(preview!.resolvedConflicts).toBe(2)
    expect(preview!.allResolved).toBe(false)
    const dataConflict = preview!.conflicts.find(c => c.type === 'data')
    expect(dataConflict!.resolved).toBe(false)
  })

  it('resolveConflict 手动解决关键冲突后 allResolved 为 true', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
      ],
    )
    const preview = engine.previewMerge('a', 'b')
    engine.autoResolveNonCritical(preview!.id)
    const dataConflict = preview!.conflicts.find(c => c.type === 'data')!
    expect(engine.resolveConflict(preview!.id, dataConflict.id, 'keep-source')).toBe(true)
    expect(preview!.allResolved).toBe(true)
    expect(engine.resolveConflict('nope', dataConflict.id, 'merge')).toBe(false)
  })

  it('fast-forward 合并将源检查点追加到目标分支', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [cp('a1', 'a'), cp('a2', 'a'), cp('b1', 'b')],
    )
    const result = await engine.executeMerge('a', 'b', 'fast-forward')
    expect(result.success).toBe(true)
    expect(result.mergedCheckpoints.length).toBe(2)
    expect(result.mergedCheckpoints.every(c => c.branchId === 'b')).toBe(true)
    expect(engine.successfulMergeCount.value).toBe(1)
    expect(engine.latestMergeResult.value?.summary).toContain('快进合并')
  })

  it('three-way 合并遇未解决关键冲突时失败', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
      ],
    )
    const result = await engine.executeMerge('a', 'b', 'three-way')
    expect(result.success).toBe(false)
    expect(result.summary).toContain('冲突未解决')
  })

  it('three-way 合并按 keep-source 方案取源快照', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('s1', 'a', { snapshot: { v: 1 } }),
        cp('s1', 'b', { snapshot: { v: 2 } }),
      ],
    )
    const preview = engine.previewMerge('a', 'b', 'three-way')
    engine.autoResolveNonCritical(preview!.id)
    const dataConflict = preview!.conflicts.find(c => c.type === 'data')!
    engine.resolveConflict(preview!.id, dataConflict.id, 'keep-source')
    const result = await engine.executeMerge('a', 'b', 'three-way', preview!.id)
    expect(result.success).toBe(true)
    const merged = result.mergedCheckpoints.find(c => c.label === 's1')
    expect(merged!.snapshot).toEqual({ v: 1 })
  })

  it('squash 合并将源检查点压缩为一个', async () => {
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [
        cp('a1', 'a', { label: 'A', snapshot: { x: 1 }, tags: ['life'] }),
        cp('a2', 'a', { label: 'B', snapshot: { y: 2 }, tags: ['work'] }),
      ],
    )
    const result = await engine.executeMerge('a', 'b', 'squash')
    expect(result.success).toBe(true)
    expect(result.mergedCheckpoints.length).toBe(1)
    expect(result.mergedCheckpoints[0].snapshot).toEqual({ x: 1, y: 2 })
    expect([...result.mergedCheckpoints[0].tags].sort()).toEqual(['life', 'work'])
    expect(result.mergedCheckpoints[0].label).toContain('[合并]')
  })

  it('executeMerge 分支不存在返回失败', async () => {
    const { engine } = await makeEngine([br('a', '主')], [])
    const result = await engine.executeMerge('a', 'missing')
    expect(result.success).toBe(false)
    expect(result.summary).toContain('分支不存在')
  })

  it('合并后沉淀遗产：检查点/标签/颜色', async () => {
    const { engine } = await makeEngine(
      [br('a', '主', { color: '#4A90D9' }), br('b', '平行')],
      [cp('a1', 'a', { tags: ['life', 'work'] })],
    )
    await engine.executeMerge('a', 'b', 'fast-forward')
    const legacies = engine.getAllLegacies()
    expect(legacies.some(l => l.type === 'checkpoint')).toBe(true)
    expect(legacies.some(l => l.type === 'tag')).toBe(true)
    expect(legacies.some(l => l.type === 'color')).toBe(true)
    expect(engine.getLegacyForBranch('a').length).toBe(legacies.length)
    expect(engine.getLegaciesByType('checkpoint').length).toBe(1)
  })

  it('recommendStrategy 按分支关系推荐策略', async () => {
    const { engine } = await makeEngine(
      [br('a', '子分支', { parentBranchId: 'b' }), br('b', '主')],
      [cp('a1', 'a')],
    )
    expect(engine.recommendStrategy('a', 'b').strategy).toBe('fast-forward')

    const { engine: e2 } = await makeEngine(
      [br('a', '多检查点'), br('b', '主')],
      Array.from({ length: 11 }, (_, i) => cp(`a${i}`, 'a')),
    )
    expect(e2.recommendStrategy('a', 'b').strategy).toBe('squash')

    const { engine: e3 } = await makeEngine(
      [br('a', '源'), br('b', '空目标')],
      [cp('a1', 'a')],
    )
    expect(e3.recommendStrategy('a', 'b').strategy).toBe('fast-forward')
  })

  it('undoLastMerge 恢复合并前状态并移除记录', async () => {
    const { engine, branches, checkpoints, persisted } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [cp('a1', 'a')],
    )
    await engine.executeMerge('a', 'b', 'fast-forward')
    expect(engine.getRollbackHistory().length).toBe(1)
    // 模拟合并后外部漂移
    checkpoints.push(cp('drift', 'b'))
    expect(checkpoints.some(c => c.id === 'drift')).toBe(true)
    const ok = await engine.undoLastMerge(branches, checkpoints)
    expect(ok).toBe(true)
    expect(checkpoints.some(c => c.id === 'drift')).toBe(false)
    expect(engine.getRollbackHistory().length).toBe(0)
    expect(persisted.length).toBe(1)
  })

  it('rollbackToSnapshot / rollbackToCheckpoint 记录回滚足迹', async () => {
    const snapshots: WorldSnapshot[] = [{
      timestamp: '2026-03-01T00:00:00.000Z',
      activeBranchId: 'a',
      branches: [],
      metadata: { label: '三月快照', totalCheckpoints: 0 },
    }]
    const { engine } = await makeEngine(
      [br('a', '主'), br('b', '平行')],
      [cp('a1', 'a')],
      snapshots,
    )
    expect(await engine.rollbackToSnapshot('2026-03-01T00:00:00.000Z', [], [])).toBe(true)
    expect(await engine.rollbackToSnapshot('missing', [], [])).toBe(false)
    expect(await engine.rollbackToCheckpoint('a1', [], [])).toBe(true)
    expect(await engine.rollbackToCheckpoint('missing', [], [])).toBe(false)
    expect(engine.rollbackCount.value).toBe(2)
    const types = engine.getRollbackHistory().map(r => r.type)
    expect(types).toContain('snapshot')
    expect(types).toContain('checkpoint')
  })
})
