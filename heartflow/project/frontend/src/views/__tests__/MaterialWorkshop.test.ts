// ============================================================
// MaterialWorkshop 视图测试 - 材质工坊
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

// ---- 模拟 room-graph ----
vi.mock('../../engine/room-graph', () => ({
  getRoom: () => ({ id: 'craft', name: '材质工坊', description: '自定义材质', icon: '🔧' }),
  getAllRooms: () => ([
    { id: 'home', name: '心流', icon: '⊙', group: 'gravity' },
    { id: 'timeline', name: '时间长廊', icon: '⏳', group: 'main-path' },
    { id: 'garden', name: '情绪花房', icon: '🌸', group: 'world' },
    { id: 'sanctuary', name: '安全岛', icon: '🕊', group: 'system' },
  ]),
}))

// ---- 模拟 room navigation ----
const mockEnterRoom = vi.fn()

vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({
    enterRoom: (path: string) => mockEnterRoom(path),
  }),
}))

// ---- 模拟 style bridge ----
const mockActivate = vi.fn()
const mockPack = {
  id: 'test-pack',
  name: '测试风格包',
  version: '1.0.0',
  theme: { mode: 'dark', colors: { accent: '#7c6cf0', bgPrimary: '#0a0a0f', bgSecondary: '#141218', textPrimary: '#e8e8ed', textSecondary: '#8e8e93', border: 'rgba(255,255,255,0.06)' } },
  fonts: { display: 'Inter', body: 'Inter', mono: 'monospace' },
  animations: { breathingSpeed: 1.0, particleDensity: 1.0 },
}

vi.mock('../../resonance/bridges/style', () => ({
  useStyle: () => ({
    packs: [mockPack],
    activeId: 'test-pack',
    activate: (id: string) => mockActivate(id),
    exportPack: vi.fn(),
    addPack: vi.fn(),
  }),
}))

// ---- 模拟 config bridge (reactive 风格，config 已自动解包) ----
const mockConfigValue = { advisorEnabled: true, visualization: { activeMetaphor: 'light', customPalette: null } }
vi.mock('../../resonance/bridges/config', () => ({
  useConfig: () => ({
    config: mockConfigValue,
    updateAdvisorEnabled: vi.fn(),
    updateVisualization: vi.fn(),
  }),
}))

// ---- 模拟 visualization modules ----
vi.mock('../../modules/visualization/metaphors', () => ({
  getAllMetaphors: () => [],
  getMetaphor: () => null,
}))

vi.mock('../../modules/visualization/types', () => ({
  MetaphorType: {},
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
  const { default: MaterialWorkshop } = await import('../MaterialWorkshop.vue')
  return mount(MaterialWorkshop, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('MaterialWorkshop 材质工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('材质工坊')
    expect(wrapper.text()).toContain('材质配方')
  })

  it('显示风格包管理区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('风格包管理')
    expect(wrapper.text()).toContain('测试风格包')
  })

  it('显示创建风格包区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('创建风格包')
    expect(wrapper.text()).toContain('基础色')
  })

  it('显示视觉隐喻区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('视觉隐喻')
  })

  it('显示材质库区域（真实引擎全链路：挂载即注入出厂预置）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('材质库')
    expect(wrapper.text()).toContain('起点库')
    expect(wrapper.text()).toContain('发光')
    expect(wrapper.text()).toContain('纹理基底')
    // 预置注入真实生效：材质网格出现具体材质卡片
    expect(wrapper.text()).toContain('暖金光点')
    expect(wrapper.text()).toContain('浓墨一点')
  })

  it('显示面包屑导航', async () => {
    const wrapper = await getWrapper()
    const breadcrumbLinks = wrapper.findAll('.breadcrumb-link')
    expect(breadcrumbLinks.length).toBeGreaterThan(0)
  })
})