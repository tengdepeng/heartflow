// ============================================================
// 知识星图视图 · StarMap3D 孤儿 3D 接线验证
// 断言：真实 KV 知识节点能灌入 StarMap3D 并渲染 3D 节点；
// 空数据时显示空态而非报错。
// ============================================================
import { describe, it, expect, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import StarMapView from '../StarMapView.vue'
import { storage } from '@/engine/storage'
import type { KnowledgeNode, KnowledgeRelation } from '@/modules/knowledge/types'

const NODES_KEY = 'hf:knowledge_nodes'
const RELATIONS_KEY = 'hf:knowledge_relations'

function makeNode(id: string, title: string, cat: KnowledgeNode['cat']): KnowledgeNode {
  const now = new Date().toISOString()
  return {
    id,
    title,
    desc: `${title} 的描述`,
    cat,
    tags: [],
    createdAt: now,
    updatedAt: now,
  }
}

function seed(nodes: KnowledgeNode[], relations: KnowledgeRelation[] = []): void {
  storage.setKV(NODES_KEY, nodes)
  storage.setKV(RELATIONS_KEY, relations)
}

beforeEach(() => {
  seed([], [])
})

describe('StarMapView', () => {
  it('有知识节点时渲染对应数量的 3D 节点', async () => {
    seed(
      [
        makeNode('n1', '心流', 'concept'),
        makeNode('n2', '专注', 'rule'),
        makeNode('n3', '复盘', 'insight'),
      ],
      [{ id: 'r1', sourceId: 'n1', targetId: 'n2', type: 'related', label: '关联', createdAt: new Date().toISOString() }],
    )

    const wrapper = mount(StarMapView)
    await flushPromises()
    const rendered = wrapper.findAll('.sm3d-node')
    expect(rendered.length).toBe(3)
  })

  it('点击 3D 节点后显示详情面板', async () => {
    seed([makeNode('n1', '心流', 'concept'), makeNode('n2', '专注', 'rule')])

    const wrapper = mount(StarMapView)
    await flushPromises()
    await wrapper.find('.sm3d-node').trigger('click')
    expect(wrapper.find('.smv-detail-title').exists()).toBe(true)
    expect(wrapper.find('.smv-detail-title').text()).toBe('心流')
  })

  it('无知识节点时显示空态且不渲染 3D 节点', async () => {
    const wrapper = mount(StarMapView)
    await flushPromises()
    expect(wrapper.find('.smv-empty').exists()).toBe(true)
    expect(wrapper.find('.sm3d-node').exists()).toBe(false)
  })
})
