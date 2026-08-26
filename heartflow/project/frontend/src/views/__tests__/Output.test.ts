// ============================================================
// Output 视图测试 - 输出管理
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

// ---- 模拟 vue-router ----
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/' }),
}))

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 useOutputManager ----
vi.mock('../../modules/output', () => ({
  useOutputManager: () => ({
    records: ref([]),
    overview: ref({
      totalRecords: 0,
      notes: 0,
      emotions: 0,
      anchors: 0,
    }),
    searchQuery: ref(''),
    filterType: ref('all'),
    isLoading: ref(false),
    getAll: () => [],
    loadRecords: vi.fn(),
    search: vi.fn(),
    setFilter: vi.fn(),
    addRecord: vi.fn(),
    deleteRecord: vi.fn(),
  }),
}))

async function getWrapper() {
  const { default: Output } = await import('../Output.vue')
  return mount(Output, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('Output 输出管理', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题"输出管理"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('输出管理')
  })

  it('显示概览卡片区域', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.overview-card')
    expect(overviewCards.length).toBeGreaterThanOrEqual(4)
  })

  it('概览卡片显示总记录', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总记录')
  })

  it('概览卡片显示笔记', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('笔记')
  })

  it('概览卡片显示情绪', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('情绪')
  })

  it('概览卡片显示心锚', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('心锚')
  })

  it('显示搜索区域', async () => {
    const wrapper = await getWrapper()
    const searchInput = wrapper.find('.output-search')
    expect(searchInput.exists()).toBe(true)
  })

  it('显示筛选区域', async () => {
    const wrapper = await getWrapper()
    const filterSelect = wrapper.find('.output-select')
    expect(filterSelect.exists()).toBe(true)
  })
})