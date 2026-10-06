// ============================================================
// 留光阁 · 生长进度可视化与里程碑
// 蓝图要求：生长进度可视化 + 里程碑
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { Goal, GoalStatus } from './types'
import { DOMAIN_COLORS } from './types'

// ---- 可视化类型 ----

export type VisualizationType = 'tree' | 'radial' | 'timeline' | 'progress'

export interface GoalNode {
  goal: Goal
  children: GoalNode[]
  depth: number
  /** 完成百分比 */
  progress: number
  /** 健康度 */
  health: number
}

export interface GoalTree {
  roots: GoalNode[]
  totalGoals: number
  completedGoals: number
  overallProgress: number
  maxDepth: number
}

export interface ProgressSnapshot {
  date: string
  totalGoals: number
  completedGoals: number
  totalAnchors: number
  completedAnchors: number
  overallProgress: number
  byDomain: Record<string, number>
}

export interface ProgressHistory {
  snapshots: ProgressSnapshot[]
  startDate: string
  endDate: string
  trend: 'improving' | 'declining' | 'stable'
}

export interface GoalMilestone {
  id: string
  goalId: string
  goalTitle: string
  /** 里程碑标题 */
  title: string
  /** 描述 */
  description: string
  /** 目标进度 */
  targetProgress: number
  /** 当前进度 */
  currentProgress: number
  /** 是否已达成 */
  achieved: boolean
  /** 达成时间 */
  achievedAt?: string
  /** 里程碑类型 */
  type: 'start' | 'halfway' | 'complete' | 'custom'
  /** 关联奖励 */
  reward?: string
}

// ---- 存储键 ----

const PROGRESS_HISTORY_KEY = 'hf:goal_progress_history'
const GOAL_MILESTONES_KEY = 'hf:goal_milestones'

// ============================================================
// 生长进度可视化
// ============================================================

export function useGoalVisualization(getGoals: () => Goal[]) {
  const visualizationType = ref<VisualizationType>('tree')

  /**
   * 构建目标树
   * 以愿景为根节点，目标为子节点，计划为叶子节点
   */
  function buildGoalTree(): GoalTree {
    const goals = getGoals()
    const goalMap = new Map<string, Goal>()
    const childrenMap = new Map<string, Goal[]>()

    for (const goal of goals) {
      goalMap.set(goal.id, goal)
      if (!childrenMap.has(goal.id)) childrenMap.set(goal.id, [])
    }

    // 构建父子关系
    const roots: Goal[] = []
    for (const goal of goals) {
      if (goal.parentId && goalMap.has(goal.parentId)) {
        if (!childrenMap.has(goal.parentId)) childrenMap.set(goal.parentId, [])
        childrenMap.get(goal.parentId)!.push(goal)
      } else if (!goal.parentId) {
        roots.push(goal)
      }
    }

    // 递归构建节点
    function buildNode(goal: Goal, depth: number): GoalNode {
      const children = (childrenMap.get(goal.id) || [])
        .sort((a, b) => a.order - b.order)
        .map(child => buildNode(child, depth + 1))

      const progress = computeGoalProgress(goal)
      const health = computeGoalHealth(goal)

      return { goal, children, depth, progress, health }
    }

    const rootNodes = roots
      .sort((a, b) => a.order - b.order)
      .map(root => buildNode(root, 0))

    const allGoals = goals.length
    const completedGoals = goals.filter(g => g.status === 'bloom').length
    const overallProgress = allGoals > 0
      ? Math.round((completedGoals / allGoals) * 100)
      : 0

    const maxDepth = computeMaxDepth(rootNodes)

    return {
      roots: rootNodes,
      totalGoals: allGoals,
      completedGoals,
      overallProgress,
      maxDepth,
    }
  }

  /** 计算目标进度 */
  function computeGoalProgress(goal: Goal): number {
    if (goal.anchorCount > 0) {
      return Math.round((goal.anchorDone / goal.anchorCount) * 100)
    }
    if (goal.status === 'bloom') return 100
    if (goal.status === 'dormant') return 0
    const statusOrder: GoalStatus[] = ['seed', 'sprout', 'growing', 'bloom']
    const idx = statusOrder.indexOf(goal.status)
    return idx >= 0 ? idx * 33 : 0
  }

  /** 计算目标健康度 */
  function computeGoalHealth(goal: Goal): number {
    let health = 100

    // 长时间未更新
    const daysSinceUpdate = (Date.now() - new Date(goal.updatedAt).getTime()) / 86400000
    if (daysSinceUpdate > 30) health -= 30
    else if (daysSinceUpdate > 14) health -= 15

    // 休眠状态
    if (goal.status === 'dormant') health -= 20

    // 进度停滞
    if (goal.anchorCount > 0 && goal.anchorDone === 0) health -= 10

    return Math.max(0, health)
  }

  function computeMaxDepth(nodes: GoalNode[]): number {
    if (nodes.length === 0) return 0
    let max = 0
    for (const node of nodes) {
      max = Math.max(max, node.depth + 1, computeMaxDepth(node.children))
    }
    return max
  }

  /**
   * 生成径向布局数据
   * 用于环形目标展示
   */
  function buildRadialLayout(): {
    center: GoalNode | null
    rings: GoalNode[][]
  } {
    const tree = buildGoalTree()
    const rings: GoalNode[][] = []

    // 收集所有节点按深度分组
    function collectByDepth(node: GoalNode) {
      while (rings.length <= node.depth) rings.push([])
      rings[node.depth].push(node)
      for (const child of node.children) {
        collectByDepth(child)
      }
    }

    for (const root of tree.roots) {
      collectByDepth(root)
    }

    // 中心节点：如果有愿景，取第一个
    const center = tree.roots.length > 0 ? tree.roots[0] : null

    return { center, rings }
  }

  /**
   * 生成时间线布局数据
   */
  function buildTimelineLayout(): {
    phases: { label: string; goals: Goal[]; color: string }[]
  } {
    const goals = getGoals()
    const phases = [
      { label: '种子', goals: goals.filter(g => g.status === 'seed'), color: '#94a3b8' },
      { label: '发芽', goals: goals.filter(g => g.status === 'sprout'), color: '#34d399' },
      { label: '生长中', goals: goals.filter(g => g.status === 'growing'), color: '#6b9fc4' },
      { label: '已开花', goals: goals.filter(g => g.status === 'bloom'), color: '#f0c040' },
      { label: '休眠中', goals: goals.filter(g => g.status === 'dormant'), color: '#d98c7a' },
    ]

    return { phases: phases.filter(p => p.goals.length > 0) }
  }

  /**
   * 按领域统计进度
   */
  function getDomainProgress(): {
    domain: string
    label: string
    color: string
    total: number
    completed: number
    progress: number
  }[] {
    const goals = getGoals()
    const domains = new Map<string, { total: number; completed: number }>()

    for (const goal of goals) {
      if (!domains.has(goal.domain)) {
        domains.set(goal.domain, { total: 0, completed: 0 })
      }
      const d = domains.get(goal.domain)!
      d.total++
      if (goal.status === 'bloom') d.completed++
    }

    return [...domains.entries()]
      .map(([domain, data]) => ({
        domain,
        label: domain,
        color: DOMAIN_COLORS[domain as Goal['domain']] || '#a07c8c',
        total: data.total,
        completed: data.completed,
        progress: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
  }

  /**
   * 计算各层级进度统计
   */
  function getTierStats(): {
    vision: { total: number; completed: number; progress: number }
    target: { total: number; completed: number; progress: number }
    plan: { total: number; completed: number; progress: number }
  } {
    const goals = getGoals()
    const visions = goals.filter(g => g.tier === 'vision')
    const targets = goals.filter(g => g.tier === 'target')
    const plans = goals.filter(g => g.tier === 'plan')

    return {
      vision: {
        total: visions.length,
        completed: visions.filter(g => g.status === 'bloom').length,
        progress: visions.length > 0
          ? Math.round((visions.filter(g => g.status === 'bloom').length / visions.length) * 100)
          : 0,
      },
      target: {
        total: targets.length,
        completed: targets.filter(g => g.status === 'bloom').length,
        progress: targets.length > 0
          ? Math.round((targets.filter(g => g.status === 'bloom').length / targets.length) * 100)
          : 0,
      },
      plan: {
        total: plans.length,
        completed: plans.filter(g => g.status === 'bloom').length,
        progress: plans.length > 0
          ? Math.round((plans.filter(g => g.status === 'bloom').length / plans.length) * 100)
          : 0,
      },
    }
  }

  return {
    visualizationType,
    buildGoalTree,
    buildRadialLayout,
    buildTimelineLayout,
    getDomainProgress,
    getTierStats,
  }
}

// ============================================================
// 进度历史追踪
// ============================================================

export function useProgressHistory(getGoals: () => Goal[]) {
  const history = ref<ProgressHistory>(loadHistory())

  function loadHistory(): ProgressHistory {
    return storage.getKV<ProgressHistory>(PROGRESS_HISTORY_KEY, {
      snapshots: [],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      trend: 'stable',
    })
  }

  function saveHistory() {
    storage.setKV(PROGRESS_HISTORY_KEY, history.value)
  }

  /**
   * 拍摄进度快照
   */
  function takeSnapshot(): ProgressSnapshot {
    const goals = getGoals()
    const now = new Date().toISOString()

    let totalAnchors = 0
    let completedAnchors = 0
    const byDomain: Record<string, number> = {}

    const domainTotals = new Map<string, { total: number; completed: number }>()

    for (const goal of goals) {
      totalAnchors += goal.anchorCount
      completedAnchors += goal.anchorDone

      if (!domainTotals.has(goal.domain)) {
        domainTotals.set(goal.domain, { total: 0, completed: 0 })
      }
      const d = domainTotals.get(goal.domain)!
      d.total++
      if (goal.status === 'bloom') d.completed++
    }

    for (const [domain, data] of domainTotals) {
      byDomain[domain] = data.total > 0
        ? Math.round((data.completed / data.total) * 100)
        : 0
    }

    const snapshot: ProgressSnapshot = {
      date: getLocalDateKey(new Date(now)),
      totalGoals: goals.length,
      completedGoals: goals.filter(g => g.status === 'bloom').length,
      totalAnchors,
      completedAnchors,
      overallProgress: goals.length > 0
        ? Math.round((goals.filter(g => g.status === 'bloom').length / goals.length) * 100)
        : 0,
      byDomain,
    }

    // 避免同一天重复快照
    const existing = history.value.snapshots.find(s => s.date === snapshot.date)
    if (existing) {
      Object.assign(existing, snapshot)
    } else {
      history.value.snapshots.push(snapshot)
    }

    // 更新日期范围
    const dates = history.value.snapshots.map(s => s.date).sort()
    if (dates.length > 0) {
      history.value.startDate = dates[0]
      history.value.endDate = dates[dates.length - 1]
    }

    // 计算趋势
    history.value.trend = computeTrend(history.value.snapshots)

    // 限制快照数量
    if (history.value.snapshots.length > 365) {
      history.value.snapshots = history.value.snapshots.slice(-365)
    }

    saveHistory()
    return snapshot
  }

  function computeTrend(snapshots: ProgressSnapshot[]): 'improving' | 'declining' | 'stable' {
    if (snapshots.length < 2) return 'stable'

    const recent = snapshots.slice(-7)
    const first = recent[0].overallProgress
    const last = recent[recent.length - 1].overallProgress
    const diff = last - first

    if (diff > 5) return 'improving'
    if (diff < -5) return 'declining'
    return 'stable'
  }

  /** 获取进度趋势数据 */
  function getProgressTrend(): { dates: string[]; values: number[] } {
    const snapshots = history.value.snapshots
    return {
      dates: snapshots.map(s => s.date),
      values: snapshots.map(s => s.overallProgress),
    }
  }

  return {
    history,
    takeSnapshot,
    getProgressTrend,
  }
}

// ============================================================
// 里程碑管理
// ============================================================

export function useGoalMilestones(getGoals: () => Goal[]) {
  const milestones = ref<GoalMilestone[]>(loadMilestones())

  function loadMilestones(): GoalMilestone[] {
    return storage.getKV<GoalMilestone[]>(GOAL_MILESTONES_KEY, [])
  }

  function saveMilestones() {
    storage.setKV(GOAL_MILESTONES_KEY, milestones.value)
  }

  /**
   * 自动生成里程碑
   * 基于目标状态变化自动创建
   */
  function autoGenerateMilestones(goalId: string): GoalMilestone[] {
    const goals = getGoals()
    const goal = goals.find(g => g.id === goalId)
    if (!goal) return []

    const progress = goal.anchorCount > 0
      ? Math.round((goal.anchorDone / goal.anchorCount) * 100)
      : goal.status === 'bloom' ? 100 : 0

    const autoMilestones: GoalMilestone[] = [
      {
        id: `ms_${goalId}_start`,
        goalId,
        goalTitle: goal.title,
        title: '开始旅程',
        description: `目标 "${goal.title}" 已创建`,
        targetProgress: 0,
        currentProgress: 0,
        achieved: true,
        type: 'start',
      },
      {
        id: `ms_${goalId}_halfway`,
        goalId,
        goalTitle: goal.title,
        title: '过半里程',
        description: `目标 "${goal.title}" 已完成一半`,
        targetProgress: 50,
        currentProgress: progress,
        achieved: progress >= 50,
        type: 'halfway',
      },
      {
        id: `ms_${goalId}_complete`,
        goalId,
        goalTitle: goal.title,
        title: '达成目标',
        description: `目标 "${goal.title}" 已达成`,
        targetProgress: 100,
        currentProgress: progress,
        achieved: goal.status === 'bloom',
        type: 'complete',
        reward: '解锁"开花"成就',
      },
    ]

    // 合并到现有里程碑
    for (const ms of autoMilestones) {
      const existing = milestones.value.find(m => m.id === ms.id)
      if (existing) {
        existing.currentProgress = ms.currentProgress
        existing.achieved = ms.achieved
        if (ms.achieved && !existing.achievedAt) {
          existing.achievedAt = new Date().toISOString()
        }
      } else {
        milestones.value.push(ms)
      }
    }

    saveMilestones()
    return milestones.value.filter(m => m.goalId === goalId)
  }

  /**
   * 创建自定义里程碑
   */
  function createCustomMilestone(
    goalId: string,
    title: string,
    description: string,
    targetProgress: number,
    reward?: string,
  ): GoalMilestone {
    const goals = getGoals()
    const goal = goals.find(g => g.id === goalId)

    const progress = goal
      ? (goal.anchorCount > 0 ? Math.round((goal.anchorDone / goal.anchorCount) * 100) : 0)
      : 0

    const milestone: GoalMilestone = {
      id: `ms_${goalId}_${Date.now()}`,
      goalId,
      goalTitle: goal?.title || '未知目标',
      title,
      description,
      targetProgress,
      currentProgress: progress,
      achieved: progress >= targetProgress,
      type: 'custom',
      reward,
    }

    milestones.value.push(milestone)
    saveMilestones()
    return milestone
  }

  /**
   * 更新里程碑进度
   */
  function updateMilestoneProgress(milestoneId: string): void {
    const ms = milestones.value.find(m => m.id === milestoneId)
    if (!ms) return

    const goals = getGoals()
    const goal = goals.find(g => g.id === ms.goalId)
    if (!goal) return

    const progress = goal.anchorCount > 0
      ? Math.round((goal.anchorDone / goal.anchorCount) * 100)
      : goal.status === 'bloom' ? 100 : 0

    ms.currentProgress = progress
    if (progress >= ms.targetProgress && !ms.achieved) {
      ms.achieved = true
      ms.achievedAt = new Date().toISOString()
    }

    saveMilestones()
  }

  /**
   * 获取目标的里程碑
   */
  function getGoalMilestones(goalId: string): GoalMilestone[] {
    return milestones.value
      .filter(m => m.goalId === goalId)
      .sort((a, b) => a.targetProgress - b.targetProgress)
  }

  /**
   * 获取所有已达成里程碑
   */
  const achievedMilestones = computed(() =>
    milestones.value.filter(m => m.achieved).sort((a, b) => {
      if (!a.achievedAt || !b.achievedAt) return 0
      return new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime()
    }),
  )

  /**
   * 获取即将达成的里程碑（进度 >= 80%）
   */
  const upcomingMilestones = computed(() =>
    milestones.value
      .filter(m => !m.achieved && m.currentProgress >= m.targetProgress * 0.8)
      .sort((a, b) => b.currentProgress - a.currentProgress),
  )

  /** 删除里程碑 */
  function deleteMilestone(milestoneId: string): void {
    milestones.value = milestones.value.filter(m => m.id !== milestoneId)
    saveMilestones()
  }

  return {
    milestones,
    achievedMilestones,
    upcomingMilestones,
    autoGenerateMilestones,
    createCustomMilestone,
    updateMilestoneProgress,
    getGoalMilestones,
    deleteMilestone,
  }
}

// ---- 存储键 ----
