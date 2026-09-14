// ============================================================
// 输出管理 · 快贴剪贴板面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ClipboardPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('ClipboardPanel 快贴剪贴板', () => {
  it('渲染空态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('快贴')
    expect(wrapper.text()).toContain('剪贴板')
    expect(wrapper.text()).toContain('还没有剪贴板历史')
    expect(wrapper.text()).toContain('还没有片段')
  })

  it('留存文本并持久化', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.clp-textarea').setValue('你好，心流')
    await wrapper.find('.clp-btn-primary').trigger('click')
    expect(wrapper.text()).toContain('你好，心流')
    expect(wrapper.findAll('.clp-item').length).toBe(1)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:output:clipboard']).toHaveLength(1)
    expect(saved.kvStore['hf:output:clipboard'][0].text).toBe('你好，心流')
  })

  it('固定 / 取消固定', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.clp-textarea').setValue('重要内容')
    await wrapper.find('.clp-btn-primary').trigger('click')
    // 固定
    await wrapper.find('.clp-item-actions .clp-mini').trigger('click')
    expect(wrapper.find('.clp-item').classes()).toContain('is-pinned')
    // 取消固定
    await wrapper.find('.clp-item-actions .clp-mini').trigger('click')
    expect(wrapper.find('.clp-item').classes()).not.toContain('is-pinned')
  })

  it('搜索过滤历史', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.clp-textarea').setValue('邮箱 example@x.com')
    await wrapper.find('.clp-btn-primary').trigger('click')
    await wrapper.find('.clp-textarea').setValue('无关内容')
    await wrapper.find('.clp-btn-primary').trigger('click')
    await wrapper.find('.clp-history .clp-input').setValue('邮箱')
    expect(wrapper.findAll('.clp-item').length).toBe(1)
    expect(wrapper.text()).toContain('邮箱 example@x.com')
  })

  it('删除历史条目', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.clp-textarea').setValue('待删除')
    await wrapper.find('.clp-btn-primary').trigger('click')
    expect(wrapper.findAll('.clp-item').length).toBe(1)
    await wrapper.find('.clp-item-actions .clp-mini-danger').trigger('click')
    expect(wrapper.findAll('.clp-item').length).toBe(0)
    expect(wrapper.text()).toContain('还没有剪贴板历史')
  })

  it('升级为片段并展示在片段库', async () => {
    const wrapper = await mountPanel()
    await wrapper.find('.clp-textarea').setValue('常用模板句')
    await wrapper.find('.clp-btn-primary').trigger('click')
    // 第三个按钮是 ⭐ 升级片段
    await wrapper.findAll('.clp-item-actions .clp-mini')[2].trigger('click')
    expect(wrapper.findAll('.clp-snip').length).toBe(1)
    expect(wrapper.text()).toContain('常用模板句')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:output:snippets']).toHaveLength(1)
  })

  it('手动新增片段', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('.clp-snip-add .clp-input')
    await inputs[0].setValue('问候语')
    await inputs[1].setValue('祝好，期待回音。')
    await wrapper.findAll('.clp-snip-add .clp-btn')[0].trigger('click')
    expect(wrapper.findAll('.clp-snip').length).toBe(1)
    expect(wrapper.text()).toContain('问候语')
    expect(wrapper.text()).toContain('祝好，期待回音。')
  })

  it('删除片段', async () => {
    const wrapper = await mountPanel()
    const inputs = wrapper.findAll('.clp-snip-add .clp-input')
    await inputs[0].setValue('临时')
    await inputs[1].setValue('内容')
    await wrapper.findAll('.clp-snip-add .clp-btn')[0].trigger('click')
    expect(wrapper.findAll('.clp-snip').length).toBe(1)
    await wrapper.find('.clp-snip-actions .clp-mini-danger').trigger('click')
    expect(wrapper.findAll('.clp-snip').length).toBe(0)
    expect(wrapper.text()).toContain('还没有片段')
  })

  it('清理策略保存与立即清理', async () => {
    const wrapper = await mountPanel()
    // 修改条数上限
    const numInputs = wrapper.findAll('.clp-input-num')
    await numInputs[0].setValue(30)
    await numInputs[1].setValue(60)
    await wrapper.findAll('.clp-clean-row .clp-btn')[0].trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:output:clip_policy'].maxItems).toBe(30)
    expect(saved.kvStore['hf:output:clip_policy'].maxDays).toBe(60)
  })
})
