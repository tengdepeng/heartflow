import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const AUDIT_LOG_KEY = 'hf:safety:audit_log'

function makeAudit(overrides: Record<string, any> = {}) {
  return {
    id: 'log_' + Math.random().toString(36).slice(2, 7),
    action: '登录',
    actor: 'user',
    target: '守护室',
    result: 'success',
    detail: '正常登录',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(events: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (events.length) kvStore[AUDIT_LOG_KEY] = events
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../AuditTimelinePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('AuditTimelinePanel 审计时间线', () => {
  it('空日志时播种演示事件并生成时间线分段', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('审计时间线')
    expect(wrapper.text()).toContain('时间线分段')
    expect(wrapper.text()).toContain('登录')
  })

  it('有事件时展示趋势分析与分段', async () => {
    const wrapper = await mountPanel([
      makeAudit({ action: '登录', actor: 'user', result: 'success' }),
      makeAudit({ action: '导出', actor: 'admin', result: 'blocked' }),
    ])
    expect(wrapper.text()).toContain('趋势分析')
    expect(wrapper.text()).toContain('导出')
    expect(wrapper.text()).toContain('拦截')
  })

  it('按关键词搜索过滤事件', async () => {
    const wrapper = await mountPanel([
      makeAudit({ action: '登录', actor: 'user', result: 'success' }),
      makeAudit({ action: '导出', actor: 'admin', result: 'blocked' }),
    ])
    await wrapper.find('.atp-input').setValue('导出')
    expect(wrapper.text()).toContain('导出')
    expect(wrapper.text()).not.toContain('登录')
  })

  it('异常事件生成异常摘要', async () => {
    const wrapper = await mountPanel([
      makeAudit({ action: '登录', actor: 'user', result: 'failure' }),
      makeAudit({ action: '登录', actor: 'user', result: 'failure' }),
    ])
    expect(wrapper.text()).toContain('异常摘要')
    expect(wrapper.text()).toContain('异常事件')
  })
})
