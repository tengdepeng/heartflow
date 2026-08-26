// ============================================================
// 自律工坊 · 四象限测试
// ============================================================
import { describe, expect, it } from 'vitest'
import { computeQuadrant, quadrantOrder, bucketByQuadrant, todayTasksByQuadrant } from '../quadrant'
import type { Task } from '../task'

function mk(partial: Partial<Task> & { id: string }): Task {
  return {
    title: partial.title || '任务',
    urgency: partial.urgency ?? false,
    importance: partial.importance ?? false,
    status: partial.status ?? 'todo',
    focusCount: partial.focusCount ?? 0,
    createdAt: partial.createdAt || '2026-01-01T00:00:00Z',
    ...partial,
  }
}

describe('computeQuadrant', () => {
  it('重要且紧急 → Q1', () => {
    expect(computeQuadrant(true, true)).toBe('q1')
  })
  it('重要不紧急 → Q2', () => {
    expect(computeQuadrant(false, true)).toBe('q2')
  })
  it('不重要但紧急 → Q3', () => {
    expect(computeQuadrant(true, false)).toBe('q3')
  })
  it('不重要不紧急 → Q4', () => {
    expect(computeQuadrant(false, false)).toBe('q4')
  })
})

describe('quadrantOrder', () => {
  it('返回处理优先级 01', () => {
    expect(quadrantOrder('q1')).toBe(1)
    expect(quadrantOrder('q4')).toBe(4)
  })
})

describe('bucketByQuadrant', () => {
  it('按两轴正确分桶', () => {
    const tasks: Task[] = [
      mk({ id: 'a', urgency: true, importance: true }),
      mk({ id: 'b', urgency: false, importance: true }),
      mk({ id: 'c', urgency: true, importance: false }),
      mk({ id: 'd', urgency: false, importance: false }),
    ]
    const buckets = bucketByQuadrant(tasks)
    expect(buckets.q1.map(t => t.id)).toEqual(['a'])
    expect(buckets.q2.map(t => t.id)).toEqual(['b'])
    expect(buckets.q3.map(t => t.id)).toEqual(['c'])
    expect(buckets.q4.map(t => t.id)).toEqual(['d'])
  })

  it('同象限按创建时间升序', () => {
    const tasks: Task[] = [
      mk({ id: 'late', urgency: true, importance: true, createdAt: '2026-02-01T00:00:00Z' }),
      mk({ id: 'early', urgency: true, importance: true, createdAt: '2026-01-01T00:00:00Z' }),
    ]
    const buckets = bucketByQuadrant(tasks)
    expect(buckets.q1.map(t => t.id)).toEqual(['early', 'late'])
  })
})

describe('todayTasksByQuadrant', () => {
  it('过滤已完成任务，按象限与时间排序', () => {
    const tasks: Task[] = [
      mk({ id: 'q4', urgency: false, importance: false }),
      mk({ id: 'q1', urgency: true, importance: true }),
      mk({ id: 'done', urgency: true, importance: true, status: 'done', completedAt: '2026-01-03T00:00:00Z' }),
    ]
    const result = todayTasksByQuadrant(tasks, '2026-01-03')
    expect(result.map(t => t.id)).toEqual(['q1', 'q4'])
  })
})