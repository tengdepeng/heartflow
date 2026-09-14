// ============================================================
// AI管家·连接与追问面板（KnowledgeStewardPanel）集成测试
// 覆盖：空态 / 标题副题 / 节点下拉 / 串网建议(分数条) /
//       建立连接后建议收敛 / 苏格拉底追问 / 无建议提示
// 数据源：storage['hf:knowledge_nodes'|'hf:knowledge_relations']，每例重新播种。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import KnowledgeStewardPanel from '../knowledge-tower/KnowledgeStewardPanel.vue'
import type { KnowledgeNode, KnowledgeCategory, KnowledgeRelation } from '../../modules/knowledge/types'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const clone = (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? clone(store[k]) : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = clone(v) })
  return { store, mockGetKV, mockSetKV }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

function node(id: string, title: string, cat: KnowledgeCategory = 'concept', tags: string[] = []): KnowledgeNode {
  return { id, title, desc: '', cat, tags, createdAt: '2026-01-01', updatedAt: '2026-01-01' }
}

function seed(nodes: KnowledgeNode[], relations: KnowledgeRelation[] = []) {
  Object.keys(store).forEach((k) => delete store[k])
  store['hf:knowledge_nodes'] = nodes
  store['hf:knowledge_relations'] = relations
}

describe('KnowledgeStewardPanel · AI管家连接与追问', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无知识节点时呈现礼貌空态', async () => {
    seed([])
    const w = mount(KnowledgeStewardPanel)
    expect(w.find('.ksp-title').text()).toContain('AI 管家 · 连接与追问')
    expect(w.find('.ksp-empty').exists()).toBe(true)
    expect(w.find('.ksp-empty p').text()).toContain('还没有知识节点')
    expect(w.find('.ksp-pick').exists()).toBe(false)
  })

  it('单一节点：无连接建议给出提示，但有苏格拉底追问', async () => {
    seed([node('a', '注意力机制', 'concept')])
    const w = mount(KnowledgeStewardPanel)
    await flushPromises()
    const opts = w.findAll('option')
    expect(opts.length).toBe(1)
    expect(opts[0].text()).toContain('注意力机制')
    expect(w.find('.ksp-note').text()).toContain('暂无新的连接建议')
    const qs = w.findAll('.ksp-question')
    expect(qs.length).toBeGreaterThan(0)
    expect(qs[0].text()).toContain('核心前提')
  })

  it('两个同分类节点：生成带分数条的串网建议并给出同类理由', async () => {
    seed([node('a', '反向传播', 'concept'), node('b', '梯度下降', 'concept')])
    const w = mount(KnowledgeStewardPanel)
    await flushPromises()
    const suggests = w.findAll('.ksp-suggest')
    expect(suggests.length).toBe(1)
    expect(suggests[0].text()).toContain('梯度下降')
    expect(suggests[0].text()).toContain('同属「概念」')
    const bar = suggests[0].find('.ksp-suggest-bar')
    expect(bar.attributes('style')).toContain('width: 30%')
  })

  it('分类与标签皆不同且无重叠时，无连接建议', async () => {
    seed([node('a', '唐诗', 'metaphor', ['poetry']), node('b', '青花瓷', 'rule', ['ceramic'])])
    const w = mount(KnowledgeStewardPanel)
    await flushPromises()
    expect(w.find('.ksp-suggest').exists()).toBe(false)
    expect(w.find('.ksp-note').text()).toContain('暂无新的连接建议')
  })

  it('点击「建立连接」后写入关系且建议收敛消失', async () => {
    seed([node('a', '递归', 'concept', ['算法']), node('b', '分治', 'concept', ['算法'])])
    const w = mount(KnowledgeStewardPanel)
    await flushPromises()
    expect(w.findAll('.ksp-suggest').length).toBe(1)
    await w.find('.ksp-link-btn').trigger('click')
    await nextTick()
    await flushPromises()
    // 关系已落库
    const stored = store['hf:knowledge_relations'] as KnowledgeRelation[]
    expect(stored.length).toBe(1)
    expect(stored[0].sourceId).toBe('a')
    expect(stored[0].label).toContain('AI 建议关联')
    // 建议移除后不再出现
    expect(w.find('.ksp-suggest').exists()).toBe(false)
  })

  it('切换聚焦节点会刷新建议与追问目标', async () => {
    seed([node('a', '哈希表', 'concept', ['结构']), node('b', 'B树', 'concept', ['结构']) , node('c', '情绪', 'metaphor', ['心理'])])
    const w = mount(KnowledgeStewardPanel)
    await flushPromises()
    // 默认聚焦 a：建议 b（同类），c 异类不计
    expect(w.findAll('.ksp-suggest').length).toBe(1)
    expect(w.find('.ksp-suggest-title').text()).toContain('B树')
    // 切到 c（metaphor）-> 建议空 + 追问主题为比喻
    await w.find('#ksp-select').setValue('c')
    await flushPromises()
    expect(w.find('.ksp-suggest').exists()).toBe(false)
    expect(w.find('.ksp-note').text()).toContain('暂无新的连接建议')
    expect(w.findAll('.ksp-question').length).toBeGreaterThan(0)
  })
})