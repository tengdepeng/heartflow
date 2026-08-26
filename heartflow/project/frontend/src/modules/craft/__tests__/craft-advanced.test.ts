// ============================================================
// 匠庐 · 高级工坊引擎测试
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

const kvStore: Record<string, any> = {}
vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, defaultVal: any) => {
    const val = kvStore[key]
    return val !== undefined ? val : defaultVal
  },
  setKV: (key: string, val: any) => { kvStore[key] = val },
}))

import { useCraftAdvanced } from '../craft-advanced'
import type { CraftWork, CraftStats } from '../types'

function mkWork(over: Partial<CraftWork> & { id: string; name: string }): CraftWork {
  return {
    icon: '🔨',
    description: '',
    color: '#b8a080',
    status: 'completed',
    type: 'writing',
    date: '2026-08',
    evolution: 100,
    tags: [],
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  }
}

function mkStats(works: CraftWork[]): CraftStats {
  const byStatus = { draft: 0, refining: 0, completed: 0, archived: 0 }
  const byType = { writing: 0, code: 0, design: 0, plan: 0, insight: 0 }
  let totalEvolution = 0
  for (const w of works) {
    byStatus[w.status]++
    byType[w.type]++
    totalEvolution += w.evolution
  }
  return {
    totalWorks: works.length,
    byStatus,
    byType,
    averageEvolution: works.length ? Math.round(totalEvolution / works.length) : 0,
    totalCompleted: byStatus.completed,
  }
}

describe('useCraftAdvanced', () => {
  beforeEach(() => {
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('初始化默认分析', () => {
    const a = useCraftAdvanced()
    expect(a.analytics.value.totalWorks).toBe(0)
    expect(a.analytics.value.completedWorks).toBe(0)
    expect(a.inspirations.value.length).toBe(0)
    expect(a.versions.value.length).toBe(0)
  })

  it('updateAnalytics 计算统计', () => {
    const a = useCraftAdvanced()
    const works = [
      mkWork({ id: 'a', name: 'A', status: 'completed', evolution: 100, type: 'writing' }),
      mkWork({ id: 'b', name: 'B', status: 'refining', evolution: 50, type: 'code' }),
    ]
    a.updateAnalytics(works, mkStats(works))
    expect(a.analytics.value.totalWorks).toBe(2)
    expect(a.analytics.value.completedWorks).toBe(1)
    expect(a.analytics.value.activeWorks).toBe(1)
    expect(a.analytics.value.avgEvolution).toBe(75)
    expect(a.analytics.value.totalEvolution).toBe(150)
    expect(a.analytics.value.typeDistribution.length).toBe(2)
    expect(a.analytics.value.typeDistribution[0].type).toBe('writing')
  })

  it('updateAnalytics 空列表归零', () => {
    const a = useCraftAdvanced()
    a.updateAnalytics([], mkStats([]))
    expect(a.analytics.value.totalWorks).toBe(0)
    expect(a.analytics.value.avgEvolution).toBe(0)
    expect(a.analytics.value.topEvolutionWork.name).toBe('')
  })

  it('最高进化作品', () => {
    const a = useCraftAdvanced()
    const works = [
      mkWork({ id: 'a', name: '低', evolution: 20 }),
      mkWork({ id: 'b', name: '高', evolution: 90 }),
    ]
    a.updateAnalytics(works, mkStats(works))
    expect(a.analytics.value.topEvolutionWork).toEqual({ name: '高', evolution: 90, type: 'writing' })
  })

  it('进化谱系计算增量', () => {
    const a = useCraftAdvanced()
    const work = mkWork({
      id: 'e1',
      name: 'E',
      evolutionHistory: [
        { date: '2026-08-01', evolution: 20 },
        { date: '2026-08-02', evolution: 50, milestone: '粗坯' },
      ],
    })
    const tree = a.getEvolutionTree(work)
    expect(tree.length).toBe(2)
    expect(tree[0].evolutionDelta).toBe(20)
    expect(tree[1].evolutionDelta).toBe(30)
    expect(tree[1].milestone).toBe('粗坯')
  })

  it('无进化史返回空谱系', () => {
    const a = useCraftAdvanced()
    const work = mkWork({ id: 'e2', name: 'E2' })
    expect(a.getEvolutionTree(work)).toEqual([])
  })

  it('添加灵感并流转状态', () => {
    const a = useCraftAdvanced()
    const insp = a.addInspiration('新灵感', '内容', '阅读')
    expect(a.inspirations.value.length).toBe(1)
    expect(insp.status).toBe('raw')
    expect(a.pendingInspirations.value.length).toBe(1)

    expect(a.updateInspirationStatus(insp.id, 'developing')).toBe(true)
    expect(a.inspirations.value[0].status).toBe('developing')
    expect(a.pendingInspirations.value.length).toBe(1)

    expect(a.updateInspirationStatus(insp.id, 'applied')).toBe(true)
    expect(a.pendingInspirations.value.length).toBe(0)

    expect(a.updateInspirationStatus('missing', 'archived')).toBe(false)
  })

  it('保存版本并查询历史', () => {
    const a = useCraftAdvanced()
    a.saveVersion('work-1', '初版', { name: 'A' })
    a.saveVersion('work-1', '修订', { name: 'A2' })
    a.saveVersion('work-2', '另一作品', { name: 'B' })

    const versions = a.getWorkVersions('work-1')
    expect(versions.length).toBe(2)
    expect(versions[0].version).toBe(2)
    expect(versions[0].description).toBe('修订')
    expect(a.versions.value.length).toBe(3)
  })
})
