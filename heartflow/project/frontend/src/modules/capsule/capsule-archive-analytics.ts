// ============================================================
// 时光胶囊 · 胶囊档案分析引擎（档案陈列，纯函数 + now 可测）
// 把一封封封存与开启的胶囊，拢成一册安放；只呈现，不催促。
// ============================================================

import type { TimeCapsule, CapsuleItemType } from './index'

// ============================================================
// 类型元数据
// ============================================================

export const CAPSULE_ITEM_TYPE_META: Record<CapsuleItemType, { icon: string; label: string }> = {
  note: { icon: '📝', label: '笔记' },
  crystal: { icon: '💎', label: '结晶' },
}

export function capsuleItemTypeLabel(t: string): string {
  return CAPSULE_ITEM_TYPE_META[t as CapsuleItemType]?.label || t || '条目'
}

export function capsuleItemTypeIcon(t: string): string {
  return CAPSULE_ITEM_TYPE_META[t as CapsuleItemType]?.icon || '🔖'
}

// ============================================================
// 日期工具（本地时区，避免测试受真实日期漂移影响）
// ============================================================

function localDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

/** ISO 毫秒时间戳 → YYYY-MM-DD */
function localDateOfIso(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : localDateStr(d)
}

const DAY_MS = 24 * 60 * 60 * 1000

/** 本地时区下「今天」与目标日（YYYY-MM-DD）之间相差的整天数（0=今天） */
function dayDiffFromToday(target: string, todayObj: Date): number {
  const targetMs = new Date(`${target}T00:00:00`).getTime()
  const todayStart = startOfDay(todayObj).getTime()
  return Math.round((targetMs - todayStart) / DAY_MS)
}

// ============================================================
// 1. 胶囊档案概览
// ============================================================

export interface CapsuleArchiveOverview {
  totalCount: number
  sealedCount: number
  openedCount: number
  itemCount: number
  noteCount: number
  crystalCount: number
  /** 今天或已到开启日的胶囊数（可开启/期盼中） */
  openableToday: number
  /** 距最近的待开启胶囊的天数；无待开启则为 null */
  nextOpenDays: number | null
  /** 平均封存时长（从封存到开启的整天数，仅统计已开启） */
  avgSealDays: number
  /** 最长封存时长 */
  longestSealDays: number
  firstDate: string
  lastDate: string
}

export function capsuleArchiveOverview(capsules: TimeCapsule[], now: Date): CapsuleArchiveOverview {
  const totalCount = capsules.length
  const sealed = capsules.filter(c => !c.openedAt)
  const opened = capsules.filter(c => c.openedAt)
  const sealedCount = sealed.length
  const openedCount = opened.length

  let itemCount = 0
  let noteCount = 0
  let crystalCount = 0
  for (const c of capsules) {
    itemCount += c.items.length
    noteCount += c.items.filter(i => i.type === 'note').length
    crystalCount += c.items.filter(i => i.type === 'crystal').length
  }

  let openableToday = 0
  let nextOpenDays: number | null = null
  for (const c of sealed) {
    const d = dayDiffFromToday(c.openDate, now)
    if (d <= 0) openableToday++
    else if (nextOpenDays === null || d < nextOpenDays) nextOpenDays = d
  }

  const sealDurations = opened
    .filter(c => c.openedAt && c.createdAt)
    .map(c => {
      const created = startOfDay(new Date(c.createdAt)).getTime()
      const openedDay = startOfDay(new Date(localDateOfIso(c.openedAt as string))).getTime()
      return Math.max(0, Math.round((openedDay - created) / DAY_MS))
    })
  const avgSealDays = sealDurations.length > 0
    ? Math.round(sealDurations.reduce((a, b) => a + b, 0) / sealDurations.length)
    : 0
  const longestSealDays = sealDurations.length > 0 ? Math.max(...sealDurations) : 0

  const timestamps = capsules.map(c => new Date(c.createdAt).getTime()).filter(t => !isNaN(t))
  return {
    totalCount,
    sealedCount,
    openedCount,
    itemCount,
    noteCount,
    crystalCount,
    openableToday,
    nextOpenDays,
    avgSealDays,
    longestSealDays,
    firstDate: timestamps.length > 0 ? localDateStr(new Date(Math.min(...timestamps))) : '',
    lastDate: timestamps.length > 0 ? localDateStr(new Date(Math.max(...timestamps))) : '',
  }
}

// ============================================================
// 2. 封存内容分布
// ============================================================

export interface CapsuleItemTypeRow {
  type: string
  icon: string
  label: string
  count: number
  percentage: number
}

export function capsuleItemTypeRows(capsules: TimeCapsule[]): CapsuleItemTypeRow[] {
  const map = new Map<string, number>()
  for (const c of capsules) {
    for (const it of c.items) {
      map.set(it.type, (map.get(it.type) || 0) + 1)
    }
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0)
  return (['note', 'crystal'] as const)
    .map(type => ({
      type,
      icon: capsuleItemTypeIcon(type),
      label: capsuleItemTypeLabel(type),
      count: map.get(type) || 0,
      percentage: total > 0 ? Math.round(((map.get(type) || 0) / total) * 100) : 0,
    }))
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count)
}

/** 稍后每封胶囊携带多少条内容 */
export interface CapsuleItemCountRow {
  count: number
  capsules: number
}

export function capsuleItemCountRows(capsules: TimeCapsule[]): CapsuleItemCountRow[] {
  const map = new Map<number, number>()
  for (const c of capsules) {
    map.set(c.items.length, (map.get(c.items.length) || 0) + 1)
  }
  return [...map.entries()]
    .map(([count, capsules]) => ({ count, capsules }))
    .sort((a, b) => b.capsules - a.capsules)
}

// ============================================================
// 3. 封存节律
// ============================================================

export interface CapsuleRhythm {
  /** 有封存或开启动作的天数 */
  activeDays: number
  /** 首末动作跨度（天） */
  spanDays: number
  /** 已开启/全部 的开启率（0-100） */
  openRate: number
  /** 当前连续活跃（每天都有胶囊动作）天数 */
  currentStreak: number
  /** 最长连续活跃天数 */
  bestStreak: number
  /** 平均每封等待开启的整天数（仅封存中） */
  avgWaitDays: number
  /** 涉及的月份数 */
  monthsTracked: number
}

export function capsuleRhythm(capsules: TimeCapsule[], now: Date): CapsuleRhythm {
  const actionDates = new Set<string>()
  for (const c of capsules) {
    const created = localDateOfIso(c.createdAt)
    if (created) actionDates.add(created)
    if (c.openedAt) {
      const opened = localDateOfIso(c.openedAt)
      if (opened) actionDates.add(opened)
    }
  }
  const dates = [...actionDates].sort()
  const activeDays = dates.length

  let spanDays = 0
  if (dates.length > 0) {
    const first = new Date(dates[0] + 'T00:00:00').getTime()
    const last = new Date(dates[dates.length - 1] + 'T00:00:00').getTime()
    spanDays = Math.max(0, Math.round((last - first) / DAY_MS))
  }

  const opened = capsules.filter(c => c.openedAt).length
  const openRate = capsules.length > 0 ? Math.round((opened / capsules.length) * 100) : 0

  // 当前连续：今天或昨天有动作即视为连续进行中
  let currentStreak = 0
  {
    const todayStr = localDateStr(now)
    let anchor = ''
    if (actionDates.has(todayStr)) anchor = todayStr
    else {
      const y = new Date(now.getTime() - DAY_MS)
      if (actionDates.has(localDateStr(y))) anchor = localDateStr(y)
    }
    if (anchor) {
      let cursor = new Date(anchor + 'T00:00:00').getTime()
      while (actionDates.has(localDateStr(new Date(cursor)))) {
        currentStreak++
        cursor -= DAY_MS
      }
    }
  }

  // 最长连续
  let bestStreak = 0
  {
    let run = 0
    let prevMs = -Infinity
    for (const s of dates) {
      const ms = new Date(s + 'T00:00:00').getTime()
      if (run > 0 && ms - prevMs === DAY_MS) run++
      else run = 1
      if (run > bestStreak) bestStreak = run
      prevMs = ms
    }
  }

  // 封存中胶囊平均等待天数
  const sealed = capsules.filter(c => !c.openedAt)
  let avgWaitDays = 0
  if (sealed.length > 0) {
    const sum = sealed.reduce((s, c) => s + Math.max(0, dayDiffFromToday(c.openDate, now)), 0)
    avgWaitDays = Math.round(sum / sealed.length)
  }

  const months = new Set(dates.map(s => s.slice(0, 7)))

  return {
    activeDays,
    spanDays,
    openRate,
    currentStreak,
    bestStreak,
    avgWaitDays,
    monthsTracked: months.size,
  }
}

// ============================================================
// 4. 等待分布（封存中胶囊的开启日远近）
// ============================================================

export interface CapsuleWaitRow {
  bucket: string
  count: number
  days: number
}

export function capsuleWaitRows(capsules: TimeCapsule[], now: Date): CapsuleWaitRow[] {
  const sealed = capsules.filter(c => !c.openedAt)
  const buckets: { bucket: string; min: number; max: number }[] = [
    { bucket: '近 7 天', min: 0, max: 7 },
    { bucket: '半月内', min: 8, max: 15 },
    { bucket: '一月内', min: 16, max: 30 },
    { bucket: '一季内', min: 31, max: 90 },
    { bucket: '更远未来', min: 91, max: Infinity },
  ]
  const counts = buckets.map(() => 0)
  for (const c of sealed) {
    const d = dayDiffFromToday(c.openDate, now)
    for (let i = 0; i < buckets.length; i++) {
      if (d <= buckets[i].max) { counts[i]++; break }
    }
  }
  return buckets
    .map((b, i) => ({ bucket: b.bucket, count: counts[i], days: b.min === 0 ? 0 : b.min }))
    .filter(r => r.count > 0)
}

// ============================================================
// 5. 胶囊健康
// ============================================================

export interface CapsuleArchiveHealth {
  score: number
  seal: number
  recall: number
  anticipation: number
  label: string
}

const CAPSULE_HEALTH_LABELS: { min: number; label: string }[] = [
  { min: 80, label: '心意常封' },
  { min: 60, label: '渐渐成习' },
  { min: 40, label: '偶有封存' },
  { min: 0, label: '静待启封' },
]

function capsuleHealthLabel(score: number): string {
  for (const h of CAPSULE_HEALTH_LABELS) if (score >= h.min) return h.label
  return CAPSULE_HEALTH_LABELS[CAPSULE_HEALTH_LABELS.length - 1].label
}

export function capsuleArchiveHealth(capsules: TimeCapsule[], now: Date): CapsuleArchiveHealth {
  const ov = capsuleArchiveOverview(capsules, now)
  const rhy = capsuleRhythm(capsules, now)

  // 封存活力：封存中的胶囊是否让心意连续；用「今天可开启/近一周有待开启」作正向信号
  let seal = 0
  if (ov.totalCount === 0) seal = 0
  else if (ov.openableToday > 0) seal = 100
  else if (ov.nextOpenDays !== null && ov.nextOpenDays <= 7) seal = 80
  else if (ov.nextOpenDays !== null && ov.nextOpenDays <= 30) seal = 55
  else seal = 30

  // 回望率：已开启占比，越高越接近「写给自己、也读回自己」的闭环
  const recall = ov.totalCount > 0 ? Math.min(100, Math.round((ov.openedCount / ov.totalCount) * 100) + 10) : 0

  // 期待感：平均等待天数越大越浓；结合实际持续封存的活跃度
  const anticipation = Math.min(100, Math.round(capsuleWaitScore(rhy.avgWaitDays)))

  const score = Math.max(0, Math.min(100, Math.round(seal * 0.45 + recall * 0.3 + anticipation * 0.25)))
  return { score, seal, recall, anticipation, label: capsuleHealthLabel(score) }
}

/** 平均等待天数 → 0-100 的期待浓度（越高越浓，但过于遥远则回落） */
function capsuleWaitScore(avgWaitDays: number): number {
  if (avgWaitDays <= 0) return 0
  if (avgWaitDays <= 14) return Math.round((avgWaitDays / 14) * 55)
  if (avgWaitDays <= 60) return 55 + Math.round(((avgWaitDays - 14) / 46) * 30)
  if (avgWaitDays <= 180) return 85 + Math.round(((avgWaitDays - 60) / 120) * 10)
  return 95
}

// ============================================================
// 6. 温和洞察
// ============================================================

export interface CapsuleInsight {
  text: string
}

export function capsuleInsights(capsules: TimeCapsule[], now: Date): CapsuleInsight[] {
  const out: CapsuleInsight[] = []
  const ov = capsuleArchiveOverview(capsules, now)
  const rhy = capsuleRhythm(capsules, now)

  if (ov.totalCount === 0) {
    out.push({ text: '时光盒还空着，等一句想留给未来的话，随时可以封存第一封。' })
    return out
  }

  if (ov.openableToday > 0) {
    out.push({ text: `有 ${ov.openableToday} 封胶囊已到开启日，正静候你拆开。` })
  } else if (ov.nextOpenDays !== null) {
    out.push({ text: `最近一封还有 ${ov.nextOpenDays} 天开启，期待慢慢涨起来。` })
  }

  if (ov.openedCount > 0) {
    out.push({ text: `已拆开 ${ov.openedCount} 封，平均封存 ${ov.avgSealDays} 天才回望一次。` })
  }

  if (ov.crystalCount > 0) {
    out.push({ text: `封存了 ${ov.crystalCount} 枚结晶，被收藏的瞬间最难忘。` })
  }

  if (rhy.currentStreak >= 2) {
    out.push({ text: `已连续 ${rhy.currentStreak} 天与封存箱碰面，仪式正一点点长出来。` })
  }

  if (ov.sealedCount > 0 && ov.openedCount === 0) {
    out.push({ text: '还一封都没拆，等时间与心情都准备好的那天。' })
  }

  return out.slice(0, 4)
}