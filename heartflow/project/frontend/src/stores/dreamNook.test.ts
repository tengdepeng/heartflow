// ============================================================
// 梦乡小筑 · Store 测试
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

import { useDreamNookStore, DREAM_REALM_ID } from './dreamNook'

describe('dreamNook store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('初始状态梦境列表为空', () => {
    const store = useDreamNookStore()
    expect(store.dreams).toEqual([])
    expect(store.totalCount).toBe(0)
    expect(store.thisMonthCount).toBe(0)
    expect(store.allTags).toEqual([])
  })

  it('recordDream 记录梦境', () => {
    const store = useDreamNookStore()
    store.recordDream('在天空飞翔', '飞翔的梦', 'happy', ['飞行', '自由'])
    expect(store.dreams).toHaveLength(1)
    expect(store.dreams[0].title).toBe('飞翔的梦')
    expect(store.dreams[0].content).toBe('在天空飞翔')
    expect(store.dreams[0].mood).toBe('happy')
    expect(store.dreams[0].tags).toEqual(['飞行', '自由'])
    expect(store.dreams[0].archived).toBe(false)
    expect(mockSetKV).toHaveBeenCalled()
  })

  it('recordDream 默认情绪为 neutral', () => {
    const store = useDreamNookStore()
    store.recordDream('内容')
    expect(store.dreams[0].mood).toBe('neutral')
  })

  it('recordDream 无标题时 title 为空', () => {
    const store = useDreamNookStore()
    store.recordDream('内容', '')
    expect(store.dreams[0].title).toBe('')
  })

  it('deleteDream 删除梦境', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A')
    store.recordDream('梦B')
    const id = store.dreams[0].id
    store.deleteDream(id)
    expect(store.dreams).toHaveLength(1)
    expect(store.dreams[0].content).toBe('梦A')
  })

  it('archiveDream 归档梦境', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容')
    const id = store.dreams[0].id
    store.archiveDream(id)
    expect(store.dreams[0].archived).toBe(true)
    expect(store.activeDreams).toHaveLength(0)
    expect(store.archivedDreams).toHaveLength(1)
  })

  it('unarchiveDream 取消归档', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容')
    const id = store.dreams[0].id
    store.archiveDream(id)
    store.unarchiveDream(id)
    expect(store.dreams[0].archived).toBe(false)
    expect(store.activeDreams).toHaveLength(1)
  })

  it('allTags 聚合所有标签', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'neutral', ['飞行', '自由'])
    store.recordDream('梦B', '', 'neutral', ['飞行', '海洋'])
    expect(store.allTags).toEqual(['海洋', '自由', '飞行'])
  })

  it('tagCount 统计标签使用次数', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'neutral', ['飞行'])
    store.recordDream('梦B', '', 'neutral', ['飞行'])
    store.recordDream('梦C', '', 'neutral', ['海洋'])
    expect(store.tagCount('飞行')).toBe(2)
    expect(store.tagCount('海洋')).toBe(1)
  })

  it('tagRank 返回标签排名', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'neutral', ['飞行'])
    store.recordDream('梦B', '', 'neutral', ['飞行'])
    store.recordDream('梦C', '', 'neutral', ['海洋'])
    const rank = store.tagRank
    expect(rank[0][0]).toBe('飞行')
    expect(rank[0][1]).toBe(2)
  })

  it('topTag 返回最常用标签', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'neutral', ['飞行'])
    const top = store.topTag
    expect(top).not.toBeNull()
    expect(top![0]).toBe('飞行')
  })

  it('topTag 无梦境时返回 null', () => {
    const store = useDreamNookStore()
    expect(store.topTag).toBeNull()
  })

  it('filterDreams 搜索过滤', () => {
    const store = useDreamNookStore()
    store.recordDream('飞翔', '天空', 'happy')
    store.recordDream('潜水', '海洋', 'curious')
    const result = store.filterDreams('飞翔')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('天空')
  })

  it('filterDreams 情绪过滤', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'happy')
    store.recordDream('梦B', '', 'fear')
    const result = store.filterDreams(undefined, 'happy')
    expect(result).toHaveLength(1)
    expect(result[0].mood).toBe('happy')
  })

  it('filterDreams 标签过滤', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A', '', 'neutral', ['飞行'])
    store.recordDream('梦B', '', 'neutral', ['海洋'])
    const result = store.filterDreams(undefined, undefined, '飞行')
    expect(result).toHaveLength(1)
  })

  it('filterDreams 组合过滤', () => {
    const store = useDreamNookStore()
    store.recordDream('飞翔', '天空', 'happy', ['飞行'])
    store.recordDream('潜水', '海洋', 'curious', ['海洋'])
    store.recordDream('飞行', '高空', 'happy', ['飞行'])
    const result = store.filterDreams('飞行', 'happy', '飞行')
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('高空')
  })

  it('moodLabel 返回情绪图标', () => {
    const store = useDreamNookStore()
    expect(store.moodLabel('happy')).toBe('😊')
    expect(store.moodLabel('fear')).toBe('😨')
    expect(store.moodLabel('sad')).toBe('😢')
    expect(store.moodLabel('curious')).toBe('🤔')
    expect(store.moodLabel('confused')).toBe('🌀')
    expect(store.moodLabel('neutral')).toBe('☁️')
    expect(store.moodLabel('unknown')).toBe('☁️')
  })

  it('linkParallelWorld 关联平行世界', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容')
    const id = store.dreams[0].id
    store.linkParallelWorld(id, 'world_1')
    expect(store.dreams[0].relatedParallelWorldId).toBe('world_1')
  })

  it('exportDreams 导出为 JSON', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容', '标题', 'happy', ['标签'])
    const json = store.exportDreams()
    const parsed = JSON.parse(json)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed[0].content).toBe('梦内容')
  })

  it('importDreams 导入梦境，按 id 去重', () => {
    const store = useDreamNookStore()
    store.recordDream('梦A')
    const existingId = store.dreams[0].id
    const imported = JSON.stringify([
      { id: existingId, title: '重复', content: '重复', mood: 'neutral', tags: [], at: '' },
      { id: 'new_id', title: '新梦', content: '新内容', mood: 'happy', tags: [], at: '' },
    ])
    const result = store.importDreams(imported)
    expect(result.added).toBe(1)
    expect(result.skipped).toBe(1)
    expect(store.dreams).toHaveLength(2)
  })

  it('importDreams 非法格式抛出异常', () => {
    const store = useDreamNookStore()
    expect(() => store.importDreams('invalid json')).toThrow()
  })

  it('getDream 获取单个梦境', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容')
    const id = store.dreams[0].id
    const dream = store.getDream(id)
    expect(dream?.content).toBe('梦内容')
  })

  it('getDream 不存在的 ID 返回 undefined', () => {
    const store = useDreamNookStore()
    expect(store.getDream('nonexistent')).toBeUndefined()
  })

  it('recordDream 可指定 dreamDate', () => {
    const store = useDreamNookStore()
    store.recordDream('内容', '', 'neutral', [], '2026-08-08')
    expect(store.dreams[0].dreamDate).toBe('2026-08-08')
  })

  it('linkParallelWorld 传 null 可取消映照（清空关联字段）', () => {
    const store = useDreamNookStore()
    store.recordDream('梦内容')
    const id = store.dreams[0].id
    store.linkParallelWorld(id, DREAM_REALM_ID)
    expect(store.dreams[0].relatedParallelWorldId).toBe(DREAM_REALM_ID)
    store.linkParallelWorld(id, null)
    expect(store.dreams[0].relatedParallelWorldId).toBeNull()
  })

  it('parallelWorldDreams 仅包含映照到梦境区的梦境（#87 双向联动数据源）', () => {
    const store = useDreamNookStore()
    const a = store.recordDream('映照的梦')
    const b = store.recordDream('未映照的梦')
    store.linkParallelWorld(a.id, DREAM_REALM_ID)
    expect(store.parallelWorldDreams).toHaveLength(1)
    expect(store.parallelWorldDreams[0].id).toBe(a.id)
    // 取消映照后从联动列表移除
    store.linkParallelWorld(a.id, null)
    expect(store.parallelWorldDreams).toHaveLength(0)
    // 其它 worldId 不计入梦境区
    store.linkParallelWorld(b.id, 'other-world')
    expect(store.parallelWorldDreams).toHaveLength(0)
  })
})