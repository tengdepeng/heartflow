// ============================================================
// SQLite 存储后端（加密保险库专用，非主存储引擎）
// 实现 StorageBackend 接口，通过 Rust SQLite 后端持久化数据
// 将 StorageSchema 的每个域字段存储为独立的 KV 条目。
//
// 注意：依据《融合版 · 心流工坊完整蓝图15》第一层，主存储引擎必须是
// 「明文 JSON/Markdown，用户可直接查看编辑」——因此主引擎在 Tauri 下
// 使用 core.ts 的 PlaintextFileStorageBackend（cmd_save_storage/cmd_load_storage）。
// 本 SQLite 后端暂不接入 getBackend() 主路径，预留给蓝图第八层「保险库房间」
// 的 L3 加密存储（蓝图15 附录B/正文 line 1807：加密存储基础设施已在第一阶段
// 数据治理层预留 L3 接口，保险库是首个完整实现，优先级 P2 第四阶段）。
// ============================================================

import type { StorageBackend, StorageSchema } from './core'
import {
  sqliteGetKvBatch,
  sqliteSetKvBatch,
  sqliteDeleteKv,
} from '../tauri-bridge'

// Schema 中各域字段对应的 KV 键名
const DOMAIN_KEYS = [
  'sessions',
  'crystals',
  'carriers',
  'constitution',
  'advisors',
  'config',
  'emotions',
  'notes',
  'anchors',
  'goals',
  'relations',
  'advisorMessages',
  'ledger',
  'tagCategories',
  'scenePresets',
  'kvStore',
] as const

const SCHEMA_KEY_PREFIX = 'schema:'

function schemaKey(domain: string): string {
  return `${SCHEMA_KEY_PREFIX}${domain}`
}

/**
 * SQLite 存储后端
 *
 * 实现 StorageBackend 接口，使用 Rust SQLite 后端的 kv_store 表
 * 作为持久化介质。每个域字段独立存储，支持增量写入。
 */
export class SQLiteStorageBackend implements StorageBackend {
  readonly name = 'sqlite'

  private _cache: StorageSchema | null = null
  private _initialized = false
  private _loadedData = false
  private _pendingPersist: Promise<void> | null = null

  /**
   * 同步读取缓存。如果尚未初始化，返回 null 触发异步加载。
   */
  load(): StorageSchema | null {
    return this._cache
  }

  /**
   * 异步初始化：从 SQLite kv_store 加载所有域数据
   */
  async init(): Promise<void> {
    if (this._initialized) return
    this._initialized = true

    await this._loadFromSqlite()
  }

  /**
   * 保存完整 Schema 到 SQLite
   * 每个域字段独立写入 kv_store 表
   */
  save(schema: StorageSchema): void {
    this._cache = schema
    this._pendingPersist = this._persist(schema)
  }

  /**
   * 清除所有数据
   */
  clear(): void {
    this._cache = null
    this._pendingPersist = this._removeFromSqlite()
  }

  // ---- 内部实现 ----

  /**
   * 从 SQLite kv_store 加载所有域数据并重建 Schema
   */
  private async _loadFromSqlite(): Promise<void> {
    try {
      const keys = DOMAIN_KEYS.map(k => schemaKey(k))
      const result = await sqliteGetKvBatch(keys)

      if (!result.success || !result.data) {
        this._cache = null
        return
      }

      const raw: Record<string, unknown> = {}
      for (const domain of DOMAIN_KEYS) {
        const key = schemaKey(domain)
        const value = result.data[key]
        if (value !== null && value !== undefined) {
          try {
            raw[domain] = JSON.parse(value)
          } catch {
            raw[domain] = undefined
          }
        }
      }

      // 检查是否有任何数据（任意域有数据即可）
      const hasData = Object.values(raw).some(v => v !== undefined && v !== null)
      if (hasData) {
        this._cache = raw as unknown as StorageSchema
      } else {
        this._cache = null
      }
    } catch {
      this._cache = null
    }
    this._loadedData = this._cache !== null
  }

  /**
   * 将 Schema 的各域字段持久化到 SQLite kv_store
   * 使用增量策略：仅写入有数据的域
   */
  private async _persist(schema: StorageSchema): Promise<void> {
    try {
      const entries: Array<{ key: string; value: string }> = []

      for (const domain of DOMAIN_KEYS) {
        const value = (schema as unknown as Record<string, unknown>)[domain]
        if (value !== undefined && value !== null) {
          entries.push({
            key: schemaKey(domain),
            value: JSON.stringify(value),
          })
        }
      }

      // 同时写入 version 键
      entries.push({
        key: schemaKey('version'),
        value: JSON.stringify(schema.version),
      })

      await sqliteSetKvBatch(entries)
    } catch (e) {
      console.error('[SQLiteBackend] 持久化失败:', e)
    }
  }

  /**
   * 从 SQLite 中删除所有 Schema 域数据
   */
  private async _removeFromSqlite(): Promise<void> {
    try {
      for (const domain of DOMAIN_KEYS) {
        await sqliteDeleteKv(schemaKey(domain))
      }
      await sqliteDeleteKv(schemaKey('version'))
    } catch {
      // 静默忽略清理失败
    }
  }

  /** 等待挂起的持久化完成（应用关闭前调用，避免数据丢失） */
  async flush(): Promise<void> {
    if (this._pendingPersist) {
      await this._pendingPersist
      this._pendingPersist = null
    }
  }

  /** 是否已从磁盘加载到真实数据（用于判断是否需要进行旧数据迁移） */
  hasLoadedData(): boolean {
    return this._loadedData
  }
}

/** 单例 */
let _sqliteBackend: SQLiteStorageBackend | null = null

/**
 * 获取 SQLite 存储后端实例（单例）
 */
export function getSQLiteBackend(): SQLiteStorageBackend {
  if (!_sqliteBackend) {
    _sqliteBackend = new SQLiteStorageBackend()
  }
  return _sqliteBackend
}