// ============================================================
// 留光阁 · 旧梦潭分析引擎
// 蓝图："旧梦潭"是已完成目标的归档池，可重新打捞或永久删除。
// 本引擎为纯函数，只做陈列与检索，不做因果评判；接受 now 以保证时间可测。
// 输入为已完成目标列表（Goal 且 status==='bloom'），输出分组、筛选与统计。
// ============================================================

import { getLocalMonthKey } from '../../utils/time'
import type { Goal } from './types'

// ---- 检索（陈列式，非叙事）----

/** 按标题/描述关键词过滤已完成目标 */
export function filterCompletedGoals(
  goals: Goal[],
  query: string,
  domains: Goal['domain'][] = [],
): Goal[] {
  const q = query.trim().toLowerCase()
  return goals
    .filter(g => g.status === 'bloom')
    .filter(g => {
      if (q && !g.title.toLowerCase().includes(q)) return false
      if (domains.length > 0 && !domains.includes(g.domain)) return false
      return true
    })
    .sort((a, b) => {
      const at = a.completedAt || a.updatedAt
      const bt = b.completedAt || b.updatedAt
      return bt.localeCompare(at)
    })
}

/** 按完成月份分组的陈列（降序） */
export interface OldDreamGroup {
  month: string
  items: Goal[]
}

export function groupCompletedByMonth(goals: Goal[]): OldDreamGroup[] {
  const groups = new Map<string, Goal[]>()
  const sorted = [...goals]
    .filter(g => g.status === 'bloom')
    .sort((a, b) => {
      const at = a.completedAt || a.updatedAt
      const bt = b.completedAt || b.updatedAt
      return bt.localeCompare(at)
    })

  for (const g of sorted) {
    const d = g.completedAt || g.updatedAt
    const month = getLocalMonthKey(d)
    if (!groups.has(month)) groups.set(month, [])
    groups.get(month)!.push(g)
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, items]) => ({ month, items }))
}

// ---- 统计 ----

export interface OldDreamOverview {
  total: number
  /** 覆盖的月份数 */
  monthCount: number
  /** 近 30 天完成的个数 */
  recent30: number
  /** 各领域分布（已完成的，按数量降序） */
  byDomain: { domain: Goal['domain']; count: number; label: string }[]
}

/** 旧梦潭整体陈列统计（domain label 由调用方注入，避免引擎耦合展示层） */
export function oldDreamOverview(
  goals: Goal[],
  labelOf: Record<Goal['domain'], string>,
  now: number = Date.now(),
): OldDreamOverview {
  const done = goals.filter(g => g.status === 'bloom')
  const countMap = new Map<Goal['domain'], number>()
  for (const g of done) {
    countMap.set(g.domain, (countMap.get(g.domain) ?? 0) + 1)
  }

  const byDomain = Array.from(countMap.entries())
    .map(([domain, count]) => ({ domain, count, label: labelOf[domain] ?? domain }))
    .sort((a, b) => b.count - a.count)

  const monthSet = new Set<string>()
  let recent30 = 0
  const cut = now - 30 * 86400000
  for (const g of done) {
    const d = new Date(g.completedAt || g.updatedAt).getTime()
    if (d >= cut) recent30++
    monthSet.add(getLocalMonthKey(g.completedAt || g.updatedAt))
  }

  return { total: done.length, monthCount: monthSet.size, recent30, byDomain }
}

// ---- 里程碑式：通往岁月的桥接（附注，供岁时阁联动用）----

/** 提取某个已完成目标到旧梦潭的最小陈列（sunken 记录） */
export function toSunkenRecord(goal: Goal, reason = ''): {
  sunkenId: string
  goalId: string
  title: string
  sunkenAt: string
  reason: string
  canResurface: boolean
} {
  return {
    sunkenId: `sunken_${goal.id}`,
    goalId: goal.id,
    title: goal.title,
    sunkenAt: goal.completedAt || goal.updatedAt,
    reason,
    canResurface: true,
  }
}