// ============================================================
// 备份恢复测试
// ============================================================
import { describe, expect, it, vi } from 'vitest'
import { createBackup, restoreFromBackup } from '../backup-restore'

// 模拟 vault-cipher 的加密/解密，使用 passphrase 作为校验
vi.mock('../../safety/vault-cipher', () => {
  const VaultDecryptError = class extends Error {
    constructor() {
      super('VAULT_DECRYPT_FAILED')
      this.name = 'VaultDecryptError'
    }
  }

  // 存储 passphrase -> encoded data 映射
  const passStore = new Map<string, string>()

  return {
    VaultDecryptError,
    async encryptWithPassphrase(data: string, passphrase: string) {
      const encoded = btoa(unescape(encodeURIComponent(data)))
      passStore.set(passphrase, encoded)
      return { v: 1, salt: 'mock', iv: 'mock', data: encoded }
    },
    async decryptWithPassphrase(_payload: { data: string }, passphrase: string) {
      const stored = passStore.get(passphrase)
      if (!stored) {
        throw new VaultDecryptError()
      }
      return decodeURIComponent(escape(atob(stored)))
    },
  }
})

const samplePayload = { v: 1, salt: 's', iv: 'iv', data: 'encrypted-data' } as any

function makeFile(content: string, name = 'backup.vault'): File {
  return new File([content], name, { type: 'application/json' })
}

describe('createBackup', () => {
  it('创建可下载的 Blob', async () => {
    const blob = await createBackup(samplePayload, 'test-pass')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/json')
  })

  it('创建的备份包含元数据', async () => {
    const blob = await createBackup(samplePayload, 'test-pass')
    const text = await blob.text()
    const parsed = JSON.parse(text)
    expect(parsed.v).toBe(1)
  })
})

describe('restoreFromBackup', () => {
  it('从有效备份文件恢复', async () => {
    const blob = await createBackup(samplePayload, 'test-pass')
    const file = makeFile(await blob.text())
    const result = await restoreFromBackup(file, 'test-pass')
    expect(result.success).toBe(true)
    expect(result.data).toEqual(samplePayload)
  })

  it('口令错误时返回错误', async () => {
    const blob = await createBackup(samplePayload, 'test-pass')
    const file = makeFile(await blob.text())
    const result = await restoreFromBackup(file, 'wrong-pass')
    expect(result.success).toBe(false)
    expect(result.error).toContain('口令错误')
  })

  it('无效文件返回错误', async () => {
    const file = makeFile('not valid json', 'bad.vault')
    const result = await restoreFromBackup(file, 'pass')
    expect(result.success).toBe(false)
    expect(result.error).toBeTruthy()
  })
})