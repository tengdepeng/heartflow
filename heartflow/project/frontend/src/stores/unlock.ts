// ============================================================
// 解锁 Store（UI 镜像 + 编排入口）
// ------------------------------------------------------------
// B0 加密存储的界面状态层。内存权威源在 engine/storage/unlock-state，
// 本 store 仅镜像其响应式 ref 并暴露编排动作（调用 core.ts 的实现）。
// 口令明文仅存于内存，绝不持久化。
// ============================================================

import { defineStore } from 'pinia'
import { computed } from 'vue'
import {
  unlockWithPassphrase,
  unlockWithDevice,
  enableEncryption,
  disableEncryption,
  changePassphrase,
  isUnlockRequired,
} from '../engine/storage/core'
import {
  unlocked,
  encryptionActive,
  passphrase,
} from '../engine/storage/unlock-state'

export const useUnlockStore = defineStore('unlock', () => {
  /** 内存是否已持有密钥（解锁态）。 */
  const isUnlocked = unlocked
  /** 磁盘存储是否处于加密态（文件含 __hf_enc 信封）。 */
  const isEncryptionActive = encryptionActive
  /** 是否已设用户口令（设备兜底模式下口令可能为 null）。 */
  const hasPassphrase = computed(() => !!passphrase.value)

  async function unlockWithPassword(pw: string): Promise<boolean> {
    return await unlockWithPassphrase(pw)
  }

  async function unlockWithDeviceKey(): Promise<boolean> {
    return await unlockWithDevice()
  }

  /** 启用加密（首次设口令）。 */
  async function enable(pw: string): Promise<void> {
    await enableEncryption(pw)
  }

  /** 关闭加密（解密回明文）。 */
  async function disable(): Promise<void> {
    await disableEncryption()
  }

  /** 修改口令：验证旧口令后用新口令重加密。 */
  async function change(oldPw: string, newPw: string): Promise<boolean> {
    return await changePassphrase(oldPw, newPw)
  }

  /** 启动期是否需要解锁遮罩。 */
  function needsUnlock(): boolean {
    return isUnlockRequired()
  }

  return {
    isUnlocked,
    isEncryptionActive,
    hasPassphrase,
    unlockWithPassword,
    unlockWithDeviceKey,
    enable,
    disable,
    change,
    needsUnlock,
  }
})
