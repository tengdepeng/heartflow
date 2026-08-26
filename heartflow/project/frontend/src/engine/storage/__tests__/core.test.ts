// ============================================================
// 存储核心层 · 测试
// ============================================================

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

describe('storage core', () => {
  let mockStore: Record<string, string> = {}

  beforeEach(() => {
    mockStore = {}
    ;(globalThis as any).localStorage = {
      getItem: vi.fn((k: string) => mockStore[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { mockStore[k] = v }),
      removeItem: vi.fn((k: string) => { delete mockStore[k] }),
      clear: vi.fn(() => { mockStore = {} }),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function fresh() {
    const core = await import('../core')
    core.invalidateCache()
    return core
  }

  it('loadSchema 返回默认 schema 当存储为空', async () => {
    const core = await fresh()
    const schema = core.loadSchema()
    expect(schema).toBeDefined()
    expect(schema.version).toBe(10)
    expect(schema.sessions).toEqual([])
    expect(schema.crystals).toEqual([])
    expect(schema.config).toBeDefined()
    expect(schema.config.theme).toBe('dark')
  })

  it('loadSchema 缓存结果', async () => {
    const core = await fresh()
    const s1 = core.loadSchema()
    const s2 = core.loadSchema()
    expect(s1).toBe(s2)
  })

  it('invalidateCache 清除缓存', async () => {
    const core = await fresh()
    core.loadSchema()
    core.invalidateCache()
    const s2 = core.loadSchema()
    // 新加载应返回相同内容（但不同对象）
    expect(s2.version).toBe(10)
  })

  it('saveSchema 写入存储', async () => {
    const core = await fresh()
    const schema = core.loadSchema()
    schema.sessions.push({ id: 'test' } as any)
    core.saveSchema(schema)
    // 写入后 localStorage 应包含数据
    expect(mockStore['heartflow:storage']).toBeDefined()
    const parsed = JSON.parse(mockStore['heartflow:storage'])
    expect(parsed.sessions).toHaveLength(1)
  })

  it('saveSchema 递增 storageVersion', async () => {
    const core = await fresh()
    const v0 = core.storageVersion.value
    const schema = core.loadSchema()
    core.saveSchema(schema)
    expect(core.storageVersion.value).toBe(v0 + 1)
  })

  it('clearAll 清除存储', async () => {
    const core = await fresh()
    const schema = core.loadSchema()
    schema.sessions.push({ id: 'test' } as any)
    core.saveSchema(schema)
    expect(mockStore['heartflow:storage']).toBeDefined()
    core.clearAll()
    expect(mockStore['heartflow:storage']).toBeUndefined()
  })

  it('getStorageBackend 返回 localStorage', async () => {
    const core = await fresh()
    expect(core.getStorageBackend()).toBe('localStorage')
  })

  it('initStorage 不报错', async () => {
    const core = await fresh()
    await expect(core.initStorage()).resolves.toBeUndefined()
  })

  it('版本迁移：低于 v2 移除 position 字段', async () => {
    const core = await fresh()
    // 手动写入旧版本数据
    mockStore['heartflow:storage'] = JSON.stringify({
      version: 1,
      crystals: [{ id: 'c1', position: { x: 1, y: 2 }, sessionId: 's1', color: '#fff', intensity: 0.5, createdAt: '', shape: 'sphere', tags: [], insight: null }],
      config: { theme: 'dark' },
    })
    core.invalidateCache()
    const schema = core.loadSchema()
    expect(schema.version).toBe(10)
    expect(schema.crystals[0]).not.toHaveProperty('position')
  })

  it('版本迁移：从 v0 完整加载', async () => {
    const core = await fresh()
    mockStore['heartflow:storage'] = JSON.stringify({
      version: 0,
      sessions: [],
      config: { theme: 'light', timer: { defaultDuration: 30 } },
    })
    core.invalidateCache()
    const schema = core.loadSchema()
    expect(schema.version).toBe(10)
    expect(schema.config.theme).toBe('light')
    expect(schema.config.timer.defaultDuration).toBe(30)
  })
})