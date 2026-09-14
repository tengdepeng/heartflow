import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const h = vi.hoisted(() => {
  const daysAgo = (n: number): string => {
    const d = new Date(Date.now() - n * 86400000)
    return d.toISOString()
  }
  const seedNotes = (): any[] => [
    {
      id: 'n-1', title: '晨间冥想', content: 'a'.repeat(2500),
      tags: ['冥想', '健康', '习惯', '生活'], createdAt: daysAgo(0), updatedAt: daysAgo(0),
    },
    {
      id: 'n-2', title: '读书笔记', content: 'b'.repeat(800),
      tags: ['阅读', '学习', '笔记'], createdAt: daysAgo(5), updatedAt: daysAgo(5),
    },
    {
      id: 'n-3', title: '灵感碎片', content: 'c'.repeat(80),
      tags: ['灵感'], createdAt: daysAgo(20), updatedAt: daysAgo(20),
    },
    {
      id: 'n-4', title: '短', content: 'd'.repeat(30),
      tags: [], createdAt: daysAgo(100), updatedAt: daysAgo(100),
    },
  ]
  const state = { __v_isRef: true, value: [] as any[] }
  return { study: { notes: state }, seedNotes }
})

vi.mock('../../modules/study', () => ({
  useStudy: () => h.study,
}))

import NoteHealthArchivePanel from '../NoteHealthArchivePanel.vue'

function getWrapper() {
  return mount(NoteHealthArchivePanel)
}

describe('NoteHealthArchivePanel · 笔记健康档案（INCR-137 / INCR-51 恢复）', () => {
  beforeEach(() => {
    h.study.notes.value.length = 0
  })

  it('空态：书房未启引导', () => {
    const wrapper = getWrapper()
    expect(wrapper.find('.nhap-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('书房未启')
    expect(wrapper.text()).toContain('书房还空着')
  })

  it('标题与健康徽章：等级 ∈ 五态', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('笔记健康档案')
    const badge = wrapper.find('.nhap-badge')
    expect(badge.exists()).toBe(true)
    expect(['优秀', '良好', '一般', '较差', '严重']).toContain(badge.text())
  })

  it('健康度摘要：平均分 65 + 五级分布 优秀1良好1一般1较差1严重0', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('平均健康分')
    expect(wrapper.text()).toContain('65')
    expect(wrapper.text()).toContain('优秀 1')
    expect(wrapper.text()).toContain('良好 1')
    expect(wrapper.text()).toContain('一般 1')
    expect(wrapper.text()).toContain('较差 1')
    expect(wrapper.text()).toContain('严重 0')
    expect(wrapper.text()).toContain('1 篇笔记需要关注')
  })

  it('写作统计六格：4 总笔记 + 字数分布桶', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('总笔记')
    expect(wrapper.text()).toContain('总字数')
    expect(wrapper.text()).toContain('平均字数')
    expect(wrapper.text()).toContain('最长')
    expect(wrapper.text()).toContain('最短')
    expect(wrapper.text()).toContain('中位数')
    expect(wrapper.text()).toContain('1-100字')
    expect(wrapper.text()).toContain('501-1000字')
    expect(wrapper.text()).toContain('1001-3000字')
  })

  it('标签分析：平均标签 2 + 无标签 1 + 高频标签', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('平均标签')
    expect(wrapper.text()).toContain('无标签')
    expect(wrapper.text()).toContain('无标签占比')
    expect(wrapper.text()).toContain('#冥想')
    expect(wrapper.text()).toContain('#阅读')
  })

  it('生命周期四格：活跃4·归档0·回收站0·归档率0%', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('活跃')
    expect(wrapper.text()).toContain('归档')
    expect(wrapper.text()).toContain('回收站')
    expect(wrapper.text()).toContain('归档率')
  })

  it('内容质量五格：唯一词/标题长度/段落/含链接/含代码', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('唯一词')
    expect(wrapper.text()).toContain('标题长度')
    expect(wrapper.text()).toContain('段落')
    expect(wrapper.text()).toContain('含链接')
    expect(wrapper.text()).toContain('含代码')
  })

  it('待打磨：最低分「短」32 + 首条建议', () => {
    h.study.notes.value.push(...h.seedNotes())
    const wrapper = getWrapper()
    expect(wrapper.text()).toContain('待打磨')
    expect(wrapper.text()).toContain('短')
    expect(wrapper.text()).toContain('32')
    expect(wrapper.text()).toContain('笔记内容过短，建议扩展至 100 字以上')
  })
})
