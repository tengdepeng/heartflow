// ============================================================
// 阅览殿 · 段落批注层（划线 / 想法聚合，INCR-523）
// 借鉴 微信读书「段末热门划线 + 边距想法气泡」：
// 把摘录（划线）与批注（想法）按段落下标聚合，供沉浸阅读器在段末
// 呈现「N 条划线 · M 条想法」角标、在页边距呈现想法气泡，并一键导出。
//
// 纯函数层：段-摘录匹配 + 聚合 + 标记色映射 + 热门排序 + 统计 + Markdown。
// 数据仍来自本地 hf:reading_excerpts，不外发，符合「本地私有」硬约束。
// ============================================================

import type { Excerpt } from './reading-content'
import { excerptMarkColor } from './excerpt-mark'

/** 单段批注聚合：命中该段的划线（含批注）与其中的想法 */
export interface ParagraphAnnotation {
  /** 段落下标（0 基） */
  index: number
  /** 命中该段的全部摘录（划线） */
  highlights: Excerpt[]
  /** 其中带批注的摘录（想法） */
  thoughts: Excerpt[]
  /** 划线条数（= highlights.length，供角标与热门排序） */
  count: number
}

/** 批注层统计 */
export interface AnnotationStats {
  /** 有批注的段落数 */
  paragraphs: number
  /** 划线总条数 */
  highlights: number
  /** 想法总条数 */
  thoughts: number
}

// ---- 段-摘录匹配 ----

/**
 * 判断一条摘录是否命中某段：任一方文本包含另一方即视为同段。
 * 与 ReadingHall 既有 `paragraphMark` 的启发式口径保持一致，
 * 抽到引擎层后成为「标记高亮」与「批注聚合」的唯一真源。
 */
export function matchExcerptParagraph(excerpt: Excerpt, paragraph: string): boolean {
  const p = (paragraph || '').trim()
  const t = (excerpt.text || '').trim()
  if (!p || !t) return false
  return p.includes(t) || t.includes(p)
}

/** 把摘录按段落下标聚合为批注层（无命中的段落不入表） */
export function buildAnnotationLayer(
  excerpts: Excerpt[],
  paragraphs: string[],
): Map<number, ParagraphAnnotation> {
  const layer = new Map<number, ParagraphAnnotation>()
  if (!excerpts.length || !paragraphs.length) return layer
  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i]
    const highlights = excerpts.filter((ex) => matchExcerptParagraph(ex, para))
    if (!highlights.length) continue
    const thoughts = highlights.filter((ex) => (ex.note || '').trim().length > 0)
    layer.set(i, { index: i, highlights, thoughts, count: highlights.length })
  }
  return layer
}

/** 段落下标 → 标记色（同段多条摘录取首条色），供阅读器整段高亮 */
export function annotationMarkMap(
  layer: Map<number, ParagraphAnnotation>,
): Map<number, string> {
  const map = new Map<number, string>()
  for (const [index, ann] of layer) {
    if (ann.highlights.length) map.set(index, excerptMarkColor(ann.highlights[0]))
  }
  return map
}

/** 热门段落：按划线条数降序、同数按段序升序，取前 topN（段末热门划线用） */
export function popularParagraphs(
  layer: Map<number, ParagraphAnnotation>,
  topN = 5,
): ParagraphAnnotation[] {
  return [...layer.values()]
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .slice(0, Math.max(0, topN))
}

/** 批注层统计（划线 / 想法 / 覆盖段落数） */
export function annotationStats(layer: Map<number, ParagraphAnnotation>): AnnotationStats {
  let highlights = 0
  let thoughts = 0
  for (const ann of layer.values()) {
    highlights += ann.highlights.length
    thoughts += ann.thoughts.length
  }
  return { paragraphs: layer.size, highlights, thoughts }
}

// ---- Markdown 导出 ----

function formatExportDate(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

function toQuoteBlock(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n')
}

/**
 * 构建「划线与想法」Markdown（按段落顺序聚合，划线引用 + 想法批注）。
 * 与 reading-export 的摘录导出互补：此处以「段落」为组织单位，贴合阅读器视角。
 */
export function buildAnnotationsMarkdown(
  layer: Map<number, ParagraphAnnotation>,
  options?: { title?: string },
): string {
  const title = options?.title ?? '心流工坊 · 划线与想法'
  const stats = annotationStats(layer)
  const out: string[] = []
  out.push(`# ${title}`)
  out.push('')
  out.push(
    `> 导出时间：${formatExportDate(new Date().toISOString())}　划线 ${stats.highlights} 条 · 想法 ${stats.thoughts} 条 · 覆盖 ${stats.paragraphs} 段`,
  )
  out.push('')
  const ordered = [...layer.values()].sort((a, b) => a.index - b.index)
  if (!ordered.length) {
    out.push('_暂无划线或想法。_')
    out.push('')
    return out.join('\n')
  }
  for (const ann of ordered) {
    out.push(`## 第 ${ann.index + 1} 段`)
    out.push('')
    for (const ex of ann.highlights) {
      out.push(toQuoteBlock(ex.text?.trim() || ''))
      if (ex.note?.trim()) {
        out.push('')
        out.push(`**想法：** ${ex.note.trim()}`)
      }
      out.push('')
    }
  }
  return out.join('\n').trimEnd() + '\n'
}
