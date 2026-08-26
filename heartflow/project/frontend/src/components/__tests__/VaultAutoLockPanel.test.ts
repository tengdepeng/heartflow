// ============================================================
// 保险库 · 自动锁定面板测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import { DEFAULT_AUTO_LOCK } from '../../modules/vault/auto-lock'
import type { AutoLockSettings } from '../../modules/vault/auto-lock'

async function mountPanel(settings: AutoLockSettings = { ...DEFAULT_AUTO_LOCK }) {
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
  const mod = await import('../VaultAutoLockPanel.vue')
  const wrapper = mount(mod.default, {
    props: { settings },
  })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('VaultAutoLockPanel 自动锁定', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染面板标题与状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('自动锁定')
    expect(wrapper.text()).toContain('空闲自动锁定')
    expect(wrapper.text()).toContain('页面保护')
  })

  it('默认设置下显示启用状态', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('自动锁定已启用')
    expect(wrapper.text()).toContain('无操作 5 分钟后自动锁定')
  })

  it('空闲锁定关闭时显示未启用', async () => {
    const wrapper = await mountPanel({ idleMinutes: 0, lockOnBlur: false })
    expect(wrapper.text()).toContain('自动锁定未启用')
    expect(wrapper.text()).toContain('空闲锁定已关闭')
  })

  it('切换空闲时长触发 update 事件', async () => {
    const wrapper = await mountPanel()
    const select = wrapper.find('select.val-select')
    await select.setValue('15')
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({ idleMinutes: 15 })
  })

  it('切换切页锁定触发 update 事件', async () => {
    const wrapper = await mountPanel()
    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)
    const emitted = wrapper.emitted('update')
    expect(emitted).toBeTruthy()
    expect(emitted![0][0]).toEqual({ lockOnBlur: false })
  })

  it('空闲时长选项包含关闭与常用时长', async () => {
    const wrapper = await mountPanel()
    const options = wrapper.findAll('select.val-select option').map(o => o.text())
    expect(options).toContain('关闭')
    expect(options).toContain('5 分钟')
    expect(options).toContain('30 分钟')
  })
})
