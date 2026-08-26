// ============================================================
// CarrierEditor 视图测试 - 载体编辑器
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
    getCarriers: () => [],
    setCarriers: () => {},
  },
}))

// ---- 模拟 types ----
vi.mock('../../types', () => ({
  default: {},
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: CarrierEditor } = await import('../CarrierEditor.vue')
  return mount(CarrierEditor, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('CarrierEditor 载体编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('载体编辑器')
    expect(wrapper.text()).toContain('设计你的玉珠载体形态')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已保存载体')
    expect(wrapper.text()).toContain('可选形态')
    expect(wrapper.text()).toContain('最大数量')
  })

  it('概览卡片显示默认值', async () => {
    const wrapper = await getWrapper()
    // 已保存载体默认为0，可选形态为4，最大数量为6
    const overviewValues = wrapper.findAll('.ce-ov-value')
    expect(overviewValues.length).toBe(3)
    expect(overviewValues[1].text()).toBe('4')
    expect(overviewValues[2].text()).toBe('6')
  })

  it('显示预览区域', async () => {
    const wrapper = await getWrapper()
    const previewSection = wrapper.find('.ce-preview')
    expect(previewSection.exists()).toBe(true)
  })

  it('显示形态选择', async () => {
    const wrapper = await getWrapper()
    // 预览区应该包含 SVG（多种形态渲染）
    const svg = wrapper.find('.ce-preview-svg')
    expect(svg.exists()).toBe(true)
  })
})