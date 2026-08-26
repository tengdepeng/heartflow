// ============================================================
// 思绪书房 · 知识年轮
// 蓝图定义：
//   光圈系统：再认/回顾 → 光圈，遗忘 → 裂缝，遗忘后重逢 → 突然变亮
//   基于艾宾浩斯遗忘曲线的间隔重复
//   年轮层数反映知识掌握深度
// ============================================================

import type { Note } from '../../types'

// ---- 知识年轮记录 ----

export interface KnowledgeRing {
  /** 关联笔记 ID */
  noteId: string
  /** 笔记标题（快照） */
  title: string
  /** 年轮层数（0=新芽，越高越深） */
  rings: number
  /** 上次回顾时间 */
  lastReviewedAt: string
  /** 下次建议回顾时间 */
  nextReviewAt: string
  /** 回顾总次数 */
  reviewCount: number
  /** 遗忘次数（错过回顾窗口） */
  forgetCount: number
  /** 裂缝数量（遗忘导致的年轮断裂） */
  crackCount: number
  /** 是否曾被遗忘后重逢（突然变亮标记） */
  hasReunion: boolean
  /** 重逢时间 */
  reunitedAt?: string
  /** 当前光亮度 0-1 */
  luminance: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ---- 间隔重复策略（艾宾浩斯曲线） ----

/** 回顾间隔（天）：1天→2天→4天→7天→15天→30天→60天→120天 */
const INTERVALS = [1, 2, 4, 7, 15, 30, 60, 120]

/** 遗忘窗口：超过下次回顾时间 + 窗口天数仍未回顾 → 视为遗忘 */
const FORGET_WINDOW_DAYS = 3

// ---- 年轮管理 ----

/** 创建知识年轮 */
export function createKnowledgeRing(note: Note): KnowledgeRing {
  const now = new Date().toISOString()
  return {
    noteId: note.id,
    title: note.title,
    rings: 0,
    lastReviewedAt: now,
    nextReviewAt: addDaysToISO(now, INTERVALS[0]),
    reviewCount: 0,
    forgetCount: 0,
    crackCount: 0,
    hasReunion: false,
    luminance: 0.3, // 新芽初始亮度较低
    createdAt: now,
    updatedAt: now,
  }
}

/** 记录一次回顾（再认/回顾） */
export function recordReview(ring: KnowledgeRing): KnowledgeRing {
  const now = new Date().toISOString()
  const wasForgotten = isForgotten(ring)

  const updated = { ...ring }
  updated.reviewCount++
  updated.lastReviewedAt = now

  // 如果之前被遗忘，标记为重逢
  if (wasForgotten) {
    updated.hasReunion = true
    updated.reunitedAt = now
    // 重逢：年轮恢复但裂缝保留
    updated.rings = Math.max(1, ring.rings - 1)
  } else {
    // 正常回顾：年轮增长
    const nextRingLevel = Math.min(ring.reviewCount, INTERVALS.length - 1)
    updated.rings = nextRingLevel
  }

  // 计算下次回顾间隔
  const intervalIdx = Math.min(updated.reviewCount, INTERVALS.length - 1)
  updated.nextReviewAt = addDaysToISO(now, INTERVALS[intervalIdx])

  // 更新光亮度
  updated.luminance = calculateLuminance(updated)
  updated.updatedAt = now

  return updated
}

// ---- 三选一回顾（认识 / 模糊 / 忘记） ----

/** 回顾评级：认识（完全掌握）/ 模糊（部分记得）/ 忘记（未记住） */
export type ReviewGrade = 'know' | 'fuzzy' | 'forget'

/**
 * 记录一次三选一回顾。
 * - know  ：等同 recordReview（正常回顾，年轮增长）
 * - fuzzy ：弱回顾，步伐更慢、下次间隔更短（不视为失败，也不等同完全掌握）
 * - forget：等同错过窗口的遗忘处理（裂缝 + 重置间隔）
 * 原二值 recordReview 保持不变，阅读 SRS 走此三档接口。
 */
export function recordReviewGrade(ring: KnowledgeRing, grade: ReviewGrade): KnowledgeRing {
  const now = new Date().toISOString()
  const wasForgotten = isForgotten(ring)
  const updated = { ...ring }
  updated.lastReviewedAt = now

  if (grade === 'forget') {
    updated.forgetCount++
    updated.crackCount++
    updated.rings = Math.max(0, ring.rings - 1)
    updated.nextReviewAt = addDaysToISO(now, INTERVALS[0])
  } else if (grade === 'fuzzy') {
    updated.reviewCount++
    if (wasForgotten) {
      updated.hasReunion = true
      updated.reunitedAt = now
      updated.rings = Math.max(1, ring.rings - 1)
    } else {
      // 弱掌握：最高停在倒数第二档，间隔也取更短一档
      const idx = Math.min(updated.reviewCount, INTERVALS.length - 2)
      updated.rings = idx
    }
    const intervalIdx = Math.min(updated.reviewCount, INTERVALS.length - 2)
    updated.nextReviewAt = addDaysToISO(now, INTERVALS[intervalIdx])
  } else {
    updated.reviewCount++
    if (wasForgotten) {
      updated.hasReunion = true
      updated.reunitedAt = now
      updated.rings = Math.max(1, ring.rings - 1)
    } else {
      const nextRingLevel = Math.min(updated.reviewCount, INTERVALS.length - 1)
      updated.rings = nextRingLevel
    }
    const intervalIdx = Math.min(updated.reviewCount, INTERVALS.length - 1)
    updated.nextReviewAt = addDaysToISO(now, INTERVALS[intervalIdx])
  }

  updated.luminance = calculateLuminance(updated)
  updated.updatedAt = now
  return updated
}

/** 检查并处理遗忘（错过回顾窗口） */
export function checkForget(ring: KnowledgeRing): KnowledgeRing {
  if (!isForgotten(ring)) return ring

  const updated = { ...ring }
  updated.forgetCount++
  updated.crackCount++

  // 遗忘导致年轮减少
  updated.rings = Math.max(0, ring.rings - 1)

  // 重新设定下次回顾时间
  updated.nextReviewAt = addDaysToISO(new Date().toISOString(), INTERVALS[0])

  // 更新光亮度
  updated.luminance = calculateLuminance(updated)
  updated.updatedAt = new Date().toISOString()

  return updated
}

// ---- 光亮度计算 ----

/** 计算年轮光亮度 */
function calculateLuminance(ring: KnowledgeRing): number {
  let lum = 0.3 // 基础亮度

  // 年轮层数贡献（每层 +0.1）
  lum += ring.rings * 0.1

  // 裂缝惩罚（每个裂缝 -0.08）
  lum -= ring.crackCount * 0.08

  // 重逢加成（突然变亮 +0.2）
  if (ring.hasReunion) {
    lum += 0.2
    // 重逢后逐渐衰减，但不会低于之前的水平
    const daysSinceReunion = ring.reunitedAt
      ? daysBetween(ring.reunitedAt, new Date().toISOString())
      : 0
    if (daysSinceReunion > 7) {
      lum = Math.max(lum - 0.1, 0.3 + ring.rings * 0.1 - ring.crackCount * 0.08)
    }
  }

  return Math.max(0.1, Math.min(1, lum))
}

/** 判断是否已遗忘（错过回顾窗口） */
export function isForgotten(ring: KnowledgeRing): boolean {
  const now = new Date()
  const nextReview = new Date(ring.nextReviewAt)
  // 超过下次回顾时间 + 遗忘窗口
  return now > addDays(nextReview, FORGET_WINDOW_DAYS)
}

/** 判断是否需要回顾（临近或超过下次回顾时间） */
export function needsReview(ring: KnowledgeRing): boolean {
  const now = new Date()
  const nextReview = new Date(ring.nextReviewAt)
  return now >= nextReview
}

/** 距今多久需要回顾（天），负数表示已过期 */
export function daysUntilReview(ring: KnowledgeRing): number {
  return daysBetween(new Date().toISOString(), ring.nextReviewAt)
}

// ---- 年轮统计 ----

export interface RingStats {
  /** 总年轮数 */
  total: number
  /** 需要回顾的 */
  dueForReview: number
  /** 已遗忘的 */
  forgotten: number
  /** 有重逢标记的 */
  reunited: number
  /** 平均年轮层数 */
  avgRings: number
  /** 平均光亮度 */
  avgLuminance: number
  /** 按年轮层数分布 */
  byRings: { rings: number; count: number }[]
}

/** 计算年轮统计 */
export function computeRingStats(rings: KnowledgeRing[]): RingStats {
  const total = rings.length
  const dueForReview = rings.filter(r => needsReview(r)).length
  const forgotten = rings.filter(r => isForgotten(r)).length
  const reunited = rings.filter(r => r.hasReunion).length
  const avgRings = total > 0 ? rings.reduce((s, r) => s + r.rings, 0) / total : 0
  const avgLuminance = total > 0 ? rings.reduce((s, r) => s + r.luminance, 0) / total : 0

  // 按年轮层数分布
  const ringMap = new Map<number, number>()
  for (const r of rings) {
    ringMap.set(r.rings, (ringMap.get(r.rings) || 0) + 1)
  }
  const byRings = Array.from(ringMap.entries())
    .map(([rings, count]) => ({ rings, count }))
    .sort((a, b) => a.rings - b.rings)

  return { total, dueForReview, forgotten, reunited, avgRings, avgLuminance, byRings }
}

// ---- 工具函数 ----

function addDaysToISO(iso: string, days: number): string {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(fromISO)
  const to = new Date(toISO)
  return Math.floor((to.getTime() - from.getTime()) / 86400000)
}