// ============================================================
// 劳酬 · 资产负债净资产总览（INCR-27）
// 账户分资产/负债类：资产 = 各账户余额，负债 = 信用卡/负债未还，
// 净资产 = 资产 − 负债。纯函数引擎负责余额回溯重构与月度趋势，
// 供面板做仪表盘 + 趋势展示；净资产为派生数据、不落库。
// ============================================================
import type { Account, Transfer } from './accounts'
import { DEFAULT_ACCOUNT_ID } from './accounts'
import { cardBalance } from './credit-card'
import type { CreditCardRecord } from './credit-card'
import type { RewardRecord } from './reward-list'
import { getLocalDateKey } from '../../utils/time'

export type NetAssetSide = 'asset' | 'liability'

export interface NetAssetItem {
  id: string
  name: string
  side: NetAssetSide
  value: number
  /** 类型图标（账户 type / 卡性质） */
  icon?: string
  /** 类型标签（账户类 / 信用卡·负债） */
  sub?: string
  /** 值为负（账户倒挂） */
  negative?: boolean
}

export interface NetAssetSummary {
  totalAssets: number
  totalLiabilities: number
  netAssets: number
  /** 资产覆盖率 % = 资产÷负债×100（负债为 0 时 null = 无负债） */
  coverage: number | null
  assetItems: NetAssetItem[]
  liabilityItems: NetAssetItem[]
  /** 值为负的账户数 */
  negativeAssets: number
  /** 净资产为负 */
  negative: boolean
}

export interface NetAssetTrendPoint {
  /** yyyy-MM */
  month: string
  /** 展示标签，如 6月 */
  label: string
  assets: number
  liabilities: number
  net: number
}

const ACCOUNT_TYPE_META: Record<string, { label: string; icon: string }> = {
  cash: { label: '现金', icon: '💵' },
  bank: { label: '银行', icon: '🏦' },
  savings: { label: '储蓄', icon: '💰' },
  alipay: { label: '支付宝', icon: '📱' },
  wechat: { label: '微信', icon: '💬' },
  other: { label: '其他', icon: '🧾' },
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function parseYMD(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

// ---- 资产回溯重构 ----

/**
 * 账户在某日（含当日）的余额：期初 + ≤asOf 的收支 ± ≤asOf 的转账。
 * asOf 不含当日即视为截至该日月末，账户余额在无交易期间保持稳定。
 */
export function accountBalanceAt(
  acc: Account,
  records: RewardRecord[],
  transfers: Transfer[],
  asOf: string,
): number {
  let b = acc.initialBalance
  for (const r of records) {
    if ((r.at ?? '').slice(0, 10) > asOf) continue
    if ((r.account ?? DEFAULT_ACCOUNT_ID) !== acc.id) continue
    b += r.type === 'income' ? r.amount : -r.amount
  }
  for (const t of transfers) {
    if (getLocalDateKey(new Date(t.at)) > asOf) continue
    if (t.from === acc.id) b -= t.amount
    if (t.to === acc.id) b += t.amount
  }
  return b
}

// ---- 负债回溯重构 ----

/**
 * 某卡在某日（含当日）的未还负债：今日未还 + 该日后发生的还款。
 * （借款发生在期初已用；还款序列可据此回溯出历史任意日的未还额。）
 */
export function liabilityAt(card: CreditCardRecord, asOf: string): number {
  let bal = cardBalance(card)
  for (const rp of card.repayments) {
    if (getLocalDateKey(new Date(rp.at)) > asOf) bal += rp.amount
  }
  return Math.max(0, bal)
}

/**
 * 某卡在趋势中「有效起点」月份：有还款则以最早还款月为准；
 * 尚无还款的新卡以当前月为起点，避免把期初负债回填到卡片创建之前。
 */
export function cardTrendStartMonth(card: CreditCardRecord, today: string): string {
  const todayM = today.slice(0, 7)
  if (!card.repayments.length) return todayM
  let min = todayM
  for (const rp of card.repayments) {
    const m = rp.at.slice(0, 7)
    if (m < min) min = m
  }
  return min
}

// ---- 总览 ----

/** 当前净资产总览：资产（各账户余额）− 负债（信用卡/负债未还） */
export function netAssetSummary(
  accounts: Account[],
  records: RewardRecord[],
  transfers: Transfer[],
  cards: CreditCardRecord[],
  today: string,
): NetAssetSummary {
  const assetItems: NetAssetItem[] = accounts.map(a => {
    const v = accountBalanceAt(a, records, transfers, today)
    return {
      id: a.id,
      name: a.name,
      side: 'asset',
      value: v,
      icon: ACCOUNT_TYPE_META[a.type]?.icon,
      sub: ACCOUNT_TYPE_META[a.type]?.label ?? a.type,
      negative: v < 0,
    }
  })
  const liabilityItems: NetAssetItem[] = cards.map(c => {
    const v = cardBalance(c)
    return {
      id: c.id,
      name: c.name,
      side: 'liability',
      value: v,
      icon: c.kind === 'credit' ? '💳' : '📉',
      sub: c.kind === 'credit' ? '信用卡' : '负债',
      negative: false,
    }
  })
  const totalAssets = assetItems.reduce((s, x) => s + x.value, 0)
  const totalLiabilities = liabilityItems.reduce((s, x) => s + x.value, 0)
  const netAssets = totalAssets - totalLiabilities
  const coverage = totalLiabilities > 0 ? Math.round((totalAssets / totalLiabilities) * 10000) / 100 : null
  return {
    totalAssets,
    totalLiabilities,
    netAssets,
    coverage,
    assetItems,
    liabilityItems,
    negativeAssets: assetItems.filter(x => x.negative).length,
    negative: netAssets < 0,
  }
}

// ---- 月度趋势 ----

/**
 * 近 N 月净资产趋势：逐月取「该月最后一日」为节点回溯资产负债（当前月取今日）。
 * 卡仅从 cardTrendStartMonth 起计入，避免把新建负债回填历史。
 */
export function netAssetTrend(
  accounts: Account[],
  records: RewardRecord[],
  transfers: Transfer[],
  cards: CreditCardRecord[],
  today: string,
  months = 6,
): NetAssetTrendPoint[] {
  const now = parseYMD(today)
  const todayM = today.slice(0, 7)
  const points: NetAssetTrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const raw = now.m - i
    const yy = now.y + Math.floor((raw - 1) / 12)
    const mm = ((((raw - 1) % 12) + 12) % 12) + 1
    const mk = `${yy}-${pad2(mm)}`
    const isCurrent = mk === todayM
    const lastDay = isCurrent ? now.d : new Date(yy, mm, 0).getDate()
    const asOf = `${mk}-${pad2(lastDay)}`

    let assets = 0
    for (const a of accounts) assets += accountBalanceAt(a, records, transfers, asOf)
    let liab = 0
    for (const c of cards) {
      if (cardTrendStartMonth(c, today) > mk) continue
      liab += liabilityAt(c, asOf)
    }
    points.push({ month: mk, label: `${mm}月`, assets, liabilities: liab, net: assets - liab })
  }
  return points
}