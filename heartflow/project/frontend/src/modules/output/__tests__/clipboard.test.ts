import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock storage before importing modules that depend on it
const store = new Map<string, unknown>()
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(k: string, def: T) => (store.has(k) ? (store.get(k) as T) : def),
    setKV: (k: string, v: unknown) => { store.set(k, v) },
  },
}))

import { useClipboard, cleanClipboard, getCleanPolicy, updateCleanPolicy, CLIPBOARD_STORAGE_KEYS } from '../clipboard'

beforeEach(() => {
  store.clear()
})

describe('clipboard · 历史', () => {
  it('新增条目落盘，空白文本被拒绝', () => {
    const clip = useClipboard()
    const id = clip.add('  你好，心流  ')
    expect(id).toBeTruthy()
    expect(clip.items.value).toHaveLength(1)
    expect(clip.items.value[0].text).toBe('你好，心流')
    expect(clip.add('   ')).toBeNull()
    expect(clip.items.value).toHaveLength(1)
  })

  it('重复内容去重：刷新时间不新增条目', () => {
    const clip = useClipboard()
    const a = clip.add('同一段文字')
    const b = clip.add('同一段文字')
    expect(a).toBe(b)
    expect(clip.items.value).toHaveLength(1)
  })

  it('固定条目排在最前', () => {
    const clip = useClipboard()
    const old = clip.add('较早的')!
    clip.add('较晚的')
    clip.togglePin(old)
    expect(clip.items.value[0].id).toBe(old)
    expect(clip.items.value[0].isPinned).toBe(true)
    clip.togglePin(old)
    expect(clip.items.value[0].isPinned).toBe(false)
  })

  it('搜索命中正文与标签，空串返回全部', () => {
    const clip = useClipboard()
    clip.add('邮箱地址 example@x.com', { tags: ['联系方式'] })
    clip.add('一段无关文字')
    expect(clip.search('邮箱')).toHaveLength(1)
    expect(clip.search('联系')).toHaveLength(1)
    expect(clip.search('')).toHaveLength(2)
    expect(clip.search('不存在')).toHaveLength(0)
  })

  it('删除条目', () => {
    const clip = useClipboard()
    const id = clip.add('待删除')!
    clip.remove(id)
    expect(clip.items.value).toHaveLength(0)
  })
})

describe('clipboard · 清理策略', () => {
  it('过期条目被清理，固定条目豁免', () => {
    const clip = useClipboard()
    const expired = clip.add('过期内容')!
    const pinnedOld = clip.add('固定但过期')!
    clip.add('新鲜内容')

    // 手工把时间改到 40 天前
    const list = store.get(CLIPBOARD_STORAGE_KEYS.items) as { id: string; copiedAt: string }[]
    const fortyDaysAgo = new Date(Date.now() - 40 * 86400000).toISOString()
    for (const it of list) {
      if (it.id === expired || it.id === pinnedOld) it.copiedAt = fortyDaysAgo
    }
    store.set(CLIPBOARD_STORAGE_KEYS.items, list)
    clip.togglePin(pinnedOld)

    const removed = cleanClipboard()
    expect(removed).toBe(1)
    const remaining = clip.items.value.map(i => i.id)
    expect(remaining).toContain(pinnedOld)
    expect(remaining).not.toContain(expired)
  })

  it('超出条数上限时保留最新，固定豁免', () => {
    updateCleanPolicy({ maxItems: 10, maxDays: 9999 })
    const clip = useClipboard()
    for (let i = 0; i < 12; i++) clip.add(`条目-${i}`)
    const kept = clip.items.value
    expect(kept.length).toBeLessThanOrEqual(10)
    expect(getCleanPolicy().lastCleanedAt).toBeTruthy()
  })

  it('策略更新带下限钳制', () => {
    const p = updateCleanPolicy({ maxItems: 1, maxDays: 0 })
    expect(p.maxItems).toBe(10)
    expect(p.maxDays).toBe(1)
  })
})

describe('clipboard · 片段库', () => {
  it('剪贴板条目升级为片段', () => {
    const clip = useClipboard()
    const clipId = clip.add('常用模板句')!
    const snipId = clip.promoteToSnippet(clipId, '模板')
    expect(snipId).toBeTruthy()
    expect(clip.snippets.value[0].title).toBe('模板')
    expect(clip.snippets.value[0].content).toBe('常用模板句')
    expect(clip.promoteToSnippet('不存在')).toBeNull()
  })

  it('片段取用累计复用次数，高频优先排序', async () => {
    const clip = useClipboard()
    const a = clip.addSnippet({ title: 'A', content: '内容A' })
    clip.addSnippet({ title: 'B', content: '内容B' })

    // Mock navigator.clipboard（jsdom 中 clipboard 为只读 getter，需 defineProperty）
    const written: string[] = []
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async (t: string) => { written.push(t) } },
      configurable: true,
    })

    expect(await clip.useSnippet(a)).toBe(true)
    expect(await clip.useSnippet(a)).toBe(true)
    expect(written).toEqual(['内容A', '内容A'])
    expect(clip.snippets.value[0].id).toBe(a)
    expect(clip.snippets.value[0].usageCount).toBe(2)
  })

  it('片段更新与删除', () => {
    const clip = useClipboard()
    const id = clip.addSnippet({ title: '旧', content: '旧内容' })
    clip.updateSnippet(id, { title: '新' })
    expect(clip.snippets.value[0].title).toBe('新')
    clip.removeSnippet(id)
    expect(clip.snippets.value).toHaveLength(0)
  })
})
