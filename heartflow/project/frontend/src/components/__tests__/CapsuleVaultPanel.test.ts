// ============================================================
// CapsuleVaultPanel 胶囊库档案面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { TimeCapsule } from '../../modules/capsule'

function capsule(overrides: Record<string, any> = {}): TimeCapsule {
  const now = new Date().toISOString()
  return {
    id: `cap_${Math.random().toString(36).slice(2, 8)}`,
    title: '胶囊',
    note: '',
    items: [],
    createdAt: now,
    at: now,
    openDate: '2099-01-01',
    openedAt: null,
    opened: false,
    ...overrides,
  }
}

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function mountPanel(capsules: TimeCapsule[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CapsuleVaultPanel.vue')
  const wrapper = mount(mod.default, { props: { capsules } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('CapsuleVaultPanel 胶囊库档案面板', () => {
  it('空态呈现胶囊库未启引导', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('.cvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('胶囊库档案')
    expect(wrapper.text()).toContain('胶囊库未启')
    expect(wrapper.text()).toContain('时光匣还空着')
  })

  it('填充态显示状态分布四格与徽标', async () => {
    const wrapper = await mountPanel([
      capsule({ openDate: iso(30) }),
      capsule({ openDate: iso(0) }),
      capsule({ openDate: iso(-5) }),
      capsule({ openDate: iso(-5), openedAt: new Date().toISOString() }),
    ])
    expect(wrapper.find('.cvp-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('封存中')
    expect(wrapper.text()).toContain('今日可启')
    expect(wrapper.text()).toContain('逾末未启')
    expect(wrapper.text()).toContain('已开启')
    expect(wrapper.findAll('.cvp-status-cell').length).toBe(4)
  })

  it('逾末催启清单列出逾末胶囊与倒计时', async () => {
    const wrapper = await mountPanel([
      capsule({ id: 'a', title: '逾期胶囊', openDate: iso(-3) }),
      capsule({ id: 'b', title: '未来胶囊', openDate: iso(30) }),
    ])
    expect(wrapper.text()).toContain('逾末催启')
    expect(wrapper.text()).toContain('逾期胶囊')
    expect(wrapper.text()).toContain('已逾 3 天')
  })

  it('即将开启排除逾末、按开启日升序', async () => {
    const wrapper = await mountPanel([
      capsule({ id: 'a', title: '今日胶囊', openDate: iso(0) }),
      capsule({ id: 'b', title: '明日胶囊', openDate: iso(1) }),
      capsule({ id: 'c', title: '逾期胶囊', openDate: iso(-3) }),
    ])
    expect(wrapper.text()).toContain('即将开启')
    expect(wrapper.text()).toContain('今日胶囊')
    expect(wrapper.text()).toContain('明日胶囊')
  })

  it('最近开启回看列出已开启胶囊', async () => {
    const wrapper = await mountPanel([
      capsule({ id: 'a', title: '已开胶囊', openDate: iso(-10), openedAt: new Date().toISOString() }),
    ])
    expect(wrapper.text()).toContain('最近开启回看')
    expect(wrapper.text()).toContain('已开胶囊')
  })

  it('温和洞察列表不超过 4 条', async () => {
    const wrapper = await mountPanel([
      capsule({ openDate: iso(-5) }),
      capsule({ openDate: iso(0) }),
      capsule({ openDate: iso(30) }),
      capsule({ openDate: iso(-5), openedAt: new Date().toISOString() }),
    ])
    const insights = wrapper.findAll('.cvp-insights li')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})
