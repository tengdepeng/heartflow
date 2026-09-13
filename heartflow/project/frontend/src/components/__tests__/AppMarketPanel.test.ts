// ============================================================
// AppMarketPanel 应用市场面板测试（INCR-93）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockItems = ref<any[]>([])
const mockInstalledIds = ref<Set<string>>(new Set())
const mockFavorites = ref<Set<string>>(new Set())
const mockInstallHistory = ref<any[]>([])
const mockFilter = ref<any>({
  type: 'all',
  query: '',
  sortBy: 'popular',
  installedOnly: false,
  freeOnly: false,
})

const mockSetFilter = vi.fn((p: any) => {
  mockFilter.value = { ...mockFilter.value, ...p }
})
const mockInstallItem = vi.fn()
const mockUninstallItem = vi.fn()
const mockUpdateItem = vi.fn()
const mockToggleFavorite = vi.fn()
const mockIsFavorite = vi.fn((id: string) => mockFavorites.value.has(id))
const mockGetItem = vi.fn((id: string) => mockItems.value.find(i => i.id === id))
const mockGetInstallHistory = vi.fn(() => [...mockInstallHistory.value].reverse())

const mockFilteredItems = computed(() => {
  let result = [...mockItems.value]
  const f = mockFilter.value
  if (f.type && f.type !== 'all') result = result.filter(i => i.type === f.type)
  if (f.query) {
    const q = f.query.toLowerCase()
    result = result.filter(
      i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some((t: string) => t.toLowerCase().includes(q)),
    )
  }
  if (f.installedOnly) result = result.filter(i => mockInstalledIds.value.has(i.id))
  if (f.freeOnly) result = result.filter(i => i.isFree)
  return result
})

const mockMarketStats = computed(() => ({
  totalItems: mockItems.value.length,
  installedCount: mockInstalledIds.value.size,
  byType: {},
  recentlyUpdated: 0,
}))

const mockInstalledItems = computed(() =>
  mockItems.value.filter(i => mockInstalledIds.value.has(i.id)),
)
const mockFavoriteItems = computed(() =>
  mockItems.value.filter(i => mockFavorites.value.has(i.id)),
)

vi.mock('../../modules/space/app-market', () => ({
  useAppMarket: () => ({
    filteredItems: mockFilteredItems,
    marketStats: mockMarketStats,
    installedItems: mockInstalledItems,
    favoriteItems: mockFavoriteItems,
    installedIds: mockInstalledIds,
    installHistory: mockInstallHistory,
    setFilter: mockSetFilter,
    installItem: mockInstallItem,
    uninstallItem: mockUninstallItem,
    updateItem: mockUpdateItem,
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
    getItem: mockGetItem,
    getInstallHistory: mockGetInstallHistory,
  }),
}))

import AppMarketPanel from '../AppMarketPanel.vue'

const sampleItems = [
  {
    id: 'tpl-a',
    name: '极简仪表盘',
    description: '干净利落的数据仪表盘模板',
    icon: '📊',
    type: 'template',
    author: '心流官方',
    version: '1.2.0',
    tags: ['仪表盘'],
    installCount: 1200,
    status: 'not_installed',
    updatedAt: '2026-05-20T10:00:00Z',
    isFree: true,
    compatibility: ['>=1.0.0'],
  },
  {
    id: 'thm-b',
    name: '暮色主题',
    description: '柔和暮色配色主题',
    icon: '🎨',
    type: 'theme',
    author: '社区',
    version: '0.9.0',
    tags: ['主题'],
    installCount: 300,
    status: 'not_installed',
    updatedAt: '2026-06-01T10:00:00Z',
    isFree: false,
    compatibility: ['>=1.0.0'],
  },
]

async function mountPanel() {
  const wrapper = mount(AppMarketPanel)
  await nextTick()
  return wrapper
}

describe('AppMarketPanel 应用市场', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockItems.value = []
    mockInstalledIds.value = new Set()
    mockFavorites.value = new Set()
    mockInstallHistory.value = []
    mockFilter.value = {
      type: 'all',
      query: '',
      sortBy: 'popular',
      installedOnly: false,
      freeOnly: false,
    }
  })

  it('标题徽标与四个 tab 渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('应用市场')
    expect(wrapper.text()).toContain('浏览 · 安装 · 收藏 · 历史')
    expect(wrapper.findAll('.amp-tab').length).toBe(4)
  })

  it('市场空态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('没有匹配的应用')
  })

  it('市场填充态：渲染条目与统计', async () => {
    mockItems.value = sampleItems
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('极简仪表盘')
    expect(wrapper.text()).toContain('暮色主题')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.findAll('.amp-item').length).toBe(2)
    expect(wrapper.find('.amp-item-installs').text()).toContain('1200')
  })

  it('类型筛选触发 setFilter', async () => {
    mockItems.value = sampleItems
    const wrapper = await mountPanel()
    const themeChip = wrapper.findAll('.amp-chip').find(c => c.text() === '主题')
    expect(themeChip).toBeTruthy()
    await themeChip!.trigger('click')
    expect(mockSetFilter).toHaveBeenCalledWith(expect.objectContaining({ type: 'theme' }))
  })

  it('搜索输入触发 setFilter', async () => {
    const wrapper = await mountPanel()
    const input = wrapper.find('.amp-search')
    await input.setValue('仪表盘')
    expect(mockSetFilter).toHaveBeenCalledWith(expect.objectContaining({ query: '仪表盘' }))
  })

  it('点击安装调用 installItem', async () => {
    mockItems.value = sampleItems
    const wrapper = await mountPanel()
    const installBtn = wrapper.findAll('.amp-btn--primary').find(b => b.text() === '安装')
    expect(installBtn).toBeTruthy()
    await installBtn!.trigger('click')
    expect(mockInstallItem).toHaveBeenCalledWith('tpl-a')
  })

  it('已安装 tab 展示已安装条目', async () => {
    mockItems.value = sampleItems
    mockInstalledIds.value = new Set(['tpl-a'])
    const wrapper = await mountPanel()
    await wrapper.findAll('.amp-tab')[1].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('极简仪表盘')
    expect(wrapper.text()).not.toContain('暮色主题')
    expect(wrapper.text()).toContain('卸载')
  })

  it('收藏 tab 展示收藏条目并可取消', async () => {
    mockItems.value = sampleItems
    mockFavorites.value = new Set(['thm-b'])
    const wrapper = await mountPanel()
    await wrapper.findAll('.amp-tab')[2].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('暮色主题')
    const favBtn = wrapper.findAll('.amp-btn--small').find(b => b.text() === '取消收藏')
    expect(favBtn).toBeTruthy()
    await favBtn!.trigger('click')
    expect(mockToggleFavorite).toHaveBeenCalledWith('thm-b')
  })

  it('历史 tab 展示安装记录', async () => {
    mockInstallHistory.value = [
      { id: 'h1', itemId: 'tpl-a', action: 'install', version: '1.2.0', timestamp: '2026-06-01T08:00:00Z' },
      { id: 'h2', itemId: 'thm-b', action: 'uninstall', version: '0.9.0', timestamp: '2026-06-02T08:00:00Z' },
    ]
    mockItems.value = sampleItems
    const wrapper = await mountPanel()
    await wrapper.findAll('.amp-tab')[3].trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('极简仪表盘')
    expect(wrapper.text()).toContain('暮色主题')
    expect(wrapper.text()).toContain('安装')
    expect(wrapper.text()).toContain('卸载')
    expect(wrapper.findAll('.amp-history-item').length).toBe(2)
  })
})
