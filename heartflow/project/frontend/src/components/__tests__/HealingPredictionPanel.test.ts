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
  const mod = await import('../HealingPredictionPanel.vue')
  return mount(mod.default, { props: { marks, growth: [] } })
}

describe('HealingPredictionPanel 愈合预测', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('无印记时显示空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('愈合预测')
    expect(wrapper.text()).toContain('先记录一道工痕')
  })

  it('有印记时展示在途预测', async () => {
    const wrapper = await mountPanel([makeMark({ id: 'm1', healingProgress: 20 })])
    expect(wrapper.text()).toContain('在途预测')
    expect(wrapper.text()).toContain('剩余天数')
    expect(wrapper.text()).toContain('预计痊愈')
    expect(wrapper.text()).toContain('置信度')
  })

  it('已痊愈印记不进入在途预测', async () => {
    const wrapper = await mountPanel([makeMark({ id: 'm1', healingProgress: 100 })])
    expect(wrapper.text()).toContain('暂无在途工痕')
  })

  it('点击印记展示影响因子', async () => {
    const wrapper = await mountPanel([makeMark({ id: 'm1', healingProgress: 20 })])
    await wrapper.find('.hpp-card').trigger('click')
    expect(wrapper.text()).toContain('影响因子')
    expect(wrapper.text()).toContain('伤痕类型')
    expect(wrapper.text()).toContain('严重度')
  })
})
