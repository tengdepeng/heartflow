// ============================================================
// 劳酬 · 存钱计划（INCR-30）
// 三种模式：攒钱(accumulate)/52周挑战(52week)/心愿(wish)。
// 纯函数引擎负责存款推进/52周汇总/进度计算，useSavingPlans 负责存储读写。
// ============================================================
import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { REWARD_STORAGE_KEYS } from './types'

export type SavingMode = 'accumulate' | '52week' | 'wish'

export interface SavingDeposit {
  at: string
  amount: number
  note?: string
}

export interface SavingPlan {
  id: string
  mode: SavingMode
  /** 计划名（攒钱/心愿物品名） */
  name: string
  /** 目标金额；52week 由基础额自动折算 = weekPlanTotal(baseAmount) */
  targetAmount: number
  /** 52week 第 1 周金额；其他模式为 0（不启用） */
  baseAmount: number
  currentAmount: number
  deposits: SavingDeposit[]
  createdAt: string
  /** 心愿：目标完成日 yyyy-mm-dd */
  targetDate?: string
  /** 52week：已完成周集合 1..52 */
  weeksDone: number[]
  done: boolean
  completedAt?: string
}

const KEY = REWARD_STORAGE_KEYS.SAVING_PLANS

/** 52 周挑战：第 week 周应存金额 = base * week */
export function weekDepositAmount(base: number, week: number): number {
  return Math.max(0, Math.round(base * Math.floor(week) * 100) / 100)
}

/** 52 周挑战：全期总目标 = base * Σ(1..52) = base * 1378 */
export function weekPlanTotal(base: number): number {
  return Math.round(base * 52 * 53 * 100 / 2) / 100
}

/** 计划已存总额 = 各笔存款合计 */
export function totalDeposited(plan: Pick<SavingPlan, 'deposits'>): number {
  return plan.deposits.reduce((s, d) => s + d.amount, 0)
}

export interface PlanProgress {
  current: number
  target: number
  percent: number
  remaining: number
  done: boolean
}

/** 计划进度：已存 / 目标 / 完成度(0-100，封顶) / 差额(可负) / 是否完成 */
export function planProgress(plan: Pick<SavingPlan, 'currentAmount' | 'targetAmount' | 'done'>): PlanProgress {
  const target = Math.max(0, plan.targetAmount)
  const done = plan.done || (target > 0 && plan.currentAmount >= target)
  const percent = target > 0 ? Math.min(Math.round((plan.currentAmount / target) * 100), 100) : 0
  return {
    current: plan.currentAmount,
    target,
    percent,
    remaining: target - plan.currentAmount,
    done,
  }
}

/** 52week 下一个待完成周（1..52 中最小未完成周；全部完成返回 null） */
export function nextWeek(plan: Pick<SavingPlan, 'weeksDone' | 'baseAmount'>): number | null {
  for (let w = 1; w <= 52; w++) {
    if (!plan.weeksDone.includes(w)) return w
  }
  return null
}

/** 52week 已完成金额（按已完成周的应存额累计） */
export function weeksDeposited(plan: Pick<SavingPlan, 'weeksDone' | 'baseAmount'>): number {
  return plan.weeksDone.reduce((s, w) => s + weekDepositAmount(plan.baseAmount, w), 0)
}

/** 追加一笔存款，返回新对象并同步当前金额与完成态 */
export function applyDeposit(
  plan: SavingPlan,
  amount: number,
  at: string,
  note?: string,
): SavingPlan {
  const deposits = [...plan.deposits, { at, amount, note }]
  const currentAmount = totalDeposited({ deposits })
  const done = plan.targetAmount > 0 && currentAmount >= plan.targetAmount
  return {
    ...plan,
    deposits,
    currentAmount,
    done,
    completedAt: done ? (plan.completedAt ?? at) : undefined,
  }
}

/** 52week 标记第 week 周完成：追加对应应存额存款（防重），同步进度 */
export function applyWeek(plan: SavingPlan, week: number): SavingPlan {
  const w = Math.max(1, Math.min(52, Math.floor(week)))
  if (plan.mode !== '52week' || plan.weeksDone.includes(w)) return plan
  const amount = weekDepositAmount(plan.baseAmount, w)
  const deposits = [...plan.deposits, { at: plan.createdAt.slice(0, 10) || new Date().toISOString().slice(0, 10), amount, note: `第${w}周` }]
  const weeksDone = [...plan.weeksDone, w].sort((a, b) => a - b)
  const currentAmount = weeksDeposited({ weeksDone, baseAmount: plan.baseAmount })
  const done = weeksDone.length >= 52 && plan.targetAmount > 0 && currentAmount >= plan.targetAmount
  return {
    ...plan,
    deposits,
    weeksDone,
    currentAmount,
    done,
    completedAt: done ? (plan.completedAt ?? plan.createdAt) : undefined,
  }
}

export type SavingPlanCreate = {
  mode: SavingMode
  name: string
  /** 攒钱/心愿：目标金额 */
  targetAmount?: number
  /** 52week：第 1 周基础金额 */
  baseAmount?: number
  /** 心愿：目标完成日 */
  targetDate?: string
}

/** 由创建参数生成本地（未落库）的新计划对象 */
export function buildPlan(input: SavingPlanCreate): SavingPlan {
  const now = new Date().toISOString()
  const mode = input.mode
  const baseAmount = Math.max(0, Math.round((input.baseAmount ?? 0) * 100) / 100)
  const targetAmount =
    mode === '52week'
      ? weekPlanTotal(baseAmount)
      : Math.max(0, Math.round((input.targetAmount ?? 0) * 100) / 100)
  return {
    id: `sp${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`,
    mode,
    name: input.name.trim() || (mode === '52week' ? '52 周打卡' : '存钱计划'),
    targetAmount,
    baseAmount: mode === '52week' ? baseAmount : 0,
    currentAmount: 0,
    deposits: [],
    createdAt: now,
    targetDate: input.targetDate || undefined,
    weeksDone: [],
    done: false,
  }
}

export const SAVING_MODE_META: Record<SavingMode, { label: string; icon: string; color: string }> = {
  accumulate: { label: '攒钱', icon: '🏦', color: '#8a9a7a' },
  '52week': { label: '52周', icon: '🗓️', color: '#6b9fc4' },
  wish: { label: '心愿', icon: '🎯', color: '#d98c7a' },
}

// ---- 存储读写 ----
export function useSavingPlans() {
  const plans = ref<SavingPlan[]>(storage.getKV<SavingPlan[]>(KEY, []))

  function persist(): void {
    storage.setKV(KEY, plans.value)
  }
  function load(): void {
    plans.value = storage.getKV<SavingPlan[]>(KEY, [])
  }

  function create(data: SavingPlanCreate): SavingPlan {
    const plan = buildPlan(data)
    plans.value.push(plan)
    persist()
    return plan
  }

  function deposit(id: string, amount: number, at: string, note?: string): void {
    const i = plans.value.findIndex(p => p.id === id)
    if (i < 0 || amount <= 0) return
    plans.value[i] = applyDeposit(plans.value[i], amount, at, note)
    persist()
  }

  function markWeek(id: string, week: number): void {
    const i = plans.value.findIndex(p => p.id === id)
    if (i < 0) return
    plans.value[i] = applyWeek(plans.value[i], week)
    persist()
  }

  function remove(id: string): void {
    plans.value = plans.value.filter(p => p.id !== id)
    persist()
  }

  return { plans, create, deposit, markWeek, remove, load }
}