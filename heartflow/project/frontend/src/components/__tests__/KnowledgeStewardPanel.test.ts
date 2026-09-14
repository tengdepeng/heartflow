import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const NODES_KEY = 'hf:knowledge_nodes'
const RELATIONS_KEY = 'hf:knowledge_relations'

const seedNodes = [
  {
    id: 'n1',
    title: 'Vue 响应式',
    desc: '基于依赖收集的响应式系统',
    cat: 'concept',
    tags: ['vue', '前端', '框架'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'n2',
    title: '组合式 API',
    desc: 'Vue 3 组织逻辑的方式',
    cat: 'concept',
    tags: ['vue', '前端'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'n3',
    title: '番茄工作法',
    desc: '时间管理方法',
    cat: 'rule',
    tags: ['效率', '时间'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

async function mountPanel(seed: { nodes?: unknown[]; relations?: unknown[] } = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, unknown> = {}
  if (seed.nodes) kvStore[NODES_KEY] = seed.nodes
  if (seed.relations) kvStore[RELATIONS_KEY] = seed.relations
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../knowledge-tower/KnowledgeStewardPanel.vue')
  return mount(mod.default)
}

describe('KnowledgeStewardPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无节点时显示空状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.ksp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('还没有知识节点')
  })

  it('渲染节点选择器并默认选中第一个节点', async () => {
    const wrapper = await mountPanel({ nodes: seedNodes })
    expect(wrapper.find('.ksp-select').exists()).toBe(true)
    const options = wrapper.findAll('.ksp-select option')
    expect(options.length).toBe(3)
    expect((wrapper.find('.ksp-select').element as HTMLSelectElement).value).toBe('n1')
  })

  it('为同分类/同标签节点给出连接建议', async () => {
    const wrapper = await mountPanel({ nodes: seedNodes })
    await wrapper.vm.$nextTick()
    const titles = wrapper.findAll('.ksp-suggest-title').map((el) => el.text())
    expect(titles).toContain('组合式 API')
    // 番茄工作法分类/标签均不同，不应被建议
    expect(titles).not.toContain('番茄工作法')
  })

  it('生成苏格拉底追问（按分类模板）', async () => {
    const wrapper = await mountPanel({ nodes: seedNodes })
    await wrapper.vm.$nextTick()
    const questions = wrapper.findAll('.ksp-q-text').map((el) => el.text())
    expect(questions.length).toBeGreaterThan(0)
    expect(questions[0]).toContain('核心前提')
  })

  it('点击建立连接会写入关系并移除该建议', async () => {
    const wrapper = await mountPanel({ nodes: seedNodes })
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.ksp-suggest').length).toBeGreaterThan(0)
    await wrapper.find('.ksp-link-btn').trigger('click')
    await wrapper.vm.$nextTick()
    // 建立连接后该建议消失
    expect(wrapper.findAll('.ksp-suggest').length).toBe(0)
    const stored = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const relations = stored.kvStore[RELATIONS_KEY] as unknown[]
    expect(relations.length).toBe(1)
    expect((relations[0] as { sourceId: string }).sourceId).toBe('n1')
  })

  it('切换节点后建议与追问随之更新', async () => {
    const wrapper = await mountPanel({ nodes: seedNodes })
    await wrapper.vm.$nextTick()
    await wrapper.find('.ksp-select').setValue('n3')
    await wrapper.vm.$nextTick()
    // n3 是 rule 分类，无同分类/同标签候选
    expect(wrapper.findAll('.ksp-suggest').length).toBe(0)
    const questions = wrapper.findAll('.ksp-q-text').map((el) => el.text())
    expect(questions[0]).toContain('适用范围')
  })
})
