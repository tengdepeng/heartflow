// ============================================================
// 隐私锁引擎测试（INCR-31）
// 覆盖指纹计算/校验/配置态/存储读写/会话锁定
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, unknown> = {}
  return {
    store,
    mockGetKV: vi.fn((k: string, d?: unknown): unknown => store[k] ?? d),
    mockSetKV: vi.fn((k: string, v: unknown): void => {
      store[k] = v
    }),
  }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: mockGetKV,
    setKV: mockSetKV,
  },
}))

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
})

import {
  usePrivacyLock,
  fingerprintPassword,
  verifyPassword,
  isConfigured,
  setSessionLocked,
} from '../privacy-lock'
import type { PrivacyLockConfig } from '../privacy-lock'

function cfg(o: Partial<PrivacyLockConfig> = {}): PrivacyLockConfig {
  return {
    enabled: o.enabled ?? true,
    passwordHash: o.passwordHash ?? fingerprintPassword('secret', o.salt ?? 's1'),
    salt: o.salt ?? 's1',
    hint: o.hint,
  }
}

describe('指纹与校验', () => {
  it('同口令同盐指纹一致，异口令不一致', () => {
    const a = fingerprintPassword('abc123', 'salt')
    const b = fingerprintPassword('abc123', 'salt')
    const c = fingerprintPassword('abc124', 'salt')
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('校验正确口令为真、错误为假', () => {
    expect(verifyPassword(cfg(), 'secret')).toBe(true)
    expect(verifyPassword(cfg(), 'wrong')).toBe(false)
  })

  it('isConfigured 依 enabled + hash 判断', () => {
    expect(isConfigured(cfg())).toBe(true)
    expect(isConfigured({ ...cfg(), enabled: false })).toBe(false)
    expect(isConfigured(null)).toBe(false)
  })
})

describe('usePrivacyLock 存储与会话', () => {
  it('初始无配置不锁定，setup 后启用且解锁', () => {
    const lock = usePrivacyLock()
    expect(lock.isConfigured()).toBe(false)
    expect(lock.locked.value).toBe(false)
    const ok = lock.setup('mypass', '我的生日')
    expect(ok).toBe(true)
    expect(lock.isConfigured()).toBe(true)
    expect(lock.locked.value).toBe(false)
  })

  it('setup 后能解锁/锁定，错误口令无法解锁', () => {
    const lock = usePrivacyLock()
    lock.setup('mypass')
    lock.lock()
    expect(lock.locked.value).toBe(true)
    expect(lock.unlock('wrong')).toBe(false)
    expect(lock.locked.value).toBe(true)
    expect(lock.unlock('mypass')).toBe(true)
    expect(lock.locked.value).toBe(false)
  })

  it('会话锁定态跨实例共享', () => {
    setSessionLocked(true)
    const lock = usePrivacyLock()
    expect(lock.locked.value).toBe(true)
    lock.lock(false)
  })

  it('disable 需正确口令，关闭后不再维护锁', () => {
    const lock = usePrivacyLock()
    lock.setup('pass')
    expect(lock.disable('nope')).toBe(false)
    expect(lock.isConfigured()).toBe(true)
    expect(lock.disable('pass')).toBe(true)
    expect(lock.isConfigured()).toBe(false)
    expect(mockSetKV).toHaveBeenCalledWith('hf:reward_privacy_lock', null)
  })

  it('changePassword 需旧口令，成功后用新口令可解锁', () => {
    const lock = usePrivacyLock()
    lock.setup('old')
    expect(lock.changePassword('bad', 'new')).toBe(false)
    expect(lock.changePassword('old', 'new')).toBe(true)
    expect(lock.verify('new')).toBe(true)
    expect(lock.verify('old')).toBe(false)
  })

  it('已有配置刷新后初始为锁定', () => {
    store['hf:reward_privacy_lock'] = cfg()
    const lock = usePrivacyLock()
    expect(lock.locked.value).toBe(true)
    lock.lock(false)
  })
})