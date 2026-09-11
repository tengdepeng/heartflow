// ============================================================
// KnowledgeGraphPanel 知识图谱档案面板测试
// INCR-230 薄委托化：组件改为 notes 输入 props（移除内部 useStudy）
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import KnowledgeGraphPanel from '../KnowledgeGraphPanel.vue'

function makeNote(overrides: Record<string, any> = {}): any {
  const now = new Date().toISOString()
  return {
    id: `n_${Math.random().toString(36).slice(2, 7)}`,
    title: '笔记',
    content: '内容',
    tags: [] as string[],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function mountPanel(notes: any[] = []) {
  return mount(KnowledgeGraphPanel, { props: { notes } })
}

describe('KnowledgeGraphPanel 知识图谱档案面板', () => {
  beforeEach(() => {
    // 无跨用例状态；每用例独立 mount
  })

  // ------- 空态（空 props） -------
  it('空 props 显示引导语与图谱未启徽章', async () => {
    const wrapper = mountPanel([])
    await nextTick()
    expect(wrapper.find('.kgp-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('知识图谱')
    expect(wrapper.text()).toContain('图谱未启')
    expect(wrapper.text()).toContain('书架还空着')
  })

  // ------- 填充态概览 -------
  it('有数据时显示徽章与图谱概览统计', async () => {
    const notes = [
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    expect(wrapper.text()).toContain('知识图谱')
    expect(wrapper.text()).toContain('节点')
    expect(wrapper.text()).toContain('关联')
    expect(wrapper.text()).toContain('密度')
    expect(wrapper.text()).toContain('聚类')
    expect(wrapper.text()).toContain('孤立')
    expect(wrapper.text()).toContain('枢纽')
  })

  it('节点数统计正确（3 笔记 + 1 标签 = 4 节点）', async () => {
    const notes = [
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    const stats = wrapper.findAll('.kgp-stat-num')
    expect(stats[0].text()).toBe('4')
  })

  // ------- 图谱星图 -------
  it('渲染标签星座 SVG 与共现边', async () => {
    const notes = [
      makeNote({ tags: ['甲', '乙'] }),
      makeNote({ tags: ['甲', '乙'] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    expect(wrapper.find('.kgp-svg').exists()).toBe(true)
    expect(wrapper.findAll('.kgp-svg-node').length).toBe(2)
    expect(wrapper.findAll('.kgp-svg-edge').length).toBe(1)
    expect(wrapper.text()).toContain('图谱星图')
  })

  it('无标签时不渲染星座', async () => {
    const wrapper = mountPanel([makeNote({ tags: [] })])
    await nextTick()
    expect(wrapper.find('.kgp-svg').exists()).toBe(false)
  })

  // ------- 知识发现 -------
  it('渲染知识发现（聚类与孤立）', async () => {
    const notes = [
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: [] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    expect(wrapper.text()).toContain('知识发现')
    expect(wrapper.text()).toContain('聚类')
    expect(wrapper.text()).toContain('孤立')
  })

  it('孤立笔记触发孤立发现与建议', async () => {
    const now = new Date().toISOString()
    const earlier = new Date(Date.now() - 3600_000).toISOString()
    const notes = [
      makeNote({ id: 'n1', tags: ['甲'], createdAt: now, updatedAt: now }),
      makeNote({ id: 'n2', tags: [], createdAt: earlier, updatedAt: earlier }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    expect(wrapper.text()).toContain('孤立')
    expect(wrapper.text()).toContain('添加标签')
  })

  // ------- 核心标签 -------
  it('高连接标签显示为核心标签', async () => {
    const notes = [
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    expect(wrapper.text()).toContain('核心标签')
    expect(wrapper.findAll('.kgp-hub-chip').length).toBeGreaterThan(0)
  })

  // ------- 温和洞察 -------
  it('显示温和洞察且不超过 4 条', async () => {
    const notes = [
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: ['甲'] }),
      makeNote({ tags: [] }),
    ]
    const wrapper = mountPanel(notes)
    await nextTick()
    const insights = wrapper.findAll('.kgp-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('孤立笔记洞察文案出现', async () => {
    const wrapper = mountPanel([makeNote({ tags: [] })])
    await nextTick()
    expect(wrapper.text()).toContain('孤立在谱外')
  })
})