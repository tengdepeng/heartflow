// ============================================================
// 保险库 · 自动锁定（Auto-Lock）
// ------------------------------------------------------------
// 借鉴「密码保险箱类 App」的自动锁定：解锁后若长时间无操作，
// 或切换离开应用，自动回到锁定态，防止他人窥探。
// 全部本地实现：空闲计时 + 页面可见性监听，守宪法第1条本地私有。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const AUTO_LOCK_KEY = 'hf:vault_auto_lock'

export interface AutoLockSettings {
  /** 空闲自动锁定分钟数（0 = 关闭空闲锁定） */
  idleMinutes: number
  /** 切换离开页面时立即锁定 */
  lockOnBlur: boolean
}

export const DEFAULT_AUTO_LOCK: AutoLockSettings = {
  idleMinutes: 5,
  lockOnBlur: true,
}

/** 可选空闲时长（分钟）：0 表示关闭 */
export const IDLE_OPTIONS = [0, 1, 5, 15, 30] as const

const settings = ref<AutoLockSettings>({ ...DEFAULT_AUTO_LOCK })

function loadSettings() {
  try {
    const s = storage.getKV<Partial<AutoLockSettings>>(AUTO_LOCK_KEY, {})
    settings.value = {
      idleMinutes: typeof s.idleMinutes === 'number' ? s.idleMinutes : DEFAULT_AUTO_LOCK.idleMinutes,
      lockOnBlur: typeof s.lockOnBlur === 'boolean' ? s.lockOnBlur : DEFAULT_AUTO_LOCK.lockOnBlur,
    }
  } catch {
    settings.value = { ...DEFAULT_AUTO_LOCK }
  }
}

function saveSettings() {
  storage.setKV(AUTO_LOCK_KEY, settings.value)
}

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const

/**
 * 自动锁定组合式函数。onLock 在触发自动锁定时被调用。
 * 返回 settings 供 UI 读写，arm/disarm 控制生命周期。
 */
export function useVaultAutoLock(onLock: () => void) {
  let idleTimer: ReturnType<typeof setTimeout> | null = null
  let armed = false

  function clearIdle() {
    if (idleTimer !== null) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function scheduleIdle() {
    clearIdle()
    if (!armed) return
    const minutes = settings.value.idleMinutes
    if (minutes <= 0) return
    idleTimer = setTimeout(() => {
      idleTimer = null
      onLock()
    }, minutes * 60 * 1000)
  }

  function onActivity() {
    scheduleIdle()
  }

  function onVisibility() {
    if (!armed) return
    if (document.hidden && settings.value.lockOnBlur) {
      onLock()
    }
  }

  function arm() {
    if (armed) return
    armed = true
    loadSettings()
    scheduleIdle()
    for (const ev of ACTIVITY_EVENTS) window.addEventListener(ev, onActivity)
    document.addEventListener('visibilitychange', onVisibility)
  }

  function disarm() {
    if (!armed) return
    armed = false
    clearIdle()
    for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity)
    document.removeEventListener('visibilitychange', onVisibility)
  }

  function updateSettings(patch: Partial<AutoLockSettings>) {
    settings.value = { ...settings.value, ...patch }
    saveSettings()
    scheduleIdle()
  }

  return { settings, updateSettings, arm, disarm }
}
