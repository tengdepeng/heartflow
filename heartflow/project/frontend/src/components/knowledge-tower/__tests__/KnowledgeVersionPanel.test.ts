import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const NODES_KEY = 'hf:knowledge_nodes'
const VERSIONS_KEY = 'hf:knowledge:versions'

function makeNode(overrides: Record<string, any> = {}) {
  return {
    id: 'n_' + Math.random().toString(36).slice(2, 7),
    title: '测试节点',
    desc: '一段描述',
    tags: ['心流'],
    cat: 'concept',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function makeVersion(overrides: Record<string, any> = {}) {
  return {
    id: 'version-n1-1',
    nodeId: 'n1',
    version: 1,
    title: '测试节点',
    desc: '一段描述',
    tags: ['心流'],
    category: 'concept',
    changeDescription: '手动留档',
    changedAt: '2026-01-01T00:00:00.000Z',
    changeType: 'update',
    ...overrides,
  }
}

async function mountPanel(nodes: Record<string, any>[] = [], versions: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (nodes.length) kvStore[NODES_KEY] = nodes
  if (versions.length) kvStore[VERSIONS_KEY] = versions
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../KnowledgeVersionPanel.vue')
  const wrapper = mount(mod.default)
  return wrapper
}

function storedVersions(): any[] {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[VERSIONS_KEY] ?? []
}

describe('KnowledgeVersionPanel 版本留档', () => {
  it('无知识节点时展示空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('版本留档')
    expect(wrapper.text()).toContain('还没有知识节点')
  })

  it('有节点但无留档时，选中节点并捕获快照产生 v1', async () => {
    const wrapper = await mountPanel([makeNode({ id: 'n1', title: '记忆宫殿' })])
    expect(wrapper.text()).toContain('选择节点')
    expect(wrapper.text()).toContain('全部节点')

    await wrapper.find('.kvp-chip').trigger('click')
    expect(wrapper.text()).toContain('捕获快照')
    expect(wrapper.text()).toContain('这个节点还没有留档')

    await wrapper.find('.kvp-btn').trigger('click')
    expect(wrapper.text()).toContain('已捕获 v1')

    const versions = storedVersions()
    expect(versions.length).toBe(1)
    expect(versions[0].version).toBe(1)
    expect(versions[0].nodeId).toBe('n1')
    expect(versions[0].changeType).toBe('update')
  })

  it('已有留档时自动选中，展开显示快照与上一版本对比', async () => {
    const kv = [
      makeVersion({ id: 'v1', version: 1, title: '记忆宫殿', desc: '初版描述', changeDescription: '创建' }),
      makeVersion({
        id: 'v2', version: 2, title: '记忆宫殿', desc: '修订后的描述', changeDescription: '更新',
        changedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]
    const wrapper = await mountPanel([makeNode({ id: 'n1', title: '记忆宫殿' })], kv)
    // 自动选中已有留档节点
    expect(wrapper.text()).toContain('已有留档')
    expect(wrapper.findAll('.kvp-version').length).toBe(2)

    // 展开 v2（第一个，降序）
    await wrapper.find('.kvp-version-head').trigger('click')
    expect(wrapper.find('.kvp-version-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('修订后的描述')
    expect(wrapper.text()).toContain('与 v1 对比')
    expect(wrapper.text()).toContain('描述')
  })

  it('回滚到指定版本生成回滚记录', async () => {
    const kv = [
      makeVersion({ id: 'v1', version: 1, title: '记忆宫殿', desc: '初版描述', changeDescription: '创建' }),
      makeVersion({
        id: 'v2', version: 2, title: '记忆宫殿', desc: '修订后的描述', changeDescription: '更新',
        changedAt: '2026-01-02T00:00:00.000Z',
      }),
    ]
    const wrapper = await mountPanel([makeNode({ id: 'n1', title: '记忆宫殿' })], kv)
    await wrapper.find('.kvp-version-head').trigger('click')

    await wrapper.find('.kvp-btn--rollback').trigger('click')
    expect(wrapper.text()).toContain('已回滚到 v2')

    // 回滚会生成一条 major_update 记录
    const versions = storedVersions()
    const rollback = versions.find(v => v.changeType === 'major_update')
    expect(rollback).toBeTruthy()
    expect(rollback.changeDescription).toContain('回滚到版本 2')
  })

  it('统计总览展示快照数与留档节点数', async () => {
    const kv = [
      makeVersion({ id: 'v1', version: 1, title: '节点A', changeDescription: '创建' }),
      makeVersion({ id: 'v2', version: 2, title: '节点A', changeDescription: '更新' }),
    ]
    const wrapper = await mountPanel([
      makeNode({ id: 'n1', title: '节点A' }),
      makeNode({ id: 'n2', title: '节点B' }),
    ], kv)
    expect(wrapper.find('.kvp-stat b').text()).toBe('2')
    expect(wrapper.text()).toContain('留档节点')
    expect(wrapper.text()).toContain('平均每节点')
  })
})
