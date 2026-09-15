// ============================================================
// 便签/画布/幕僚阁路径 · 双链同步接线测试
// 验证 note 模块的 create/update/remove(hardRemove) 会同步维护 hf:note_links，
// 让反向链接面板在「非思绪书房」路径下也正确（此前该路径不同步，留失效链接）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { useNote } from '../index'
import { useNoteLinks } from '../../study/note-links'
import { resetNotesState } from '../../../engine/storage/notes-state'

describe('note 模块双链接线（便签/画布/幕僚阁路径）', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    resetNotesState()
    useNoteLinks().links.value = []
  })

  it('create 带 [[id]] 正文会建立出链与反向链接', () => {
    const store = useNote()
    const target = store.create('目标笔记', '正文')
    const source = store.create('来源笔记', `参考 [[${target.id}]]`)
    const { getOutgoingLinks, getBacklinks } = useNoteLinks()
    expect(getOutgoingLinks(source.id).map(l => l.targetId)).toEqual([target.id])
    expect(getBacklinks(target.id).map(l => l.sourceId)).toEqual([source.id])
  })

  it('update 正文改链后同步出链（旧链移除、新链建立）', () => {
    const store = useNote()
    const b = store.create('B', '正文')
    const c = store.create('C', '正文')
    const a = store.create('A', `旧 [[${b.id}]]`)
    expect(useNoteLinks().getOutgoingLinks(a.id).length).toBe(1)
    store.update(a.id, { content: `改 [[${c.id}]]` })
    expect(useNoteLinks().getOutgoingLinks(a.id).map(l => l.targetId)).toEqual([c.id])
  })

  it('hardRemove 清除该笔记全部链接（出链 + 反向链接）', () => {
    const store = useNote()
    const b = store.create('B', '正文')
    const a = store.create('A', `[[${b.id}]]`)
    expect(useNoteLinks().getBacklinks(b.id).length).toBe(1)
    store.hardRemove(a.id)
    expect(useNoteLinks().getOutgoingLinks(a.id).length).toBe(0)
    expect(useNoteLinks().getBacklinks(b.id).length).toBe(0)
  })

  it('remove（软删）也清除链接，与 study 路径行为一致', () => {
    const store = useNote()
    const b = store.create('B', '正文')
    const a = store.create('A', `[[${b.id}]]`)
    store.remove(a.id)
    expect(useNoteLinks().getOutgoingLinks(a.id).length).toBe(0)
    expect(useNoteLinks().getBacklinks(b.id).length).toBe(0)
  })
})
