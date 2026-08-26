// ============================================================
// 自律工坊 · 任务管理（P9-1）
// 吸收滴答清单 / Todoist / Things 3 / Sorted：
// - 任务实体（含 紧急×重要 两轴四象限分组）
// - 专注计时与任务绑定（focusCount / lastFocusAt 回填）
// - 数据本地私有（宪法第1条）
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export type TaskStatus = 'todo' | 'doing' | 'done'

/** 四象限：Q1 重要且紧急 / Q2 重要不紧急 / Q3 不重要但紧急 / Q4 不重要不紧急 */
export type TaskQuadrant = 'q1' | 'q2' | 'q3' | 'q4'

export interface Task {
  id: string
  title: string
  detail?: string
  /** 是否紧急 */
  urgency: boolean
  /** 是否重要 */
  importance: boolean
  status: TaskStatus
  /** 已完成的关联专注次数（计时会话回填） */
  focusCount: number
  /** 最近一次专注完成时间 */
  lastFocusAt?: string
  /** 到期日（YYYY-MM-DD），用于 deadline 倒计时/排序（P9 滴答/Things 3） */
  dueDate?: string
  /** 子任务 id 列表（P9 子任务层级关联） */
  children?: string[]
  /** 手动排序权重（越小越靠前；未设置时回退自动排序） */
  order?: number
  createdAt: string
  completedAt?: string
}

export interface NewTaskInput {
  title: string
  detail?: string
  urgency?: boolean
  importance?: boolean
  status?: TaskStatus
  dueDate?: string
  order?: number
}

const TASKS_KEY = 'hf:tasks'

// 模块级单例：视图与模块共享同一份任务列表
const tasks = ref<Task[]>([])

/**
 * 任务管理器：任务的增删改查 + 专注回填
 */
export function useTaskManager() {
  function load(): void {
    try {
      tasks.value = storage.getKV<Task[]>(TASKS_KEY, []) || []
    } catch {
      tasks.value = []
    }
  }

  function save(): void {
    storage.setKV(TASKS_KEY, tasks.value)
  }

  function addTask(input: NewTaskInput): Task {
    const task: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: input.title.trim(),
      detail: input.detail?.trim(),
      urgency: input.urgency ?? false,
      importance: input.importance ?? true,
      status: input.status ?? 'todo',
      focusCount: 0,
      dueDate: input.dueDate,
      order: input.order,
      createdAt: new Date().toISOString(),
    }
    tasks.value.push(task)
    save()
    return task
  }

  function updateTask(
    id: string,
    fields: Partial<Pick<Task, 'title' | 'detail' | 'urgency' | 'importance' | 'status' | 'dueDate' | 'children' | 'order'>>,
  ): Task | undefined {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    if (fields.title !== undefined) t.title = fields.title.trim()
    if (fields.detail !== undefined) t.detail = fields.detail?.trim()
    if (fields.urgency !== undefined) t.urgency = fields.urgency
    if (fields.importance !== undefined) t.importance = fields.importance
    if (fields.status !== undefined) {
      t.status = fields.status
      if (fields.status === 'done') t.completedAt = new Date().toISOString()
    }
    if ('dueDate' in fields) t.dueDate = fields.dueDate || undefined
    if (fields.children !== undefined) t.children = fields.children
    if (fields.order !== undefined) t.order = fields.order
    save()
    return t
  }

  /** 新增子任务并关联到父任务（P9 子任务层级） */
  function addSubtask(parentId: string, input: NewTaskInput): Task | undefined {
    const parent = tasks.value.find(x => x.id === parentId)
    if (!parent) return
    const child = addTask(input)
    parent.children = [...(parent.children ?? []), child.id]
    save()
    return child
  }

  /** 父任务下的已展开子任务列表 */
  function subTasksOf(parentId: string): Task[] {
    const parent = tasks.value.find(x => x.id === parentId)
    const ids = parent?.children ?? []
    return ids
      .map(id => tasks.value.find(x => x.id === id))
      .filter((x): x is Task => Boolean(x))
  }

  /** 按 id 顺序重排（P9 手动拖拽排序） */
  function reorder(orderedIds: string[]): void {
    const indexById = new Map(orderedIds.map((id, i) => [id, i]))
    for (const t of tasks.value) {
      if (!indexById.has(t.id)) continue
      t.order = indexById.get(t.id) ?? t.order
    }
    save()
  }

  function removeTask(id: string): void {
    tasks.value = tasks.value.filter(t => t.id !== id)
    save()
  }

  /** 状态翻转：todo → doing → done → todo */
  function toggleStatus(id: string): Task | undefined {
    const t = tasks.value.find(x => x.id === id)
    if (!t) return
    const next: TaskStatus = t.status === 'done' ? 'todo' : t.status === 'doing' ? 'done' : 'doing'
    return updateTask(id, { status: next })
  }

  /** 专注会话完成后回填：focusCount + lastFocusAt */
  function recordFocus(taskId: string): Task | null {
    const t = tasks.value.find(x => x.id === taskId)
    if (!t) return null
    t.focusCount += 1
    t.lastFocusAt = new Date().toISOString()
    save()
    return t
  }

  function getTask(id: string): Task | undefined {
    return tasks.value.find(x => x.id === id)
  }

  return {
    tasks,
    load,
    save,
    addTask,
    addSubtask,
    subTasksOf,
    reorder,
    updateTask,
    removeTask,
    toggleStatus,
    recordFocus,
    getTask,
  }
}

// ------------------------------------------------------------
// 到期日辅助（纯函数，可单测）
// ------------------------------------------------------------

export type DueStatus = 'overdue' | 'today' | 'soon' | 'upcoming' | 'none'

/** 由到期日给出状态标签（用于 deadline 倒计时/排序） */
export function dueMeta(task: Pick<Task, 'dueDate'>, now = new Date()): { status: DueStatus; label: string; daysLeft: number } {
  const due = task.dueDate
  if (!due) return { status: 'none', label: '无期限', daysLeft: Number.POSITIVE_INFINITY }
  // 统一按本地 0 点对齐，避免跨小时误判
  const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(due + 'T00:00:00')
  const daysLeft = Math.round((target.getTime() - ref.getTime()) / 86400000)
  if (daysLeft < 0) return { status: 'overdue', label: `逾期 ${-daysLeft} 天`, daysLeft }
  if (daysLeft === 0) return { status: 'today', label: '今日到期', daysLeft }
  if (daysLeft <= 3) return { status: 'soon', label: `${daysLeft} 天后到期`, daysLeft }
  return { status: 'upcoming', label: `${daysLeft} 天后到期`, daysLeft }
}

/** 到期日优先的任务排序比较器：先按时限，后按手动 order。 */
export function byDueThenOrder(a: Task, b: Task): number {
  const ha = dueMeta(a)
  const hb = dueMeta(b)
  const aOver = ha.daysLeft === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : ha.daysLeft - 100000
  const bOver = hb.daysLeft === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : hb.daysLeft - 100000
  if (aOver !== bOver) return aOver - bOver
  const ao = a.order ?? Number.POSITIVE_INFINITY
  const bo = b.order ?? Number.POSITIVE_INFINITY
  if (ao !== bo) return ao - bo
  return a.createdAt.localeCompare(b.createdAt)
}