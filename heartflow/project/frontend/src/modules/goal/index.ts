// ============================================================
// 留光阁 · barrel export
// 说明：目标状态存储已下沉到 ./goal-store —— 打断 goal-bridge ↔ index 的
// 循环依赖（模块初始化顺序不确定）。对外 API 与拆分前完全一致。
// ============================================================

export type { Goal, GoalTier, GoalStatus } from './types'
export type { GoalHealth, GoalLink, OldDream } from './goal-state-machine'
export { DOMAIN_LABELS, DOMAIN_COLORS, STATUS_LABELS } from './types'
export {
  buildContext,
  checkAutoTransitions,
  getAllowedTransitions,
  calculateGoalHealth,
  computeGoalLinks,
  groupOldDreamsByMonth,
} from './goal-state-machine'

export {
  filterCompletedGoals,
  groupCompletedByMonth,
  oldDreamOverview,
  toSunkenRecord,
} from './old-dream'
export type { OldDreamGroup, OldDreamOverview } from './old-dream'

// ---- 留光阁状态存储（自本文件拆出，见 goal-store.ts 顶部说明） ----
export { useGoal } from './goal-store'

// ---- 留光阁桥接层（INCR-380 补孤儿桥接导出：目标内聚驾驶舱零消费） ----
export { useGoalBridge } from './goal-bridge'
export type { GoalSummary } from './goal-bridge'
