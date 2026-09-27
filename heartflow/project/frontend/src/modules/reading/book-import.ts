// ============================================================
// 阅览殿 · 电子书本地解析（乙-2）
// 本地落盘、不触云：解析 .txt / .epub / .pdf 为纯文本，
// 交由 hall.addBookFromText 存为「按书正文」(hf:reading:content:<id>)，
// 续读 / 划线回流 / 打开阅读 等能力复用既有链路。
//
// 选型说明：
//   - EPUB 用 jszip 解包（非 epubjs）：epubjs 是整书渲染引擎，对 Vite 集成极不友好，
//     本场景只需纯文本，jszip 更轻、更稳、构建友好。
//   - PDF 用 pdfjs-dist（v4，worker 经 Vite `?url` 注入）。
//   - 两个重库均「动态 import」懒加载，不进首页关键包。
// ============================================================

export interface ParsedBook {
  /** 书名（epub 取 dc:title / pdf 取元数据 / 否则回退文件名） */
  title: string
  /** 正文纯文本（已去 HTML 标签、压缩空行） */
  text: string
}

// ---------- 基础 IO ----------

/** 以文本方式读取文件（.txt / 编码可读的纯文本） */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

// ---------- HTML → 纯文本（纯正则，浏览器/vitest 同结果，可单测） ----------

/** 把 XHTML/HTML 内容压成纯文本：去 script/style、去标签、解码实体、压缩空行 */
export function stripHtmlToText(html: string): string {
  return html
    .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&hellip;/gi, '…')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// ---------- EPUB 解析（jszip） ----------

function dirOf(path: string): string {
  const i = path.lastIndexOf('/')
  return i >= 0 ? path.slice(0, i) : ''
}

/** 把相对路径按目录基解析为 zip 内绝对路径，处理 ./ 与 ../ */
function resolveZipPath(baseDir: string, href: string): string {
  const parts = baseDir ? baseDir.split('/') : []
  for (const seg of href.split('/')) {
    if (seg === '..') parts.pop()
    else if (seg === '' || seg === '.') continue
    else parts.push(seg)
  }
  return parts.join('/')
}

function attr(tag: string, name: string): string | undefined {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'))
  return m ? m[1] : undefined
}

/** 从 OPF 解析 manifest：item 的 id → 解析后的 zip 内路径 */
function parseManifest(opfXml: string, opfDir: string): Record<string, string> {
  const map: Record<string, string> = {}
  const items = opfXml.match(/<item\b[^>]*>/g) ?? []
  for (const tag of items) {
    const id = attr(tag, 'id')
    const href = attr(tag, 'href')
    if (id && href) map[id] = resolveZipPath(opfDir, href)
  }
  return map
}

/** 从 OPF 解析 spine 顺序：itemref 的 idref 列表 */
function parseSpine(opfXml: string): string[] {
  const refs = opfXml.match(/<itemref\b[^>]*>/g) ?? []
  return refs
    .map(tag => attr(tag, 'idref'))
    .filter((x): x is string => Boolean(x))
}

export async function parseEpub(file: File): Promise<ParsedBook> {
  const mod: any = await import('jszip')
  const JSZip = mod.default ?? mod
  const zip = await JSZip.loadAsync(file)

  const containerFile = zip.file('META-INF/container.xml')
  if (!containerFile) throw new Error('无效的 EPUB：缺少 META-INF/container.xml')
  const containerXml = await containerFile.async('text')
  const opfPath = attr(containerXml, 'full-path')
  if (!opfPath) throw new Error('无效的 EPUB：container.xml 未指明 OPF 路径')

  const opf = zip.file(opfPath)
  if (!opf) throw new Error(`无效的 EPUB：找不到 OPF 文件 ${opfPath}`)
  const opfXml = await opf.async('text')

  const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i)
  const rawName = (file as { name?: string }).name ?? ''
  const fallbackTitle = rawName.replace(/\.epub$/i, '') || '未命名书籍'
  const title = (titleMatch ? titleMatch[1] : fallbackTitle).trim() || fallbackTitle

  const manifest = parseManifest(opfXml, dirOf(opfPath))
  const spine = parseSpine(opfXml)

  const parts: string[] = []
  for (const idref of spine) {
    const href = manifest[idref]
    if (!href) continue
    const f = zip.file(href)
    if (!f) continue
    const xhtml = await f.async('text')
    const text = stripHtmlToText(xhtml)
    if (text) parts.push(text)
  }

  return { title, text: parts.join('\n\n') }
}

// ---------- PDF 解析（pdfjs-dist v4） ----------

export async function parsePdf(file: File): Promise<ParsedBook> {
  const pdfjs: any = await import('pdfjs-dist')
  const workerMod: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default

  const data = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data }).promise

  const chunks: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const line = (content.items as Array<{ str?: string }>)
      .map(it => it.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (line) chunks.push(line)
  }

  const rawName = (file as { name?: string }).name ?? ''
  let title = rawName.replace(/\.pdf$/i, '') || '未命名书籍'
  try {
    const meta = await doc.getMetadata()
    const info = (meta?.info as { Title?: string } | undefined) ?? undefined
    if (info?.Title) title = String(info.Title)
  } catch {
    /* 元数据缺失不致命 */
  }

  return { title: title.trim(), text: chunks.join('\n\n') }
}

// ---------- 统一分发 ----------

/** 按扩展名分发解析：.txt / .epub / .pdf。其它扩展名回退为纯文本读取。 */
export async function parseBookFile(file: File): Promise<ParsedBook> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.epub')) return parseEpub(file)
  if (name.endsWith('.pdf')) return parsePdf(file)
  // .txt 及未知类型：按纯文本读取（标题留空，由调用方按正文首行推导）
  const text = await readFileAsText(file)
  return { title: '', text }
}
