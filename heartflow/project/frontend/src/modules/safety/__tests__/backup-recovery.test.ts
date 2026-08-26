import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storage } from '../../../engine/storage'
import { useBackupRecovery } from '../backup-recovery'
import type { BackupSnapshot } from '../backup-recovery'

describe('useBackupRecovery 落库与恢复', () => {
  beforeEach(() => {
    storage.clear()
    vi.restoreAllMocks()
  })

  it('createBackup 经 storage.setKV 落库备份体（不再裸 localStorage 游离）', async () => {
    storage.setKV('hf:config', { theme: 'dark' })
    storage.setKV('hf:note', { text: 'hello' })

    const setSpy = vi.spyOn(storage, 'setKV')
    const { createBackup } = useBackupRecovery()
    const meta = await createBackup('full', '测试备份')
    expect(meta).not.toBeNull()

    // 断言备份数据体严格经 storage.setKV 写入（key 形如 hf:backup_）
    expect(setSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^hf:backup_/),
      expect.anything(),
    )

    const backupKey = `hf:backup_${meta!.id}`
    const snapshot = storage.getKV<BackupSnapshot | null>(backupKey, null)
    expect(snapshot).not.toBeNull()
    expect(snapshot!.data['hf:config']).toEqual({ theme: 'dark' })
    expect(snapshot!.data['hf:note']).toEqual({ text: 'hello' })
    // 备份元数据同样经 setKV 落库
    expect(storage.getKV('hf:safety_backups', null)).not.toBeNull()
  })

  it('restoreBackup 经 storage.setKV 将备份数据还原回存储（对象形态对称）', async () => {
    storage.setKV('hf:config', { theme: 'dark' })

    const { createBackup, restoreBackup } = useBackupRecovery()
    const meta = await createBackup('full')
    const backupKey = `hf:backup_${meta!.id}`
    const backupBody = storage.getKV<BackupSnapshot | null>(backupKey, null)

    // 模拟用户数据丢失，仅保留备份体
    storage.clear()
    storage.setKV(backupKey, backupBody!)

    const result = await restoreBackup(meta!.id)
    expect(result.success).toBe(true)
    expect(result.restored).toBeGreaterThan(0)
    expect(storage.getKV('hf:config', null)).toEqual({ theme: 'dark' })
  })

  it('deleteBackup 经 storage.removeKV 移除落库备份数据体', async () => {
    storage.setKV('hf:config', { n: 1 })
    const { createBackup, deleteBackup } = useBackupRecovery()
    const meta = await createBackup('full')
    const backupKey = `hf:backup_${meta!.id}`
    expect(storage.getKV(backupKey, null)).not.toBeNull()

    const ok = deleteBackup(meta!.id)
    expect(ok).toBe(true)
    expect(storage.getKV(backupKey, null)).toBeNull()
  })

  it('cleanupOldBackups 仅保留最近 N 个备份体', async () => {
    storage.setKV('hf:config', { n: 1 })
    const { createBackup, cleanupOldBackups, backups } = useBackupRecovery()
    for (let i = 0; i < 7; i++) {
      await createBackup('full', `b${i}`)
    }
    expect(backups.value.length).toBe(7)

    cleanupOldBackups(3)
    expect(backups.value.length).toBe(3)

    const remaining = Object.keys(storage.exportAllData().kvStore).filter(k =>
      k.startsWith('hf:backup_'),
    ).length
    expect(remaining).toBe(3)
  })

  it('getBackupSnapshot 经 storage.getKV 取回备份快照对象', async () => {
    storage.setKV('hf:config', { x: 1 })
    const { createBackup, getBackupSnapshot } = useBackupRecovery()
    const meta = await createBackup('full')
    const snap = getBackupSnapshot(meta!.id)
    expect(snap).not.toBeNull()
    expect(snap!.metadata.id).toBe(meta!.id)
    expect(snap!.data['hf:config']).toEqual({ x: 1 })
  })
})
