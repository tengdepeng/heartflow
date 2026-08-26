// ============================================================
// 应用空间 · 本地注意力 / 数字健康 区块测试（#84 感知层本地壳）
// 通过 DOM 交互验证：默认关闭（沉默的默认）、开启后展示本地估算、
// 感知→藏象阁 只读信号区、可再次关闭。
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

vi.mock('../../modules/space/app-space-manager', async () => {
  const vue = await import('vue')
  return {
    useAppSpaceManager: () => ({
      entriesByCategory: vue.ref({}),
      usageStats: vue.ref({
        totalConfigs: 0,
        activeConfigs: 0,
        presetCount: 0,
        layoutCount: 0,
        themeCount: 0,
        totalAccesses: 0,
        activeDays7d: 0,
      }),
      quickSuggestions: vue.ref([]),
      recentActivities: vue.ref([]),
      getSpaceComparisons: () => [],
      recordEntryAccess: vi.fn(),
      recordActivity: vi.fn(),
    }),
  }
})

async function getWrapper() {
  const { default: AppSpace } = await import('../AppSpace.vue')
  return mount(AppSpace)
}

describe('AppSpace 本地注意力 · 数字健康', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('默认关闭时显示开启入口与说明（沉默的默认）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('本地注意力 · 数字健康')
    expect(wrapper.text()).toContain('沉默的默认')
    expect(wrapper.find('.as-attn-toggle').text()).toContain('开启本地感知')
    // 关闭态不应渲染分数卡
    expect(wrapper.find('.as-attn-value').exists()).toBe(false)
  })

  it('点击开启后展示本地估算分数与藏象阁只读信号', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.as-attn-toggle').trigger('click')
    await nextTick()

    const value = wrapper.find('.as-attn-value')
    expect(value.exists()).toBe(true)
    expect(value.text()).toBe('14')
    expect(wrapper.find('.as-attn-level').text()).toBe('沉寂')

    // 感知 → 藏象阁 只读信号区出现（用度）
    expect(wrapper.find('.as-attn-bw').exists()).toBe(true)
    expect(wrapper.text()).toContain('感知 → 藏象阁')
    // 来源透明说明
    expect(wrapper.text()).toContain('本地估算 · 非系统级用量统计')
  })

  it('开启后再次点击可关闭', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.as-attn-toggle').trigger('click')
    await nextTick()
    expect(wrapper.find('.as-attn-value').exists()).toBe(true)

    const closeBtn = wrapper.find('.as-attn-toggle')
    expect(closeBtn.text()).toContain('关闭本地感知')
    await closeBtn.trigger('click')
    await nextTick()

    expect(wrapper.find('.as-attn-value').exists()).toBe(false)
    expect(wrapper.find('.as-attn-toggle').text()).toContain('开启本地感知')
  })
})
