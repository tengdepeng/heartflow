// ============================================================
// 思绪书房 · Markdown 导出引擎（P19-5）
// 蓝图：单篇/批量导出，支持 Markdown/HTML/PDF，前置元数据，代码块/表格/图片/标签链接
// ============================================================

import type { Note } from '../../types'
import { getLocalDateKey } from '../../utils/time'

// ---- 导出类型 ----

/** 导出格式 */
export type ExportFormat = 'markdown' | 'html' | 'pdf'

/** Markdown 导出选项 */
export interface MarkdownExportOptions {
  /** 导出格式 */
  format: ExportFormat
  /** 是否包含 YAML frontmatter */
  includeFrontmatter: boolean
  /** 是否包含笔记元数据（创建时间、更新时间、标签等） */
  includeMetadata: boolean
  /** 是否包含目录 */
  includeTableOfContents: boolean
  /** 是否导出标签链接（[[tag:xxx]]） */
  includeTagLinks: boolean
  /** 是否在标题中显示标签 */
  includeTagsInTitle: boolean
  /** 自定义 CSS（HTML 格式） */
  customCss?: string
  /** 导出文件名前缀 */
  filenamePrefix?: string
  /** 是否压缩图片引用 */
  compressImages?: boolean
  /** 时间格式化函数 */
  dateFormat?: (iso: string) => string
}

/** 导出结果 */
export interface ExportResult {
  /** 导出内容 */
  content: string
  /** 导出格式 */
  format: ExportFormat
  /** 文件名 */
  filename: string
  /** 导出的笔记数量 */
  noteCount: number
  /** 总字符数 */
  totalChars: number
  /** 导出时间 */
  exportedAt: string
  /** Blob 对象（用于下载） */
  blob?: Blob
}

/** 批量导出过滤选项 */
export interface BatchExportFilter {
  /** 标签过滤 */
  tags?: string[]
  /** 是否包含已归档 */
  includeArchived?: boolean
  /** 是否包含已删除 */
  includeDeleted?: boolean
  /** 日期范围开始 */
  dateFrom?: string
  /** 日期范围结束 */
  dateTo?: string
  /** 搜索关键词 */
  searchQuery?: string
  /** 排序方式 */
  sortBy?: 'createdAt' | 'updatedAt' | 'title'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
}

// ---- 默认选项 ----

const DEFAULT_OPTIONS: MarkdownExportOptions = {
  format: 'markdown',
  includeFrontmatter: true,
  includeMetadata: true,
  includeTableOfContents: false,
  includeTagLinks: true,
  includeTagsInTitle: false,
  compressImages: false,
}

// ---- 导出引擎 composable ----

export function useMarkdownExport() {
  /**
   * 导出单篇笔记为 Markdown
   */
  function exportToMarkdown(note: Note, options?: Partial<MarkdownExportOptions>): ExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const lines: string[] = []

    // YAML Frontmatter
    if (opts.includeFrontmatter) {
      lines.push('---')
      lines.push(`title: "${escapeYaml(note.title)}"`)
      lines.push(`id: ${note.id}`)
      lines.push(`created: ${formatDate(note.createdAt, opts.dateFormat)}`)
      lines.push(`updated: ${formatDate(note.updatedAt, opts.dateFormat)}`)
      if (note.tags.length > 0) {
        lines.push(`tags: [${note.tags.map(t => `"${escapeYaml(t)}"`).join(', ')}]`)
      }
      if (note.archived) {
        lines.push('archived: true')
      }
      lines.push('---')
      lines.push('')
    }

    // 标题
    const titleLine = opts.includeTagsInTitle && note.tags.length > 0
      ? `# ${note.title} ${note.tags.map(t => `\`#${t}\``).join(' ')}`
      : `# ${note.title}`
    lines.push(titleLine)
    lines.push('')

    // 元数据块
    if (opts.includeMetadata && !opts.includeFrontmatter) {
      lines.push('> **创建时间**: ' + formatDate(note.createdAt, opts.dateFormat))
      lines.push('> **更新时间**: ' + formatDate(note.updatedAt, opts.dateFormat))
      if (note.tags.length > 0) {
        lines.push('> **标签**: ' + note.tags.map(t => `\`#${t}\``).join(' '))
      }
      lines.push('')
    }

    // 标签链接
    if (opts.includeTagLinks && note.tags.length > 0) {
      const tagLinks = note.tags.map(t => `[[tag:${t}]]`).join(' ')
      lines.push(`**关联标签**: ${tagLinks}`)
      lines.push('')
    }

    // 分隔线
    lines.push('---')
    lines.push('')

    // 内容（处理 Markdown 特殊格式）
    lines.push(processContent(note.content, opts))
    lines.push('')

    // 页脚
    lines.push('---')
    lines.push(`*由思绪书房导出 · ${formatDate(new Date().toISOString(), opts.dateFormat)}*`)

    const content = lines.join('\n')
    const filename = generateFilename(note.title, 'md', opts.filenamePrefix)

    return {
      content,
      format: 'markdown',
      filename,
      noteCount: 1,
      totalChars: content.length,
      exportedAt: new Date().toISOString(),
      blob: createTextBlob(content, 'text/markdown'),
    }
  }

  /**
   * 导出单篇笔记为 HTML
   */
  function exportToHTML(note: Note, options?: Partial<MarkdownExportOptions>): ExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    const mdResult = exportToMarkdown(note, { ...opts, format: 'markdown' })
    const htmlContent = markdownToHtml(mdResult.content, opts, note)
    const filename = generateFilename(note.title, 'html', opts.filenamePrefix)

    return {
      content: htmlContent,
      format: 'html',
      filename,
      noteCount: 1,
      totalChars: htmlContent.length,
      exportedAt: new Date().toISOString(),
      blob: createTextBlob(htmlContent, 'text/html'),
    }
  }

  /**
   * 导出单篇笔记为 PDF（通过 HTML 转换）
   */
  function exportToPDF(note: Note, options?: Partial<MarkdownExportOptions>): ExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options }
    // PDF 导出实际返回 HTML 内容，由调用方通过浏览器打印功能转换
    const htmlResult = exportToHTML(note, { ...opts, format: 'html' })
    const filename = generateFilename(note.title, 'pdf', opts.filenamePrefix)

    return {
      ...htmlResult,
      filename,
      format: 'pdf',
    }
  }

  /**
   * 批量导出笔记
   */
  function batchExport(
    notes: Note[],
    options?: Partial<MarkdownExportOptions>,
    filter?: BatchExportFilter,
  ): ExportResult {
    const opts = { ...DEFAULT_OPTIONS, ...options, includeTableOfContents: true }
    let filtered = filterNotes(notes, filter)

    if (filtered.length === 0) {
      return {
        content: '',
        format: opts.format,
        filename: 'empty-export.md',
        noteCount: 0,
        totalChars: 0,
        exportedAt: new Date().toISOString(),
      }
    }

    const lines: string[] = []
    const now = new Date().toISOString()

    // 文档头部
    lines.push('---')
    lines.push(`title: "思绪书房笔记导出"`)
    lines.push(`exported: ${formatDate(now, opts.dateFormat)}`)
    lines.push(`noteCount: ${filtered.length}`)
    if (filter?.tags && filter.tags.length > 0) {
      lines.push(`filterTags: [${filter.tags.map(t => `"${escapeYaml(t)}"`).join(', ')}]`)
    }
    lines.push('---')
    lines.push('')

    lines.push('# 思绪书房笔记导出')
    lines.push('')
    lines.push(`> **导出时间**: ${formatDate(now, opts.dateFormat)}`)
    lines.push(`> **笔记数量**: ${filtered.length}`)
    if (filter?.tags && filter.tags.length > 0) {
      lines.push(`> **筛选标签**: ${filter.tags.map(t => `\`#${t}\``).join(' ')}`)
    }
    lines.push('')

    // 目录
    if (opts.includeTableOfContents && filtered.length > 1) {
      lines.push('## 目录')
      lines.push('')
      filtered.forEach((note, idx) => {
        const title = note.title || '无标题'
        lines.push(`${idx + 1}. [${title}](#${slugify(title)})`)
      })
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    // 逐篇导出
    let totalChars = 0
    for (let i = 0; i < filtered.length; i++) {
      const note = filtered[i]
      const noteContent = exportNoteSection(note, opts, i + 1, filtered.length)
      lines.push(noteContent)
      lines.push('')
      lines.push('---')
      lines.push('')
      totalChars += noteContent.length
    }

    // 页脚
    lines.push(`*共 ${filtered.length} 篇笔记 · 由思绪书房导出 · ${formatDate(now, opts.dateFormat)}*`)

    const content = lines.join('\n')
    const ext = opts.format === 'html' ? 'html' : opts.format === 'pdf' ? 'pdf' : 'md'
    const filename = `notes-export-${formatDate(now, opts.dateFormat).replace(/[:\s]/g, '-')}.${ext}`

    let finalContent = content
    if (opts.format === 'html') {
      finalContent = batchMarkdownToHtml(content, filtered, opts)
    }

    return {
      content: finalContent,
      format: opts.format,
      filename,
      noteCount: filtered.length,
      totalChars,
      exportedAt: now,
      blob: opts.format === 'html'
        ? createTextBlob(finalContent, 'text/html')
        : createTextBlob(content, 'text/markdown'),
    }
  }

  /**
   * 复制到剪贴板
   */
  async function copyToClipboard(note: Note, options?: Partial<MarkdownExportOptions>): Promise<boolean> {
    try {
      const result = exportToMarkdown(note, options)
      await navigator.clipboard.writeText(result.content)
      return true
    } catch {
      // 降级方案：使用 textarea
      try {
        const result = exportToMarkdown(note, options)
        const textarea = document.createElement('textarea')
        textarea.value = result.content
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        return true
      } catch {
        return false
      }
    }
  }

  /**
   * 下载为文件
   */
  function downloadAsFile(result: ExportResult): void {
    const blob = result.blob || createTextBlob(
      result.content,
      result.format === 'html' ? 'text/html' : 'text/markdown',
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  /**
   * 导出多个笔记为独立文件
   */
  function exportAsSeparateFiles(
    notes: Note[],
    options?: Partial<MarkdownExportOptions>,
  ): ExportResult[] {
    const results: ExportResult[] = []
    for (const note of notes) {
      if (note.deletedAt) continue
      const result = exportToMarkdown(note, options)
      results.push(result)
    }
    return results
  }

  /**
   * 生成导出预览（纯文本版）
   */
  function previewExport(
    note: Note,
    options?: Partial<MarkdownExportOptions>,
    maxLength: number = 200,
  ): string {
    const result = exportToMarkdown(note, options)
    if (result.content.length <= maxLength) return result.content
    return result.content.slice(0, maxLength) + '\n\n...'
  }

  return {
    exportToMarkdown,
    exportToHTML,
    exportToPDF,
    batchExport,
    copyToClipboard,
    downloadAsFile,
    exportAsSeparateFiles,
    previewExport,
  }
}

// ---- 内部函数 ----

/** 格式化日期 */
function formatDate(iso: string, customFormat?: (iso: string) => string): string {
  if (customFormat) return customFormat(iso)
  try {
    const d = new Date(iso)
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

/** 转义 YAML 字符串 */
function escapeYaml(str: string): string {
  return str.replace(/"/g, '\\"').replace(/\n/g, '\\n')
}

/** 生成文件名 */
function generateFilename(
  title: string,
  ext: string,
  prefix?: string,
): string {
  const safe = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    || 'untitled'
  const date = getLocalDateKey()
  const p = prefix ? `${prefix}-` : ''
  return `${p}${safe}-${date}.${ext}`
}

/** 生成 slug */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** 处理笔记内容（Markdown 格式化） */
function processContent(content: string, opts: MarkdownExportOptions): string {
  let processed = content

  // 处理标签链接
  if (opts.includeTagLinks) {
    processed = processed.replace(/#(\S+)/g, (match, tag) => {
      // 保护已有的 Markdown 标题
      if (match.startsWith('#')) {
        const headingMatch = processed.match(/^#{1,6}\s/)
        if (headingMatch) return match
      }
      return `[[tag:${tag}]]`
    })
  }

  return processed
}

/** 导出单篇笔记的章节 */
function exportNoteSection(
  note: Note,
  opts: MarkdownExportOptions,
  index: number,
  _total: number,
): string {
  const lines: string[] = []

  // 章节标题
  const anchor = slugify(note.title || 'untitled')
  lines.push(`## ${index}. ${note.title || '无标题'} {#${anchor}}`)
  lines.push('')

  // 元数据
  if (opts.includeMetadata) {
    lines.push(`> **创建**: ${formatDate(note.createdAt, opts.dateFormat)} | **更新**: ${formatDate(note.updatedAt, opts.dateFormat)}`)
    if (note.tags.length > 0) {
      lines.push(`> **标签**: ${note.tags.map(t => `\`#${t}\``).join(' ')}`)
    }
    if (note.archived) {
      lines.push('> **状态**: 已归档')
    }
    lines.push('')
  }

  // 内容
  if (note.content.trim()) {
    lines.push(note.content)
  } else {
    lines.push('*（无内容）*')
  }

  return lines.join('\n')
}

/** 过滤笔记 */
function filterNotes(notes: Note[], filter?: BatchExportFilter): Note[] {
  if (!filter) return notes.filter(n => !n.deletedAt)

  let filtered = [...notes]

  // 删除过滤
  if (!filter.includeDeleted) {
    filtered = filtered.filter(n => !n.deletedAt)
  }
  if (!filter.includeArchived) {
    filtered = filtered.filter(n => !n.archived)
  }

  // 标签过滤
  if (filter.tags && filter.tags.length > 0) {
    filtered = filtered.filter(n => filter.tags!.some(t => n.tags.includes(t)))
  }

  // 日期范围
  if (filter.dateFrom) {
    const from = new Date(filter.dateFrom)
    filtered = filtered.filter(n => new Date(n.createdAt) >= from)
  }
  if (filter.dateTo) {
    const to = new Date(filter.dateTo)
    to.setHours(23, 59, 59, 999)
    filtered = filtered.filter(n => new Date(n.createdAt) <= to)
  }

  // 搜索关键词
  if (filter.searchQuery) {
    const q = filter.searchQuery.toLowerCase()
    filtered = filtered.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q)),
    )
  }

  // 排序
  if (filter.sortBy) {
    const order = filter.sortOrder === 'desc' ? -1 : 1
    filtered.sort((a, b) => {
      const va = filter.sortBy === 'title' ? a.title : a[filter.sortBy!]
      const vb = filter.sortBy === 'title' ? b.title : b[filter.sortBy!]
      if (va < vb) return -1 * order
      if (va > vb) return 1 * order
      return 0
    })
  }

  return filtered
}

/** 简单 Markdown 转 HTML */
function markdownToHtml(
  md: string,
  opts: MarkdownExportOptions,
  note?: Note,
): string {
  let html = md

  // 转义 HTML 实体（在代码块之外）
  // 先用占位符保护代码块
  const codeBlocks: string[] = []
  html = html.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match)
    return `%%CODEBLOCK_${codeBlocks.length - 1}%%`
  })

  // 保护行内代码
  const inlineCodes: string[] = []
  html = html.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match)
    return `%%INLINECODE_${inlineCodes.length - 1}%%`
  })

  // 标题
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // 粗体和斜体
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // 链接
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // 图片
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // 引用
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')

  // 水平线
  html = html.replace(/^---$/gm, '<hr>')

  // 无序列表
  html = html.replace(/^[\s]*[-*+]\s(.+)$/gm, '<li>$1</li>')
  // 有序列表
  html = html.replace(/^[\s]*\d+\.\s(.+)$/gm, '<li>$1</li>')

  // 表格
  html = html.replace(/^\|(.+)\|$/gm, (line) => {
    const cells = line.split('|').filter(c => c.trim())
    if (cells.every(c => /^[-:]+$/.test(c.trim()))) return '' // 分隔行
    return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
  })

  // 标签链接
  html = html.replace(/\[\[tag:(.+?)\]\]/g, '<span class="tag-link">#$1</span>')

  // 恢复代码块
  for (let i = 0; i < codeBlocks.length; i++) {
    const code = codeBlocks[i]
      .replace(/```(\w*)\n?/, '<pre><code class="language-$1">')
      .replace(/```$/, '</code></pre>')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    html = html.replace(`%%CODEBLOCK_${i}%%`, code)
  }

  // 恢复行内代码
  for (let i = 0; i < inlineCodes.length; i++) {
    const code = inlineCodes[i]
      .replace(/`/g, '')
    html = html.replace(`%%INLINECODE_${i}%%`, `<code>${escapeHtml(code)}</code>`)
  }

  // 包裹段落
  const paragraphs = html.split(/\n\n+/)
  const wrapped = paragraphs.map(p => {
    const trimmed = p.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') ||
        trimmed.startsWith('<blockquote') || trimmed.startsWith('<hr') ||
        trimmed.startsWith('<li') || trimmed.startsWith('<tr') ||
        trimmed.startsWith('<table')) {
      return trimmed
    }
    return `<p>${trimmed}</p>`
  })

  html = wrapped.join('\n')

  // 合并相邻的 <li>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')

  // 合并相邻的 <tr>
  html = html.replace(/((?:<tr>.*<\/tr>\n?)+)/g, '<table>$1</table>')

  // 合并相邻的 <blockquote>
  html = html.replace(/((?:<blockquote>.*<\/blockquote>\n?)+)/g, (match) => {
    const content = match.replace(/<\/blockquote>\n?<blockquote>/g, '<br>')
    return `<blockquote>${content.replace(/<blockquote>/g, '').replace(/<\/blockquote>/g, '')}</blockquote>`
  })

  // 完整 HTML 文档
  const title = note?.title || '思绪书房笔记'
  const css = opts.customCss || DEFAULT_HTML_CSS

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="note-content">
${html}
  </div>
  <footer class="note-footer">
    <p>由 <strong>思绪书房</strong> 导出</p>
  </footer>
</body>
</html>`
}

/** 批量导出 Markdown 转 HTML */
function batchMarkdownToHtml(
  md: string,
  _notes: Note[],
  opts: MarkdownExportOptions,
): string {
  // 使用相同的逻辑但标题为批量导出
  return markdownToHtml(md, opts)
}

/** 转义 HTML */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 创建文本 Blob */
function createTextBlob(content: string, mimeType: string): Blob {
  return new Blob([content], { type: `${mimeType};charset=utf-8` })
}

/** 默认 HTML CSS */
const DEFAULT_HTML_CSS = `
  :root {
    --bg: #ffffff;
    --text: #1a1a2e;
    --text-secondary: #6b7280;
    --border: #e5e7eb;
    --accent: #6b9fc4;
    --code-bg: #f3f4f6;
    --blockquote-border: #6b9fc4;
    --tag-bg: #eef2ff;
    --tag-text: #4f46e5;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #1a1a2e;
      --text: #e5e7eb;
      --text-secondary: #9ca3af;
      --border: #374151;
      --accent: #a07c8c;
      --code-bg: #1f2937;
      --blockquote-border: #a07c8c;
      --tag-bg: #312e81;
      --tag-text: #c7d2fe;
    }
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC',
      'Microsoft YaHei', sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.8;
    padding: 2rem;
    max-width: 800px;
    margin: 0 auto;
  }

  .note-content {
    font-size: 16px;
  }

  h1 { font-size: 2em; margin: 1.5em 0 0.5em; border-bottom: 2px solid var(--border); padding-bottom: 0.3em; }
  h2 { font-size: 1.5em; margin: 1.3em 0 0.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.2em; }
  h3 { font-size: 1.25em; margin: 1.1em 0 0.4em; }
  h4 { font-size: 1.1em; margin: 1em 0 0.3em; }

  p { margin: 0.8em 0; }

  a { color: var(--accent); text-decoration: none; }
  a:hover { text-decoration: underline; }

  blockquote {
    border-left: 4px solid var(--blockquote-border);
    padding: 0.5em 1em;
    margin: 1em 0;
    color: var(--text-secondary);
    background: var(--code-bg);
    border-radius: 0 4px 4px 0;
  }

  pre {
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 1em;
    overflow-x: auto;
    margin: 1em 0;
    font-size: 0.9em;
  }

  code {
    background: var(--code-bg);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }

  pre code {
    background: none;
    padding: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 1em 0;
  }

  th, td {
    border: 1px solid var(--border);
    padding: 0.5em 0.8em;
    text-align: left;
  }

  th {
    background: var(--code-bg);
    font-weight: 600;
  }

  ul, ol {
    margin: 0.8em 0;
    padding-left: 2em;
  }

  li { margin: 0.3em 0; }

  hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 2em 0;
  }

  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
  }

  .tag-link {
    display: inline-block;
    background: var(--tag-bg);
    color: var(--tag-text);
    padding: 0.1em 0.6em;
    border-radius: 12px;
    font-size: 0.85em;
    margin: 0 0.2em;
  }

  .note-footer {
    margin-top: 3em;
    padding-top: 1em;
    border-top: 1px solid var(--border);
    text-align: center;
    color: var(--text-secondary);
    font-size: 0.85em;
  }
`