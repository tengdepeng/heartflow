// ============================================================
// StyleMarket 视图测试 - 风格包市场
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

// ---- 模拟 style store ----
const mockActivate = vi.fn()
const mockExportPack = vi.fn()
const mockPack = {
  id: 'test-pack',
  name: '测试风格包',
  version: '1.0.0',
  theme: { mode: 'dark', colors: { accent: '#7c6cf0', bgPrimary: '#0a0a0f', bgSecondary: '#141218', textPrimary: '#e8e8ed', textSecondary: '#8e8e93', border: 'rgba(255,255,255,0.06)' } },
  fonts: { display: 'Inter', body: 'Inter', mono: 'monospace' },
  animations: { breathingSpeed: 1.0, particleDensity: 1.0 },
}

vi.mock('../../stores/style', () => ({
  useStyleStore: () => ({
    packs: [mockPack],
    activeId: 'test-pack',
    activate: (id: string) => mockActivate(id),
    exportPack: (id: string) => mockExportPack(id),
    addPack: vi.fn(),
  }),
}))

// ---- 模拟 style share ----
vi.mock('../../modules/style/share', () => ({
  importStylePack: vi.fn(),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: StyleMarket } = await import('../StyleMarket.vue')
  return mount(StyleMarket, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('StyleMarket 风格工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('风格工坊')
    expect(wrapper.text()).toContain('自定义你的殿堂风格')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('风格包')
    expect(wrapper.text()).toContain('明暗模式')
    expect(wrapper.text()).toContain('导入区')
  })

  it('显示我的风格包列表', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('我的风格包')
    expect(wrapper.text()).toContain('测试风格包')
  })

  it('显示风格包应用按钮', async () => {
    const wrapper = await getWrapper()
    const applyBtn = wrapper.find('.sm-pack-btn')
    expect(applyBtn.exists()).toBe(true)
    expect(applyBtn.text()).toContain('使用中')
  })

  it('显示创建新风格包区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('创建新风格包')
    expect(wrapper.text()).toContain('基础色')
  })

  it('创建按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const createBtn = wrapper.find('.sm-form-btn')
    expect(createBtn.exists()).toBe(true)
    expect(createBtn.attributes('disabled')).toBeDefined()
  })

  it('显示导入区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('导入风格包')
    expect(wrapper.text()).toContain('选择文件并导入')
  })
})