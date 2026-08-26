// ============================================================
// 数据导入/导出 · 载荷类型（叶子模块）
// 从 data-port.ts 抽取，消除 data-port ↔ data-port-converter 的
// 类型级循环依赖。两文件均从此处引入 DataPortPayload。
// ============================================================

import type { FocusSession, TimeCrystal, Note, EmotionRecord, JadeBeadCarrier, Constitution } from '../types'
import type { Anchor } from '../modules/anchor/types'
import type { Goal } from '../modules/goal/types'
import type { Person } from '../modules/relation/types'

export interface DataPortPayload {
  exportedAt?: string
  version?: number
  sessions?: FocusSession[]
  crystals?: TimeCrystal[]
  notes?: Note[]
  emotions?: EmotionRecord[]
  anchors?: Anchor[]
  goals?: Goal[]
  relations?: Person[]
  ledger?: { id: string; type: string; amount: number; note: string; at: string }[]
  carriers?: JadeBeadCarrier[]
  constitution?: Constitution | null
}
