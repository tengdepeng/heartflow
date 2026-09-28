// ============================================================
// 阅览殿 · 摘录 / 读书便签 本地导出（#41）
// 纯函数构建 Markdown / JSON，Blob 本地下载，不触云。
// 复用 markdown-export.ts 的 Blob 下载模式（自包含，避免跨模块耦合）。
// ============================================================

import { computed } from 'vue'
import { useReading, type Excerpt } from './reading-content'
import { useReadingMemos, type ReadingMemo } from './reading-memo'

// ---- 内部工具 ----

/** 格式化 ISO 时间为 YYYY-MM-DD HH:mm（失败回退原串） */
function formatExportDate(iso: string): string {
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return iso
  }
}

/** 把多行文本转成 Markdown 引用块（每行前缀 >） */
function toQuoteBlock(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => `> ${line}`)
    .join('\n')
}

/** 生成导出文件名：reading-{kind}-{YYYY-MM-DD}.{ext} */
export function generateReadingExportFilename(
  kind: 'excerpts' | 'memos' | 'combined',
  ext: string,
): string {
  const date = new Date().toISOString().slice(0, 10)
  return `reading-${kind}-${date}.${ext}`
}

// ---- 纯构建函数 ----

/** 摘录正文（不含顶层标题），返回 Markdown 行数组 */
function renderExcerptsBody(excerpts: Excerpt[]): string[] {
  const lines: string[] = []
  for (const ex of excerpts) {
    const source = ex.source?.trim() || '未命名出处'
    lines.push(`### 出处：${source}`)
    lines.push('')
    lines.push(toQuoteBlock(ex.text?.trim() || ''))
    if (ex.note?.trim()) {
      lines.push('')
      lines.push(`**批注：** ${ex.note.trim()}`)
    }
    if (ex.createdAt) {
      lines.push('')
      lines.push(`_— 记录于 ${formatExportDate(ex.createdAt)}_`)
    }
    lines.push('')
  }
  return lines
}

/** 便签正文（不含顶层标题），返回 Markdown 行数组 */
function renderMemosBody(memos: ReadingMemo[]): string[] {
  const lines: string[] = []
  for (const m of memos) {
    const meta: string[] = [`记录于 ${formatExportDate(m.updatedAt || m.createdAt)}`]
    if (m.bookTitle?.trim()) meta.push(`关联《${m.bookTitle.trim()}》`)
    lines.push(`- ${m.text?.trim() || ''}`)
    lines.push(`  _（${meta.join(' · ')}）_`)
    lines.push('')
  }
  return lines
}

/** 构建摘录集 Markdown 文档 */
export function buildExcerptsMarkdown(
  excerpts: Excerpt[],
  options?: { title?: string },
): string {
  const title = options?.title ?? '心流工坊 · 阅读摘录'
  const out: string[] = []
  out.push(`# ${title}`)
  out.push('')
  out.push(`> 导出时间：${formatExportDate(new Date().toISOString())}　共 ${excerpts.length} 条`)
  out.push('')
  if (!excerpts.length) {
    out.push('_暂无摘录。_')
    out.push('')
    return out.join('\n')
  }
  out.push(...renderExcerptsBody(excerpts))
  return out.join('\n').trimEnd() + '\n'
}

/** 构建读书便签 Markdown 文档 */
export function buildMemosMarkdown(
  memos: ReadingMemo[],
  options?: { title?: string },
): string {
  const title = options?.title ?? '心流工坊 · 读书便签'
  const out: string[] = []
  out.push(`# ${title}`)
  out.push('')
  out.push(`> 导出时间：${formatExportDate(new Date().toISOString())}　共 ${memos.length} 条`)
  out.push('')
  if (!memos.length) {
    out.push('_暂无便签。_')
    out.push('')
    return out.join('\n')
  }
  out.push(...renderMemosBody(memos))
  return out.join('\n').trimEnd() + '\n'
}

/** 构建「摘录 + 便签」合并 Markdown 文档 */
export function buildReadingExportMarkdown(
  excerpts: Excerpt[],
  memos: ReadingMemo[],
): string {
  const out: string[] = []
  out.push('# 心流工坊 · 阅读摘录与便签')
  out.push('')
  out.push(
    `> 导出时间：${formatExportDate(new Date().toISOString())}　摘录 ${excerpts.length} 条 · 便签 ${memos.length} 条`,
  )
  out.push('')
  out.push(`## 阅读摘录（${excerpts.length}）`)
  out.push('')
  if (excerpts.length) out.push(...renderExcerptsBody(excerpts))
  else out.push('_暂无摘录。_', '')
  out.push('## 读书便签（' + memos.length + '）')
  out.push('')
  if (memos.length) out.push(...renderMemosBody(memos))
  else out.push('_暂无便签。_', '')
  return out.join('\n').trimEnd() + '\n'
}

/** 导出 JSON 载荷结构 */
export interface ReadingExportPayload {
  app: 'heartflow'
  type: 'reading-export'
  version: 1
  exportedAt: string
  counts: { excerpts: number; memos: number }
  excerpts: Excerpt[]
  memos: ReadingMemo[]
}

/** 构建「摘录 + 便签」合并 JSON（含元数据，便于回灌） */
export function buildReadingExportJson(
  excerpts: Excerpt[],
  memos: ReadingMemo[],
): string {
  const payload: ReadingExportPayload = {
    app: 'heartflow',
    type: 'reading-export',
    version: 1,
    exportedAt: new Date().toISOString(),
    counts: { excerpts: excerpts.length, memos: memos.length },
    excerpts,
    memos,
  }
  return JSON.stringify(payload, null, 2)
}

// ---- 浏览器本地下载（Blob，不触云） ----

/** 把文本内容以指定 MIME 触发浏览器下载 */
export function downloadReadingExport(
  content: string,
  filename: string,
  mimeType: string = 'text/markdown',
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- Composable ----

/**
 * 摘录 / 便签 本地导出入口。
 * 数据分别来自 useReading().excerpts 与 useReadingMemos().memos（本地私有，不触云）。
 */
export function useReadingExport() {
  const reading = useReading()
  const memoStore = useReadingMemos()

  const excerptCount = computed(() => reading.excerpts.value.length)
  const memoCount = computed(() => memoStore.memos.value.length)

  /** 导出摘录集为 Markdown */
  function exportExcerpts() {
    if (!excerptCount.value) return
    const md = buildExcerptsMarkdown(reading.excerpts.value)
    downloadReadingExport(md, generateReadingExportFilename('excerpts', 'md'))
  }

  /** 导出读书便签为 Markdown */
  function exportMemos() {
    if (!memoCount.value) return
    const md = buildMemosMarkdown(memoStore.memos.value)
    downloadReadingExport(md, generateReadingExportFilename('memos', 'md'))
  }

  /** 导出「摘录 + 便签」合并 Markdown */
  function exportAllMarkdown() {
    const md = buildReadingExportMarkdown(reading.excerpts.value, memoStore.memos.value)
    downloadReadingExport(md, generateReadingExportFilename('combined', 'md'))
  }

  /** 导出「摘录 + 便签」合并 JSON（含元数据，便于回灌） */
  function exportAllJson() {
    const json = buildReadingExportJson(reading.excerpts.value, memoStore.memos.value)
    downloadReadingExport(json, generateReadingExportFilename('combined', 'json'), 'application/json')
  }

  return {
    excerptCount,
    memoCount,
    exportExcerpts,
    exportMemos,
    exportAllMarkdown,
    exportAllJson,
  }
}
