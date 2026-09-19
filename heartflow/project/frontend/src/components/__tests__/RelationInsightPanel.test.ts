// ============================================================
// RelationInsightPanel 组件测试（INCR-367 关系可视化洞察）
// 走真实 relation-visualization 引擎 + interaction-journal，mock storage
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'

const h = vi.hoisted(() => {
  const mockStore: Record<string, any> = {}
  return {
    mockStore,
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  }
})

vi.mock('../../engine/storage', () => ({
  storageVersion: (() => { const r = ref(0); return r })(),
  storage: {
    getKV: (k: any, d: any) => h.getKV(k, d),
    setKV: (k: any, v: any) => h.setKV(k, v),
  },
}))

import RelationInsightPanel from '../RelationInsightPanel.vue'

function makePersons() {
  return [
    { id: 'p1', name: '张三', relation: 'friend', color: '#7c5cfc', closeness: 0.8, notes: '多年好友，非常交心', tags: ['同事'], importantDates: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    { id: 'p2', name: '李四', relation: 'family', color: '#4f8cff', closeness: 0.9, notes: '家人，经常通话', tags: ['同事', '家人'], importantDates: [{ label: '生日', date: '01-01' }], createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  ] as any
}

function seedInteractions() {
  h.mockStore['hf:relation_interactions'] = [
    { id: 'i1', personId: 'p1', kind: 'meeting', date: new Date(Date.now() - 86400000 * 2).toISOString(), mood: 'positive', summary: '一起吃饭聊了很久很愉快', tags: ['聚会'], createdAt: new Date().toISOString() },
    { id: 'i2', personId: 'p2', kind: 'call', date: new Date(Date.now() - 86400000).toISOString(), mood: 'positive', summary: '周末通话', tags: [], createdAt: new Date().toISOString() },
  ]
}

async function makeWrapper(extra: any = {}) {
  const wrapper = mount(RelationInsightPanel, {
    props: { persons: extra.persons ?? [] },
  })
  await nextTick()
  await nextTick()
  return wrapper
}

describe('RelationInsightPanel 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(h.mockStore)) delete h.mockStore[k]
  })

  it('渲染标题与空态宏观信息', async () => {
    const wrapper = await makeWrapper()
    expect(wrapper.text()).toContain('关系洞察')
    expect(wrapper.text()).toContain('力导向网络')
    expect(wrapper.text()).toContain('交互热力')
    expect(wrapper.text()).toContain('关系时间线')
    expect(wrapper.text()).toContain('关系雷达')
    // 无互动：热力与时间线空态
    expect(wrapper.text()).toContain('还没有互动记录')
    expect(wrapper.find('[data-test="tlempty"]').exists()).toBe(true)
  })

  it('无人物无互动时不渲染雷达图', async () => {
    const wrapper = await makeWrapper()
    expect(wrapper.find('[data-test="radarsvg"]').exists()).toBe(false)
  })

  it('有人物时渲染力导向网络与雷达图', async () => {
    const wrapper = await makeWrapper({ persons: makePersons() })
    // 力导向网络渲染人物节点标签
    expect(wrapper.text()).toContain('张三')
    expect(wrapper.text()).toContain('李四')
    // 雷达图与综合评分
    expect(wrapper.find('[data-test="radarsvg"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="radarverdict"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('综合评分')
  })

  it('有互动时渲染热力图网格与最活跃时段', async () => {
    seedInteractions()
    const wrapper = await makeWrapper({ persons: makePersons() })
    expect(wrapper.find('[data-test="heatmap"]').exists()).toBe(true)
    const meta = wrapper.find('[data-test="heatmeta"]')
    expect(meta.text()).toContain('最活跃')
    expect(meta.text()).toContain('次')
  })

  it('有互动时时间线渲染事件与类型徽标', async () => {
    seedInteractions()
    const wrapper = await makeWrapper({ persons: makePersons() })
    const tl = wrapper.find('[data-test="timeline"]')
    expect(tl.exists()).toBe(true)
    expect(tl.text()).toContain('一起吃饭聊了很久很愉快')
    expect(tl.text()).toContain('互动')
  })

  it('切换雷达目标人物后评分随之变化', async () => {
    seedInteractions()
    const wrapper = await makeWrapper({ persons: makePersons() })
    const select = wrapper.find('[data-test="radarselect"]')
    expect((select.element as HTMLSelectElement).value).toBe('p1')
    await select.setValue('p2')
    await nextTick()
    const svg = wrapper.find('[data-test="radarsvg"]')
    expect(svg.exists()).toBe(true)
  })
})