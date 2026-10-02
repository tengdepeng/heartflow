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
import type { WorkCategory } from './clepsydra'
import { genId } from './clepsydra'

// ------------------------------------------------------------
// 持久化键
// ------------------------------------------------------------

export const TASK_STORAGE_KEY = 'hf:clepsydra_plan_tasks'
export const BLOCK_STORAGE_KEY = 'hf:clepsydra_time_blocks'

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

// ------------------------------------------------------------
// 组合式 API
// ------------------------------------------------------------

export function useTimeBlock() {
  const tasks = ref<PlannedTask[]>(loadTasks())
  const blocks = ref<TimeBlock[]>(loadBlocks())

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

  function saveTasks(): void {
    storage.setKV(TASK_STORAGE_KEY, tasks.value)
  }

  function saveBlocks(): void {
    storage.setKV(BLOCK_STORAGE_KEY, blocks.value)
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

  function updateBlock(id: string, patch: Partial<Omit<TimeBlock, 'id' | 'date'>>): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    Object.assign(b, patch)
    saveBlocks()
  }

  /** 移动块到新起始分钟（保持时长） */
  function moveBlock(id: string, startMin: number): void {
    updateBlock(id, { startMin: Math.max(0, Math.round(startMin)) })
  }

  function removeBlock(id: string): void {
    blocks.value = blocks.value.filter(b => b.id !== id)
    saveBlocks()
  }

  function toggleBlock(id: string): void {
    const b = blocks.value.find(x => x.id === id)
    if (!b) return
    b.done = !b.done
    saveBlocks()
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
    removeBlock,
    toggleBlock,
    tasksForDate,
    blocksForDate,
    unscheduledTasksForDate,
    autoScheduleForDate,
    localDateKey,
    todayKey,
  }
}
