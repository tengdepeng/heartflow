// ============================================================
// TimelineIndex 视图测试 - 时间线索引
// ============================================================
import { ref } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 vue-router ----
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// ---- 模拟 timeline-index 模块 ----
const mockStats = ref({
  totalEntries: 150,
  shardCount: 12,
  averageWeight: 0.65,
  typeDistribution: { crystal: 60, note: 40, emotion: 30, session: 15, anchor: 5 },
  governanceDistribution: { active: 120, archived: 25, released: 10, deleted: 5 },
})

const mockCacheStats = ref({
  cachedShards: 8,
  maxCacheSize: 204800,
  cacheSizeBytes: 102400,
})

vi.mock('../../modules/timeline-index', () => ({
  useTimelineIndex: () => ({
    getStats: () => mockStats.value,
    getCacheStats: () => mockCacheStats.value,
    queryByTime: () => ({ entries: [], total: 0, shardsScanned: 0, hasMore: false }),
    rebuildSecondaryIndex: () => true,
    clearCache: vi.fn(),
  }),
}))

async function getWrapper() {
  const { default: TimelineIndex } = await import('../TimelineIndex.vue')
  return mount(TimelineIndex, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('TimelineIndex 时间线索引', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStats.value = {
      totalEntries: 150,
      shardCount: 12,
      averageWeight: 0.65,
      typeDistribution: { crystal: 60, note: 40, emotion: 30, session: 15, anchor: 5 },
      governanceDistribution: { active: 120, archived: 25, released: 10, deleted: 5 },
    }
  })

  it('渲染标题"时间线索引"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间线索引')
  })

  it('渲染快速导航卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间之河')
    expect(wrapper.text()).toContain('时间长廊')
  })

  it('显示索引统计 - 总条目', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('150')
    expect(wrapper.text()).toContain('总条目')
  })

  it('显示索引统计 - 分片数', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('分片数')
  })

  it('显示索引统计 - 活跃条目', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('120')
    expect(wrapper.text()).toContain('活跃条目')
  })

  it('显示类型分布', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('类型分布')
    expect(wrapper.text()).toContain('结晶')
    expect(wrapper.text()).toContain('笔记')
  })

  it('显示查询快捷入口', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('最近 7 天')
    expect(wrapper.text()).toContain('最近 30 天')
  })

  it('显示索引维护区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('索引维护')
  })
})