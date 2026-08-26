// ============================================================
// 思绪书房 · 思维导图面板测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const MAPS_KEY = 'hf:mind_maps'
const CONNECTIONS_KEY = 'hf:mind_map_connections'

const mockNotes = ref<any[]>([])

vi.mock('../../modules/study', () => ({
  useStudy: () => ({ notes: mockNotes }),
}))

function note(overrides: Record<string, any> = {}) {
  return {
    id: `n_${Math.random().toString(36).slice(2, 8)}`,
    title: '测试笔记',
    content: '内容',
    tags: ['vue'],
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

function mapNode(overrides: Record<string, any> = {}) {
  return {
    id: 'node-root',
    label: '根节点',
    color: '#6b9fc4',
    children: [],
    expanded: true,
    level: 0,
    tags: [],
    isRoot: true,
    weight: 1,
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

function sampleMap(overrides: Record<string, any> = {}) {
  return {
    id: 'map-1',
    title: '测试导图',
    rootNode: mapNode(),
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    noteIds: [],
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
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
  const mod = await import('../MindMapPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('MindMapPanel 思维导图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNotes.value = []
  })

  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('思维导图')
    expect(wrapper.text()).toContain('导图概览')
    expect(wrapper.text()).toContain('还没有导图')
  })

  it('展示已有导图统计', async () => {
    const wrapper = await mountPanel({
      [MAPS_KEY]: [sampleMap()],
      [CONNECTIONS_KEY]: [],
    })
    expect(wrapper.text()).toContain('测试导图')
    expect(wrapper.text()).toContain('根节点')
  })

  it('创建导图并显示根节点', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('input.mm-input')
    await inputs[0].setValue('新导图')
    await inputs[1].setValue('核心主题')
    await wrapper.find('button.mm-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('新导图')
    expect(wrapper.text()).toContain('核心主题')
  })

  it('从笔记生成导图（按标签分组）', async () => {
    mockNotes.value = [
      note({ title: '笔记A', tags: ['vue'] }),
      note({ title: '笔记B', tags: ['vue'] }),
      note({ title: '笔记C', tags: ['rust'] }),
    ]
    const wrapper = await mountPanel()
    const buttons = wrapper.findAll('button.mm-btn')
    const genBtn = buttons.find(b => b.text().includes('从 3 条笔记生成'))!
    await genBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('笔记导图')
    expect(wrapper.text()).toContain('vue')
    expect(wrapper.text()).toContain('rust')
    expect(wrapper.text()).toContain('笔记A')
  })

  it('展开/折叠节点', async () => {
    const child = mapNode({ id: 'node-child', label: '子节点', isRoot: false, level: 1 })
    const root = mapNode({ children: [child] })
    const wrapper = await mountPanel({
      [MAPS_KEY]: [sampleMap({ rootNode: root })],
      [CONNECTIONS_KEY]: [],
    })
    expect(wrapper.text()).toContain('子节点')
    await wrapper.find('button.mm-node-toggle').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('子节点')
  })

  it('添加子节点', async () => {
    const wrapper = await mountPanel({
      [MAPS_KEY]: [sampleMap()],
      [CONNECTIONS_KEY]: [],
    })
    await wrapper.find('button.mm-node-add').trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.mm-add-child input.mm-input')
    await input.setValue('新子节点')
    const addBtns = wrapper.findAll('.mm-add-child button.mm-btn-primary')
    await addBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('新子节点')
  })

  it('删除子节点', async () => {
    const child = mapNode({ id: 'node-child', label: '待删节点', isRoot: false, level: 1 })
    const root = mapNode({ children: [child] })
    const wrapper = await mountPanel({
      [MAPS_KEY]: [sampleMap({ rootNode: root })],
      [CONNECTIONS_KEY]: [],
    })
    expect(wrapper.text()).toContain('待删节点')
    await wrapper.find('button.mm-node-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删节点')
  })
})
