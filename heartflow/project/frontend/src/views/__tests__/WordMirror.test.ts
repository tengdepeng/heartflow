// ============================================================
// WordMirror 视图测试 - 字镜阁
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
  const { default: WordMirror } = await import('../WordMirror.vue')
  return mount(WordMirror, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('WordMirror 字镜阁', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('字镜阁')
    expect(wrapper.text()).toContain('字里行间，映照自我')
  })

  it('显示文字分析区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.wm-input')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('粘贴一段文字')
  })

  it('映照按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const analyzeBtn = wrapper.find('.wm-btn')
    expect(analyzeBtn.exists()).toBe(true)
    expect(analyzeBtn.attributes('disabled')).toBeDefined()
  })

  it('显示词汇自习室区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('词汇自习室')
  })

  it('显示词汇统计概览', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('总词汇')
    expect(wrapper.text()).toContain('熟记')
    expect(wrapper.text()).toContain('学习中')
  })

  it('显示添加词汇表单', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    const inputs = wrapper.findAll('.wm-form-input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    expect(wrapper.text()).toContain('添加')
  })

  it('显示搜索和筛选区域', async () => {
    const wrapper = await getWrapper()
    // 切换到词汇自习室 tab
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('全部')
    const select = wrapper.find('.wm-filter-select')
    expect(select.exists()).toBe(true)
  })

  it('渲染词源与语义网络面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wnp').exists()).toBe(true)
    expect(wrapper.text()).toContain('词源与语义网络')
    expect(wrapper.text()).toContain('词源追溯')
  })

  it('词源网络面板显示词典规模统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.wnp-stats').exists()).toBe(true)
    expect(wrapper.text()).toContain('词典规模')
  })

  it('词汇自习室渲染词根词缀拆解面板', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.wroot').exists()).toBe(true)
    expect(wrapper.text()).toContain('词根词缀拆解')
  })

  it('词根拆解输入单词显示部件', async () => {
    const wrapper = await getWrapper()
    const vocabTab = wrapper.findAll('.wm-tab').find(btn => btn.text() === '词汇自习室')
    if (vocabTab) await vocabTab.trigger('click')
    await wrapper.vm.$nextTick()
    const input = wrapper.find('.wroot-input')
    await input.setValue('transport')
    await input.trigger('keyup.enter')
    expect(wrapper.text()).toContain('trans')
    expect(wrapper.find('.wroot-legend').exists()).toBe(true)
  })
})