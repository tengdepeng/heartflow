import { describe, expect, it, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

describe('study 快速记录（P0-2）', () => {
  beforeEach(async () => {
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()
  })

  it('extractTags 抽取并去重 #标签', async () => {
    const { extractTags } = await import('../index')
    expect(extractTags('想法 #项目 #灵感 #项目')).toEqual(['项目', '灵感'])
  })

  it('extractTags 无标签返回空', async () => {
    const { extractTags } = await import('../index')
    expect(extractTags('纯文本没有标签')).toEqual([])
  })

  it('extractTags 支持中文标签', async () => {
    const { extractTags } = await import('../index')
    expect(extractTags('读书笔记 #读书 #心流')).toEqual(['读书', '心流'])
  })

  it('quickCapture 创建无标题原子卡片并剥离标签', async () => {
    const mod = await import('../index')
    const api = mod.useStudy()
    api.load()
    const note = api.quickCapture('今天想通了一件事 #顿悟 #成长')
    expect(note).not.toBeNull()
    expect(note!.title).toBe('')
    expect(note!.tags).toEqual(['顿悟', '成长'])
    expect(note!.content).toBe('今天想通了一件事')
    expect(api.notes.value).toHaveLength(1)
  })

  it('quickCapture 空内容返回 null 且不落库', async () => {
    const mod = await import('../index')
    const api = mod.useStudy()
    api.load()
    expect(api.quickCapture('   ')).toBeNull()
    expect(api.notes.value).toHaveLength(0)
  })
})
