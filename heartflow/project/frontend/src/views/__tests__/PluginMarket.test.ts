// ============================================================
// PluginMarket 视图测试 - 插件市场
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

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

// ---- 模拟 plugin store (使用 ref 包装状态属性以匹配 bridge 的 storeToRefs 行为) ----
const mockPlugins = ref([
  { id: 'test-plugin', name: '测试插件', manifest: { meta: { id: 'test-plugin', name: '测试插件', version: '1.0.0', icon: '🔌', description: '测试用插件', tier: 'community', author: '测试作者' } }, enabled: true },
])

vi.mock('../../stores/plugin', () => ({
  usePluginStore: () => ({
    plugins: mockPlugins,
    initialized: ref(true),
    enabledPlugins: ref([]),
    disabledPlugins: ref([]),
    officialPlugins: ref([]),
    communityPlugins: ref([]),
    experimentalPlugins: ref([]),
    init: vi.fn(),
    toggle: vi.fn(),
    installPlugin: vi.fn(),
    uninstallPlugin: vi.fn(),
  }),
  CORE_PLUGINS: [],
}))

// ---- 模拟 types ----
vi.mock('../../modules/plugin/types', () => ({
  PluginManifest: {},
  PluginTier: {},
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: PluginMarket } = await import('../PluginMarket.vue')
  return mount(PluginMarket, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('PluginMarket 插件市场', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('插件市场')
    expect(wrapper.text()).toContain('扩展你的殿堂功能')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已安装')
  })

  it('显示已安装插件列表', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已安装插件')
  })

  it('显示可安装插件区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('可安装插件')
  })

  it('显示开发指南区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('开发指南')
  })
})