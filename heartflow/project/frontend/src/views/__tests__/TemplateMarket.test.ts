// ============================================================
// TemplateMarket 视图测试 - 模板市场
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

// ---- 模拟 template types ----
vi.mock('../../modules/template/types', () => ({
  exportTemplate: vi.fn(),
  downloadTemplate: vi.fn(),
  importTemplate: vi.fn(),
  RoomTemplate: {},
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: TemplateMarket } = await import('../TemplateMarket.vue')
  return mount(TemplateMarket, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('TemplateMarket 模板市场', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('模板市场')
    expect(wrapper.text()).toContain('发现和导入模板')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('房间模板')
    expect(wrapper.text()).toContain('幕僚性格模板')
    expect(wrapper.text()).toContain('模板总数')
  })

  it('显示房间模板区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('房间模板')
    // 有示例模板数据，应显示"极简书房"
    expect(wrapper.text()).toContain('极简书房')
  })

  it('显示幕僚性格模板区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('幕僚性格模板')
  })

  it('显示模板的应用按钮', async () => {
    const wrapper = await getWrapper()
    const applyBtns = wrapper.findAll('.tm-template-btn')
    expect(applyBtns.length).toBeGreaterThan(0)
    expect(applyBtns[0].text()).toContain('应用')
  })

  it('显示导入模板区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('导入模板')
    expect(wrapper.text()).toContain('选择文件并导入')
  })
})