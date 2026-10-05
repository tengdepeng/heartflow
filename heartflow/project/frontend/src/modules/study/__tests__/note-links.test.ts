// ============================================================
// 思绪书房 · 笔记双向链接测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import type { Note } from '../../../types'
import {
  useNoteLinks,
  parseLinkRefs,
  resolveTargetId,
} from '../note-links'

function makeNote(id: string, title: string, content = ''): Note {
  const now = new Date().toISOString()
  return { id, title, content, tags: [], createdAt: now, updatedAt: now }
}

describe('笔记双向链接', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    useNoteLinks().links.value = []
  })

  it('parseLinkRefs 提取 [[...]] 令牌并去重', () => {
    expect(parseLinkRefs('见 [[note_1]] 与 [[note 2]] 和 [[note_1]]')).toEqual(['note_1', 'note 2'])
  })

  it('parseLinkRefs 无引用时返回空', () => {
    expect(parseLinkRefs('普通文字')).toEqual([])
  })

  it('resolveTargetId 优先精确 id 匹配', () => {
    const notes = [makeNote('abc', '标题A'), makeNote('def', '标题B')]
    expect(resolveTargetId('abc', notes)).toBe('abc')
  })

  it('resolveTargetId 按标题匹配（忽略大小写与空白）', () => {
    const notes = [makeNote('abc', '标题A')]
    expect(resolveTargetId(' 标题a ', notes)).toBe('abc')
  })

  it('resolveTargetId 无匹配返回 null', () => {
    expect(resolveTargetId('不存在', [makeNote('abc', '标题A')])).toBeNull()
  })

  it('syncLinksForNote 由正文 [[id]] 建立出链', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B')]
    syncLinksForNote('a', '参考 [[b]]', notes)
    expect(getOutgoingLinks('a').map(l => l.targetId)).toEqual(['b'])
  })

  it('syncLinksForNote 内容变更后移除失效出链', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '参考 [[b]] 与 [[c]]', notes)
    expect(getOutgoingLinks('a').length).toBe(2)
    syncLinksForNote('a', '只参考 [[b]]', notes)
    expect(getOutgoingLinks('a').map(l => l.targetId)).toEqual(['b'])
  })

  it('syncLinksForNote 支持 [[标题]] 解析', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', '我的笔记')]
    syncLinksForNote('a', '见 [[我的笔记]]', notes)
    expect(getOutgoingLinks('a').map(l => l.targetId)).toEqual(['b'])
  })

  it('getBacklinks 返回反向链接（双链面板核心）', () => {
    const { syncLinksForNote, getBacklinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '[[b]]', notes)
    syncLinksForNote('c', '[[b]]', notes)
    expect(getBacklinks('b').map(l => l.sourceId).sort()).toEqual(['a', 'c'])
  })

  it('removeLinksForNote 清理某笔记的全部链接（出链 + 反向链接）', () => {
    const { syncLinksForNote, getOutgoingLinks, getBacklinks, removeLinksForNote } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '[[b]]', notes) // a → b（a 的出链 / b 的反链）
    syncLinksForNote('c', '[[b]]', notes) // c → b（c 的出链 / b 的反链）
    expect(getOutgoingLinks('a').length).toBe(1)
    expect(getBacklinks('b').length).toBe(2)
    removeLinksForNote('b')
    expect(getOutgoingLinks('a').length).toBe(0)
    expect(getBacklinks('b').length).toBe(0)
  })
})

// ============================================================
// 连链封藏条目聚合（时光胶囊「连链封藏」消费）
// ============================================================
describe('连链封藏条目聚合', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    useNoteLinks().links.value = []
  })

  it('getLinkedItemsForNote 按 self → outgoing → backlink 顺序聚合', () => {
    const { syncLinksForNote, getLinkedItemsForNote } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '见 [[b]]', notes) // a → b（出链）
    syncLinksForNote('c', '[[a]]', notes) // c → a（反链）
    const items = getLinkedItemsForNote('a', notes, { includeBacklinks: true })
    expect(items.map(i => i.id)).toEqual(['a', 'b', 'c'])
    expect(items.map(i => i.relation)).toEqual(['self', 'outgoing', 'backlink'])
  })

  it('getLinkedItemsForNote 默认不含反链', () => {
    const { syncLinksForNote, getLinkedItemsForNote } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '[[b]]', notes)
    syncLinksForNote('c', '[[a]]', notes)
    const items = getLinkedItemsForNote('a', notes)
    expect(items.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('getLinkedItemsForNote 跳过死链（目标不在笔记集中）', () => {
    const { syncLinksForNote, getLinkedItemsForNote } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B')]
    syncLinksForNote('a', '[[b]]', notes)
    // 传入集合缺少 b → b 为死链，跳过
    const items = getLinkedItemsForNote('a', [makeNote('a', 'A')], { includeBacklinks: true })
    expect(items.map(i => i.id)).toEqual(['a'])
  })

  it('getLinkedItemsForNote 双向链接去重且 self 优先', () => {
    const { syncLinksForNote, getLinkedItemsForNote } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B')]
    syncLinksForNote('a', '[[b]]', notes) // a → b
    syncLinksForNote('b', '[[a]]', notes) // b → a
    const items = getLinkedItemsForNote('a', notes, { includeBacklinks: true })
    expect(items.map(i => i.id)).toEqual(['a', 'b'])
    expect(items.find(i => i.id === 'b')?.relation).toBe('outgoing')
  })

  it('getLinkedItemsForNote 标记已归档条目', () => {
    const { syncLinksForNote, getLinkedItemsForNote } = useNoteLinks()
    const archived = { ...makeNote('b', 'B'), archived: true }
    const notes = [makeNote('a', 'A'), archived]
    syncLinksForNote('a', '[[b]]', notes)
    const items = getLinkedItemsForNote('a', notes)
    expect(items.find(i => i.id === 'b')?.archived).toBe(true)
  })
})
