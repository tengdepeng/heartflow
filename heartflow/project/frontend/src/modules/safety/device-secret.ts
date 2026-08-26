// ============================================================
// 设备绑定密钥（B0 兜底解锁）
// ------------------------------------------------------------
// 蓝图 B0「口令优先 + 设备绑定兜底」的兜底层：
// 即使主人忘记本地存储口令，本机仍可用设备密钥解锁（device 密文），
// 避免「口令丢失 = 数据永久不可读」的死局。
//
// 安全语义：
// - 设备密钥仅防「存储文件被拷走 / 落入同步盘」这类离线泄露；
// - 同机其他用户/进程仍可读（本机文件本就可读），因此它是「兜底」而非「主防护」；
// - 主防护仍是用户口令（primary 密文，PBKDF2 + AES-GCM-256）。
// ============================================================

import { isTauri } from '../../utils/platform'

const DEVICE_SECRET_KEY = 'hf:device_secret'
const PBKDF2_ITERATIONS = 150_000
// 固定 salt（device secret 本身随机，salt 无需随机）
const DEVICE_SALT = new TextEncoder().encode('heartflow-device-').slice(0, 16)

function randomSecret(): string {
  const buf = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * 获取设备密钥源字符串（持久化、本机可读）。
 * - Tauri：优先 invoke('cmd_get_device_secret')，由 Rust 端生成本机持久化 secret；
 *          命令缺失时降级到 webview localStorage（本机仍可读，语义不变）。
 * - Web：首次随机生成并存入 localStorage。
 */
export async function getDeviceSecret(): Promise<string> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const s = await invoke<string>('cmd_get_device_secret')
      if (s) return s
    } catch {
      // Rust 命令缺失 → 降级 localStorage
    }
  }
  let s = localStorage.getItem(DEVICE_SECRET_KEY)
  if (!s) {
    s = randomSecret()
    localStorage.setItem(DEVICE_SECRET_KEY, s)
  }
  return s
}

/** 由设备 secret 派生 AES-GCM-256 密钥（兜底解锁用）。 */
export async function getDeviceKey(): Promise<CryptoKey> {
  const secret = await getDeviceSecret()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: DEVICE_SALT, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}
