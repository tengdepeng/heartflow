// ============================================================
// GardenNarrativePanel 组件测试
// 走真实引擎 (useGardenNarrative + useEmotionGarden + garden-environment)，
// mock storage 的 getEmotions 注入情绪记录种子。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'

const h = vi.hoisted(() => {
  const store: Record<string, any> = {
    emotions: [] as any[],
  }
  return { store }
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getEmotions: () => h.store.emotions,
    setEmotions: (v: any) => { h.store.emotions = v },
    getSessions: () => [],
    getAnchors: () => [],
    getNotes: () => [],
    getPluginRegistry: () => ({}),
    getConstitution: () => null,
    getCrystals: () => [],
    getCarriers: () => [],
    getAdvisors: () => [],
    setAdvisors: vi.fn(),
    getAdvisorMessages: () => [],
    setAdvisorMessages: vi.fn(),
    getConfig: () => ({
      advisor: {
        affinityIncrements: {},
        messageStorageLimit: 100,
        dingyinThresholds: {},
        witnessLogMax: 100,
        witnessLogDefaultLimit: 10,
        affinityMax: 100,
        bubbleDuration: 5000,
        advisorResetDate: '',
      },
    }),
    setConfig: vi.fn(),
    getKV: () => ({}),
    setKV: vi.fn(),
  },
}))

function todayRecord(type: string, note: string) {
  return { id: `rec_${type}_${Date.now()}`, type, note, createdAt: new Date().toISOString() }
}

describe('GardenNarrativePanel 组件', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.store.emotions = []
  })

  it('无记录时渲染空态引导', async () => {
    h.store.emotions = []
    const wrapper = mount(await (await import('../GardenNarrativePanel.vue')).default)
    await nextTick()
    expect(wrapper.find('.gnp').exists()).toBe(true)
    expect(wrapper.text()).toContain('花园叙事')
    expect(wrapper.find('.gnp-empty-hero').exists()).toBe(true)
    expect(wrapper.text()).toContain('记录第一份情绪')
  })

  it('有今日 happy 记录时自动生成花语故事', async () => {
    h.store.emotions = [todayRecord('happy', '和朋友去了海边')]
    const wrapper = mount(await (await import('../GardenNarrativePanel.vue')).default)
    await nextTick()
    expect(wrapper.find('.gnp-story').exists()).toBe(true)
    expect(wrapper.text()).toContain('花语故事')
    expect(wrapper.find('.gnp-badge').text()).toContain('轻快')
    expect(wrapper.text()).toContain('和朋友去了海边')
  })

  it('同时生成成长日记与季节相册', async () => {
    h.store.emotions = [todayRecord('happy', '晒太阳')]
    const wrapper = mount(await (await import('../GardenNarrativePanel.vue')).default)
    await nextTick()
    // 成长日记：今日开心 → 阳光灿烂
    expect(wrapper.find('[data-test="diary"]').exists()).toBe(true)
    expect(wrapper.findAll('.gnp-diary-item').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('阳光灿烂')
    // 季节相册：四季封面 + 季节故事
    expect(wrapper.find('[data-test="albums"]').exists()).toBe(true)
    expect(wrapper.findAll('.gnp-album').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('朵花 · 健康')
  })

  it('生成分享链接并添加访客留言', async () => {
    h.store.emotions = [todayRecord('calm', '傍晚的书')]
    const wrapper = mount(await (await import('../GardenNarrativePanel.vue')).default)
    await nextTick()
    // 生成分享链接
    await wrapper.find('.gnp-share-actions .gnp-mini').trigger('click')
    await nextTick()
    expect(wrapper.find('[data-test="share"]').exists()).toBe(true)
    expect(wrapper.findAll('.gnp-share code').length).toBeGreaterThan(0)
    // 访客留言
    const inputs = wrapper.findAll('.gnp-msg-form input')
    await (inputs[0] as any).setValue('清风')
    await (inputs[1] as any).setValue('路过来看看，花很漂亮')
    await wrapper.find('.gnp-msg-form button').trigger('click')
    await nextTick()
    expect(wrapper.find('.gnp-message').exists()).toBe(true)
    expect(wrapper.text()).toContain('清风')
    expect(wrapper.text()).toContain('路过来看看，花很漂亮')
  })
})