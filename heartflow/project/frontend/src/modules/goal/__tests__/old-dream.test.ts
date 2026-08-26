// ============================================================
// 旧梦潭分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Goal } from '../types'
import {
  filterCompletedGoals,
  groupCompletedByMonth,
  oldDreamOverview,
  toSunkenRecord,
} from '../old-dream'

function goal(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g-x',
    title: '目标',
    description: '',
    tier: 'target',
    status: 'bloom',
    domain: 'growth',
    order: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    completedAt: '2026-06-01T00:00:00Z',
    anchorCount: 0,
    anchorDone: 0,
    ...partial,
  }
}

const LABELS: Record<Goal['domain'], string> = {
  work: '工作',
  growth: '成长',
  health: '健康',
  relation: '关系',
  wealth: '财富',
  play: '逸趣',
  other: '其他',
}

describe('old-dream', () => {
  it('filterCompletedGoals 只保留 bloom 状态', () => {
    const list = [
      goal({ id: 'a', status: 'bloom' }),
      goal({ id: 'b', status: 'growing' }),
      goal({ id: 'c', status: 'dormant' }),
    ]
    expect(filterCompletedGoals(list, '').map(g => g.id)).toEqual(['a'])
  })

  it('filterCompletedGoals 按标题关键词匹配', () => {
    const list = [
      goal({ id: 'a', title: '读完一本书' }),
      goal({ id: 'b', title: '学会游泳' }),
    ]
    const res = filterCompletedGoals(list, '书')
    expect(res.map(g => g.id)).toEqual(['a'])
  })

  it('filterCompletedGoals 支持领域过滤', () => {
    const list = [
      goal({ id: 'a', domain: 'health' }),
      goal({ id: 'b', domain: 'growth' }),
    ]
    expect(filterCompletedGoals(list, '', ['health']).map(g => g.id)).toEqual(['a'])
  })

  it('filterCompletedGoals 关键词与领域同时生效', () => {
    const list = [
      goal({ id: 'a', domain: 'health', title: '晨跑' }),
      goal({ id: 'b', domain: 'health', title: '冥想' }),
      goal({ id: 'c', domain: 'growth', title: '晨跑' }),
    ]
    expect(filterCompletedGoals(list, '晨跑', ['health']).map(g => g.id)).toEqual(['a'])
  })

  it('groupCompletedByMonth 按完成月份分组降序', () => {
    const list = [
      goal({ id: 'june', completedAt: '2026-06-15T00:00:00Z', updatedAt: '2026-06-15T00:00:00Z' }),
      goal({ id: 'may', completedAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-10T00:00:00Z' }),
      goal({ id: 'june2', completedAt: '2026-06-20T00:00:00Z', updatedAt: '2026-06-20T00:00:00Z' }),
    ]
    const groups = groupCompletedByMonth(list)
    expect(groups.map(g => g.month)).toEqual(['2026-06', '2026-05'])
    expect(groups[0].items.map(g => g.id)).toEqual(['june2', 'june'])
  })

  it('groupCompletedByMonth 忽略非 bloom 目标', () => {
    const list = [
      goal({ id: 'a', status: 'bloom' }),
      goal({ id: 'b', status: 'growing' }),
    ]
    const groups = groupCompletedByMonth(list)
    expect(groups.reduce((s, g) => s + g.items.length, 0)).toBe(1)
  })

  it('oldDreamOverview 统计总数/月份/近30天/领域分布', () => {
    const list = [
      goal({ id: 'a', domain: 'health', completedAt: '2026-08-10T00:00:00Z', updatedAt: '2026-08-10T00:00:00Z' }),
      goal({ id: 'b', domain: 'health', completedAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' }),
      goal({ id: 'c', domain: 'growth', completedAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-01T00:00:00Z' }),
      goal({ id: 'd', status: 'growing' }),
    ]
    const now = new Date('2026-08-20T00:00:00Z').getTime()
    const o = oldDreamOverview(list, LABELS, now)
    expect(o.total).toBe(3)
    expect(o.recent30).toBe(1)
    // 2026-08 / 2026-07 / 2026-05 = 3 个月
    expect(o.monthCount).toBe(3)
    expect(o.byDomain.length).toBe(2)
    // health 计数 2，排最前
    expect(o.byDomain[0]).toEqual({ domain: 'health', count: 2, label: '健康' })
  })

  it('oldDreamOverview 空列表返回零值', () => {
    const o = oldDreamOverview([], LABELS)
    expect(o.total).toBe(0)
    expect(o.byDomain).toEqual([])
  })

  it('toSunkenRecord 生成最小沉入记录', () => {
    const g = goal({ title: '读完一本书' })
    const r = toSunkenRecord(g, '已完成')
    expect(r.sunkenId).toBe(`sunken_${g.id}`)
    expect(r.title).toBe('读完一本书')
    expect(r.canResurface).toBe(true)
    expect(r.sunkenAt).toBe(g.completedAt)
  })
})