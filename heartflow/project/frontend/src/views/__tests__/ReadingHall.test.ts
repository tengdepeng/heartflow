// ============================================================
// ReadingHall 视图测试 - 阅览殿
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getSessions: () => [],
    getCrystals: () => [],
    getNotes: () => [],
    getEmotions: () => [],
  },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: ReadingHall } = await import('../ReadingHall.vue')
  return mount(ReadingHall, {
    shallow: true,
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('ReadingHall 阅览殿', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('阅览殿')
    expect(wrapper.text()).toContain('在书卷中寻找答案')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('专注次数')
    expect(wrapper.text()).toContain('专注时长')
    expect(wrapper.text()).toContain('结晶数')
  })

  it('显示三个标签页', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toContain('书卷')
    expect(tabs[1].text()).toContain('摘录集')
    expect(tabs[2].text()).toContain('回顾')
  })

  // ---- 批量收口：补挂载孤儿面板（INCR-173）----
  it('挂载荐书面板 BookRecommendationsPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BookRecommendationsPanel' }).exists()).toBe(true)
  })

  it('挂载阅读挑战面板 ReadingChallengesPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'ReadingChallengesPanel' }).exists()).toBe(true)
  })

  it('默认显示书卷标签', async () => {
    const wrapper = await getWrapper()
    const activeTab = wrapper.find('.rh-tab.active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toContain('书卷')
  })

  it('书卷标签显示文本输入区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.rh-textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('粘贴文本内容')
  })

  it('载入按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const loadBtn = wrapper.find('.rh-actions .rh-btn')
    expect(loadBtn.exists()).toBe(true)
    expect(loadBtn.attributes('disabled')).toBeDefined()
  })

  it('摘录集标签显示空状态', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[1].trigger('click')
    expect(wrapper.text()).toContain('还没有摘录')
  })

  it('回顾标签显示统计', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('笔记数')
    expect(wrapper.text()).toContain('情绪记录数')
  })

  // ------- 集成：间隔重复面板（P2 收口）-------
  it('集成渲染间隔重复面板（三选一回顾）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('reading-srs-panel-stub').exists()).toBe(true)
  })

  // ------- 集成：阅读总览仪表盘（INCR-160）-------
  it('集成渲染阅读总览仪表盘', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('reading-dashboard-panel-stub').exists()).toBe(true)
  })
})