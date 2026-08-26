// ============================================================
// 逐日心锚 · 心愿锚（生辰 / 时光序启发）
// ------------------------------------------------------------
// 借鉴「生辰·心愿单」「时光序·心愿清单」：记录心愿、设目标日期，
// 心愿单倒计时与紧急程度标记。拥趸内在驱动而非外部奖惩，
// 全部本地存储，守宪法第1条本地私有 / 第2条超级自定义。
// 纯函数核心（可单测）+ 轻量持久化，供 WishAnchorPanel 渲染。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

// ============================================================
// 类型
// ============================================================

/** 心愿紧急性等级 */
export type WishUrgency = 'urgent' | 'soon' | 'ahead' | 'long-term' | 'overdue' | 'done'

/** 单条心愿 */
export interface Wish {
  id: string
  title: string
  note?: string
  /** 目标日期 YYYY-MM-DD */
  targetDate: string
  createdAt: string
  done: boolean
  doneAt?: string
}

/** 心愿 + 计算态 */
export interface WishView extends Wish {
  /** 距目标日剩余天（可负 = 已过期） */
  daysLeft: number
  urgency: WishUrgency
  urgencyLabel: string
}

export interface WishStats {
  total: number
  done: number
  active: number
  overdue: number
}

export interface WishAnchorPref {
  /** 是否在首次建立时使用推荐日期 */
  recommendDefault: boolean
}

const STORAGE_KEY = 'hf:wish_anchor_list'
const PREF_KEY = 'hf:wish_anchor_pref'

export const DEFAULT_WISH_PREF: WishAnchorPref = { recommendDefault: true }

export const URGENCY_META: Record<WishUrgency, { label: string; color: string }> = {
  overdue: { label: '已过期', color: '#ef4444' },
  urgent: { label: '迫在眉睫', color: '#f59e0b' },
  soon: { label: '临近', color: '#f0c040' },
  ahead: { label: '从容', color: '#6b9fc4' },
  'long-term': { label: '长期', color: '#9ca3af' },
  done: { label: '已达成', color: '#34d399' },
}

// ============================================================
// 纯函数核心
// ============================================================

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000)
}

/** 由剩余天数映射紧急程度 */
export function urgencyFor(daysLeft: number, done: boolean): WishUrgency {
  if (done) return 'done'
  if (daysLeft < 0) return 'overdue'
  if (daysLeft <= 7) return 'urgent'
  if (daysLeft <= 30) return 'soon'
  if (daysLeft <= 180) return 'ahead'
  return 'long-term'
}

export function urgencyLabelFor(u: WishUrgency): string {
  return URGENCY_META[u].label
}

/** 计算单条心愿的视图态 */
export function viewWish(wish: Wish, now: Date = new Date()): WishView {
  const daysLeft = dayDiff(now, new Date(wish.targetDate))
  const urgency = urgencyFor(daysLeft, wish.done)
  return {
    ...wish,
    daysLeft,
    urgency,
    urgencyLabel: urgencyLabelFor(urgency),
  }
}

/** 生成心愿统计（按活跃/已达成/已过期） */
export function computeWishStats(wishes: Wish[], now: Date = new Date()): WishStats {
  const done = wishes.filter((w) => w.done).length
  const overdue = wishes.filter((w) => !w.done && dayDiff(now, new Date(w.targetDate)) < 0).length
  return { total: wishes.length, done, active: wishes.length - done, overdue }
}

/** 汇总否 将心愿按紧急程度排序（过期→迫在眉睫→……→长期→已达成） */
export function sortWishes(wishes: Wish[], now: Date = new Date()): WishView[] {
  const order: WishUrgency[] = ['overdue', 'urgent', 'soon', 'ahead', 'long-term', 'done']
  return wishes
    .map((w) => viewWish(w, now))
    .sort((a, b) => order.indexOf(a.urgency) - order.indexOf(b.urgency) || a.daysLeft - b.daysLeft)
}

/** 推荐目标日期：7 天后 */
export function recommendTargetDate(from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 7)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ============================================================
// 组合 API（持久化）
// ============================================================

function loadWishes(): Wish[] {
  try {
    return storage.getKV<Wish[]>(STORAGE_KEY, [])
  } catch {
    return []
  }
}

function loadPref(): WishAnchorPref {
  try {
    return { ...DEFAULT_WISH_PREF, ...storage.getKV<Partial<WishAnchorPref>>(PREF_KEY, {}) }
  } catch {
    return { ...DEFAULT_WISH_PREF }
  }
}

export function useWishAnchor() {
  const wishes = ref<Wish[]>(loadWishes())
  const pref = ref<WishAnchorPref>(loadPref())

  function persist(): void {
    storage.setKV(STORAGE_KEY, wishes.value)
  }
  function persistPref(): void {
    storage.setKV(PREF_KEY, pref.value)
  }

  function create(title: string, targetDate: string, note = ''): Wish {
    const wish: Wish = {
      id: `wish_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title: title.trim(),
      note: note.trim() || undefined,
      targetDate,
      createdAt: new Date().toISOString(),
      done: false,
    }
    wishes.value.push(wish)
    persist()
    return wish
  }

  function update(id: string, data: Partial<Pick<Wish, 'title' | 'note' | 'targetDate'>>): void {
    const w = wishes.value.find((w) => w.id === id)
    if (!w) return
    if (data.title !== undefined) w.title = data.title.trim()
    if (data.note !== undefined && data.note !== null) w.note = data.note.trim() || undefined
    if (data.targetDate !== undefined) w.targetDate = data.targetDate
    persist()
  }

  function toggleDone(id: string): void {
    const w = wishes.value.find((w) => w.id === id)
    if (!w) return
    w.done = !w.done
    w.doneAt = w.done ? new Date().toISOString() : undefined
    persist()
  }

  function remove(id: string): void {
    wishes.value = wishes.value.filter((w) => w.id !== id)
    persist()
  }

  const views = computed<WishView[]>(() => sortWishes(wishes.value))
  const stats = computed<WishStats>(() => computeWishStats(wishes.value))

  function setRecommendDefault(v: boolean): void {
    pref.value.recommendDefault = v
    persistPref()
  }

  return {
    wishes: computed(() => wishes.value),
    views,
    stats,
    pref: computed(() => pref.value),
    create,
    update,
    toggleDone,
    remove,
    setRecommendDefault,
  }
}