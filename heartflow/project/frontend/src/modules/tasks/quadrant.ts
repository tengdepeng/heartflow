// ============================================================
// 自律工坊 · 四象限（紧急 × 重要）
// 吸收滴答清单 / Todoist：任务按"紧急×重要"两轴分桶
// ============================================================

import type { Task, TaskQuadrant } from './task'
import { getLocalDateKey } from '../../utils/time'

export const QUADRANTS: TaskQuadrant[] = ['q1', 'q2', 'q3', 'q4']

export const QUADRANT_META: Record<TaskQuadrant, { label: string; desc: string; color: string }> = {
  q1: { label: '要事紧急', desc: '重要且紧急 · 立即处理', color: '#ef4444' },
  q2: { label: '要事从容', desc: '重要不紧急 · 规划深耕', color: '#f59e0b' },
  q3: { label: '琐事加急', desc: '不重要但紧急 · 委托消解', color: '#38bdf8' },
  q4: { label: '琐事勿扰', desc: '不重要不紧急 · 稍后/清除', color: '#94a3b8' },
}

/**
 * 由两轴布尔判定所属象限
 * - 重要且紧急 → Q1
 * - 重要不紧急 → Q2
 * - 不重要但紧急 → Q3
 * - 不重要不紧急 → Q4
 */
export function computeQuadrant(urgency: boolean, importance: boolean): TaskQuadrant {
  if (importance && urgency) return 'q1'
  if (importance) return 'q2'
  if (urgency) return 'q3'
  return 'q4'
}

/** 象限处理顺序（01 优先） */
export function quadrantOrder(q: TaskQuadrant): number {
  return QUADRANTS.indexOf(q) + 1
}

export function quadrantLabel(q: TaskQuadrant): string {
  return QUADRANT_META[q]?.label ?? q
}

/** 将任务按四象限分桶（按创建时间升序） */
export function bucketByQuadrant(tasks: Task[]): Record<TaskQuadrant, Task[]> {
  const buckets: Record<TaskQuadrant, Task[]> = { q1: [], q2: [], q3: [], q4: [] }
  for (const t of tasks) {
    buckets[computeQuadrant(t.urgency, t.importance)].push(t)
  }
  for (const q of QUADRANTS) {
    buckets[q].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  return buckets
}

/** 今日代办（未完成）按象限聚合，用于"更漏 · 今日专注" */
export function todayTasksByQuadrant(tasks: Task[], today: string): Task[] {
  return tasks
    .filter(t => t.status !== 'done' && (!t.completedAt || getLocalDateKey(new Date(t.completedAt)) === today))
    .sort((a, b) => {
      const qa = quadrantOrder(computeQuadrant(a.urgency, a.importance))
      const qb = quadrantOrder(computeQuadrant(b.urgency, b.importance))
      return qa - qb || a.createdAt.localeCompare(b.createdAt)
    })
}