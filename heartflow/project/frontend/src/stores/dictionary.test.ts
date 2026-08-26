// ============================================================
// 殿堂辞典 · Store 测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// 模拟 storage
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import { useDictionaryStore } from './dictionary'

describe('dictionary store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('初始状态词条列表为空', () => {
    const store = useDictionaryStore()
    expect(store.entries).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.categories).toEqual([])
  })

  it('addEntry 添加新词条', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '完全沉浸的状态', '心理')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].word).toBe('心流')
    expect(store.entries[0].definition).toBe('完全沉浸的状态')
    expect(store.entries[0].category).toBe('心理')
    expect(store.entries[0].status).toBe('active')
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('addEntry 带标签', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理', ['专注', '工作'])
    expect(store.entries[0].tags).toEqual(['专注', '工作'])
  })

  it('categories 自动聚合分类', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    store.addEntry('冥想', '练习', '心理')
    store.addEntry('Vue', '框架', '技术')
    expect(store.categories).toEqual(['心理', '技术'])
    expect(store.categoryCount).toBe(2)
  })

  it('updateEntry 更新词条', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    const id = store.entries[0].id
    store.updateEntry(id, { word: '心流状态', definition: '更新后的释义' })
    expect(store.entries[0].word).toBe('心流状态')
    expect(store.entries[0].definition).toBe('更新后的释义')
    expect(store.entries[0].updatedAt).toBeTruthy()
  })

  it('deleteEntry 删除词条', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    store.addEntry('冥想', '练习', '心理')
    const id = store.entries[0].id
    store.deleteEntry(id)
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0].word).toBe('冥想')
  })

  it('archiveEntry 归档词条', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    const id = store.entries[0].id
    store.archiveEntry(id)
    expect(store.entries[0].status).toBe('archived')
    expect(store.activeEntries).toHaveLength(0)
    expect(store.archivedEntries).toHaveLength(1)
  })

  it('unarchiveEntry 取消归档', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    const id = store.entries[0].id
    store.archiveEntry(id)
    store.unarchiveEntry(id)
    expect(store.entries[0].status).toBe('active')
  })

  it('filterEntries 搜索过滤', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', 'Flow', '心理')
    store.addEntry('冥想', 'Meditation', '')
    store.addEntry('Vue', 'Framework', '技术')
    const result = store.filterEntries('flow')
    expect(result).toHaveLength(1)
    expect(result[0].word).toBe('心流')
  })

  it('filterEntries 分类过滤', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', 'Flow', '心理')
    store.addEntry('Vue', 'Framework', '技术')
    const result = store.filterEntries(undefined, '技术')
    expect(result).toHaveLength(1)
    expect(result[0].word).toBe('Vue')
  })

  it('filterEntries 拼音排序', () => {
    const store = useDictionaryStore()
    store.addEntry('B词条', 'x', '')
    store.addEntry('A词条', 'x', '')
    const result = store.filterEntries()
    expect(result[0].word).toBe('A词条')
    expect(result[1].word).toBe('B词条')
  })

  it('exportDict 导出为 JSON', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    const json = store.exportDict()
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].word).toBe('心流')
  })

  it('importDict 导入词条，按 word 去重', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态', '心理')
    const imported = JSON.stringify([
      { id: 'x', word: '心流', definition: '已存在', category: '', createdAt: '' },
      { id: 'y', word: '冥想', definition: '新词条', category: '', createdAt: '' },
    ])
    const result = store.importDict(imported)
    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(store.entries).toHaveLength(2)
  })

  it('importDict 非法格式抛出异常', () => {
    const store = useDictionaryStore()
    expect(() => store.importDict('not json')).toThrow()
  })

  it('latestWord 返回最新词条', () => {
    const store = useDictionaryStore()
    expect(store.latestWord).toBe('暂无')
    store.addEntry('心流', '状态')
    expect(store.latestWord).toBe('心流')
  })

  it('linkNote 关联笔记', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态')
    const id = store.entries[0].id
    store.linkNote(id, 'note_1')
    expect(store.entries[0].relatedNoteIds).toEqual(['note_1'])
  })

  it('unlinkNote 取消关联笔记', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态')
    const id = store.entries[0].id
    store.linkNote(id, 'note_1')
    store.unlinkNote(id, 'note_1')
    expect(store.entries[0].relatedNoteIds).toEqual([])
  })

  it('linkRoom 关联房间', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态')
    const id = store.entries[0].id
    store.linkRoom(id, 'study')
    expect(store.entries[0].relatedRoomIds).toEqual(['study'])
  })

  it('getEntry 获取单个词条', () => {
    const store = useDictionaryStore()
    store.addEntry('心流', '状态')
    const id = store.entries[0].id
    const entry = store.getEntry(id)
    expect(entry?.word).toBe('心流')
  })

  it('getEntry 不存在的 ID 返回 undefined', () => {
    const store = useDictionaryStore()
    expect(store.getEntry('nonexistent')).toBeUndefined()
  })
})