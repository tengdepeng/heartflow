// ============================================================
// 平行世界 · 冲突仲裁引擎测试（INCR-80 · auto-conflict-resolution.ts）
// 冲突检测 · 规则驱动解决 · 规则管理 · 解决历史 · 模式分析
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Checkpoint, WorldBranch } from '../types'

describe('useAutoConflictResolution 冲突仲裁', () => {
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

  async function makeEngine() {
    const { useAutoConflictResolution } = await import('../auto-conflict-resolution')
    return useAutoConflictResolution()
  }

  it('默认加载 5 条内置规则', async () => {
    const engine = await makeEngine()
    expect(engine.rules.value.length).toBe(5)
    expect(engine.enabledRules.value.length).toBe(5)
    expect(engine.defaultStrategy.value).toBe('newest-wins')
    expect(engine.totalHits.value).toBe(0)
  })

  it('detectConflicts 检测五类冲突', async () => {
    const engine = await makeEngine()
    const source = cp('s1', 'a', {
      label: '源', description: 'desc-a', snapshot: { v: 1 },
      createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'],
    })
    const target = cp('s1', 'b', {
      label: '目标', description: 'desc-b', snapshot: { v: 2 },
      createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'],
    })
    const conflicts = engine.detectConflicts(source, target)
    const types = conflicts.map(c => c.type)
    expect(types).toContain('label')
    expect(types).toContain('tag')
    expect(types).toContain('data')
    expect(types).toContain('metadata')
    expect(types).toContain('timeline')
  })

  it('resolveConflict 规则驱动全自动解决', async () => {
    const engine = await makeEngine()
    const source = cp('s1', 'a', {
      label: '源', description: 'desc-a', snapshot: { v: 1 },
      createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'],
    })
    const target = cp('s1', 'b', {
      label: '目标', description: 'desc-b', snapshot: { v: 2 },
      createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'],
    })
    const conflicts = engine.detectConflicts(source, target)
    const result = engine.resolveConflict(conflicts, 'newest-wins', br('a', '源'), br('b', '目标'))
    expect(result.allResolved).toBe(true)
    expect(result.autoResolved).toBe(conflicts.length)
    expect(result.manualResolved).toBe(0)
    expect(result.rulesApplied.length).toBeGreaterThan(0)
    // 标签名冲突按 keep-target
    const labelConflict = result.resolutions.find(c => c.type === 'label')
    expect(labelConflict!.resolvedValue).toBe('目标')
    // 时间线冲突按 keep-newest
    const timelineConflict = result.resolutions.find(c => c.type === 'timeline')
    expect(timelineConflict!.resolvedValue).toBe('2026-02-01T00:00:00.000Z')
    // 标签冲突按 merge（去重合并）
    const tagConflict = result.resolutions.find(c => c.type === 'tag')
    expect([...(tagConflict!.resolvedValue as string[])].sort()).toEqual(['life', 'work'])
    expect(engine.latestResolution.value?.id).toBe(result.id)
    expect(engine.getResolutionHistory().length).toBe(1)
  })

  it('resolveConflict 禁用规则后按指定策略计入手动解决', async () => {
    const engine = await makeEngine()
    for (const r of engine.rules.value) engine.toggleRule(r.id, false)
    const source = cp('s1', 'a', { snapshot: { v: 1 } })
    const target = cp('s1', 'b', { snapshot: { v: 2 } })
    const conflicts = engine.detectConflicts(source, target)
    const result = engine.resolveConflict(conflicts, 'manual-priority')
    expect(result.manualResolved).toBe(conflicts.length)
    expect(result.allResolved).toBe(true)
  })

  it('规则管理：新增/更新/删除/启停/重置', async () => {
    const engine = await makeEngine()
    const rule = engine.addResolutionRule('测试规则', 'desc', ['data'], 'keep-source', { priority: 9 })
    expect(engine.getRule(rule.id)?.name).toBe('测试规则')
    expect(engine.rules.value.length).toBe(6)
    engine.updateRule(rule.id, { priority: 3 })
    expect(engine.getRule(rule.id)?.priority).toBe(3)
    engine.toggleRule(rule.id, false)
    expect(engine.getRule(rule.id)?.enabled).toBe(false)
    expect(engine.enabledRules.value.length).toBe(5)
    expect(engine.deleteRule(rule.id)).toBe(true)
    expect(engine.rules.value.length).toBe(5)
    engine.resetRules()
    expect(engine.rules.value.length).toBe(5)
    expect(engine.rules.value[0].id).toBe('rule_default_newest')
  })

  it('解决历史：按分支筛选与清除', async () => {
    const engine = await makeEngine()
    const source = cp('s1', 'a', { snapshot: { v: 1 } })
    const target = cp('s1', 'b', { snapshot: { v: 2 } })
    engine.resolveConflict(engine.detectConflicts(source, target))
    expect(engine.getHistoryForBranch('a').length).toBe(1)
    expect(engine.getHistoryForBranch('x').length).toBe(0)
    engine.clearHistory()
    expect(engine.getResolutionHistory().length).toBe(0)
  })

  it('analyzeConflictPatterns 生成模式分析', async () => {
    const engine = await makeEngine()
    const source = cp('s1', 'a', { snapshot: { v: 1 } })
    const target = cp('s1', 'b', { snapshot: { v: 2 } })
    engine.resolveConflict(engine.detectConflicts(source, target))
    const analysis = engine.analyzeConflictPatterns()
    expect(analysis.totalResolved).toBeGreaterThan(0)
    expect(analysis.autoResolveRate).toBeGreaterThan(0)
    expect(analysis.mostCommonTypes.length).toBeGreaterThan(0)
    expect(analysis.recommendations.length).toBeGreaterThan(0)
  })

  it('策略管理：设置默认策略与标签', async () => {
    const engine = await makeEngine()
    engine.setDefaultStrategy('merge-fields')
    expect(engine.defaultStrategy.value).toBe('merge-fields')
    expect(engine.getStrategyLabel('keep-both')).toBe('保留双方')
    expect(engine.getAvailableStrategies().length).toBe(5)
  })
})
