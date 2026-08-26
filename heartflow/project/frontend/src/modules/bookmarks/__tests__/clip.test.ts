// ============================================================
// 网页剪藏服务测试（clip.ts）
// ============================================================
import { describe, expect, it, vi, afterEach } from 'vitest'
import { fetchClipMeta, normalizeUrl, faviconUrl, EMPTY_CLIP } from '../clip'

const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>示例文章标题</title>
  <meta name="description" content="这是一段页面描述" />
  <meta property="og:title" content="OG 标题" />
  <meta property="og:image" content="https://img.example.com/cover.png" />
  <meta property="og:type" content="article" />
</head>
<body>
  <p>第一段正文内容，用于估算阅读时长。</p>
  <p>第二段正文内容。</p>
</body>
</html>`

function stubFetchOk(html: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    text: () => Promise.resolve(html),
  }))
}

function stubFetchFail() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeUrl', () => {
  it('为缺失协议补充 https', () => {
    expect(normalizeUrl('example.com/a')).toBe('https://example.com/a')
  })
  it('保留已有协议', () => {
    expect(normalizeUrl('http://example.com')).toBe('http://example.com')
  })
  it('空输入返回空串', () => {
    expect(normalizeUrl('  ')).toBe('')
  })
})

describe('faviconUrl', () => {
  it('从 URL 提取域名 favicon 地址', () => {
    expect(faviconUrl('https://example.com/path')).toBe('https://example.com/favicon.ico')
  })
  it('非法 URL 返回空串', () => {
    expect(faviconUrl('')).toBe('')
  })
})

describe('fetchClipMeta', () => {
  it('成功抓取页面元数据', async () => {
    stubFetchOk(SAMPLE_HTML)
    const meta = await fetchClipMeta('https://example.com/article')
    expect(meta.title).toBe('OG 标题')
    expect(meta.description).toBe('这是一段页面描述')
    expect(meta.previewImage).toBe('https://img.example.com/cover.png')
    expect(meta.contentType).toBe('article')
    expect(meta.readingTime).toBeGreaterThan(0)
    expect(meta.excerpt).toContain('第一段正文内容')
  })

  it('抓取失败时优雅降级为空结果', async () => {
    stubFetchFail()
    const meta = await fetchClipMeta('https://blocked.example.com')
    expect(meta).toEqual(EMPTY_CLIP)
  })

  it('非 2xx 响应返回空结果', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    const meta = await fetchClipMeta('https://example.com/404')
    expect(meta).toEqual(EMPTY_CLIP)
  })

  it('空 URL 直接返回空结果且不发起请求', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const meta = await fetchClipMeta('')
    expect(meta).toEqual(EMPTY_CLIP)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('检测视频类型页面', async () => {
    stubFetchOk(`<html><head><meta property="og:type" content="video.other" /></head><body></body></html>`)
    const meta = await fetchClipMeta('https://example.com/video')
    expect(meta.contentType).toBe('video')
  })
})
