// ============================================================
// 逸趣阁 · 接收端时间种子（第46条单向赠予的落点）
// 落实蓝图第46条：接收方庭院里「独立来源标记的切片」——
//   浮动(floating) → 种下(planted) / 观赏(admired) / 拒绝(rejected)
//   种下后出现双圈光纹（发送方 + 传递方）
//   第48条反收回 → 切片变暗(revoked)、不可展开
// 数据全部本地存储（第1条本地私有），不涉及任何外部通道。
// 礼包(.seed-gift)由 seed-transfer.exportSeedGift 生成，本层负责导入落匣。
// ============================================================

import { storage } from '../../engine/storage'
import { parseSeedGift, type SeedGiftPayload, type TransferType } from './seed-transfer'

/** 接收种子状态机 */
export type ReceivedSeedState =
  | 'floating'   // 庭院里浮动、尚未处置的独立来源切片
  | 'planted'    // 已种下（双圈光纹显现）
  | 'admired'    // 仅观赏
  | 'rejected'   // 拒绝（不再显示于庭院）
  | 'revoked'    // 发送方已收回 → 变暗、不可展开

/** 接收方庭院里的独立来源切片 */
export interface ReceivedSeed {
  /** 本地收件匣 id */
  id: string
  /** 对应发送方守护室传递日志 id（用于第48条反收回联动） */
  giftId: string
  /** 发送方庭院名（来源标记，不可篡改） */
  senderName: string
  /** 传递方（若有中间传递） */
  transferorName?: string
  /** 时间投入类别 */
  category: TransferType
  name: string
  description: string
  tags: string[]
  rarity?: string
  /** 原始记录时间 */
  timestamp: string
  /** 接收时间 */
  receivedAt: string
  state: ReceivedSeedState
  /** 发送方附言 */
  note?: string
}

const RECEIVED_KEY = 'hf:play:received_seeds'

function load(): ReceivedSeed[] {
  try {
    return storage.getKV<ReceivedSeed[]>(RECEIVED_KEY, [])
  } catch {
    return []
  }
}

function save(list: ReceivedSeed[]): void {
  storage.setKV(RECEIVED_KEY, list)
}

function genId(): string {
  return `recv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * 将一份礼包落入接收匣，每条礼包记录转为一枚独立来源切片（初始状态 floating）。
 * 来源标记（senderName / transferorName / 内容）来自礼包快照，接收方不可篡改。
 */
export function addReceivedSeedsFromGift(payload: SeedGiftPayload): ReceivedSeed[] {
  const now = new Date().toISOString()
  const created: ReceivedSeed[] = payload.items.map(it => ({
    id: genId(),
    giftId: payload.giftId,
    senderName: payload.senderName,
    transferorName: payload.transferorName,
    category: it.category,
    name: it.name,
    description: it.description,
    tags: [...it.tags],
    rarity: it.rarity,
    timestamp: it.timestamp,
    receivedAt: now,
    state: 'floating',
    note: payload.recipient ? undefined : undefined,
  }))
  const list = load()
  list.unshift(...created)
  save(list)
  return created
}

/** 从 JSON 字符串导入礼包（解析失败返回 null） */
export function importSeedGift(json: string): ReceivedSeed[] | null {
  const payload = parseSeedGift(json)
  if (!payload) return null
  return addReceivedSeedsFromGift(payload)
}

/** 查询全部接收种子（守护室/庭院展示） */
export function getReceivedSeeds(): ReceivedSeed[] {
  return load()
}

/** 按 id 查询单枚 */
export function getReceivedSeed(id: string): ReceivedSeed | undefined {
  return load().find(r => r.id === id)
}

/** 切换状态（已收回的切片不可再操作） */
function setState(id: string, state: ReceivedSeedState): boolean {
  const list = load()
  const idx = list.findIndex(r => r.id === id)
  if (idx === -1) return false
  if (list[idx].state === 'revoked') return false
  list[idx] = { ...list[idx], state }
  save(list)
  return true
}

/** 种下（双圈光纹显现） */
export function plantSeed(id: string): boolean {
  return setState(id, 'planted')
}

/** 观赏 */
export function admireSeed(id: string): boolean {
  return setState(id, 'admired')
}

/** 拒绝 */
export function rejectSeed(id: string): boolean {
  return setState(id, 'rejected')
}

/** 从庭院移除一枚（拒绝后或不再需要） */
export function removeReceivedSeed(id: string): boolean {
  const list = load()
  const next = list.filter(r => r.id !== id)
  if (next.length === list.length) return false
  save(next)
  return true
}

/**
 * 第48条反收回联动：发送方收回某次传递后，同存储内（演示/自收场景）对应的
 * 接收切片全部变暗(revoked)，不可展开。已拒绝的不受影响。
 * 注：跨实例文件传递时，接收方副本为静态，无法远程变暗——此为本地单存储语义。
 * @returns 变暗的切片数
 */
export function markRevokedByGift(giftId: string): number {
  const list = load()
  let n = 0
  const next = list.map(r => {
    if (r.giftId === giftId && r.state !== 'rejected' && r.state !== 'revoked') {
      n++
      return { ...r, state: 'revoked' as ReceivedSeedState }
    }
    return r
  })
  save(next)
  return n
}
