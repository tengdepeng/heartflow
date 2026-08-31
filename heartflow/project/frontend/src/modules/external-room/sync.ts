// ============================================================
// 外链房 · 云同步 — 加密快照编排
//
// 复用既有基建，不另造轮子：
//   - 全量数据导出：engine/data-port 的 exportAllJSON / importJSON（additive merge）
//   - 口令加密：   modules/safety/vault-cipher 的 encryptWithPassphrase / decryptWithPassphrase
//   - 写盘 I/O：   本目录 sync-fs.ts（Tauri 直写 / 浏览器 FS Access / 手动降级）
//   - 配置持久化： engine/storage 的 KV
//
// 快照结构 SyncFilePayload = { appId, format, syncedAt, device, ciphertext }
// ciphertext 为 exportAllJSON() 经口令 AES-GCM 加密后的密文载荷。
//
// 冲突策略（本期）：additive merge——远端存在的记录若本地没有则补入，
// 本地已有记录不覆盖（避免误删）；不做 tombstone 级全量同步（蓝图留待后续）。
// 时间戳仅用于状态展示与「远端是否比上次已知更新」的轻量判断。
// ============================================================

import { storage } from '../../engine/storage'
import { exportAllJSON, importJSON } from '../../engine/data-port'
import {
  encryptWithPassphrase,
  decryptWithPassphrase,
  VaultDecryptError,
  type VaultCipherPayload,
} from '../../modules/safety/vault-cipher'
import {
  pickSyncDirectory,
  writeSyncFile,
  readSyncFile,
  isDirectWriteSupported,
  SyncFsUnavailableError,
  type SyncTarget,
} from './sync-fs'

// ---- KV 键 ----

const KV_DIR = 'sync:dir' // path 形态时持久化目录路径（handle 形态不持久化）
const KV_LAST_PUSH = 'sync:lastPush'
const KV_LAST_PULL = 'sync:lastPull'
const KV_LAST_REMOTE = 'sync:lastRemoteAt'
const KV_LAST_ERROR = 'sync:lastError'

// ---- 类型 ----

/** 落盘的加密快照载荷 */
export interface SyncFilePayload {
  appId: 'heartflow'
  format: 'sync-v1'
  /** 生成时间 ISO；跨设备比较用 */
  syncedAt: string
  /** 来源设备友好名（可选，仅展示） */
  device: string
  /** exportAllJSON() 经口令加密后的密文 */
  ciphertext: VaultCipherPayload
}

export interface SyncStatus {
  /** 当前环境是否支持直写（Tauri / FS Access） */
  supported: boolean
  /** 最近一次推送时间 */
  lastPushAt: string | null
  /** 最近一次拉取合并时间 */
  lastPullAt: string | null
  /** 最近一次已知远端快照时间（用于轻量冲突判断） */
  lastRemoteAt: string | null
  /** 最近一次错误原因（null = 无） */
  lastError: string | null
  /** 已配置的同步目录（仅 path 形态可持久化） */
  directory: string | null
}

export interface PushResult {
  ok: boolean
  reason?: 'fs-unavailable' | 'empty-passphrase'
  syncedAt: string
}

export interface PullResult {
  ok: boolean
  reason?: 'fs-unavailable' | 'no-file' | 'wrong-passphrase' | 'parse-error' | 'empty-passphrase'
  /** 远端快照时间 */
  syncedAt?: string
  /** 是否已执行合并 */
  imported?: boolean
}

// ---- 目录配置 ----

export function getSyncDirectory(): string | null {
  return storage.getKV<string | null>(KV_DIR, null)
}

export function setSyncDirectory(path: string | null): void {
  if (path) storage.setKV(KV_DIR, path)
  else storage.removeKV(KV_DIR)
}

export { isDirectWriteSupported, pickSyncDirectory }
export type { SyncTarget } from './sync-fs'

// ---- 快照构建 / 解析 ----

/** 用同步口令把当前全量数据加密成快照载荷。device 可选。 */
export async function buildSnapshot(passphrase: string, device = ''): Promise<SyncFilePayload> {
  const json = exportAllJSON()
  const ciphertext = await encryptWithPassphrase(json, passphrase)
  return {
    appId: 'heartflow',
    format: 'sync-v1',
    syncedAt: new Date().toISOString(),
    device,
    ciphertext,
  }
}

/** 序列化为可落盘 / 可下载的文本 */
export function serializeSnapshot(payload: SyncFilePayload): string {
  return JSON.stringify(payload, null, 2)
}

/** 解析并校验快照文本；非法结构抛 Error。 */
export function parseSnapshot(text: string): SyncFilePayload {
  let p: unknown
  try {
    p = JSON.parse(text)
  } catch {
    throw new Error('SYNC_PARSE_FAILED')
  }
  const o = p as Partial<SyncFilePayload>
  if (o?.appId !== 'heartflow' || o?.format !== 'sync-v1' || !o.ciphertext) {
    throw new Error('SYNC_PARSE_FAILED')
  }
  return o as SyncFilePayload
}

/** 用口令解密快照，返回明文 JSON 字符串；口令错误抛 VaultDecryptError。 */
export async function decryptSnapshot(payload: SyncFilePayload, passphrase: string): Promise<string> {
  return decryptWithPassphrase(payload.ciphertext, passphrase)
}

/**
 * 应用一份「导入的加密快照文本」（浏览器手动导入路径）：
 * 解析 → 解密 → additive merge 进现有存储。返回远端时间。
 */
export async function applyUploaded(text: string, passphrase: string): Promise<{ syncedAt: string }> {
  const payload = parseSnapshot(text)
  const plaintext = await decryptSnapshot(payload, passphrase)
  importJSON(plaintext) // additive merge，不抛（importJSON 内部吞解析异常）
  storage.setKV(KV_LAST_PULL, new Date().toISOString())
  storage.setKV(KV_LAST_REMOTE, payload.syncedAt)
  storage.removeKV(KV_LAST_ERROR)
  return { syncedAt: payload.syncedAt }
}

// ---- 推送 / 拉取 ----

/**
 * 推送：构建加密快照并写入同步目录。
 * target 为 null 时若本地有持久化目录则尝试复用（仅 path 形态）。
 */
export async function pushSnapshot(target: SyncTarget, passphrase: string, device = ''): Promise<PushResult> {
  if (!passphrase) {
    storage.setKV(KV_LAST_ERROR, '未填写同步口令')
    return { ok: false, reason: 'empty-passphrase', syncedAt: '' }
  }
  let tgt = target
  if (!tgt) {
    const dir = getSyncDirectory()
    if (dir) tgt = { kind: 'path', path: dir }
  }
  if (!tgt) {
    const reason = 'fs-unavailable' as const
    storage.setKV(KV_LAST_ERROR, '当前环境不支持直写，请用导出/导入')
    return { ok: false, reason, syncedAt: '' }
  }
  try {
    const payload = await buildSnapshot(passphrase, device)
    const text = serializeSnapshot(payload)
    await writeSyncFile(tgt, text)
    if (tgt.kind === 'path') storage.setKV(KV_DIR, tgt.path)
    storage.setKV(KV_LAST_PUSH, payload.syncedAt)
    storage.setKV(KV_LAST_REMOTE, payload.syncedAt)
    storage.removeKV(KV_LAST_ERROR)
    return { ok: true, syncedAt: payload.syncedAt }
  } catch (e) {
    if (e instanceof SyncFsUnavailableError) {
      storage.setKV(KV_LAST_ERROR, '直写不可用（缺少 Tauri 文件插件或浏览器不支持）')
      return { ok: false, reason: 'fs-unavailable', syncedAt: '' }
    }
    const msg = e instanceof Error ? e.message : String(e)
    storage.setKV(KV_LAST_ERROR, msg)
    return { ok: false, syncedAt: '' }
  }
}

/**
 * 拉取合并：读取同步目录快照 → 解密 → additive merge。
 * 文件不存在返回 { ok:false, reason:'no-file' }；口令错误返回 wrong-passphrase。
 */
export async function pullSnapshot(target: SyncTarget, passphrase: string): Promise<PullResult> {
  if (!passphrase) {
    storage.setKV(KV_LAST_ERROR, '未填写同步口令')
    return { ok: false, reason: 'empty-passphrase' }
  }
  let tgt = target
  if (!tgt) {
    const dir = getSyncDirectory()
    if (dir) tgt = { kind: 'path', path: dir }
  }
  if (!tgt) {
    storage.setKV(KV_LAST_ERROR, '当前环境不支持直写，请用导出/导入')
    return { ok: false, reason: 'fs-unavailable' }
  }
  let text: string | null
  try {
    text = await readSyncFile(tgt)
  } catch (e) {
    if (e instanceof SyncFsUnavailableError) {
      storage.setKV(KV_LAST_ERROR, '直写不可用（缺少 Tauri 文件插件或浏览器不支持）')
      return { ok: false, reason: 'fs-unavailable' }
    }
    storage.setKV(KV_LAST_ERROR, e instanceof Error ? e.message : String(e))
    return { ok: false, reason: 'fs-unavailable' }
  }
  if (text == null) {
    storage.setKV(KV_LAST_ERROR, '同步目录里还没有快照文件')
    return { ok: false, reason: 'no-file' }
  }
  let payload: SyncFilePayload
  try {
    payload = parseSnapshot(text)
  } catch {
    storage.setKV(KV_LAST_ERROR, '快照文件已损坏或不是 Heartflow 同步文件')
    return { ok: false, reason: 'parse-error' }
  }
  try {
    const plaintext = await decryptSnapshot(payload, passphrase)
    importJSON(plaintext)
  } catch (e) {
    if (e instanceof VaultDecryptError) {
      storage.setKV(KV_LAST_ERROR, '口令错误，无法解密远端快照')
      return { ok: false, reason: 'wrong-passphrase' }
    }
    storage.setKV(KV_LAST_ERROR, e instanceof Error ? e.message : String(e))
    return { ok: false, reason: 'parse-error' }
  }
  storage.setKV(KV_LAST_PULL, new Date().toISOString())
  storage.setKV(KV_LAST_REMOTE, payload.syncedAt)
  storage.removeKV(KV_LAST_ERROR)
  return { ok: true, syncedAt: payload.syncedAt, imported: true }
}

/** 浏览器降级：生成可下载的加密快照文本（不落盘）。 */
export async function downloadEncrypted(passphrase: string, device = ''): Promise<string> {
  if (!passphrase) throw new Error('未填写同步口令')
  const payload = await buildSnapshot(passphrase, device)
  return serializeSnapshot(payload)
}

// ---- 状态 ----

/** 读取持久化的同步状态（供面板展示）。 */
export function getSyncStatus(): SyncStatus {
  return {
    supported: isDirectWriteSupported(),
    lastPushAt: storage.getKV<string | null>(KV_LAST_PUSH, null),
    lastPullAt: storage.getKV<string | null>(KV_LAST_PULL, null),
    lastRemoteAt: storage.getKV<string | null>(KV_LAST_REMOTE, null),
    lastError: storage.getKV<string | null>(KV_LAST_ERROR, null),
    directory: getSyncDirectory(),
  }
}
