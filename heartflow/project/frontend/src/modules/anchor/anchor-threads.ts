// ============================================================
// 逐日心锚 · 光丝串联
// 蓝图定义：
//   锚点之间：同标签/同分类/同日的锚点间有光丝
//   锚点与留光阁：锚点关联到目标/计划，完成→反馈计划进度
//   光丝强度：基于关联紧密度计算
// ============================================================

import type { Anchor } from './types'
import type { Goal } from '../goal/types'

// ---- 光丝类型 ----

export interface AnchorThread {
  id: string
  sourceId: string
  targetId: string
  /** 光丝强度 0-1 */
  strength: number
  /** 光丝颜色（基于关联类型） */
  color: string
  /** 关联类型 */
  type: 'same_tag' | 'same_category' | 'same_day' | 'anchor_goal' | 'manual'
  /** 光丝标签 */
  label?: string
}

// ---- 光丝颜色 ----

const THREAD_COLORS: Record<AnchorThread['type'], string> = {
  same_tag: '#80b8d0',
  same_category: '#f0c040',
  same_day: 'rgba(255,255,255,0.3)',
  anchor_goal: '#8a9a7a',
  manual: '#d98c7a',
}

// ---- 锚点间光丝 ----

/** 计算两个锚点之间的标签重叠度 (Jaccard相似度) */
function tagOverlap(a: Anchor, b: Anchor): number {
  const tagsA = a.tags || []
  const tagsB = b.tags || []
  if (tagsA.length === 0 || tagsB.length === 0) return 0

  const setA = new Set(tagsA)
  const intersection = tagsB.filter(t => setA.has(t)).length
  const union = new Set([...tagsA, ...tagsB]).size

  return union > 0 ? intersection / union : 0
}

/** 计算锚点间的光丝 */
export function computeAnchorThreads(anchors: Anchor[]): AnchorThread[] {
  const threads: AnchorThread[] = []
  const activeAnchors = anchors.filter(a => (a.stage ?? 'active') === 'active')

  for (let i = 0; i < activeAnchors.length; i++) {
    for (let j = i + 1; j < activeAnchors.length; j++) {
      const a = activeAnchors[i]
      const b = activeAnchors[j]

      // 同标签关联
      const overlap = tagOverlap(a, b)
      if (overlap > 0) {
        threads.push({
          id: `thread_${a.id}_${b.id}_tag`,
          sourceId: a.id,
          targetId: b.id,
          strength: overlap,
          color: THREAD_COLORS.same_tag,
          type: 'same_tag',
          label: `共享标签`,
        })
      }

      // 同分类关联
      if (a.category && b.category && a.category === b.category) {
        threads.push({
          id: `thread_${a.id}_${b.id}_cat`,
          sourceId: a.id,
          targetId: b.id,
          strength: 0.6,
          color: THREAD_COLORS.same_category,
          type: 'same_category',
          label: a.category,
        })
      }

      // 同日关联
      if (a.targetDate && b.targetDate && a.targetDate === b.targetDate) {
        threads.push({
          id: `thread_${a.id}_${b.id}_day`,
          sourceId: a.id,
          targetId: b.id,
          strength: 0.3,
          color: THREAD_COLORS.same_day,
          type: 'same_day',
          label: a.targetDate,
        })
      }
    }
  }

  return threads
}

// ---- 锚点与目标间光丝（锚点↔留光阁联动） ----

export interface AnchorGoalLink {
  anchorId: string
  goalId: string
  /** 联动强度 */
  strength: number
  /** 锚点完成对目标进度的贡献 */
  contribution: number
  /** 联动方向 */
  direction: 'anchor_to_goal' | 'goal_to_anchor'
}

/** 通过标签匹配锚点与目标 */
function matchAnchorToGoalByTag(anchor: Anchor, goals: Goal[]): { goal: Goal; strength: number }[] {
  if (!anchor.tags || anchor.tags.length === 0) return []

  const matches: { goal: Goal; strength: number }[] = []
  for (const goal of goals) {
    // 目标标题与锚点标签匹配
    const goalTitleWords = goal.title.toLowerCase().split(/\s+/)
    const tagSet = new Set(anchor.tags.map(t => t.toLowerCase()))

    let matchCount = 0
    for (const word of goalTitleWords) {
      if (tagSet.has(word)) matchCount++
    }

    // 目标领域与锚点分类匹配
    const domainLabels: Record<string, string> = {
      work: '工作', growth: '成长', health: '健康',
      relation: '关系', wealth: '财富', play: '逸趣', other: '其他',
    }
    const domainMatch = anchor.category && domainLabels[goal.domain] === anchor.category

    if (matchCount > 0 || domainMatch) {
      const strength = domainMatch ? 0.7 : Math.min(1, matchCount * 0.3)
      matches.push({ goal, strength })
    }
  }

  return matches.sort((a, b) => b.strength - a.strength)
}

/** 计算锚点与目标间的光丝联动 */
export function computeAnchorGoalLinks(anchors: Anchor[], goals: Goal[]): AnchorGoalLink[] {
  const links: AnchorGoalLink[] = []
  const activeAnchors = anchors.filter(a => (a.stage ?? 'active') === 'active' && !a.done)
  const activeGoals = goals.filter(g => g.tier === 'target' && g.status !== 'dormant' && g.status !== 'bloom')

  for (const anchor of activeAnchors) {
    const matches = matchAnchorToGoalByTag(anchor, activeGoals)
    for (const { goal, strength } of matches) {
      // 锚点完成对该目标的贡献度
      const contribution = goal.anchorCount > 0
        ? 1 / (goal.anchorCount + 1) // 新增锚点的贡献
        : 0.2 // 首个锚点的贡献

      links.push({
        anchorId: anchor.id,
        goalId: goal.id,
        strength,
        contribution,
        direction: 'anchor_to_goal',
      })
    }
  }

  return links
}

/** 当锚点完成时，更新关联目标的进度 */
export function applyAnchorCompletionToGoal(
  anchor: Anchor,
  goals: Goal[],
  links: AnchorGoalLink[],
): { goalId: string; newAnchorDone: number }[] {
  if (!anchor.done) return []

  const relatedLinks = links.filter(l => l.anchorId === anchor.id)
  const updates: { goalId: string; newAnchorDone: number }[] = []

  for (const link of relatedLinks) {
    const goal = goals.find(g => g.id === link.goalId)
    if (!goal) continue

    const newAnchorDone = Math.min(goal.anchorCount, goal.anchorDone + 1)
    updates.push({ goalId: goal.id, newAnchorDone })
  }

  return updates
}

// ---- 锚点池一键倒入 ----

export interface PoolDumpResult {
  /** 成功倒入的锚点 */
  placed: Anchor[]
  /** 自动匹配的目标 */
  goalMatches: { anchorId: string; goalId: string; goalTitle: string }[]
}

/** 一键倒入：将锚点池中所有锚点安放到今天，并自动匹配目标 */
export function dumpAnchorPool(
  poolAnchors: Anchor[],
  goals: Goal[],
  today: string,
): PoolDumpResult {
  const placed: Anchor[] = []
  const goalMatches: PoolDumpResult['goalMatches'] = []

  for (const anchor of poolAnchors) {
    // 安放到今天
    const placedAnchor: Anchor = {
      ...anchor,
      stage: 'active',
      targetDate: today,
      done: false,
      doneAt: undefined,
    }
    placed.push(placedAnchor)

    // 自动匹配目标
    if (anchor.tags && anchor.tags.length > 0) {
      for (const goal of goals) {
        const goalWords = goal.title.toLowerCase().split(/\s+/)
        const tagSet = new Set(anchor.tags.map(t => t.toLowerCase()))
        if (goalWords.some(w => tagSet.has(w))) {
          goalMatches.push({
            anchorId: anchor.id,
            goalId: goal.id,
            goalTitle: goal.title,
          })
          break
        }
      }
    }
  }

  return { placed, goalMatches }
}

// ---- 导出光丝颜色 ----

export { THREAD_COLORS }