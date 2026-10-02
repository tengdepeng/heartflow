// ============================================================
// 更漏 · 时间块日规划引擎（模块二十一 · 新增能力）
// ------------------------------------------------------------
// 借鉴 Sorted / TickTick 的 time-blocking：把「待办」按预估时长
// 排入当日时间轴空闲隙，形成时间块；并支持轻量自动排程。
// 宪法合规：纯函数核心（可单测）+ 轻量持久化；不发出提醒、不造假。
// 数据模型：PlannedTask（待办池，含预估时长）↔ TimeBlock（落在时间轴
// 上的排程实例，taskId 指回 PlannedTask）。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import type { WorkCategory, WorkRecord } from './clepsydra'
import { genId, WORK_CATEGORY_META, useClepsydra } from './clepsydra'

// ------------------------------------------------------------
// 持久化键
// ------------------------------------------------------------

export const TASK_STORAGE_KEY = 'hf:clepsydra_plan_tasks'
export const BLOCK_STORAGE_KEY = 'hf:clepsydra_time_blocks'
export const TEMPLATE_STORAGE_KEY = 'hf:clepsydra_templates'

// ------------------------------------------------------------
// 类型
// ------------------------------------------------------------

/** 一条待办（规划池中的任务，含预估时长） */
export interface PlannedTask {
  id: string
  /** 标题 */
  title: string
  /** 分类（复用更漏五色） */
  category: WorkCategory
  /** 预估时长（分钟） */
  estimatedMinutes: number
  /** 所属日期（localDateKey） */
  date: string
  /** 是否已完成 */
  done: boolean
  /** 创建时间（ISO） */
  createdAt: string
}

/** 一个时间块（落在当日时间轴上的排程实例） */
export interface TimeBlock {
  id: string
  /** 所属日期（localDateKey） */
  date: string
  /** 起始（距零点分钟数） */
  startMin: number
  /** 时长（分钟） */
  durationMin: number
  /** 分类（取自建块时对应任务的分类） */
  category: WorkCategory
  /** 标题 */
  title: string
  /** 指回 PlannedTask 的 id；手动直接建块可为 null */
  taskId: string | null
  /** 是否已完成 */
  done: boolean
}

/** 区间（分钟） */
export interface Interval {
  startMin: number
  endMin: number
}

/** 时间块模板（某日规划的快照，套用时赋目标日期） */
export interface BlockTemplate {
  id: string
  /** 模板名 */
  name: string
  /** 创建时间（ISO） */
  createdAt: string
  /** 模板包含的待办（剥离 id/date，套用时生成新实例） */
  tasks: { title: string; category: WorkCategory; estimatedMinutes: number }[]
  /** 模板包含的时间块（剥离 id/date，套用时生成新实例；保留起止与分类标题） */
  blocks: { startMin: number; durationMin: number; category: WorkCategory; title: string }[]
}

// ------------------------------------------------------------
// 纯函数（可单测，无 Vue / 无存储依赖）
// ------------------------------------------------------------

/** 距零点分钟数 → "HH:MM" */
export function minutesToLabel(min: number): string {
  const m = Math.max(0, Math.round(min))
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** "HH:MM" → 距零点分钟数；非法返回 null */
export function labelToMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(label.trim())
  if (!m) return null
  const h = Number(m[1])
  const mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}

/** 块的结束分钟数 */
export function blockEndMin(b: { startMin: number; durationMin: number }): number {
  return b.startMin + b.durationMin
}

/** 合并重叠/相邻区间 */
export function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) return []
  const sorted = [...intervals].sort((a, b) => a.startMin - b.startMin)
  const out: Interval[] = [{ ...sorted[0] }]
  for (let i = 1; i < sorted.length; i++) {
    const last = out[out.length - 1]
    const cur = sorted[i]
    if (cur.startMin <= last.endMin) {
      last.endMin = Math.max(last.endMin, cur.endMin)
    } else {
      out.push({ ...cur })
    }
  }
  return out
}

/** 在窗口内求空闲隙（clamp 到窗口） */
export function freeGaps(
  occupied: Interval[],
  windowStartMin: number,
  windowEndMin: number,
): Interval[] {
  const merged = mergeIntervals(occupied)
  const gaps: Interval[] = []
  let cursor = windowStartMin
  for (const iv of merged) {
    const s = Math.max(iv.startMin, windowStartMin)
    const e = Math.min(iv.endMin, windowEndMin)
    if (e <= cursor) continue
    if (s > cursor) gaps.push({ startMin: cursor, endMin: s })
    cursor = Math.max(cursor, e)
  }
  if (cursor < windowEndMin) gaps.push({ startMin: cursor, endMin: windowEndMin })
  return gaps
}

/** 排序：预估长的优先（更易吃掉大空隙），同长则先建者优先 */
export function sortTasksForSchedule(tasks: PlannedTask[]): PlannedTask[] {
  return [...tasks].sort((a, b) => {
    if (a.estimatedMinutes !== b.estimatedMinutes) return b.estimatedMinutes - a.estimatedMinutes
    return a.createdAt.localeCompare(b.createdAt)
  })
}

export interface AutoScheduleOptions {
  /** 工作窗口起点（距零点分钟），默认 07:00 */
  dayStartMin?: number
  /** 工作窗口终点（距零点分钟），默认 23:00 */
  dayEndMin?: number
  /** 午休起点（距零点分钟），默认 12:00，作为永久占用 */
  lunchStartMin?: number
  /** 午休终点（距零点分钟），默认 13:00 */
  lunchEndMin?: number
}

/**
 * 轻量自动排程：把未排程任务按预估时长塞入当日空闲隙。
 * 纯函数：返回新生成的 TimeBlock 数组，不修改入参。
 * 调用方负责把结果并入持久化（见 useTimeBlock.autoScheduleForDate）。
 */
export function autoSchedule(
  tasks: PlannedTask[],
  existingBlocks: TimeBlock[],
  opts: AutoScheduleOptions = {},
): TimeBlock[] {
  const dayStartMin = opts.dayStartMin ?? 7 * 60
  const dayEndMin = opts.dayEndMin ?? 23 * 60
  const lunchStartMin = opts.lunchStartMin ?? 12 * 60
  const lunchEndMin = opts.lunchEndMin ?? 13 * 60

  const date = tasks[0]?.date
  if (!date) return []

  const occupied: Interval[] = existingBlocks
    .filter(b => b.date === date)
    .map(b => ({ startMin: b.startMin, endMin: b.startMin + b.durationMin }))
  // 午休作为永久占用，自动避开
  occupied.push({ startMin: lunchStartMin, endMin: lunchEndMin })

  const gaps = freeGaps(occupied, dayStartMin, dayEndMin)

  const pending = sortTasksForSchedule(tasks).filter(t => t.estimatedMinutes > 0)
  const newBlocks: TimeBlock[] = []
  let currentGaps = gaps
  for (const t of pending) {
    const need = t.estimatedMinutes
    const slot = currentGaps.find(g => g.endMin - g.startMin >= need)
    if (!slot) break // 当日已无足够空隙
    const startMin = slot.startMin
    newBlocks.push({
      id: genId(),
      date,
      startMin,
      durationMin: need,
      category: t.category,
      title: t.title,
      taskId: t.id,
      done: false,
    })
    currentGaps = replaceGap(currentGaps, slot, startMin, startMin + need)
  }
  return newBlocks
}

/** 用已占用区间替换原空隙为左右两段剩余空隙 */
function replaceGap(gaps: Interval[], slot: Interval, usedStart: number, usedEnd: number): Interval[] {
  const out: Interval[] = []
  for (const g of gaps) {
    if (g === slot) {
      if (usedStart > g.startMin) out.push({ startMin: g.startMin, endMin: usedStart })
      if (usedEnd < g.endMin) out.push({ startMin: usedEnd, endMin: g.endMin })
    } else {
      out.push(g)
    }
  }
  return out
}

/** 当日已排程总分钟 */
export function scheduledMinutes(blocks: TimeBlock[], date: string): number {
  return blocks
    .filter(b => b.date === date)
    .reduce((s, b) => s + b.durationMin, 0)
}

/** 当日时间轴覆盖率（0-1，封顶 1） */
export function dayCoverage(
  blocks: TimeBlock[],
  date: string,
  dayStartMin = 7 * 60,
  dayEndMin = 23 * 60,
): number {
  const win = dayEndMin - dayStartMin
  if (win <= 0) return 0
  return Math.min(1, scheduledMinutes(blocks, date) / win)
}

/** localDateKey（距零点，本地时区） */
export function localDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 今日 key 便捷方法 */
export function todayKey(): string {
  return localDateKey(new Date())
}

/** 一周起点（周一=1） */
export const WEEK_START_DOW = 1

/** 返回包含 anchor 的那一周的 7 个 localDateKey（周一→周日） */
export function weekDaysOf(anchor: Date): string[] {
  const d = new Date(anchor)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 周一=0
  d.setDate(d.getDate() - dow)
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    days.push(localDateKey(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

/** 周内的块（按 days 过滤） */
export function blocksForWeek(blocks: TimeBlock[], days: string[]): TimeBlock[] {
  const set = new Set(days)
  return blocks.filter(b => set.has(b.date))
}

/** 周覆盖率：7 天已排程总分钟 / (7 × 工作窗口分钟)，封顶 1 */
export function weekCoverage(
  blocks: TimeBlock[],
  days: string[],
  dayStartMin = 7 * 60,
  dayEndMin = 23 * 60,
): number {
  const dayWin = Math.max(0, dayEndMin - dayStartMin)
  if (dayWin <= 0 || days.length === 0) return 0
  const total = days.reduce((s, day) => s + scheduledMinutes(blocks, day), 0)
  return Math.min(1, total / (days.length * dayWin))
}

/**
 * 把时间块（完成态）映射为更漏工作记录输入。
 * 仅用时间块自身携带的 date/startMin/durationMin/category/title，无需回溯待办。
 * sourceType='auto' + sourceAnchorId=block.id 可追溯、可级联移除。
 */
export function blockToRecordInput(b: TimeBlock): {
  startedAt: Date
  endedAt: Date
  category: WorkCategory
  intensity: number
  note: string
  sourceType: 'auto'
  sourceAnchorId: string
} {
  const base = new Date(`${b.date}T00:00:00`)
  const start = new Date(base.getTime() + b.startMin * 60000)
  const end = new Date(start.getTime() + b.durationMin * 60000)
  return {
    startedAt: start,
    endedAt: end,
    category: b.category,
    intensity: WORK_CATEGORY_META[b.category].intensity,
    note: `时间块·${b.title}`,
    sourceType: 'auto',
    sourceAnchorId: b.id,
  }
}

/**
 * 检测时间块重叠（冲突）。
 * 在指定日期（或全量）内，按区间 [startMin, startMin+durationMin) 排序后扫描：
 * 相邻（a.end === b.start）不算重叠，严格相交才标记。
 * 全量调用时按 date 分组独立扫描——跨天在物理时间轴上不重叠，避免误报。
 * 返回所有参与重叠的块 id 集合（纯函数，不修改入参），用于面板派生「冲突告警」。
 */
export function detectOverlapIds(blocks: TimeBlock[], date?: string): Set<string> {
  const list = date ? blocks.filter(b => b.date === date) : blocks
  const ids = new Set<string>()
  // 按 date 分组，组内独立扫描（跨天不重叠）
  const byDate = new Map<string, TimeBlock[]>()
  for (const b of list) {
    const arr = byDate.get(b.date)
    if (arr) arr.push(b)
    else byDate.set(b.date, [b])
  }
  for (const group of byDate.values()) scanOverlaps(group, ids)
  return ids
}

/** 单日组内扫描：相邻不重叠，严格相交标记双方 */
function scanOverlaps(group: TimeBlock[], ids: Set<string>): void {
  const sorted = group
    .slice()
    .sort((a, b) => a.startMin - b.startMin || a.durationMin - b.durationMin)
  const active: TimeBlock[] = []
  for (const b of sorted) {
    // 移除已结束（含相邻：a.end <= b.start 视为不重叠）
    for (let k = active.length - 1; k >= 0; k--) {
      if (active[k].startMin + active[k].durationMin <= b.startMin) active.splice(k, 1)
    }
    // 仍活跃的即与 b 重叠（保留条件 a.end > b.start）
    for (const a of active) {
      ids.add(a.id)
      ids.add(b.id)
    }
    active.push(b)
  }
}

/**
 * 冲突智能避让 / 重排（INCR-421）。
 * 把 detectOverlapIds 的「只标红」升级为「可消解」：拖拽落点自动避让，
 * 以及一键紧凑重排消解存量冲突。纯函数，不修改入参，可单测。
 */

/** 避让 / 重排的窗口与排除选项 */
export interface AvoidanceOptions {
  /** 忽略某个块的当前占位（拖拽该块时排除自身） */
  excludeId?: string
  /** 工作窗口起点（距零点分钟），默认 0 */
  windowStartMin?: number
  /** 工作窗口终点（距零点分钟），默认 24*60 */
  windowEndMin?: number
}

const AVOID_MIN = 5

/**
 * 求一个块在指定日期「不与其他块重叠」的起始分钟。
 * 策略：① desired 能完整落在某空隙内 → 保持 desired（最小移动）；
 * ② 否则取离 desired 最近、且能容纳 duration 的空隙起点；
 * ③ 当日无任何空隙容纳 → 退化为 clamp 到窗口（尽力，仍可能重叠）。
 * others 默认排除 excludeId 自身，使「移动正在拖的块」不会避让自己。
 */
export function resolveFreeStart(
  blocks: TimeBlock[],
  date: string,
  desiredStart: number,
  duration: number,
  opts: AvoidanceOptions = {},
): number {
  const ws = opts.windowStartMin ?? 0
  const we = opts.windowEndMin ?? 24 * 60
  const dur = Math.max(AVOID_MIN, duration)
  const others = blocks
    .filter(b => b.date === date && b.id !== opts.excludeId)
    .map(b => ({ startMin: b.startMin, endMin: b.startMin + b.durationMin }))
  const gaps = freeGaps(others, ws, we)
  for (const g of gaps) {
    if (desiredStart >= g.startMin && desiredStart + dur <= g.endMin) return desiredStart
  }
  let best = -1
  let bestDist = Infinity
  for (const g of gaps) {
    if (g.endMin - g.startMin < dur) continue
    const dist = Math.abs(g.startMin - desiredStart)
    if (dist < bestDist) {
      bestDist = dist
      best = g.startMin
    }
  }
  if (best >= 0) return best
  return Math.max(ws, Math.min(desiredStart, we - dur))
}

/**
 * 给定块起点，求其在当前空隙内还能向后拉伸的最大时长（不挤压其他块）。
 * 用于在拉伸拖拽时 clamp 时长，避免引入新重叠。返回 0 表示起点已落在他块内（异常）。
 */
export function maxDurationInGap(
  blocks: TimeBlock[],
  date: string,
  excludeId: string,
  startMin: number,
  opts: AvoidanceOptions = {},
): number {
  const ws = opts.windowStartMin ?? 0
  const we = opts.windowEndMin ?? 24 * 60
  const others = blocks
    .filter(b => b.date === date && b.id !== excludeId)
    .map(b => ({ startMin: b.startMin, endMin: b.startMin + b.durationMin }))
  const gaps = freeGaps(others, ws, we)
  for (const g of gaps) {
    if (startMin >= g.startMin && startMin < g.endMin) return g.endMin - startMin
  }
  return 0
}

/**
 * 一键紧凑重排：把某日所有重叠块向右推挤消解冲突（贪心、保序、最小位移）。
 * 返回需要移动的 {id, startMin}；窗口不足以容纳时退化为 clamp（仍可能重叠）。
 * 纯函数，不修改入参；调用方负责并入持久化（见 useTimeBlock.resolveConflictsForDate）。
 */
export function compactDayLayout(
  blocks: TimeBlock[],
  date: string,
  opts: AvoidanceOptions = {},
): { id: string; startMin: number }[] {
  const ws = opts.windowStartMin ?? 0
  const we = opts.windowEndMin ?? 24 * 60
  const day = blocks
    .filter(b => b.date === date)
    .sort((a, b) => a.startMin - b.startMin || a.durationMin - b.durationMin)
  const moves: { id: string; startMin: number }[] = []
  let lastEnd = ws
  for (const b of day) {
    let s = b.startMin
    if (s < lastEnd) s = lastEnd
    if (s + b.durationMin > we) {
      s = Math.max(ws, Math.min(b.startMin, we - b.durationMin))
    }
    if (s !== b.startMin) moves.push({ id: b.id, startMin: s })
    lastEnd = s + b.durationMin
  }
  return moves
}

/**
 * 从某日的 tasks + blocks 构建模板（剥离 id/date，仅保留规划形状）。
 * 纯函数：不读存储、不改入参。
 */
export function buildTemplate(
  name: string,
  tasks: PlannedTask[],
  blocks: TimeBlock[],
): BlockTemplate {
  return {
    id: genId(),
    name: name.trim() || '未命名模板',
    createdAt: new Date().toISOString(),
    tasks: tasks.map(t => ({
      title: t.title,
      category: t.category,
      estimatedMinutes: t.estimatedMinutes,
    })),
    blocks: blocks.map(b => ({
      startMin: b.startMin,
      durationMin: b.durationMin,
      category: b.category,
      title: b.title,
    })),
  }
}

/**
 * 把模板实例化为某目标日的 tasks + blocks（新 id、赋目标 date、done 重置 false）。
 * 纯函数：不读存储、不改入参，返回新建数组，调用方负责并入持久化。
 */
export function instantiateTemplate(
  tpl: BlockTemplate,
  targetDate: string,
): { tasks: PlannedTask[]; blocks: TimeBlock[] } {
  const now = new Date().toISOString()
  const tasks: PlannedTask[] = tpl.tasks.map(t => ({
    id: genId(),
    title: t.title,
    category: t.category,
    estimatedMinutes: t.estimatedMinutes,
    date: targetDate,
    done: false,
    createdAt: now,
  }))
  const blocks: TimeBlock[] = tpl.blocks.map(b => ({
    id: genId(),
    date: targetDate,
    startMin: b.startMin,
    durationMin: b.durationMin,
    category: b.category,
    title: b.title,
    taskId: null,
    done: false,
  }))
  return { tasks, blocks }
}

/**
 * 计划 vs 实际报表的一行（按分类）。
 * 计划 = 当日/当周落在时间轴上的排程时长；实际 = 同日更漏记录（手动专注 + 块完成联动）真实时长。
 * 偏差 deltaMin = 实际 − 计划：负=计划未执行（滑期）、正=超额投入、零=匹配。
 */
export interface PlanActualCategoryRow {
  category: WorkCategory
  /** 计划分钟 */
  plannedMin: number
  /** 实际分钟 */
  actualMin: number
  /** 偏差分钟（实际 − 计划） */
  deltaMin: number
}

/** 计划 vs 实际报表（日 / 周聚合通用） */
export interface PlanActualReport {
  /** 计划总分钟 */
  plannedMin: number
  /** 实际总分钟 */
  actualMin: number
  /** 偏差总分钟（实际 − 计划） */
  deltaMin: number
  /** 已完成块数（标记 done 的排程） */
  doneBlocks: number
  /** 排程总块数 */
  totalBlocks: number
  /** 完成率 0-1（done / total；无排程为 0） */
  completionRate: number
  /** 各分类对照（仅含计划或实际非零的分类） */
  byCategory: PlanActualCategoryRow[]
}

/**
 * 计算计划 vs 实际报表（纯函数，不修改入参）。
 * inScope 决定统计窗口：日模式传 `d => d === date`；周模式传 `d => daysSet.has(d)`。
 * - 计划：inScope 内的时间块，按 category 累计 durationMin。
 * - 实际：inScope 内的更漏记录（按 startedAt 取本地日），按 category 累计 durationSeconds。
 *   块完成联动写入的 'auto' 记录时长等于对应块计划，属「已执行」计入实际；
 *   手动专注会话则带来真实偏差。
 */
export function computePlanActual(
  blocks: TimeBlock[],
  records: WorkRecord[],
  inScope: (date: string) => boolean,
): PlanActualReport {
  const zeroCat = (): Record<WorkCategory, number> => ({ project: 0, daily: 0, study: 0, create: 0, custom: 0 })
  const plannedByCat = zeroCat()
  let plannedSec = 0
  let doneBlocks = 0
  let totalBlocks = 0
  for (const b of blocks) {
    if (!inScope(b.date)) continue
    totalBlocks++
    if (b.done) doneBlocks++
    const sec = b.durationMin * 60
    plannedByCat[b.category] += sec
    plannedSec += sec
  }

  const actualByCat = zeroCat()
  let actualSec = 0
  for (const r of records) {
    const d = localDateKey(new Date(r.startedAt))
    if (!inScope(d)) continue
    actualByCat[r.category] += r.durationSeconds
    actualSec += r.durationSeconds
  }

  const order: WorkCategory[] = ['project', 'daily', 'study', 'create', 'custom']
  const byCategory: PlanActualCategoryRow[] = []
  for (const c of order) {
    if (plannedByCat[c] === 0 && actualByCat[c] === 0) continue
    const pm = Math.round(plannedByCat[c] / 60)
    const am = Math.round(actualByCat[c] / 60)
    byCategory.push({ category: c, plannedMin: pm, actualMin: am, deltaMin: am - pm })
  }

  const plannedMin = Math.round(plannedSec / 60)
  const actualMin = Math.round(actualSec / 60)
  return {
    plannedMin,
    actualMin,
    deltaMin: actualMin - plannedMin,
    doneBlocks,
    totalBlocks,
    completionRate: totalBlocks > 0 ? doneBlocks / totalBlocks : 0,
    byCategory,
  }
}

// ------------------------------------------------------------
// 组合式 API
// ------------------------------------------------------------

export function useTimeBlock() {
  const tasks = ref<PlannedTask[]>(loadTasks())
  const blocks = ref<TimeBlock[]>(loadBlocks())
  const templates = ref<BlockTemplate[]>(loadTemplates())

  function loadTasks(): PlannedTask[] {
    try {
      return storage.getKV<PlannedTask[]>(TASK_STORAGE_KEY, [])
    } catch {
      return []
    }
  }

  function loadBlocks(): TimeBlock[] {
    try {
      return storage.getKV<TimeBlock[]>(BLOCK_STORAGE_KEY, [])
    } catch {
      return []
    }
  }

  function loadTemplates(): BlockTemplate[] {
    try {
      return storage.getKV<BlockTemplate[]>(TEMPLATE_STORAGE_KEY, [])
    } catch {
      return []
    }
  }

  function saveTasks(): void {
    storage.setKV(TASK_STORAGE_KEY, tasks.value)
  }

  function saveBlocks(): void {
    storage.setKV(BLOCK_STORAGE_KEY, blocks.value)
  }

  function saveTemplates(): void {
    storage.setKV(TEMPLATE_STORAGE_KEY, templates.value)
  }

  // ---- 待办 CRUD ----
  function addTask(input: {
    title: string
    category?: WorkCategory
    estimatedMinutes?: number
    date: string
  }): PlannedTask {
    const t: PlannedTask = {
      id: genId(),
      title: input.title.trim(),
      category: input.category ?? 'project',
      estimatedMinutes: Math.max(0, Math.round(input.estimatedMinutes ?? 30)),
      date: input.date,
      done: false,
      createdAt: new Date().toISOString(),
    }
    tasks.value.push(t)
    saveTasks()
    return t
  }

  function updateTask(id: string, patch: Partial<Omit<PlannedTask, 'id' | 'createdAt'>>): void {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    Object.assign(t, patch)
    saveTasks()
  }

  function removeTask(id: string): void {
    tasks.value = tasks.value.filter(t => t.id !== id)
    // 关联块一并移除（避免孤儿块指向已删任务）
    blocks.value = blocks.value.filter(b => b.taskId !== id)
    saveTasks()
    saveBlocks()
  }

  function toggleTask(id: string): void {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    t.done = !t.done
    saveTasks()
  }

  // ---- 时间块 CRUD ----
  function addBlock(input: {
    date: string
    startMin: number
    durationMin: number
    category?: WorkCategory
    title: string
    taskId?: string | null
  }): TimeBlock {
    const b: TimeBlock = {
      id: genId(),
      date: input.date,
      startMin: Math.max(0, Math.round(input.startMin)),
      durationMin: Math.max(5, Math.round(input.durationMin)),
      category: input.category ?? 'project',
      title: input.title.trim(),
      taskId: input.taskId ?? null,
      done: false,
    }
    blocks.value.push(b)
    saveBlocks()
    return b
  }

  function updateBlock(id: string, patch: Partial<Omit<TimeBlock, 'id'>>): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    Object.assign(b, patch)
    saveBlocks()
    // 已完成的块若调整了起止/分类/标题，联动同步更漏工作记录
    if (b.done) syncBlockRecord(b)
  }

  /** 移动块到新起始分钟（保持时长） */
  function moveBlock(id: string, startMin: number): void {
    updateBlock(id, { startMin: Math.max(0, Math.round(startMin)) })
  }

  /** 改变块时长（保持起点，clamp 到 [5, 当日剩余]） */
  function resizeBlock(id: string, durationMin: number): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    const max = 24 * 60 - b.startMin
    const dur = Math.max(5, Math.min(Math.round(durationMin), max))
    updateBlock(id, { durationMin: dur })
  }

  /** 跨天 / 改起点放置块（保持时长，clamp 起点到 [0, 1440-时长]） */
  function setBlockPlacement(id: string, date: string, startMin: number): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    const clampedStart = Math.max(0, Math.min(Math.round(startMin), 24 * 60 - b.durationMin))
    updateBlock(id, { date, startMin: clampedStart })
  }

  function removeBlock(id: string): void {
    blocks.value = blocks.value.filter(b => b.id !== id)
    saveBlocks()
    // 级联移除联动写入的更漏记录，避免孤儿
    unsyncBlockRecord(id)
  }

  function toggleBlock(id: string): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    b.done = !b.done
    saveBlocks()
    // 完成态联动：完成 → 写入更漏工作记录；取消完成 → 移除对应记录
    if (b.done) syncBlockRecord(b)
    else unsyncBlockRecord(b.id)
  }

  // ---- 专注会话绑定（INCR-423）：时间块 ↔ 更漏专注会话 ----
  function startFocusOnBlock(blockId: string): void {
    const b = blocks.value.find(x => x.id === blockId)
    if (!b || b.done) return // 已完成块视作已结算，避免与 auto 代理重复计
    const clepsydra = useClepsydra()
    // 更漏单例仅允许一个进行中会话：已有则不再重复开（避免并行计时）
    if (clepsydra.running.value) return
    clepsydra.startTimer({ category: b.category, note: b.title, blockId })
  }

  function stopFocusOnBlock(blockId: string): void {
    const b = blocks.value.find(x => x.id === blockId)
    if (!b) return
    const clepsydra = useClepsydra()
    const running = clepsydra.running.value
    // 仅当「当前进行中会话正是绑定到该块」时才停，避免误停其他会话
    if (!running || running.blockId !== blockId) return
    clepsydra.stopTimer()
    // 结束后标记完成：因已有真实专注会话，syncBlockRecord 不会再补「计划时长」代理，避免重复计
    if (!b.done) toggleBlock(b.id)
  }

  /** 当前进行中会话所绑定的时间块 id（无进行中会话则 null），供面板派生「专注中」态 */
  const runningBlockId = computed(() => useClepsydra().running.value?.blockId ?? null)

  // ---- 完成态联动：时间块完成 → 写入更漏工作记录（汇入光仪编织） ----
  function linkedRecord(blockId: string): WorkRecord | undefined {
    return useClepsydra().records.value.find(r => r.sourceAnchorId === blockId && r.sourceType === 'auto')
  }

  function syncBlockRecord(b: TimeBlock): void {
    const clepsydra = useClepsydra()
    const input = blockToRecordInput(b)
    const existing = linkedRecord(b.id)
    if (existing) {
      clepsydra.updateRecord(existing.id, {
        startedAt: input.startedAt.toISOString(),
        endedAt: input.endedAt.toISOString(),
        category: input.category,
        intensity: input.intensity,
        note: input.note,
      })
    } else {
      // 若该块已有真实的专注会话记录（blockId 联动、非 auto 代理），以真实时长为实际，
      // 不再补「计划时长」代理，避免重复计（INCR-423 专注会话绑定）。
      const hasRealSession = clepsydra.records.value.some(
        r => r.blockId === b.id && r.sourceType !== 'auto',
      )
      if (hasRealSession) return
      clepsydra.addRecord({ ...input })
    }
  }

  function unsyncBlockRecord(blockId: string): void {
    useClepsydra().removeRecordByAnchor(blockId)
  }

  // ---- 派生：按日期 ----
  function tasksForDate(date: string): PlannedTask[] {
    return tasks.value
      .filter(t => t.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  function blocksForDate(date: string): TimeBlock[] {
    return blocks.value
      .filter(b => b.date === date)
      .sort((a, b) => a.startMin - b.startMin)
  }

  /** 某日未排程且未完成的待办（即自动排程的候选） */
  function unscheduledTasksForDate(date: string): PlannedTask[] {
    const scheduledIds = new Set(
      blocks.value
        .filter(b => b.date === date && b.taskId)
        .map(b => b.taskId as string),
    )
    return tasks.value.filter(t => t.date === date && !t.done && !scheduledIds.has(t.id))
  }

  /**
   * 对指定日期执行轻量自动排程。
   * 返回新增块数量（0 表示无可排程任务或当日已无空隙）。
   */
  function autoScheduleForDate(date: string, opts: AutoScheduleOptions = {}): number {
    const pending = unscheduledTasksForDate(date)
    if (pending.length === 0) return 0
    const newBlocks = autoSchedule(pending, blocks.value, opts)
    if (newBlocks.length > 0) {
      blocks.value.push(...newBlocks)
      saveBlocks()
    }
    return newBlocks.length
  }

  /** 一键紧凑重排消解某日冲突（INCR-421）：把重叠块向右推挤，返回移动块数 */
  function resolveConflictsForDate(date: string, opts: AutoScheduleOptions = {}): number {
    const moves = compactDayLayout(blocks.value, date, {
      windowStartMin: opts.dayStartMin ?? 0,
      windowEndMin: opts.dayEndMin ?? 24 * 60,
    })
    for (const m of moves) updateBlock(m.id, { startMin: m.startMin })
    return moves.length
  }

  // ---- 时间块模板：复用每日规划 ----
  /** 把某日的 tasks + blocks 存为模板（剥离 id/date）。空内容返回 -1。 */
  function saveTemplateFromDate(name: string, date: string): number {
    const tpl = buildTemplate(name, tasksForDate(date), blocksForDate(date))
    if (tpl.tasks.length === 0 && tpl.blocks.length === 0) return -1
    templates.value.push(tpl)
    saveTemplates()
    return templates.value.length
  }

  /** 套用模板到目标日：实例化 tasks + blocks 并并入持久化，返回新增数量 */
  function applyTemplate(id: string, targetDate: string): { tasks: number; blocks: number } {
    const tpl = templates.value.find(t => t.id === id)
    if (!tpl) return { tasks: 0, blocks: 0 }
    const { tasks: newTasks, blocks: newBlocks } = instantiateTemplate(tpl, targetDate)
    if (newTasks.length) {
      tasks.value.push(...newTasks)
      saveTasks()
    }
    if (newBlocks.length) {
      blocks.value.push(...newBlocks)
      saveBlocks()
    }
    return { tasks: newTasks.length, blocks: newBlocks.length }
  }

  /** 删除模板 */
  function removeTemplate(id: string): void {
    templates.value = templates.value.filter(t => t.id !== id)
    saveTemplates()
  }

  // ---- 计划 vs 实际报表（INCR-419） ----
  /** 某日的计划 vs 实际（计划=时间块排程，实际=更漏记录） */
  function planActualForDate(date: string): PlanActualReport {
    const recs = useClepsydra().records.value
    return computePlanActual(blocks.value, recs, d => d === date)
  }

  /** 整周（days 为 7 个 localDateKey）的计划 vs 实际聚合 */
  function planActualForWeek(days: string[]): PlanActualReport {
    const set = new Set(days)
    const recs = useClepsydra().records.value
    return computePlanActual(blocks.value, recs, d => set.has(d))
  }

  return {
    tasks: computed(() => tasks.value),
    blocks: computed(() => blocks.value),
    addTask,
    updateTask,
    removeTask,
    toggleTask,
    addBlock,
    updateBlock,
    moveBlock,
    resizeBlock,
    setBlockPlacement,
    removeBlock,
    toggleBlock,
    startFocusOnBlock,
    stopFocusOnBlock,
    runningBlockId,
    tasksForDate,
    blocksForDate,
    unscheduledTasksForDate,
    autoScheduleForDate,
    resolveConflictsForDate,
    templates: computed(() => templates.value),
    saveTemplateFromDate,
    applyTemplate,
    removeTemplate,
    planActualForDate,
    planActualForWeek,
    localDateKey,
    todayKey,
  }
}
