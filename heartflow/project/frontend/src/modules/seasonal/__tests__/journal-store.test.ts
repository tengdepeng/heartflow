// ============================================================
// 岁时阁 · 季节日志持久化 store 测试
//
// 验证 useJournalStore() 的跨会话持久化、增删改与清空能力。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import type { SeasonalJournalEntry } from '../journal-store'

describe('岁时阁 · 季节日志持久化 store', () => {
  let store: any

  beforeEach(async () => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    const { invalidateCache } = await import('../../../engine/storage/core')
    invalidateCache()

    const { useJournalStore } = await import('../journal-store')
    store = useJournalStore()
  })

  // ============================================================
  // 1. 初始化
  // ============================================================
  describe('初始化', () => {
    it('entries 初始为空数组', () => {
      expect(Array.isArray(store.entries.value)).toBe(true)
      expect(store.entries.value.length).toBe(0)
    })

    it('提供所有操作方法', () => {
      expect(typeof store.createJournalEntry).toBe('function')
      expect(typeof store.updateJournalEntry).toBe('function')
      expect(typeof store.removeJournalEntry).toBe('function')
      expect(typeof store.clearSeason).toBe('function')
    })
  })

  // ============================================================
  // 2. 创建日志
  // ============================================================
  describe('创建日志', () => {
    it('createJournalEntry 新增并持久化', () => {
      store.createJournalEntry('夏日随笔', '今天很热', 'energetic', 'summer')
      expect(store.entries.value.length).toBe(1)
      const entry = store.entries.value[0]
      expect(entry.title).toBe('夏日随笔')
      expect(entry.mood).toBe('energetic')
      expect(entry.season).toBe('summer')
    })

    it('新日志插到最前面', () => {
      store.createJournalEntry('第一篇', '内容一', 'peaceful', 'spring')
      store.createJournalEntry('第二篇', '内容二', 'reflective', 'summer')
      expect(store.entries.value[0].title).toBe('第二篇')
      expect(store.entries.value[1].title).toBe('第一篇')
    })

    it('createJournalEntry 补全默认字段', () => {
      const entry: SeasonalJournalEntry = store.createJournalEntry('标题', '正文')
      expect(entry.id).toBeTruthy()
      expect(entry.year).toBe(new Date().getFullYear())
      expect(entry.keyEvents).toEqual([])
      expect(entry.relatedRitualIds).toEqual([])
      expect(entry.relatedCocoonIds).toEqual([])
      expect(entry.solarTerm).toBeTruthy()
      expect(entry.createdAt).toBeTruthy()
      expect(entry.updatedAt).toBeTruthy()
    })

    it('createJournalEntry 持久化到存储', async () => {
      const { getKV } = await import('../../../engine/storage/kv')
      store.createJournalEntry('秋思', '落叶知秋', 'melancholic', 'autumn')
      const persisted = getKV<any[]>('hf:seasonal_journals', [])
      expect(persisted.length).toBe(1)
      expect(persisted[0].title).toBe('秋思')
    })
  })

  // ============================================================
  // 3. 更新日志
  // ============================================================
  describe('更新日志', () => {
    it('updateJournalEntry 更新标题并持久化', () => {
      store.createJournalEntry('旧标题', '内容', 'peaceful', 'spring')
      const id = store.entries.value[0].id
      const updated = store.updateJournalEntry(id, { title: '新标题' })
      expect(updated).not.toBeNull()
      expect(updated.title).toBe('新标题')
      expect(store.entries.value[0].title).toBe('新标题')
    })

    it('updateJournalEntry 更新 mood 和 content', () => {
      store.createJournalEntry('标题', '旧内容', 'tired', 'winter')
      const id = store.entries.value[0].id
      store.updateJournalEntry(id, { mood: 'excited', content: '新内容' })
      const entry = store.entries.value[0]
      expect(entry.mood).toBe('excited')
      expect(entry.content).toBe('新内容')
    })

    it('updateJournalEntry 无效 id 返回 null', () => {
      expect(store.updateJournalEntry('invalid', { title: 'x' })).toBeNull()
    })

    it('updateJournalEntry 更新 updatedAt', () => {
      store.createJournalEntry('标题', '内容', 'peaceful', 'spring')
      const id = store.entries.value[0].id
      const before = store.entries.value[0].updatedAt
      const updated = store.updateJournalEntry(id, { title: '新' })
      expect(updated.updatedAt).toBeTruthy()
      expect(updated.updatedAt >= before).toBe(true)
    })
  })

  // ============================================================
  // 4. 删除日志
  // ============================================================
  describe('删除日志', () => {
    it('removeJournalEntry 删除指定条目', () => {
      store.createJournalEntry('保留', '内容', 'peaceful', 'spring')
      store.createJournalEntry('删除', '内容', 'reflective', 'summer')
      const delId = store.entries.value.find((e: any) => e.title === '删除').id
      store.removeJournalEntry(delId)
      expect(store.entries.value.length).toBe(1)
      expect(store.entries.value[0].title).toBe('保留')
    })

    it('removeJournalEntry 无效 id 不影响数据', () => {
      store.createJournalEntry('一条', '内容', 'peaceful', 'spring')
      store.removeJournalEntry('invalid')
      expect(store.entries.value.length).toBe(1)
    })
  })

  // ============================================================
  // 5. 清除季节
  // ============================================================
  describe('清除季节', () => {
    it('clearSeason 清除指定年季日志', () => {
      const year = new Date().getFullYear()
      store.createJournalEntry('春一篇', '内容', 'peaceful', 'spring')
      store.createJournalEntry('春二篇', '内容', 'excited', 'spring')
      store.createJournalEntry('夏一篇', '内容', 'energetic', 'summer')

      store.clearSeason(year, 'spring')
      expect(store.entries.value.length).toBe(1)
      expect(store.entries.value[0].season).toBe('summer')
    })

    it('clearSeason 不影响其他年份日志', () => {
      const year = new Date().getFullYear()
      const mk = (title: string, y: number, season: string) => ({
        id: `e_${title}`,
        season: season as any,
        year: y,
        title,
        content: '内容',
        mood: 'peaceful' as const,
        keyEvents: [],
        relatedRitualIds: [],
        relatedCocoonIds: [],
        solarTerm: '',
        weather: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      store.entries.value = [mk('今年春', year, 'spring'), mk('去年春', year - 1, 'spring')]

      store.clearSeason(year - 1, 'spring')
      expect(store.entries.value.length).toBe(1)
      expect(store.entries.value[0].title).toBe('今年春')
    })
  })

  // ============================================================
  // 6. 跨会话持久化（模块级数据源）
  // ============================================================
  describe('跨会话持久化', () => {
    it('重新加载模块后 entries 仍保留', async () => {
      store.createJournalEntry('会保留的日志', '内容', 'peaceful', 'spring')

      const mod = await import('../journal-store')
      const store2 = mod.useJournalStore()
      expect(store2.entries.value.length).toBe(1)
      expect(store2.entries.value[0].title).toBe('会保留的日志')
    })
  })
})