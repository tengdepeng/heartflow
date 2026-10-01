import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import KnowledgeGraph from '../KnowledgeGraph.vue'

const fixture = vi.hoisted(() => ({
  nodes: [
    { id: 'gn-a', label: 'A', knowledgeId: 'a', x: 100, y: 100, radius: 12, color: '#e06b6b', category: 'concept', tags: [], importance: 0.5, degree: 1, selected: false, highlighted: false, pinned: false },
    { id: 'gn-b', label: 'B', knowledgeId: 'b', x: 220, y: 180, radius: 12, color: '#6b9fc4', category: 'rule', tags: [], importance: 0.5, degree: 1, selected: false, highlighted: false, pinned: false },
  ],
  edges: [
    { id: 'ge-1', source: 'gn-a', target: 'gn-b', relationType: 'related', label: '', strength: 0.5, color: '#9aa7b5', highlighted: false },
  ],
}))

// 接上此前悬空的 useKnowledgeBridge(knowledge 侧)：验证视图确实消费它并渲染数据
vi.mock('../../modules/knowledge/knowledge-bridge', () => ({
  useKnowledgeBridge: () => ({
    graphData: { value: { nodes: fixture.nodes, edges: fixture.edges } },
    applyLayout: () => ({ nodes: [], edges: [], iterations: 0, converged: true, finalDisplacement: 0, convergenceHistory: [] }),
  }),
}))

describe('KnowledgeGraph（经略阁关系图谱 · 上盘孤儿链路）', () => {
  it('渲染：消费 bridge 数据画出节点与关系边', () => {
    const wrapper = mount(KnowledgeGraph)
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(false)
    expect(wrapper.findAll('.kg-node').length).toBe(2)
    expect(wrapper.findAll('line').length).toBe(1)
  })

  it('交互：重新布局按钮可点击且不报错', async () => {
    const wrapper = mount(KnowledgeGraph)
    const btn = wrapper.findAll('button').find((b) => b.text() === '重新布局')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
  })
})
