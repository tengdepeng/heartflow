// ============================================================
// 思绪书房模块 · 测试
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('study 模块', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  async function fresh() {
    const mod = await import('../index')
    const api = mod.useStudy()
    api.load()
    return api
  }

  it('导出 useStudy 函数', async () => {
    const mod = await import('../index')
    expect(typeof mod.useStudy).toBe('function')
  })

  it('useStudy 返回预期 API', async () => {
    const api = await fresh()
    expect(api.notes).toBeDefined()
    expect(api.allTags).toBeDefined()
    expect(typeof api.create).toBe('function')
    expect(typeof api.update).toBe('function')
    expect(typeof api.remove).toBe('function')
    expect(typeof api.byTag).toBe('function')
  })

  it('create 创建笔记', async () => {
    const api = await fresh()
    const note = api.create('测试笔记', '这是内容', ['tag1'])
    expect(note.title).toBe('测试笔记')
    expect(note.content).toBe('这是内容')
    expect(note.tags).toEqual(['tag1'])
    expect(note.id).toBeTruthy()
  })

  it('create 多条笔记', async () => {
    const api = await fresh()
    api.create('笔记1', '内容1')
    api.create('笔记2', '内容2')
    expect(api.notes.value).toHaveLength(2)
  })

  it('update 更新笔记', async () => {
    const api = await fresh()
    const note = api.create('原标题', '原内容')
    api.update(note.id, { title: '新标题', content: '新内容' })
    const updated = api.notes.value.find(n => n.id === note.id)
    expect(updated?.title).toBe('新标题')
    expect(updated?.content).toBe('新内容')
  })

  it('remove 删除笔记', async () => {
    const api = await fresh()
    const note = api.create('待删除', '内容')
    api.remove(note.id)
    expect(api.notes.value).toHaveLength(0)
  })

  it('allTags 收集所有标签', async () => {
    const api = await fresh()
    api.create('笔记1', '内容', ['tag1', 'tag2'])
    api.create('笔记2', '内容', ['tag2', 'tag3'])
    expect(api.allTags.value).toEqual(['tag1', 'tag2', 'tag3'])
  })

  it('byTag 按标签筛选', async () => {
    const api = await fresh()
    api.create('笔记1', '内容', ['tag1'])
    api.create('笔记2', '内容', ['tag2'])
    api.create('笔记3', '内容', ['tag1', 'tag2'])
    const result = api.byTag('tag1')
    expect(result).toHaveLength(2)
    expect(result.map((r: any) => r.title).sort()).toEqual(['笔记1', '笔记3'])
  })

  it('archive 标记笔记为已归档', async () => {
    const api = await fresh()
    const note = api.create('待归档', '内容')
    api.archive(note.id)
    const found = api.notes.value.find((n: any) => n.id === note.id)
    expect(found?.archived).toBe(true)
  })

  it('unarchive 取消归档', async () => {
    const api = await fresh()
    const note = api.create('待归档', '内容')
    api.archive(note.id)
    api.unarchive(note.id)
    const found = api.notes.value.find((n: any) => n.id === note.id)
    expect(found?.archived).toBe(false)
  })

  it('archive 对不存在的 id 安全无操作', async () => {
    const api = await fresh()
    expect(() => api.archive('nope')).not.toThrow()
    expect(() => api.unarchive('nope')).not.toThrow()
  })

  it('create 支持 isAtomic 标记原子笔记', async () => {
    const api = await fresh()
    const note = api.create('原子笔记', '一个想法', [], true)
    expect(note.isAtomic).toBe(true)
    const found = api.notes.value.find((n: any) => n.id === note.id)
    expect(found?.isAtomic).toBe(true)
  })

  it('create 默认非原子', async () => {
    const api = await fresh()
    const note = api.create('普通笔记', '内容')
    expect(note.isAtomic).toBeFalsy()
  })

  it('update 可切换 isAtomic', async () => {
    const api = await fresh()
    const note = api.create('笔记', '内容')
    api.update(note.id, { isAtomic: true })
    const found = api.notes.value.find((n: any) => n.id === note.id)
    expect(found?.isAtomic).toBe(true)
  })
})