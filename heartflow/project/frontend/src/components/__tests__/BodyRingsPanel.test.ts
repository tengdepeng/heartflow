import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

async function mountPanel() {
  const mod = await import('../BodyRingsPanel.vue')
  return mount(mod.default)
}

describe('BodyRingsPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('默认三环均显示空白档位', async () => {
    const wrapper = await mountPanel()
    const text = wrapper.text()
    expect(text).toContain('活动')
    expect(text).toContain('休息')
    expect(text).toContain('感受')
    // 三个环初始档位 0 → 标签「空白」（出现 3 次）
    expect(wrapper.findAll('.ring-label').map(e => e.text())).toEqual(['空白', '空白', '空白'])
  })

  it('点击感受档位按钮更新感受环', async () => {
    const wrapper = await mountPanel()
    const btn = wrapper.findAll('.feeling-btn').find(b => b.text() === '舒展')!
    await btn.trigger('click')
    // 感受环标签更新为「舒展」
    expect(wrapper.findAll('.ring-label').map(e => e.text())[2]).toBe('舒展')
  })

  it('记录活动分钟后活动环累加并升级档位', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('.act-input')
    await input.setValue(90)
    await wrapper.find('.ring-btn').trigger('click')
    const text = wrapper.text()
    expect(text).toContain('90 分钟')
    // 90 分钟 >= 60 阈值 → 档位 3「充盈」
    expect(wrapper.findAll('.ring-label').map(e => e.text())[0]).toBe('充盈')
  })
})
