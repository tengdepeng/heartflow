// ============================================================
// 间隔重复 · 创建即入复习（入口发现性）
// 验证三条笔记创建路径（useNote.create / useStudy.create /
// useStudy.quickCapture）均自动为笔记建立 Ebbinghaus 年轮，
// 使笔记在创建次日自然进入待复习队列，无需用户手填 ID。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Note } from '../../../types'

const mockData = vi.hoisted(() => {
  const notes: Note[] = []
  const kvStore: Record<string, any> = {}
  const config = { display: { searchResultLimit: 20, statsWindowDays: 7 } }
  return { notes, kvStore, config }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getNotes: vi.fn(() => [...mockData.notes]),
    setNotes: vi.fn((notes: Note[]) => {
      mockData.notes.length = 0
      mockData.notes.push(...notes)
    }),
    getKV: vi.fn((key: string, defaultValue: any) => {
      const val = mockData.kvStore[key]
      return val !== undefined ? val : defaultValue
    }),
    setKV: vi.fn((key: string, value: any) => {
      mockData.kvStore[key] = value
    }),
    getConfig: vi.fn(() => mockData.config),
  },
}))

import { resetNotesState } from '../../../engine/storage/notes-state'

// 动态 import：与 beforeEach 的 vi.resetModules 配合，保证每条用例模块级单例全新
async function createNoteApi() {
  const mod = await import('../index')
  return mod.useNote()
}
async function createStudyApi() {
  const mod = await import('../../study')
  return mod.useStudy()
}

describe('间隔重复 · 创建即入复习', () => {
  beforeEach(() => {
    mockData.notes.length = 0
    mockData.kvStore = {}
    resetNotesState()
    vi.resetModules()
  })

  it('useNote().create 自动为便签建年轮', async () => {
    const api = await createNoteApi()
    const sticky = api.create('便签A', '内容A')
    expect(api.knowledgeRings.value).toHaveLength(1)
    expect(api.knowledgeRings.value[0].noteId).toBe(sticky.id)
    // 新建年轮 nextReviewAt=now+1d，今天不进待复习队列（明天才自然触发）
    expect(api.dueRings.value).toHaveLength(0)
  })

  it('useStudy().create 自动为思绪笔记建年轮', async () => {
    const api = await createNoteApi()
    const study = await createStudyApi()
    const note = study.create('思绪A', '内容A')
    // 两条路径共享同一 knowledgeRings 单例
    expect(api.knowledgeRings.value).toHaveLength(1)
    expect(api.knowledgeRings.value[0].noteId).toBe(note.id)
  })

  it('useStudy().quickCapture 自动为速记建年轮', async () => {
    const api = await createNoteApi()
    const study = await createStudyApi()
    const note = study.quickCapture('速记一条 #灵感')
    expect(note).not.toBeNull()
    expect(api.knowledgeRings.value).toHaveLength(1)
    expect(api.knowledgeRings.value[0].noteId).toBe(note!.id)
  })

  it('initRing 幂等：重复纳入不产生重复年轮', async () => {
    const api = await createNoteApi()
    const sticky = api.create('便签B', '内容B')
    api.initRing(sticky.id)
    expect(api.knowledgeRings.value).toHaveLength(1)
  })

  it('多条创建各自独立建年轮（不互相覆盖）', async () => {
    const api = await createNoteApi()
    const study = await createStudyApi()
    const a = api.create('便签1', '内容')
    const b = study.create('思绪1', '内容')
    expect(api.knowledgeRings.value.map(r => r.noteId).sort()).toEqual([a.id, b.id].sort())
  })
})
