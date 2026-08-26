// ============================================================
// Goal 桥接层
// 简化透传：直接暴露 useGoal 的原始 API
// ============================================================

import { computed, ref } from 'vue'
import { useGoal } from './index'
import type { Goal, GoalTier, GoalStatus } from './index'

export type { Goal, GoalTier, GoalStatus }

export interface GoalSummary {
  total: number
  byTier: Record<GoalTier, number>
  byStatus: Record<string, number>
  activeTargets: number
  unhealthyCount: number
  oldDreamCount: number
  completionRate: number
}

export function useGoalBridge() {
  const goal = useGoal()
  const isLoading = ref(false)

  // ---- 聚合状态 ----

  const summary = computed<GoalSummary>(() => {
    const goals = goal.goals.value
    const byTier: Record<GoalTier, number> = { vision: 0, target: 0, plan: 0 }
    const byStatus: Record<string, number> = {}

    for (const g of goals) {
      byTier[g.tier] = (byTier[g.tier] ?? 0) + 1
      byStatus[g.status] = (byStatus[g.status] ?? 0) + 1
    }

    const doneCount = byStatus['bloom'] ?? 0
    const totalCount = goals.length

    return {
      total: totalCount,
      byTier,
      byStatus,
      activeTargets: goal.activeTargets.value.length,
      unhealthyCount: goal.unhealthyGoals.value.length,
      oldDreamCount: goal.oldDreams.value.length,
      completionRate: totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0,
    }
  })

  // ---- 操作 ----

  async function initialize(): Promise<void> {
    isLoading.value = true
    try {
      await goal.load()
    } finally {
      isLoading.value = false
    }
  }

  function createGoal(
    title: string,
    tier: GoalTier,
    domain: Goal['domain'],
    parentId?: string,
  ): Goal {
    return goal.create(title, tier, domain, parentId)
  }

  function updateGoal(id: string, data: Partial<Goal>): void {
    goal.update(id, data)
  }

  function removeGoal(id: string): void {
    goal.remove(id)
  }

  function promoteGoalStatus(id: string): void {
    goal.promoteStatus(id)
  }

  function toggleDormant(id: string): void {
    goal.toggleDormant(id)
  }

  function markPlanDone(id: string): void {
    goal.markPlanDone(id)
  }

  function getGoalHealth(id: string) {
    return goal.getHealth(id)
  }

  function sinkToOldDreams(id: string): void {
    goal.sinkToPool(id)
  }

  function reviveFromOldDreams(id: string) {
    return goal.reviveFromPool(id)
  }

  function removeFromOldDreams(id: string): void {
    goal.removeFromPool(id)
  }

  return {
    // 状态
    goals: goal.goals,
    visions: goal.visions,
    targets: goal.targets,
    plans: goal.plans,
    activeTargets: goal.activeTargets,
    oldDreams: goal.oldDreams,
    oldDreamsByMonth: goal.oldDreamsByMonth,
    isLoading,
    summary,
    goalLinks: goal.goalLinks,
    unhealthyGoals: goal.unhealthyGoals,
    // 操作
    initialize,
    createGoal,
    updateGoal,
    removeGoal,
    promoteGoalStatus,
    toggleDormant,
    markPlanDone,
    getGoalHealth,
    sinkToOldDreams,
    reviveFromOldDreams,
    removeFromOldDreams,
    // 子模块直通
    goal,
  }
}