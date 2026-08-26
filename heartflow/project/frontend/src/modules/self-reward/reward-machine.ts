// ============================================================
// 自我奖励 · 犒赏机器（reward-machine）
// 把"兑现记录"升华成有分量的账本与仪式感：
//   - rewardLedger：按月账本（次数/成本）、节奏、兑现寄语密度
//   - redemptionMilestones：犒赏里程碑（第1/3/5/10/20次）
//   - suggestReward：把今日专注心流「兑换」成一句犒赏建议
// 全纯函数、本地计算，零网络出口（守宪法第1条）。
// ============================================================

import type { SelfReward } from './types'

export interface LedgerMonth {
  key: string // 'YYYY-MM'
  label: string // '8月'
  count: number
  cost: number
}

export interface RewardLedger {
  totalRedeemed: number
  totalCost: number
  /** 平均兑现节奏（天）：两次以上才计算 */
  cadenceDays: number | null
  /** 写过兑言寄语的比例 */
  noteRate: number
  byMonth: LedgerMonth[]
  recent: SelfReward[]
}

const MONTH_LABELS = ['', '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

function monthOf(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '---'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 犒赏账本：统计已兑现的次数/成本/节奏/寄语与按月分布 */
export function rewardLedger(rewards: SelfReward[], maxRecent = 3): RewardLedger {
  const redeemed = rewards
    .filter((r) => r.status === 'redeemed' && r.redeemedAt)
    .sort((a, b) => (b.redeemedAt || '').localeCompare(a.redeemedAt || ''))

  const monthMap = new Map<string, { count: number; cost: number }>()
  for (const r of redeemed) {
    const key = monthOf(r.redeemedAt || '')
    const cur = monthMap.get(key) || { count: 0, cost: 0 }
    cur.count++
    if (typeof r.cost === 'number') cur.cost += r.cost
    monthMap.set(key, cur)
  }
  const byMonth: LedgerMonth[] = [...monthMap.entries()]
    .map(([key, v]) => {
      const monthNum = Number(key.slice(5, 7))
      return { key, label: MONTH_LABELS[monthNum] || key, ...v }
    })
    .sort((a, b) => b.key.localeCompare(a.key))

  // 兑现节奏：按时间升序，相邻间隔的平均
  let cadenceDays: number | null = null
  if (redeemed.length >= 2) {
    const asc = [...redeemed].sort((a, b) => (a.redeemedAt || '').localeCompare(b.redeemedAt || ''))
    let total = 0
    let gaps = 0
    for (let i = 1; i < asc.length; i++) {
      const d1 = new Date(asc[i - 1].redeemedAt || '').getTime()
      const d2 = new Date(asc[i].redeemedAt || '').getTime()
      if (!Number.isFinite(d1) || !Number.isFinite(d2)) continue
      total += (d2 - d1) / 86_400_000
      gaps++
    }
    if (gaps > 0) cadenceDays = Math.round(total / gaps)
  }

  const withNote = redeemed.filter((r) => r.note).length

  return {
    totalRedeemed: redeemed.length,
    totalCost: redeemed.reduce((s, r) => s + (typeof r.cost === 'number' ? r.cost : 0), 0),
    cadenceDays,
    noteRate: redeemed.length ? Math.round((withNote / redeemed.length) * 100) : 0,
    byMonth,
    recent: redeemed.slice(0, maxRecent),
  }
}

export const REWARD_MILESTONES = [1, 3, 5, 10, 20]

/** 犒赏里程碑：已达成与下一个 */
export function redemptionMilestones(rewards: SelfReward[]): { reached: number[]; next: number | null } {
  const count = rewards.filter((r) => r.status === 'redeemed').length
  const reached = REWARD_MILESTONES.filter((m) => count >= m)
  const next = REWARD_MILESTONES.find((m) => count < m) ?? null
  return { reached, next }
}

/** 把今日专注心流「兑换」成犒赏建议：有可兑现优先，专注足量则建议一条待兑现手动奖励 */
export function suggestReward(rewards: SelfReward[], focusMinutes: number): SelfReward | null {
  const redeemable = rewards.filter((r) => r.status === 'redeemable')
  if (redeemable.length > 0) return redeemable[0]
  if (focusMinutes >= 45) {
    const manual = rewards.filter((r) => r.status === 'pending' && r.trigger.type === 'manual')
    if (manual.length > 0) return manual[0]
  }
  return null
}