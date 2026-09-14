import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { BodyLog } from '../../stores/health'
import HealthReportPanel from '../HealthReportPanel.vue'

// 控制存储：真实 useHealthReport 经 storage 加载/持久化报告与模板，测试仅 mock 存储层
const mockStore: Record<string, any> = {}

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (key: string, def: any) => mockStore[key] ?? def,
    setKV: (key: string, val: any) => { mockStore[key] = val },
  },
}))

function makeLog(type: BodyLog['type'], value: Record<string, any>, at: string, id: string): BodyLog {
  return { id, type, value, at }
}

/** 今日睡眠 + 运动记录（保证落在周报日期范围内） */
function todayLogs(): BodyLog[] {
  const now = new Date()
  const iso = now.toISOString()
  return [
    makeLog('sleep', { hours: 7.5 }, iso, 's1'),
    makeLog('exercise', { minutes: 30 }, iso, 'e1'),
  ]
}

function getWrapper(logs: BodyLog[]) {
  return mount(HealthReportPanel, { props: { logs } })
}

describe('HealthReportPanel · 健康报告档案（INCR-135）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
  })

  it('空态：无报告时显示引导与生成按钮', () => {
    const wrapper = getWrapper([])
    expect(wrapper.find('.hrp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('报告还没生成')
    expect(wrapper.find('.hrp-gen-btn').exists()).toBe(true)
  })

  it('空态洞察：无报告时给出守候引导', () => {
    const wrapper = getWrapper([])
    expect(wrapper.find('.hrp-insight').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无健康报告，点击「生成报告」创建一份')
  })

  it('生成周报：点击生成后报告出现在列表', async () => {
    const wrapper = getWrapper(todayLogs())
    await wrapper.find('.hrp-gen-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hrp-empty').exists()).toBe(false)
    const cards = wrapper.findAll('.hrp-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('健康周报')
  })

  it('切换周期：选月报后生成月报', async () => {
    const wrapper = getWrapper(todayLogs())
    const monthly = wrapper.findAll('.hrp-period').find((b) => b.text() === '月报')!
    await monthly.trigger('click')
    await wrapper.find('.hrp-gen-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const cards = wrapper.findAll('.hrp-card')
    expect(cards.length).toBe(1)
    expect(cards[0].text()).toContain('健康月报')
  })

  it('展开报告详情：显示摘要与建议', async () => {
    const wrapper = getWrapper(todayLogs())
    await wrapper.find('.hrp-gen-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.hrp-card').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hrp-detail').exists()).toBe(true)
    expect(wrapper.text()).toContain('追踪')
    expect(wrapper.find('.hrp-recs').exists()).toBe(true)
  })

  it('导出 Markdown：点击后显示导出内容', async () => {
    const wrapper = getWrapper(todayLogs())
    await wrapper.find('.hrp-gen-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.hrp-card').trigger('click')
    await wrapper.vm.$nextTick()
    const mdBtn = wrapper.findAll('.hrp-act').find((b) => b.text().includes('Markdown'))!
    await mdBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hrp-export').exists()).toBe(true)
    expect(wrapper.find('.hrp-export').text()).toContain('# ')
  })

  it('删除报告：删除后回到空态', async () => {
    const wrapper = getWrapper(todayLogs())
    await wrapper.find('.hrp-gen-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('.hrp-card').trigger('click')
    await wrapper.vm.$nextTick()
    const delBtn = wrapper.findAll('.hrp-act').find((b) => b.text().includes('删除'))!
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hrp-empty').exists()).toBe(true)
  })
})
