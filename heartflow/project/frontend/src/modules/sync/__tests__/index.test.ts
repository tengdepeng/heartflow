// ============================================================
// 同步引擎 · 纯函数与类型常量测试
// ============================================================

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SYNC_CONFIG,
  SYNC_CONFIG_KEY,
  SYNC_LOGS_KEY,
  SYNC_CONFLICTS_KEY,
  SYNC_TARGETS_KEY,
  SYNC_SNAPSHOTS_KEY,
  SYNC_CURSOR_KEY,
} from '../types'
import type { SyncTarget, SyncSnapshot, SyncConflict, SyncLogEntry } from '../types'

// ---- 纯函数等价逻辑（与 sync/index.ts 内部实现一致） ----

/** 计算字符串的简单哈希 */
function hash(str: string): string {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

/** 计算 JSON 数据的哈希 */
function dataHash(data: unknown): string {
  return hash(JSON.stringify(data))
}

/** 统计 payload 中的条目数（排除 exportedAt/version 字段） */
function countPayload(payload: Record<string, unknown>): number {
  let count = 0
  for (const [key, val] of Object.entries(payload)) {
    if (key === 'exportedAt' || key === 'version') continue
    if (Array.isArray(val)) count += val.length
  }
  return count
}

// ---- 测试 ----

describe('DEFAULT_SYNC_CONFIG', () => {
  it('包含所有必需字段', () => {
    expect(DEFAULT_SYNC_CONFIG).toHaveProperty('deviceId')
    expect(DEFAULT_SYNC_CONFIG).toHaveProperty('deviceName')
    expect(DEFAULT_SYNC_CONFIG).toHaveProperty('enabledDomains')
    expect(DEFAULT_SYNC_CONFIG).toHaveProperty('conflictStrategy')
    expect(DEFAULT_SYNC_CONFIG).toHaveProperty('logRetentionLimit')
  expect(DEFAULT_SYNC_CONFIG).toHaveProperty('snapshotRetentionLimit')
})

  it('不定义自动同步间隔（符合第1/52条沉默默认·无自动同步机制）', () => {
    expect(DEFAULT_SYNC_CONFIG).not.toHaveProperty('autoSyncInterval')
  })

  it('conflictStrategy 默认 last-write-wins', () => {
    expect(DEFAULT_SYNC_CONFIG.conflictStrategy).toBe('last-write-wins')
  })

  it('logRetentionLimit 默认 50', () => {
    expect(DEFAULT_SYNC_CONFIG.logRetentionLimit).toBe(50)
  })

  it('snapshotRetentionLimit 默认 10', () => {
    expect(DEFAULT_SYNC_CONFIG.snapshotRetentionLimit).toBe(10)
  })

  it('deviceName 默认"本地设备"', () => {
    expect(DEFAULT_SYNC_CONFIG.deviceName).toBe('本地设备')
  })

  it('enabledDomains 包含核心数据域', () => {
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('sessions')
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('crystals')
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('notes')
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('emotions')
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('anchors')
    expect(DEFAULT_SYNC_CONFIG.enabledDomains).toContain('goals')
  })
})

describe('存储键常量', () => {
  it('所有键都以 hf:sync: 为前缀', () => {
    expect(SYNC_CONFIG_KEY.startsWith('hf:sync:')).toBe(true)
    expect(SYNC_LOGS_KEY.startsWith('hf:sync:')).toBe(true)
    expect(SYNC_CONFLICTS_KEY.startsWith('hf:sync:')).toBe(true)
    expect(SYNC_TARGETS_KEY.startsWith('hf:sync:')).toBe(true)
    expect(SYNC_SNAPSHOTS_KEY.startsWith('hf:sync:')).toBe(true)
    expect(SYNC_CURSOR_KEY.startsWith('hf:sync:')).toBe(true)
  })

  it('所有键互不相同', () => {
    const keys = [
      SYNC_CONFIG_KEY,
      SYNC_LOGS_KEY,
      SYNC_CONFLICTS_KEY,
      SYNC_TARGETS_KEY,
      SYNC_SNAPSHOTS_KEY,
      SYNC_CURSOR_KEY,
    ]
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('hash', () => {
  it('相同输入产生相同哈希', () => {
    expect(hash('hello')).toBe(hash('hello'))
  })

  it('不同输入产生不同哈希', () => {
    expect(hash('hello')).not.toBe(hash('world'))
  })

  it('空字符串返回 0', () => {
    expect(hash('')).toBe('0')
  })

  it('哈希是 36 进制字符串', () => {
    const result = hash('test')
    expect(/^[0-9a-z]+$/.test(result)).toBe(true)
  })

  it('长字符串不会异常', () => {
    const longStr = 'a'.repeat(10000)
    expect(() => hash(longStr)).not.toThrow()
  })
})

describe('dataHash', () => {
  it('相同对象产生相同哈希', () => {
    const a = { id: '1', name: 'test' }
    const b = { id: '1', name: 'test' }
    expect(dataHash(a)).toBe(dataHash(b))
  })

  it('不同对象产生不同哈希', () => {
    const a = { id: '1' }
    const b = { id: '2' }
    expect(dataHash(a)).not.toBe(dataHash(b))
  })

  it('嵌套对象正常工作', () => {
    const obj = { a: { b: { c: [1, 2, 3] } } }
    expect(() => dataHash(obj)).not.toThrow()
  })

  it('null 正常工作', () => {
    expect(() => dataHash(null)).not.toThrow()
  })
})

describe('countPayload', () => {
  it('空 payload 返回 0', () => {
    const payload = { exportedAt: '2026-01-01', version: 2 }
    expect(countPayload(payload)).toBe(0)
  })

  it('统计所有数组字段的总条目数', () => {
    const payload = {
      exportedAt: '2026-01-01',
      version: 2,
      sessions: [{ id: '1' }, { id: '2' }],
      crystals: [{ id: '3' }],
      notes: [],
    }
    expect(countPayload(payload)).toBe(3)
  })

  it('忽略非数组字段', () => {
    const payload = {
      exportedAt: '2026-01-01',
      version: 2,
      sessions: [{ id: '1' }],
      config: { theme: 'dark' },
    }
    expect(countPayload(payload)).toBe(1)
  })

  it('大型 payload 正确统计', () => {
    const payload: Record<string, unknown> = {
      exportedAt: '2026-01-01',
      version: 2,
    }
    for (let i = 0; i < 10; i++) {
      payload[`domain${i}`] = Array.from({ length: i }, (_, j) => ({ id: `${j}` }))
    }
    // 0 + 1 + 2 + ... + 9 = 45
    expect(countPayload(payload)).toBe(45)
  })
})

describe('SyncTarget 类型', () => {
  it('符合接口定义', () => {
    const target: SyncTarget = {
      id: 'device_1',
      name: '我的手机',
      type: 'remote',
      lastSyncAt: null,
      lastSyncStatus: 'idle',
    }
    expect(target.id).toBe('device_1')
    expect(target.type).toBe('remote')
  })
})

describe('SyncSnapshot 类型', () => {
  it('符合接口定义', () => {
    const snapshot: SyncSnapshot = {
      id: 'snap_1',
      createdAt: '2026-01-01T00:00:00.000Z',
      domains: { sessions: 5, crystals: 3 },
      totalEntries: 8,
      sizeBytes: 1024,
      deviceId: 'device_1',
    }
    expect(snapshot.totalEntries).toBe(8)
    expect(snapshot.sizeBytes).toBe(1024)
  })
})

describe('SyncConflict 类型', () => {
  it('未解决冲突 resolution 为 null', () => {
    const conflict: SyncConflict = {
      id: 'conflict_1',
      domain: 'sessions',
      entryId: 'session_1',
      localData: '{"id":"session_1","name":"本地"}',
      remoteData: '{"id":"session_1","name":"远程"}',
      localTimestamp: '2026-01-01T00:00:00.000Z',
      remoteTimestamp: '2026-01-01T01:00:00.000Z',
      resolution: null,
      resolvedAt: null,
      occurredAt: '2026-01-01T02:00:00.000Z',
    }
    expect(conflict.resolution).toBeNull()
    expect(conflict.resolvedAt).toBeNull()
  })

  it('已解决冲突 resolution 为 local 或 remote', () => {
    const conflict: SyncConflict = {
      id: 'conflict_2',
      domain: 'crystals',
      entryId: 'crystal_1',
      localData: '{}',
      remoteData: '{}',
      localTimestamp: '2026-01-01T00:00:00.000Z',
      remoteTimestamp: '2026-01-01T01:00:00.000Z',
      resolution: 'local',
      resolvedAt: '2026-01-01T03:00:00.000Z',
      occurredAt: '2026-01-01T02:00:00.000Z',
    }
    expect(conflict.resolution).toBe('local')
    expect(conflict.resolvedAt).not.toBeNull()
  })
})

describe('SyncLogEntry 类型', () => {
  it('成功日志', () => {
    const log: SyncLogEntry = {
      id: 'log_1',
      timestamp: '2026-01-01T00:00:00.000Z',
      targetId: 'device_1',
      direction: 'bidirectional',
      status: 'success',
      exportedCount: 10,
      importedCount: 5,
      conflictCount: 0,
      durationMs: 1500,
    }
    expect(log.status).toBe('success')
    expect(log.durationMs).toBeGreaterThan(0)
  })

  it('错误日志包含 error 字段', () => {
    const log: SyncLogEntry = {
      id: 'log_2',
      timestamp: '2026-01-01T00:00:00.000Z',
      targetId: 'device_1',
      direction: 'export',
      status: 'error',
      exportedCount: 0,
      importedCount: 0,
      conflictCount: 0,
      error: '网络连接失败',
      durationMs: 5000,
    }
    expect(log.status).toBe('error')
    expect(log.error).toBe('网络连接失败')
  })
})

describe('SyncConfig 类型', () => {
  it('deviceId 以 device_ 开头', () => {
    expect(DEFAULT_SYNC_CONFIG.deviceId.startsWith('device_')).toBe(true)
  })
})