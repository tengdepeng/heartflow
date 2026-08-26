// ============================================================
// 根脉之庭 · 核心逻辑测试
// ============================================================
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useRoots, getStats } from '../index'
import { STORAGE_KEY } from '../types'

// 模拟 storage
const { mockKV } = vi.hoisted(() => {
  const mockKV: Record<string, any> = {}
  return { mockKV }
})
vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: <T>(key: string, def: T) => mockKV[key] ?? def,
    setKV: (key: string, val: any) => { mockKV[key] = val },
  },
}))

function sampleRoot(overrides: Record<string, any> = {}) {
  return {
    id: `rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    layer: 'soil' as const,
    text: '默认根系',
    detail: '',
    era: '',
    icon: '🪨',
    strength: 0.5,
    connections: [],
    tags: [],
    color: '#d4a574',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
    _expanded: false,
    ...overrides,
  }
}

describe('根脉之庭模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV[STORAGE_KEY] = []
    useRoots().load()
  })

  it('useRoots 返回 API 对象', () => {
    const api = useRoots()
    expect(api).toBeDefined()
    expect(typeof api.add).toBe('function')
    expect(typeof api.remove).toBe('function')
    expect(typeof api.update).toBe('function')
    expect(typeof api.getByLayer).toBe('function')
    expect(typeof api.getById).toBe('function')
    expect(typeof api.toggleExpand).toBe('function')
    expect(typeof api.autoDecayStrengths).toBe('function')
    expect(typeof api.load).toBe('function')
  })

  it('add 添加根系节点', () => {
    const api = useRoots()
    const root = api.add({ layer: 'soil', text: '原生家庭', detail: '', era: '1990s', icon: '🪨', strength: 0.8, connections: [], tags: ['家庭'], color: '#d4a574', willId: null })
    expect(root.id).toBeTruthy()
    expect(root.text).toBe('原生家庭')
    expect(root.layer).toBe('soil')
    expect(root.strength).toBe(0.8)
    expect(root.connections).toEqual([])
    expect(root.tags).toEqual(['家庭'])
    expect(root.willId).toBeNull()
    expect(root._expanded).toBe(false)
    expect(root.lastUpdatedAt).toBeTruthy()
    expect(api.allRoots.value).toHaveLength(1)
  })

  it('add 默认强度为 0.5', () => {
    const api = useRoots()
    const root = api.add({ layer: 'era', text: '大学时代', detail: '', era: '', icon: '🪵', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    expect(root.strength).toBe(0.5)
    expect(root.connections).toEqual([])
    expect(root.tags).toEqual([])
  })

  it('remove 删除根系节点', () => {
    const api = useRoots()
    const r1 = api.add({ layer: 'soil', text: '待删除', detail: '', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    api.add({ layer: 'era', text: '保留', detail: '', era: '', icon: '🪵', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    expect(api.allRoots.value).toHaveLength(2)
    api.remove(r1.id)
    expect(api.allRoots.value).toHaveLength(1)
    expect(api.allRoots.value[0].text).toBe('保留')
  })

  it('update 更新根系节点', () => {
    const api = useRoots()
    const r = api.add({ layer: 'branch', text: '旧信念', detail: '', era: '', icon: '🌿', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    api.update(r.id, { text: '新信念', strength: 0.9 })
    const updated = api.getById(r.id)
    expect(updated?.text).toBe('新信念')
    expect(updated?.strength).toBe(0.9)
  })

  it('getByLayer 按层筛选', () => {
    const api = useRoots()
    api.add({ layer: 'soil', text: '根系A', detail: '', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    api.add({ layer: 'soil', text: '根系B', detail: '', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    api.add({ layer: 'era', text: '树干C', detail: '', era: '', icon: '🪵', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    api.add({ layer: 'branch', text: '枝桠D', detail: '', era: '', icon: '🌿', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    expect(api.getByLayer('soil')).toHaveLength(2)
    expect(api.getByLayer('era')).toHaveLength(1)
    expect(api.getByLayer('branch')).toHaveLength(1)
  })

  it('getById 按 ID 查找', () => {
    const api = useRoots()
    const r = api.add({ layer: 'soil', text: '查找目标', detail: '', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    const found = api.getById(r.id)
    expect(found).toBeDefined()
    expect(found!.text).toBe('查找目标')
    expect(api.getById('non_existent')).toBeUndefined()
  })

  it('toggleExpand 切换展开/收起', () => {
    const api = useRoots()
    const r = api.add({ layer: 'soil', text: '可展开', detail: '详情内容', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    expect(r._expanded).toBe(false)
    api.toggleExpand(r.id)
    expect(api.getById(r.id)!._expanded).toBe(true)
    api.toggleExpand(r.id)
    expect(api.getById(r.id)!._expanded).toBe(false)
  })

  it('getStats 返回正确统计', () => {
    mockKV[STORAGE_KEY] = [
      sampleRoot({ id: 'r1', layer: 'soil' }),
      sampleRoot({ id: 'r2', layer: 'soil' }),
      sampleRoot({ id: 'r3', layer: 'era' }),
      sampleRoot({ id: 'r4', layer: 'branch' }),
      sampleRoot({ id: 'r5', layer: 'branch' }),
    ]
    const stats = getStats()
    expect(stats.total).toBe(5)
    expect(stats.soil).toBe(2)
    expect(stats.era).toBe(1)
    expect(stats.branch).toBe(2)
  })

  it('autoDecayStrengths 衰减旧节点强度', () => {
    const api = useRoots()
    const oldDate = new Date(Date.now() - 60 * 86400000).toISOString() // 60 天前
    const recentDate = new Date().toISOString()
    api.add({ layer: 'soil', text: '旧节点', detail: '', era: '', icon: '🪨', connections: [], tags: [], color: '#d4a574', willId: null, id: 'old_1', lastUpdatedAt: oldDate, strength: 0.8 } as any)
    // 直接设置 lastUpdatedAt
    const oldRoot = api.getById('old_1')!
    oldRoot.lastUpdatedAt = oldDate
    oldRoot.strength = 0.8

    const r2 = api.add({ layer: 'soil', text: '新节点', detail: '', era: '', icon: '🪨', strength: 0.5, connections: [], tags: [], color: '#d4a574', willId: null })
    r2.lastUpdatedAt = recentDate

    api.autoDecayStrengths(30, 0.05)
    expect(api.getById('old_1')!.strength).toBeLessThan(0.8)
    expect(api.getById(r2.id)!.strength).toBe(0.5)
  })

  it('autoDecayStrengths 不衰减阈值内的节点', () => {
    const api = useRoots()
    const recentDate = new Date(Date.now() - 15 * 86400000).toISOString() // 15 天前
    const r = api.add({ layer: 'soil', text: '近期节点', detail: '', era: '', icon: '🪨', strength: 0.7, connections: [], tags: [], color: '#d4a574', willId: null })
    r.lastUpdatedAt = recentDate

    api.autoDecayStrengths(30, 0.05)
    expect(api.getById(r.id)!.strength).toBe(0.7)
  })

  it('autoDecayStrengths 强度不低于 0.1', () => {
    const api = useRoots()
    const veryOldDate = new Date(Date.now() - 365 * 86400000).toISOString() // 1 年前
    const r = api.add({ layer: 'soil', text: '极旧节点', detail: '', era: '', icon: '🪨', strength: 0.15, connections: [], tags: [], color: '#d4a574', willId: null })
    r.lastUpdatedAt = veryOldDate

    // 多次衰减
    for (let i = 0; i < 10; i++) {
      api.autoDecayStrengths(30, 0.05)
    }
    expect(api.getById(r.id)!.strength).toBeGreaterThanOrEqual(0.1)
  })
})