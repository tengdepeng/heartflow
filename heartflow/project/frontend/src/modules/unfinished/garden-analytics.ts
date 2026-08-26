// ============================================================
// 未完成花园 · 复垦分析引擎（garden-analytics）
// 把"未完成"变成可行动的养分：花园气象、拾起时机、复垦洞察。
// 全纯函数、本地计算，零网络出口（守宪法第 1 条）。
// ============================================================

import type { UItem } from './unfinished-store'

export type GardenType = 'seed' | 'book' | 'draft'
export type BucketKey = 'fresh' | 'maturing' | 'dusty' | 'forgotten'

const DAY = 86_400_000

function parseTime(s?: string): number {
  if (!s) return 0
  const t = new Date(s).getTime()
  return Number.isNaN(t) ? 0 : t
}

function daysSince(since: number, now: number): number {
  return Math.max(0, Math.round((now - since) / DAY))
}

/** 一条未完成事项的"沉淀基准"：优先 dormantSince，其次 updatedAt，最后 at */
function anchorOf(i: UItem): number {
  return parseTime(i.dormantSince) || parseTime(i.updatedAt) || parseTime(i.at)
}

export interface GardenBucket {
  key: BucketKey
  label: string
  count: number
}

export interface GardenStats {
  total: number
  completed: number
  /** 完成率 0-100（含已完成的占比） */
  completionRate: number
  active: number
  byType: Record<GardenType, number>
  buckets: GardenBucket[]
}

/**
 * 花园气象：总量、完成率、类型分布、以及"沉淀时长"分档。
 * 档位：新芽 ≤7 天 / 渐长 ≤30 天 / 蒙尘 ≤90 天 / 遗忘 >90 天。
 */
export function gardenStats(items: UItem[], now: Date = new Date()): GardenStats {
  const nowT = now.getTime()
  const completed = items.filter((i) => i.completed).length
  const activeItems = items.filter((i) => !i.completed)
  const total = items.length || 0

  const byType: Record<GardenType, number> = { seed: 0, book: 0, draft: 0 }
  for (const i of activeItems) byType[i.type] = (byType[i.type] || 0) + 1

  const buckets: GardenBucket[] = [
    { key: 'fresh', label: '新芽', count: 0 },
    { key: 'maturing', label: '渐长', count: 0 },
    { key: 'dusty', label: '蒙尘', count: 0 },
    { key: 'forgotten', label: '遗忘', count: 0 },
  ]
  for (const i of activeItems) {
    const d = daysSince(anchorOf(i), nowT)
    if (d <= 7) buckets[0].count++
    else if (d <= 30) buckets[1].count++
    else if (d <= 90) buckets[2].count++
    else buckets[3].count++
  }

  return {
    total,
    completed,
    completionRate: total ? Math.round((completed / total) * 100) : 0,
    active: activeItems.length,
    byType,
    buckets,
  }
}

export interface PickCandidate {
  item: UItem
  score: number
  reason: string
}

/** 单件"拾起价值"打分：种子/短稿更易完成、近期动过更有冲劲、有进度更值得续、放弃态降权 */
function pickupScore(i: UItem, nowT: number): number {
  const d = daysSince(anchorOf(i), nowT)
  const ease = { seed: 0.95, draft: 0.62, book: 0.34 }[i.type] ?? 0.4
  let age = 1
  if (d <= 3) age = 1.35      // 刚想过，趁热
  else if (d <= 14) age = 1.12
  else if (d <= 60) age = 1.0
  else age = 0.78             // 太久未动，让位给更温的
  let status = 1
  if (i.status === 'abandoned') status = 0.25
  else if (i.status === 'paused') status = 0.7
  const progress = i.progress && i.progress !== '开头' ? 1.25 : 1
  return Math.round(ease * age * status * progress * 100)
}

function reasonOf(i: UItem, d: number): string {
  const ease = { seed: '顺手可结', draft: '补上即可', book: '续读即进' }[i.type] ?? ''
  const age =
    d <= 3 ? '刚动过，趁热拾起'
    : d <= 30 ? '还在保鲜期'
    : d <= 90 ? '搁得有些久了'
    : '沉淀了很久'
  if (i.status === 'paused') return `${ease} · 暂停中，重新接下`
  if (i.status === 'abandoned') return `${ease} · 曾想放弃，可再给一次机会`
  if (i.progress && i.progress !== '开头') return `${ease} · 已到「${i.progress}」，别断`
  return `${ease} · ${age}`
}

/** 把未完成事项按"拾起价值"从高到低排序（仅未完成项） */
export function rankForPickup(items: UItem[], now: Date = new Date()): PickCandidate[] {
  const nowT = now.getTime()
  return items
    .filter((i) => !i.completed)
    .map((i) => {
      const score = pickupScore(i, nowT)
      return { item: i, score, reason: reasonOf(i, daysSince(anchorOf(i), nowT)) }
    })
    .sort((a, b) => b.score - a.score)
}

/** 今日最该拾起的一件事（无未完成项时返回 null） */
export function pickUpSuggestion(items: UItem[], now: Date = new Date()): PickCandidate | null {
  const ranked = rankForPickup(items, now)
  return ranked[0] ?? null
}

/**
 * 复垦洞察：把花园气象与拾起建议翻译成人话。
 * 返回最多 limit 条，按优先级排列。
 */
export function gardenInsights(items: UItem[], now: Date = new Date()): string[] {
  const out: string[] = []
  if (items.length === 0) return ['花园还空着。放一件未完成的事进来，它会在你回头时变肥沃。']

  const stats = gardenStats(items, now)
  const suggestion = pickUpSuggestion(items, now)

  if (stats.completed > 0 && stats.completionRate >= 30) {
    out.push(`已完成 ${stats.completed} 件（完成率 ${stats.completionRate}%），收束的力量在生长。`)
  }

  const dusty = stats.buckets[2].count
  const forgotten = stats.buckets[3].count
  if (dusty + forgotten > 0) {
    out.push(`${dusty + forgotten} 件已蒙尘 ${stats.buckets[2].label}${stats.buckets[2].count}/${stats.buckets[3].label}${stats.buckets[3].count} 天以上——要么拾起，要么体面放手。`)
  }

  if (suggestion) {
    out.push(`今日先拾起「${suggestion.item.text}」：${suggestion.reason}。`)
  }

  return out
}