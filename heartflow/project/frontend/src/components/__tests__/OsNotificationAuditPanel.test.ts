// ============================================================
// A3-EXT-1/3 · OsNotificationAuditPanel 渲染测试
// 验证：合规状态条 + 概览计数 + 最近记录列表 + 零外网说明。
// ============================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

function setupMemoryStorage() {
  const mem = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => { mem.set(k, v) },
      removeItem: (k: string) => { mem.delete(k) },
    },
    configurable: true,
  })
  return mem
}

const { mockBlocked } = vi.hoisted(() => ({ mockBlocked: { value: false } }))
vi.mock('@/engine/compliance-gate', () => ({
  isOsNotificationBlocked: () => mockBlocked.value,
}))

describe('OsNotificationAuditPanel（A3-EXT）', () => {
  beforeEach(() => {
    setupMemoryStorage()
    mockBlocked.value = false
  })

  it('渲染标题与零外网合规说明', async () => {
    const { default: Panel } = await import('../OsNotificationAuditPanel.vue')
    const wrapper = mount(Panel, {})
    expect(wrapper.text()).toContain('系统通知审计')
    expect(wrapper.text()).toContain('零推送合规证明')
    expect(wrapper.text()).toContain('仅记录本地')
    expect(wrapper.text()).toContain('不会上传')
  })

  it('展示宪法第5条状态条（放行态）', async () => {
    const { default: Panel } = await import('../OsNotificationAuditPanel.vue')
    const wrapper = mount(Panel, {})
    expect(wrapper.text()).toContain('宪法第5条')
    expect(wrapper.text()).toContain('当前放行')
  })

  it('无记录时显示空态提示，且有概览计数卡片', async () => {
    const { default: Panel } = await import('../OsNotificationAuditPanel.vue')
    const wrapper = mount(Panel, {})
    expect(wrapper.find('.audit-empty').exists()).toBe(true)
    // 四张概览卡片：发射尝试 / 宪法拦截 / 实际落地 / 未落地
    expect(wrapper.findAll('.audit-card').length).toBe(4)
  })

  it('宪法阻断态时状态条显示「当前阻断」', async () => {
    mockBlocked.value = true
    const { default: Panel } = await import('../OsNotificationAuditPanel.vue')
    const wrapper = mount(Panel, {})
    expect(wrapper.text()).toContain('当前阻断')
  })
})
