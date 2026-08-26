// ============================================================
// 自律工坊 · 番茄可视化（P16 树园）
// ------------------------------------------------------------
// 借鉴 Forest / Focus To-Do 的「种树」专注可视化：
// - 每个完成的专注会话种下一棵树，中途放弃则树枯萎
// - 专注时长决定树的品种与生长阶段（种子→新芽→树苗→成树→繁花）
// - 专注会话与任务绑定（carrierId → taskId），按任务聚合专注投入
// - 中断如实记录（原因分类），供回顾与改进
// 数据本地私有（宪法第1条），纯函数可单测。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { FocusSession } from '../../types'

// ============================================================
// 种树可视化
// ============================================================

/** 树的品种（由单次专注时长决定） */
export type TreeSpecies = 'seed' | 'sprout' | 'sapling' | 'tree' | 'bloom'

/** 一棵树（由一条专注会话派生） */
export interface FocusTree {
  id: string
  /** 来源专注会话 ID */
  sessionId: string
  /** 绑定任务 ID（carrierId），可为空 */
  taskId: string | null
  /** 品种 */
  species: TreeSpecies
  /** 生长阶段 0-4（种子/新芽/树苗/成树/繁花） */
  stage: number
  /** 专注投入（毫秒） */
  focusMs: number
  /** 种植时间（完成或中断时刻） */
  plantedAt: string
  /** growing=成活 / withered=枯萎（中途放弃） */
  status: 'growing' | 'withered'
}

export const TREE_SPECIES_META: Record<TreeSpecies, { label: string; icon: string; minMs: number }> = {
  seed: { label: '种子', icon: '🌰', minMs: 0 },
  sprout: { label: '新芽', icon: '🌱', minMs: 10 * 60 * 1000 },
  sapling: { label: '树苗', icon: '🌿', minMs: 25 * 60 * 1000 },
  tree: { label: '成树', icon: '🌳', minMs: 45 * 60 * 1000 },
  bloom: { label: '繁花', icon: '🌸', minMs: 90 * 60 * 1000 },
}

export const TREE_STAGE_META: { label: string; icon: string; minMs: number }[] = [
  { label: '种子', icon: '🌰', minMs: 0 },
  { label: '新芽', icon: '🌱', minMs: 10 * 60 * 1000 },
  { label: '树苗', icon: '🌿', minMs: 25 * 60 * 1000 },
  { label: '成树', icon: '🌳', minMs: 45 * 60 * 1000 },
  { label: '繁花', icon: '🌸', minMs: 90 * 60 * 1000 },
]

/** 由专注时长确定品种 */
export function treeSpeciesForFocus(focusMs: number): TreeSpecies {
  let best: TreeSpecies = 'seed'
  for (const s of Object.keys(TREE_SPECIES_META) as TreeSpecies[]) {
    if (focusMs >= TREE_SPECIES_META[s].minMs) best = s
  }
  return best
}

/** 由专注时长确定生长阶段 0-4 */
export function treeStageForFocus(focusMs: number): number {
  let stage = 0
  for (let i = 0; i < TREE_STAGE_META.length; i++) {
    if (focusMs >= TREE_STAGE_META[i].minMs) stage = i
  }
  return stage
}

/** 由专注会话列表派生树园（完成→成活，中断→枯萎） */
export function buildForest(sessions: FocusSession[]): FocusTree[] {
  return sessions
    .filter(s => s.mode === 'focus')
    .map((s): FocusTree => {
      const focusMs = s.elapsed || 0
      const completed = s.status === 'completed'
      return {
        id: `tree_${s.id}`,
        sessionId: s.id,
        taskId: s.carrierId,
        species: treeSpeciesForFocus(focusMs),
        stage: treeStageForFocus(focusMs),
        focusMs,
        plantedAt: s.completedAt ?? s.startedAt ?? s.id,
        status: completed ? 'growing' : 'withered',
      }
    })
    .sort((a, b) => b.plantedAt.localeCompare(a.plantedAt))
}

// ============================================================
// 树园概览
// ============================================================

export interface ForestOverview {
  totalTrees: number
  growingTrees: number
  witheredTrees: number
  todayTrees: number
  todayWithered: number
  totalFocusMs: number
  todayFocusMs: number
  bestSpecies: TreeSpecies
  /** 成活率 0-100 */
  survivalRate: number
}

/** 树园概览统计 */
export function forestOverview(trees: FocusTree[], now = new Date()): ForestOverview {
  const today = now.toISOString().slice(0, 10)
  const growing = trees.filter(t => t.status === 'growing')
  const todayTrees = trees.filter(t => t.plantedAt.startsWith(today))
  const totalFocusMs = growing.reduce((s, t) => s + t.focusMs, 0)
  const todayFocusMs = todayTrees
    .filter(t => t.status === 'growing')
    .reduce((s, t) => s + t.focusMs, 0)

  let bestSpecies: TreeSpecies = 'seed'
  for (const t of growing) {
    if (TREE_SPECIES_META[t.species].minMs > TREE_SPECIES_META[bestSpecies].minMs) {
      bestSpecies = t.species
    }
  }

  return {
    totalTrees: trees.length,
    growingTrees: growing.length,
    witheredTrees: trees.length - growing.length,
    todayTrees: todayTrees.length,
    todayWithered: todayTrees.filter(t => t.status === 'withered').length,
    totalFocusMs,
    todayFocusMs,
    bestSpecies,
    survivalRate: trees.length > 0 ? Math.round((growing.length / trees.length) * 100) : 0,
  }
}

/** 按天聚合专注投入（用于 7 日小趋势） */
export function forestDailyTrend(trees: FocusTree[], days = 7, now = new Date()): { date: string; focusMs: number; count: number }[] {
  const out: { date: string; focusMs: number; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayTrees = trees.filter(t => t.status === 'growing' && t.plantedAt.startsWith(key))
    out.push({
      date: key,
      focusMs: dayTrees.reduce((s, t) => s + t.focusMs, 0),
      count: dayTrees.length,
    })
  }
  return out
}

// ============================================================
// 专注任务绑定
// ============================================================

export interface TaskFocusRow {
  taskId: string
  taskTitle: string
  focusCount: number
  focusMs: number
  lastFocusAt: string | null
}

/** 按任务聚合专注投入（任务绑定可视化） */
export function taskFocusRows(
  trees: FocusTree[],
  tasks: { id: string; title: string }[],
): TaskFocusRow[] {
  const titleById = new Map(tasks.map(t => [t.id, t.title]))
  const byTask = new Map<string, { count: number; focusMs: number; last: string | null }>()
  for (const t of trees) {
    if (!t.taskId || t.status !== 'growing') continue
    const cur = byTask.get(t.taskId) ?? { count: 0, focusMs: 0, last: null }
    cur.count += 1
    cur.focusMs += t.focusMs
    if (!cur.last || t.plantedAt > cur.last) cur.last = t.plantedAt
    byTask.set(t.taskId, cur)
  }
  return [...byTask.entries()]
    .map(([taskId, v]) => ({
      taskId,
      taskTitle: titleById.get(taskId) ?? '（已删除任务）',
      focusCount: v.count,
      focusMs: v.focusMs,
      lastFocusAt: v.last,
    }))
    .sort((a, b) => b.focusMs - a.focusMs)
}

// ============================================================
// 中断记录
// ============================================================

export type InterruptionCategory = 'notification' | 'distraction' | 'urgent' | 'fatigue' | 'other'

export interface InterruptionRecord {
  id: string
  sessionId: string
  taskId: string | null
  reason: string
  category: InterruptionCategory
  occurredAt: string
  focusMs: number
}

export const INTERRUPTION_CATEGORY_META: Record<InterruptionCategory, { label: string; icon: string }> = {
  notification: { label: '消息打扰', icon: '🔔' },
  distraction: { label: '走神分心', icon: '🌀' },
  urgent: { label: '临时急事', icon: '🚨' },
  fatigue: { label: '精力不济', icon: '😴' },
  other: { label: '其他', icon: '📝' },
}

export const INTERRUPTION_CATEGORIES: InterruptionCategory[] = [
  'notification',
  'distraction',
  'urgent',
  'fatigue',
  'other',
]

export interface InterruptionStats {
  total: number
  today: number
  byCategory: Record<string, number>
  mostCommon: string
  avgFocusMs: number
}

/** 中断统计（原因分布 + 平均坚持时长） */
export function interruptionStats(records: InterruptionRecord[], now = new Date()): InterruptionStats {
  const today = now.toISOString().slice(0, 10)
  const todayCount = records.filter(r => r.occurredAt.startsWith(today)).length
  const byCategory: Record<string, number> = {}
  for (const r of records) {
    byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
  }
  let mostCommon = 'none'
  let max = 0
  for (const [cat, n] of Object.entries(byCategory)) {
    if (n > max) {
      max = n
      mostCommon = cat
    }
  }
  const avgFocusMs = records.length > 0
    ? Math.round(records.reduce((s, r) => s + r.focusMs, 0) / records.length)
    : 0
  return { total: records.length, today: todayCount, byCategory, mostCommon, avgFocusMs }
}

// ============================================================
// 中断记录存储（KV 持久化）
// ============================================================

const INTERRUPTIONS_KEY = 'hf:discipline:interruptions'

const interruptions = ref<InterruptionRecord[]>([])

function generateId(): string {
  return `intr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function usePomodoroForest() {
  function load(): void {
    try {
      interruptions.value = storage.getKV<InterruptionRecord[]>(INTERRUPTIONS_KEY, []) || []
    } catch {
      interruptions.value = []
    }
  }

  function save(): void {
    storage.setKV(INTERRUPTIONS_KEY, interruptions.value)
  }

  function recordInterruption(input: {
    sessionId: string
    taskId?: string | null
    reason: string
    category: InterruptionCategory
    focusMs: number
  }): InterruptionRecord {
    const record: InterruptionRecord = {
      id: generateId(),
      sessionId: input.sessionId,
      taskId: input.taskId ?? null,
      reason: input.reason.trim(),
      category: input.category,
      occurredAt: new Date().toISOString(),
      focusMs: input.focusMs,
    }
    interruptions.value = [record, ...interruptions.value]
    save()
    return record
  }

  function removeInterruption(id: string): boolean {
    const idx = interruptions.value.findIndex(r => r.id === id)
    if (idx === -1) return false
    interruptions.value = interruptions.value.filter(r => r.id !== id)
    save()
    return true
  }

  function clearInterruptions(): void {
    interruptions.value = []
    save()
  }

  return {
    interruptions,
    load,
    save,
    recordInterruption,
    removeInterruption,
    clearInterruptions,
  }
}
