// ============================================================
// 匠庐 · 作品 Store 测试
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useCraftStore } from '../index'
import type { CraftWork, WorkStatus, WorkType } from '../types'

// 模拟 storage/kv 模块
const kvStore: Record<string, any> = {}
vi.mock('../../../engine/storage/kv', () => ({
  getKV: (key: string, defaultVal: any) => {
    const val = kvStore[key]
    return val !== undefined ? val : defaultVal
  },
  setKV: (key: string, val: any) => { kvStore[key] = val },
}))

function makeWork(overrides: Partial<CraftWork> = {}): CraftWork {
  const now = new Date().toISOString()
  return {
    id: `work-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: '测试作品',
    icon: '🔨',
    description: '测试描述',
    color: '#b8a080',
    status: 'draft' as WorkStatus,
    type: 'writing' as WorkType,
    date: '2026-07',
    evolution: 0,
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

describe('useCraftStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    // 清空 kv 存储
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('初始化时作品列表为空', () => {
    const store = useCraftStore()
    expect(store.works.length).toBe(0)
    expect(store.stats.totalWorks).toBe(0)
  })

  it('添加一个作品后列表更新', () => {
    const store = useCraftStore()
    const work = makeWork()
    const result = store.addWork(work)
    expect(result).toBe(true)
    expect(store.works.length).toBe(1)
    expect(store.works[0].id).toBe(work.id)
  })

  it('添加重复 id 的作品返回 false', () => {
    const store = useCraftStore()
    const work = makeWork({ id: 'dup-id' })
    store.addWork(work)
    const result = store.addWork(work)
    expect(result).toBe(false)
    expect(store.works.length).toBe(1)
  })

  it('更新作品字段', () => {
    const store = useCraftStore()
    const work = makeWork({ name: '旧名称' })
    store.addWork(work)
    const result = store.updateWork(work.id, { name: '新名称', evolution: 50 })
    expect(result).toBe(true)
    const updated = store.works.find(w => w.id === work.id)
    expect(updated?.name).toBe('新名称')
    expect(updated?.evolution).toBe(50)
    expect(updated?.updatedAt).toBeTruthy()
    expect(typeof updated?.updatedAt).toBe('string')
  })

  it('更新不存在的作品返回 false', () => {
    const store = useCraftStore()
    const result = store.updateWork('nonexistent', { name: '新名称' })
    expect(result).toBe(false)
  })

  it('删除作品', () => {
    const store = useCraftStore()
    const work = makeWork()
    store.addWork(work)
    expect(store.works.length).toBe(1)
    const result = store.removeWork(work.id)
    expect(result).toBe(true)
    expect(store.works.length).toBe(0)
  })

  it('删除不存在的作品返回 false', () => {
    const store = useCraftStore()
    const result = store.removeWork('nonexistent')
    expect(result).toBe(false)
  })

  it('按状态过滤作品', () => {
    const store = useCraftStore()
    store.addWork(makeWork({ id: 'w1', status: 'draft' }))
    store.addWork(makeWork({ id: 'w2', status: 'completed' }))
    store.addWork(makeWork({ id: 'w3', status: 'draft' }))

    store.setFilterStatus('draft')
    expect(store.filteredWorks.length).toBe(2)
    expect(store.filteredWorks.every(w => w.status === 'draft')).toBe(true)

    store.setFilterStatus('completed')
    expect(store.filteredWorks.length).toBe(1)
    expect(store.filteredWorks[0].status).toBe('completed')

    store.setFilterStatus('')
    expect(store.filteredWorks.length).toBe(3)
  })

  it('按类型过滤作品', () => {
    const store = useCraftStore()
    store.addWork(makeWork({ id: 'w1', type: 'writing' }))
    store.addWork(makeWork({ id: 'w2', type: 'code' }))
    store.addWork(makeWork({ id: 'w3', type: 'writing' }))

    store.setFilterType('writing')
    expect(store.filteredWorks.length).toBe(2)
    expect(store.filteredWorks.every(w => w.type === 'writing')).toBe(true)

    store.setFilterType('code')
    expect(store.filteredWorks.length).toBe(1)

    store.setFilterType('')
    expect(store.filteredWorks.length).toBe(3)
  })

  it('按名称搜索作品', () => {
    const store = useCraftStore()
    store.addWork(makeWork({ id: 'w1', name: '架构设计' }))
    store.addWork(makeWork({ id: 'w2', name: '代码重构' }))
    store.addWork(makeWork({ id: 'w3', name: '情绪花房' }))

    store.setSearchQuery('架构')
    expect(store.filteredWorks.length).toBe(1)
    expect(store.filteredWorks[0].name).toBe('架构设计')

    store.setSearchQuery('代码')
    expect(store.filteredWorks.length).toBe(1)
    expect(store.filteredWorks[0].name).toBe('代码重构')

    store.setSearchQuery('')
    expect(store.filteredWorks.length).toBe(3)
  })

  it('按标签搜索作品', () => {
    const store = useCraftStore()
    store.addWork(makeWork({ id: 'w1', name: '作品A', tags: ['vue', '前端'] }))
    store.addWork(makeWork({ id: 'w2', name: '作品B', tags: ['rust', '后端'] }))

    store.setSearchQuery('vue')
    expect(store.filteredWorks.length).toBe(1)
    expect(store.filteredWorks[0].id).toBe('w1')

    store.setSearchQuery('后端')
    expect(store.filteredWorks.length).toBe(1)
    expect(store.filteredWorks[0].id).toBe('w2')
  })

  describe('统计信息', () => {
    it('总作品数', () => {
      const store = useCraftStore()
      store.addWork(makeWork({ id: 'w1' }))
      store.addWork(makeWork({ id: 'w2' }))
      store.addWork(makeWork({ id: 'w3' }))
      expect(store.stats.totalWorks).toBe(3)
    })

    it('按状态统计', () => {
      const store = useCraftStore()
      store.addWork(makeWork({ id: 'w1', status: 'draft' }))
      store.addWork(makeWork({ id: 'w2', status: 'completed' }))
      store.addWork(makeWork({ id: 'w3', status: 'draft' }))
      store.addWork(makeWork({ id: 'w4', status: 'refining' }))
      store.addWork(makeWork({ id: 'w5', status: 'archived' }))

      expect(store.stats.byStatus.draft).toBe(2)
      expect(store.stats.byStatus.completed).toBe(1)
      expect(store.stats.byStatus.refining).toBe(1)
      expect(store.stats.byStatus.archived).toBe(1)
    })

    it('按类型统计', () => {
      const store = useCraftStore()
      store.addWork(makeWork({ id: 'w1', type: 'writing' }))
      store.addWork(makeWork({ id: 'w2', type: 'code' }))
      store.addWork(makeWork({ id: 'w3', type: 'writing' }))
      store.addWork(makeWork({ id: 'w4', type: 'design' }))
      store.addWork(makeWork({ id: 'w5', type: 'plan' }))

      expect(store.stats.byType.writing).toBe(2)
      expect(store.stats.byType.code).toBe(1)
      expect(store.stats.byType.design).toBe(1)
      expect(store.stats.byType.plan).toBe(1)
      expect(store.stats.byType.insight).toBe(0)
    })

    it('平均进化程度', () => {
      const store = useCraftStore()
      store.addWork(makeWork({ id: 'w1', evolution: 0 }))
      store.addWork(makeWork({ id: 'w2', evolution: 50 }))
      store.addWork(makeWork({ id: 'w3', evolution: 100 }))
      // (0 + 50 + 100) / 3 = 50
      expect(store.stats.averageEvolution).toBe(50)
    })

    it('已完成作品数', () => {
      const store = useCraftStore()
      store.addWork(makeWork({ id: 'w1', status: 'completed' }))
      store.addWork(makeWork({ id: 'w2', status: 'completed' }))
      store.addWork(makeWork({ id: 'w3', status: 'draft' }))
      expect(store.stats.totalCompleted).toBe(2)
    })
  })

  describe('持久化', () => {
    it('添加作品后保存到 KV', () => {
      const store = useCraftStore()
      const work = makeWork()
      store.addWork(work)
      expect(kvStore['hf:craft:works']).toBeDefined()
      expect(kvStore['hf:craft:works'].length).toBe(1)
      expect(kvStore['hf:craft:works'][0].id).toBe(work.id)
    })

    it('loadWorks 从 KV 加载数据', () => {
      // 预先设置 KV 存储
      const saved = [makeWork({ id: 'saved-1' }), makeWork({ id: 'saved-2' })]
      kvStore['hf:craft:works'] = saved

      // 重新创建 store 会触发 loadWorks
      const store = useCraftStore()
      expect(store.works.length).toBe(2)
      expect(store.works[0].id).toBe('saved-1')
      expect(store.works[1].id).toBe('saved-2')
    })

    it('删除作品后同步更新 KV', () => {
      const store = useCraftStore()
      const work = makeWork()
      store.addWork(work)
      expect(kvStore['hf:craft:works'].length).toBe(1)

      store.removeWork(work.id)
      expect(kvStore['hf:craft:works'].length).toBe(0)
    })

    it('更新作品后同步更新 KV', () => {
      const store = useCraftStore()
      const work = makeWork({ name: '原名' })
      store.addWork(work)
      store.updateWork(work.id, { name: '新名' })
      expect(kvStore['hf:craft:works'][0].name).toBe('新名')
    })
  })
})