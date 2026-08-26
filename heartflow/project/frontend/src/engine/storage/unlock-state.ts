// ============================================================
// 存储解锁状态（内存权威源）
// ------------------------------------------------------------
// B0 加密存储的核心内存状态。口令明文与派生密钥**绝不持久化**，
// 仅存于运行时内存；应用关闭 / 锁屏即清空，下次启动需重新解锁。
//
// 与 UI 的解耦：core.ts（引擎层）直接读取本模块状态决定加解密；
// Pinia 的 unlock store 仅镜像本模块供界面响应式展示，不持有真理。
// ============================================================

import { ref } from 'vue'

/** 当前解锁口令（内存，不持久化）。null = 未解锁。 */
export const passphrase = ref<string | null>(null)
/** 当前设备兜底密钥（内存，不持久化）。 */
export const deviceKey = ref<CryptoKey | null>(null)
/** 内存是否已持有可用密钥（口令或设备）。 */
export const unlocked = ref(false)
/** 磁盘存储当前是否处于加密态（文件含 __hf_enc 信封）。lock 不清它。 */
export const encryptionActive = ref(false)

/** 解锁成功后写入内存状态（口令优先；设备兜底时口令为 null）。 */
export function setUnlockedState(opts: {
  passphrase: string | null
  deviceKey: CryptoKey | null
  encryptionActive: boolean
}): void {
  passphrase.value = opts.passphrase
  deviceKey.value = opts.deviceKey
  encryptionActive.value = opts.encryptionActive
  unlocked.value = true
}

/** 主动锁定：清空内存密钥，但保留 encryptionActive（文件仍加密）。 */
export function clearUnlockedState(): void {
  passphrase.value = null
  deviceKey.value = null
  unlocked.value = false
}

/** 存储文件加密态变化（启用/关闭后由存储层回写）。 */
export function setEncryptionActive(v: boolean): void {
  encryptionActive.value = v
}
