import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(records: unknown[] = [], countdowns: unknown[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {
      'hf:clepsydra_records': records,
      'hf:clepsydra_countdowns': countdowns,
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
})
