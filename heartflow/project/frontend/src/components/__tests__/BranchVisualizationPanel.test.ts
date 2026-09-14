import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const BRANCHES_KEY = 'hf:parallel-world:branches'

function makeBranch(overrides: Record<string, any> = {}) {
  return {
    id: 'b_' + Math.random().toString(36).slice(2, 7),
    name: '分支',
    description: '',
    color: '#4A90D9',
    createdAt: '2026-01-01T00:00:00.000Z',
    isActive: false,
    checkpointCount: 0,
    ...overrides,
  }
}

async function mountPanel(branches: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (branches.length) kvStore[BRANCHES_KEY] = branches
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../BranchVisualizationPanel.vue')
  const wrapper = mount(mod.default)
  await flushPromises()
  return wrapper
}

function makeWorld() {
  const branches = [
    makeBranch({ id: 'bA', name: '工作线', isActive: true }),
    makeBranch({ id: 'bB', name: '副业线', parentBranchId: 'bA' }),
    makeBranch({ id: 'bC', name: '生活线', parentBranchId: 'bA' }),
  ]
  return { branches }
}

describe('BranchVisualizationPanel 分支可视化', () => {
  it('空存储时展示默认主干分支', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('分支可视化')
    expect(wrapper.findAll('.bvp-node').length).toBe(1)
    expect(wrapper.text()).toContain('主干')
  })

  it('构建分支树并渲染节点', async () => {
    const { branches } = makeWorld()
    const wrapper = await mountPanel(branches)

    expect(wrapper.find('.bvp-svg').exists()).toBe(true)
    expect(wrapper.findAll('.bvp-node').length).toBe(3)
    expect(wrapper.text()).toContain('工作线')
    expect(wrapper.text()).toContain('副业线')
  })

  it('切换布局重新渲染', async () => {
    const { branches } = makeWorld()
    const wrapper = await mountPanel(branches)

    const buttons = wrapper.findAll('.bvp-layout-row .bvp-btn')
    expect(buttons.length).toBe(4)
    await buttons[1].trigger('click') // 径向

    expect(wrapper.findAll('.bvp-layout-row .bvp-btn')[1].classes()).toContain('active')
    expect(wrapper.findAll('.bvp-node').length).toBe(3)
  })

  it('预测分支展示概率与状态', async () => {
    const { branches } = makeWorld()
    const wrapper = await mountPanel(branches)

    const select = wrapper.find('.bvp-predict select')
    await select.setValue('bA')
    await wrapper.find('.bvp-predict-btn').trigger('click')

    expect(wrapper.find('.bvp-prediction').exists()).toBe(true)
    expect(wrapper.text()).toContain('置信度')
    expect(wrapper.text()).toContain('维持')
    expect(wrapper.text()).toContain('分叉')
    expect(wrapper.findAll('.bvp-state').length).toBeGreaterThanOrEqual(2)
  })

  it('点击分支节点触发预测', async () => {
    const { branches } = makeWorld()
    const wrapper = await mountPanel(branches)

    await wrapper.findAll('.bvp-node')[1].trigger('click')

    expect(wrapper.find('.bvp-prediction').exists()).toBe(true)
    expect(wrapper.text()).toContain('副业线')
  })
})
