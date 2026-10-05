// ============================================================
// 阅览殿 · 可翻阅成书（年度「人生之书」· 翻页体验）
// ------------------------------------------------------------
// 台账 §五 照片日记 #8「成书：年度'人生之书'可翻阅（对齐 Day One 印刷书 +
// Wrapped 叙事）」：把已算好的年度叙事（INCR-517）装订成一本可翻阅的书——
// 封面 → 这一年 → 分季 era → 阅读人格 → 年度光影（本地照片）→ 发现 → 尾声。
//
// 纯组装：入参为已算好的 YearReport / ReadingNarrative / 本地照片缩略图，
// 不新增存储键、不触云、不新增遥测；翻页导航亦为纯函数，便于单测。
// 视觉交给 FlipBookPanel（纯 CSS 3D 翻页），本文件只算数据与页序。
// ============================================================

import { computed } from 'vue'
import type { YearReport } from './reading-report'
import type { ReadingNarrative } from './reading-narrative'
import { useReadingNarrative } from './reading-narrative'
import { usePhotoDiary } from '../anchor/photo-diary'

export type FlipPageKind =
  | 'cover' | 'overview' | 'era' | 'persona' | 'photos' | 'discovery' | 'closing' | 'empty'

/** 成书内的一张照片（只带缩略图，避免把原图塞进内存） */
export interface FlipPhoto {
  id: string
  /** 展示用图源（优先缩略图，缺失回落原图） */
  src: string
  date: string
  caption: string
}

export interface FlipStat {
  label: string
  value: string
}

export interface FlipPage {
  id: string
  kind: FlipPageKind
  title: string
  subtitle?: string
  lines: string[]
  stats?: FlipStat[]
  photos?: FlipPhoto[]
}

export interface FlipBook {
  year: number
  title: string
  subtitle: string
  pages: FlipPage[]
}

/** 引擎入参：照片只需缩略图/原图/captions（与 PhotoEntry 同序） */
export interface FlipPhotoInput {
  id: string
  date: string
  thumbs: string[]
  images: string[]
  captions: string[]
}

export interface FlipBookInput {
  year: number
  report: YearReport
  narrative: ReadingNarrative
  photos: FlipPhotoInput[]
}

/** 每页最多排几张照片 */
export const FLIP_PHOTOS_PER_PAGE = 6
/** 成书内最多收多少张年度照片 */
export const FLIP_PHOTOS_MAX = 18

/** 千分位（手写以保证跨环境确定性，避免 toLocaleString 差异） */
export function thousands(n: number): string {
  const v = Math.round(Number(n) || 0)
  return v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function stat(label: string, value: number): FlipStat {
  return { label, value: thousands(value) }
}

/** 从照片条目中取某年照片（按日期升序），展开为单张并夹取上限 */
export function pickYearPhotos(
  photos: FlipPhotoInput[],
  year: number,
  max = FLIP_PHOTOS_MAX,
): FlipPhoto[] {
  const prefix = String(year)
  const out: FlipPhoto[] = []
  const sorted = photos
    .filter(p => (p.date ?? '').startsWith(prefix))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of sorted) {
    const n = entry.images?.length ?? 0
    for (let i = 0; i < n; i++) {
      const src = entry.thumbs?.[i] || entry.images[i]
      if (!src) continue
      out.push({
        id: `${entry.id}-${i}`,
        src,
        date: entry.date,
        caption: entry.captions?.[i]?.trim() || entry.date,
      })
      if (out.length >= max) return out
    }
  }
  return out
}

/** 纯组装：由年度报告 + 年度叙事 + 本地照片算出成书页序 */
export function composeFlipBook(input: FlipBookInput): FlipBook {
  const { year, report, narrative } = input
  const photos = pickYearPhotos(input.photos, year)
  const pages: FlipPage[] = []

  const topPersona = narrative.persona[0]
  const title = `${year} · 人生之书`
  const subtitle = narrative.hasData
    ? narrative.headline.replace(/^\d+\s*·\s*/, '')
    : '书页未启，静待第一缕墨香'

  pages.push({ id: 'cover', kind: 'cover', title, subtitle, lines: [] })

  if (!narrative.hasData && photos.length === 0) {
    pages.push({
      id: 'empty',
      kind: 'empty',
      title: '尚未落笔',
      lines: ['这一年还没有阅读与光影的痕迹。', '翻开一本书，或留下一张照片，书页自会生长。'],
    })
    return { year, title, subtitle, pages }
  }

  pages.push({
    id: 'overview',
    kind: 'overview',
    title: '这一年',
    subtitle: topPersona ? topPersona.label : undefined,
    lines: [narrative.overview],
    stats: [
      stat('藏书', report.totalBooks),
      stat('读完', report.finishedBooks),
      stat('专注分钟', report.totalMinutes),
      stat('阅读天数', report.activeDays),
      stat('均速字/分', report.avgWpm),
    ],
  })

  for (const era of narrative.eras) {
    pages.push({
      id: `era-${era.id}`,
      kind: 'era',
      title: `${era.season} · ${era.months}`,
      subtitle: era.label,
      lines: [era.highlight],
      stats: [stat('分钟', era.minutes), stat('读完', era.books)],
    })
  }

  if (narrative.persona.length) {
    pages.push({
      id: 'persona',
      kind: 'persona',
      title: '阅读人格',
      subtitle: '数据替你写下的自画像',
      lines: narrative.persona.map(p => `${p.label} · ${p.detail}`),
    })
  }

  for (let i = 0; i < photos.length; i += FLIP_PHOTOS_PER_PAGE) {
    const chunk = photos.slice(i, i + FLIP_PHOTOS_PER_PAGE)
    pages.push({
      id: `photos-${i / FLIP_PHOTOS_PER_PAGE}`,
      kind: 'photos',
      title: '年度光影',
      subtitle: `${photos.length} 张照片，${chunk[0]?.date ?? ''} 起`,
      lines: [],
      photos: chunk,
    })
  }

  pages.push({
    id: 'discovery',
    kind: 'discovery',
    title: '最有意义的发现',
    lines: [narrative.discovery, ...narrative.highlights],
  })

  pages.push({
    id: 'closing',
    kind: 'closing',
    title: '尾声',
    lines: ['书页轻轻合上，故事仍在继续。', `${year}，感谢你读过的每一行。`],
  })

  return { year, title, subtitle, pages }
}

// ---- 翻页导航（纯函数） ----

export function pageCount(book: FlipBook): number {
  return book.pages.length
}

/** 页码夹取到 [0, pages-1]；空书返回 0 */
export function clampPageIndex(book: FlipBook, index: number): number {
  const last = Math.max(0, pageCount(book) - 1)
  if (!isFinite(index)) return 0
  return Math.max(0, Math.min(last, Math.round(index)))
}

/** 翻页（不环绕）：dir>0 向后，dir<0 向前，返回夹取后的新页码 */
export function turnPage(book: FlipBook, current: number, dir: number): number {
  const step = dir >= 0 ? 1 : -1
  return clampPageIndex(book, clampPageIndex(book, current) + step)
}

export function canTurn(book: FlipBook, current: number, dir: number): boolean {
  return turnPage(book, current, dir) !== clampPageIndex(book, current)
}

/** 双页展开：返回 [左页, 右页|null]（单页模式右页恒为 null） */
export function spreadPair(
  book: FlipBook,
  index: number,
  dual: boolean,
): [number, number | null] {
  const i = clampPageIndex(book, index)
  if (!dual) return [i, null]
  const left = i - (i % 2)
  const right = left + 1 < pageCount(book) ? left + 1 : null
  return [left, right]
}

/** 阅读进度 0..1（首/末页分别为 0 与 1；单页书返回 1） */
export function bookProgress(book: FlipBook, index: number): number {
  const last = pageCount(book) - 1
  if (last <= 0) return 1
  return clampPageIndex(book, index) / last
}

/** 成书总览（供面板副标题/目录） */
export function bookSummary(book: FlipBook): { pages: number; photos: number } {
  return {
    pages: book.pages.length,
    photos: book.pages.reduce((acc, p) => acc + (p.photos?.length ?? 0), 0),
  }
}

/** 成书导出为可粘贴的 Markdown（本地生成，不触云） */
export function buildFlipBookMarkdown(book: FlipBook): string {
  const lines: string[] = [`# ${book.title}`, '', `> ${book.subtitle}`, '']
  for (const p of book.pages) {
    if (p.kind === 'cover') continue
    lines.push(`## ${p.title}`)
    if (p.subtitle) lines.push(`*${p.subtitle}*`)
    for (const l of p.lines) lines.push(`- ${l}`)
    if (p.stats?.length) {
      lines.push(p.stats.map(s => `\`${s.label} ${s.value}\``).join(' '))
    }
    if (p.photos?.length) {
      lines.push(`- 收录 ${p.photos.length} 张照片`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

/** 组合式：由阅览殿年度叙事 + 本地照片日记组装成书 */
export function useFlipBook() {
  const { viewYear, report, setYear, narrative } = useReadingNarrative()
  const photoDiary = usePhotoDiary()

  const book = computed(() =>
    composeFlipBook({
      year: viewYear.value,
      report: report.value,
      narrative: narrative.value,
      photos: photoDiary.entries.value,
    }),
  )

  return { viewYear, report, setYear, narrative, book, photoDiary }
}
