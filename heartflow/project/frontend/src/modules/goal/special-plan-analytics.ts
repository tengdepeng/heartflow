// ============================================================
// 留光阁 · 专项规划分析引擎
// 蓝图："专项规划区"是跨目标规划，将多个目标串联起来，
// 以里程碑为粒度推进。本引擎为"陈列而非叙事"原则的纯函数，
// 接受 now 以保证时间可测试，不做因果评判，只呈现客观指标与温和提示。
// ============================================================

import type { SpecialPlan } from './types'

// ---- 单一专项的进度 ----

/** 专项完成度百分比 0-100，无里程碑时为 0 */
export function computePlanProgress(plan: SpecialPlan): number {
  if (!plan.milestones.length) return 0
  const done = plan.milestones.filter(m => m.done).length
  return Math.round((done / plan.milestones.length) * 100)
}

/** 里程碑检查项状态统计 */
export interface MilestoneStat {
  total: number
  done: number
  pending: number
}

export function milestoneStat(plan: SpecialPlan): MilestoneStat {
  const total = plan.milestones.length
  const done = plan.milestones.filter(m => m.done).length
  return { total, done, pending: total - done }
}

// ---- 专项规划整体概况 ----

export interface SpecialPlanOverview {
  /** 规划总数 */
  count: number
  /** 关联目标的去重数量 */
  linkedGoalCount: number
  /** 含里程碑的规划数 */
  withMilestones: number
  /** 平均完成度 0-100 */
  averageProgress: number
  /** 总里程碑 / 已完成里程碑 */
  totalMilestones: number
  doneMilestones: number
  /** 整体完成度 0-100 */
  overallProgress: number
  /** 近 7 天新增的规划数 */
  addedThisWeek: number
}

export function computeSpecialPlanOverview(
  plans: SpecialPlan[],
  now: number = Date.now(),
): SpecialPlanOverview {
  const linkedGoalIds = new Set<string>()
  let hasMilestones = 0
  let totalMs = 0
  let doneMs = 0
  let weekAgo = now - 7 * 86400000
  let addedThisWeek = 0

  for (const p of plans) {
    for (const gid of p.relatedGoalIds) linkedGoalIds.add(gid)
    const ms = milestoneStat(p)
    if (ms.total > 0) hasMilestones++
    totalMs += ms.total
    doneMs += ms.done
    if (new Date(p.createdAt).getTime() >= weekAgo) addedThisWeek++
  }

  const averageProgress =
    plans.length > 0
      ? plans.reduce((s, p) => s + computePlanProgress(p), 0) / plans.length
      : 0

  return {
    count: plans.length,
    linkedGoalCount: linkedGoalIds.size,
    withMilestones: hasMilestones,
    averageProgress: Math.round(averageProgress),
    totalMilestones: totalMs,
    doneMilestones: doneMs,
    overallProgress: totalMs > 0 ? Math.round((doneMs / totalMs) * 100) : 0,
    addedThisWeek,
  }
}

// ---- 单一专项的检索 ----

/** 按相关目标反向查找规划 */
export function plansForGoal(plans: SpecialPlan[], goalId: string): SpecialPlan[] {
  return plans.filter(p => p.relatedGoalIds.includes(goalId))
}

/** 未关联任何目标的"游离"规划 */
export function orphanPlans(plans: SpecialPlan[]): SpecialPlan[] {
  return plans.filter(p => p.relatedGoalIds.length === 0)
}

// ---- 温和提示（陈列式，非叙事） ----

/** 单一专项的提示：取决于里程碑数量与完成情况 */
export function planSuggestion(plan: SpecialPlan): string | null {
  const { total } = milestoneStat(plan)
  if (total === 0) {
    return '还未设定里程碑，可先写下第一小步'
  }
  if (plan.milestones.length > 0 && plan.milestones.every(m => m.done)) {
    return '里程碑已全部点亮'
  }
  return null
}