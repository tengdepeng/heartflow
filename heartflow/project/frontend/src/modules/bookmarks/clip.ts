// ============================================================
// 网页剪藏服务（批次C·书签与入口架）
// 本地抓取页面元数据（标题/描述/预览图/正文摘要/阅读时长），
// 站点禁止跨域读取（CORS）时优雅降级为空结果，交由用户手动填写。
// ============================================================

export interface ClipMeta {
  title: string
  description: string
  excerpt: string
  previewImage: string
  contentType: 'article' | 'video' | 'image' | 'audio' | 'other'
  readingTime: number
}

export const EMPTY_CLIP: ClipMeta = {
  title: '',
  description: '',
  excerpt: '',
  previewImage: '',
  contentType: 'other',
  readingTime: 0,
}

export function normalizeUrl(input: string): string {
  let url = input.trim()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return url
}

function pickMeta(doc: Document, selectors: string[]): string {
  for (const sel of selectors) {
    const el = doc.querySelector(sel)
    const content = el?.getAttribute('content') || el?.textContent || ''
    if (content.trim()) return content.trim()
  }
  return ''
}

function estimateReadingTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length
  if (!words) return 0
  return Math.max(1, Math.round(words / 250))
}

function detectContentType(doc: Document): ClipMeta['contentType'] {
  const ogType = pickMeta(doc, ['meta[property="og:type"]'])
  if (ogType.includes('video')) return 'video'
  if (ogType.includes('audio')) return 'audio'
  if (ogType.includes('image')) return 'image'
  const embedded =
    doc.querySelector('video') ||
    doc.querySelector('iframe[src*="youtube"], iframe[src*="bilibili"], iframe[src*="vimeo"], iframe[src*="youku"]')
  if (embedded) return 'video'
  return 'article'
}

export async function fetchClipMeta(input: string): Promise<ClipMeta> {
  const url = normalizeUrl(input)
  if (!url) return { ...EMPTY_CLIP }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(url, { headers: { Accept: 'text/html' }, signal: controller.signal })
    if (!res.ok) return { ...EMPTY_CLIP }
    const html = await res.text()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const title =
      pickMeta(doc, ['meta[property="og:title"]', 'meta[name="twitter:title"]', 'title']) || ''
    const description = pickMeta(doc, [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ])
    const previewImage = pickMeta(doc, ['meta[property="og:image"]', 'meta[name="twitter:image"]'])
    const body = doc.body?.innerText || ''
    const excerpt = body.replace(/\s+/g, ' ').trim().slice(0, 200)
    return {
      title,
      description,
      excerpt,
      previewImage,
      contentType: detectContentType(doc),
      readingTime: estimateReadingTime(body),
    }
  } catch {
    return { ...EMPTY_CLIP }
  } finally {
    clearTimeout(timer)
  }
}

export function faviconUrl(input: string): string {
  try {
    const u = new URL(normalizeUrl(input))
    return `${u.protocol}//${u.hostname}/favicon.ico`
  } catch {
    return ''
  }
}
