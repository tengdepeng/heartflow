// ============================================================
// 存储信封加密（B0 整库加密工具）
// ------------------------------------------------------------
// 复用 vault-cipher 的成熟 AES-GCM-256 能力，把「整库 JSON」封装为
// 双密文信封：
//   - primary：用户口令加密（主防护，PBKDF2 派生）
//   - device ：设备密钥加密（兜底，防口令丢失锁死）
//
// 本模块只做纯函数编解码，不持有运行时状态；密钥/解锁编排在
// core.ts 与 unlock store 中完成（避免循环依赖）。
// ============================================================

import {
  encryptWithPassphrase,
  decryptWithPassphrase,
  VaultCipherPayload,
} from './vault-cipher'

const SALT_BYTES = 16
const IV_BYTES = 12

/** 加密存储信封（持久化结构）。 */
export interface StorageEnvelope {
  __hf_enc: 1
  primary: VaultCipherPayload
  device: VaultCipherPayload
}

function bufToB64(buf: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i])
  return btoa(bin)
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** 用已有派生密钥（设备兜底）加密明文为密文载荷。 */
async function encryptWithKey(plaintext: string, key: CryptoKey): Promise<VaultCipherPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  )
  return { v: 1, salt: bufToB64(salt), iv: bufToB64(iv), data: bufToB64(new Uint8Array(ct)) }
}

/** 用设备派生密钥解密 device 密文（仅兜底路径，失败抛 VaultDecryptError）。 */
export async function decryptWithDeviceKey(payload: VaultCipherPayload, key: CryptoKey): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
    key,
    b64ToBytes(payload.data),
  )
  return new TextDecoder().decode(pt)
}

/** 整库加密：同一明文同时用口令（primary）与设备密钥（device）加密，落盘为信封。 */
export async function encryptEnvelope(plaintext: string, pw: string, devKey: CryptoKey): Promise<StorageEnvelope> {
  const [primary, device] = await Promise.all([
    encryptWithPassphrase(plaintext, pw),
    encryptWithKey(plaintext, devKey),
  ])
  return { __hf_enc: 1, primary, device }
}

export function isEncryptedPayload(raw: unknown): raw is StorageEnvelope {
  return (
    !!raw &&
    typeof raw === 'object' &&
    (raw as { __hf_enc?: unknown }).__hf_enc === 1 &&
    !!(raw as { primary?: unknown }).primary &&
    !!(raw as { device?: unknown }).device
  )
}

export { decryptWithPassphrase }
