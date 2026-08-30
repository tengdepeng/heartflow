// ============================================================
// 劳酬 · 轻量加密基础工具（INCR-31 数据安全）
// 自包含纯 JS（无 WebCrypto 依赖），确定性、可测试、可移植。
// 强度说明：本应用数据存于本地明文 JSON，此工具提供「本地混淆级」
// 加密（哈希派生密钥 + RC4 流），用于隐私锁密码指纹与账本加密备份。
// ============================================================

/** FNV-1a 32 位哈希（确定性） */
export function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** 迭代哈希：以 (盐 + counter) 反复扰动，输出 8 位 hex */
export function hashHex(key: string, salt: string, rounds = 512): string {
  let h = fnv1a(`${salt}|${key}`)
  let s = salt + ':' + key
  for (let i = 0; i < rounds; i++) {
    s = `${h.toString(16)}|${s}`
    h = (Math.imul(fnv1a(s), 0x9e3779b1) ^ h) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** 由口令材料派生定长字节数组（扩展哈希） */
export function deriveBytes(keyMaterial: string, len: number): Uint8Array {
  const out = new Uint8Array(len)
  let block = keyMaterial + ':'
  for (let i = 0; i < len; i++) {
    block += hashHex(block + '|' + i, keyMaterial, 64)
    out[i] = (fnv1a(block) + block.length) & 0xff
  }
  return out
}

/** RC4 密钥调度 + 伪随机流（确定性） */
export function rc4Keystream(len: number, key: Uint8Array): Uint8Array {
  const s = new Uint8Array(256)
  for (let i = 0; i < 256; i++) s[i] = i
  let j = 0
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 0xff
    const t = s[i]; s[i] = s[j]; s[j] = t
  }
  const out = new Uint8Array(len)
  let i = 0
  j = 0
  for (let k = 0; k < len; k++) {
    i = (i + 1) & 0xff
    j = (j + s[i]) & 0xff
    const t = s[i]; s[i] = s[j]; s[j] = t
    out[k] = s[(s[i] + s[j]) & 0xff]
  }
  return out
}

/** UTF-8 编解码（带 BOM 剥离与容错） */
export function utf8Encode(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

export function utf8Decode(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

/** 字节 → base64（标准 RFC4648） */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i]
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : 0
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : 0
    out += B64_CHARS[b0 >> 2]
    out += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)]
    out += i + 1 < bytes.length ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '='
    out += i + 2 < bytes.length ? B64_CHARS[b2 & 63] : '='
  }
  return out
}

/** base64 → 字节（标准 RFC4648） */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/=+$/, '')
  const len = clean.length
  const out = new Uint8Array(Math.floor((len * 3) / 4))
  let oi = 0
  let buff = 0
  let bits = 0
  for (let i = 0; i < len; i++) {
    const v = B64_CHARS.indexOf(clean[i])
    if (v < 0) continue
    buff = (buff << 6) | v
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[oi++] = (buff >> bits) & 0xff
    }
  }
  return out.subarray(0, oi)
}

/** 简单随机盐（本地用途，不依赖 crypto API） */
export function randomSalt(): string {
  return (
    Math.floor(Math.random() * 0xffffffff).toString(16) +
    Date.now().toString(16)
  )
}