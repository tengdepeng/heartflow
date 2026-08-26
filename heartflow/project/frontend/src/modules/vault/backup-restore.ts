// ============================================================
// 保险库 · 加密备份与恢复
// 借鉴 KeePass 备份机制：导出加密的 JSON 备份文件，
// 可下载到本地或从本地恢复。
// 全部本地实现，不依赖任何外部 API，守宪法第1条本地私有。
// ============================================================

import { encryptWithPassphrase, decryptWithPassphrase, VaultDecryptError } from '../safety/vault-cipher'
import type { VaultCipherPayload } from '../safety/vault-cipher'

export interface BackupMeta {
  version: number
  createdAt: string
  appName: 'Heartflow'
  type: 'vault-backup'
}

export const BACKUP_VERSION = 1
export const MAX_BACKUP_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * 创建加密备份包。
 * payload: 当前的密文载荷
 * passphrase: 用于加密备份的口令（可与 vault 主口令不同）
 * 返回可下载的 Blob。
 */
export async function createBackup(
  payload: VaultCipherPayload,
  passphrase: string,
): Promise<Blob> {
  const backupPackage = {
    meta: {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appName: 'Heartflow' as const,
      type: 'vault-backup' as const,
    },
    payload,
  }

  const json = JSON.stringify(backupPackage)
  const encrypted = await encryptWithPassphrase(json, passphrase)
  const blob = new Blob([JSON.stringify(encrypted)], { type: 'application/json' })
  return blob
}

export interface BackupRestoreResult {
  success: boolean
  data: VaultCipherPayload | null
  error?: string
}

/**
 * 从加密备份文件恢复。
 * file: 用户选择的备份文件（File 对象）
 * passphrase: 备份时使用的口令
 * 返回解密后的载荷，或错误信息。
 */
export async function restoreFromBackup(
  file: File,
  passphrase: string,
): Promise<BackupRestoreResult> {
  // 文件大小校验
  if (file.size > MAX_BACKUP_FILE_SIZE) {
    return { success: false, data: null, error: '备份文件过大（超过 10MB）' }
  }

  let encryptedJson: string
  try {
    encryptedJson = await file.text()
  } catch {
    return { success: false, data: null, error: '无法读取备份文件' }
  }

  // 解析加密载荷
  let cipherPayload: VaultCipherPayload
  try {
    cipherPayload = JSON.parse(encryptedJson)
  } catch {
    return { success: false, data: null, error: '备份文件格式不正确' }
  }

  // 尝试验证是否合法的加密载荷结构
  if (!cipherPayload || typeof cipherPayload !== 'object') {
    return { success: false, data: null, error: '备份文件格式不正确' }
  }

  // 解密
  let decryptedJson: string
  try {
    decryptedJson = await decryptWithPassphrase(cipherPayload, passphrase)
  } catch (e) {
    if (e instanceof VaultDecryptError) {
      return { success: false, data: null, error: '备份口令错误' }
    }
    return { success: false, data: null, error: '解密失败：文件可能已损坏' }
  }

  // 解析备份包结构
  let backupPackage: { meta: BackupMeta; payload: VaultCipherPayload }
  try {
    backupPackage = JSON.parse(decryptedJson)
  } catch {
    return { success: false, data: null, error: '备份文件数据损坏' }
  }

  // 校验备份包元数据
  if (!backupPackage.meta || backupPackage.meta.type !== 'vault-backup') {
    return { success: false, data: null, error: '不是有效的保险库备份文件' }
  }

  if (!backupPackage.payload) {
    return { success: false, data: null, error: '备份文件中没有数据' }
  }

  return { success: true, data: backupPackage.payload }
}

/**
 * 下载备份文件到本地。
 */
export function downloadBackup(blob: Blob, filename?: string): void {
  const name = filename || `heartflow-vault-backup-${new Date().toISOString().slice(0, 10)}.vault`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}