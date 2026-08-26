// ============================================================
// 自律工坊 · 四象限看板（P9-1 / 借鉴点 6）
// 吸收滴答清单 / Things 3：「四象限分组」以「看板」形态呈现，
// 每个象限为一列（紧急 × 重要 矩阵），支持列内排序与统计。
// 纯数据模型层，供 QuadrantKanban.vue 渲染。
// ============================================================

import type { Task, TaskQuadrant } from './task'
import { computeQuadrant, QUADRANTS, QUADRANT_META } from './quadrant'

/** 单列统计 */
export interface QuadrantStats {
  /** 总任务数 */
  total: number
  /** 进行中 / 未完成数 */
  active: number
  /** 已完成数 */
  done: number
  /** 完成率 0-1 */
  completionRate: number
  /** 累积专注次数 */
  totalFocus: number
}

/** 看板一列 */
export interface QuadrantBoardColumn {
  quadrant: TaskQuadrant
  label: string
  desc: string
  color: string
  tasks: Task[]
  stats: QuadrantStats
}

/** 四象限看板：自 Q1→Q4 的四列 */
export type QuadrantBoard = QuadrantBoardColumn[]

/**
 * 列内排序权重：进行中 > 待办；同状态按专注次数降序，再按创建时间升序。
 * 让「正在推进」的更要事排在最前。
 */
export function rankTask(a: Task, b: Task): number {
  if (a.status !== b.status) {
    // done 排最后，doing 优先
    const w = { doing: 2, todo: 1, done: 0 } as const
    return w[b.status] - w[a.status]
  }
  if (a.focusCount !== b.focusCount) return b.focusCount - a.focusCount
  return a.createdAt.localeCompare(b.createdAt)
}

/** 汇总单列统计 */
export function computeQuadrantStats(tasks: Task[]): QuadrantStats {
  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const active = total - done
  return {
    total,
    active,
    done,
    completionRate: total > 0 ? Math.round((done / total) * 1000) / 1000 : 0,
    totalFocus: tasks.reduce((s, t) => s + (t.focusCount ?? 0), 0),
  }
}

/** 由任务列表构建四象限看板 */
export function buildQuadrantBoard(tasks: Task[]): QuadrantBoard {
  return QUADRANTS.map(q => {
    const bucket = tasks
      .filter(t => computeQuadrant(t.urgency, t.importance) === q)
      .sort(rankTask)
    return {
      quadrant: q,
      label: QUADRANT_META[q].label,
      desc: QUADRANT_META[q].desc,
      color: QUADRANT_META[q].color,
      tasks: bucket,
      stats: computeQuadrantStats(bucket),
    }
  })
}

/** 看板各列任务数概览（用于导航 / 徽标） */
export function boardSummary(board: QuadrantBoard): Record<TaskQuadrant, number> {
  const out = {} as Record<TaskQuadrant, number>
  for (const col of board) out[col.quadrant] = col.tasks.length
  return out
}