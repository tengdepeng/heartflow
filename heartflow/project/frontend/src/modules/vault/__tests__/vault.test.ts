// ============================================================
// useVault 模块测试
// 加密保险库数据层：密文载荷读取 / 写入（含遗留明文键清理）/
// 锁定 / 遗留数据迁移读取。加密算法本身由 vault-cipher.test.ts 覆盖。
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, mockRemoveKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? store[k] : d))
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  const mockRemoveKV = vi.fn((k: string) => {
    delete store[k]
  })
  return { mockGetKV, mockSetKV, mockRemoveKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    removeKV: (...args: any[]) => (mockRemoveKV as any)(...args),
  },
}))

import { useVault, VAULT_CIPHER_KEY, VAULT_LEGACY_K, VAULT_LEGACY_KA } from '../vault'
import type { VaultCipherPayload } from '../../safety/vault-cipher'

function samplePayload(): VaultCipherPayload {
  return { v: 1, salt: 'mock-salt', iv: 'mock-iv', data: 'mock-data' }
}

describe('useVault 加密保险库数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    // 重置模块级单例，避免跨用例泄漏
    useVault().load()
  })

  it('load 从存储读取密文载荷', () => {
    store[VAULT_CIPHER_KEY] = samplePayload()
    const v = useVault()
    v.load()
    expect(v.payload.value).toEqual(samplePayload())
    expect(mockGetKV).toHaveBeenCalledWith(VAULT_CIPHER_KEY, null)
  })

  it('空存储时 load 返回 null', () => {
    const v = useVault()
    v.load()
    expect(v.payload.value).toBeNull()
  })

  it('save 写入密文载荷并清理遗留明文键', () => {
    const v = useVault()
    v.save(samplePayload())
    // 密文落盘
    expect(store[VAULT_CIPHER_KEY]).toEqual(samplePayload())
    expect(mockSetKV).toHaveBeenCalledWith(VAULT_CIPHER_KEY, samplePayload())
    // 遗留明文键被清除
    expect(mockRemoveKV).toHaveBeenCalledWith(VAULT_LEGACY_K)
    expect(mockRemoveKV).toHaveBeenCalledWith(VAULT_LEGACY_KA)
    // 模块级单例同步
    expect(v.payload.value).toEqual(samplePayload())
  })

  it('lock 仅清空内存中的密文载荷', () => {
    const v = useVault()
    v.save(samplePayload())
    v.lock()
    expect(v.payload.value).toBeNull()
  })

  it('readLegacy 读取遗留明文并补齐 _expanded', () => {
    store[VAULT_LEGACY_K] = [{ id: 'a1', name: 'x', value: 1, category: 'financial', note: '', at: 't' }]
    store[VAULT_LEGACY_KA] = [{ id: 'ar1', name: 'y', detail: '', at: 't' }]
    const v = useVault()
    const data = v.readLegacy()
    expect((data?.assets[0] as any)._expanded).toBe(false)
    expect(data?.archives[0].id).toBe('ar1')
  })

  it('readLegacy 无遗留数据时返回 null', () => {
    const v = useVault()
    expect(v.readLegacy()).toBeNull()
  })
})
