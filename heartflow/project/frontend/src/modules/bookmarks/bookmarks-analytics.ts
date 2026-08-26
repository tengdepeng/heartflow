// ============================================================
// 书签入口架 · 收藏档案分析引擎（bookmarks-analytics）
// 从收藏数据（标签/分类/内容类型/回访/待读）读出"收藏的气象"：
// 档案概览、收藏节奏、回访建议、收藏健康度、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// 顺着蓝图：整理的入口架，让收藏不成灰尘，而是可寻回的路标。
// ============================================================

import type { Bookmark } from './bookmarks'

const DAY = 86_400_000

function daysSince(ts: number, nowT: number): number {
  return Math.max(0, Math.round((nowT - ts) / DAY))
}

function tsAt(v: string | undefined, fallback: number): number {
  if (!v) return fallback
  const t = new Date(v).getTime()
  return isFinite(t) ? t : fallback
}

// ---- 档案概览 ----

export interface CollectionOverview {
  total: number
  active: number
  archived: number
  /** 待读（active 且未读） */
  unread: number
  /** 已读（active 且已读） */
  read: number
  /** 预读时长合计（分钟） */
  totalReadingMinutes: number
  /** 平均访问次数（active） */
  avgVisits: number
  /** 活跃分类数 */
  folderCount: number
  /** 活跃标签种类数 */
  tagCount: number
  /** 内容类型分布 */
  byContentType: Record<string, number>
}

const CONTENT_TYPES = ['article', 'video', 'image', 'audio', 'other']

/** 归一化内容类型：未知/缺省一律归 other，保证可用于数组比较与索引 */
function contentTypeOf(b: Bookmark): string {
  return b.content_type && CONTENT_TYPES.includes(b.content_type) ? b.content_type : 'other'
}

export function collectionOverview(bookmarks: Bookmark[]): CollectionOverview {
  let active = 0
  let archived = 0
  let unread = 0
  let readingMinutes = 0
  let visitSum = 0
  const activeFolders = new Set<string>()
  const activeTags = new Set<string>()
  const byContentType: Record<string, number> = {}
  for (const t of CONTENT_TYPES) byContentType[t] = 0

  for (const b of bookmarks) {
    if (b.status === 'archived') {
      archived++
      continue
    }
    active++
    if (b.is_read === false) unread++
    if (b.reading_time) readingMinutes += Math.max(0, Math.floor(b.reading_time))
    visitSum += Math.max(0, Math.floor(b.visit_count || 0))
    if (b.folder) activeFolders.add(b.folder)
    if (Array.isArray(b.tags)) for (const t of b.tags) if (t) activeTags.add(t)
    const ct = contentTypeOf(b)
    byContentType[ct]++
  }

  return {
    total: bookmarks.length,
    active,
    archived,
    unread,
    read: active - unread,
    totalReadingMinutes: readingMinutes,
    avgVisits: active ? Math.round((visitSum / active) * 10) / 10 : 0,
    folderCount: activeFolders.size,
    tagCount: activeTags.size,
    byContentType,
  }
}

// ---- 收藏节奏 ----

export interface CollectionRhythm {
  /** 近 7 天新收 */
  addedThisWeek: number
  /** 近 7 天回访 */
  visitedThisWeek: number
  /** 蒙尘条目（active 从未访问） */
  dormantCount: number
  /** active 已读率 0-100 */
  readRate: number
  /** 平均"存放至今"天数 */
  avgAgeDays: number
  /** 最常见的回访间隔（小时），无以 null */
  topContentType: string | null
}

export function collectionRhythm(
  bookmarks: Bookmark[],
  now: Date = new Date(),
): CollectionRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY

  let added = 0
  let visited = 0
  let dormant = 0
  let readSum = 0
  let activeCount = 0
  let ageSum = 0
  const typeCount: Record<string, number> = {}
  let topContentType: string | null = null

  for (const b of bookmarks) {
    const createdT = tsAt(b.created_at, nowT)
    const lastT = b.last_visited_at ? tsAt(b.last_visited_at, 0) : null
    if (createdT >= weekAgo) added++
    if (lastT !== null && lastT >= weekAgo) visited++

    if (b.status === 'archived') continue
    activeCount++
    if (b.is_read === false) {
      dormant++
      ageSum += daysSince(createdT, nowT)
    }
    if (b.is_read !== false) readSum++
    const ct = contentTypeOf(b)
    typeCount[ct] = (typeCount[ct] || 0) + 1
    if ((typeCount[ct] || 0) > (typeCount[topContentType || ''] || 0) || topContentType === null) {
      topContentType = ct
    }
  }

  return {
    addedThisWeek: added,
    visitedThisWeek: visited,
    dormantCount: dormant,
    readRate: activeCount ? Math.round((readSum / activeCount) * 100) : 0,
    avgAgeDays: dormant ? Math.round(ageSum / dormant) : 0,
    topContentType,
  }
}

// ---- 回访建议 ----

export interface RevisitCandidate {
  bookmark: Bookmark
  score: number
  reason: string
}

/** 给一条收藏打分：越该被重新打开分越高 */
function revisitScore(b: Bookmark, nowT: number): { score: number; reason: string } {
  if (b.status === 'archived') return { score: -1, reason: '' }

  const createdT = tsAt(b.created_at, nowT)
  const age = daysSince(createdT, nowT)
  const lastT = b.last_visited_at ? tsAt(b.last_visited_at, 0) : null
  const sinceLast = lastT ? daysSince(lastT, nowT) : null

  // 待读是最强的"该打开"信号
  if (b.is_read === false) {
    // 放得越久，越该现在读完
    return { score: 70 + Math.min(20, age), reason: '还在待读箱里，等一个打开的时机' }
  }
  let score = 0
  if (b.visit_count === 0) {
    score += 45
  } else if (sinceLast !== null && sinceLast >= 30) {
    score += 35
  } else if (sinceLast !== null && sinceLast >= 14) {
    score += 20
  }
  if ((b.reading_time || 0) >= 5) score += 5
  if (age <= 14) score -= 10 // 新收的暂不急着回访

  const reason =
    score >= 45 ? '收藏至今未访问' : score >= 35 ? '久未回来，值得重温' : '搁了一两周，可以再看一眼'
  return { score, reason }
}

export function revisitSuggestion(
  bookmarks: Bookmark[],
  now: Date = new Date(),
): RevisitCandidate | null {
  const nowT = now.getTime()
  let best: RevisitCandidate | null = null
  for (const b of bookmarks) {
    const { score, reason } = revisitScore(b, nowT)
    if (score <= 0) continue
    if (!best || score > best.score) best = { bookmark: b, score, reason }
  }
  return best
}

// ---- 收藏健康度（0-100）----

export interface CollectionHealth {
  score: number
  /** 已读率 0-100 */
  readRate: number
  /** 回访率（active 曾访问占比）0-100 */
  revisitRate: number
  /** 整理度（active 有分类占比）0-100 */
  tidyRate: number
  label: string
}

export function collectionHealth(
  bookmarks: Bookmark[],
  _now: Date = new Date(),
): CollectionHealth {
  const active = bookmarks.filter((b) => b.status !== 'archived')
  const n = active.length
  if (!n) return { score: 0, readRate: 0, revisitRate: 0, tidyRate: 0, label: '空书架' }

  const read = active.filter((b) => b.is_read !== false).length
  const visited = active.filter((b) => (b.visit_count || 0) > 0).length
  const tidied = active.filter((b) => Boolean(b.folder)).length

  const readRate = Math.round((read / n) * 100)
  const revisitRate = Math.round((visited / n) * 100)
  const tidyRate = Math.round((tidied / n) * 100)

  const score = Math.round(readRate * 0.4 + revisitRate * 0.35 + tidyRate * 0.25)
  const label =
    score >= 70 ? '收得明白' : score >= 45 ? '渐有条理' : score >= 20 ? '刚起个头' : '积尘初清'
  return { score, readRate, revisitRate, tidyRate, label }
}

// ---- 温和洞察（只呈现，不催促） ----

const CONTENT_LABEL: Record<string, string> = {
  article: '文章',
  video: '视频',
  image: '图片',
  audio: '音频',
  other: '其他',
}

export function collectionInsights(
  bookmarks: Bookmark[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const out: string[] = []
  if (bookmarks.length === 0) {
    out.push('收藏架还空着。剪一条此刻想留住的东西进来，它会成为日后回头的路标。')
    return out
  }

  const ov = collectionOverview(bookmarks)
  const rh = collectionRhythm(bookmarks, now)
  const health = collectionHealth(bookmarks, now)

  if (health.score > 0) out.push(`这份收藏的整体气象是「${health.label}」。`)
  if (ov.unread > 0) out.push(`还有 ${ov.unread} 条待在待读箱里。`)
  if (rh.dormantCount > 0) out.push(`其中 ${rh.dormantCount} 条收藏至今未曾打开。`)
  if (rh.addedThisWeek > 0) out.push(`这一周新收了 ${rh.addedThisWeek} 条。`)
  if (rh.topContentType && ov.byContentType[rh.topContentType]) {
    out.push(`你更常收藏${CONTENT_LABEL[rh.topContentType] || rh.topContentType}。`)
  }
  if (ov.totalReadingMinutes >= 30) {
    out.push(`这条架上大约攒着 ${Math.round(ov.totalReadingMinutes / 60 * 10) / 10} 小时的阅读量。`)
  }

  return out.slice(0, limit)
}