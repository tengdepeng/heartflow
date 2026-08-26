// ============================================================
// 成长庭院 · 心愿清单（习惯联动解锁）
// ------------------------------------------------------------
// 借鉴 时光序「心愿清单与习惯联动」：心愿绑定若干习惯，
// 每个习惯需完成指定次数，全部达标即点亮心愿。
// 数据本地私有（宪法第1条），纯函数可单测。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 心愿实体
// ============================================================

export interface Wish {
  id: string
  title: string
  description?: string
  icon: string
  /** 关联习惯 id 列表 */
  linkedHabitIds: string[]
  /** 每个习惯需要完成的次数（habitId -> 次数） */
  requiredCounts: Record<string, number>
  /** 是否已点亮 */
  unlocked: boolean
  createdAt: string
  unlockedAt?: string
}

export interface WishInput {
  title: string
  description?: string
  icon?: string
  linkedHabitIds?: string[]
  requiredCounts?: Record<string, number>
}

// ============================================================
// 纯函数：进度计算
// ============================================================

export interface WishProgress {
  completed: boolean
  /** 整体进度 0-100 */
  percent: number
  doneHabits: number
  totalHabits: number
  /** 距离最近达标的习惯 */
  nextHabit: { habitId: string; current: number; required: number } | null
}

/** 计算心愿解锁进度（counts: habitId -> 已完成次数） */
export function wishProgress(wish: Wish, counts: Record<string, number>): WishProgress {
  const totalHabits = wish.linkedHabitIds.length
  let doneHabits = 0
  let sumPercent = 0
  let nextHabit: { habitId: string; current: number; required: number } | null = null
  for (const habitId of wish.linkedHabitIds) {
    const required = Math.max(1, wish.requiredCounts[habitId] ?? 1)
    const current = counts[habitId] ?? 0
    sumPercent += Math.min(current / required, 1)
    if (current >= required) doneHabits++
    else if (!nextHabit) nextHabit = { habitId, current, required }
  }
  const percent = totalHabits > 0 ? Math.round((sumPercent / totalHabits) * 100) : 0
  return {
    completed: totalHabits > 0 && doneHabits === totalHabits,
    percent,
    doneHabits,
    totalHabits,
    nextHabit,
  }
}

/** 由习惯列表（ticks 数组）汇总各习惯完成次数 */
export function habitCompletionCounts(habits: { id: string; ticks: string[] }[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const h of habits) counts[h.id] = h.ticks.length
  return counts
}

// ============================================================
// 纯函数：心愿清单概览
// ============================================================

export interface WishlistOverview {
  total: number
  unlocked: number
  locked: number
  /** 整体点亮进度 0-100 */
  overallPercent: number
  recentlyUnlocked: Wish[]
}

export function wishlistOverview(
  wishes: Wish[],
  counts: Record<string, number>,
): WishlistOverview {
  const unlocked = wishes.filter(w => w.unlocked)
  const sumPercent = wishes.reduce(
    (s, w) => s + (w.unlocked ? 100 : wishProgress(w, counts).percent),
    0,
  )
  const recentlyUnlocked = [...unlocked]
    .filter(w => w.unlockedAt)
    .sort((a, b) => (b.unlockedAt ?? '').localeCompare(a.unlockedAt ?? ''))
    .slice(0, 3)
  return {
    total: wishes.length,
    unlocked: unlocked.length,
    locked: wishes.length - unlocked.length,
    overallPercent: wishes.length > 0 ? Math.round(sumPercent / wishes.length) : 0,
    recentlyUnlocked,
  }
}

/** 温和小结（不评判，只陈述） */
export function wishlistInsights(wishes: Wish[], counts: Record<string, number>): string[] {
  const insights: string[] = []
  const unlocked = wishes.filter(w => w.unlocked).length
  if (unlocked > 0) insights.push(`已点亮 ${unlocked} 个心愿`)
  const nearest = wishes
    .filter(w => !w.unlocked)
    .map(w => ({ wish: w, p: wishProgress(w, counts) }))
    .filter(x => x.p.percent > 0)
    .sort((a, b) => b.p.percent - a.p.percent)[0]
  if (nearest) insights.push(`「${nearest.wish.title}」已接近点亮（${nearest.p.percent}%）`)
  const waiting = wishes.filter(w => !w.unlocked && wishProgress(w, counts).percent === 0).length
  if (waiting > 0) insights.push(`${waiting} 个心愿还在等待第一次行动`)
  return insights
}

// ============================================================
// 心愿清单存储（KV 持久化）
// ============================================================

const WISHES_KEY = 'hf:garden:wishes'

const wishes = ref<Wish[]>([])

function generateId(): string {
  return `wish_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

export function useWishList() {
  function load(): void {
    try {
      wishes.value = storage.getKV<Wish[]>(WISHES_KEY, []) || []
    } catch {
      wishes.value = []
    }
  }

  function save(): void {
    storage.setKV(WISHES_KEY, wishes.value)
  }

  function addWish(input: WishInput): Wish {
    const wish: Wish = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description?.trim(),
      icon: input.icon ?? '✨',
      linkedHabitIds: input.linkedHabitIds ?? [],
      requiredCounts: input.requiredCounts ?? {},
      unlocked: false,
      createdAt: new Date().toISOString(),
    }
    wishes.value.push(wish)
    save()
    return wish
  }

  function updateWish(id: string, patch: Partial<Wish>): Wish | undefined {
    const w = wishes.value.find(x => x.id === id)
    if (!w) return
    Object.assign(w, patch)
    save()
    return w
  }

  function removeWish(id: string): boolean {
    const idx = wishes.value.findIndex(w => w.id === id)
    if (idx === -1) return false
    wishes.value = wishes.value.filter(w => w.id !== id)
    save()
    return true
  }

  /** 根据习惯完成次数刷新解锁状态，返回本次新点亮的心愿 */
  function refreshUnlocks(counts: Record<string, number>): Wish[] {
    const newly: Wish[] = []
    for (const w of wishes.value) {
      if (w.unlocked) continue
      if (wishProgress(w, counts).completed) {
        w.unlocked = true
        w.unlockedAt = new Date().toISOString()
        newly.push(w)
      }
    }
    if (newly.length > 0) save()
    return newly
  }

  return {
    wishes,
    load,
    save,
    addWish,
    updateWish,
    removeWish,
    refreshUnlocks,
  }
}
