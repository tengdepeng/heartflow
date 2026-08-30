// ============================================================
// 劳酬 · 数据加密（INCR-31 数据安全）
// 账本加密备份 / 恢复。自包含轻量加密：
//   口令+盐 派生字节密钥 → RC4 流加密 → base64。
// 前置固定魔法标记用于校验口令正确性与完整性。
// 纯函数引擎 + 存储读写（hf:reward_encrypted_backup）。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import {
  utf8Encode,
  utf8Decode,
  bytesToBase64,
  base64ToBytes,
  deriveBytes,
  rc4Keystream,
  randomSalt,
} from './crypto-utils'
import { REWARD_STORAGE_KEYS } from './types'
import type { RewardRecord } from './reward-list'

/** 加密载荷 */
export interface EncryptedBox {
  v: 1
  algo: 'rc4'
  salt: string
  ct: string
}

/** 加密备份快照（含标签与时间） */
export interface EncryptedBackup {
  label: string
  savedAt: string
  box: EncryptedBox
}

const MAGIC = 'HFENC01'
const BACKUP_KEY = REWARD_STORAGE_KEYS.ENCRYPTED_BACKUP

// ---- 纯函数 ----

function boxKey(password: string, salt: string): Uint8Array {
  return deriveBytes(`${password}|${salt}`, 256)
}

/** 加密纯文本 → EncryptedBox（salt 缺省随机） */
export function encryptText(plain: string, password: string, salt?: string): EncryptedBox {
  const s = salt || randomSalt()
  const payload = utf8Encode(MAGIC + plain)
  const key = boxKey(password, s)
  const stream = rc4Keystream(payload.length, key)
  const ct = new Uint8Array(payload.length)
  for (let i = 0; i < payload.length; i++) ct[i] = payload[i] ^ stream[i]
  return { v: 1, algo: 'rc4', salt: s, ct: bytesToBase64(ct) }
}

/** 解密 EncryptedBox → 明文；口令错误/完整性被破坏返回 null */
export function decryptText(box: EncryptedBox, password: string): string | null {
  if (!box || typeof box.ct !== 'string') return null
  const key = boxKey(password, box.salt)
  const data = base64ToBytes(box.ct)
  const stream = rc4Keystream(data.length, key)
  const pt = new Uint8Array(data.length)
  for (let i = 0; i < data.length; i++) pt[i] = data[i] ^ stream[i]
  let str: string
  try {
    str = utf8Decode(pt)
  } catch {
    return null
  }
  if (!str.startsWith(MAGIC)) return null
  return str.slice(MAGIC.length)
}

/** 加密记录列表 → 文本（用于文件导出） */
export function encryptRecords(records: RewardRecord[], password: string, salt?: string): EncryptedBox {
  return encryptText(JSON.stringify(records), password, salt)
}

/** 解密记录列表；失败返回 null */
export function decryptRecords(box: EncryptedBox, password: string): RewardRecord[] | null {
  const plain = decryptText(box, password)
  if (plain === null) return null
  try {
    const arr = JSON.parse(plain)
    if (!Array.isArray(arr)) return null
    return arr as RewardRecord[]
  } catch {
    return null
  }
}

/** 序列化为可下载 JSON 文本 */
export function boxToJson(box: EncryptedBox): string {
  return JSON.stringify(box)
}

/** 从 JSON 文本恢复 EncryptedBox；非法返回 null */
export function boxFromJson(json: string): EncryptedBox | null {
  try {
    const b = JSON.parse(json) as EncryptedBox
    if (b && b.v === 1 && b.algo === 'rc4' && typeof b.ct === 'string') return b
  } catch {
    /* noop */
  }
  return null
}

// ---- 存储读写 ----

export function useDataEncryption() {
  const backup = ref<EncryptedBackup | null>(
    storage.getKV<EncryptedBackup | null>(BACKUP_KEY, null),
  )

  function persist(): void {
    storage.setKV(BACKUP_KEY, backup.value)
  }
  function load(): void {
    backup.value = storage.getKV<EncryptedBackup | null>(BACKUP_KEY, null)
  }

  /** 加密并保存账本快照 */
  function saveBackup(records: RewardRecord[], password: string, label?: string): boolean {
    if (!password) return false
    backup.value = {
      label: label || '账本加密备份',
      savedAt: new Date().toISOString(),
      box: encryptRecords(records, password),
    }
    persist()
    return true
  }

  /** 用口令恢复备份；口令错误返回 null */
  function restoreBackup(password: string): RewardRecord[] | null {
    if (!backup.value) return null
    return decryptRecords(backup.value.box, password)
  }

  function clearBackup(): void {
    backup.value = null
    storage.setKV(BACKUP_KEY, null)
  }

  function backupText(): string | null {
    return backup.value ? boxToJson(backup.value.box) : null
  }

  return { backup, saveBackup, restoreBackup, clearBackup, backupText, load }
}