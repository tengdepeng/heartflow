// ============================================================
// 留光阁 · 目标生长进度可视化
// 蓝图：生长进度追踪 + 里程碑时间线 + 生长阶段可视化
// ============================================================

import { ref } from 'vue'
import type { Goal, GoalStatus } from './types'
import { storage } from '@/engine/storage'

// ---- 类型定义 ----

/** 生长阶段 */
export type GrowthPhase = 'seed' | 'sprout' | 'growing' | 'bloom' | 'dormant'

/** 生长阶段元数据 */
export interface GrowthPhaseMeta {
  phase: GrowthPhase
  label: string
  icon: string
  color: string
  description: string
  minProgress: number
  maxProgress: number
}

/** 进度快照 */
export interface ProgressSnapshot {
  id: string
  goalId: string
  anchorDone: number
  anchorCount: number
  progress: number
  status: GoalStatus
  recordedAt: string
  note?: string
}

/** 生长日志 */
export interface GrowthLog {
  id: string
  goalId: string
  event: string
  detail: string
  fromStatus?: GoalStatus
  toStatus?: GoalStatus
  progress?: number
  recordedAt: string
}

/** 里程碑时间线 */
export interface MilestoneTimeline {
  goalId: string
  title: string
  milestones: MilestoneEntry[]
}

/** 里程碑条目 */
export interface MilestoneEntry {
  id: string
  label: string
  date: string
  status: 'pending' | 'achieved' | 'missed'
  type: 'start' | 'checkpoint' | 'completion' | 'custom'
  description?: string
}

/** 生长进度统计 */
export interface ProgressStats {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  dormantGoals: number
  averageProgress: number
  totalAnchors: number
  totalDoneAnchors: number
  phaseDistribution: Record<GrowthPhase, number>
  recentLogs: GrowthLog[]
}

// ---- 常量 ----

export const GROWTH_PHASE_META: Record<GrowthPhase, GrowthPhaseMeta> = {
  seed: {
    phase: 'seed',
    label: '种子',
    icon: '🌱',
    color: '#8B6914',
    description: '目标初生，蓄势待发',
    minProgress: 0,
    maxProgress: 0.1,
  },
  sprout: {
    phase: 'sprout',
    label: '发芽',
    icon: '🌿',
    color: '#34d399',
    description: '破土而出，开始生长',
    minProgress: 0.1,
    maxProgress: 0.3,
  },
  growing: {
    phase: 'growing',
    label: '生长中',
    icon: '🌳',
    color: '#6b9fc4',
    description: '茁壮成长，日新月异',
    minProgress: 0.3,
    maxProgress: 0.8,
  },
  bloom: {
    phase: 'bloom',
    label: '已开花',
    icon: '🌸',
    color: '#d98c7a',
    description: '目标达成，绽放光芒',
    minProgress: 0.8,
    maxProgress: 1.0,
  },
  dormant: {
    phase: 'dormant',
    label: '休眠中',
    icon: '💤',
    color: '#7a7f8c',
    description: '暂时休眠，等待唤醒',
    minProgress: 0,
    maxProgress: 1.0,
  },
}

export const PROGRESS_STORAGE_KEYS = {
  SNAPSHOTS: 'hf:goal_progress_snapshots',
  LOGS: 'hf:goal_progress_logs',
  MILESTONES: 'hf:goal_milestones',
} as const

// ---- 进度快照 ----

export function useProgressSnapshots() {
  const snapshots = ref<ProgressSnapshot[]>([])

  function loadSnapshots(): ProgressSnapshot[] {
    const stored = storage.getKV<ProgressSnapshot[]>(PROGRESS_STORAGE_KEYS.SNAPSHOTS, [])
    if (stored) snapshots.value = stored
    return snapshots.value
  }

  function takeSnapshot(goal: Goal, note?: string): ProgressSnapshot {
    const progress = goal.anchorCount > 0 ? goal.anchorDone / goal.anchorCount : 0
    const snapshot: ProgressSnapshot = {
      id: `snap-${Date.now()}`,
      goalId: goal.id,
      anchorDone: goal.anchorDone,
      anchorCount: goal.anchorCount,
      progress,
      status: goal.status,
      recordedAt: new Date().toISOString(),
      note,
    }
    snapshots.value.push(snapshot)
    saveSnapshots()
    return snapshot
  }

  function getGoalSnapshots(goalId: string): ProgressSnapshot[] {
    return snapshots.value
      .filter(s => s.goalId === goalId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
  }

  function getLatestSnapshot(goalId: string): ProgressSnapshot | undefined {
    const goalSnapshots = getGoalSnapshots(goalId)
    return goalSnapshots[goalSnapshots.length - 1]
  }

  function computeProgressTrend(goalId: string): { direction: 'up' | 'down' | 'flat'; rate: number } {
    const goalSnapshots = getGoalSnapshots(goalId)
    if (goalSnapshots.length < 2) return { direction: 'flat', rate: 0 }

    const recent = goalSnapshots.slice(-5)
    const first = recent[0]
    const last = recent[recent.length - 1]
    const daysDiff = (new Date(last.recordedAt).getTime() - new Date(first.recordedAt).getTime()) / 86400000
    const rate = daysDiff > 0 ? (last.progress - first.progress) / daysDiff : 0

    return {
      direction: rate > 0.01 ? 'up' : rate < -0.01 ? 'down' : 'flat',
      rate: Math.round(rate * 10000) / 100,
    }
  }

  function saveSnapshots(): void {
    storage.setKV(PROGRESS_STORAGE_KEYS.SNAPSHOTS, snapshots.value)
  }

  return {
    snapshots,
    loadSnapshots,
    takeSnapshot,
    getGoalSnapshots,
    getLatestSnapshot,
    computeProgressTrend,
  }
}

// ---- 生长日志 ----

export function useGrowthLogs() {
  const logs = ref<GrowthLog[]>([])

  function loadLogs(): GrowthLog[] {
    const stored = storage.getKV<GrowthLog[]>(PROGRESS_STORAGE_KEYS.LOGS, [])
    if (stored) logs.value = stored
    return logs.value
  }

  function logEvent(
    goalId: string,
    event: string,
    detail: string,
    fromStatus?: GoalStatus,
    toStatus?: GoalStatus,
    progress?: number,
  ): GrowthLog {
    const log: GrowthLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      goalId,
      event,
      detail,
      fromStatus,
      toStatus,
      progress,
      recordedAt: new Date().toISOString(),
    }
    logs.value.push(log)
    saveLogs()
    return log
  }

  function logStatusChange(goal: Goal, fromStatus: GoalStatus, detail?: string): GrowthLog {
    return logEvent(
      goal.id,
      'status_change',
      detail || `状态从 ${fromStatus} 变为 ${goal.status}`,
      fromStatus,
      goal.status,
      goal.anchorCount > 0 ? goal.anchorDone / goal.anchorCount : 0,
    )
  }

  function logProgressUpdate(goal: Goal, detail?: string): GrowthLog {
    return logEvent(
      goal.id,
      'progress_update',
      detail || `锚点进度 ${goal.anchorDone}/${goal.anchorCount}`,
      undefined,
      undefined,
      goal.anchorCount > 0 ? goal.anchorDone / goal.anchorCount : 0,
    )
  }

  function getGoalLogs(goalId: string, limit = 20): GrowthLog[] {
    return logs.value
      .filter(l => l.goalId === goalId)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, limit)
  }

  function getRecentLogs(limit = 10): GrowthLog[] {
    return [...logs.value]
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())
      .slice(0, limit)
  }

  function saveLogs(): void {
    storage.setKV(PROGRESS_STORAGE_KEYS.LOGS, logs.value)
  }

  return {
    logs,
    loadLogs,
    logEvent,
    logStatusChange,
    logProgressUpdate,
    getGoalLogs,
    getRecentLogs,
  }
}

// ---- 里程碑时间线 ----

export function useMilestoneTimeline() {
  const timelines = ref<MilestoneTimeline[]>([])

  function loadTimelines(): MilestoneTimeline[] {
    const stored = storage.getKV<MilestoneTimeline[]>(PROGRESS_STORAGE_KEYS.MILESTONES, [])
    if (stored) timelines.value = stored
    return timelines.value
  }

  function createTimeline(goalId: string, title: string): MilestoneTimeline {
    const timeline: MilestoneTimeline = {
      goalId,
      title,
      milestones: [],
    }
    timelines.value.push(timeline)
    saveTimelines()
    return timeline
  }

  function addMilestone(
    goalId: string,
    label: string,
    date: string,
    type: MilestoneEntry['type'] = 'checkpoint',
    description?: string,
  ): MilestoneEntry | null {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline) return null

    const entry: MilestoneEntry = {
      id: `ms-${Date.now()}`,
      label,
      date,
      status: 'pending',
      type,
      description,
    }
    timeline.milestones.push(entry)
    saveTimelines()
    return entry
  }

  function markAchieved(goalId: string, milestoneId: string): boolean {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline) return false

    const entry = timeline.milestones.find(m => m.id === milestoneId)
    if (!entry) return false

    entry.status = 'achieved'
    saveTimelines()
    return true
  }

  function markMissed(goalId: string, milestoneId: string): boolean {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline) return false

    const entry = timeline.milestones.find(m => m.id === milestoneId)
    if (!entry) return false

    entry.status = 'missed'
    saveTimelines()
    return true
  }

  function getTimeline(goalId: string): MilestoneTimeline | undefined {
    return timelines.value.find(t => t.goalId === goalId)
  }

  function getUpcomingMilestones(goalId: string, days = 7): MilestoneEntry[] {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline) return []

    const now = new Date()
    const future = new Date(now.getTime() + days * 86400000)

    return timeline.milestones
      .filter(m => {
        const date = new Date(m.date)
        return date >= now && date <= future && m.status === 'pending'
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  function getOverdueMilestones(goalId: string): MilestoneEntry[] {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline) return []

    const now = new Date()
    return timeline.milestones
      .filter(m => new Date(m.date) < now && m.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  function computeMilestoneProgress(goalId: string): { total: number; achieved: number; missed: number; pending: number; progress: number } {
    const timeline = timelines.value.find(t => t.goalId === goalId)
    if (!timeline || timeline.milestones.length === 0) {
      return { total: 0, achieved: 0, missed: 0, pending: 0, progress: 0 }
    }

    const achieved = timeline.milestones.filter(m => m.status === 'achieved').length
    const missed = timeline.milestones.filter(m => m.status === 'missed').length
    const pending = timeline.milestones.filter(m => m.status === 'pending').length

    return {
      total: timeline.milestones.length,
      achieved,
      missed,
      pending,
      progress: timeline.milestones.length > 0 ? achieved / timeline.milestones.length : 0,
    }
  }

  function saveTimelines(): void {
    storage.setKV(PROGRESS_STORAGE_KEYS.MILESTONES, timelines.value)
  }

  return {
    timelines,
    loadTimelines,
    createTimeline,
    addMilestone,
    markAchieved,
    markMissed,
    getTimeline,
    getUpcomingMilestones,
    getOverdueMilestones,
    computeMilestoneProgress,
  }
}

// ---- 综合进度统计 ----

export function useProgressStats() {
  const { snapshots, loadSnapshots, getLatestSnapshot, computeProgressTrend } = useProgressSnapshots()
  const { logs, loadLogs, getRecentLogs } = useGrowthLogs()

  function computeStats(goals: Goal[]): ProgressStats {
    const activeGoals = goals.filter(g => g.status !== 'dormant' && g.status !== 'bloom')
    const completedGoals = goals.filter(g => g.status === 'bloom')
    const dormantGoals = goals.filter(g => g.status === 'dormant')

    const progressValues = goals
      .filter(g => g.anchorCount > 0)
      .map(g => g.anchorDone / g.anchorCount)

    const averageProgress = progressValues.length > 0
      ? progressValues.reduce((a, b) => a + b, 0) / progressValues.length
      : 0

    const phaseDistribution: Record<GrowthPhase, number> = {
      seed: 0,
      sprout: 0,
      growing: 0,
      bloom: 0,
      dormant: 0,
    }
    goals.forEach(g => { phaseDistribution[g.status]++ })

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      completedGoals: completedGoals.length,
      dormantGoals: dormantGoals.length,
      averageProgress: Math.round(averageProgress * 100) / 100,
      totalAnchors: goals.reduce((s, g) => s + g.anchorCount, 0),
      totalDoneAnchors: goals.reduce((s, g) => s + g.anchorDone, 0),
      phaseDistribution,
      recentLogs: getRecentLogs(10),
    }
  }

  return {
    snapshots,
    logs,
    loadSnapshots,
    loadLogs,
    getLatestSnapshot,
    computeProgressTrend,
    getRecentLogs,
    computeStats,
  }
}