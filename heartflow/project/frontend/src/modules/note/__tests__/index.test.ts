// ============================================================
// note 模块测试
// 模块级 composable 测试，使用 vi.mock 模拟 storage 模块
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { Note } from '../../../types'
import { resetNotesState } from '../../../engine/storage/notes-state'

// ---- 共享 mock 数据（vi.hoisted 确保在 vi.mock 之前执行） ----
// mockData 必须从 vi.hoisted 返回，vi.mock 通过闭包捕获它
const mockData = vi.hoisted(() => {
  const notes: Note[] = []
  const kvStore: Record<string, any> = {}
  const config = {
    display: {
      searchResultLimit: 20,
      statsWindowDays: 7,
    },
  }
  return { notes, kvStore, config }
})

// ---- Mock storage 模块 ----
// 注意：路径从测试文件（src/modules/note/__tests__/）到 src/engine/storage
// 需要 ../../../engine/storage
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

// ---- 辅助函数：在每个测试中获取全新的 useNote 实例 ----
async function createApi() {
  const mod = await import('../index')
  const api = mod.useNote()
  return api
}

describe('note 模块', () => {
  beforeEach(() => {
    // 重置 mock 数据
    mockData.notes.length = 0
    mockData.kvStore = {}
    // 清空共享笔记状态源（双笔记收敛后 notes-state 为模块级单例，
    // 在 vi.resetModules 复用同一实例，这里强制归零以防跨用例污染）
    resetNotesState()
    // 清除模块缓存，使下次 import 获得全新模块实例（状态隔离）
    vi.resetModules()
  })

  // ==================================================================
  // 基础 CRUD
  // ==================================================================

  it('create - 创建笔记并自动生成便签', async () => {
    const api = await createApi()
    const sticky = api.create('测试笔记', '测试内容', ['tag1'])

    // 验证基础字段
    expect(sticky).toBeDefined()
    expect(sticky.id).toBeTruthy()
    expect(sticky.title).toBe('测试笔记')
    expect(sticky.content).toBe('测试内容')
    expect(sticky.tags).toEqual(['tag1'])
    expect(sticky.createdAt).toBeTruthy()
    expect(sticky.updatedAt).toBeTruthy()

    // 验证便签特有字段
    expect(sticky.stickyX).toBeGreaterThanOrEqual(0)
    expect(sticky.stickyY).toBeGreaterThanOrEqual(0)
    expect(sticky.displayMode).toBe('sticky')
    expect(sticky.color).toBeTruthy()
    expect(sticky.pinned).toBe(false)

    // 验证持久化到 storage.getNotes/setNotes
    expect(mockData.notes).toHaveLength(1)
    expect(mockData.notes[0].title).toBe('测试笔记')
    expect(mockData.notes[0].content).toBe('测试内容')
    expect(mockData.notes[0].tags).toEqual(['tag1'])

    // 验证便签状态持久化到 storage.getKV/setKV
    const savedSticky = mockData.kvStore['hf:note_sticky_state']
    expect(savedSticky).toHaveLength(1)
    expect(savedSticky[0].id).toBe(sticky.id)
    expect(savedSticky[0].displayMode).toBe('sticky')
  })

  it('create - 便签颜色循环分配', async () => {
    const api = await createApi()
    const sticky1 = api.create('笔记1', '内容1')
    const sticky2 = api.create('笔记2', '内容2')
    const sticky3 = api.create('笔记3', '内容3')

    // 颜色应不同（循环分配 STICKY_COLORS）
    expect(sticky1.color).toBeTruthy()
    expect(sticky2.color).toBeTruthy()
    expect(sticky3.color).toBeTruthy()
    // 至少前两个颜色不同（除非颜色池只有1种）
    expect(sticky1.color).not.toBe(sticky2.color)
  })

  it('allNotes - 返回所有未删除笔记', async () => {
    const api = await createApi()
    api.create('笔记A', '内容A')
    api.create('笔记B', '内容B')

    expect(api.allNotes.value).toHaveLength(2)
    expect(api.allNotes.value.map(n => n.title)).toEqual(['笔记A', '笔记B'])
  })

  it('update - 更新标题和内容', async () => {
    const api = await createApi()
    const sticky = api.create('旧标题', '旧内容')
    const id = sticky.id

    api.update(id, { title: '新标题', content: '新内容' })

    // 验证笔记更新
    const updated = api.getNoteById(id)
    expect(updated?.title).toBe('新标题')
    expect(updated?.content).toBe('新内容')

    // 验证便签同步更新
    const updatedSticky = api.getStickyById(id)
    expect(updatedSticky?.title).toBe('新标题')
    expect(updatedSticky?.content).toBe('新内容')

    // 验证持久化
    expect(mockData.notes[0].title).toBe('新标题')
  })

  it('update - 更新标签', async () => {
    const api = await createApi()
    const sticky = api.create('标签笔记', '内容', ['old'])

    api.update(sticky.id, { tags: ['new', 'updated'] })

    const updated = api.getNoteById(sticky.id)
    expect(updated?.tags).toEqual(['new', 'updated'])

    // 验证便签标签同步
    const updatedSticky = api.getStickyById(sticky.id)
    expect(updatedSticky?.tags).toEqual(['new', 'updated'])
  })

  it('update - 归档笔记', async () => {
    const api = await createApi()
    const sticky = api.create('归档笔记', '内容')

    api.update(sticky.id, { archived: true })

    const updated = api.getNoteById(sticky.id)
    expect(updated?.archived).toBe(true)
    expect(api.archivedNotes.value).toHaveLength(1)
  })

  it('softRemove - 软删除笔记', async () => {
    const api = await createApi()
    api.create('待删除', '内容')
    expect(api.allNotes.value).toHaveLength(1)

    const note = api.allNotes.value[0]
    api.remove(note.id)

    // 从 allNotes 中消失
    expect(api.allNotes.value).toHaveLength(0)
    // 出现在回收站
    expect(api.deletedNotes.value).toHaveLength(1)
    expect(api.deletedNotes.value[0].deletedAt).toBeTruthy()
    expect(api.deletedNotes.value[0].id).toBe(note.id)

    // 验证便签状态被移除
    expect(api.allStickyNotes.value).toHaveLength(0)
    expect(mockData.kvStore['hf:note_sticky_state']).toHaveLength(0)
  })

  it('restore - 从回收站恢复', async () => {
    const api = await createApi()
    api.create('恢复笔记', '内容')
    const note = api.allNotes.value[0]
    api.remove(note.id)
    expect(api.deletedNotes.value).toHaveLength(1)

    api.restore(note.id)

    expect(api.deletedNotes.value).toHaveLength(0)
    expect(api.allNotes.value).toHaveLength(1)
    expect(api.allNotes.value[0].deletedAt).toBeUndefined()
  })

  it('hardRemove - 永久删除', async () => {
    const api = await createApi()
    api.create('永久删除', '内容')
    api.create('保留', '内容')
    const note = api.allNotes.value.find(n => n.title === '永久删除')!

    api.hardRemove(note.id)

    expect(api.allNotes.value).toHaveLength(1)
    expect(api.allNotes.value[0].title).toBe('保留')
    // 存储中也被移除
    expect(mockData.notes).toHaveLength(1)
    expect(mockData.notes[0].title).toBe('保留')
    // 便签状态也被移除
    expect(mockData.kvStore['hf:note_sticky_state']).toHaveLength(1)
    expect(mockData.kvStore['hf:note_sticky_state'][0].id).not.toBe(note.id)
  })

  it('clearTrash - 清空回收站', async () => {
    const api = await createApi()
    api.create('笔记1', '内容')
    api.create('笔记2', '内容')
    api.create('笔记3', '内容') // 保留
    const note1 = api.allNotes.value[0]
    const note2 = api.allNotes.value[1]
    api.remove(note1.id)
    api.remove(note2.id)
    expect(api.deletedNotes.value).toHaveLength(2)
    expect(api.allNotes.value).toHaveLength(1)

    api.clearTrash()

    expect(api.deletedNotes.value).toHaveLength(0)
    expect(api.allNotes.value).toHaveLength(1)
    expect(api.allNotes.value[0].title).toBe('笔记3')
    expect(mockData.notes).toHaveLength(1)
    expect(mockData.notes[0].title).toBe('笔记3')
    // 回收站笔记的便签状态也被清除
    expect(mockData.kvStore['hf:note_sticky_state']).toHaveLength(1)
  })

  // ==================================================================
  // 搜索与筛选
  // ==================================================================

  it('searchNotes - 按标题搜索', async () => {
    const api = await createApi()
    api.create('机器学习入门', '内容')
    api.create('前端开发', '内容')
    api.create('深度学习', '内容')

    const results = api.searchNotes('学习')
    expect(results).toHaveLength(2)
    expect(results.map(r => r.title)).toEqual(expect.arrayContaining(['机器学习入门', '深度学习']))
  })

  it('searchNotes - 按内容搜索', async () => {
    const api = await createApi()
    api.create('标题A', '这是一段关于 Vue 的内容')
    api.create('标题B', '这是一段关于 React 的内容')

    const results = api.searchNotes('Vue')
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('标题A')
  })

  it('searchNotes - 搜索不区分大小写', async () => {
    const api = await createApi()
    api.create('TypeScript Guide', 'Learning typescript')

    const results = api.searchNotes('typescript')
    expect(results).toHaveLength(1)

    const resultsUpper = api.searchNotes('TYPESCRIPT')
    expect(resultsUpper).toHaveLength(1)
  })

  it('searchNotes - 空查询返回所有未删除笔记', async () => {
    const api = await createApi()
    for (let i = 0; i < 5; i++) {
      api.create(`笔记${i}`, `内容${i}`)
    }

    const results = api.searchNotes('')
    expect(results).toHaveLength(5)

    // 软删除的笔记不应出现在搜索结果中
    const note = api.allNotes.value[0]
    api.remove(note.id)
    const resultsAfterDelete = api.searchNotes('')
    expect(resultsAfterDelete).toHaveLength(4)
  })

  it('getNotesByTag - 按标签筛选', async () => {
    const api = await createApi()
    api.create('工作笔记', '内容', ['work', 'important'])
    api.create('个人笔记', '内容', ['personal'])
    api.create('项目笔记', '内容', ['work'])

    const workNotes = api.getNotesByTag('work')
    expect(workNotes).toHaveLength(2)
    expect(workNotes.map(n => n.title)).toEqual(expect.arrayContaining(['工作笔记', '项目笔记']))

    const personalNotes = api.getNotesByTag('personal')
    expect(personalNotes).toHaveLength(1)
    expect(personalNotes[0].title).toBe('个人笔记')
  })

  // ==================================================================
  // 统计与分组
  // ==================================================================

  it('noteCount - 统计未删除笔记数量', async () => {
    const api = await createApi()
    expect(api.noteCount.value).toBe(0)

    api.create('笔记A', '内容')
    api.create('笔记B', '内容')
    expect(api.noteCount.value).toBe(2)

    const note = api.allNotes.value[0]
    api.remove(note.id)
    expect(api.noteCount.value).toBe(1) // 软删除不计入
  })

  it('archivedNotes - 归档笔记列表', async () => {
    const api = await createApi()
    api.create('活跃笔记', '内容')
    api.create('归档笔记', '内容')
    const note = api.allNotes.value.find(n => n.title === '归档笔记')!
    api.update(note.id, { archived: true })

    expect(api.archivedNotes.value).toHaveLength(1)
    expect(api.archivedNotes.value[0].title).toBe('归档笔记')
    expect(api.archivedNotes.value[0].archived).toBe(true)
    expect(api.archivedNotes.value[0].deletedAt).toBeFalsy()
  })

  it('archivedNotes - 归档笔记被软删除后不应出现', async () => {
    const api = await createApi()
    api.create('归档笔记', '内容')
    const note = api.allNotes.value[0]
    api.update(note.id, { archived: true })
    expect(api.archivedNotes.value).toHaveLength(1)

    api.remove(note.id)
    expect(api.archivedNotes.value).toHaveLength(0) // 软删除后不再出现在归档中
    expect(api.deletedNotes.value).toHaveLength(1) // 出现在回收站
  })

  it('deletedNotes - 回收站列表', async () => {
    const api = await createApi()
    api.create('正常笔记', '内容')
    api.create('删除笔记', '内容')
    const note = api.allNotes.value.find(n => n.title === '删除笔记')!
    api.remove(note.id)

    expect(api.deletedNotes.value).toHaveLength(1)
    expect(api.deletedNotes.value[0].title).toBe('删除笔记')
    expect(api.deletedNotes.value[0].deletedAt).toBeTruthy()
  })

  // ==================================================================
  // 便签状态管理
  // ==================================================================

  it('updateStickyPosition - 更新便签位置', async () => {
    const api = await createApi()
    const sticky = api.create('位置笔记', '内容')

    api.updateStickyPosition(sticky.id, 50, 75)
    const updated = api.getStickyById(sticky.id)
    expect(updated?.stickyX).toBe(50)
    expect(updated?.stickyY).toBe(75)

    // 验证持久化
    const saved = mockData.kvStore['hf:note_sticky_state']
    expect(saved).toHaveLength(1)
    expect(saved[0].stickyX).toBe(50)
    expect(saved[0].stickyY).toBe(75)
  })

  it('updateStickyPosition - 位置限制在 0-100 范围', async () => {
    const api = await createApi()
    const sticky = api.create('边界笔记', '内容')

    api.updateStickyPosition(sticky.id, -10, 150)
    const updated = api.getStickyById(sticky.id)
    expect(updated?.stickyX).toBe(0) // clamp 到 0
    expect(updated?.stickyY).toBe(100) // clamp 到 100
  })

  it('togglePin - 切换便签置顶状态', async () => {
    const api = await createApi()
    const sticky = api.create('置顶笔记', '内容')
    expect(sticky.pinned).toBe(false)

    api.togglePin(sticky.id)
    expect(api.getStickyById(sticky.id)?.pinned).toBe(true)

    api.togglePin(sticky.id)
    expect(api.getStickyById(sticky.id)?.pinned).toBe(false)

    // 验证持久化
    const saved = mockData.kvStore['hf:note_sticky_state']
    expect(saved).toHaveLength(1)
    expect(saved[0].pinned).toBe(false)
  })

  it('updateStickyColor - 更新便签颜色', async () => {
    const api = await createApi()
    const sticky = api.create('颜色笔记', '内容')
    const originalColor = sticky.color

    api.updateStickyColor(sticky.id, 'ff0000')
    const updated = api.getStickyById(sticky.id)
    expect(updated?.color).toBe('ff0000')
    expect(updated?.color).not.toBe(originalColor)

    // 验证持久化
    const saved = mockData.kvStore['hf:note_sticky_state']
    expect(saved).toHaveLength(1)
    expect(saved[0].color).toBe('ff0000')
  })

  it('updateStickyMode - 更新显示模式', async () => {
    const api = await createApi()
    const sticky = api.create('模式笔记', '内容')
    expect(sticky.displayMode).toBe('sticky')

    api.updateStickyMode(sticky.id, 'minimized')
    expect(api.getStickyById(sticky.id)?.displayMode).toBe('minimized')

    api.updateStickyMode(sticky.id, 'board')
    expect(api.getStickyById(sticky.id)?.displayMode).toBe('board')

    // 验证持久化
    const saved = mockData.kvStore['hf:note_sticky_state']
    expect(saved).toHaveLength(1)
    expect(saved[0].displayMode).toBe('board')
  })

  it('allStickyNotes - 置顶便签排在前面', async () => {
    const api = await createApi()
    api.create('便签A', '内容')
    const s2 = api.create('便签B', '内容')
    api.create('便签C', '内容')

    // 置顶中间那个
    api.togglePin(s2.id)

    const allSticky = api.allStickyNotes.value
    expect(allSticky[0].id).toBe(s2.id) // 置顶的排第一
    expect(allSticky[0].pinned).toBe(true)
    expect(allSticky[1].pinned).toBe(false)
    expect(allSticky[2].pinned).toBe(false)
  })

  it('allStickyNotes - board 模式不显示在浮动便签中', async () => {
    const api = await createApi()
    api.create('便签A', '内容')
    api.create('便签B', '内容')
    const s2 = api.allStickyNotes.value.find(s => s.title === '便签B')!

    // 将便签B 切换到 board 模式
    api.updateStickyMode(s2.id, 'board')

    const allSticky = api.allStickyNotes.value
    expect(allSticky).toHaveLength(1)
    expect(allSticky[0].title).toBe('便签A')
  })

  it('getNoteById - 根据 ID 查询笔记', async () => {
    const api = await createApi()
    const sticky = api.create('查询笔记', '内容')

    const found = api.getNoteById(sticky.id)
    expect(found).toBeDefined()
    expect(found!.title).toBe('查询笔记')

    const notFound = api.getNoteById('non_existent_id')
    expect(notFound).toBeUndefined()
  })

  it('getStickyById - 根据 ID 查询便签', async () => {
    const api = await createApi()
    const sticky = api.create('查询便签', '内容')

    const found = api.getStickyById(sticky.id)
    expect(found).toBeDefined()
    expect(found!.title).toBe('查询便签')
    expect(found!.displayMode).toBe('sticky')

    const notFound = api.getStickyById('non_existent_id')
    expect(notFound).toBeUndefined()
  })
})