import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeMark(overrides: Record<string, any> = {}) {
  return {
    id: `m${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    bodyPart: 'back',
    severity: 3,
    description: '久坐背部酸痛',
    scarType: 'wear',
    recordedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    healingStage: 'proliferation',
    healingProgress: 20,
    transformed: false,
    ...overrides,
  }
}

async function mountPanel(marks: any[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: { 'hf:scar_growth': [] } }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CausalChainPanel.vue')
  return mount(mod.default, { props: { marks } })
}

describe('CausalChainPanel 伤痕因果链', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无印记时显示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('因果链')
    expect(wrapper.text()).toContain('先记录一道工痕')
  })

  it('有印记时展示链路总览', async () => {
    const wrapper = await mountPanel([makeMark({ id: 'm1' })])
    expect(wrapper.text()).toContain('链路总览')
    expect(wrapper.text()).toContain('平均深度')
    expect(wrapper.text()).toContain('转化率')
    expect(wrapper.text()).toContain('链路数')
  })

  it('点击印记展开单链时间线', async () => {
    const wrapper = await mountPanel([makeMark({ id: 'm1' })])
    await wrapper.find('.ccp-pick').trigger('click')
    expect(wrapper.text()).toContain('链路深度')
    expect(wrapper.text()).toContain('触发')
    expect(wrapper.text()).toContain('形成')
    expect(wrapper.text()).toContain('应对')
  })
})
