// ============================================================
// WisdomPavilion 视图测试 - 知微阁
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getSessions: () => [],
    getEmotions: () => [],
    getNotes: () => [],
    getCrystals: () => [],
    getAnchors: () => [],
    getGoals: () => [],
    getRelations: () => [],
    getCarriers: () => [],
    getLedger: () => [],
    getPluginRegistry: () => ({}),
  },
  storageVersion: { value: 0 },
}))

// ---- 模拟 time utils ----
vi.mock('../../utils/time', () => ({
  getLocalDateKey: () => '2026-07-29',
}))

async function getWrapper() {
  const { default: WisdomPavilion } = await import('../WisdomPavilion.vue')
  return mount(WisdomPavilion, {
    global: {
      plugins: [createPinia()],
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('WisdomPavilion 知微阁', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('知微阁')
    expect(wrapper.text()).toContain('知微见著，慧从心生')
  })

  it('显示统计概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总记录')
    expect(wrapper.text()).toContain('本周记录')
    expect(wrapper.text()).toContain('知微珠转动')
  })

  it('显示知微珠区域', async () => {
    const wrapper = await getWrapper()
    const pearlContainer = wrapper.find('.wp-pearl-container')
    expect(pearlContainer.exists()).toBe(true)
  })

  it('显示提问区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.wp-ask-box .wp-input')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('输入一个想回看的问题')
  })

  it('查看按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const askBtn = wrapper.find('.wp-ask-box .wp-btn')
    expect(askBtn.exists()).toBe(true)
    expect(askBtn.attributes('disabled')).toBeDefined()
  })

  it('显示定音锤区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('定音锤')
    expect(wrapper.text()).toContain('查看片段')
  })

  it('显示年度信区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('年度信')
    expect(wrapper.text()).toContain('查看年度回看')
  })

  it('显示添加记录表单', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('添加记录')
    const recordInputs = wrapper.findAll('.record-input, .record-textarea')
    expect(recordInputs.length).toBeGreaterThan(0)
  })

  it('显示搜索区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('搜索记录')
  })

  it('无记录时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无记录，在上面添加一条吧')
  })

  it('渲染诗词卡片面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.pcp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('诗词卡片')
  })

  it('诗词卡片展示今日一诗', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日一诗')
    expect(wrapper.text()).toContain('收藏')
  })
})