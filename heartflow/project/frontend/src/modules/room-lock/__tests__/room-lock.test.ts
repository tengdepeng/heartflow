// ============================================================
// 房间级锁引擎测试（INCR-469）
// 覆盖指纹/校验/配置态/存储读写/会话解锁/多房隔离
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

import {
  useRoomLock,
  fingerprintRoomPassword,
  verifyRoomPassword,
  isRoomLockConfigured,
  resetRoomLockStore,
  ROOM_LOCK_STORAGE_KEY,
} from '../index'
import type { RoomLockConfig } from '../index'

function cfg(o: Partial<RoomLockConfig> = {}): RoomLockConfig {
  const salt = o.salt ?? 's1'
  return {
    enabled: o.enabled ?? true,
    passwordHash: o.passwordHash ?? fingerprintRoomPassword('secret', salt),
    salt,
    hint: o.hint,
  }
}

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k]
  resetRoomLockStore()
})

describe('指纹与校验', () => {
  it('同口令同盐指纹一致，异口令不一致', () => {
    expect(fingerprintRoomPassword('abc123', 'salt')).toBe(fingerprintRoomPassword('abc123', 'salt'))
    expect(fingerprintRoomPassword('abc123', 'salt')).not.toBe(fingerprintRoomPassword('abc124', 'salt'))
  })

  it('校验正确口令为真、错误为假', () => {
    expect(verifyRoomPassword(cfg(), 'secret')).toBe(true)
    expect(verifyRoomPassword(cfg(), 'wrong')).toBe(false)
    expect(verifyRoomPassword(null, 'secret')).toBe(false)
  })

  it('isRoomLockConfigured 依 enabled + hash 判断', () => {
    expect(isRoomLockConfigured(cfg())).toBe(true)
    expect(isRoomLockConfigured({ ...cfg(), enabled: false })).toBe(false)
    expect(isRoomLockConfigured(undefined)).toBe(false)
  })
})

describe('useRoomLock 存储与会话', () => {
  it('初始未配置、未上锁', () => {
    const lock = useRoomLock()
    expect(lock.isConfigured('reward')).toBe(false)
    expect(lock.isLocked('reward')).toBe(false)
    expect(lock.configuredCount.value).toBe(0)
  })

  it('setup 后启用房间锁、写入存储且当前会话视为已解锁', () => {
    const lock = useRoomLock()
    expect(lock.setup('reward', 'mypass', '我的生日')).toBe(true)
    expect(lock.isConfigured('reward')).toBe(true)
    expect(lock.isLocked('reward')).toBe(false)
    expect(lock.getHint('reward')).toBe('我的生日')
    expect(lock.configuredCount.value).toBe(1)
    expect(mockSetKV).toHaveBeenCalledWith(ROOM_LOCK_STORAGE_KEY, expect.objectContaining({ reward: expect.any(Object) }))
  })

  it('lock 后上锁，错误口令无法解锁，正确口令解锁', () => {
    const lock = useRoomLock()
    lock.setup('reward', 'mypass')
    lock.lock('reward')
    expect(lock.isLocked('reward')).toBe(true)
    expect(lock.unlock('reward', 'wrong')).toBe(false)
    expect(lock.isLocked('reward')).toBe(true)
    expect(lock.unlock('reward', 'mypass')).toBe(true)
    expect(lock.isLocked('reward')).toBe(false)
  })

  it('setup 空口令/空房间返回 false', () => {
    const lock = useRoomLock()
    expect(lock.setup('', 'x')).toBe(false)
    expect(lock.setup('reward', '')).toBe(false)
    expect(lock.isConfigured('reward')).toBe(false)
  })

  it('disable 需正确口令，关闭后清除配置与会话态', () => {
    const lock = useRoomLock()
    lock.setup('reward', 'pass')
    expect(lock.disable('reward', 'nope')).toBe(false)
    expect(lock.isConfigured('reward')).toBe(true)
    expect(lock.disable('reward', 'pass')).toBe(true)
    expect(lock.isConfigured('reward')).toBe(false)
    expect(lock.isLocked('reward')).toBe(false)
  })

  it('changePassword 需旧口令，成功后新口令可解锁', () => {
    const lock = useRoomLock()
    lock.setup('reward', 'old')
    expect(lock.changePassword('reward', 'bad', 'new')).toBe(false)
    expect(lock.changePassword('reward', 'old', 'new')).toBe(true)
    expect(lock.verify('reward', 'new')).toBe(true)
    expect(lock.verify('reward', 'old')).toBe(false)
  })

  it('多房锁相互独立', () => {
    const lock = useRoomLock()
    lock.setup('reward', 'a')
    lock.setup('vault', 'b')
    lock.lock('reward')
    lock.lock('vault')
    expect(lock.isLocked('reward')).toBe(true)
    expect(lock.isLocked('vault')).toBe(true)
    expect(lock.unlock('reward', 'a')).toBe(true)
    expect(lock.isLocked('reward')).toBe(false)
    expect(lock.isLocked('vault')).toBe(true)
    expect(lock.configuredCount.value).toBe(2)
  })

  it('已有配置刷新后初始为锁定（会话解锁集清空）', () => {
    store[ROOM_LOCK_STORAGE_KEY] = { reward: cfg() }
    resetRoomLockStore()
    const lock = useRoomLock()
    expect(lock.isConfigured('reward')).toBe(true)
    expect(lock.isLocked('reward')).toBe(true)
  })
})
