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
const mockEmptyStats = {
  period: { start: '', end: '' },
  totalPublished: 0,
  byStage: {} as Record<string, number>,
  byType: {} as Record<string, number>,
  byChannel: {} as Record<string, number>,
  approvalRate: 0,
  averageReviewDuration: 0,
  dailyTrend: [],
  topTags: [],
  commentStats: { totalComments: 0, totalThreads: 0, resolvedThreads: 0, averageRepliesPerThread: 0, mostActiveThreads: [] },
  versionStats: { totalVersions: 0, totalSnapshots: 0, averageVersionsPerRecord: 0, averageChangePercent: 0, mostVersionedRecords: [] },
  computedAt: '',
}

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
    get: () => undefined,
    update: () => false,
    loadRecords: vi.fn(),
    search: vi.fn(),
    setFilter: vi.fn(),
    addRecord: vi.fn(),
    deleteRecord: vi.fn(),
  }),
  usePublishPipeline: () => ({
    config: ref({}),
    pipelines: ref({}),
    getStage: () => 'draft',
    getPipeline: () => null,
    canTransition: () => false,
    transition: () => false,
    submitForReview: () => false,
    approve: () => false,
    reject: () => false,
    publish: () => false,
    archive: () => false,
    withdraw: () => false,
    backToDraft: () => false,
    versions: ref([]),
    createVersion: () => null,
    autoCreateVersion: () => null,
    getVersions: () => [],
    getLatestVersion: () => null,
    getVersion: () => null,
    diffVersions: () => null,
    rollback: () => false,
    comments: ref([]),
    addComment: () => null,
    editComment: () => false,
    deleteComment: () => false,
    resolveComment: () => false,
    reopenComment: () => false,
    getCommentThreads: () => [],
    getReplies: () => [],
    computePublishStats: () => mockEmptyStats,
    addTag: () => false,
    removeTag: () => false,
    setVisibility: () => false,
    checkAutoArchive: () => 0,
    batchSubmitForReview: () => ({ success: 0, fail: 0 }),
    batchPublish: () => ({ success: 0, fail: 0 }),
    batchArchive: () => ({ success: 0, fail: 0 }),
  }),
  PIPELINE_STAGE_META: {},
  PUBLISH_CHANNEL_META: {},
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

// ============================================================
// 集成：发布流水线面板（INCR-411）
// 真缺口：Output.vue 宿主三面板（Stats/Snapshots/Advanced）均由
// useOutputManager 的 records 驱动，usePublishPipeline 发布流水线
// 引擎（7 阶段生命周期/版本管理/发布统计）零 UI 消费。
// 本面板薄委托直引 modules/output 真实引擎，视图级在此验证挂载。
// ============================================================
describe('集成：发布流水线面板（INCR-411）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('面板挂载进 Output 并渲染标题与统计格', async () => {
    const wrapper = await getWrapper()
    const ppl = wrapper.find('[data-testid="ppl-panel"]')
    expect(ppl.exists()).toBe(true)
    expect(ppl.text()).toContain('发布流水线')
    expect(ppl.text()).toContain('草稿 → 审核 → 发布 → 归档 · 版本管理 · 发布统计')
    expect(ppl.text()).toContain('已发布')
    expect(ppl.text()).toContain('流水线')
    expect(ppl.text()).toContain('通过率')
  })

  it('空态渲染引导文案与发布统计网格', async () => {
    const wrapper = await getWrapper()
    const ppl = wrapper.find('[data-testid="ppl-panel"]')
    expect(ppl.find('[data-testid="ppl-no-stage"]').exists()).toBe(true)
    expect(ppl.find('[data-testid="ppl-stat-grid"]').exists()).toBe(true)
    expect(ppl.text()).toContain('暂无流水线 · 发布引擎等待第一条产出')
    expect(ppl.text()).toContain('按类型')
    expect(ppl.text()).toContain('协作')
  })
})