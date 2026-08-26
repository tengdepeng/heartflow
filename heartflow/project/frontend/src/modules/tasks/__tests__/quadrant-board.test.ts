// ============================================================
// 四象限看板 · 测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type { Task } from '../task'
import {
  buildQuadrantBoard,
  computeQuadrantStats,
  rankTask,
  boardSummary,
} from '../quadrant-board'

function makeTask(overrides: Partial<Task> & { id: string }): Task {
  return {
    title: '任务',
    urgency: false,
    importance: true,
    status: 'todo',
    focusCount: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('rankTask', () => {
  it('进行中任务排在待办之前', () => {
    const doing = makeTask({ id: 'a', status: 'doing' })
    const todo = makeTask({ id: 'b', status: 'todo' })
    expect(rankTask(doing, todo)).toBeLessThan(0)
  })

  it('已完成任务排在最后', () => {
    const done = makeTask({ id: 'a', status: 'done' })
    const doing = makeTask({ id: 'b', status: 'doing' })
    expect(rankTask(done, doing)).toBeGreaterThan(0)
    expect(rankTask(done, makeTask({ id: 'c', status: 'todo' }))).toBeGreaterThan(0)
  })

  it('同状态专注次数多者靠前', () => {
    const more = makeTask({ id: 'a', status: 'doing', focusCount: 3 })
    const less = makeTask({ id: 'b', status: 'doing', focusCount: 1 })
    expect(rankTask(more, less)).toBeLessThan(0)
  })

  it('同状态同专注按创建时间升序', () => {
    const early = makeTask({ id: 'a', createdAt: '2026-01-01T00:00:00.000Z' })
    const late = makeTask({ id: 'b', createdAt: '2026-02-01T00:00:00.000Z' })
    expect(rankTask(early, late)).toBeLessThan(0)
  })
})

describe('computeQuadrantStats', () => {
  it('统计总数 / 进行中 / 已完成 / 完成率 / 专注', () => {
    const tasks = [
      makeTask({ id: 'a', status: 'done', focusCount: 2 }),
      makeTask({ id: 'b', status: 'doing', focusCount: 1 }),
      makeTask({ id: 'c', status: 'todo' }),
    ]
    const stats = computeQuadrantStats(tasks)
    expect(stats.total).toBe(3)
    expect(stats.active).toBe(2)
    expect(stats.done).toBe(1)
    expect(stats.completionRate).toBeCloseTo(1 / 3)
    expect(stats.totalFocus).toBe(3)
  })

  it('空列表完成率为 0', () => {
    expect(computeQuadrantStats([]).completionRate).toBe(0)
  })
})

describe('buildQuadrantBoard', () => {
  it('包含四个象限列且顺序为 q1→q4', () => {
    const board = buildQuadrantBoard([])
    expect(board.map(c => c.quadrant)).toEqual(['q1', 'q2', 'q3', 'q4'])
  })

  it('任务归入正确象限', () => {
    const tasks = [
      makeTask({ id: 'q1', urgency: true, importance: true }),
      makeTask({ id: 'q2', urgency: false, importance: true }),
      makeTask({ id: 'q3', urgency: true, importance: false }),
      makeTask({ id: 'q4', urgency: false, importance: false }),
    ]
    const board = buildQuadrantBoard(tasks)
    expect(board.find(c => c.quadrant === 'q1')!.tasks.map(t => t.id)).toEqual(['q1'])
    expect(board.find(c => c.quadrant === 'q2')!.tasks.map(t => t.id)).toEqual(['q2'])
    expect(board.find(c => c.quadrant === 'q3')!.tasks.map(t => t.id)).toEqual(['q3'])
    expect(board.find(c => c.quadrant === 'q4')!.tasks.map(t => t.id)).toEqual(['q4'])
  })

  it('列内进行中任务靠前', () => {
    const tasks = [
      makeTask({ id: 'todo1', urgency: true, importance: true, status: 'todo' }),
      makeTask({ id: 'doing1', urgency: true, importance: true, status: 'doing', focusCount: 5 }),
    ]
    const col = buildQuadrantBoard(tasks)[0]
    expect(col.tasks[0].id).toBe('doing1')
    expect(col.tasks[1].id).toBe('todo1')
  })

  it('每列携带颜色与标签', () => {
    const board = buildQuadrantBoard([])
    expect(board[0].label.length).toBeGreaterThan(0)
    expect(board[0].color).toMatch(/^#/)
  })
})

describe('boardSummary', () => {
  it('汇总各列任务数', () => {
    const tasks = [
      makeTask({ id: 'a', urgency: true, importance: true }),
      makeTask({ id: 'b', urgency: true, importance: true }),
      makeTask({ id: 'c', urgency: false, importance: false }),
    ]
    const summary = boardSummary(buildQuadrantBoard(tasks))
    expect(summary.q1).toBe(2)
    expect(summary.q4).toBe(1)
    expect(summary.q2).toBe(0)
  })
})