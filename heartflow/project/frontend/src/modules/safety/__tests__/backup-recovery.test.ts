import { describe, it, expect, beforeEach, vi } from 'vitest'
import { storage } from '../../../engine/storage'
import { useBackupRecovery } from '../backup-recovery'

describe('useBackupRecovery 加密落库与恢复', () => {
  beforeEach(() => {
    storage.clear()
    vi.restoreAllMocks()
  })

  it('createBackup 经 storage.setKV 落库 vault-cipher 密文载荷（非明文）', async () => {
    storage.setKV('hf:config', { theme: 'dark' })
    storage.setKV('hf:note', { text: 'hello' })

    const setSpy = vi.spyOn(storage, 'setKV')
    const { createBackup, getBackupSnapshot } = useBackupRecovery()
    const meta = await createBackup('full', '测试备份', 'test-pass')
    expect(meta).not.toBeNull()

    expect(setSpy).toHaveBeenCalledWith(
      expect.stringMatching(/^hf:backup_/),
      expect.anything(),
    )

    const backupKey = `hf:backup_${meta!.id}`
    const payload = storage.getKV<any>(backupKey, null)
    // 落库的是密文载荷（vault-cipher 形态），不是 {metadata,data} 明文
    expect(payload).not.toBeNull()
    expect(payload.v).toBe(1)
    expect(payload.data).toEqual(expect.any(String)) // base64 密文
    expect(payload.metadata).toBeUndefined() // 明文 metadata 不应直接暴露

    // 正确口令可解密还原
    const snapshot = await getBackupSnapshot(meta!.id, 'test-pass')
    expect(snapshot).not.toBeNull()
    expect(snapshot!.data['hf:config']).toEqual({ theme: 'dark' })
    expect(snapshot!.data['hf:note']).toEqual({ text: 'hello' })
  })

  it('restoreBackup 正确口令还原数据', async () => {
    storage.setKV('hf:config', { theme: 'dark' })
    const { createBackup, restoreBackup } = useBackupRecovery()
    const meta = await createBackup('full', undefined, 'test-pass')
    const backupKey = `hf:backup_${meta!.id}`
    const backupBody = storage.getKV(backupKey, null)

    storage.clear()
    storage.setKV(backupKey, backupBody!)

    const result = await restoreBackup(meta!.id, 'test-pass')
    expect(result.success).toBe(true)
    expect(result.restored).toBeGreaterThan(0)
    expect(storage.getKV('hf:config', null)).toEqual({ theme: 'dark' })
  })

  it('restoreBackup 错误口令无法解密', async () => {
    storage.setKV('hf:config', { theme: 'dark' })
    const { createBackup, restoreBackup } = useBackupRecovery()
    const meta = await createBackup('full', undefined, 'test-pass')

    const result = await restoreBackup(meta!.id, 'wrong-pass')
    expect(result.success).toBe(false)
    expect(result.errors.join('')).toContain('备份口令错误')
  })

  it('deleteBackup 经 storage.removeKV 移除密文载荷', async () => {
    storage.setKV('hf:config', { n: 1 })
    const { createBackup, deleteBackup } = useBackupRecovery()
    const meta = await createBackup('full', undefined, 'test-pass')
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
      await createBackup('full', `b${i}`, 'test-pass')
    }
    expect(backups.value.length).toBe(7)

    cleanupOldBackups(3)
    expect(backups.value.length).toBe(3)

    const remaining = Object.keys(storage.exportAllData().kvStore).filter(k =>
      k.startsWith('hf:backup_'),
    ).length
    expect(remaining).toBe(3)
  })

  it('getBackupSnapshot 错误口令返回 null', async () => {
    storage.setKV('hf:config', { x: 1 })
    const { createBackup, getBackupSnapshot } = useBackupRecovery()
    const meta = await createBackup('full', undefined, 'test-pass')
    const snap = await getBackupSnapshot(meta!.id, 'test-pass')
    expect(snap).not.toBeNull()
    expect(snap!.metadata.id).toBe(meta!.id)
    expect(snap!.data['hf:config']).toEqual({ x: 1 })

    const wrong = await getBackupSnapshot(meta!.id, 'wrong-pass')
    expect(wrong).toBeNull()
  })
})
