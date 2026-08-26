// ============================================================
// 轻量级 Markdown → HTML 解析器
// 支持常用行内/块级语法，无需外部依赖
// 增强版：任务列表、删除线、表格、图片、代码块语言标注
// ============================================================

/** 将 Markdown 文本渲染为安全 HTML */
export function renderMarkdown(text: string): string {
  // 先处理多行块级结构（表格可能在多行中被分割，需要特殊处理）
  // 以空行分割为段落块
  return text
    .split(/\n\n+/)
    .map(block => processBlock(block.trim()))
    .join('\n')
}

function processBlock(block: string): string {
  // 代码块（``` ... ```）— 可能带语言标注
  if (/^```/.test(block)) {
    return processCodeBlock(block)
  }

  // 表格 — 至少两行（表头 + 分隔线）
  if (block.includes('|') && /\| *[-:]+[-| :]* *\|/.test(block)) {
    return processTable(block)
  }

  // 标题
  const headingMatch = block.match(/^(#{1,6})\s+(.+)$/m)
  if (headingMatch) {
    const level = headingMatch[1].length
    const content = headingMatch[2]
    return `<h${level}>${renderInline(content)}</h${level}>`
  }

  // 水平线
  if (/^[-*_]{3,}$/.test(block.trim())) {
    return '<hr>'
  }

  // 引用
  if (block.startsWith('> ')) {
    const content = block.replace(/^>\s?/gm, '').trim()
    return `<blockquote>${renderInline(content)}</blockquote>`
  }

  // 任务列表
  if (/^[-*+]\s+\[[ x]\]\s/i.test(block)) {
    return processTaskList(block)
  }

  // 无序列表
  if (/^[-*+]\s/.test(block)) {
    const items = block.split('\n').map(line => {
      const content = line.replace(/^[-*+]\s+/, '')
      return `<li>${renderInline(content)}</li>`
    }).join('')
    return `<ul>${items}</ul>`
  }

  // 有序列表
  if (/^\d+\.\s/.test(block)) {
    const items = block.split('\n').map(line => {
      const content = line.replace(/^\d+\.\s+/, '')
      return `<li>${renderInline(content)}</li>`
    }).join('')
    return `<ol>${items}</ol>`
  }

  // 普通段落
  return `<p>${renderInline(block)}</p>`
}

/** 处理代码块，支持语言标注 */
function processCodeBlock(block: string): string {
  const lines = block.split('\n')
  const firstLine = lines[0]
  const lang = firstLine.replace(/^```/, '').trim()
  const code = lines.slice(1).join('\n').replace(/```\s*$/, '').trim()
  const langAttr = lang ? ` class="lang-${escapeHtml(lang)}"` : ''
  return `<pre><code${langAttr}>${escapeHtml(code)}</code></pre>`
}

/** 处理表格 */
function processTable(block: string): string {
  const rows = block.split('\n').filter(r => r.trim().startsWith('|'))
  if (rows.length < 2) return `<p>${renderInline(block)}</p>`

  // 解析表头
  const headerCells = rows[0]
    .split('|')
    .filter(c => c.trim().length > 0)
    .map(c => c.trim())

  // 解析对齐方式（第二行）
  const alignRow = rows[1]
  const alignments = alignRow
    .split('|')
    .filter(c => c.trim().length > 0)
    .map(c => {
      const col = c.trim()
      if (col.startsWith(':') && col.endsWith(':')) return ' center'
      if (col.endsWith(':')) return ' right'
      return ''
    })

  // 构建表格头部
  let html = '<table><thead><tr>'
  headerCells.forEach((cell, i) => {
    const align = alignments[i] || ''
    html += `<th${align}>${renderInline(cell)}</th>`
  })
  html += '</tr></thead><tbody>'

  // 数据行（从第三行开始）
  for (let i = 2; i < rows.length; i++) {
    const cells = rows[i]
      .split('|')
      .filter(c => c.trim().length > 0)
      .map(c => c.trim())
    if (cells.length === 0) continue
    html += '<tr>'
    cells.forEach((cell, j) => {
      const align = alignments[j] || ''
      html += `<td${align}>${renderInline(cell)}</td>`
    })
    html += '</tr>'
  }

  html += '</tbody></table>'
  return html
}

/** 处理任务列表 */
function processTaskList(block: string): string {
  const items = block.split('\n').map(line => {
    const match = line.match(/^[-*+]\s+\[([ x])\]\s+(.*)$/i)
    if (!match) return `<li>${renderInline(line)}</li>`
    const checked = match[1].toLowerCase() === 'x'
    const content = match[2]
    return `<li class="task-item${checked ? ' done' : ''}">` +
      `<input type="checkbox" disabled${checked ? ' checked' : ''}> ` +
      `${renderInline(content)}</li>`
  }).join('')
  return `<ul class="task-list">${items}</ul>`
}

function renderInline(text: string): string {
  // 先转义 HTML（防止 XSS）
  let result = escapeHtml(text)

  // 保护行内代码：先抽出，避免其中的 [[...]] 被误判为双链
  const codeSpans: string[] = []
  result = result.replace(/`([^`]+)`/g, (_, code: string) => {
    codeSpans.push(`<code>${code}</code>`)
    return `\u0000C${codeSpans.length - 1}\u0000`
  })

  // 图片 ![alt](url)
  result = result.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" loading="lazy">'
  )

  // 双向链接 [[token]] → 可点击锚点（token 可为目标笔记 id / 标题 / 标题#块锚点）
  result = result.replace(/\[\[([^\]]+)\]\]/g, (_, token: string) => {
    const safe = token
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    const hashIdx = safe.indexOf('#')
    const target = hashIdx === -1 ? safe : safe.slice(0, hashIdx)
    const blockId = hashIdx === -1 ? '' : safe.slice(hashIdx + 1)
    const blockAttr = blockId ? ` data-blockid="${blockId}"` : ''
    return `<a class="wikilink" data-wikilink="${target}"${blockAttr}>${safe}</a>`
  })

  // 链接 [text](url)
  result = result.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  )

  // 删除线 ~~text~~
  result = result.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  // 加粗
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

  // 斜体
  result = result.replace(/\*([^*]+)\*/g, '<em>$1</em>')

  // 换行
  result = result.replace(/\n/g, '<br>')

  // 还原行内代码
  result = result.replace(/\u0000C(\d+)\u0000/g, (_, i: string) => codeSpans[Number(i)])

  return result
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 获取纯文本（去除 Markdown 标记，用于预览） */
export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[\[([^\]]+)\]\]/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/[-*+]\s+\[[ x]\]\s+/gi, '')
    .replace(/[-*+]\s+/g, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/>\s+/g, '')
    .replace(/\|/g, '')
    .replace(/:?-+:?/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
}

/** 统计字数（中文算一个字，英文算一个单词） */
export function countWords(text: string): number {
  const clean = stripMarkdown(text)
  // 中文字符
  const chineseChars = (clean.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g) || []).length
  // 英文单词
  const englishWords = clean
    .replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0).length
  return chineseChars + englishWords
}

/** 统计字符数 */
export function countChars(text: string): number {
  return stripMarkdown(text).length
}