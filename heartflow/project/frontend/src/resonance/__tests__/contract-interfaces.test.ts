// ============================================================
// 共鸣协议层 · 合约接口测试
// 测试 IKnowledgeGuidance, IDataTransfer, IAutomationEngine,
// IThreadManager, IExtension 等接口契约定义
// ============================================================

import { describe, it, expect } from 'vitest'

// ============================================================
// 导入接口类型
// ============================================================

import type {
  IKnowledgeGuidance,
  IKnowledgeAggregator,
  KnowledgeEntry,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeNode,
  KnowledgeEntryType,
} from '../knowledge'

import type {
  IDataTransfer,
  DataDomain,
  DataChangeEvent,
  DataQuery,
  DataQueryResult,
  DataExport,
  DataImportOptions,
  DataImportResult,
} from '../data-transfer'

import type {
  IAutomationEngine,
  FlowDefinition,
  ExecutionRecord,
  TriggerType,
} from '../automation'

import type {
  IThreadManager,
  TaskDefinition,
  TaskProgress,
  TaskResult,
  QueueStatus,
  SchedulerConfig,
  TaskStatus,
} from '../thread'

import type {
  IExtension,
  IExtensionManager,
  ExtensionManifest,
  ExtensionRuntime,
  ExtensionSandboxConfig,
  ExtensionType,
  ExtensionPermission,
} from '../extension'

import type { ResonanceResult, ResonanceEventListener } from '../types'

// ============================================================
// 辅助：创建 mock ResonanceResult
// ============================================================

function mockSuccess<T>(data?: T): ResonanceResult<T> {
  return { success: true, data }
}

function mockFailure<T>(error: string): ResonanceResult<T> {
  return { success: false, error }
}

// ============================================================
// IKnowledgeGuidance 测试
// ============================================================

describe('IKnowledgeGuidance 合约接口', () => {
  // 创建 mock 实现
  function createMockKnowledgeGuidance(
    sourceId = 'test-kg',
    sourceName = '测试知识源',
  ): IKnowledgeGuidance {
    const entries: Map<string, KnowledgeEntry> = new Map()

    return {
      sourceId,
      sourceName,

      async index(entry: KnowledgeEntry): Promise<ResonanceResult<void>> {
        entries.set(entry.id, entry)
        return mockSuccess()
      },

      async indexBatch(items: KnowledgeEntry[]): Promise<ResonanceResult<{ indexed: number }>> {
        for (const entry of items) {
          entries.set(entry.id, entry)
        }
        return mockSuccess({ indexed: items.length })
      },

      async removeIndex(entryId: string): Promise<ResonanceResult<void>> {
        entries.delete(entryId)
        return mockSuccess()
      },

      async clearIndex(): Promise<ResonanceResult<void>> {
        entries.clear()
        return mockSuccess()
      },

      async search(query: KnowledgeQuery): Promise<ResonanceResult<KnowledgeSearchResult>> {
        const all = [...entries.values()]
        return mockSuccess({
          entries: all.slice(query.offset, query.offset + query.limit),
          total: all.length,
          latency: 5,
          cached: false,
        })
      },

      async getById(entryId: string): Promise<ResonanceResult<KnowledgeEntry | undefined>> {
        return mockSuccess(entries.get(entryId))
      },

      async getRelated(entryId: string, limit: number): Promise<ResonanceResult<KnowledgeEntry[]>> {
        const entry = entries.get(entryId)
        if (!entry) return mockSuccess([])
        return mockSuccess(
          [...entries.values()]
            .filter(e => e.id !== entryId)
            .slice(0, limit),
        )
      },

      async getGraph(rootId?: string, _depth?: number): Promise<ResonanceResult<KnowledgeNode>> {
        return mockSuccess({
          id: rootId ?? 'root',
          label: '知识图谱',
          type: 'concept',
          strength: 1,
          children: [],
        })
      },

      async getTagCloud(): Promise<ResonanceResult<Array<{ tag: string; count: number }>>> {
        return mockSuccess([])
      },

      async getStats(): Promise<ResonanceResult<{
        totalEntries: number
        byType: Record<KnowledgeEntryType, number>
        totalTags: number
        lastIndexedAt: string | null
      }>> {
        return mockSuccess({
          totalEntries: entries.size,
          byType: { note: entries.size, book: 0, excerpt: 0, concept: 0, reflection: 0, external: 0 },
          totalTags: 0,
          lastIndexedAt: new Date().toISOString(),
        })
      },
    }
  }

  // ---- 属性 ----

  it('应具有 sourceId 和 sourceName 属性', () => {
    const kg = createMockKnowledgeGuidance('my-source', '我的知识源')
    expect(kg.sourceId).toBe('my-source')
    expect(kg.sourceName).toBe('我的知识源')
  })

  // ---- 索引 ----

  it('index: 应正确索引一条知识条目', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'entry-1',
      type: 'note',
      title: '测试笔记',
      snippet: '摘要',
      content: '完整内容',
      tags: ['test'],
      source: 'manual',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relatedIds: [],
      weight: 0.8,
    }
    const result = await kg.index(entry)
    expect(result.success).toBe(true)
  })

  it('indexBatch: 应正确批量索引', async () => {
    const kg = createMockKnowledgeGuidance()
    const entries: KnowledgeEntry[] = [
      {
        id: 'e1', type: 'note', title: '笔记1', snippet: '', content: '',
        tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
      },
      {
        id: 'e2', type: 'book', title: '书籍1', snippet: '', content: '',
        tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.7,
      },
    ]
    const result = await kg.indexBatch(entries)
    expect(result.success).toBe(true)
    expect(result.data!.indexed).toBe(2)
  })

  it('removeIndex: 应正确移除索引', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'to-remove', type: 'note', title: '待删除', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    await kg.index(entry)
    const removeResult = await kg.removeIndex('to-remove')
    expect(removeResult.success).toBe(true)

    const getResult = await kg.getById('to-remove')
    expect(getResult.data).toBeUndefined()
  })

  it('clearIndex: 应清空所有索引', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'e1', type: 'note', title: '笔记', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    await kg.index(entry)
    await kg.clearIndex()

    const stats = await kg.getStats()
    expect(stats.data!.totalEntries).toBe(0)
  })

  // ---- 检索 ----

  it('search: 应返回匹配的搜索结果', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'e1', type: 'note', title: '测试笔记', snippet: '摘要', content: '内容',
      tags: ['测试'], source: 'manual', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), relatedIds: [], weight: 0.9,
    }
    await kg.index(entry)

    const query: KnowledgeQuery = {
      keywords: ['测试'],
      limit: 10,
      offset: 0,
    }
    const result = await kg.search(query)
    expect(result.success).toBe(true)
    expect(result.data!.total).toBe(1)
    expect(result.data!.entries[0].id).toBe('e1')
  })

  it('getById: 应返回正确的条目', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'find-me', type: 'note', title: '找我', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    await kg.index(entry)

    const result = await kg.getById('find-me')
    expect(result.success).toBe(true)
    expect(result.data!.title).toBe('找我')
  })

  it('getById: 不存在的条目应返回 undefined', async () => {
    const kg = createMockKnowledgeGuidance()
    const result = await kg.getById('nonexistent')
    expect(result.success).toBe(true)
    expect(result.data).toBeUndefined()
  })

  it('getRelated: 应返回关联条目', async () => {
    const kg = createMockKnowledgeGuidance()
    const e1: KnowledgeEntry = {
      id: 'e1', type: 'note', title: '笔记1', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    const e2: KnowledgeEntry = {
      id: 'e2', type: 'note', title: '笔记2', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    await kg.indexBatch([e1, e2])

    const result = await kg.getRelated('e1', 5)
    expect(result.success).toBe(true)
    // 关联结果不应包含自身
    expect(result.data!.find(e => e.id === 'e1')).toBeUndefined()
  })

  // ---- 图谱 ----

  it('getGraph: 应返回知识图谱', async () => {
    const kg = createMockKnowledgeGuidance()
    const result = await kg.getGraph('root', 2)
    expect(result.success).toBe(true)
    expect(result.data!.id).toBe('root')
    expect(result.data!.label).toBeDefined()
  })

  it('getTagCloud: 应返回标签云', async () => {
    const kg = createMockKnowledgeGuidance()
    const result = await kg.getTagCloud()
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  // ---- 统计 ----

  it('getStats: 应返回正确的统计信息', async () => {
    const kg = createMockKnowledgeGuidance()
    const entry: KnowledgeEntry = {
      id: 'e1', type: 'note', title: '笔记', snippet: '', content: '',
      tags: [], source: '', createdAt: '', updatedAt: '', relatedIds: [], weight: 0.5,
    }
    await kg.index(entry)

    const stats = await kg.getStats()
    expect(stats.success).toBe(true)
    expect(stats.data!.totalEntries).toBe(1)
    expect(stats.data!.byType.note).toBe(1)
    expect(stats.data!.lastIndexedAt).toBeDefined()
  })
})

// ============================================================
// IKnowledgeAggregator 测试
// ============================================================

describe('IKnowledgeAggregator 合约接口', () => {
  function createMockAggregator(): IKnowledgeAggregator {
    const sources: IKnowledgeGuidance[] = []

    return {
      registerSource(source: IKnowledgeGuidance): ResonanceResult<void> {
        sources.push(source)
        return mockSuccess()
      },

      async searchAll(query: KnowledgeQuery): Promise<ResonanceResult<KnowledgeSearchResult>> {
        const allResults: KnowledgeEntry[] = []
        let total = 0
        for (const src of sources) {
          const r = await src.search(query)
          if (r.success && r.data) {
            allResults.push(...r.data.entries)
            total += r.data.total
          }
        }
        return mockSuccess({
          entries: allResults,
          total,
          latency: 10,
          cached: false,
        })
      },

      getSources(): IKnowledgeGuidance[] {
        return [...sources]
      },
    }
  }

  it('应可注册多个知识源', () => {
    const aggregator = createMockAggregator()
    const mockSource = {
      sourceId: 's1',
      sourceName: '源1',
      index: async (): Promise<ResonanceResult<void>> => mockSuccess(),
      indexBatch: async () => mockSuccess({ indexed: 0 }),
      removeIndex: async (): Promise<ResonanceResult<void>> => mockSuccess(),
      clearIndex: async (): Promise<ResonanceResult<void>> => mockSuccess(),
      search: async () => mockSuccess({ entries: [], total: 0, latency: 0, cached: false }),
      getById: async () => mockSuccess(undefined),
      getRelated: async () => mockSuccess([]),
      getGraph: async (): Promise<ResonanceResult<KnowledgeNode>> => mockSuccess({ id: 'r', label: 'R', type: 'concept', strength: 1 }),
      getTagCloud: async () => mockSuccess([]),
      getStats: async () => mockSuccess({
        totalEntries: 0, byType: { note: 0, book: 0, excerpt: 0, concept: 0, reflection: 0, external: 0 },
        totalTags: 0, lastIndexedAt: null,
      }),
    }

    const result = aggregator.registerSource(mockSource)
    expect(result.success).toBe(true)
    expect(aggregator.getSources()).toHaveLength(1)
  })

  it('searchAll: 应跨源搜索', async () => {
    const aggregator = createMockAggregator()
    const result = await aggregator.searchAll({ keywords: ['测试'], limit: 10, offset: 0 })
    expect(result.success).toBe(true)
    expect(result.data!.total).toBe(0)
  })
})

// ============================================================
// IDataTransfer 测试
// ============================================================

describe('IDataTransfer 合约接口', () => {
  function createMockDataTransfer(
    providerId = 'test-dt',
    domains: DataDomain[] = ['sessions', 'notes'],
  ): IDataTransfer {
    const data: Map<string, Map<string, unknown>> = new Map()
    const listeners: Map<string, Array<(event: DataChangeEvent) => void>> = new Map()

    for (const d of domains) {
      data.set(d, new Map())
      listeners.set(d, [])
    }

    return {
      providerId,
      supportedDomains: domains,

      async query<T = unknown>(q: DataQuery): Promise<ResonanceResult<DataQueryResult<T>>> {
        const domain = data.get(q.domain) ?? new Map()
        const items = [...domain.values()] as T[]
        const offset = q.pagination?.offset ?? 0
        const limit = q.pagination?.limit ?? items.length
        const sliced = items.slice(offset, offset + limit)
        return mockSuccess({
          items: sliced,
          total: items.length,
          hasMore: offset + limit < items.length,
        })
      },

      async getById<T = unknown>(domain: DataDomain, id: string): Promise<ResonanceResult<T | undefined>> {
        return mockSuccess((data.get(domain)?.get(id) ?? undefined) as T | undefined)
      },

      async getAll<T = unknown>(domain: DataDomain): Promise<ResonanceResult<T[]>> {
        return mockSuccess([...(data.get(domain)?.values() ?? [])] as T[])
      },

      async create<T = unknown>(domain: DataDomain, item: T): Promise<ResonanceResult<T>> {
        const domainData = data.get(domain) ?? new Map()
        const id = (item as any).id ?? `auto_${Date.now()}`
        if (!(item as any).id) (item as any).id = id
        domainData.set(id, item)
        data.set(domain, domainData)
        return mockSuccess(item)
      },

      async update<T = unknown>(domain: DataDomain, id: string, partial: Partial<T>): Promise<ResonanceResult<T>> {
        const existing = data.get(domain)?.get(id) as T | undefined
        if (!existing) return mockFailure<T>('未找到')
        const updated = { ...existing, ...partial }
        data.get(domain)!.set(id, updated)
        return mockSuccess(updated)
      },

      async delete(domain: DataDomain, id: string): Promise<ResonanceResult<void>> {
        data.get(domain)?.delete(id)
        return mockSuccess()
      },

      async batch(operations): Promise<ResonanceResult<{ succeeded: number; failed: number }>> {
        return mockSuccess({ succeeded: operations.length, failed: 0 })
      },

      async exportData(_domains?: DataDomain[]): Promise<ResonanceResult<DataExport>> {
        return mockSuccess({
          version: 1,
          exportedAt: new Date().toISOString(),
          domains: {},
        })
      },

      async importData(_exported: DataExport, _options?: DataImportOptions): Promise<ResonanceResult<DataImportResult>> {
        return mockSuccess({
          imported: 0,
          skipped: 0,
          conflicts: 0,
          byDomain: {},
        })
      },

      subscribe(domain: DataDomain, listener: (event: DataChangeEvent) => void): void {
        listeners.get(domain)?.push(listener)
      },

      unsubscribe(domain: DataDomain, listener: (event: DataChangeEvent) => void): void {
        const arr = listeners.get(domain)
        if (arr) {
          const idx = arr.indexOf(listener)
          if (idx >= 0) arr.splice(idx, 1)
        }
      },

      notify(event: DataChangeEvent): void {
        const arr = listeners.get(event.domain)
        if (arr) {
          for (const l of arr) l(event)
        }
      },
    }
  }

  // ---- 属性 ----

  it('应具有 providerId 和 supportedDomains', () => {
    const dt = createMockDataTransfer('my-provider', ['sessions', 'notes', 'emotions'])
    expect(dt.providerId).toBe('my-provider')
    expect(dt.supportedDomains).toContain('sessions')
    expect(dt.supportedDomains).toContain('notes')
    expect(dt.supportedDomains).toContain('emotions')
  })

  // ---- 读取 ----

  it('query: 应返回查询结果', async () => {
    const dt = createMockDataTransfer()
    const result = await dt.query({ domain: 'sessions' })
    expect(result.success).toBe(true)
    expect(result.data!.items).toEqual([])
    expect(result.data!.total).toBe(0)
  })

  it('create + getById: 应正确创建和查询数据', async () => {
    const dt = createMockDataTransfer()
    const created = await dt.create('sessions', { id: 's1', name: '会议1' })
    expect(created.success).toBe(true)

    const found = await dt.getById('sessions', 's1')
    expect(found.success).toBe(true)
    expect((found.data as any).name).toBe('会议1')
  })

  it('update: 应正确更新数据', async () => {
    const dt = createMockDataTransfer()
    await dt.create('sessions', { id: 's1', name: '会议1' })
    const updated = await dt.update('sessions', 's1', { name: '更新后的会议' })
    expect(updated.success).toBe(true)
    expect((updated.data as any).name).toBe('更新后的会议')
  })

  it('delete: 应正确删除数据', async () => {
    const dt = createMockDataTransfer()
    await dt.create('sessions', { id: 's1', name: '会议1' })
    const delResult = await dt.delete('sessions', 's1')
    expect(delResult.success).toBe(true)

    const found = await dt.getById('sessions', 's1')
    expect(found.data).toBeUndefined()
  })

  // ---- 导入导出 ----

  it('exportData: 应返回导出数据', async () => {
    const dt = createMockDataTransfer()
    const result = await dt.exportData(['sessions'])
    expect(result.success).toBe(true)
    expect(result.data!.version).toBe(1)
    expect(result.data!.exportedAt).toBeDefined()
  })

  it('importData: 应返回导入结果', async () => {
    const dt = createMockDataTransfer()
    const exportData: DataExport = {
      version: 1,
      exportedAt: new Date().toISOString(),
      domains: {},
    }
    const result = await dt.importData(exportData)
    expect(result.success).toBe(true)
    expect(result.data!.imported).toBe(0)
  })

  // ---- 变更通知 ----

  it('subscribe/notify: 应正确通知订阅者', () => {
    const dt = createMockDataTransfer()
    const listener = vi.fn()
    dt.subscribe('sessions', listener)

    const event: DataChangeEvent = {
      domain: 'sessions',
      operation: 'create',
      entryIds: ['s1'],
      timestamp: new Date().toISOString(),
      sourceModuleId: 'test',
    }
    dt.notify(event)
    expect(listener).toHaveBeenCalledWith(event)
  })

  it('unsubscribe: 应正确取消订阅', () => {
    const dt = createMockDataTransfer()
    const listener = vi.fn()
    dt.subscribe('sessions', listener)
    dt.unsubscribe('sessions', listener)

    dt.notify({
      domain: 'sessions',
      operation: 'create',
      entryIds: ['s1'],
      timestamp: new Date().toISOString(),
      sourceModuleId: 'test',
    })
    expect(listener).not.toHaveBeenCalled()
  })
})

// ============================================================
// IAutomationEngine 测试
// ============================================================

describe('IAutomationEngine 合约接口', () => {
  function createMockAutomationEngine(
    engineId = 'test-auto',
    engineName = '测试自动化引擎',
  ): IAutomationEngine {
    const flows: Map<string, FlowDefinition> = new Map()
    const history: ExecutionRecord[] = []
    const execListeners: Array<(record: ExecutionRecord) => void | Promise<void>> = []

    return {
      engineId,
      engineName,

      initialize(): void {
        /* no-op */
      },

      destroy(): void {
        flows.clear()
        history.length = 0
        execListeners.length = 0
      },

      registerFlow(flow: FlowDefinition): ResonanceResult<void> {
        flows.set(flow.id, flow)
        return mockSuccess()
      },

      unregisterFlow(flowId: string): ResonanceResult<void> {
        flows.delete(flowId)
        return mockSuccess()
      },

      getFlows(): FlowDefinition[] {
        return [...flows.values()]
      },

      getFlow(flowId: string): FlowDefinition | undefined {
        return flows.get(flowId)
      },

      setFlowEnabled(flowId: string, enabled: boolean): ResonanceResult<void> {
        const flow = flows.get(flowId)
        if (!flow) return mockFailure('流程不存在')
        flow.enabled = enabled
        return mockSuccess()
      },

      async execute(flowId: string, _trigger: TriggerType): Promise<ResonanceResult<ExecutionRecord>> {
        const flow = flows.get(flowId)
        if (!flow) return mockFailure('流程不存在')
        const record: ExecutionRecord = {
          id: `exec_${Date.now()}`,
          flowName: flow.name,
          at: new Date().toISOString(),
          status: 'ok',
          durationMs: 100,
        }
        history.push(record)
        for (const l of execListeners) l(record)
        return mockSuccess(record)
      },

      getHistory(limit?: number): ExecutionRecord[] {
        return limit ? history.slice(-limit) : [...history]
      },

      clearHistory(): void {
        history.length = 0
      },

      startTimer(_flowId: string, _cronExpression: string): ResonanceResult<void> {
        return mockSuccess()
      },

      stopTimer(_flowId: string): ResonanceResult<void> {
        return mockSuccess()
      },

      isTimerRunning(_flowId: string): boolean {
        return false
      },

      onExecution(listener: (record: ExecutionRecord) => void | Promise<void>): void {
        execListeners.push(listener)
      },

      offExecution(listener: (record: ExecutionRecord) => void | Promise<void>): void {
        const idx = execListeners.indexOf(listener)
        if (idx >= 0) execListeners.splice(idx, 1)
      },
    }
  }

  // ---- 属性 ----

  it('应具有 engineId 和 engineName 属性', () => {
    const engine = createMockAutomationEngine('my-engine', '我的引擎')
    expect(engine.engineId).toBe('my-engine')
    expect(engine.engineName).toBe('我的引擎')
  })

  // ---- 生命周期 ----

  it('initialize/destroy: 应正确管理生命周期', () => {
    const engine = createMockAutomationEngine()
    engine.initialize()
    expect(engine.getFlows()).toHaveLength(0)
    engine.destroy()
    // 销毁后不应报错
  })

  // ---- 流程管理 ----

  it('registerFlow: 应注册流程', () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1',
      name: '测试流程',
      actor: 'test',
      steps: [{ type: 'action', key: 'step1', label: '步骤1' }],
      createdAt: new Date().toISOString(),
      enabled: true,
    }
    const result = engine.registerFlow(flow)
    expect(result.success).toBe(true)
    expect(engine.getFlows()).toHaveLength(1)
  })

  it('getFlow: 应返回正确的流程', () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)
    expect(engine.getFlow('flow-1')!.name).toBe('流程1')
    expect(engine.getFlow('nonexistent')).toBeUndefined()
  })

  it('setFlowEnabled: 应切换流程启用状态', () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)
    const result = engine.setFlowEnabled('flow-1', false)
    expect(result.success).toBe(true)
    expect(engine.getFlow('flow-1')!.enabled).toBe(false)
  })

  it('unregisterFlow: 应注销流程', () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)
    engine.unregisterFlow('flow-1')
    expect(engine.getFlows()).toHaveLength(0)
  })

  // ---- 执行 ----

  it('execute: 应执行流程并返回记录', async () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)
    const result = await engine.execute('flow-1', 'manual')
    expect(result.success).toBe(true)
    expect(result.data!.status).toBe('ok')
    expect(result.data!.flowName).toBe('流程1')
  })

  it('execute: 不存在的流程应返回失败', async () => {
    const engine = createMockAutomationEngine()
    const result = await engine.execute('nonexistent', 'manual')
    expect(result.success).toBe(false)
  })

  it('getHistory: 应返回执行历史', async () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)
    await engine.execute('flow-1', 'manual')
    expect(engine.getHistory()).toHaveLength(1)
    engine.clearHistory()
    expect(engine.getHistory()).toHaveLength(0)
  })

  // ---- 事件 ----

  it('onExecution/offExecution: 应管理执行监听器', async () => {
    const engine = createMockAutomationEngine()
    const flow: FlowDefinition = {
      id: 'flow-1', name: '流程1', actor: 'test',
      steps: [], createdAt: new Date().toISOString(), enabled: true,
    }
    engine.registerFlow(flow)

    const listener = vi.fn()
    engine.onExecution(listener)
    await engine.execute('flow-1', 'manual')
    expect(listener).toHaveBeenCalled()

    engine.offExecution(listener)
    listener.mockClear()
    await engine.execute('flow-1', 'manual')
    expect(listener).not.toHaveBeenCalled()
  })
})

// ============================================================
// IThreadManager 测试
// ============================================================

describe('IThreadManager 合约接口', () => {
  function createMockThreadManager(
    managerId = 'test-tm',
    managerName = '测试线程管理器',
  ): IThreadManager {
    const tasks: Map<string, { def: TaskDefinition; status: TaskStatus; result?: unknown }> = new Map()
    const config: SchedulerConfig = {
      maxConcurrency: 4,
      defaultTimeout: 30000,
      maxRetries: 3,
      retryDelay: 1000,
      autoRecover: true,
    }

    return {
      managerId,
      managerName,

      initialize(cfg: SchedulerConfig): void {
        Object.assign(config, cfg)
      },

      destroy(): void {
        tasks.clear()
      },

      async submit<T = unknown>(task: TaskDefinition, executor: () => Promise<T>): Promise<ResonanceResult<TaskResult<T>>> {
        tasks.set(task.id, { def: task, status: 'running' })
        try {
          const start = Date.now()
          const data = await executor()
          const duration = Date.now() - start
          tasks.set(task.id, { def: task, status: 'completed', result: data })
          return mockSuccess({
            taskId: task.id,
            status: 'completed',
            data,
            duration,
            completedAt: Date.now(),
          })
        } catch (e) {
          tasks.set(task.id, { def: task, status: 'failed' })
          return {
            success: false,
            error: String(e),
            data: undefined as any,
          }
        }
      },

      cancel(taskId: string): ResonanceResult<void> {
        const task = tasks.get(taskId)
        if (!task) return mockFailure('任务不存在')
        tasks.set(taskId, { ...task, status: 'cancelled' })
        return mockSuccess()
      },

      cancelAll(): void {
        for (const [id, task] of tasks) {
          tasks.set(id, { ...task, status: 'cancelled' })
        }
      },

      getTaskStatus(taskId: string): TaskStatus | undefined {
        return tasks.get(taskId)?.status
      },

      getTaskProgress(taskId: string): TaskProgress | undefined {
        return tasks.has(taskId)
          ? { taskId, progress: 0.5, message: '进行中', elapsed: 1000 }
          : undefined
      },

      pauseQueue(_queueName?: string): void { /* no-op */ },
      resumeQueue(_queueName?: string): void { /* no-op */ },

      getQueueStatus(queueName?: string): QueueStatus {
        return {
          queueName: queueName ?? 'default',
          pending: 0,
          running: 0,
          completed: 0,
          failed: 0,
          paused: false,
        }
      },

      getAllQueueStatuses(): QueueStatus[] {
        return [this.getQueueStatus()]
      },

      getConfig(): SchedulerConfig {
        return { ...config }
      },

      updateConfig(partial: Partial<SchedulerConfig>): void {
        Object.assign(config, partial)
      },

      onTaskComplete(_listener: (result: TaskResult) => void | Promise<void>): void { /* no-op */ },
      onTaskProgress(_listener: (progress: TaskProgress) => void | Promise<void>): void { /* no-op */ },
      onTaskError(_listener: (event: { taskId: string; error: string }) => void | Promise<void>): void { /* no-op */ },
      offTaskComplete(_listener: (result: TaskResult) => void | Promise<void>): void { /* no-op */ },
      offTaskProgress(_listener: (progress: TaskProgress) => void | Promise<void>): void { /* no-op */ },
      offTaskError(_listener: (event: { taskId: string; error: string }) => void | Promise<void>): void { /* no-op */ },

      getStats() {
        return {
          totalTasks: tasks.size,
          completedTasks: [...tasks.values()].filter(t => t.status === 'completed').length,
          failedTasks: [...tasks.values()].filter(t => t.status === 'failed').length,
          cancelledTasks: [...tasks.values()].filter(t => t.status === 'cancelled').length,
          averageLatency: 50,
          uptime: 3600000,
        }
      },
    }
  }

  // ---- 属性 ----

  it('应具有 managerId 和 managerName 属性', () => {
    const tm = createMockThreadManager('my-tm', '我的线程管理器')
    expect(tm.managerId).toBe('my-tm')
    expect(tm.managerName).toBe('我的线程管理器')
  })

  // ---- 任务管理 ----

  it('submit: 应执行任务并返回结果', async () => {
    const tm = createMockThreadManager()
    const task: TaskDefinition = {
      id: 'task-1',
      name: '测试任务',
      priority: 'normal',
      type: 'compute',
      timeout: 5000,
      cancellable: true,
    }
    const result = await tm.submit(task, async () => 'done')
    expect(result.success).toBe(true)
    expect(result.data!.status).toBe('completed')
    expect(result.data!.data).toBe('done')
  })

  it('submit: 任务失败时应返回失败', async () => {
    const tm = createMockThreadManager()
    const task: TaskDefinition = {
      id: 'task-2',
      name: '失败任务',
      priority: 'high',
      type: 'compute',
      timeout: 5000,
      cancellable: true,
    }
    const result = await tm.submit(task, async () => {
      throw new Error('任务执行失败')
    })
    expect(result.success).toBe(false)
    expect(result.error).toContain('任务执行失败')
  })

  it('cancel: 应取消任务', () => {
    const tm = createMockThreadManager()
    const task: TaskDefinition = {
      id: 'task-3',
      name: '可取消任务',
      priority: 'low',
      type: 'compute',
      timeout: 0,
      cancellable: true,
    }
    tm.submit(task, async () => 'result')
    const result = tm.cancel('task-3')
    expect(result.success).toBe(true)
  })

  it('getTaskStatus: 应返回任务状态', async () => {
    const tm = createMockThreadManager()
    const task: TaskDefinition = {
      id: 'task-4', name: '状态任务', priority: 'normal',
      type: 'compute', timeout: 0, cancellable: true,
    }
    await tm.submit(task, async () => 'done')
    expect(tm.getTaskStatus('task-4')).toBe('completed')
    expect(tm.getTaskStatus('nonexistent')).toBeUndefined()
  })

  it('getTaskProgress: 应返回任务进度', () => {
    const tm = createMockThreadManager()
    expect(tm.getTaskProgress('nonexistent')).toBeUndefined()
  })

  // ---- 队列管理 ----

  it('getQueueStatus: 应返回队列状态', () => {
    const tm = createMockThreadManager()
    const status = tm.getQueueStatus()
    expect(status.queueName).toBe('default')
    expect(status.pending).toBe(0)
    expect(status.paused).toBe(false)
  })

  it('getAllQueueStatuses: 应返回所有队列状态', () => {
    const tm = createMockThreadManager()
    expect(tm.getAllQueueStatuses()).toHaveLength(1)
  })

  // ---- 调度器 ----

  it('getConfig: 应返回调度器配置', () => {
    const tm = createMockThreadManager()
    const config = tm.getConfig()
    expect(config.maxConcurrency).toBe(4)
    expect(config.defaultTimeout).toBe(30000)
    expect(config.maxRetries).toBe(3)
  })

  it('updateConfig: 应部分更新配置', () => {
    const tm = createMockThreadManager()
    tm.updateConfig({ maxConcurrency: 8 })
    expect(tm.getConfig().maxConcurrency).toBe(8)
    // 未更新的字段保持不变
    expect(tm.getConfig().defaultTimeout).toBe(30000)
  })

  // ---- 统计 ----

  it('getStats: 应返回统计信息', async () => {
    const tm = createMockThreadManager()
    const task: TaskDefinition = {
      id: 'task-5', name: '统计任务', priority: 'normal',
      type: 'compute', timeout: 0, cancellable: true,
    }
    await tm.submit(task, async () => 'done')
    const stats = tm.getStats()
    expect(stats.totalTasks).toBe(1)
    expect(stats.completedTasks).toBe(1)
    expect(stats.failedTasks).toBe(0)
  })
})

// ============================================================
// IExtension / IExtensionManager 测试
// ============================================================

describe('IExtension 合约接口', () => {
  function createMockExtension(
    extId = 'test-ext',
    extName = '测试扩展',
  ): IExtension {
    let runtime: ExtensionRuntime = {
      manifest: {
        id: extId,
        name: extName,
        version: '1.0.0',
        type: 'plugin',
        description: '测试扩展',
        author: 'tester',
        permissions: [],
      },
      enabled: false,
      installedAt: new Date().toISOString(),
      source: 'file',
      state: 'loading',
    }

    return {
      getManifest(): ExtensionManifest {
        return { ...runtime.manifest }
      },

      async initialize(_sandbox: ExtensionSandboxConfig): Promise<ResonanceResult<void>> {
        runtime.state = 'running'
        return mockSuccess()
      },

      async activate(): Promise<ResonanceResult<void>> {
        runtime.enabled = true
        return mockSuccess()
      },

      async deactivate(): Promise<ResonanceResult<void>> {
        runtime.enabled = false
        runtime.state = 'disabled'
        return mockSuccess()
      },

      async uninstall(): Promise<ResonanceResult<void>> {
        runtime.state = 'disabled'
        return mockSuccess()
      },

      getRuntime(): ExtensionRuntime {
        return { ...runtime }
      },

      get available(): boolean {
        return runtime.state === 'running' && runtime.enabled
      },
    }
  }

  // ---- 属性 ----

  it('getManifest: 应返回扩展清单', () => {
    const ext = createMockExtension('my-ext', '我的扩展')
    const manifest = ext.getManifest()
    expect(manifest.id).toBe('my-ext')
    expect(manifest.name).toBe('我的扩展')
    expect(manifest.version).toBe('1.0.0')
    expect(manifest.type).toBe('plugin')
  })

  it('初始状态 available 应为 false', () => {
    const ext = createMockExtension()
    expect(ext.available).toBe(false)
  })

  // ---- 生命周期 ----

  it('initialize: 应初始化扩展', async () => {
    const ext = createMockExtension()
    const sandbox: ExtensionSandboxConfig = {
      sandboxEnabled: true,
      allowedDomains: [],
      maxMemoryMB: 128,
      maxStorageMB: 64,
      allowDOMAccess: false,
      allowEval: false,
    }
    const result = await ext.initialize(sandbox)
    expect(result.success).toBe(true)
    expect(ext.getRuntime().state).toBe('running')
  })

  it('activate: 应激活扩展', async () => {
    const ext = createMockExtension()
    await ext.initialize({
      sandboxEnabled: true, allowedDomains: [],
      maxMemoryMB: 128, maxStorageMB: 64,
      allowDOMAccess: false, allowEval: false,
    })
    const result = await ext.activate()
    expect(result.success).toBe(true)
    expect(ext.available).toBe(true)
  })

  it('deactivate: 应停用扩展', async () => {
    const ext = createMockExtension()
    await ext.initialize({
      sandboxEnabled: true, allowedDomains: [],
      maxMemoryMB: 128, maxStorageMB: 64,
      allowDOMAccess: false, allowEval: false,
    })
    await ext.activate()
    await ext.deactivate()
    expect(ext.available).toBe(false)
  })

  it('uninstall: 应卸载扩展', async () => {
    const ext = createMockExtension()
    const result = await ext.uninstall()
    expect(result.success).toBe(true)
  })
})

// ============================================================
// IExtensionManager 测试
// ============================================================

describe('IExtensionManager 合约接口', () => {
  function createMockExtensionManager(managerId = 'test-em'): IExtensionManager {
    const extensions: Map<string, IExtension> = new Map()
    const lifecycleListeners: Array<ResonanceEventListener<{ extensionId: string; event: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'error' }>> = []
    let sandbox: ExtensionSandboxConfig = {
      sandboxEnabled: true,
      allowedDomains: [],
      maxMemoryMB: 128,
      maxStorageMB: 64,
      allowDOMAccess: false,
      allowEval: false,
    }

    return {
      managerId,

      async install(manifest: ExtensionManifest, _source: ExtensionRuntime['source']): Promise<ResonanceResult<IExtension>> {
        const ext = createMockExtensionForManager(manifest.id, manifest.name, manifest.type, manifest.permissions)
        extensions.set(manifest.id, ext)
        for (const l of lifecycleListeners) l({ extensionId: manifest.id, event: 'installed' })
        return mockSuccess(ext)
      },

      async uninstall(extensionId: string): Promise<ResonanceResult<void>> {
        extensions.delete(extensionId)
        for (const l of lifecycleListeners) l({ extensionId, event: 'uninstalled' })
        return mockSuccess()
      },

      async enable(extensionId: string): Promise<ResonanceResult<void>> {
        const ext = extensions.get(extensionId)
        if (!ext) return mockFailure('扩展不存在')
        await ext.activate()
        return mockSuccess()
      },

      async disable(extensionId: string): Promise<ResonanceResult<void>> {
        const ext = extensions.get(extensionId)
        if (!ext) return mockFailure('扩展不存在')
        await ext.deactivate()
        return mockSuccess()
      },

      getExtension(extensionId: string): IExtension | undefined {
        return extensions.get(extensionId)
      },

      getExtensionsByType(type: ExtensionType): IExtension[] {
        return [...extensions.values()].filter(e => e.getManifest().type === type)
      },

      getAllExtensions(): IExtension[] {
        return [...extensions.values()]
      },

      getEnabledExtensions(): IExtension[] {
        return [...extensions.values()].filter(e => e.available)
      },

      getSandboxConfig(): ExtensionSandboxConfig {
        return { ...sandbox }
      },

      updateSandboxConfig(partial: Partial<ExtensionSandboxConfig>): void {
        Object.assign(sandbox, partial)
      },

      hasPermission(extensionId: string, permission: ExtensionPermission): boolean {
        const ext = extensions.get(extensionId)
        if (!ext) return false
        return ext.getManifest().permissions.includes(permission)
      },

      grantPermission(_extensionId: string, _permission: ExtensionPermission): ResonanceResult<void> {
        return mockSuccess()
      },

      revokePermission(_extensionId: string, _permission: ExtensionPermission): ResonanceResult<void> {
        return mockSuccess()
      },

      onLifecycleEvent(listener: ResonanceEventListener<{ extensionId: string; event: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'error' }>): void {
        lifecycleListeners.push(listener)
      },

      offLifecycleEvent(listener: ResonanceEventListener<{ extensionId: string; event: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'error' }>): void {
        const idx = lifecycleListeners.indexOf(listener)
        if (idx >= 0) lifecycleListeners.splice(idx, 1)
      },
    }
  }

  function createMockExtensionForManager(
    extId: string,
    extName: string,
    extType: ExtensionType = 'plugin',
    extPermissions: ExtensionPermission[] = [],
  ): IExtension {
    let _available = false
    return {
      getManifest: () => ({
        id: extId, name: extName, version: '1.0.0', type: extType,
        description: '', author: 'tester', permissions: extPermissions,
      }),
      initialize: async () => mockSuccess(),
      activate: async () => { _available = true; return mockSuccess() },
      deactivate: async () => { _available = false; return mockSuccess() },
      uninstall: async () => { _available = false; return mockSuccess() },
      getRuntime: () => ({
        manifest: { id: extId, name: extName, version: '1.0.0', type: extType,
          description: '', author: 'tester', permissions: extPermissions,
        },
        enabled: _available,
        installedAt: new Date().toISOString(),
        source: 'file' as const,
        state: _available ? 'running' : 'disabled',
      }),
      get available() { return _available },
    }
  }

  it('应具有 managerId 属性', () => {
    const em = createMockExtensionManager('my-em')
    expect(em.managerId).toBe('my-em')
  })

  it('install: 应安装扩展', async () => {
    const em = createMockExtensionManager()
    const manifest: ExtensionManifest = {
      id: 'ext-1', name: '扩展1', version: '1.0.0',
      type: 'plugin', description: '测试扩展', author: 'tester', permissions: [],
    }
    const result = await em.install(manifest, 'file')
    expect(result.success).toBe(true)
    expect(em.getExtension('ext-1')).toBeDefined()
  })

  it('getAllExtensions/getEnabledExtensions: 应正确筛选', async () => {
    const em = createMockExtensionManager()
    await em.install({
      id: 'ext-1', name: '扩展1', version: '1.0.0',
      type: 'plugin', description: '', author: 'tester', permissions: [],
    }, 'file')
    await em.install({
      id: 'ext-2', name: '扩展2', version: '1.0.0',
      type: 'theme', description: '', author: 'tester', permissions: [],
    }, 'file')
    expect(em.getAllExtensions()).toHaveLength(2)
    expect(em.getEnabledExtensions()).toHaveLength(0) // 未激活
  })

  it('getExtensionsByType: 应按类型筛选', async () => {
    const em = createMockExtensionManager()
    await em.install({
      id: 'ext-1', name: '插件', version: '1.0.0',
      type: 'plugin', description: '', author: 'tester', permissions: [],
    }, 'file')
    await em.install({
      id: 'ext-2', name: '主题', version: '1.0.0',
      type: 'theme', description: '', author: 'tester', permissions: [],
    }, 'file')
    expect(em.getExtensionsByType('plugin')).toHaveLength(1)
    expect(em.getExtensionsByType('theme')).toHaveLength(1)
  })

  it('hasPermission: 应检查权限', async () => {
    const em = createMockExtensionManager()
    await em.install({
      id: 'ext-1', name: '扩展1', version: '1.0.0',
      type: 'plugin', description: '', author: 'tester',
      permissions: ['storage:read', 'notification'],
    }, 'file')
    expect(em.hasPermission('ext-1', 'storage:read')).toBe(true)
    expect(em.hasPermission('ext-1', 'network')).toBe(false)
  })

  it('onLifecycleEvent: 安装时应触发事件', async () => {
    const em = createMockExtensionManager()
    const listener = vi.fn()
    em.onLifecycleEvent(listener)

    await em.install({
      id: 'ext-1', name: '扩展1', version: '1.0.0',
      type: 'plugin', description: '', author: 'tester', permissions: [],
    }, 'file')

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ extensionId: 'ext-1', event: 'installed' }),
    )
  })

  it('grantPermission/revokePermission: 应正常执行', () => {
    const em = createMockExtensionManager()
    const grantResult = em.grantPermission('ext-1', 'network')
    expect(grantResult.success).toBe(true)
    const revokeResult = em.revokePermission('ext-1', 'network')
    expect(revokeResult.success).toBe(true)
  })

  // ---- 沙箱 ----

  it('getSandboxConfig/updateSandboxConfig: 应管理沙箱配置', () => {
    const em = createMockExtensionManager()
    expect(em.getSandboxConfig().sandboxEnabled).toBe(true)
    em.updateSandboxConfig({ maxMemoryMB: 256 })
    expect(em.getSandboxConfig().maxMemoryMB).toBe(256)
  })
})

// ============================================================
// 需要 vi 的导入（在文件末尾）
// ============================================================

import { vi } from 'vitest'