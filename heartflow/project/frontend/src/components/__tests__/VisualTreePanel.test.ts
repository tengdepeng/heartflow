// ============================================================
// 根脉之庭 · 根脉可视化面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const TREES_KEY = 'hf:roots:visual-trees'

function root(overrides: Record<string, any> = {}) {
  return {
    id: `r_${Math.random().toString(36).slice(2, 8)}`,
    layer: 'soil',
    text: '小时候在院子里种树',
    detail: '',
    era: '小时候',
    icon: '🪨',
    _expanded: false,
    strength: 0.6,
    connections: [],
    tags: [],
    color: '#8a9a7a',
    willId: null,
    lastUpdatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}, roots: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../VisualTreePanel.vue')
  const wrapper = mount(mod.default, { props: { roots } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('VisualTreePanel 根脉可视化', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({}, [])
    expect(wrapper.text()).toContain('根脉可视化')
    expect(wrapper.text()).toContain('生成视图')
  })

  it('生成可视化树并持久化', async () => {
    const wrapper = await mountPanel({}, [
      root({ text: '小时候在院子里种树' }),
      root({ text: '大学时选择计算机专业' }),
    ])
    await wrapper.find('button.vt-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('根脉之庭')
    expect(wrapper.text()).toContain('节点')
    const kv = readKv()
    expect(kv[TREES_KEY]).toHaveLength(1)
    expect(kv[TREES_KEY][0].totalNodes).toBeGreaterThan(0)
  })

  it('切换布局方式', async () => {
    const wrapper = await mountPanel({}, [root()])
    const radialBtn = wrapper.findAll('button.vt-layout-btn').find(b => b.text() === '径向')
    await radialBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('button.vt-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[TREES_KEY][0].layoutType).toBe('radial')
  })

  it('展示世代统计', async () => {
    const wrapper = await mountPanel({}, [
      root({ text: '根节点' }),
      root({ text: '子节点', connections: [] }),
    ])
    await wrapper.find('button.vt-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('世代统计')
    expect(wrapper.text()).toContain('第 1 代')
  })

  it('移除可视化树', async () => {
    const wrapper = await mountPanel({}, [root()])
    await wrapper.find('button.vt-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('button.vt-btn-danger').trigger('click')
    await wrapper.vm.$nextTick()
    const kv = readKv()
    expect(kv[TREES_KEY]).toHaveLength(0)
  })
})
