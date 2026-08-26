// ============================================================
// 专项规划分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { SpecialPlan } from '../types'
import {
  computePlanProgress,
  milestoneStat,
  computeSpecialPlanOverview,
  plansForGoal,
  orphanPlans,
  planSuggestion,
} from '../special-plan-analytics'

function plan(partial: Partial<SpecialPlan> = {}): SpecialPlan {
  return {
    id: 'sp-x',
    title: '专项',
    description: '',
    relatedGoalIds: [],
    milestones: [],
    createdAt: '2026-07-01T00:00:00Z',
    updatedAt: '2026-07-01T00:00:00Z',
    ...partial,
  }
}

describe('special-plan-analytics', () => {
  it('computePlanProgress 无里程碑时为 0', () => {
    expect(computePlanProgress(plan())).toBe(0)
  })

  it('computePlanProgress 按已完成里程碑计算百分比', () => {
    const p = plan({
      milestones: [
        { label: 'a', done: true },
        { label: 'b', done: true },
        { label: 'c', done: false },
      ],
    })
    expect(computePlanProgress(p)).toBe(67)
  })

  it('computePlanProgress 全部完成时取整为 100', () => {
    const p = plan({
      milestones: [
        { label: 'a', done: true },
        { label: 'b', done: true },
      ],
    })
    expect(computePlanProgress(p)).toBe(100)
  })

  it('milestoneStat 统计总数/完成/待办', () => {
    const p = plan({
      milestones: [
        { label: 'a', done: true },
        { label: 'b', done: false },
      ],
    })
    expect(milestoneStat(p)).toEqual({ total: 2, done: 1, pending: 1 })
  })

  it('computeSpecialPlanOverview 空列表返回全零', () => {
    const o = computeSpecialPlanOverview([])
    expect(o.count).toBe(0)
    expect(o.overallProgress).toBe(0)
    expect(o.averageProgress).toBe(0)
    expect(o.addedThisWeek).toBe(0)
  })

  it('computeSpecialPlanOverview 汇总多项规划指标', () => {
    const plans = [
      plan({
        id: 'a',
        relatedGoalIds: ['g1', 'g2'],
        milestones: [
          { label: '1', done: true },
          { label: '2', done: false },
        ],
        createdAt: '2026-08-18T00:00:00Z',
      }),
      plan({ id: 'b', relatedGoalIds: ['g2'], milestones: [], createdAt: '2026-07-01T00:00:00Z' }),
    ]
    // now = 2026-08-20，近7天内仅 a 新增
    const now = new Date('2026-08-20T00:00:00Z').getTime()
    const o = computeSpecialPlanOverview(plans, now)

    expect(o.count).toBe(2)
    expect(o.linkedGoalCount).toBe(2) // g1、g2
    expect(o.withMilestones).toBe(1)
    expect(o.doneMilestones).toBe(1)
    expect(o.totalMilestones).toBe(2)
    // a 50%, b 0% → 平均 25
    expect(o.averageProgress).toBe(25)
    expect(o.overallProgress).toBe(50)
    expect(o.addedThisWeek).toBe(1)
  })

  it('plansForGoal 返回关联该目标的全部规划', () => {
    const plans = [
      plan({ id: 'a', relatedGoalIds: ['g1', 'g2'] }),
      plan({ id: 'b', relatedGoalIds: ['g2'] }),
    ]
    const res = plansForGoal(plans, 'g2')
    expect(res.map(p => p.id)).toEqual(['a', 'b'])
  })

  it('plansForGoal 无关联时返回空数组', () => {
    expect(plansForGoal([plan()], 'nope')).toEqual([])
  })

  it('orphanPlans 找出未关联目标的游离规划', () => {
    const plans = [plan({ id: 'a', relatedGoalIds: ['g1'] }), plan({ id: 'b' })]
    expect(orphanPlans(plans).map(p => p.id)).toEqual(['b'])
  })

  it('planSuggestion 无里程碑时给第一小步提示', () => {
    expect(planSuggestion(plan())).toContain('里程碑')
  })

  it('planSuggestion 全部点亮时提示已全部点亮', () => {
    const p = plan({ milestones: [{ label: 'x', done: true }] })
    expect(planSuggestion(p)).toContain('全部点亮')
  })

  it('planSuggestion 部分完成时无提示', () => {
    const p = plan({
      milestones: [
        { label: 'x', done: true },
        { label: 'y', done: false },
      ],
    })
    expect(planSuggestion(p)).toBeNull()
  })
})