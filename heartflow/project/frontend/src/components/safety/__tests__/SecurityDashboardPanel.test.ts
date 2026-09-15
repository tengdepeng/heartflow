import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const INCIDENTS_KEY = 'hf:safety:incidents'

function makeIncident(overrides: Record<string, any> = {}) {
  return {
    id: 'inc_' + Math.random().toString(36).slice(2, 7),
    type: 'unauthorized_access',
    level: 'medium',
    description: '检测到异常登录',
    source: '登录模块',
    resolved: false,
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(incidents: Record<string, any>[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kvStore: Record<string, any> = {}
  if (incidents.length) kvStore[INCIDENTS_KEY] = incidents
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../SecurityDashboardPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedIncidents(): any[] {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  const data = JSON.parse(raw)
  return data.kvStore[INCIDENTS_KEY] ?? []
}

describe('SecurityDashboardPanel 安全态势', () => {
  it('无事件时展示空态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('安全态势')
    expect(wrapper.text()).toContain('暂无威胁事件')
    expect(wrapper.text()).toContain('还没有事件记录')
  })

  it('有事件时展示威胁分布与最近事件', async () => {
    const wrapper = await mountPanel([
      makeIncident({ level: 'critical', type: 'external_attack', description: '外部攻击' }),
      makeIncident({ level: 'low', type: 'unusual_behavior', description: '异常行为' }),
    ])
    expect(wrapper.text()).toContain('威胁等级分布')
    expect(wrapper.text()).toContain('外部攻击')
    expect(wrapper.text()).toContain('异常行为')
    expect(wrapper.text()).toContain('2')
  })

  it('录入事件后写入存储并出现在最近事件', async () => {
    const wrapper = await mountPanel([])
    await wrapper.find('.sdp-input').setValue('检测到异常登录')
    await wrapper.find('.sdp-create-btn').trigger('click')

    expect(wrapper.text()).toContain('检测到异常登录')
    const incidents = storedIncidents()
    expect(incidents.length).toBe(1)
    expect(incidents[0].description).toBe('检测到异常登录')
    expect(incidents[0].source).toBe('手动录入')
  })

  it('解决事件后标记为已解决', async () => {
    const wrapper = await mountPanel([
      makeIncident({ id: 'inc1', description: '待解决事件' }),
    ])
    await wrapper.find('.sdp-resolve-btn').trigger('click')
    expect(wrapper.text()).toContain('已解决')
    const incidents = storedIncidents()
    expect(incidents[0].resolved).toBe(true)
  })

  it('清除已解决后仅保留未解决事件', async () => {
    const wrapper = await mountPanel([
      makeIncident({ id: 'inc1', description: '已解决事件', resolved: true }),
      makeIncident({ id: 'inc2', description: '未解决事件', resolved: false }),
    ])
    await wrapper.find('.sdp-clear-btn').trigger('click')
    expect(wrapper.text()).not.toContain('已解决事件')
    expect(wrapper.text()).toContain('未解决事件')
    const incidents = storedIncidents()
    expect(incidents.length).toBe(1)
    expect(incidents[0].id).toBe('inc2')
  })
})
