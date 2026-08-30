// ============================================================
// WisdomArchivePanel 测试 - 知微档案面板（INCR-17）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import WisdomArchivePanel from '../WisdomArchivePanel.vue'
import type { WisdomItem } from '../../modules/wisdom'
import type { HistoryItem } from '../../modules/wisdom/history'

const NOW = new Date('2026-08-01T12:00:00.000Z').getTime()
const DAY = 24 * 60 * 60 * 1000

function makeItem(id: string, question: string, answer: string, tags: string[], daysAgo = 0): WisdomItem {
  return {
    id,
    question,
    answer,
    createdAt: new Date(NOW - daysAgo * DAY).toISOString(),
    tags,
  }
}

function makeHistory(id: string, q: string, daysAgo = 0): HistoryItem {
  return { id, q, a: '一段回看', at: new Date(NOW - daysAgo * DAY).toISOString() }
}

function mountPanel(entries: WisdomItem[], history: HistoryItem[] = []) {
  return mount(WisdomArchivePanel, { props: { entries, history } })
}

describe('WisdomArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('空库渲染档案标题与空态引导', () => {
    const wrapper = mountPanel([])
    expect(wrapper.text()).toContain('知微档案')
    expect(wrapper.text()).toContain('知微阁还是空白的')
  })

  it('档案概览统计正确', () => {
    const entries = [
      makeItem('a', '最近状态怎么样？', '专注而平静，状态稳定。', ['近况']),
      makeItem('b', '情绪如何？', '有几次低落，也有开心。', ['情绪']),
      makeItem('c', '工作怎么样？', '', ['工作']),
    ]
    const history = [makeHistory('h1', '最近状态怎么样？'), makeHistory('h2', '又来看一次', 5)]
    const wrapper = mountPanel(entries, history)
    const text = wrapper.text()
    expect(text).toContain('档案概览')
    expect(text).toContain('总记录')
    expect(text).toContain('累计对话')
    expect(text).toContain('覆盖标签')
    expect(text).toContain('覆盖领域')
    expect(wrapper.find('.wap-empty').exists()).toBe(false)
  })

  it('领域分布渲染（专注/情绪）', () => {
    const entries = [
      makeItem('a', '最近状态怎么样？', '专注而平静。', ['近况']),
      makeItem('b', '情绪如何？', '有低落也有开心。', ['情绪']),
    ]
    const wrapper = mountPanel(entries)
    const text = wrapper.text()
    expect(text).toContain('领域分布')
    expect(text).toContain('专注')
    expect(text).toContain('情绪')
  })

  it('标签分布与月度分布渲染', () => {
    const entries = [
      makeItem('a', '最近状态怎么样？', '专注而平静。', ['近况', '状态'], 2),
      makeItem('b', '情绪如何？', '有低落也有开心。', ['情绪'], 30),
    ]
    const wrapper = mountPanel(entries)
    const text = wrapper.text()
    expect(text).toContain('标签分布')
    expect(text).toContain('月度分布')
    expect(text).toContain('近况')
  })

  it('回看节律渲染', () => {
    const entries = [makeItem('a', '最近状态怎么样？', '专注而平静。', ['近况'], 2)]
    const history = [makeHistory('h1', '近况'), makeHistory('h2', '又看一次', 5)]
    const wrapper = mountPanel(entries, history)
    expect(wrapper.text()).toContain('回看节律')
    expect(wrapper.text()).toContain('近30天记录')
    expect(wrapper.text()).toContain('累计对话')
  })

  it('知微健康分数与标签渲染', () => {
    const entries = [
      makeItem('a', '最近状态怎么样？', '专注而平静，一周以来稳定地交替着来。', ['近况', '状态'], 2),
      makeItem('b', '情绪如何？', '有几次低落，也有许多开心，整体平稳。', ['情绪'], 5),
      makeItem('c', '工作怎么样？', '本周专注了十四个小时，节奏健康。', ['工作'], 8),
    ]
    const wrapper = mountPanel(entries)
    expect(wrapper.text()).toContain('知微健康')
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('深度')
    expect(wrapper.text()).toContain('延续')
  })

  it('高频标签与温和洞察生成', () => {
    const entries = [
      makeItem('a', '最近状态怎么样？', '专注而平静。', ['状态'], 2),
      makeItem('b', '情绪如何？', '有低落也有开心。', ['情绪'], 5),
    ]
    const wrapper = mountPanel(entries)
    expect(wrapper.text()).toContain('高频标签')
    expect(wrapper.find('.wap-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.find('.wap-insights li').exists()).toBe(true)
  })
})