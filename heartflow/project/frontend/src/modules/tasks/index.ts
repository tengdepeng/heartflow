// ============================================================
// 自律工坊 · 任务子系统（task / quadrant / time-parse）
// ============================================================

export { useTaskManager } from './task'
export type { Task, TaskStatus, TaskQuadrant, NewTaskInput } from './task'
export { dueMeta, byDueThenOrder } from './task'
export type { DueStatus } from './task'

export {
  computeQuadrant,
  quadrantOrder,
  quadrantLabel,
  bucketByQuadrant,
  todayTasksByQuadrant,
  QUADRANTS,
  QUADRANT_META,
} from './quadrant'

export { buildQuadrantBoard, computeQuadrantStats, rankTask, boardSummary } from './quadrant-board'
export type { QuadrantBoard, QuadrantBoardColumn, QuadrantStats } from './quadrant-board'

export { parseDueText, sortByDue } from './time-parse'
export type { DueInfo } from './time-parse'