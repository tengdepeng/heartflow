// ============================================================
// 劳酬 · 周期/重复记账（INCR-22）
// 房租/工资/订阅等按周期自动出账：规则 CRUD + 到期账单生成/跳过。
// 纯函数引擎负责周期推进，useRecurring 负责存储读写。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

export type RecurFreq = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RecurType = 'income' | 'expense'

export interface RecurringRule {
  id: string
  name: string
  type: RecurType
  amount: number
  category: string
  account: string
  freq: RecurFreq
  /** 每 N 个周期出账一次 */
  interval: number
  /** 起始锚点 yyyy-mm-dd；首次 = 首次出账日 */
  startAt: string
  active: boolean
  /** 下一次待出账日 yyyy-mm-dd */
  nextRunAt: string
}

/** 收支配用于生成账单草稿 */
export interface RecurringDraft {
  type: RecurType
  amount: number
  category: string
  description: string
  account: string
  at: string
}

const RECURRING_KEY = REWARD_STORAGE_KEYS.RECURRING

// ---- 纯函数：周期推进 ----
function parseD(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y || 1, (m || 1) - 1, d || 1)
}
function fmtD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

/** 在 cur 基础上推进一个周期；monthly 保留起始日、月末越界截断到当月末日 */
export function nextOccurrence(
  rule: Pick<RecurringRule, 'freq' | 'interval'>,
  cur: string,
): string {
  const d = parseD(cur)
  const interval = Math.max(1, Math.floor(rule.interval || 1))
  switch (rule.freq) {
    case 'daily':
      d.setDate(d.getDate() + interval)
      break
    case 'weekly':
      d.setDate(d.getDate() + 7 * interval)
      break
    case 'yearly':
      d.setFullYear(d.getFullYear() + interval)
      break
    case 'monthly': {
      const dayAnchor = d.getDate()
      const m = d.getMonth() + interval
      const ny = d.getFullYear() + Math.floor(m / 12)
      const nm = ((m % 12) + 12) % 12
      const last = new Date(ny, nm + 1, 0).getDate()
      d.setFullYear(ny, nm, Math.min(dayAnchor, last))
      break
    }
  }
  return fmtD(d)
}

/** 规则在 [from, to]（含）内的全部出现日期，用于预览/校验 */
export function occurrencesInRange(
  rule: Pick<RecurringRule, 'freq' | 'interval' | 'startAt'>,
  from: string,
  to: string,
): string[] {
  const out: string[] = []
  let cur = rule.startAt
  let guard = 0
  while (cur <= to && guard < 5000) {
    if (cur >= from) out.push(cur)
    cur = nextOccurrence(rule, cur)
    guard++
  }
  return out
}

/** 严格晚于 after 的下一次出现（用于入账/跳过后推进 nextRunAt） */
export function nextOccurrenceAfter(rule: RecurringRule, after: string): string {
  let cur = rule.startAt
  let guard = 0
  while (cur <= after && guard < 5000) {
    cur = nextOccurrence(rule, cur)
    guard++
  }
  return cur
}

/** 返回到账日不晚于 asOf 且启用的规则（即「待入账」） */
export function dueRules(rules: RecurringRule[], asOf: string): RecurringRule[] {
  return rules.filter(r => r.active && r.nextRunAt && r.nextRunAt <= asOf)
}

/** 由规则与出账日生成账单草稿 */
export function toRecurringDraft(rule: RecurringRule, at: string): RecurringDraft {
  return {
    type: rule.type,
    amount: rule.amount,
    category: rule.category,
    description: rule.name,
    account: rule.account,
    at,
  }
}

// ---- 存储读写 ----
export function useRecurring() {
  const rules = ref<RecurringRule[]>(storage.getKV<RecurringRule[]>(RECURRING_KEY, []))

  function persist(): void {
    storage.setKV(RECURRING_KEY, rules.value)
  }
  function load(): void {
    rules.value = storage.getKV<RecurringRule[]>(RECURRING_KEY, [])
  }

  function create(data: Omit<RecurringRule, 'id' | 'nextRunAt'>): RecurringRule {
    const rule: RecurringRule = {
      ...data,
      id: `r${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
      nextRunAt: data.startAt,
    }
    rules.value.push(rule)
    persist()
    return rule
  }

  function update(id: string, patch: Partial<RecurringRule>): void {
    const i = rules.value.findIndex(r => r.id === id)
    if (i >= 0) {
      rules.value[i] = { ...rules.value[i], ...patch }
      persist()
    }
  }

  function remove(id: string): void {
    rules.value = rules.value.filter(r => r.id !== id)
    persist()
  }

  return { rules, create, update, remove, load }
}