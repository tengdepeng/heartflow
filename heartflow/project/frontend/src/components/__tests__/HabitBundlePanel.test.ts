// ============================================================
// HabitBundlePanel 组件测试 - INCR-146 习惯组合面板
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const store: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in store ? store[k] : def),
    setKV: (k: string, v: any) => {
      store[k] = v
    },
  },
}))

import { useDisciplineBridge } from '@/modules/discipline/workshop-bridge'
import HabitBundlePanel from '../HabitBundlePanel.vue'

describe('HabitBundlePanel (INCR-146)', () => {
  beforeEach(() => {
    for (const k in store) delete store[k]
  })

  it('挂载渲染标题、预设速建、全部组合与空态', () => {
    const bridge = useDisciplineBridge()
    const wrapper = mount(HabitBundlePanel, { props: { bridge } })
    expect(wrapper.text()).toContain('◈ 习惯组合')
    expect(wrapper.text()).toContain('预设速建')
    expect(wrapper.text()).toContain('全部组合')
    expect(wrapper.text()).toContain('还没有习惯组合')
  })

  it('桥缺 habits 字段时点击预设不崩溃（空安全兜底）', async () => {
    const bridge = {
      bundles: { value: [] },
      BUNDLE_PRESETS: [{ name: '晨间仪式', description: '', suggestedHabitTitles: [] }],
      createBundleFromPreset: vi.fn(() => null),
      habits: undefined,
    } as any
    const wrapper = mount(HabitBundlePanel, { props: { bridge } })
    const presetBtn = wrapper.find('.hbp-preset')
    expect(presetBtn.exists()).toBe(true)
    await presetBtn.trigger('click')
    expect(wrapper.find('.hbp').exists()).toBe(true)
    expect(bridge.createBundleFromPreset).toHaveBeenCalled()
  })
})
