// ============================================================
// FeatureSearchPanel 组件测试 - INCR-142 功能直达搜索面板
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockPush = vi.fn(() => Promise.resolve())
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

import FeatureSearchPanel from '../FeatureSearchPanel.vue'

describe('FeatureSearchPanel (INCR-142)', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('默认渲染搜索框 + 推荐直达 chip', () => {
    const wrapper = mount(FeatureSearchPanel)
    expect(wrapper.find('.fs').exists()).toBe(true)
    expect(wrapper.text()).toContain('功能直达')
    expect(wrapper.find('.fs-input').exists()).toBe(true)
    expect(wrapper.findAll('.fs-chip').length).toBeGreaterThanOrEqual(2)
  })

  it('输入「花房」唯一命中 → 直达提示「情绪花房」，点击直达 /garden', async () => {
    const wrapper = mount(FeatureSearchPanel)
    const input = wrapper.find('.fs-input')
    await input.setValue('花房')
    expect(wrapper.find('.fs-direct').exists()).toBe(true)
    expect(wrapper.find('.fs-direct-text').text()).toContain('情绪花房')
    await wrapper.find('.fs-btn--direct').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/garden')
  })

  it('查询长度 < 2 时不触发搜索/直达', async () => {
    const wrapper = mount(FeatureSearchPanel)
    const input = wrapper.find('.fs-input')
    await input.setValue('花') // 单字
    expect(wrapper.find('.fs-direct').exists()).toBe(false)
    expect(wrapper.find('.fs-suggest').exists()).toBe(false)
  })
})
