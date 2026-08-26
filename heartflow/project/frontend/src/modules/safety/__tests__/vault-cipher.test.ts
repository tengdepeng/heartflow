// ============================================================
// 保险库口令加密 · 测试
// 使用 Node 真实 Web Crypto（globalThis.crypto.subtle）做往返验证
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  encryptWithPassphrase,
  decryptWithPassphrase,
  VaultDecryptError,
} from '../vault-cipher'

describe('vault-cipher', () => {
  it('往返：加密后可用同一口令解密还原', async () => {
    const secret = '我的资产明细：银行卡尾号 8891，房产证在书房抽屉'
    const payload = await encryptWithPassphrase(secret, 'correct horse battery')
    expect(payload.v).toBe(1)
    expect(typeof payload.salt).toBe('string')
    expect(typeof payload.iv).toBe('string')
    expect(typeof payload.data).toBe('string')
    expect(payload.data.length).toBeGreaterThan(0)

    const back = await decryptWithPassphrase(payload, 'correct horse battery')
    expect(back).toBe(secret)
  })

  it('不同口令解密失败（抛 VaultDecryptError）', async () => {
    const payload = await encryptWithPassphrase('敏感内容', 'right-pass')
    await expect(decryptWithPassphrase(payload, 'wrong-pass')).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it('篡改密文后解密失败', async () => {
    const payload = await encryptWithPassphrase('原始内容', 'p@ss')
    const tampered = { ...payload, data: payload.data.slice(0, -2) + 'AA' }
    await expect(decryptWithPassphrase(tampered, 'p@ss')).rejects.toBeInstanceOf(
      VaultDecryptError,
    )
  })

  it('两次加密同一内容产生不同盐/IV（随机化）', async () => {
    const a = await encryptWithPassphrase('x', 'k')
    const b = await encryptWithPassphrase('x', 'k')
    expect(a.salt).not.toBe(b.salt)
    expect(a.iv).not.toBe(b.iv)
    expect(a.data).not.toBe(b.data)
  })

  it('空字符串也能正确往返', async () => {
    const payload = await encryptWithPassphrase('', 'k')
    expect(await decryptWithPassphrase(payload, 'k')).toBe('')
  })
})
