// ============================================================
// 阅览殿 · 年度叙事（Wrapped 式）
// ------------------------------------------------------------
// 台账 §三「数据叙事」：把 reading-report 的年度数字讲成一段故事——
// 分季 era 卡 + 阅读人格标签 + 叙事弧（总览 → 细节 → 最有意义的发现）。
// 全部本地派生：不新增存储键、不触云；纯函数便于单测。
// ============================================================

import { computed } from 'vue'
import type { Book, ReadingSession } from './types'
import type { YearReport } from './reading-report'
import { useReadingReport } from './reading-report'
import { useReadingHall } from './hall'
import { clamp01 } from './life-book'

export type Season = '春' | '夏' | '秋' | '冬'

/** 分季阶段卡 */
export interface ReadingEra {
  id: string
  season: Season
  /** 季节 · 主题，如「春 · 小说」 */
  label: string
  /** 覆盖月份，如「1-3月」 */
  months: string
  minutes: number
  books: number
  topTag: string
  /** 一句话叙事 */
  highlight: string
}

/** 阅读人格标签（规则驱动，数据背书） */
export interface ReadingPersonaTag {
  key: string
  label: string
  detail: string
  /** 0..1 置信度，用于排序与强度呈现 */
  score: number
}

export interface ReadingNarrative {
  year: number
  hasData: boolean
  headline: string
  overview: string
  eras: ReadingEra[]
  persona: ReadingPersonaTag[]
  highlights: string[]
  discovery: string
}

const QUARTER_SEASONS: Season[] = ['春', '夏', '秋', '冬']
const QUARTER_MONTHS = ['1-3月', '4-6月', '7-9月', '10-12月']

export function seasonOfQuarter(q: number): Season {
  return QUARTER_SEASONS[Math.max(0, Math.min(3, q))]
}

/** 1-12 月 → 0-3 季 */
export function quarterOfMonth(month1: number): number {
  return Math.max(0, Math.min(3, Math.floor((month1 - 1) / 3)))
}

function topEntry(counts: Map<string, number>): string | null {
  let best: string | null = null
  let bestN = 0
  for (const [k, n] of counts) {
    if (n > bestN) {
      bestN = n
      best = k
    }
  }
  return best
}

function pct(part: number, whole: number): number {
  if (!whole) return 0
  return Math.round((part / whole) * 100)
}

function eraHighlight(season: Season, minutes: number, books: number, tag: string | null): string {
  const min = Math.round(minutes)
  if (books > 0 && min > 0) {
    return `${season}天里读完 ${books} 本、投入 ${min} 分钟${tag ? `，偏爱「${tag}」` : ''}`
  }
  if (books > 0) return `${season}天里读完了 ${books} 本${tag ? `，偏爱「${tag}」` : ''}`
  if (min > 0) return `${season}天里静静读了 ${min} 分钟${tag ? `，常翻开「${tag}」` : ''}`
  return `${season}天里书页轻轻合上`
}

/** 把某年的会话/书目切成四季 era 卡（仅保留有数据的季度） */
export function buildEras(
  year: number,
  sessions: ReadingSession[],
  books: Book[],
): ReadingEra[] {
  const prefix = String(year)
  const buckets = Array.from({ length: 4 }, () => ({
    minutes: 0,
    books: 0,
    tagCounts: new Map<string, number>(),
  }))

  const bookById = new Map(books.map(b => [b.id, b]))

  for (const s of sessions) {
    if (!s.date.startsWith(prefix)) continue
    const month = Number(s.date.slice(5, 7))
    if (!month) continue
    const q = quarterOfMonth(month)
    buckets[q].minutes += s.duration
    const b = bookById.get(s.bookId)
    if (b) {
      for (const t of b.tags ?? []) {
        const tag = t.trim()
        if (tag) buckets[q].tagCounts.set(tag, (buckets[q].tagCounts.get(tag) ?? 0) + 1)
      }
    }
  }

  for (const b of books) {
    if (b.status !== 'finished') continue
    const fd = b.finishDate ?? ''
    if (!fd.startsWith(prefix)) continue
    const month = Number(fd.slice(5, 7))
    if (!month) continue
    buckets[quarterOfMonth(month)].books += 1
  }

  return buckets
    .map((bucket, i) => {
      const tag = topEntry(bucket.tagCounts)
      const season = QUARTER_SEASONS[i]
      return {
        id: `Q${i + 1}`,
        season,
        label: tag ? `${season} · ${tag}` : `${season} · 静读`,
        months: QUARTER_MONTHS[i],
        minutes: Math.round(bucket.minutes),
        books: bucket.books,
        topTag: tag ?? '',
        highlight: eraHighlight(season, bucket.minutes, bucket.books, tag),
      }
    })
    .filter(e => e.minutes > 0 || e.books > 0)
}

/** 由真实数据推导阅读人格标签（无匹配则给中性兜底） */
export function buildPersona(
  report: YearReport,
  books: Book[],
  sessions: ReadingSession[],
): ReadingPersonaTag[] {
  const tags: ReadingPersonaTag[] = []
  const yearSessions = sessions.filter(s => s.date.startsWith(String(report.year)))
  const finishedRatio = report.totalBooks > 0 ? report.finishedBooks / report.totalBooks : 0
  const distinctTags = new Set(
    books.flatMap(b => (b.tags ?? []).map(t => t.trim()).filter(Boolean)),
  )
  const finished = books.filter(b => b.status === 'finished' && b.totalPages > 0)
  const avgPages = finished.length
    ? finished.reduce((a, b) => a + b.totalPages, 0) / finished.length
    : 0
  const topTagShare =
    report.topTags.length && report.totalBooks > 0
      ? report.topTags[0].count / report.totalBooks
      : 0

  if (report.avgWpm >= 350) {
    tags.push({ key: 'speedster', label: '速读者', detail: `均速 ${report.avgWpm} 字/分`, score: clamp01(report.avgWpm / 600) })
  }
  if (avgPages >= 280) {
    tags.push({ key: 'longform', label: '长篇控', detail: `平均每本 ${Math.round(avgPages)} 页`, score: clamp01(avgPages / 500) })
  }
  if (distinctTags.size >= 5) {
    tags.push({ key: 'explorer', label: '跨界探索者', detail: `涉猎 ${distinctTags.size} 类主题`, score: clamp01(distinctTags.size / 10) })
  }
  if (topTagShare >= 0.5 && report.topTags[0]) {
    tags.push({ key: 'deepdiver', label: '深耕者', detail: `过半是「${report.topTags[0].tag}」`, score: clamp01(topTagShare) })
  }
  if (report.activeDays >= 120) {
    tags.push({ key: 'persistent', label: '持久者', detail: `${report.activeDays} 天都在读`, score: clamp01(report.activeDays / 300) })
  }
  if (report.totalMinutes >= 3000) {
    tags.push({ key: 'devoted', label: '沉浸者', detail: `累计 ${report.totalMinutes} 分钟`, score: clamp01(report.totalMinutes / 6000) })
  }
  if (finishedRatio >= 0.6 && report.totalBooks >= 3) {
    tags.push({ key: 'finisher', label: '完读者', detail: `${Math.round(finishedRatio * 100)}% 有始有终`, score: clamp01(finishedRatio) })
  }

  if (!tags.length) {
    if (yearSessions.length || report.totalBooks) {
      tags.push({ key: 'beginner', label: '初读者', detail: '旅程刚刚开始', score: 0.3 })
    } else {
      tags.push({ key: 'newcomer', label: '待启程', detail: '还没有本年的阅读记录', score: 0 })
    }
  }

  return tags.sort((a, b) => b.score - a.score).slice(0, 4)
}

/** 叙事弧：总览 → 细节（highlights）→ 最有意义的发现 */
export function buildNarrativeArc(
  year: number,
  report: YearReport,
  eras: ReadingEra[],
  persona: ReadingPersonaTag[],
): Pick<ReadingNarrative, 'headline' | 'overview' | 'highlights' | 'discovery'> {
  const top = persona[0]
  const headline = `${year} · 你是一位${top?.label ?? '读者'}`

  const overview = `这一年，你在 ${report.activeDays} 天里翻开书页，累计 ${report.totalMinutes} 分钟，读完 ${report.finishedBooks} 本。`

  const highlights: string[] = []
  for (const e of eras) highlights.push(`${e.season}（${e.months}）：${e.highlight}`)
  if (report.bestDay) {
    highlights.push(`最投入的一天是 ${report.bestDay.date}，一口气读了 ${report.bestDay.minutes} 分钟。`)
  }

  const peak = eras.slice().sort((a, b) => b.minutes - a.minutes)[0]
  let discovery: string
  if (peak && report.totalMinutes > 0) {
    discovery = `${peak.season}季是你的黄金时段——${peak.minutes} 分钟，占全年 ${pct(peak.minutes, report.totalMinutes)}%。`
  } else if (report.topTags[0]) {
    discovery = `你最常回到「${report.topTags[0].tag}」的世界。`
  } else {
    discovery = '每一页都算数，继续读下去吧。'
  }

  return { headline, overview, highlights, discovery }
}

/** 纯组装：由年度报告 + 原始数据算出完整叙事 */
export function computeReadingNarrative(
  year: number,
  report: YearReport,
  books: Book[],
  sessions: ReadingSession[],
): ReadingNarrative {
  const eras = buildEras(year, sessions, books)
  const persona = buildPersona(report, books, sessions)
  const hasData = report.totalMinutes > 0 || report.finishedBooks > 0 || eras.length > 0
  const arc = buildNarrativeArc(year, report, eras, persona)
  return { year, hasData, eras, persona, ...arc }
}

/** 导出为可粘贴的 Markdown 文案（本地生成，不触云） */
export function buildNarrativeMarkdown(n: ReadingNarrative): string {
  const lines: string[] = []
  lines.push(`# ${n.headline}`)
  lines.push('')
  lines.push(n.overview)
  lines.push('')
  lines.push('## 分季')
  if (n.eras.length) {
    for (const e of n.eras) lines.push(`- ${e.label}（${e.months}）：${e.highlight}`)
  } else {
    lines.push('- 本年暂无分季数据')
  }
  lines.push('')
  lines.push('## 阅读人格')
  lines.push(n.persona.map(p => `\`${p.label}\``).join(' '))
  lines.push('')
  lines.push('## 叙事')
  for (const h of n.highlights) lines.push(`- ${h}`)
  lines.push('')
  lines.push(`> ${n.discovery}`)
  return lines.join('\n')
}

export function useReadingNarrative() {
  const { viewYear, report, setYear } = useReadingReport()
  const hall = useReadingHall()
  const narrative = computed(() =>
    computeReadingNarrative(
      viewYear.value,
      report.value,
      hall.books.value,
      hall.sessions.value,
    ),
  )
  return { viewYear, report, setYear, narrative }
}
