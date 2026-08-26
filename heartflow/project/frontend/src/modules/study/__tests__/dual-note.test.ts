// ============================================================
// 双笔记系统收敛 · 防覆盖回归测试
// study（思绪书房）与 note（便签）共享同一全局笔记引用，
// 验证二者先后写入不会互相丢失对方的笔记。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import { useStudy } from '../index'
import { useNote } from '../../note'
import { resetNotesState } from '../../../engine/storage/notes-state'

describe('双笔记系统收敛（study 与 note 共享全局笔记，互不覆盖）', () => {
  beforeEach(() => {
    const storage = createMockStorage()
    ;(globalThis as any).localStorage = storage
    invalidateCache()
    // 清空共享笔记状态源，确保每次用例从零开始（不依赖模块重加载）
    resetNotesState()
  })

  it('study 新增后 note 新增不会丢失 study 的笔记', () => {
    const study = useStudy()
    const note = useNote()
    const sNote = study.create('思绪标题', '思绪内容', ['a'])
    // note 新增会写入同一全局笔记数组
    note.create('便签标题', '便签内容', ['b'])

    const ids = study.notes.value.map(n => n.id)
    expect(ids).toContain(sNote.id)
  })

  it('note 新增后 study 新增不会丢失 note 的基础笔记', () => {
    const study = useStudy()
    const note = useNote()
    const nSticky = note.create('便签标题', '便签内容', ['b'])
    study.create('思绪标题', '思绪内容', ['a'])

    // note 的基础笔记应仍在全局数组中（被 study 的写入保留）
    const ids = note.allNotes.value.map(n => n.id)
    expect(ids).toContain(nSticky.id)
  })

  it('二者共享同一个笔记引用', () => {
    const study = useStudy()
    const note = useNote()
    const before = study.notes.value.length
    note.create('便签标题', '便签内容', ['b'])
    // study 看到的数组长度应随 note 的写入增长（同一引用）
    expect(study.notes.value.length).toBe(before + 1)
  })
})
