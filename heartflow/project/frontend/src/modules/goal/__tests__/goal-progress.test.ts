// ============================================================
// goal-progress 里程碑时间线逻辑测试
// 覆盖：时间线创建 / 里程碑添加 / 标记达成错过 / 进度统计 / 即将到期与逾期
// ============================================================
import { describe, expect, it, vi, afterEach } from 'vitest'
import { PROGRESS_STORAGE_KEYS } from '../goal-progress'

function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
    dump: () => store,
  }
}

async function fresh() {
  const storage = createMockStorage()
  ;(globalThis as any).localStorage = storage
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  const mod = await import('../goal-progress')
  const api = mod.useMilestoneTimeline()
  api.loadTimelines()
  return { api, storage, mod }
}

describe('useMilestoneTimeline 里程碑时间线', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('createTimeline 创建时间线并持久化', async () => {
    const { api, storage } = await fresh()
    api.createTimeline('g1', '完成书稿之路')
    expect(api.timelines.value).toHaveLength(1)
    expect(api.timelines.value[0].goalId).toBe('g1')
    expect(api.timelines.value[0].milestones).toEqual([])
    const saved = JSON.parse(storage.dump()['heartflow:storage'])
    expect(saved.kvStore[PROGRESS_STORAGE_KEYS.MILESTONES]).toHaveLength(1)
    expect(saved.kvStore[PROGRESS_STORAGE_KEYS.MILESTONES][0].title).toBe('完成书稿之路')
  })

  it('addMilestone 添加里程碑（默认 checkpoint）', async () => {
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    const ms = api.addMilestone('g1', '完成初稿', '2026-09-01')
    expect(ms).not.toBeNull()
    expect(ms!.status).toBe('pending')
    expect(ms!.type).toBe('checkpoint')
    expect(api.getTimeline('g1')!.milestones).toHaveLength(1)
  })

  it('addMilestone 支持自定义类型与描述', async () => {
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    const ms = api.addMilestone('g1', '出版', '2026-12-01', 'completion', '正式出版')
    expect(ms!.type).toBe('completion')
    expect(ms!.description).toBe('正式出版')
  })

  it('addMilestone 目标无时间线时返回 null', async () => {
    const { api } = await fresh()
    expect(api.addMilestone('g_missing', '里程碑', '2026-09-01')).toBeNull()
  })

  it('markAchieved / markMissed 切换状态', async () => {
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    const ms = api.addMilestone('g1', '初稿', '2026-09-01')!
    expect(api.markAchieved('g1', ms.id)).toBe(true)
    expect(api.getTimeline('g1')!.milestones[0].status).toBe('achieved')
    expect(api.markMissed('g1', ms.id)).toBe(true)
    expect(api.getTimeline('g1')!.milestones[0].status).toBe('missed')
  })

  it('markAchieved 对不存在的时间线/里程碑返回 false', async () => {
    const { api } = await fresh()
    expect(api.markAchieved('g_missing', 'ms_x')).toBe(false)
    api.createTimeline('g1', '时间线')
    expect(api.markAchieved('g1', 'ms_x')).toBe(false)
  })

  it('computeMilestoneProgress 统计达成率', async () => {
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    const a = api.addMilestone('g1', 'A', '2026-09-01')!
    const b = api.addMilestone('g1', 'B', '2026-09-10')!
    const c = api.addMilestone('g1', 'C', '2026-09-20')!
    api.markAchieved('g1', a.id)
    api.markMissed('g1', b.id)
    const stats = api.computeMilestoneProgress('g1')
    expect(stats.total).toBe(3)
    expect(stats.achieved).toBe(1)
    expect(stats.missed).toBe(1)
    expect(stats.pending).toBe(1)
    expect(stats.progress).toBeCloseTo(1 / 3)
    void c
  })

  it('computeMilestoneProgress 无时间线/空时间线返回零', async () => {
    const { api } = await fresh()
    expect(api.computeMilestoneProgress('g_missing')).toEqual({ total: 0, achieved: 0, missed: 0, pending: 0, progress: 0 })
    api.createTimeline('g1', '空时间线')
    expect(api.computeMilestoneProgress('g1')).toEqual({ total: 0, achieved: 0, missed: 0, pending: 0, progress: 0 })
  })

  it('getUpcomingMilestones 返回 7 天内待办并按日期排序', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'))
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    api.addMilestone('g1', '三天后', '2026-08-18')
    api.addMilestone('g1', '十天后', '2026-08-25')
    api.addMilestone('g1', '昨天', '2026-08-14')
    const upcoming = api.getUpcomingMilestones('g1', 7)
    expect(upcoming.map(m => m.label)).toEqual(['三天后'])
  })

  it('getUpcomingMilestones 排除已达成与已错过', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'))
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    const done = api.addMilestone('g1', '已达成', '2026-08-18')!
    const missed = api.addMilestone('g1', '已错过', '2026-08-19')!
    api.markAchieved('g1', done.id)
    api.markMissed('g1', missed.id)
    expect(api.getUpcomingMilestones('g1', 7)).toEqual([])
  })

  it('getOverdueMilestones 返回已过期的待办', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'))
    const { api } = await fresh()
    api.createTimeline('g1', '时间线')
    api.addMilestone('g1', '已过期', '2026-08-10')
    api.addMilestone('g1', '未过期', '2026-08-20')
    const overdue = api.getOverdueMilestones('g1')
    expect(overdue.map(m => m.label)).toEqual(['已过期'])
  })

  it('loadTimelines 从存储恢复已有时间线', async () => {
    const { api, storage } = await fresh()
    api.createTimeline('g1', '时间线')
    api.addMilestone('g1', '里程碑', '2026-09-01')
    // 重新实例化（模拟重新加载）
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    const mod = await import('../goal-progress')
    const api2 = mod.useMilestoneTimeline()
    api2.loadTimelines()
    expect(api2.timelines.value).toHaveLength(1)
    expect(api2.timelines.value[0].milestones).toHaveLength(1)
    void storage
  })
})
