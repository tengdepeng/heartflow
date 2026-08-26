// ============================================================
// 逸趣阁 · 时间种子传递治理层
// 落实宪法第46/47/48条：
//   第47条「遗传的范围」——用户逐项选择传递的时间投入类型（运动/游戏/观影/旅行/专注…+任意组合），
//     选择传递全部细节或仅高亮时刻摘要；发送前预览接收方将看到的内容；守护室有完整日志。
//   第48条「遗传的停止」——用户可随时从接收方庭院收回种子（变半透明不可展开标记）；
//     发送时勾选「永久赠予」则不可收回。
// 注：种子导出/导入/谱系引擎见 seed-share.ts，本层只负责「授权 + 预览 + 日志 + 收回」治理。
// ============================================================

import { storage } from '../../engine/storage'
import { isTargetActive } from '../../engine/constitution-effect'
import { assertShareLocalOnly } from '../share/share-local'
import { getMovementRecords } from '../movement/rhythm'
import { MOVEMENT_TYPE_META } from '../movement/types'
import type { TimeSeed } from './time-seed'

// ---- 宪法条款门控（第46/47/48条） ----
// 这些条款默认启用；用户可在宪法编辑器关闭，关闭后对应能力被门控。
// 既作为逻辑层单一事实源（recordTransfer/revokeTransfer 真实拦截），
// 也供 SeedInheritancePanel 同步隐藏/禁用对应 UI。

/** 第46条 记录的遗传：是否允许打包时间投入并主动传递 */
export function isSeedInheritEnabled(): boolean {
  return isTargetActive('seed:inherit')
}

/** 第47条 遗传的范围：是否允许用户逐项选择传递类型/粒度与发送前预览 */
export function isSeedScopeEnabled(): boolean {
  return isTargetActive('seed:scope')
}

/** 第48条 遗传的停止：是否允许随时收回已传递的时间种子 */
export function isSeedRevokeEnabled(): boolean {
  return isTargetActive('seed:revoke')
}

// ---- 传递类型（第47条：用户逐项勾选） ----

/** 可传递的时间投入类型 */
export type TransferType =
  | 'exercise'   // 运动记录
  | 'game'       // 游戏记录
  | 'movie'      // 观影记录
  | 'travel'     // 旅行记录
  | 'focus'      // 专注记录

export const TRANSFER_TYPE_LABELS: Record<TransferType, string> = {
  exercise: '运动记录',
  game: '游戏记录',
  movie: '观影记录',
  travel: '旅行记录',
  focus: '专注记录',
}

/** TimeSeed.source 到 TransferType 的映射（其余未分类种子归入 game） */
const SEED_SOURCE_TO_TRANSFER_TYPE: Record<TimeSeed['source'], TransferType> = {
  game: 'game',
  toy: 'game',
  model: 'game',
  other: 'game',
}

/** 将种子映射到传递类型（逸趣阁当前只有游戏/玩具/模型/其他，统一归为「游戏记录」） */
export function seedTransferType(seed: TimeSeed): TransferType {
  return SEED_SOURCE_TO_TRANSFER_TYPE[seed.source]
}

// ---- 细节粒度（第47条：全部细节 or 仅高亮摘要） ----

export type TransferGranularity = 'full' | 'highlight'

export const GRANULARITY_LABELS: Record<TransferGranularity, string> = {
  full: '全部细节',
  highlight: '仅高亮时刻摘要',
}

// ---- 传递授权配置（发送前由用户逐项确认） ----

export interface TransferAuthorization {
  /** 用户勾选的传递类型（至少一项） */
  types: TransferType[]
  /** 细节粒度 */
  granularity: TransferGranularity
  /** 是否永久赠予（勾选则不可收回） */
  permanent: boolean
}

/** 默认授权：仅游戏记录 + 高亮摘要 + 可收回 */
export function defaultAuthorization(): TransferAuthorization {
  return { types: ['game'], granularity: 'highlight', permanent: false }
}

// ---- 发送前预览（第47条：接收方将看到的内容） ----

export interface TransferPreviewItem {
  seedId: string
  name: string
  /** 预览展示内容（按粒度裁剪） */
  content: string
  /** 稀有度（仅逸趣阁游戏种子有；专注/运动等记录无稀有度） */
  rarity?: TimeSeed['rarity']
}

export interface TransferPreview {
  authorizedTypes: { key: TransferType; label: string }[]
  granularityLabel: string
  permanent: boolean
  itemCount: number
  items: TransferPreviewItem[]
}

/**
 * 构造发送前预览——用户确认前可查看接收方将看到的内容。
 * @param seeds 待传递的全部种子
 * @param auth  用户授权（类型/粒度/永久赠予）
 */
export function buildTransferPreview(
  seeds: TimeSeed[],
  auth: TransferAuthorization,
): TransferPreview {
  const typeSet = new Set(auth.types)
  const items: TransferPreviewItem[] = seeds
    .filter(s => typeSet.has(seedTransferType(s)))
    .map(s => ({
      seedId: s.id,
      name: s.name,
      rarity: s.rarity,
      content: auth.granularity === 'full'
        ? s.description
        : `「${s.name}」${s.tags.join('/')}`,
    }))

  return {
    authorizedTypes: auth.types.map(k => ({ key: k, label: TRANSFER_TYPE_LABELS[k] })),
    granularityLabel: GRANULARITY_LABELS[auth.granularity],
    permanent: auth.permanent,
    itemCount: items.length,
    items,
  }
}

// ---- 传递日志（第47条：守护室完整日志） ----

export interface TransferLog {
  id: string
  /** 发送的种子 originId 列表 */
  seedIds: string[]
  /** 传递类型 */
  types: TransferType[]
  granularity: TransferGranularity
  /** 是否永久赠予 */
  permanent: boolean
  /** 接收方标识（可为空，如导出文件） */
  recipient?: string
  /** 发送时间 */
  sentAt: string
  /** 是否已收回 */
  revoked: boolean
  /** 收回时间 */
  revokedAt?: string
}

const TRANSFER_LOG_KEY = 'hf:play:seed_transfer_logs'

function loadLogs(): TransferLog[] {
  try {
    return storage.getKV<TransferLog[]>(TRANSFER_LOG_KEY, [])
  } catch {
    return []
  }
}

function saveLogs(logs: TransferLog[]): void {
  storage.setKV(TRANSFER_LOG_KEY, logs)
}

/**
 * 记录一次传递（写入守护室日志）。
 * @returns 成功返回 TransferLog；若第46条「记录的遗传」已关闭则返回 null（逻辑层拦截，调用方据 null 提示用户）。
 *
 * 第47条门控：若「遗传的范围」已关闭，忽略用户逐项选择，强制使用默认授权（仅游戏记录 + 高亮摘要 + 可收回），
 * 既保证范围选择的边界由宪法决定，又不让传递因条款关闭而完全失败。
 */
export function recordTransfer(
  seedIds: string[],
  auth: TransferAuthorization,
  recipient?: string,
): TransferLog | null {
  // 第46条关闭：不允许主动传递时间投入
  if (!isSeedInheritEnabled()) return null

  // 第47条关闭：忽略用户范围选择，降级为默认授权
  const effectiveAuth: TransferAuthorization = isSeedScopeEnabled()
    ? auth
    : defaultAuthorization()

  const log: TransferLog = {
    id: `transfer_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    seedIds: [...seedIds],
    types: [...effectiveAuth.types],
    granularity: effectiveAuth.granularity,
    permanent: effectiveAuth.permanent,
    recipient,
    sentAt: new Date().toISOString(),
    revoked: false,
  }
  const logs = loadLogs()
  logs.unshift(log)
  saveLogs(logs)
  return log
}

/** 查询全部传递日志（守护室展示） */
export function getTransferLogs(): TransferLog[] {
  return loadLogs()
}

/** 按 ID 查询单条日志 */
export function getTransferLog(id: string): TransferLog | undefined {
  return loadLogs().find(l => l.id === id)
}

// ---- 收回（第48条：遗传的停止） ----

export interface RevokeResult {
  ok: boolean
  reason?: string
  log?: TransferLog
}

/**
 * 收回一次传递——接收方对应切片变暗、不可展开（由调用方据 revoked 渲染半透明标记）。
 * 永久赠予的种子不可收回。
 *
 * 第48条门控：若「遗传的停止」已关闭，直接拒绝收回（宪法层面不允许打断遗传链路）。
 */
export function revokeTransfer(id: string): RevokeResult {
  // 第48条关闭：禁止收回已传递的时间投入
  if (!isSeedRevokeEnabled()) {
    return { ok: false, reason: '宪法第48条「遗传的停止」已关闭，不可收回' }
  }

  const logs = loadLogs()
  const idx = logs.findIndex(l => l.id === id)
  if (idx === -1) return { ok: false, reason: '未找到该传递记录' }

  const log = logs[idx]
  if (log.revoked) return { ok: false, reason: '该传递已收回' }
  if (log.permanent) return { ok: false, reason: '永久赠予的种子不可收回' }

  const updated: TransferLog = {
    ...log,
    revoked: true,
    revokedAt: new Date().toISOString(),
  }
  logs[idx] = updated
  saveLogs(logs)
  return { ok: true, log: updated }
}

/** 判断某次传递是否可被接收方展开查看（已收回则不可展开） */
export function isTransferViewable(log: TransferLog): boolean {
  return !log.revoked
}

// ---- 第47条：统一时间投入记录聚合（修复 G2 数据源造假） ----
// 此前 seedTransferType 仅把逸趣阁种子映射到「游戏记录」，导致运动/观影/旅行/专注
// 四类虽可选却永远预览为空。现改为按类别从各自真实数据源聚合：
//   游戏  → 逸趣阁收藏种子（time-seed）
//   专注  → 计时器已完成专注会话（storage.getSessions）
//   运动  → 动律之间运动记录（getMovementRecords）
//   观影/旅行 → 当前应用暂无对应记录存储，返回空（蓝图允许选择该类别，但暂无记录可传递，诚实为空）

/** 统一时间投入记录（跨模块 source-agnostic） */
export interface TimeInvestmentRecord {
  /** 合成 id，形如 `game:<id>` / `focus:<id>` / `exercise:<id>`，避免跨类别碰撞 */
  id: string
  category: TransferType
  name: string
  description: string
  tags: string[]
  rarity?: TimeSeed['rarity']
  /** 原始记录时间 */
  timestamp: string
  /** 原始记录 id（可追溯） */
  originalId: string
}

/**
 * 按所选类别聚合真实时间投入记录。
 * @param types   用户勾选的传递类型（第47条）
 * @param gameSeeds 逸趣阁收藏种子（由视图层传入，保持既有的 usePlaySeeds 数据层）
 */
export function collectTimeInvestments(
  types: TransferType[],
  gameSeeds: TimeSeed[] = [],
): TimeInvestmentRecord[] {
  const want = new Set(types)
  const out: TimeInvestmentRecord[] = []

  if (want.has('game')) {
    for (const s of gameSeeds) {
      out.push({
        id: `game:${s.id}`,
        category: 'game',
        name: s.name,
        description: s.description,
        tags: [...s.tags],
        rarity: s.rarity,
        timestamp: s.timestamp,
        originalId: s.id,
      })
    }
  }

  if (want.has('focus')) {
    const sessions = storage.getSessions().filter(s => s.status === 'completed')
    for (const s of sessions) {
      const mins = Math.round((s.elapsed || 0) / 60000)
      out.push({
        id: `focus:${s.id}`,
        category: 'focus',
        name: `专注 · ${s.mode}`,
        description: (s.note && s.note.trim()) || `完成 ${mins} 分钟专注`,
        tags: [...(s.tags || [])],
        timestamp: (s.completedAt ?? s.startedAt ?? ''),
        originalId: s.id,
      })
    }
  }

  if (want.has('exercise')) {
    const recs = getMovementRecords()
    for (const r of recs) {
      const meta = MOVEMENT_TYPE_META[r.type]
      out.push({
        id: `exercise:${r.id}`,
        category: 'exercise',
        name: `${meta?.label ?? r.type} ${r.duration}分钟`,
        description: (r.note && r.note.trim()) || r.feeling || `${r.intensity}强度`,
        tags: [r.type, r.intensity],
        timestamp: r.timestamp,
        originalId: r.id,
      })
    }
  }

  // movie / travel：当前应用无对应记录存储，返回空（诚实，不造假数据）
  return out
}

/**
 * 基于统一时间投入记录构造发送前预览（替代旧 buildTransferPreview 仅认游戏种子的局限）。
 * 第47条：接收方将看到的内容与实际发送一致。
 */
export function buildInvestmentPreview(
  records: TimeInvestmentRecord[],
  auth: TransferAuthorization,
): TransferPreview {
  const typeSet = new Set(auth.types)
  const items: TransferPreviewItem[] = records
    .filter(r => typeSet.has(r.category))
    .map(r => ({
      seedId: r.id,
      name: r.name,
      rarity: r.rarity,
      content: auth.granularity === 'full'
        ? r.description
        : `「${r.name}」${r.tags.join('/')}`,
    }))

  return {
    authorizedTypes: auth.types.map(k => ({ key: k, label: TRANSFER_TYPE_LABELS[k] })),
    granularityLabel: GRANULARITY_LABELS[auth.granularity],
    permanent: auth.permanent,
    itemCount: items.length,
    items,
  }
}

// ---- 时间种子礼包（第46条单向赠予的载体） ----
// 发送方导出为本地 .seed-gift 文件，交由信任的人导入其接收匣（见 received-seed.ts）。
// 礼包内嵌内容快照，使接收方无需发送方数据库即可查看（符合第1条本地私有）。

/** 礼包内单条记录 */
export interface GiftItem {
  category: TransferType
  name: string
  description: string
  tags: string[]
  rarity?: TimeSeed['rarity']
  timestamp: string
  /** 原始记录 id（可追溯，但不回写发送方数据） */
  originalId: string
}

/** 时间种子礼包格式（本地文件导出） */
export interface SeedGiftPayload {
  version: '1.0'
  /** 对应发送方守护室传递日志 id（用于反收回联动） */
  giftId: string
  /** 发送方庭院名（来源标记） */
  senderName: string
  /** 传递方（若有中间传递） */
  transferorName?: string
  granularity: TransferGranularity
  permanent: boolean
  /** 接收方标识（可选） */
  recipient?: string
  exportedAt: string
  items: GiftItem[]
}

/** 打包一份时间种子礼包（第43条本地边界：仅限本地文件，拦截任何云端目标） */
export function exportSeedGift(
  records: TimeInvestmentRecord[],
  auth: TransferAuthorization,
  meta: { giftId: string; senderName: string; transferorName?: string; recipient?: string },
): SeedGiftPayload {
  assertShareLocalOnly('local')
  const items: GiftItem[] = records.map(r => ({
    category: r.category,
    name: r.name,
    description: auth.granularity === 'full' ? r.description : `「${r.name}」${r.tags.join('/')}`,
    tags: [...r.tags],
    rarity: r.rarity,
    timestamp: r.timestamp,
    originalId: r.originalId,
  }))
  return {
    version: '1.0',
    giftId: meta.giftId,
    senderName: meta.senderName,
    transferorName: meta.transferorName,
    granularity: auth.granularity,
    permanent: auth.permanent,
    recipient: meta.recipient,
    exportedAt: new Date().toISOString(),
    items,
  }
}

/** 礼包序列化为 JSON 字符串 */
export function stringifySeedGift(payload: SeedGiftPayload): string {
  return JSON.stringify(payload)
}

/** 从 JSON 解析礼包（校验版本与结构，失败返回 null） */
export function parseSeedGift(json: string): SeedGiftPayload | null {
  try {
    const p = JSON.parse(json) as SeedGiftPayload
    if (!p || p.version !== '1.0' || !Array.isArray(p.items)) return null
    return p
  } catch {
    return null
  }
}
