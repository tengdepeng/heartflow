import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import { localDateKey } from '../../modules/clepsydra'

async function mountPanel(records: unknown[] = [], countdowns: unknown[] = [], blocks: unknown[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {
      'hf:clepsydra_records': records,
      'hf:clepsydra_countdowns': countdowns,
      'hf:clepsydra_time_blocks': blocks,
    },
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ClepsydraPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

const now = new Date()
const iso = (offsetMin: number) => new Date(now.getTime() + offsetMin * 60000).toISOString()
const todayKey = (() => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
})()

describe('ClepsydraPanel 工作光仪', () => {
  it('空状态展示标题与提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('工作光仪')
    expect(wrapper.text()).toContain('工作计时')
    expect(wrapper.text()).toContain('暂无工作记录')
    expect(wrapper.text()).toContain('还没有倒计时')
  })

  it('展示已有工作记录与今日汇总', async () => {
    const records = [
      { id: 'r1', startedAt: iso(-120), endedAt: iso(-60), durationSeconds: 3600, category: 'project', sourceType: 'manual', intensity: 0.7, note: '写周报', createdAt: iso(-120) },
      { id: 'r2', startedAt: iso(-30), endedAt: iso(-10), durationSeconds: 1200, category: 'study', sourceType: 'manual', intensity: 0.5, note: '', createdAt: iso(-30) },
    ]
    const wrapper = await mountPanel(records)
    expect(wrapper.text()).toContain('写周报')
    expect(wrapper.text()).toContain('项目')
    expect(wrapper.text()).toContain('学习')
    expect(wrapper.text()).toContain('总时长')
    expect(wrapper.text()).toContain('记录数')
  })

  it('开始计时后显示进行中状态', async () => {
    const wrapper = await mountPanel()
    const startBtn = wrapper.findAll('button').find(b => b.text().includes('开始计时'))
    expect(startBtn).toBeTruthy()
    await startBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('结束')
    expect(wrapper.text()).toContain('项目')
  })

  it('添加倒计时哨塔并展示', async () => {
    const wrapper = await mountPanel()
    const labelInput = wrapper.find('input.clp-input')
    await labelInput.setValue('番茄专注')
    const addBtn = wrapper.findAll('button').find(b => b.text() === '添加')
    await addBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('番茄专注')
    expect(wrapper.text()).toContain('待开始')
  })

  it('删除工作记录后列表更新', async () => {
    const records = [
      { id: 'r1', startedAt: iso(-120), endedAt: iso(-60), durationSeconds: 3600, category: 'project', sourceType: 'manual', intensity: 0.7, note: '待删除记录', createdAt: iso(-120) },
    ]
    const wrapper = await mountPanel(records)
    expect(wrapper.text()).toContain('待删除记录')
    const delBtn = wrapper.findAll('button.clp-btn--danger').find(b => b.text() === '✕')
    await delBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删除记录')
  })

  it('专注块绑定真实专注会话 → 渲染「专注块 · 计划 vs 实际专注」节（INCR-425）', async () => {
    const block = {
      id: 'fb1', date: todayKey, startMin: 540, durationMin: 60, category: 'project',
      title: '写周报', taskId: null, done: false,
    }
    const records = [
      { id: 'm1', startedAt: iso(-120), endedAt: iso(-60), durationSeconds: 2700, category: 'project', sourceType: 'manual', intensity: 0.7, note: '写周报', createdAt: iso(-120), blockId: 'fb1' },
    ]
    const wrapper = await mountPanel(records, [], [block])
    expect(wrapper.text()).toContain('专注块 · 计划 vs 实际专注')
    expect(wrapper.text()).toContain('写周报')
    expect(wrapper.text()).toContain('计划')
    expect(wrapper.text()).toContain('实际专注')
    // 计划 60 分 vs 实际 45 分（2700s）→ 偏差 +(-15) 分
    expect(wrapper.text()).toContain('60')
    expect(wrapper.text()).toContain('45分')
    expect(wrapper.text()).toContain('偏差')
  })

  it('无绑定专注会话 → 该节不渲染（INCR-425）', async () => {
    const block = {
      id: 'fb2', date: todayKey, startMin: 540, durationMin: 30, category: 'study',
      title: '读书', taskId: null, done: false,
    }
    const wrapper = await mountPanel([], [], [block])
    expect(wrapper.text()).not.toContain('专注块 · 计划 vs 实际专注')
  })

  it('块完成联动的 auto 代理记录不计入实际专注（INCR-425 排除 auto）', async () => {
    const block = {
      id: 'fb3', date: todayKey, startMin: 540, durationMin: 45, category: 'study',
      title: '仅联动', taskId: null, done: true,
    }
    // 仅 auto 代理，无 manual 真实专注会话 → 不聚合
    const records = [
      { id: 'a1', startedAt: iso(-120), endedAt: iso(-75), durationSeconds: 2700, category: 'study', sourceType: 'auto', intensity: 0.5, note: '时间块·仅联动', createdAt: iso(-120), sourceAnchorId: 'fb3' },
    ]
    const wrapper = await mountPanel(records, [], [block])
    expect(wrapper.text()).not.toContain('专注块 · 计划 vs 实际专注')
  })

  it('月视图趋势：块绑定真实专注会话 → 渲染「专注趋势」节（执行率 75%、偏差 under 柱高 75%）', async () => {
    const today = localDateKey(new Date())
    const block = {
      id: 'tr1', date: today, startMin: 540, durationMin: 60, category: 'project',
      title: '周报块', taskId: null, done: false,
    }
    const records = [
      { id: 'm1', startedAt: today + 'T09:30:00', endedAt: today + 'T10:15:00', durationSeconds: 2700, category: 'project', sourceType: 'manual', intensity: 0.7, note: '周报块', createdAt: today + 'T09:30:00' },
    ]
    const wrapper = await mountPanel(records, [], [block])
    expect(wrapper.find('.clp-trend-summary').exists()).toBe(true)
    // 计划 60 分 / 实际 45 分 → 执行率 75%
    expect(wrapper.find('.clp-trend-summary').text()).toContain('执行率 75%')
    // 实际柱高度 = 45/60 = 75%，偏差 under 着色
    const bars = wrapper.findAll('.clp-trend-actual')
    const hit = bars.find(b => (b.element as HTMLElement).style.height === '75%')
    expect(hit).toBeTruthy()
    expect(hit!.classes()).toContain('clp-trend--under')
    // 计划目标线存在
    expect(wrapper.find('.clp-trend-goal').exists()).toBe(true)
  })

  it('月视图趋势：窗口内无数据 → 趋势节不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.clp-trend-chart').exists()).toBe(false)
  })

  it('季视图趋势：切到「季」标签 → 趋势节显示「近一季」且仍有柱', async () => {
    const today = localDateKey(new Date())
    const block = {
      id: 'tr2', date: today, startMin: 540, durationMin: 60, category: 'project',
      title: '季块', taskId: null, done: false,
    }
    const records = [
      { id: 'm2', startedAt: today + 'T09:30:00', endedAt: today + 'T10:15:00', durationSeconds: 2700, category: 'project', sourceType: 'manual', intensity: 0.7, note: '季块', createdAt: today + 'T09:30:00' },
    ]
    const wrapper = await mountPanel(records, [], [block])
    const quarterBtn = wrapper.findAll('button').find(b => b.text() === '季')
    expect(quarterBtn).toBeTruthy()
    await quarterBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.clp-trend-head').text()).toContain('近一季')
    expect(wrapper.find('.clp-trend-chart').exists()).toBe(true)
  })
})
