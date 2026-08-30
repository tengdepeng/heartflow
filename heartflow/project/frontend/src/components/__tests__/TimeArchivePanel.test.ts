// ============================================================
// TimeArchivePanel 组件测试（INCR-14：时光档案面板）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import TimeArchivePanel from '../TimeArchivePanel.vue'

// ---- 可变测试态（vi.hoisted 使其在 vi.mock 提升后仍可访问） ----
const h = vi.hoisted(() => ({
  mockVersion: { value: 1 },
  mockSource: {} as Record<string, any>,
  mockItems: [] as any[],
}))

// ---- 模拟 storage（仅需 storageVersion） ----
vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => [],
    getCrystals: () => [],
    getNotes: () => [],
    getEmotions: () => [],
    getAnchors: () => [],
    getKV: () => [],
    setKV: vi.fn(),
  },
  storageVersion: h.mockVersion,
}))

// ---- 模拟 river（隔离 body/habit/movement 等子模块读取） ----
vi.mock('../../modules/timeline/river', () => ({
  createRiverItems: () => h.mockItems,
  createReplayTimer: () => ({ start: vi.fn(), stop: vi.fn() }),
  getRiverItemKey: (item: any) => item?.id || '',
  getRiverSource: () => h.mockSource,
  getAllTags: () => [],
  filterByTag: (items: any[]) => items,
  computeDailySummaries: () => [],
}))

function emptySource() {
  const s: Record<string, any> = {
    sessions: [], crystals: [], notes: [], emotions: [], anchors: [],
    bodyLogs: [], habits: [], movementRecords: [], breakRecords: [], dialogueSessions: [],
  }
  return s
}

function seedSource() {
  const now = Date.now()
  const start = now - 90 * 60 * 1000
  const source = emptySource()
  source.sessions = [{ id: 's1', start, end: now, elapsed: 90 * 60 * 1000, tags: [] }]
  source.notes = [{ id: 'n1', title: '晨记', content: '', tags: [], createdAt: new Date(now).toISOString() }]
  source.emotions = [{ id: 'e1', type: 'happy', scene: '', tags: [], createdAt: new Date(now).toISOString() }]
  h.mockSource = source
  h.mockItems = [
    { id: 'r1', type: 'session', ts: start, session: source.sessions[0] },
    { id: 'r2', type: 'note', ts: now, note: source.notes[0] },
    { id: 'r3', type: 'emotion', ts: now, emotion: source.emotions[0] },
  ]
}

function mountPanel() {
  return mount(TimeArchivePanel)
}

describe('TimeArchivePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.mockSource = emptySource()
    h.mockItems = []
  })

  it('空数据呈现空态引导', () => {
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('时光档案')
    expect(wrapper.text()).toContain('时间之河还静默着')
    expect(wrapper.text()).not.toContain('专注时长')
  })

  it('渲染档案概览与年度回顾统计', () => {
    seedSource()
    const year = new Date().getFullYear()
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('总条目')
    expect(wrapper.text()).not.toContain('时间之河还静默着')
    expect(wrapper.text()).toContain(`${year} 年度回顾`)
    // 90 分钟专注 → 1 小时 30 分
    expect(wrapper.text()).toContain('1 小时 30 分')
    // 主导情绪 happy → 喜悦
    expect(wrapper.text()).toContain('喜悦')
    // 情绪健康指数 100（仅情绪记录为正向）
    expect(wrapper.text()).toContain('100')
  })

  it('渲染情绪曲线区', () => {
    seedSource()
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('情绪曲线')
    expect(wrapper.text()).toContain('转折点')
  })

  it('渲染规律雷达区', () => {
    seedSource()
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('规律雷达')
    expect(wrapper.text()).toContain('周专注高峰')
    expect(wrapper.text()).toContain('周专注低谷')
  })

  it('渲染叙事时光区', async () => {
    seedSource()
    const wrapper = mountPanel()
    // 叙事摘要在 onMounted 后命令式重建，需等待重绘
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    // 叙事标题使用默认日期前缀，仅断言区块存在
    expect(wrapper.text()).toContain('叙事时光')
  })

  it('渲染温和洞察', () => {
    seedSource()
    const wrapper = mountPanel()
    expect(wrapper.text()).toContain('温和洞察')
    expect(wrapper.text()).toContain('篇笔记')
  })
})