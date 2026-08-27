// ============================================================
// 网页剪藏面板测试（bookmarks · clip）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BOOKMARKS_KEY = 'hf:bookmarks_v2'

const SAMPLE_HTML = `<!DOCTYPE html>
<html><head>
  <meta property="og:title" content="深入浅出 TypeScript" />
  <meta property="og:description" content="一份写给前端工程师的 TypeScript 进阶指南" />
  <meta property="og:image" content="https://example.com/cover.png" />
  <meta property="og:type" content="article" />
  <title>深入浅出 TypeScript</title>
</head><body>
  <p>这里是正文内容，介绍类型系统、泛型与装饰器。</p>
</body></html>`

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ClipPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('ClipPanel 网页剪藏', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染面板标题与输入框', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('网页剪藏')
    expect(wrapper.find('input.cl-input').exists()).toBe(true)
    expect(wrapper.findAll('button.cl-btn-primary').find(b => b.text() === '抓取元信息')!.attributes('disabled')).toBeDefined()
  })

  it('抓取 URL 元信息并展示预览', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(SAMPLE_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })))
    const wrapper = await mountPanel({})
    await wrapper.find('input.cl-input').setValue('https://example.com/article')
    await wrapper.findAll('button.cl-btn-primary').find(b => b.text() === '抓取元信息')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('深入浅出 TypeScript')
    expect(wrapper.text()).toContain('文章')
    expect(wrapper.text()).toContain('一份写给前端工程师的 TypeScript 进阶指南')
  })

  it('存入书签架并持久化到 hf:bookmarks_v2', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(SAMPLE_HTML, { status: 200, headers: { 'Content-Type': 'text/html' } })))
    const wrapper = await mountPanel({})
    await wrapper.find('input.cl-input').setValue('example.com/article')
    await wrapper.findAll('button.cl-btn-primary').find(b => b.text() === '抓取元信息')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button.cl-btn').find(b => b.text() === '存入书签架')!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('已存入书签架')
    const kv = readKv()
    const bookmarks = kv[BOOKMARKS_KEY]
    expect(bookmarks).toHaveLength(1)
    expect(bookmarks[0].url).toBe('https://example.com/article')
    expect(bookmarks[0].title).toBe('深入浅出 TypeScript')
    expect(bookmarks[0].content_type).toBe('article')
  })

  it('跨域失败时优雅降级提示', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const wrapper = await mountPanel({})
    await wrapper.find('input.cl-input').setValue('https://blocked.example.com')
    await wrapper.findAll('button.cl-btn-primary').find(b => b.text() === '抓取元信息')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('未能读取到元信息')
    expect(wrapper.text()).toContain('（无标题）')
  })

  it('降级结果仍可存入书签（URL 作标题）', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const wrapper = await mountPanel({})
    await wrapper.find('input.cl-input').setValue('https://blocked.example.com')
    await wrapper.findAll('button.cl-btn-primary').find(b => b.text() === '抓取元信息')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await wrapper.findAll('button.cl-btn').find(b => b.text() === '存入书签架')!.trigger('click')
    await wrapper.vm.$nextTick()

    const kv = readKv()
    const bookmarks = kv[BOOKMARKS_KEY]
    expect(bookmarks).toHaveLength(1)
    expect(bookmarks[0].url).toBe('https://blocked.example.com')
    expect(bookmarks[0].title).toBe('https://blocked.example.com')
  })
})
