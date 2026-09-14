import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import TransformMomentumPanel from '../TransformMomentumPanel.vue'
import type { Transformation, TransformType } from '../../modules/transform'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

function make(t: Partial<Transformation> & { type: TransformType }): Transformation {
  return {
    id: `t_${Math.random().toString(36).slice(2)}`,
    description: '坚持训练，体能提升',
    duration: 45,
    createdAt: daysAgo(1),
    ...t,
  }
}

function mountPanel(records: Transformation[]) {
  return mount(TransformMomentumPanel, {
    props: { records },
    global: { stubs: { transition: false } },
  })
}

describe('TransformMomentumPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('蜕变势能')
    expect(wrapper.find('.tmp-panel').exists()).toBe(true)
    expect(wrapper.find('.tmp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('记录第一段蜕变')
  })

  it('渲染势能评分与档位标签', () => {
    const records = [
      make({ type: 'body', createdAt: daysAgo(0) }),
      make({ type: 'mind', createdAt: daysAgo(1) }),
      make({ type: 'emotion', createdAt: daysAgo(2) }),
      make({ type: 'body', createdAt: daysAgo(3) }),
      make({ type: 'career', createdAt: daysAgo(4) }),
    ]
    const wrapper = mountPanel(records)
    expect(wrapper.find('.tmp-score').exists()).toBe(true)
    const score = Number(wrapper.find('.tmp-score').text())
    expect(score).toBeGreaterThan(0)
    const level = wrapper.find('.tmp-level').text()
    expect(['微光', '苏醒', '生长', '勃发']).toContain(level)
    expect(wrapper.text()).toContain('近7天')
    expect(wrapper.text()).toContain('近30天')
  })

  it('渲染蜕变节奏', () => {
    const records = [
      make({ type: 'body', createdAt: daysAgo(0) }),
      make({ type: 'body', createdAt: daysAgo(3) }),
      make({ type: 'mind', createdAt: daysAgo(6) }),
    ]
    const wrapper = mountPanel(records)
    expect(wrapper.find('.tmp-cad-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('平均间隔')
    expect(wrapper.text()).toContain('连续蜕变')
    expect(wrapper.text()).toContain('活跃周数')
  })

  it('渲染类型热度', () => {
    const records = [
      make({ type: 'body', createdAt: daysAgo(1) }),
      make({ type: 'body', createdAt: daysAgo(2) }),
      make({ type: 'mind', createdAt: daysAgo(3) }),
      make({ type: 'mind', createdAt: daysAgo(4) }),
    ]
    const wrapper = mountPanel(records)
    const rows = wrapper.findAll('.tmp-heat-row')
    expect(rows.length).toBeGreaterThan(0)
    const heatText = wrapper.find('.tmp-heat-rows').text()
    expect(heatText).toContain('身体')
    expect(heatText).toContain('心智')
    expect(heatText).toContain('%')
  })

  it('渲染温和洞察', () => {
    const records = [
      make({ type: 'body', createdAt: daysAgo(0) }),
      make({ type: 'body', createdAt: daysAgo(1) }),
      make({ type: 'body', createdAt: daysAgo(2) }),
    ]
    const wrapper = mountPanel(records)
    expect(wrapper.find('.tmp-insights').exists()).toBe(true)
    const items = wrapper.findAll('.tmp-insights li')
    expect(items.length).toBeGreaterThan(0)
    expect(items[0].text()).toContain('✦')
  })

  it('缺失 records 容量时容错显示空态', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('蜕变势能')
    expect(wrapper.find('.tmp-empty').exists()).toBe(true)
  })
})