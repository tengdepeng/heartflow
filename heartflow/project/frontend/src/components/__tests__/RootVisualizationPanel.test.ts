import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeRoot(overrides: Record<string, any> = {}) {
  return {
    id: 'r_' + Math.random().toString(36).slice(2, 7),
    layer: 'soil',
    text: '原生家庭',
    detail: '在故乡长大的记忆',
    era: '童年',
    icon: '🏡',
    strength: 0.7,
    connections: [],
    tags: ['家庭'],
    color: '#8B6F47',
    willId: null,
    lastUpdatedAt: new Date().toISOString(),
    _expanded: false,
    ...overrides,
  }
}

async function mountPanel(roots: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { 'hf:roots_v2': roots },
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../RootVisualizationPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

describe('RootVisualizationPanel 根系可视化', () => {
  it('空状态提示尚无根系记录', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('还没有根系记录')
    expect(wrapper.find('.rvp-tree').exists()).toBe(false)
  })

  it('有根系时渲染生命力地图与三层活力条', async () => {
    const roots = [
      makeRoot({ id: 'a', layer: 'soil', strength: 0.8, tags: ['家庭'] }),
      makeRoot({ id: 'b', layer: 'era', strength: 0.6, tags: ['大学'] }),
      makeRoot({ id: 'c', layer: 'branch', strength: 0.4, tags: ['选择'] }),
    ]
    const wrapper = await mountPanel(roots)
    expect(wrapper.find('.rvp-vitality-ring').exists()).toBe(true)
    expect(wrapper.findAll('.rvp-layer-bar').length).toBe(3)
    expect(wrapper.find('.rvp-vitality-rating').exists()).toBe(true)
  })

  it('渲染根脉图谱节点与连接边', async () => {
    const roots = [
      makeRoot({ id: 'a', layer: 'soil', strength: 0.8, connections: ['b'], tags: ['家庭'] }),
      makeRoot({ id: 'b', layer: 'era', strength: 0.6, connections: ['a'], tags: ['大学'] }),
      makeRoot({ id: 'c', layer: 'branch', strength: 0.4, tags: ['选择'] }),
    ]
    const wrapper = await mountPanel(roots)
    expect(wrapper.findAll('.rvp-tree-node').length).toBe(3)
    expect(wrapper.findAll('.rvp-tree-svg line').length).toBeGreaterThan(0)
    expect(wrapper.find('.rvp-legend').exists()).toBe(true)
  })

  it('相同标签/时期的根系聚为一组', async () => {
    const roots = [
      makeRoot({ id: 'a', layer: 'soil', tags: ['家庭'], era: '童年' }),
      makeRoot({ id: 'b', layer: 'era', tags: ['家庭'], era: '童年' }),
      makeRoot({ id: 'c', layer: 'branch', tags: ['选择'], era: '大学' }),
    ]
    const wrapper = await mountPanel(roots)
    expect(wrapper.findAll('.rvp-cluster').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('家庭')
  })
})