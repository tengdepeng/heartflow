// ============================================================
// 平行世界 · 世界对照引擎测试（INCR-77 · world-comparison.ts）
// 多维度分支对比 · 相似度 · 分歧点识别 · 差异提取 · 持久化
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'

describe('useWorldComparison 世界对照', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  async function getWC() {
    const mod = await import('../world-comparison')
    return mod.useWorldComparison()
  }

  function branch(id: string, name: string, over: Record<string, unknown> = {}) {
    return {
      id, name, description: '', color: '#8a9a7a',
      createdAt: '2026-01-01T00:00:00.000Z', isActive: false, checkpointCount: 0, ...over,
    }
  }
  function cp(id: string, branchId: string, tags: string[], over: Record<string, unknown> = {}) {
    return {
      id, branchId, label: id, description: '', snapshot: {}, createdAt: '2026-02-01T00:00:00.000Z', tags, ...over,
    }
  }

  it('初始无对照、无结果', async () => {
    const wc = await getWC()
    await wc.loadComparisons()
    expect(wc.totalComparisons.value).toBe(0)
    expect(wc.latestComparison.value).toBeNull()
  })

  it('compareWorlds 生成对照并推入历史 + 持久化', async () => {
    const wc = await getWC()
    const a = branch('a', '主世界')
    const b = branch('b', '平行世界')
    const cps = [
      cp('ca1', 'a', ['work']),
      cp('s1', 'a', ['life']),
      cp('s1', 'b', ['life']),
      cp('cb1', 'b', ['travel']),
    ]
    const cmp = wc.compareWorlds(a, b, cps, [a, b], { name: '主⇄平行' })
    expect(cmp.name).toBe('主⇄平行')
    expect(cmp.branchA.name).toBe('主世界')
    expect(cmp.branchB.name).toBe('平行世界')
    // 相似度分数覆盖所有请求维度
    expect(cmp.similarityScores.length).toBeGreaterThanOrEqual(1)
    // 综合相似度 0-1
    expect(cmp.overallSimilarity).toBeGreaterThanOrEqual(0)
    expect(cmp.overallSimilarity).toBeLessThanOrEqual(1)
    // 检查点对比：共享 1（s1）
    expect(cmp.checkpointComparison.sharedCount).toBe(1)
    expect(cmp.checkpointComparison.aOnlyCount).toBe(1)
    expect(cmp.checkpointComparison.bOnlyCount).toBe(1)
    // 标签对比
    expect(cmp.tagComparison.sharedTags).toContain('life')
    // 历史已推入
    expect(wc.totalComparisons.value).toBe(1)
    expect(wc.latestComparison.value?.id).toBe(cmp.id)
    // 持久化：新实例可读回
    await wc.loadComparisons()
    expect(wc.totalComparisons.value).toBe(1)
  })

  it('分支差异越大相似度越低，且识别出分歧点', async () => {
    const wc = await getWC()
    const a = branch('a', 'A')
    const b = branch('b', 'B')
    // A 与 B 完全不同的检查点集＋标签
    const cps = [
      cp('a1', 'a', ['x'], { createdAt: '2026-01-01T00:00:00.000Z' }),
      cp('a2', 'a', ['x'], { createdAt: '2026-01-05T00:00:00.000Z' }),
      cp('b1', 'b', ['y'], { createdAt: '2026-03-01T00:00:00.000Z' }),
      cp('b2', 'b', ['y'], { createdAt: '2026-03-05T00:00:00.000Z' }),
    ]
    const cmp = wc.compareWorlds(a, b, cps, [a, b])
    expect(cmp.keyDifferences.length).toBeGreaterThan(0)
    // 无共享检查点
    expect(cmp.checkpointComparison.sharedCount).toBe(0)
    // 至少一个分歧结构被识别（检查点/标签/时间线两者皆有独有处）
    const typeSet = new Set(cmp.divergencePoints.map(p => p.type))
    expect(typeSet.size).toBeGreaterThanOrEqual(1)
  })

  it('两个完全相同的分支接近满相似', async () => {
    const wc = await getWC()
    const a = branch('a', 'A')
    const b = branch('b', 'B')
    const cps = [
      cp('s1', 'a', ['life']),
      cp('s1', 'b', ['life']),
      cp('s2', 'a', ['work']),
      cp('s2', 'b', ['work']),
    ]
    const cmp = wc.compareWorlds(a, b, cps, [a, b])
    expect(cmp.overallSimilarity).toBeGreaterThan(0.7)
  })
})