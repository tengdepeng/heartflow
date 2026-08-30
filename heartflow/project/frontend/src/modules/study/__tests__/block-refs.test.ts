// ============================================================
// 块级引用（[[笔记#块锚点]]）测试
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import type { Note } from '../../../types'
import {
  useNoteLinks,
  parseLinkRefs,
  splitBlockRef,
  resolveTargetId,
  getBlockContent,
} from '../note-links'

function makeNote(id: string, title: string, content = ''): Note {
  const now = new Date().toISOString()
  return { id, title, content, tags: [], createdAt: now, updatedAt: now }
}

describe('块级引用', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    useNoteLinks().links.value = []
  })

  it('splitBlockRef 拆分目标与块锚点', () => {
    expect(splitBlockRef('我的笔记#abc123')).toEqual({ ref: '我的笔记', blockId: 'abc123' })
    expect(splitBlockRef('note_1')).toEqual({ ref: 'note_1' })
    expect(splitBlockRef(' 标题a # b1 ')).toEqual({ ref: '标题a', blockId: 'b1' })
  })

  it('parseLinkRefs 保留 # 块锚点令牌', () => {
    expect(parseLinkRefs('见 [[b#x1]] 与 [[b#x2]]')).toEqual(['b#x1', 'b#x2'])
  })

  it('resolveTargetId 忽略 # 块锚点部分，仍按标题解析', () => {
    const notes = [makeNote('b', '我的笔记')]
    expect(resolveTargetId('我的笔记#abc', notes)).toBe('b')
  })

  it('syncLinksForNote 记录块级出链（携带 blockId）', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B')]
    syncLinksForNote('a', '参考 [[b#blk1]]', notes)
    const out = getOutgoingLinks('a')
    expect(out).toHaveLength(1)
    expect(out[0].targetId).toBe('b')
    expect(out[0].blockId).toBe('blk1')
  })

  it('块级出链与整篇出链视为不同链接（可并存）', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B')]
    syncLinksForNote('a', '[[b]] 与 [[b#blk1]]', notes)
    const out = getOutgoingLinks('a')
    expect(out).toHaveLength(2)
    expect(out.some(l => !l.blockId)).toBe(true)
    expect(out.some(l => l.blockId === 'blk1')).toBe(true)
  })

  it('内容变更后移除失效块级出链', () => {
    const { syncLinksForNote, getOutgoingLinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '[[b#blk1]] 与 [[c#blk2]]', notes)
    expect(getOutgoingLinks('a')).toHaveLength(2)
    syncLinksForNote('a', '只保留 [[b#blk1]]', notes)
    const out = getOutgoingLinks('a')
    expect(out).toHaveLength(1)
    expect(out[0].blockId).toBe('blk1')
  })

  it('getBacklinks 返回携带 blockId 的反向链接', () => {
    const { syncLinksForNote, getBacklinks } = useNoteLinks()
    const notes = [makeNote('a', 'A'), makeNote('b', 'B'), makeNote('c', 'C')]
    syncLinksForNote('a', '[[b#blk1]]', notes)
    syncLinksForNote('c', '[[b#blk2]]', notes)
    const bl = getBacklinks('b')
    expect(bl).toHaveLength(2)
    expect(bl.map(l => l.blockId).sort()).toEqual(['blk1', 'blk2'])
  })

  it('getBlockContent 从段落提取块文本（去锚点）', () => {
    const content = '第一段\n\n这是要点段落 ^blk1\n\n第三段'
    expect(getBlockContent(content, 'blk1')).toBe('这是要点段落')
  })

  it('getBlockContent 单行回退', () => {
    const content = '行一\n行二带锚点 ^blk2\n行三'
    expect(getBlockContent(content, 'blk2')).toBe('行二带锚点')
  })

  it('getBlockContent 片段缺失返回 null', () => {
    expect(getBlockContent('无锚点内容', 'nope')).toBeNull()
  })
})
