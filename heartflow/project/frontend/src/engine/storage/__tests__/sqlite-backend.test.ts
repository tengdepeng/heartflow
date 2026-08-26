// ============================================================
// SQLite 存储后端测试
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SQLiteStorageBackend } from '../sqlite-backend'

// Mock tauri-bridge
const mockKvStore: Record<string, string> = {}

vi.mock('../../tauri-bridge', () => ({
  sqliteGetKvBatch: vi.fn(async (keys: string[]) => {
    const result: Record<string, string | null> = {}
    for (const key of keys) {
      result[key] = mockKvStore[key] ?? null
    }
    return { success: true, data: result }
  }),
  sqliteSetKvBatch: vi.fn(async (entries: Array<{ key: string; value: string }>) => {
    for (const { key, value } of entries) {
      mockKvStore[key] = value
    }
    return { success: true }
  }),
  sqliteDeleteKv: vi.fn(async (key: string) => {
    delete mockKvStore[key]
    return { success: true }
  }),
}))

describe('SQLiteStorageBackend', () => {
  beforeEach(() => {
    // 清空 mock KV 存储
    for (const key of Object.keys(mockKvStore)) {
      delete mockKvStore[key]
    }
  })

  describe('基础行为', () => {
    it('name 属性返回 "sqlite"', () => {
      const backend = new SQLiteStorageBackend()
      expect(backend.name).toBe('sqlite')
    })

    it('未初始化时 load() 返回 null', () => {
      const backend = new SQLiteStorageBackend()
      expect(backend.load()).toBeNull()
    })

    it('新实例的 load() 返回 null（无缓存）', () => {
      const backend = new SQLiteStorageBackend()
      const result = backend.load()
      expect(result).toBeNull()
    })
  })

  describe('init() 初始化', () => {
    it('init() 从 SQLite 加载数据后 load() 返回非 null', async () => {
      // 预置一些数据
      mockKvStore['schema:config'] = JSON.stringify({ theme: 'dark' })
      mockKvStore['schema:sessions'] = JSON.stringify([{ id: 's1' }])
      mockKvStore['schema:version'] = JSON.stringify(10)

      const backend = new SQLiteStorageBackend()
      await backend.init()

      const schema = backend.load()
      expect(schema).not.toBeNull()
      expect(schema!.config).toEqual({ theme: 'dark' })
      expect(schema!.sessions).toEqual([{ id: 's1' }])
    })

    it('SQLite 为空时 init() 后 load() 返回 null', async () => {
      const backend = new SQLiteStorageBackend()
      await backend.init()

      expect(backend.load()).toBeNull()
    })

    it('重复调用 init() 不会重新加载', async () => {
      mockKvStore['schema:config'] = JSON.stringify({ theme: 'light' })

      const backend = new SQLiteStorageBackend()
      await backend.init()
      await backend.init() // 第二次调用

      const schema = backend.load()
      expect(schema!.config).toEqual({ theme: 'light' })
    })

    it('init() 处理 JSON 解析错误（损坏的数据）', async () => {
      mockKvStore['schema:config'] = '{invalid json'
      mockKvStore['schema:sessions'] = JSON.stringify([{ id: 's1' }])

      const backend = new SQLiteStorageBackend()
      await backend.init()

      // config 解析失败，但 sessions 仍然有效
      const schema = backend.load()
      expect(schema).not.toBeNull()
      expect(schema!.sessions).toEqual([{ id: 's1' }])
    })
  })

  describe('save() 持久化', () => {
    it('save() 将完整 Schema 写入 SQLite kv_store', async () => {
      const backend = new SQLiteStorageBackend()
      await backend.init()

      const schema = {
        version: 10,
        sessions: [{ id: 's1', data: { duration: 1500 } }],
        crystals: [{ id: 'c1', type: 'focus' }],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any

      backend.save(schema)

      // 等待异步写入
      await new Promise(r => setTimeout(r, 50))

      // 验证 KV 存储中的值
      expect(mockKvStore['schema:sessions']).toBe(JSON.stringify(schema.sessions))
      expect(mockKvStore['schema:crystals']).toBe(JSON.stringify(schema.crystals))
      expect(mockKvStore['schema:config']).toBe(JSON.stringify(schema.config))
      expect(mockKvStore['schema:version']).toBe(JSON.stringify(10))
    })

    it('save() 后 load() 返回缓存值', () => {
      const backend = new SQLiteStorageBackend()

      const schema = {
        version: 10,
        sessions: [],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any

      backend.save(schema)
      const loaded = backend.load()
      expect(loaded).toEqual(schema)
    })

    it('save() 覆盖已有数据', async () => {
      const backend = new SQLiteStorageBackend()
      await backend.init()

      // 第一次写入
      backend.save({
        version: 10,
        sessions: [{ id: 's1' }],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any)

      await new Promise(r => setTimeout(r, 50))

      // 第二次写入（覆盖）
      backend.save({
        version: 10,
        sessions: [{ id: 's2' }, { id: 's3' }],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'light' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any)

      await new Promise(r => setTimeout(r, 50))

      expect(mockKvStore['schema:sessions']).toBe(JSON.stringify([{ id: 's2' }, { id: 's3' }]))
      expect(mockKvStore['schema:config']).toBe(JSON.stringify({ theme: 'light' }))
    })
  })

  describe('clear() 清除', () => {
    it('clear() 清除所有 KV 数据和缓存', async () => {
      const backend = new SQLiteStorageBackend()
      await backend.init()

      // 先写入
      backend.save({
        version: 10,
        sessions: [{ id: 's1' }],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any)

      await new Promise(r => setTimeout(r, 50))

      backend.clear()
      await new Promise(r => setTimeout(r, 50))

      // 缓存应已清空
      expect(backend.load()).toBeNull()

      // KV 存储中不应有 schema 相关数据
      const schemaKeys = Object.keys(mockKvStore).filter(k => k.startsWith('schema:'))
      expect(schemaKeys.length).toBe(0)
    })
  })

  describe('getSQLiteBackend() 单例', () => {
    it('多次调用返回同一实例', async () => {
      const { getSQLiteBackend } = await import('../sqlite-backend')
      const b1 = getSQLiteBackend()
      const b2 = getSQLiteBackend()
      expect(b1).toBe(b2)
    })
  })

  describe('增量写入', () => {
    it('仅写入非空域字段', async () => {
      const backend = new SQLiteStorageBackend()
      await backend.init()

      // 清空 mock
      for (const key of Object.keys(mockKvStore)) {
        delete mockKvStore[key]
      }

      backend.save({
        version: 10,
        sessions: [{ id: 's1' }],
        crystals: [],
        carriers: [],
        constitution: null,
        advisors: [],
        config: { theme: 'dark' },
        emotions: [{ id: 'e1', mood: 'happy' }],
        notes: [],
        anchors: [],
        goals: [],
        relations: [],
        advisorMessages: [],
        ledger: [],
        tagCategories: [],
        scenePresets: [],
        kvStore: {},
      } as any)

      await new Promise(r => setTimeout(r, 50))

      // 空数组也应该被写入（express empty state）
      expect(mockKvStore['schema:sessions']).toBeDefined()
      expect(mockKvStore['schema:crystals']).toBeDefined()
      expect(mockKvStore['schema:emotions']).toBeDefined()

      // null 字段不应被写入
      expect(mockKvStore['schema:constitution']).toBeUndefined()
    })
  })
})