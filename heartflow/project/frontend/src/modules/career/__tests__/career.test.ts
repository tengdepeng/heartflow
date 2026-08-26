// ============================================================
// useCareer 模块测试
// 业脉数据层：联系人 / 连接 / 项目 的读取、写入与默认播种
// ============================================================
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockGetKV, mockSetKV, store } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const mockGetKV = vi.fn((k: string, d: any) => store[k] ?? d)
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = v })
  return { mockGetKV, mockSetKV, store }
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

import { useCareer } from '../career'
import type { CareerContact, CareerConnection, CareerProject } from '../career'

const CONTACTS_KEY = 'career:contacts'
const PROJECTS_KEY = 'career:projects'
const CONNECTIONS_KEY = 'career:connections'

function sampleContact(partial: Partial<CareerContact> = {}): CareerContact {
  return {
    id: 'c-x',
    name: '测试联系人',
    role: '工程师',
    tier: 'core',
    nodeType: 'colleague',
    affinity: 5,
    tags: ['t'],
    ...partial,
  }
}

describe('useCareer 业脉数据层', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((k: string, d: any) => (k in store ? store[k] : d))
    // 重置模块级单例并播种默认数据
    useCareer().load()
  })

  it('load 从空存储播种默认联系人（12）/ 项目（6）/ 连接（10）', () => {
    const m = useCareer()
    expect(m.contacts.value.length).toBe(12)
    expect(m.projects.value.length).toBe(6)
    expect(m.connections.value.length).toBe(10)
    expect(mockGetKV).toHaveBeenCalledWith(CONTACTS_KEY, [])
  })

  it('saveContacts 覆盖并持久化联系人列表', () => {
    const m = useCareer()
    const list = [sampleContact({ id: 'a' }), sampleContact({ id: 'b' })]
    m.saveContacts(list)
    expect(m.contacts.value.map((c) => c.id)).toEqual(['a', 'b'])
    expect(mockSetKV).toHaveBeenCalledWith(CONTACTS_KEY, list)
  })

  it('saveProjects 覆盖并持久化项目列表', () => {
    const m = useCareer()
    const project: CareerProject = {
      id: 'p-x', name: '项目', icon: '🏗', description: 'd', color: '#000',
      status: 'active', statusLabel: '进行中', partners: 'p', date: '2026-01',
    }
    m.saveProjects([project])
    expect(m.projects.value).toHaveLength(1)
    expect(mockSetKV).toHaveBeenCalledWith(PROJECTS_KEY, [project])
  })

  it('saveConnections 覆盖并持久化连接列表', () => {
    const m = useCareer()
    const conn: CareerConnection = { id: 'conn-x', fromId: 'a', toId: 'b', type: 'strong', description: 'd' }
    m.saveConnections([conn])
    expect(m.connections.value).toHaveLength(1)
    expect(mockSetKV).toHaveBeenCalledWith(CONNECTIONS_KEY, [conn])
  })

  it('load 读取已存储的数据（迁移 nodeType 缺失字段）', () => {
    const legacy = [{ id: 'c-legacy', name: '旧数据', role: 'r', tier: 'core', affinity: 1, tags: [] }]
    store[CONTACTS_KEY] = legacy
    const m = useCareer()
    m.load()
    expect(m.contacts.value[0].id).toBe('c-legacy')
    // 迁移：缺失 nodeType 时补默认 'colleague'
    expect(m.contacts.value[0].nodeType).toBe('colleague')
  })

  it('空存储时返回默认空列表（已被默认数据覆盖）', () => {
    const m = useCareer()
    m.load()
    // 空存储下 load 会播种默认数据，而非字面意义的空数组
    expect(m.contacts.value.length).toBeGreaterThan(0)
    expect(m.projects.value.length).toBeGreaterThan(0)
    expect(m.connections.value.length).toBeGreaterThan(0)
  })
})
