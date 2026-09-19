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

// ---- 模拟市场源注册表 ----
const mockCatalog = [
  {
    manifest: {
      meta: { id: 'community-alpha', name: 'Alpha 计时', version: '1.0.0', description: '高级计时统计', author: '工坊', tier: 'community', category: 'timer', icon: '🍅' },
      permissions: ['read:history'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:alpha',
      hooks: [],
    },
    downloads: 12000,
    rating: 4.8,
    tags: ['计时', '统计'],
  },
  {
    manifest: {
      meta: { id: 'community-beta', name: 'Beta 笔记', version: '0.8.0', description: '每日回顾卡片', author: '工坊', tier: 'community', category: 'note', icon: '📋' },
      permissions: ['read:history', 'read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:beta',
      hooks: [],
    },
    downloads: 8000,
    rating: 4.5,
    tags: ['回顾', '笔记'],
  },
]

vi.mock('../../modules/plugin/plugin-registry', () => ({
  CATEGORY_LABELS: { timer: '计时', note: '笔记', other: '其他' },
  CATEGORY_ORDER: ['timer', 'note', 'other'],
  pluginMarketplaceRegistry: {
    getAll: () => mockCatalog,
    getCatalog: () => [...mockCatalog].sort((a, b) => b.downloads - a.downloads).map(e => e.manifest),
    getCategories: () => [
      { id: 'timer', label: '计时', count: 1 },
      { id: 'note', label: '笔记', count: 1 },
    ],
    count: () => mockCatalog.length,
    byCategory: (category: string | null) => category
      ? mockCatalog.filter(e => e.manifest.meta.category === category).map(e => e.manifest)
      : mockCatalog.map(e => e.manifest),
    search: (kw: string) => {
      const k = kw.trim().toLowerCase()
      if (!k) return mockCatalog.map(e => e.manifest)
      return mockCatalog.filter(e =>
        [e.manifest.meta.id, e.manifest.meta.name, e.manifest.meta.description, ...e.tags]
          .join(' ').toLowerCase().includes(k),
      ).map(e => e.manifest)
    },
    find: (id: string) => mockCatalog.find(e => e.manifest.meta.id === id)?.manifest,
    isMarketPlugin: (id: string) => mockCatalog.some(e => e.manifest.meta.id === id),
    getDependencyGraph: () => mockCatalog.map((e: any) => ({
      id: e.manifest.meta.id,
      version: e.manifest.meta.version,
      dependencies: e.dependencies ?? [],
    })),
  },
}))

// ---- 模拟 types ----
vi.mock('../../modules/plugin/types', () => ({
  PluginManifest: {},
  PluginTier: {},
  CORE_PLUGINS: [],
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

  it('概览显示真实市场统计（可安装数/分类数）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('插件分类')
    // 市场条目与分类均来自注册表
    expect(wrapper.text()).toContain('Alpha 计时')
    expect(wrapper.text()).toContain('Beta 笔记')
    expect(wrapper.text()).toContain('计时')
    expect(wrapper.text()).toContain('笔记')
  })

  it('市场卡片展示下载量与评分', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('1.2w') // 12000 下载格式化
    expect(text).toContain('4.8')
    expect(text).toContain('8.0k') // 8000 下载格式化
  })

  it('按分类筛选市场插件', async () => {
    const wrapper = await getWrapper()
    const chips = wrapper.findAll('.pm-chip')
    const noteChip = chips.find(c => c.text().includes('笔记'))
    await noteChip!.trigger('click')
    const cards = wrapper.findAll('.pm-community-card')
    expect(cards.length).toBe(1)
    expect(wrapper.text()).toContain('Beta 笔记')
    expect(wrapper.text()).not.toContain('Alpha 计时')
    // 返回全部
    const allChip = wrapper.findAll('.pm-chip').find(c => c.text().includes('全部'))
    await allChip!.trigger('click')
    expect(wrapper.findAll('.pm-community-card').length).toBe(2)
  })

  it('搜索市场插件', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.pm-search')
    await input.setValue('回顾')
    const cards = wrapper.findAll('.pm-community-card')
    expect(cards.length).toBe(1)
    expect(wrapper.text()).toContain('Beta 笔记')
    expect(wrapper.text()).not.toContain('Alpha 计时')
  })

  it('搜索无命中显示空状态', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.pm-search')
    await input.setValue('不存在的插件')
    expect(wrapper.findAll('.pm-community-card').length).toBe(0)
    expect(wrapper.text()).toContain('没有匹配的市场插件')
  })

  it('渲染更新管理区块（无市场插件已安装时显示最新提示）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('更新管理')
    expect(wrapper.text()).toContain('所有插件均已是最新版本')
  })

  it('渲染沙箱运行状态区块', async () => {
    const wrapper = await getWrapper()
    const section = wrapper.find('[data-testid="sandbox-runtime"]')
    expect(section.exists()).toBe(true)
    expect(wrapper.text()).toContain('沙箱运行状态')
  })

  it('沙箱区块展示等级分布与守卫状态', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('完全沙箱')
    expect(text).toContain('受限沙箱')
    expect(text).toContain('只读沙箱')
    // 守卫在 onMounted 启动
    expect(text).toContain('守卫已启动')
  })

  it('沙箱区块展示已启用插件的沙箱行（推荐等级/API 计数）', async () => {
    const wrapper = await getWrapper()
    const rows = wrapper.findAll('.pm-sandbox-row')
    expect(rows.length).toBeGreaterThan(0)
    // 已启用插件（test-plugin）被同步为活跃沙箱
    expect(wrapper.text()).toContain('测试插件')
  })
})