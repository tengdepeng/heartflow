// ============================================================
// 劳酬 · 隐私锁（INCR-31 数据安全）
// 主密码设置/校验 + 会话锁定/解锁。锁定时视图以遮罩隐藏敏感内容。
// 纯函数引擎负责密码指纹与校验，usePrivacyLock 负责存储与会话状态。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { hashHex, randomSalt } from './crypto-utils'
import { REWARD_STORAGE_KEYS } from './types'

/** 隐私锁配置（仅存指纹，不存明文） */
export interface PrivacyLockConfig {
  enabled: boolean
  /** 密码指纹（hex） */
  passwordHash: string
  /** 加盐 */
  salt: string
  /** 密码提示（可选，解锁失败时展示） */
  hint?: string
}

const LOCK_KEY = REWARD_STORAGE_KEYS.PRIVACY_LOCK

// ---- 纯函数 ----

/** 计算密码指纹（含盐、迭代） */
export function fingerprintPassword(password: string, salt: string): string {
  return hashHex(password, salt, 768)
}

/** 校验密码是否正确 */
export function verifyPassword(config: PrivacyLockConfig, password: string): boolean {
  if (!config || !config.enabled || !config.passwordHash) return false
  return fingerprintPassword(password, config.salt) === config.passwordHash
}

/** 是否已配置（已启用且指纹存在） */
export function isConfigured(config: PrivacyLockConfig | null): boolean {
  return !!config && config.enabled && !!config.passwordHash
}

// ---- 存储读写（模块级共享会话态，跨实例一致）----

/** 会话锁定态（内存态，刷新后按配置从新锁定） */
export const sessionLocked = ref<boolean>(false)

/** 设置会话锁定态 */
export function setSessionLocked(v: boolean): void {
  sessionLocked.value = v
}

/** 当前会话是否锁定 */
export function isSessionLocked(): boolean {
  return sessionLocked.value
}

export function usePrivacyLock() {
  const config = ref<PrivacyLockConfig | null>(
    storage.getKV<PrivacyLockConfig | null>(LOCK_KEY, null),
  )

  // 有配置时强制回到锁定态（刷新/重挂载后重新上锁）；
  // 无配置则保留既有会话态，不擅自解锁/上锁。
  function init(): void {
    if (isConfigured(config.value)) sessionLocked.value = true
  }
  init()
  // 同步外部写入（其它实例）
  function load(): void {
    config.value = storage.getKV<PrivacyLockConfig | null>(LOCK_KEY, null)
    if (isConfigured(config.value)) sessionLocked.value = true
  }
  function persist(): void {
    storage.setKV(LOCK_KEY, config.value)
  }

  /** 设置/重置主密码 */
  function setup(password: string, hint?: string): boolean {
    if (!password) return false
    const salt = randomSalt()
    config.value = {
      enabled: true,
      passwordHash: fingerprintPassword(password, salt),
      salt,
      hint: hint || undefined,
    }
    persist()
    setSessionLocked(false)
    return true
  }

  /** 修改密码（需先解锁） */
  function changePassword(oldPwd: string, newPwd: string, hint?: string): boolean {
    if (!verifyPassword(config.value!, oldPwd)) return false
    return setup(newPwd, hint)
  }

  /** 关闭隐私锁（需当前密码） */
  function disable(password: string): boolean {
    if (!verifyPassword(config.value!, password)) return false
    config.value = null
    storage.setKV(LOCK_KEY, null)
    setSessionLocked(false)
    return true
  }

  /** 解锁 */
  function unlock(password: string): boolean {
    if (!verifyPassword(config.value!, password)) return false
    setSessionLocked(false)
    return true
  }

  /** 锁定 / 强制解锁 */
  function lock(target = true): void {
    setSessionLocked(target)
  }

  /** 是否正确密码（供外部即时校验） */
  function verify(password: string): boolean {
    return verifyPassword(config.value!, password)
  }

  return {
    locked: sessionLocked,
    config,
    isConfigured: () => isConfigured(config.value),
    setup,
    changePassword,
    disable,
    unlock,
    lock,
    verify,
    load,
  }
}