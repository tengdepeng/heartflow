// ============================================================
// 房间级锁（INCR-469 · 借鉴番茄/静读天下/纯纯写作/相册的「应用/房间锁」）
// 与全局主密码（modules/reward/privacy-lock）相互独立：
//   · 全局锁守护「账本」；房间锁按房间粒度守护任意房间内容。
//   · 每房一份 { enabled, passwordHash, salt, hint }，仅存指纹不存明文。
//   · 解锁态为内存会话态（刷新后重新上锁），与全局锁语义一致。
// 纯函数负责指纹/校验；useRoomLock 负责存储与会话态。
// ============================================================
import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { hashHex, randomSalt } from '../reward/crypto-utils'

/** 单房锁配置（仅存指纹，不存明文） */
export interface RoomLockConfig {
  enabled: boolean
  /** 密码指纹（hex） */
  passwordHash: string
  /** 加盐 */
  salt: string
  /** 密码提示（可选，解锁失败时展示） */
  hint?: string
}

/** roomId → 锁配置 */
export type RoomLockMap = Record<string, RoomLockConfig>

export const ROOM_LOCK_STORAGE_KEY = 'hf:room_locks'

// ---- 纯函数 ----

/** 计算房间密码指纹（含盐、迭代；与全局隐私锁同强度） */
export function fingerprintRoomPassword(password: string, salt: string): string {
  return hashHex(password, salt, 768)
}

/** 校验房间密码是否正确 */
export function verifyRoomPassword(
  config: RoomLockConfig | null | undefined,
  password: string,
): boolean {
  if (!config || !config.enabled || !config.passwordHash) return false
  return fingerprintRoomPassword(password, config.salt) === config.passwordHash
}

/** 是否已配置（已启用且指纹存在） */
export function isRoomLockConfigured(config: RoomLockConfig | null | undefined): boolean {
  return !!config && config.enabled && !!config.passwordHash
}

// ---- 模块级单例：存储 + 会话解锁集（跨组件一致）----

function loadLocks(): RoomLockMap {
  const saved = storage.getKV<RoomLockMap>(ROOM_LOCK_STORAGE_KEY, {})
  // 拷贝一层，避免默认值/存档引用被就地改写（沿用 INCR-83 教训）
  return saved && typeof saved === 'object' ? { ...saved } : {}
}

const locks = ref<RoomLockMap>(loadLocks())

/** 本会话已解锁的房间 id 集（内存态，刷新后清空 → 重新上锁） */
const unlockedRooms = ref<Set<string>>(new Set())

/** 测试用：从存储重载并清空会话解锁集，避免模块级单例在用例之间串味。 */
export function resetRoomLockStore(): void {
  locks.value = loadLocks()
  unlockedRooms.value = new Set()
}

function persist(): void {
  storage.setKV(ROOM_LOCK_STORAGE_KEY, locks.value)
}

export function useRoomLock() {
  function getConfig(roomId: string): RoomLockConfig | undefined {
    return locks.value[roomId]
  }

  function isConfigured(roomId: string): boolean {
    return isRoomLockConfigured(locks.value[roomId])
  }

  /** 已配置且本会话未解锁 → 需上锁遮罩 */
  function isLocked(roomId: string): boolean {
    return isConfigured(roomId) && !unlockedRooms.value.has(roomId)
  }

  function getHint(roomId: string): string | undefined {
    return locks.value[roomId]?.hint
  }

  /** 启用/重置房间锁；成功后当前会话视为已解锁（用户刚设置，无需再输一遍） */
  function setup(roomId: string, password: string, hint?: string): boolean {
    if (!roomId || !password) return false
    const salt = randomSalt()
    locks.value = {
      ...locks.value,
      [roomId]: {
        enabled: true,
        passwordHash: fingerprintRoomPassword(password, salt),
        salt,
        hint: hint || undefined,
      },
    }
    persist()
    const next = new Set(unlockedRooms.value)
    next.add(roomId)
    unlockedRooms.value = next
    return true
  }

  /** 修改密码（需旧密码） */
  function changePassword(roomId: string, oldPwd: string, newPwd: string, hint?: string): boolean {
    if (!verifyRoomPassword(locks.value[roomId], oldPwd)) return false
    return setup(roomId, newPwd, hint)
  }

  /** 关闭房间锁（需当前密码） */
  function disable(roomId: string, password: string): boolean {
    if (!verifyRoomPassword(locks.value[roomId], password)) return false
    const next = { ...locks.value }
    delete next[roomId]
    locks.value = next
    persist()
    const un = new Set(unlockedRooms.value)
    un.delete(roomId)
    unlockedRooms.value = un
    return true
  }

  /** 解锁（本会话内保持解锁） */
  function unlock(roomId: string, password: string): boolean {
    if (!verifyRoomPassword(locks.value[roomId], password)) return false
    const next = new Set(unlockedRooms.value)
    next.add(roomId)
    unlockedRooms.value = next
    return true
  }

  /** 立即重新上锁 */
  function lock(roomId: string): void {
    const next = new Set(unlockedRooms.value)
    next.delete(roomId)
    unlockedRooms.value = next
  }

  /** 即时校验密码（供外部使用） */
  function verify(roomId: string, password: string): boolean {
    return verifyRoomPassword(locks.value[roomId], password)
  }

  /** 已启用房间锁的房间数 */
  const configuredCount = computed(
    () => Object.keys(locks.value).filter((id) => isRoomLockConfigured(locks.value[id])).length,
  )

  return {
    locks,
    getConfig,
    isConfigured,
    isLocked,
    getHint,
    setup,
    changePassword,
    disable,
    unlock,
    lock,
    verify,
    configuredCount,
  }
}
