import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeContact(overrides: Record<string, any> = {}) {
  return {
    id: `c-${Math.random().toString(36).slice(2, 6)}`,
    name: '测试联系人',
    role: '工程师',
    tier: 'core',
    nodeType: 'colleague',
    affinity: 7,
    tags: [],
    ...overrides,
  }
}

function makeConn(overrides: Record<string, any> = {}) {
  return {
    id: `conn-${Math.random().toString(36).slice(2, 6)}`,
    fromId: 'c-a',
    toId: 'c-b',
    type: 'collaboration',
    ...overrides,
  }
}

async function mountPanel(contacts: any[], connections: any[] = []) {
  vi.resetModules()
  ;(globalThis as any).localStorage = createMockStorage()
  invalidateCache()
  const mod = await import('../InfluenceAnalysisPanel.vue')
  return mount(mod.default, { props: { contacts, connections } })
}

describe('InfluenceAnalysisPanel 影响力分析', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无联系人时显示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('影响力分析')
    expect(wrapper.text()).toContain('先录入联系人')
  })

  it('有联系人时展示网络健康度', async () => {
    const wrapper = await mountPanel([
      makeContact({ id: 'c-a', name: '张老师' }),
      makeContact({ id: 'c-b', name: '李工' }),
    ], [
      makeConn({ id: 'conn-1', fromId: 'c-a', toId: 'c-b', type: 'strong' }),
    ])
    expect(wrapper.text()).toContain('网络健康度')
    expect(wrapper.text()).toContain('网络密度')
    expect(wrapper.text()).toContain('聚类系数')
    expect(wrapper.text()).toContain('连通分量')
  })

  it('展示影响力排行与综合评分', async () => {
    const wrapper = await mountPanel([
      makeContact({ id: 'c-a', name: '张老师', tier: 'core', affinity: 10, nodeType: 'mentor' }),
      makeContact({ id: 'c-b', name: '李工', tier: 'active', affinity: 6, nodeType: 'colleague' }),
    ], [
      makeConn({ id: 'conn-1', fromId: 'c-a', toId: 'c-b', type: 'strong' }),
    ])
    expect(wrapper.text()).toContain('影响力排行')
    expect(wrapper.text()).toContain('张老师')
    expect(wrapper.text()).toContain('李工')
    expect(wrapper.text()).toContain('网络')
    expect(wrapper.text()).toContain('知识')
    expect(wrapper.text()).toContain('社交')
  })

  it('点击联系人展示中心度与传播力', async () => {
    const wrapper = await mountPanel([
      makeContact({ id: 'c-a', name: '张老师', tier: 'core', affinity: 10, nodeType: 'mentor' }),
      makeContact({ id: 'c-b', name: '李工', tier: 'active', affinity: 6, nodeType: 'colleague' }),
    ], [
      makeConn({ id: 'conn-1', fromId: 'c-a', toId: 'c-b', type: 'strong' }),
    ])
    await wrapper.find('.iap-rank-row').trigger('click')
    expect(wrapper.text()).toContain('中心度')
    expect(wrapper.text()).toContain('综合中心度')
    expect(wrapper.text()).toContain('传播力')
    expect(wrapper.text()).toContain('可达节点')
  })
})
