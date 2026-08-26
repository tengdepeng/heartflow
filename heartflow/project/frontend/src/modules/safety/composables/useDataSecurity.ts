// ============================================================
// 数据安全 composable
// 提供数据加密/解密、备份、清除等数据安全能力
// ============================================================

import { ref } from 'vue'
import { storage } from '../../../engine/storage'

export interface BackupStatus {
  lastBackupTime: number | null
  backupCount: number
  totalSize: number
}

const BACKUP_STATUS_KEY = 'hf:backup_status'

const DEFAULT_BACKUP_STATUS: BackupStatus = {
  lastBackupTime: null,
  backupCount: 0,
  totalSize: 0,
}

/**
 * 加载备份状态
 */
function loadBackupStatus(): BackupStatus {
  try {
    return storage.getKV<BackupStatus>(BACKUP_STATUS_KEY, DEFAULT_BACKUP_STATUS)
  } catch {
    return { ...DEFAULT_BACKUP_STATUS }
  }
}

/**
 * 保存备份状态
 */
function saveBackupStatus(status: BackupStatus) {
  storage.setKV(BACKUP_STATUS_KEY, status)
}

/**
 * 使用 btoa/atob 模拟加密（本地环境，实际加密由平台层处理）
 */
export function encryptData(data: string): string {
  try {
    return btoa(encodeURIComponent(data))
  } catch {
    return data
  }
}

/**
 * 解密数据
 */
export function decryptData(encrypted: string): string {
  try {
    return decodeURIComponent(atob(encrypted))
  } catch {
    return encrypted
  }
}

/**
 * 备份数据 — 导出所有 localStorage 数据为 JSON 并下载
 */
export function backupData(): void {
  const data: Record<string, string | null> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        data[key] = localStorage.getItem(key)
      }
    }
  } catch {
    // localStorage 不可用时静默回退
  }

  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `heartflow-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)

  // 更新备份状态
  const status = loadBackupStatus()
  status.lastBackupTime = Date.now()
  status.backupCount++
  status.totalSize = new Blob([json]).size
  saveBackupStatus(status)
  backupStatus.value = status
}

/**
 * 备份状态（响应式）
 */
export const backupStatus = ref<BackupStatus>(loadBackupStatus())

/**
 * 获取备份状态
 */
export function getBackupStatus(): BackupStatus {
  return backupStatus.value
}

/**
 * 清除所有数据（用户确认后）
 * @returns 是否执行了清除
 */
export function clearData(): boolean {
  const confirmed = confirm('确定要清除所有本地数据吗？此操作不可撤销。')
  if (!confirmed) return false

  try {
    localStorage.clear()
  } catch {
    // localStorage 不可用时静默回退
  }

  // 重置备份状态
  const status: BackupStatus = { ...DEFAULT_BACKUP_STATUS }
  saveBackupStatus(status)
  backupStatus.value = status

  return true
}

/**
 * 格式化备份时间
 */
export function formatBackupTime(timestamp: number | null): string {
  if (timestamp === null) return '从未备份'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (hours < 1) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 使用数据安全功能
 */
export function useDataSecurity() {
  return {
    backupStatus,
    encryptData,
    decryptData,
    backupData,
    getBackupStatus,
    clearData,
    formatBackupTime,
  }
}