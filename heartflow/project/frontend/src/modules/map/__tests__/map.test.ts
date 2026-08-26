// ============================================================
// useMap 模块测试
// 地图室数据层：地点（持久化剥离 _expanded）与人生节点的载入 / 保存
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => {
    store[k] = v
  })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useMap } from '../map'
import type { Place, LifeNode } from '../map'

const PLACES_KEY = 'hf:map_places_v2'
const LIFE_NODES_KEY = 'hf:life_nodes'

function samplePlace(partial: Partial<Place> = {}): Place {
  return {
    id: 'p1',
    name: '故宫',
    city: '北京',
    type: 'city',
    note: '',
    visitCount: 1,
    at: '2026-01-01T00:00:00.000Z',
    _expanded: false,
    ...partial,
  }
}

function sampleNode(partial: Partial<LifeNode> = {}): LifeNode {
  return {
    id: 'n1',
    year: '2018',
    text: '留学东京',
    detail: '',
    color: '#ffffff',
    at: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

describe('useMap 地图数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach((k) => delete store[k])
    // 重置模块级单例
    const m = useMap()
    m.load()
    m.loadNodes()
  })

  it('load 从存储读取地点列表并重置 _expanded 为 false', () => {
    store[PLACES_KEY] = [{ ...samplePlace(), _expanded: true }]
    const m = useMap()
    m.load()
    expect(m.places.value.length).toBe(1)
    expect(m.places.value[0]._expanded).toBe(false)
    expect(mockGetKV).toHaveBeenCalledWith(PLACES_KEY, [])
  })

  it('save 持久化地点时剥离 _expanded 字段', () => {
    const m = useMap()
    m.places.value = [samplePlace({ _expanded: true })]
    m.save()
    expect(mockSetKV).toHaveBeenCalledWith(PLACES_KEY, [expect.objectContaining({ id: 'p1' })])
    const persisted = store[PLACES_KEY][0]
    expect('_expanded' in persisted).toBe(false)
  })

  it('loadNodes 从存储读取人生节点', () => {
    store[LIFE_NODES_KEY] = [sampleNode()]
    const m = useMap()
    m.loadNodes()
    expect(m.lifeNodes.value.length).toBe(1)
    expect(m.lifeNodes.value[0].text).toBe('留学东京')
    expect(mockGetKV).toHaveBeenCalledWith(LIFE_NODES_KEY, [])
  })

  it('saveNodes 持久化人生节点', () => {
    const m = useMap()
    m.lifeNodes.value = [sampleNode()]
    m.saveNodes()
    expect(mockSetKV).toHaveBeenCalledWith(LIFE_NODES_KEY, [expect.objectContaining({ id: 'n1' })])
  })

  it('空存储时返回默认空列表', () => {
    const m = useMap()
    m.load()
    m.loadNodes()
    expect(m.places.value).toEqual([])
    expect(m.lifeNodes.value).toEqual([])
  })
})
