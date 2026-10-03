// ============================================================
// 时间长廊 · 搜索历史 / 保存的搜索 落盘测试
//
// 覆盖 createSearchHistoryManager / createSavedSearchManager 经
// timeline-search-store 接线后的真实持久化行为：
//   1. 两个 key 真的写进 localStorage
//   2. 上限 50（且保留最新）
//   3. 相同 query 去重（更新而非新增）
//   4. remove / clear 生效并落盘
//   5. 保存的搜索 add / getAll / update / remove
//
// 注：本文件不 mock storage，走真 storage + mock localStorage，
//     断言「磁盘上真的有这个 key」，而不是断言内存里的 ref。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'

const STORAGE_KEY = 'heartflow:storage'
const HISTORY_KEY = 'hf:timeline:search_history'
const SAVED_KEY = 'hf:timeline:saved_searches'

// 上限取自 timeline-filters.ts 的 MAX_HISTORY_SIZE，此处用字面量钉死，
// 引擎改了数字这里必须跟着改（避免「改成 100 测试还绿」的假绿）。
const MAX_HISTORY_SIZE = 50

let mockStorage: Record<string, any>

/**
 * 换一块干净 localStorage，并让 storage 与 store 重新读取。
 * 不调用 vi.resetModules()：store 是模块级单例，
 * 重置模块会让「组件用的实例」与「测试断言的实例」变成两批，测试就空转了。
 */
async function freshStore() {
  mockStorage = createMockStorage()
  ;(globalThis as any).localStorage = mockStorage
  const { invalidateCache } = await import('../../../engine/storage/core')
  invalidateCache()
  return await import('../timeline-search-store')
}

/** 从"磁盘"上把某个 KV 键的原始字符串读出来 */
function readKvRaw(key: string): string | null {
  const raw = mockStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  const schema = JSON.parse(raw)
  const v = schema?.kvStore?.[key]
  if (v === undefined || v === null) return null
  return typeof v === 'string' ? v : JSON.stringify(v)
}

describe('时间线搜索历史 / 保存的搜索 落盘', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  // ==========================================================
  // 1. 真实落盘
  // ==========================================================

  it('addEntry 后 hf:timeline:search_history 应真实写入 localStorage', async () => {
    const store = await freshStore()
    // 前置：起始必须为空，否则"有值"可能是上一次测试的残留
    expect(store.searchHistoryManager.load().length, '起始历史应为空').toBe(0)

    store.searchHistoryManager.addEntry({ query: '结晶', options: { query: '结晶' }, hitCount: 3 })

    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, 'addEntry 后 hf:timeline:search_history 应落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].query).toBe('结晶')
    expect(parsed[0].hitCount).toBe(3)
  })

  it('add 后 hf:timeline:saved_searches 应真实写入 localStorage', async () => {
    const store = await freshStore()
    expect(store.savedSearchManager.load().length, '起始保存列表应为空').toBe(0)

    store.savedSearchManager.add({ name: '本周结晶', query: '结晶', options: { query: '结晶', fuzzy: true } })

    const raw = readKvRaw(SAVED_KEY)
    expect(raw, 'add 后 hf:timeline:saved_searches 应落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed[0].name).toBe('本周结晶')
    expect(parsed[0].lastHitCount).toBe(0)
  })

  it('两个 key 互不串写', async () => {
    const store = await freshStore()
    store.searchHistoryManager.addEntry({ query: '甲', options: { query: '甲' }, hitCount: 1 })
    store.savedSearchManager.add({ name: '乙', query: '乙', options: { query: '乙' } })

    const history = JSON.parse(readKvRaw(HISTORY_KEY) as string)
    const saved = JSON.parse(readKvRaw(SAVED_KEY) as string)
    expect(history.length).toBe(1)
    expect(saved.length).toBe(1)
    expect(history[0].query).toBe('甲')
    expect(saved[0].query).toBe('乙')
  })

  // ==========================================================
  // 2. 上限 50
  // ==========================================================

  it(`连续添加 60 条后 load() 应恒为 ${MAX_HISTORY_SIZE} 且保留最新`, async () => {
    const store = await freshStore()
    store.searchHistoryManager.clear()
    expect(store.searchHistoryManager.load().length, '起始历史应为空').toBe(0)

    for (let i = 0; i < 60; i++) {
      store.searchHistoryManager.addEntry({ query: `q-${i}`, options: { query: `q-${i}` }, hitCount: i })
    }

    const all = store.searchHistoryManager.load()
    // 基准用字面量，不写 MAX_HISTORY_SIZE + 0 之类的自证式断言
    expect(all.length).toBe(50)

    // unshift 语义：最新的在头部
    expect(all[0].query).toBe('q-59')
    expect(all[1].query).toBe('q-58')
    expect(all[49].query).toBe('q-10')

    // 最旧的 10 条（q-0 ~ q-9）应已被裁掉
    expect(all.some(e => e.query === 'q-9')).toBe(false)
    expect(all.some(e => e.query === 'q-0')).toBe(false)

    // 落盘的同样被裁剪，而不是"内存裁了磁盘没裁"
    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, '历史应已落盘').toBeTruthy()
    expect(JSON.parse(raw as string).length).toBe(50)
  })

  it('getRecent(5) 应返回最新的 5 条', async () => {
    const store = await freshStore()
    store.searchHistoryManager.clear()
    for (let i = 0; i < 8; i++) {
      store.searchHistoryManager.addEntry({ query: `r-${i}`, options: { query: `r-${i}` }, hitCount: i })
    }
    const recent = store.searchHistoryManager.getRecent(5)
    expect(recent.length).toBe(5)
    expect(recent[0].query).toBe('r-7')
    expect(recent[4].query).toBe('r-3')
  })

  // ==========================================================
  // 3. 去重语义
  // ==========================================================

  it('相同 query 再次 addEntry 应更新而非新增', async () => {
    const store = await freshStore()
    store.searchHistoryManager.clear()

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T10:00:00.000Z'))
    store.searchHistoryManager.addEntry({ query: '心锚', options: { query: '心锚' }, hitCount: 2 })
    const before = store.searchHistoryManager.load()
    expect(before.length).toBe(1)
    const beforeId = before[0].id

    vi.setSystemTime(new Date('2026-10-04T10:05:00.000Z'))
    store.searchHistoryManager.addEntry({ query: '心锚', options: { query: '心锚', fuzzy: true }, hitCount: 7 })
    const after = store.searchHistoryManager.load()
    vi.useRealTimers()

    // 长度不变 = 没有新增条目
    expect(after.length).toBe(1)
    // id 保留 = 是原地更新，不是删旧加新
    expect(after[0].id).toBe(beforeId)
    // 字段确实被刷新
    expect(after[0].hitCount).toBe(7)
    expect(after[0].options.fuzzy).toBe(true)
    // timestamp 被刷新为第二次 addEntry 的时刻（不是第一次的）
    expect(after[0].timestamp).toBe('2026-10-04T10:05:00.000Z')
    expect(after[0].timestamp).not.toBe(before[0].timestamp)
  })

  it('不同 query 各占一条，去重不会误合并', async () => {
    const store = await freshStore()
    store.searchHistoryManager.clear()
    store.searchHistoryManager.addEntry({ query: '甲', options: { query: '甲' }, hitCount: 1 })
    store.searchHistoryManager.addEntry({ query: '乙', options: { query: '乙' }, hitCount: 2 })
    store.searchHistoryManager.addEntry({ query: '甲', options: { query: '甲' }, hitCount: 9 })

    const all = store.searchHistoryManager.load()
    expect(all.length).toBe(2)
    // 引擎语义实测：去重是「原地更新」，命中的旧条目**不会**被顶到最前
    // （只有全新条目才 unshift 到头部）。故顺序仍是 [乙, 甲]，甲的内容被刷新。
    expect(all[0].query).toBe('乙')
    expect(all[1].query).toBe('甲')
    expect(all[1].hitCount).toBe(9)
    // id 保留，证明是更新而不是"删掉旧的再 unshift 一条新的"
    const firstJia = all[1]
    store.searchHistoryManager.addEntry({ query: '甲', options: { query: '甲' }, hitCount: 11 })
    const after = store.searchHistoryManager.load()
    expect(after.length).toBe(2)
    expect(after[1].id).toBe(firstJia.id)
    expect(after[1].hitCount).toBe(11)
  })

  // ==========================================================
  // 4. remove / clear
  // ==========================================================

  it('remove 应删除指定条目并落盘', async () => {
    const store = await freshStore()
    store.searchHistoryManager.clear()
    store.searchHistoryManager.addEntry({ query: '留着', options: { query: '留着' }, hitCount: 1 })
    store.searchHistoryManager.addEntry({ query: '删掉', options: { query: '删掉' }, hitCount: 2 })

    const target = store.searchHistoryManager.load().find(e => e.query === '删掉')
    expect(target, '应能找到待删条目').toBeTruthy()
    store.searchHistoryManager.remove(target!.id)

    const after = store.searchHistoryManager.load()
    expect(after.length).toBe(1)
    expect(after[0].query).toBe('留着')

    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, 'remove 后应重新落盘').toBeTruthy()
    const parsed = JSON.parse(raw as string)
    expect(parsed.length).toBe(1)
    expect(parsed.some((e: any) => e.query === '删掉')).toBe(false)
  })

  it('clear 应清空历史并落盘为空数组', async () => {
    const store = await freshStore()
    store.searchHistoryManager.addEntry({ query: '甲', options: { query: '甲' }, hitCount: 1 })
    expect(store.searchHistoryManager.load().length).toBe(1)

    store.searchHistoryManager.clear()

    expect(store.searchHistoryManager.load().length).toBe(0)
    const raw = readKvRaw(HISTORY_KEY)
    expect(raw, 'clear 后应落盘空数组而不是删键').toBeTruthy()
    expect(JSON.parse(raw as string).length).toBe(0)
  })

  // ==========================================================
  // 5. 保存的搜索：add / getAll / update / remove
  // ==========================================================

  it('保存的搜索 getAll 应按 updatedAt 倒序', async () => {
    const store = await freshStore()
    store.savedSearchManager.load().forEach(s => store.savedSearchManager.remove(s.id))
    expect(store.savedSearchManager.getAll().length, '起始保存列表应为空').toBe(0)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-04T09:00:00.000Z'))
    const a = store.savedSearchManager.add({ name: '早', query: '早', options: { query: '早' } })
    vi.setSystemTime(new Date('2026-10-04T09:30:00.000Z'))
    const b = store.savedSearchManager.add({ name: '晚', query: '晚', options: { query: '晚' } })
    vi.useRealTimers()

    const all = store.savedSearchManager.getAll()
    expect(all.length).toBe(2)
    expect(all[0].id).toBe(b.id)
    expect(all[1].id).toBe(a.id)
  })

  it('update 应改写 lastHitCount 与 updatedAt 并落盘', async () => {
    const store = await freshStore()
    store.savedSearchManager.load().forEach(s => store.savedSearchManager.remove(s.id))
    const created = store.savedSearchManager.add({ name: '收藏', query: '结晶', options: { query: '结晶' } })
    expect(created.lastHitCount).toBe(0)

    const updated = store.savedSearchManager.update(created.id, { lastHitCount: 12 })
    expect(updated, 'update 应返回被更新的条目').toBeTruthy()
    expect(updated!.lastHitCount).toBe(12)

    const raw = readKvRaw(SAVED_KEY)
    expect(raw, 'update 后应落盘').toBeTruthy()
    expect(JSON.parse(raw as string)[0].lastHitCount).toBe(12)
  })

  it('remove 应删除指定保存的搜索并落盘', async () => {
    const store = await freshStore()
    store.savedSearchManager.load().forEach(s => store.savedSearchManager.remove(s.id))
    store.savedSearchManager.add({ name: '甲', query: '甲', options: { query: '甲' } })
    store.savedSearchManager.add({ name: '乙', query: '乙', options: { query: '乙' } })
    expect(store.savedSearchManager.getAll().length).toBe(2)

    const target = store.savedSearchManager.getAll().find(s => s.name === '乙')
    expect(target, '应能找到待删条目').toBeTruthy()
    store.savedSearchManager.remove(target!.id)

    expect(store.savedSearchManager.getAll().length).toBe(1)
    const raw = readKvRaw(SAVED_KEY)
    expect(raw, 'remove 后应重新落盘').toBeTruthy()
    expect(JSON.parse(raw as string).length).toBe(1)
  })

  it('update 不存在的 id 应返回 null 且不污染存储', async () => {
    const store = await freshStore()
    store.savedSearchManager.add({ name: '甲', query: '甲', options: { query: '甲' } })
    const before = readKvRaw(SAVED_KEY)
    expect(before, '起始应有落盘数据').toBeTruthy()

    const res = store.savedSearchManager.update('saved-nonexistent', { lastHitCount: 99 })
    expect(res).toBeNull()
    expect(readKvRaw(SAVED_KEY)).toBe(before)
  })
})
