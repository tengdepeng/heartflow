// ============================================================
// 时间线索引 · 测试
// 模式：vi.resetModules() + createMockStorage + invalidateCache + freshModule
// ============================================================
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'

// ---- mock 辅助 ----
function createMockStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
}

let mockLocalStorage: ReturnType<typeof createMockStorage>

afterEach(() => {
  delete (globalThis as any).localStorage
})

// ============================================================
// 权重计算测试
// calcWeight 是纯函数，无需模块隔离
// ============================================================
describe('权重计算', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('锚点 must 基准权重为 1.0', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'anchor',
      anchorType: 'must',
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(1.0)
  })

  it('锚点 optional 基准权重为 0.7', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'anchor',
      anchorType: 'optional',
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(0.7)
  })

  it('锚点 floating 基准权重为 0.4', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'anchor',
      anchorType: 'floating',
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(0.4)
  })

  it('情绪权重等于 intensity', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'emotion',
      intensity: 0.8,
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(0.8)
  })

  it('情绪 intensity 上限为 1.0', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'emotion',
      intensity: 1.5,
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(1.0)
  })

  it('结晶权重为 min(1.0, duration/120)', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'crystal',
      durationMinutes: 60,
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(0.5)
  })

  it('结晶 duration 超过 120 分钟时权重上限为 1.0', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'crystal',
      durationMinutes: 240,
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(1.0)
  })

  it('笔记默认权重为 0.7', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'note',
      createdAt: new Date().toISOString(),
    })
    expect(w).toBe(0.7)
  })

  it('时间衰减：30天内的数据无衰减', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'note',
      createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    })
    expect(w).toBeCloseTo(0.7, 1)
  })

  it('时间衰减：30~90天衰减到 0.95~0.85', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'note',
      createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    })
    expect(w).toBeCloseTo(0.63, 1)
  })

  it('老化乘数：ageLevel 1 为 0.8', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'note',
      createdAt: new Date().toISOString(),
      ageLevel: 1,
    })
    expect(w).toBeCloseTo(0.56, 1)
  })

  it('老化乘数：ageLevel 5 为 0.1', async () => {
    const { calcWeight } = await import('../index')
    const w = calcWeight({
      entryType: 'note',
      createdAt: new Date().toISOString(),
      ageLevel: 5,
    })
    expect(w).toBeCloseTo(0.07, 2)
  })
})

// ============================================================
// 写操作测试
// 每个 describe 块独立隔离
// ============================================================
describe('写操作', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('add 新增一条索引条目', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({
      type: 'note',
      roomSource: 'study',
      payloadRef: 'note_001',
      summary: { snippet: '测试笔记' },
    })

    expect(entry).not.toBeNull()
    expect(entry!.type).toBe('note')
    expect(entry!.roomSource).toBe('study')
    expect(entry!.payloadRef).toBe('note_001')
    expect(entry!.summary.snippet).toBe('测试笔记')
    expect(entry!.indexId).toBeTruthy()
    expect(entry!.weight).toBeGreaterThan(0)
  })

  it('add 多条条目后按时间戳有序', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'old',
      summary: { snippet: '旧笔记' },
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    })
    idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'mid',
      summary: { snippet: '中间笔记' },
      timestamp: new Date(Date.now() - 43200000).toISOString(),
    })
    idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'recent',
      summary: { snippet: '新笔记' },
    })

    const result = idx.queryByTime({ limit: 10 })
    expect(result.entries).toHaveLength(3)
    expect(result.entries[0].payloadRef).toBe('recent')
    expect(result.entries[1].payloadRef).toBe('mid')
    expect(result.entries[2].payloadRef).toBe('old')
  })

  it('update 更新条目字段', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'note_001',
      summary: { snippet: '原始' },
    })

    expect(idx.update(entry!.indexId, { summary: { snippet: '更新后的摘要' } })).toBe(true)

    const fetched = idx.queryById(entry!.indexId)
    expect(fetched).toBeDefined()
    expect(fetched!.summary.snippet).toBe('更新后的摘要')
  })

  it('update 不存在的条目返回 false', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    expect(idx.update('nonexistent', { summary: { snippet: 'test' } })).toBe(false)
  })

  it('remove 删除条目', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'note_001',
      summary: { snippet: '待删除' },
    })
    expect(idx.remove(entry!.indexId)).toBe(true)
    expect(idx.queryById(entry!.indexId)).toBeUndefined()
  })

  it('remove 不存在的条目返回 false', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    expect(idx.remove('nonexistent')).toBe(false)
  })

  it('updateGovernance 更新治理状态', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({
      type: 'note', roomSource: 'study', payloadRef: 'note_001',
      summary: { snippet: '治理测试' },
    })
    const result = idx.updateGovernance(entry!.indexId, { archived: true, archivedAt: new Date().toISOString() })
    expect(result).toBe(true)

    const fetched = idx.queryById(entry!.indexId)
    expect(fetched!.governance.archived).toBe(true)
    expect(fetched!.governance.archivedAt).toBeTruthy()
  })
})

// ============================================================
// 查询操作测试
// ============================================================
describe('查询操作', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('queryByTime 按时间范围查询', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记1' }, timestamp: new Date(Date.now() - 86400000 * 3).toISOString() })
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n2', summary: { snippet: '笔记2' }, timestamp: new Date(Date.now() - 86400000 * 2).toISOString() })
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n3', summary: { snippet: '笔记3' }, timestamp: new Date(Date.now() - 86400000).toISOString() })

    const start = new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10)
    const end = new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10)
    const result = idx.queryByTime({ startDate: start, endDate: end })
    expect(result.entries.length).toBeGreaterThanOrEqual(2)
    expect(result.shardsScanned).toBeGreaterThanOrEqual(2)
  })

  it('queryByTime 按类型过滤', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记' } })
    idx.add({ type: 'emotion', roomSource: 'emotion', payloadRef: 'e1', summary: { snippet: '开心' } })
    idx.add({ type: 'anchor', roomSource: 'anchor', payloadRef: 'a1', summary: { snippet: '锚点' } })

    const result = idx.queryByTime({ types: ['note', 'emotion'], limit: 10 })
    expect(result.entries).toHaveLength(2)
  })

  it('queryByTime 按最小权重过滤', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记' } })
    idx.add({ type: 'anchor', roomSource: 'anchor', payloadRef: 'a1', summary: { snippet: '锚点' }, weightParams: { anchorType: 'must' } })

    const result = idx.queryByTime({ minWeight: 0.8, limit: 10 })
    expect(result.entries.every((e: any) => e.weight >= 0.8)).toBe(true)
  })

  it('queryByTime 分页', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    for (let i = 0; i < 5; i++) {
      idx.add({ type: 'note', roomSource: 'study', payloadRef: `n${i}`, summary: { snippet: `笔记${i}` } })
    }

    const page1 = idx.queryByTime({ limit: 2, offset: 0 })
    expect(page1.entries).toHaveLength(2)
    expect(page1.hasMore).toBe(true)
    expect(page1.total).toBe(5)

    const page3 = idx.queryByTime({ limit: 2, offset: 4 })
    expect(page3.entries).toHaveLength(1)
    expect(page3.hasMore).toBe(false)
  })

  it('queryByTime 治理状态过滤', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '正常' } })
    const e2 = idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n2', summary: { snippet: '已归档' } })
    idx.updateGovernance(e2!.indexId, { archived: true, archivedAt: new Date().toISOString() })

    const active = idx.queryByTime({ governanceStatus: 'active', limit: 10 })
    expect(active.entries).toHaveLength(1)
    expect(active.entries[0].payloadRef).toBe('n1')

    const archived = idx.queryByTime({ governanceStatus: 'archived', limit: 10 })
    expect(archived.entries).toHaveLength(1)
    expect(archived.entries[0].payloadRef).toBe('n2')
  })

  it('queryByGovernance 查询归档条目', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '正常' } })
    const e2 = idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n2', summary: { snippet: '已归档' } })
    idx.updateGovernance(e2!.indexId, { archived: true, archivedAt: new Date().toISOString() })

    const archived = idx.queryByGovernance('archived')
    expect(archived).toHaveLength(1)
    expect(archived[0].payloadRef).toBe('n2')
  })
})

// ============================================================
// 统计与维护测试
// ============================================================
describe('统计与维护', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('getStats 返回正确的统计信息', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记1' } })
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n2', summary: { snippet: '笔记2' } })
    idx.add({ type: 'emotion', roomSource: 'emotion', payloadRef: 'e1', summary: { snippet: '开心' } })

    const stats = idx.getStats()
    expect(stats.totalEntries).toBe(3)
    expect(stats.shardCount).toBeGreaterThanOrEqual(1)
    expect(stats.typeDistribution.note).toBe(2)
    expect(stats.typeDistribution.emotion).toBe(1)
    expect(stats.governanceDistribution.active).toBe(3)
  })

  it('getCacheStats 返回缓存信息', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '测试' } })
    const cache = idx.getCacheStats()
    expect(cache.cachedShards).toBeGreaterThanOrEqual(1)
    expect(cache.maxCacheSize).toBeGreaterThan(0)
  })

  it('rebuildSecondaryIndex 重建二级索引', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记1' } })
    idx.add({ type: 'emotion', roomSource: 'emotion', payloadRef: 'e1', summary: { snippet: '开心' } })

    const result = idx.rebuildSecondaryIndex()
    expect(result).toBe(true)

    const stats = idx.getStats()
    expect(stats.totalEntries).toBe(2)
  })

  it('clearCache 清空缓存', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '测试' } })
    const before = idx.getCacheStats()
    expect(before.cachedShards).toBeGreaterThanOrEqual(1)

    idx.clearCache()
    const after = idx.getCacheStats()
    expect(after.cachedShards).toBe(0)
  })
})

// ============================================================
// 二级索引测试
// ============================================================
describe('二级索引', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('byId 索引在 add 后自动更新', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '测试' } })
    const fetched = idx.queryById(entry!.indexId)
    expect(fetched).toBeDefined()
    expect(fetched!.payloadRef).toBe('n1')
  })

  it('byType 索引按类型分组', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '笔记1' } })
    idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n2', summary: { snippet: '笔记2' } })
    idx.add({ type: 'emotion', roomSource: 'emotion', payloadRef: 'e1', summary: { snippet: '开心' } })

    const notes = idx.queryByTime({ types: ['note'], limit: 10 })
    expect(notes.entries).toHaveLength(2)

    const emotions = idx.queryByTime({ types: ['emotion'], limit: 10 })
    expect(emotions.entries).toHaveLength(1)
  })

  it('remove 后二级索引同步移除', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const entry = idx.add({ type: 'note', roomSource: 'study', payloadRef: 'n1', summary: { snippet: '测试' } })
    idx.remove(entry!.indexId)
    expect(idx.queryById(entry!.indexId)).toBeUndefined()
  })
})

// ============================================================
// 边界情况测试
// ============================================================
describe('边界情况', () => {
  beforeEach(async () => {
    vi.resetModules()
    mockLocalStorage = createMockStorage()
    ;(globalThis as any).localStorage = mockLocalStorage
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('空索引查询返回空结果', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    const result = idx.queryByTime({ limit: 10 })
    expect(result.entries).toHaveLength(0)
    expect(result.total).toBe(0)
    expect(result.hasMore).toBe(false)
  })

  it('查询不存在的 ID 返回 undefined', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    expect(idx.queryById('nonexistent')).toBeUndefined()
  })

  it('空治理列表查询返回空数组', async () => {
    const { useTimelineIndex } = await import('../index')
    const idx = useTimelineIndex()
    expect(idx.queryByGovernance('archived')).toEqual([])
  })
})