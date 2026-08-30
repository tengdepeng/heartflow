// ============================================================
// BondArchivePanel 组件测试（INCR-13：羁绊档案面板）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import BondArchivePanel from '../BondArchivePanel.vue'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

function person(overrides: Record<string, any> = {}) {
  return {
    id: 'p1',
    name: '张三',
    relation: 'friend',
    tags: [],
    notes: '',
    closeness: 0.8,
    color: '#7c5cfc',
    lastContact: null,
    importantDates: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function interaction(overrides: Record<string, any> = {}) {
  return {
    id: 'i1',
    personId: 'p1',
    kind: 'call',
    date: new Date().toISOString(),
    mood: 'positive',
    summary: '',
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function mountPanel(persons: any[] = [], interactions: any[] = []) {
  if (interactions.length) mockStore['hf:relation_interactions'] = interactions
  else delete mockStore['hf:relation_interactions']
  return mount(BondArchivePanel, { props: { persons } })
}

describe('BondArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:relation_interactions'] = []
  })

  it('空库渲染档案标题与概览零值及温和洞察引导', () => {
    const wrapper = mountPanel([], [])
    expect(wrapper.text()).toContain('羁绊档案')
    expect(wrapper.text()).toContain('总人数')
    expect(wrapper.text()).toContain('羁绊之厅空落落')
  })

  it('展示档案概览统计', () => {
    const wrapper = mountPanel(
      [
        person({ id: 'p1', name: '张三', relation: 'friend', closeness: 0.8 }),
        person({ id: 'p2', name: '李四', relation: 'family', closeness: 0.2, isSeat: true }),
      ],
      [interaction({ personId: 'p1' })],
    )
    const stats = wrapper.find('.bap-stats')
    expect(stats.text()).toContain('总人数')
    expect(stats.text()).toContain('有互动')
    expect(stats.text()).toContain('从未互动')
    expect(stats.text()).toContain('留座')
  })

  it('展示最亲密与平均亲密度', () => {
    const wrapper = mountPanel(
      [
        person({ id: 'p1', name: '张三', closeness: 0.8 }),
        person({ id: 'p2', name: '李四', closeness: 0.4 }),
      ],
      [],
    )
    const clos = wrapper.find('.bap-closest')
    expect(clos.text()).toContain('最亲密')
    expect(clos.text()).toContain('张三')
    expect(clos.text()).toMatch(/8[0-9]?%/) // 80% 亲密度
  })

  it('渲染羁绊健康分数与标签', () => {
    const wrapper = mountPanel(
      [
        person({ id: 'p1', name: '张三', closeness: 0.8 }),
        person({ id: 'p2', name: '李四', closeness: 0.7 }),
      ],
      [interaction({ personId: 'p1' }), interaction({ personId: 'p2', id: 'i2' })],
    )
    const health = wrapper.find('.bap-health')
    expect(health.text()).toContain('广度')
    expect(health.text()).toContain('频率')
    expect(health.text()).toContain('维系')
    // 标签必然是四种之一
    const label = health.find('.bap-health-label').text()
    expect(['羁绊温热', '往来渐密', '偶有回响', '羁绊待织']).toContain(label)
  })

  it('类型分布行渲染（仅非零类型）', () => {
    const wrapper = mountPanel(
      [
        person({ id: 'p1', name: '张三', relation: 'friend' }),
        person({ id: 'p2', name: '李四', relation: 'family' }),
      ],
      [],
    )
    const types = wrapper.find('.bap-types')
    expect(types.text()).toContain('按关系类型分布')
    expect(types.text()).toContain('朋友')
    expect(types.text()).toContain('家人')
  })

  it('互动节律渲染', () => {
    const wrapper = mountPanel(
      [person({ id: 'p1', name: '张三' })],
      [interaction({ personId: 'p1' })],
    )
    const rhythm = wrapper.find('.bap-rhythm')
    expect(rhythm.text()).toContain('互动节律')
    expect(rhythm.text()).toContain('近 7 天')
    expect(rhythm.text()).toContain('近 30 天')
    expect(rhythm.text()).toContain('连续天数')
  })

  it('温和洞察列表渲染', () => {
    const wrapper = mountPanel(
      [person({ id: 'p1', name: '张三' })],
      [interaction({ personId: 'p1' })],
    )
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.text()).toContain('💡')
  })
})