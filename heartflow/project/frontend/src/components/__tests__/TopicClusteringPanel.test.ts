// ============================================================
// TopicClusteringPanel 对话主题洞察面板测试（INCR-89）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- Storage Mock（barrel 导入链含 storage） ----
const { mockKV, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const mockKV = new Map<string, any>()
  return {
    mockKV,
    mockGetKV: vi.fn((key: string, fallback?: any) => mockKV.get(key) ?? fallback),
    mockSetKV: vi.fn((key: string, val: any) => { mockKV.set(key, val) }),
  }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, fallback?: any) => mockGetKV(key, fallback),
    setKV: (key: string, val: any) => mockSetKV(key, val),
  },
}))

import TopicClusteringPanel from '../TopicClusteringPanel.vue'

function makeTalk(id: string, text: string, at = '2026-09-01T10:00:00.000Z') {
  return { id, text, at, roomContext: null }
}

async function mountPanel(talks: any[]) {
  const wrapper = mount(TopicClusteringPanel, {
    props: { talks },
  })
  await nextTick()
  return wrapper
}

describe('TopicClusteringPanel 对话主题洞察', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockKV.clear()
  })

  it('空数据渲染标题与空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('对话主题洞察')
    expect(wrapper.text()).toContain('0 主题')
    expect(wrapper.text()).toContain('还没有足够的自我对话')
  })

  it('有自我对话时聚类出主题并展示统计', async () => {
    const talks = [
      makeTalk('t1', '今天工作很忙，需要专注'),
      makeTalk('t2', '工作压力很大，想放松'),
      makeTalk('t3', '周末去爬山，亲近自然'),
    ]
    const wrapper = await mountPanel(talks)
    expect(wrapper.text()).toContain('主题总数')
    // 至少聚类出一个主题（工作）
    expect(wrapper.text()).toContain('工作')
  })

  it('高频关键词展示', async () => {
    const talks = [
      makeTalk('t1', '工作很忙，专注很重要'),
      makeTalk('t2', '工作压力大，专注放松'),
      makeTalk('t3', '工作之外也要专注生活'),
    ]
    const wrapper = await mountPanel(talks)
    expect(wrapper.text()).toContain('高频关键词')
    expect(wrapper.text()).toContain('工作')
  })

  it('搜索过滤主题', async () => {
    const talks = [
      makeTalk('t1', '工作很忙，需要专注'),
      makeTalk('t2', '工作压力很大，想放松'),
      makeTalk('t3', '周末去爬山，亲近自然'),
    ]
    const wrapper = await mountPanel(talks)
    await wrapper.find('input.tcl-input').setValue('工作')
    await nextTick()
    expect(wrapper.text()).toContain('相关度')
  })

  it('搜索无匹配时显示空态', async () => {
    const talks = [
      makeTalk('t1', '工作很忙，需要专注'),
      makeTalk('t2', '工作压力很大，想放松'),
    ]
    const wrapper = await mountPanel(talks)
    await wrapper.find('input.tcl-input').setValue('不存在的词')
    await nextTick()
    expect(wrapper.text()).toContain('没有匹配的主题')
  })

  it('趋势区块渲染', async () => {
    const talks = [
      makeTalk('t1', '工作很忙，需要专注'),
      makeTalk('t2', '工作压力很大，想放松'),
    ]
    const wrapper = await mountPanel(talks)
    expect(wrapper.text()).toContain('趋势')
  })
})
