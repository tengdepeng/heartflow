// ============================================================
// KnowledgeArchivePanel 测试 - 知识档案面板（INCR-18）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import KnowledgeArchivePanel from '../KnowledgeArchivePanel.vue'
import type { KNode, ImportSource } from '../../modules/knowledge'

const DAY = 24 * 60 * 60 * 1000

function makeNode(id: string, title: string, cat = 'concept', links: string[] = []): KNode {
  return { id, title, desc: '', cat, links }
}

function makeSource(id: string, type: ImportSource['type'], title: string, daysAgo = 0): ImportSource {
  return {
    id,
    type,
    title,
    content: '一段摘录',
    importedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
  }
}

function mountPanel(nodes: KNode[] = [], sources: ImportSource[] = []) {
  return mount(KnowledgeArchivePanel, { props: { nodes, sources } })
}

describe('KnowledgeArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('知识档案')
    expect(wrapper.text()).toContain('知识塔还空着')
    expect(wrapper.find('.kap-empty').exists()).toBe(true)
  })

  it('档案概览统计正确', () => {
    const nodes = [
      makeNode('a', '记忆宫殿', 'concept', ['b', 'c']),
      makeNode('b', '习惯回路', 'concept', ['c']),
      makeNode('c', '心流原则', 'insight', []),
      makeNode('d', '误区', 'pitfall', []),
    ]
    const wrapper = mountPanel(nodes, [makeSource('s1', 'book', '《心流》')])
    const text = wrapper.text()
    expect(text).toContain('档案概览')
    expect(text).toContain('知识节点')
    expect(text).toContain('已相连')
    expect(text).toContain('链接边')
    expect(text).toContain('分类数')
    expect(text).toContain('概念')
    expect(text).toContain('洞察')
    expect(wrapper.find('.kap-empty').exists()).toBe(false)
  })

  it('图谱形状与枢纽节点渲染', () => {
    const nodes = [
      makeNode('a', '核心', 'concept', ['b', 'c']),
      makeNode('b', '分支一', 'rule', ['a']),
      makeNode('c', '分支二', 'insight', []),
    ]
    const wrapper = mountPanel(nodes)
    const text = wrapper.text()
    expect(text).toContain('图谱形状')
    expect(text).toContain('连通率')
    expect(text).toContain('孤立节点')
    expect(text).toContain('枢纽节点')
    expect(text).toContain('核心')
  })

  it('导入来源聚合渲染', () => {
    const sources = [
      makeSource('s1', 'book', '《心流》'),
      makeSource('s2', 'web', '理解偏差', 1),
      makeSource('s3', 'call', '通话记录', 9),
    ]
    const wrapper = mountPanel([makeNode('a', '节点', 'concept')], sources)
    const text = wrapper.text()
    expect(text).toContain('导入来源')
    expect(text).toContain('总导入')
    expect(text).toContain('近7天')
    expect(text).toContain('书籍')
    expect(text).toContain('网页摘录')
    expect(text).toContain('通话磁带')
  })

  it('温和洞察生成', () => {
    const nodes = [
      makeNode('a', '枢纽知识', 'concept', ['b', 'b', 'b']),
      makeNode('b', '叶子', 'rule', []),
    ]
    const wrapper = mountPanel(nodes, [makeSource('s1', 'book', '《心流》')])
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.find('.kap-insights li').exists()).toBe(true)
  })
})