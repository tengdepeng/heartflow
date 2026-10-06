// ============================================================
// TimelineIndex 视图测试 - 时间线索引
// ============================================================
import { ref } from 'vue'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { invalidateCache } from '../../engine/storage/core'

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
    migrateShardKeysToLocalDay: () => ({
      alreadyDone: true, scannedShards: 0, movedEntries: 0, shardsBefore: 0, shardsAfter: 0,
    }),
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
    localStorage.clear()
    invalidateCache()
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

// ============================================================
// NarrativeReportPanel 导航审核 · 孤儿组件集成（INCR-255）
// 消费 useNarrativeGenerator + useReportExporter，走真实 localStorage 持久化。
// ============================================================
describe('NarrativeReportPanel 叙事报告集成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    invalidateCache()
    mockStats.value = {
      totalEntries: 150,
      shardCount: 12,
      averageWeight: 0.65,
      typeDistribution: { crystal: 60, note: 40, emotion: 30, session: 15, anchor: 5 },
      governanceDistribution: { active: 120, archived: 25, released: 10, deleted: 5 },
    }
  })

  async function clickButton(wrapper: ReturnType<typeof mount>, text: string) {
    const btn = wrapper.findAll('button').find(b => b.text().includes(text))
    expect(btn, `应存在按钮"${text}"`).toBeTruthy()
    await btn!.trigger('click')
  }

  it('渲染叙事报告面板骨架', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('叙事报告')
    expect(text).toContain('生成报告')
    expect(text).toContain('已生成报告')
  })

  it('初始空态提示暂无报告', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无报告')
  })

  it('生成今日叙事写入报告列表并渲染统计详情', async () => {
    const wrapper = await getWrapper()
    await clickButton(wrapper, '生成今日叙事')
    const text = wrapper.text()
    // 报告持久化进列表
    expect(text).toContain('时间长廊叙事')
    expect(text).not.toContain('暂无报告')
    // 详情自动选中渲染统计
    expect(text).toContain('报告详情')
    expect(text).toContain('专注分钟')
  })

  it('从报告列表选中已生成报告重现详情', async () => {
    const wrapper = await getWrapper()
    await clickButton(wrapper, '生成今日叙事')
    // 断言列表存在报告条目，重新切换选中后详情仍渲染
    expect(wrapper.text()).toContain('时间长廊叙事')
    await wrapper.findAll('button').find(b => b.classes().includes('nrp-item'))!.trigger('click')
    expect(wrapper.text()).toContain('报告详情')
  })

  it('导出 Markdown 生成导出结果并出现下载入口', async () => {
    const wrapper = await getWrapper()
    await clickButton(wrapper, '生成今日叙事')
    await clickButton(wrapper, '导出 Markdown')
    const text = wrapper.text()
    expect(text).toContain('字节')
    expect(text).toContain('下载')
  })
})