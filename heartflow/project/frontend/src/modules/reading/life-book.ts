// ============================================================
// 阅览殿 · 人生之书（路线甲）
// 蓝图 1333-1345：呼吸之书 + 正/侧/横三维 + 8 维剖面聚合。
// 纯聚合：把阅览殿既有引擎数据（书目/会话/洞察/速度）+ 跨房间情绪/笔记，
// 收敛成一幅「阅读人生」的剖面。不新增遥测采集（守本地私有 + 不造重复）。
// 视觉交给 LifeBookPanel（纯 CSS 呼吸 + SVG 雷达/投影），本文件只算数据。
// ============================================================

import { computed } from 'vue'
import { useReadingHall } from './hall'
import { useReadingInsights } from './reading-insights'
import { useReadingSpeed } from './reading-speed'
import { useReadingHabits } from './reading-habits'
import { storage } from '../../engine/storage'

export type LifeDimKey =
  | 'emotion' | 'body' | 'focus' | 'social'
  | 'knowledge' | 'activity' | 'cognition' | 'words'

export type LifeDimensions = Record<LifeDimKey, number>

export interface LifeBookPoint { label: string; value: number }

export interface BreathStyle { durationSec: number; depth: number }

export interface LifeBook {
  dimensions: LifeDimensions
  vitality: number
  breath: BreathStyle
  frontal: LifeBookPoint[]   // 正：时间轴（按月）
  lateral: LifeBookPoint[]   // 侧：类型轴（按标签）
  horizontal: LifeBookPoint[] // 横：广度轴（作者/标签/书目…）
  summary: {
    totalBooks: number
    totalWords: number
    totalMinutes: number
    streak: number
    avgWPM: number
  }
}

export interface LifeBookSnapshot {
  books: { status: string; rating?: number; tags: string[]; author: string; totalReadingTime: number }[]
  sessions: { date: string; duration: number }[]
  analytics: { totalBooks: number; totalReadingTime: number; streak: number }
  speed: { totalWordsRead: number; averageWPM: number }
  knowledge: { totalNodes: number; totalConnections: number }
  socialCount: number
  emotionAvg: number // 0..5
}

const DIM_CAPS: Record<LifeDimKey, number> = {
  words: 200_000,
  knowledge: 100,
  activity: 200,
  focus: 30,
  body: 5_000,
  social: 100,
  cognition: 200,
  emotion: 5,
}

export function clamp01(x: number): number {
  if (!isFinite(x)) return 0
  return Math.max(0, Math.min(1, x))
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** 把原始快照收敛成人生之书 */
export function buildLifeBook(s: LifeBookSnapshot): LifeBook {
  const dims: LifeDimensions = {
    words: clamp01(s.speed.totalWordsRead / DIM_CAPS.words),
    knowledge: clamp01(s.knowledge.totalNodes / DIM_CAPS.knowledge),
    activity: clamp01(s.sessions.length / DIM_CAPS.activity),
    focus: clamp01(s.analytics.streak / DIM_CAPS.focus),
    body: clamp01(s.analytics.totalReadingTime / DIM_CAPS.body),
    social: clamp01(s.socialCount / DIM_CAPS.social),
    cognition: clamp01(s.knowledge.totalConnections / DIM_CAPS.cognition),
    emotion: clamp01(s.emotionAvg / DIM_CAPS.emotion),
  }

  const vitality = Math.round(
    (Object.values(dims).reduce((a, b) => a + b, 0) / 8) * 100,
  ) / 100

  // 呼吸：活力越高，呼吸越短促、幅度越深（更"活着"）
  const breath: BreathStyle = {
    durationSec: Math.round(lerp(12, 4, vitality) * 10) / 10,
    depth: Math.round(lerp(0.02, 0.08, vitality) * 1000) / 1000,
  }

  const frontal = monthlySeries(s.sessions)
  const lateral = tagBreakdown(s.books)
  const horizontal = breadthMetrics(s)

  return {
    dimensions: dims,
    vitality,
    breath,
    frontal,
    lateral,
    horizontal,
    summary: {
      totalBooks: s.analytics.totalBooks,
      totalWords: s.speed.totalWordsRead,
      totalMinutes: s.analytics.totalReadingTime,
      streak: s.analytics.streak,
      avgWPM: s.speed.averageWPM,
    },
  }
}

/** 正：最近 6 个月每月阅读分钟 */
export function monthlySeries(
  sessions: { date: string; duration: number }[],
  months = 6,
): LifeBookPoint[] {
  const now = new Date()
  const buckets: { key: string; label: string; value: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    buckets.push({ key, label: `${d.getMonth() + 1}月`, value: 0 })
  }
  const idx = new Map(buckets.map((b, i) => [b.key, i]))
  for (const s of sessions) {
    const m = /^(\d{4})-(\d{2})/.exec(s.date)
    if (!m) continue
    const i = idx.get(`${m[1]}-${m[2]}`)
    if (i !== undefined) buckets[i].value += s.duration
  }
  return buckets.map(b => ({ label: b.label, value: Math.round(b.value) }))
}

/** 侧：按标签统计书目数，取前 6 */
export function tagBreakdown(
  books: { tags: string[] }[],
  top = 6,
): LifeBookPoint[] {
  const counts = new Map<string, number>()
  for (const b of books) {
    for (const t of b.tags) {
      const tag = t.trim()
      if (!tag) continue
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, top)
}

/** 横：阅读广度（书目/作者/标签/会话/知识节点） */
export function breadthMetrics(s: LifeBookSnapshot): LifeBookPoint[] {
  const authors = new Set(s.books.map(b => b.author).filter(Boolean))
  const tags = new Set(s.books.flatMap(b => b.tags).map(t => t.trim()).filter(Boolean))
  return [
    { label: '藏书', value: s.books.length },
    { label: '作者', value: authors.size },
    { label: '标签', value: tags.size },
    { label: '会话', value: s.sessions.length },
    { label: '节点', value: s.knowledge.totalNodes },
  ]
}

function getEmotionAvg(): number {
  try {
    const list = storage.getEmotions() as Array<{ intensity?: number; rating?: number }>
    if (!Array.isArray(list) || list.length === 0) return 0
    const sum = list.reduce((acc, e) => {
      const v = Number(e.intensity ?? e.rating ?? 0)
      return acc + (isFinite(v) ? v : 0)
    }, 0)
    return sum / list.length
  } catch {
    return 0
  }
}

/** 从阅览殿各引擎 + 跨房间数据组装快照 */
export function computeLifeBook(): LifeBook {
  const hall = useReadingHall()
  const insights = useReadingInsights()
  const speed = useReadingSpeed()
  useReadingHabits() // 确保习惯引擎已初始化（与 hall 同源单例）

  const books = hall.books.value
  const sessions = hall.sessions.value
  const analytics = insights.analytics.value
  const knowledge = insights.knowledgeStats.value
  const sp = speed.computeSpeedStats()

  const socialCount =
    books.reduce((acc, b) => acc + (b.quotes?.length ?? 0), 0) +
    (storage.getNotes()?.length ?? 0)

  const snapshot: LifeBookSnapshot = {
    books: books.map(b => ({
      status: b.status,
      rating: b.rating,
      tags: b.tags ?? [],
      author: b.author,
      totalReadingTime: b.totalReadingTime ?? 0,
    })),
    sessions: sessions.map(s => ({ date: s.date, duration: s.duration })),
    analytics: {
      totalBooks: analytics.totalBooks,
      totalReadingTime: analytics.totalReadingTime,
      streak: analytics.streak,
    },
    speed: { totalWordsRead: sp.totalWordsRead, averageWPM: sp.averageWPM },
    knowledge: { totalNodes: knowledge.totalNodes, totalConnections: knowledge.totalConnections },
    socialCount,
    emotionAvg: getEmotionAvg(),
  }
  return buildLifeBook(snapshot)
}

export function useLifeBook() {
  const lifeBook = computed(() => computeLifeBook())
  return { lifeBook, buildLifeBook, computeLifeBook }
}
