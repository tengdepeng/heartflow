// ============================================================
// 保险库口令加密（Vault Cipher）
// ------------------------------------------------------------
// 蓝图附录 F 将「保险库」定位为「本地加密资产」。
// 本模块提供基于用户口令的静态加密：PBKDF2(SHA-256) 从口令派生
// AES-GCM-256 密钥，密钥仅存在于内存（解锁后），密文 + 盐 + IV
// 落盘。即使存储文件泄露，无口令也无法还原内容。
//
// 实现集中在 modules/safety（项目加密基建所在），避免重复造轮子，
// 也与 crypto-guard 的 Web Crypto 封装保持同处。
// ============================================================

const PBKDF2_ITERATIONS = 150_000
const SALT_BYTES = 16
const IV_BYTES = 12

/** 密文载荷（持久化结构）。salt/iv/data 均为 base64。 */
export interface VaultCipherPayload {
  v: 1
  salt: string
  iv: string
  data: string
}

export class VaultDecryptError extends Error {
  constructor() {
    super('VAULT_DECRYPT_FAILED')
    this.name = 'VaultDecryptError'
  }
}

function bufToB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let bin = ''
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
  return btoa(bin)
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** 用口令加密明文，返回可持久化的密文载荷。 */
export async function encryptWithPassphrase(
  plaintext: string,
  passphrase: string,
): Promise<VaultCipherPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const key = await deriveKey(passphrase, salt)
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return {
    v: 1,
    salt: bufToB64(salt),
    iv: bufToB64(iv),
    data: bufToB64(new Uint8Array(ciphertext)),
  }
}

/**
 * 用口令解密密文载荷。
 * 口令错误或数据被篡改会抛 VaultDecryptError。
 */
export async function decryptWithPassphrase(
  payload: VaultCipherPayload,
  passphrase: string,
): Promise<string> {
  const key = await deriveKey(passphrase, b64ToBytes(payload.salt))
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
      key,
      b64ToBytes(payload.data),
    )
    return new TextDecoder().decode(plaintext)
  } catch {
    throw new VaultDecryptError()
  }
}
