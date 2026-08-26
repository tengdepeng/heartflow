// ============================================================
// 自律工坊 · 任务实体测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useTaskManager, dueMeta, byDueThenOrder } from '../task'

describe('task manager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('初始状态任务为空', () => {
    const m = useTaskManager()
    m.load()
    expect(m.tasks.value).toEqual([])
  })

  it('addTask 创建任务并持久化', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '晨读 30 分钟', importance: true })
    expect(m.tasks.value).toHaveLength(1)
    expect(t.title).toBe('晨读 30 分钟')
    expect(t.importance).toBe(true)
    expect(t.urgency).toBe(false)
    expect(t.status).toBe('todo')
    expect(t.focusCount).toBe(0)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('updateTask 更新四象限与状态', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '写周报' })
    m.updateTask(t.id, { urgency: true, importance: true })
    expect(m.tasks.value[0].urgency).toBe(true)
    expect(m.tasks.value[0].importance).toBe(true)
  })

  it('toggleStatus 循环 todo→doing→done', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '整理文档' })
    m.toggleStatus(t.id)
    expect(m.tasks.value[0].status).toBe('doing')
    m.toggleStatus(t.id)
    expect(m.tasks.value[0].status).toBe('done')
    expect(m.tasks.value[0].completedAt).toBeTruthy()
    m.toggleStatus(t.id)
    expect(m.tasks.value[0].status).toBe('todo')
  })

  it('removeTask 删除任务', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '临时任务' })
    m.removeTask(t.id)
    expect(m.tasks.value).toHaveLength(0)
  })

  it('recordFocus 回填专注次数与时间', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '深度工作' })
    const before = new Date()
    m.recordFocus(t.id)
    const updated = m.tasks.value[0]
    expect(updated.focusCount).toBe(1)
    expect(updated.lastFocusAt).toBeTruthy()
    expect(new Date(updated.lastFocusAt as string).getTime()).toBeGreaterThanOrEqual(before.getTime())
  })

  it('recordFocus 对不存在的任务返回 null', () => {
    const m = useTaskManager()
    m.load()
    expect(m.recordFocus('nope')).toBeNull()
  })

  it('getTask 支持按 id 查询', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '专注阅读' })
    expect(m.getTask(t.id)?.title).toBe('专注阅读')
    expect(m.getTask('missing')).toBeUndefined()
  })

  it('addTask 支持设定到期日与手动排序', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '提交方案', dueDate: '2026-08-25', order: 3 })
    expect(t.dueDate).toBe('2026-08-25')
    expect(t.order).toBe(3)
  })

  it('addSubtask 关联子任务到父级', () => {
    const m = useTaskManager()
    m.load()
    const parent = m.addTask({ title: '筹备发布会', dueDate: '2026-09-01' })
    const child = m.addSubtask(parent.id, { title: '预订场地' })
    expect(child).toBeTruthy()
    if (!child) return
    expect(m.tasks.value).toHaveLength(2)
    expect(m.getTask(parent.id)?.children).toContain(child.id)
    const subs = m.subTasksOf(parent.id)
    expect(subs.map(s => s.title)).toEqual(['预订场地'])
  })

  it('reorder 按传入 id 顺序写入 order 字段', () => {
    const m = useTaskManager()
    m.load()
    const a = m.addTask({ title: '甲' })
    const b = m.addTask({ title: '乙' })
    m.reorder([b.id, a.id])
    expect(m.getTask(b.id)?.order).toBe(0)
    expect(m.getTask(a.id)?.order).toBe(1)
  })

  it('updateTask 可清空到期日', () => {
    const m = useTaskManager()
    m.load()
    const t = m.addTask({ title: '任务', dueDate: '2026-08-25' })
    m.updateTask(t.id, { dueDate: undefined })
    expect(m.tasks.value[0].dueDate).toBeUndefined()
  })
})

describe('dueMeta / byDueThenOrder', () => {
  it('无到期日返回 none 与无穷天数', () => {
    const meta = dueMeta({}, new Date('2026-08-21T12:00:00'))
    expect(meta.status).toBe('none')
    expect(meta.daysLeft).toBe(Number.POSITIVE_INFINITY)
  })

  it('到期日今天判定 today', () => {
    const meta = dueMeta({ dueDate: '2026-08-21' }, new Date('2026-08-21T12:00:00'))
    expect(meta.status).toBe('today')
    expect(meta.daysLeft).toBe(0)
  })

  it('已过期判定 overdue', () => {
    const meta = dueMeta({ dueDate: '2026-08-10' }, new Date('2026-08-21T00:00:00'))
    expect(meta.status).toBe('overdue')
    expect(meta.label).toContain('逾期')
  })

  it('排序：有过期日优先于无期限', () => {
    const a = { id: 'a', title: '无期限', urgency: false, importance: true, status: 'todo' as const, focusCount: 0, createdAt: '2026-08-01T00:00:00Z' }
    const b = { id: 'b', title: '三天后', urgency: false, importance: true, status: 'todo' as const, focusCount: 0, dueDate: '2026-08-24', createdAt: '2026-08-02T00:00:00Z' }
    expect(byDueThenOrder(a as any, b as any)).toBeGreaterThan(0)
  })
})