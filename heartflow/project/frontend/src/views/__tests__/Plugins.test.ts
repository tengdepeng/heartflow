// ============================================================
// Plugins 视图测试 - 插件管理器
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
  { id: 'core-plugin', manifest: { meta: { id: 'core-plugin', name: '核心插件', version: '1.0.0', icon: '⚙️', description: '内置核心插件', tier: 'official' }, permissions: ['data:read'] }, enabled: true },
  { id: 'third-plugin', manifest: { meta: { id: 'third-plugin', name: '第三方插件', version: '2.0.0', icon: '🔌', description: '社区插件', tier: 'community', author: '社区作者' }, permissions: ['data:read', 'data:write'] }, enabled: false },
])

const mockOfficialPlugins = ref([
  { id: 'core-plugin', manifest: { meta: { id: 'core-plugin', name: '核心插件', version: '1.0.0', icon: '⚙️', description: '内置核心插件', tier: 'official' }, permissions: ['data:read'] }, enabled: true },
])

vi.mock('../../stores/plugin', () => ({
  usePluginStore: () => ({
    plugins: mockPlugins,
    initialized: ref(true),
    enabledPlugins: ref([]),
    disabledPlugins: ref([]),
    officialPlugins: mockOfficialPlugins,
    communityPlugins: ref([]),
    experimentalPlugins: ref([]),
    init: vi.fn(),
    toggle: vi.fn(),
    uninstallPlugin: vi.fn(),
  }),
  CORE_PLUGINS: [],
}))

// ---- 模拟 types ----
vi.mock('../../modules/plugin/types', () => ({
  CORE_PLUGINS: [],
  PluginTier: {},
  PERMISSION_LABELS: { 'data:read': '读取数据', 'data:write': '写入数据' },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: Plugins } = await import('../Plugins.vue')
  return mount(Plugins, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('Plugins 插件管理器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('插件管理')
    expect(wrapper.text()).toContain('管理你的插件')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已安装')
  })

  it('显示核心插件列表', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('核心插件（内置）')
    expect(wrapper.text()).toContain('内置核心插件')
  })

  it('显示插件启用/禁用状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('第三方插件')
  })

  it('显示第三方插件区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('社区作者')
  })

  it('显示启用/禁用按钮', async () => {
    const wrapper = await getWrapper()
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThan(0)
  })
})