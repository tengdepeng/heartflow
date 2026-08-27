// ============================================================
// 输出管理 · 高级检索/批量/导出面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function record(overrides: Record<string, any> = {}) {
  return {
    id: `or_${Math.random().toString(36).slice(2, 8)}`,
    type: 'note',
    content: '一篇输出记录',
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    roomSource: '思绪书房',
    status: 'published',
    ...overrides,
  }
}

async function mountPanel(records: any[] = [], updateRecord?: any, deleteRecord?: any) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../OutputAdvancedPanel.vue')
  const wrapper = mount(mod.default, {
    props: {
      records,
      updateRecord: updateRecord ?? (() => true),
      deleteRecord: deleteRecord ?? (() => true),
    },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('OutputAdvancedPanel 高级检索/批量/导出', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('高级检索')
    expect(wrapper.text()).toContain('批量操作')
    expect(wrapper.text()).toContain('导出')
    expect(wrapper.text()).toContain('命中 0 / 0 条')
  })

  it('关键词过滤命中数', async () => {
    const records = [
      record({ content: '关于春天的笔记' }),
      record({ content: '关于秋天的笔记' }),
      record({ content: '一段情绪记录', type: 'emotion' }),
    ]
    const wrapper = await mountPanel(records)
    const keywordInput = wrapper.findAll('input.oa-input')[0]
    await keywordInput.setValue('春天')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('命中 1 / 3 条')
  })

  it('类型筛选命中数', async () => {
    const records = [
      record({ type: 'note' }),
      record({ type: 'emotion' }),
      record({ type: 'anchor' }),
    ]
    const wrapper = await mountPanel(records)
    // 点击「笔记」类型 chip（第一个）
    await wrapper.findAll('.oa-chip')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('命中 1 / 3 条')
  })

  it('保存并应用过滤预设', async () => {
    const records = [record({ content: '春天来了' }), record({ content: '冬天来了' })]
    const wrapper = await mountPanel(records)
    // 设置关键词
    const keywordInput = wrapper.findAll('input.oa-input')[0]
    await keywordInput.setValue('春天')
    await wrapper.vm.$nextTick()
    // 保存预设
    const presetInput = wrapper.findAll('input.oa-grow')[1]
    await presetInput.setValue('春之预设')
    await wrapper.findAll('button.oa-btn').find(b => b.text() === '保存预设')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('春之预设')
    // 重置后应用预设
    await wrapper.findAll('button.oa-btn').find(b => b.text() === '重置')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('命中 2 / 2 条')
    await wrapper.find('.oa-preset').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('命中 1 / 2 条')
  })

  it('批量归档调用 updateRecord', async () => {
    const records = [record({ id: 'r1' }), record({ id: 'r2' })]
    const updateRecord = vi.fn(() => true)
    const wrapper = await mountPanel(records, updateRecord)
    // 全选
    await wrapper.find('.oa-check input').trigger('change')
    await wrapper.vm.$nextTick()
    // 归档
    await wrapper.findAll('button.oa-btn').find(b => b.text() === '归档')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(updateRecord).toHaveBeenCalledTimes(2)
    expect(updateRecord).toHaveBeenCalledWith('r1', { status: 'archived' })
    expect(wrapper.text()).toContain('操作历史')
  })

  it('批量删除调用 deleteRecord', async () => {
    const records = [record({ id: 'r1' }), record({ id: 'r2' })]
    const deleteRecord = vi.fn(() => true)
    const wrapper = await mountPanel(records, undefined, deleteRecord)
    ;(globalThis as any).confirm = () => true
    await wrapper.find('.oa-check input').trigger('change')
    await wrapper.vm.$nextTick()
    await wrapper.findAll('button.oa-btn').find(b => b.text() === '删除')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(deleteRecord).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('操作历史')
  })

  it('导出生成导出历史', async () => {
    const records = [record({ content: '可导出的记录' })]
    const wrapper = await mountPanel(records)
    await wrapper.findAll('button.oa-btn').find(b => b.text() === '导出当前过滤')!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('导出历史')
    expect(wrapper.text()).toContain('JSON')
    expect(wrapper.text()).toContain('1 条')
  })
})
