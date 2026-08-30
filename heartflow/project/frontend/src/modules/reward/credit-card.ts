// ============================================================
// 劳酬 · 信用卡/负债账户管理（INCR-26）
// 额度 + 已用/可用 + 还款计划 + 到期提醒，并纳入负债口径。
// 纯函数引擎负责余额/可用/到期/负债聚合，useCreditCards 负责存储读写。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

/** 账户性质：信用卡（带额度）/ 一般负债（额度留空） */
export type CreditCardKind = 'credit' | 'debt'

/** 单笔还款 */
export interface Repayment {
  id: string
  amount: number
  at: string
  note?: string
}

export interface CreditCardRecord {
  id: string
  name: string
  kind: CreditCardKind
  /** 信用额度（credit 必填；debt 忽略） */
  creditLimit?: number
  /** 期初已用 / 未还本金 */
  openingBalance: number
  /** 每期还款日（每月第 N 天，1~31，越界自动截断到月末） */
  repaymentDay: number
  /** 还款计划：设定的月还款额（可空，缺省按 12 期均衡） */
  planMonthly?: number
  note?: string
  repayments: Repayment[]
}

const CC_KEY = REWARD_STORAGE_KEYS.CREDIT_CARDS

// ---- 日期工具（本地时区 yyyy-mm-dd）----
interface YMD {
  y: number
  m: number
  d: number
}

function monthDate(y: number, month01: number, day: number): YMD {
  const last = new Date(y, month01, 0).getDate() // month01 为 1~12，Date 第 1 月为下标 1
  return { y, m: month01, d: Math.min(day, last) }
}

function parseYMD(s: string): YMD {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

function asMs(x: YMD): number {
  return new Date(x.y, x.m - 1, x.d).getTime()
}

// ---- 纯函数 ----

/** 当前未还 = 期初已用 − 已还合计（下限 0） */
export function cardBalance(c: CreditCardRecord): number {
  const paid = c.repayments.reduce((s, x) => s + x.amount, 0)
  return Math.max(0, (c.openingBalance || 0) - paid)
}

/** 已还清 */
export function cleared(c: CreditCardRecord): boolean {
  return cardBalance(c) <= 0
}

/** 信用卡可用额度 = 额度 − 已用（下限 0；负债无额度返回 0） */
export function availableCredit(c: CreditCardRecord): number {
  if (c.kind !== 'credit' || c.creditLimit == null) return 0
  return Math.max(0, c.creditLimit - cardBalance(c))
}

const DAY = 86400000

/** 本期账单的还款日：当月 repaymentDay，越界截断月末 */
function thisMonthDue(c: CreditCardRecord, today: string): YMD {
  const { y, m } = parseYMD(today)
  return monthDate(y, m, c.repaymentDay)
}

/** 下一次（≥今天）还款日；已还清时返回 null */
export function nextDueDate(c: CreditCardRecord, today: string): string | null {
  if (cleared(c)) return null
  const t = parseYMD(today)
  const due = thisMonthDue(c, today)
  if (asMs(due) >= asMs(t)) return `${due.y}-${String(due.m).padStart(2, '0')}-${String(due.d).padStart(2, '0')}`
  const next = monthDate(t.y, t.m + 1, c.repaymentDay)
  return `${next.y}-${String(next.m).padStart(2, '0')}-${String(next.d).padStart(2, '0')}`
}

/** 逾期状态：本期还款日已过且仍未还清 */
export function isOverdue(c: CreditCardRecord, today: string): boolean {
  if (cleared(c)) return false
  return asMs(parseYMD(today)) > asMs(thisMonthDue(c, today))
}

/** 逾期天数（未逾期为 0；已还清恒 0） */
export function overdueDays(c: CreditCardRecord, today: string): number {
  if (cleared(c)) return 0
  const diff = asMs(parseYMD(today)) - asMs(thisMonthDue(c, today))
  return diff > 0 ? Math.floor(diff / DAY) : 0
}

/** 距下次还款日的天数（已还清返回 null；当天为 0） */
export function dueInDays(c: CreditCardRecord, today: string): number | null {
  const nd = nextDueDate(c, today)
  if (!nd) return null
  return Math.max(0, Math.round((asMs(parseYMD(nd)) - asMs(parseYMD(today))) / DAY))
}

/** 最低还款额 = 已用 × 10%，向上取整 */
export function minimumPayment(c: CreditCardRecord): number {
  return Math.ceil(cardBalance(c) * 0.1)
}

export interface PayoffPlan {
  /** 每月还款额 */
  monthly: number
  /** 预计结清期数（0=已还清） */
  months: number
}

/**
 * 还款计划：优先用用户设定 planMonthly；否则按 12 期均衡。
 * @returns 月还款额 + 预计结清期数
 */
export function payoffPlan(c: CreditCardRecord, defaultMonths = 12): PayoffPlan {
  const bal = cardBalance(c)
  if (bal <= 0) return { monthly: 0, months: 0 }
  const monthly = c.planMonthly && c.planMonthly > 0 ? c.planMonthly : Math.max(1, Math.ceil(bal / defaultMonths))
  return { monthly, months: Math.max(1, Math.ceil(bal / monthly)) }
}

export interface LiabilitySummary {
  /** 负债总额（全部未还合计） */
  totalBalance: number
  /** 信用卡总额度 */
  totalCreditLimit: number
  /** 信用卡可用额度合计 */
  totalAvailable: number
  /** 最低还款总计 */
  totalMinimum: number
  /** 还款计划月供合计 */
  totalPlanMonthly: number
  creditCount: number
  debtCount: number
  /** 逾期笔数 */
  overdueCount: number
  /** 3 天内将到期笔数 */
  dueSoonCount: number
}

export function liabilitySummary(cards: CreditCardRecord[], today: string): LiabilitySummary {
  let totalBalance = 0
  let totalCreditLimit = 0
  let totalAvailable = 0
  let totalMinimum = 0
  let totalPlanMonthly = 0
  let creditCount = 0
  let debtCount = 0
  let overdue = 0
  let dueSoon = 0
  for (const c of cards) {
    const bal = cardBalance(c)
    totalBalance += bal
    totalMinimum += minimumPayment(c)
    totalPlanMonthly += payoffPlan(c).monthly
    if (c.kind === 'credit') {
      creditCount++
      totalCreditLimit += c.creditLimit ?? 0
      totalAvailable += availableCredit(c)
    } else {
      debtCount++
    }
    if (isOverdue(c, today)) overdue++
    const dd = dueInDays(c, today)
    if (dd !== null && dd <= 3) dueSoon++
  }
  return {
    totalBalance,
    totalCreditLimit,
    totalAvailable,
    totalMinimum,
    totalPlanMonthly,
    creditCount,
    debtCount,
    overdueCount: overdue,
    dueSoonCount: dueSoon,
  }
}

export const CARD_KIND_META: Record<CreditCardKind, { label: string; icon: string; color: string }> = {
  credit: { label: '信用卡', icon: '💳', color: '#6b9fc4' },
  debt: { label: '负债', icon: '📉', color: '#c46a5a' },
}

// ---- 存储读写 ----
export function useCreditCards() {
  const records = ref<CreditCardRecord[]>(storage.getKV<CreditCardRecord[]>(CC_KEY, []))

  function persist(): void {
    storage.setKV(CC_KEY, records.value)
  }
  function load(): void {
    records.value = storage.getKV<CreditCardRecord[]>(CC_KEY, [])
  }

  function create(data: Omit<CreditCardRecord, 'id' | 'repayments'>): CreditCardRecord {
    const card: CreditCardRecord = {
      ...data,
      id: `cc-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      repayments: [],
    }
    records.value.push(card)
    persist()
    return card
  }

  function repay(id: string, amount: number, at: string, note?: string): void {
    const i = records.value.findIndex(c => c.id === id)
    if (i < 0 || amount <= 0) return
    records.value[i].repayments.push({
      id: `rp-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      amount,
      at,
      note,
    })
    persist()
  }

  function updatePlan(id: string, planMonthly?: number): void {
    const i = records.value.findIndex(c => c.id === id)
    if (i < 0) return
    records.value[i].planMonthly = planMonthly && planMonthly > 0 ? Math.round(planMonthly) : undefined
    persist()
  }

  function remove(id: string): void {
    records.value = records.value.filter(c => c.id !== id)
    persist()
  }

  return { records, create, repay, updatePlan, remove, load }
}