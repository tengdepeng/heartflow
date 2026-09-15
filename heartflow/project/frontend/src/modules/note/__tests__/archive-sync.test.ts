// ============================================================
// 便签/画布/幕僚阁路径 · 归档接线测试
// 验证 useNote().archive/unarchive 正确置/清 archived 且 archivedNotes 反映，
// 且归档不影响双链（链接表保留，与 study.archive 语义一致）。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { useNote } from '../index'
import { useNoteLinks } from '../../study/note-links'
import { resetNotesState } from '../../../engine/storage/notes-state'

describe('note 模块归档接线（便签/画布/幕僚阁路径）', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
    resetNotesState()
    useNoteLinks().links.value = []
  })

  it('archive 将笔记标记为已归档，archivedNotes 反映', () => {
    const store = useNote()
    const n = store.create('A', '正文')
    expect(store.archivedNotes.value.find(x => x.id === n.id)).toBeFalsy()
    store.archive(n.id)
    expect(store.archivedNotes.value.find(x => x.id === n.id)).toBeTruthy()
  })

  it('unarchive 取消归档，archivedNotes 不再包含', () => {
    const store = useNote()
    const n = store.create('A', '正文')
    store.archive(n.id)
    expect(store.archivedNotes.value.find(x => x.id === n.id)).toBeTruthy()
    store.unarchive(n.id)
    expect(store.archivedNotes.value.find(x => x.id === n.id)).toBeFalsy()
  })

  it('archive 不影响双链（链接表保留，与 study 语义一致）', () => {
    const store = useNote()
    const b = store.create('B', '正文')
    const a = store.create('A', `[[${b.id}]]`)
    expect(useNoteLinks().getOutgoingLinks(a.id).length).toBe(1)
    store.archive(a.id)
    expect(useNoteLinks().getOutgoingLinks(a.id).length).toBe(1)
    expect(useNoteLinks().getBacklinks(b.id).length).toBe(1)
  })
})
