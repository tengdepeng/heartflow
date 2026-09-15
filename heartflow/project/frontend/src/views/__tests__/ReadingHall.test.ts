// ============================================================
// ReadingHall 视图测试 - 阅览殿
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { _resetReadingModuleState } from '../../modules/reading/challenges'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
    getSessions: () => [],
    getCrystals: () => [],
    getNotes: () => [],
    getEmotions: () => [],
  },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: ReadingHall } = await import('../ReadingHall.vue')
  return mount(ReadingHall, {
    shallow: true,
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('ReadingHall 阅览殿', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('阅览殿')
    expect(wrapper.text()).toContain('在书卷中寻找答案')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('专注次数')
    expect(wrapper.text()).toContain('专注时长')
    expect(wrapper.text()).toContain('结晶数')
  })

  it('显示三个标签页', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toContain('书卷')
    expect(tabs[1].text()).toContain('摘录集')
    expect(tabs[2].text()).toContain('回顾')
  })

  // ---- 批量收口：补挂载孤儿面板（INCR-173）----
  it('挂载荐书面板 BookRecommendationsPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BookRecommendationsPanel' }).exists()).toBe(true)
  })

  it('挂载阅读挑战面板 ReadingChallengesPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'ReadingChallengesPanel' }).exists()).toBe(true)
  })

  it('默认显示书卷标签', async () => {
    const wrapper = await getWrapper()
    const activeTab = wrapper.find('.rh-tab.active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toContain('书卷')
  })

  it('书卷标签显示文本输入区域', async () => {
    const wrapper = await getWrapper()
    const textarea = wrapper.find('.rh-textarea')
    expect(textarea.exists()).toBe(true)
    expect(textarea.attributes('placeholder')).toContain('粘贴文本内容')
  })

  it('载入按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const loadBtn = wrapper.find('.rh-actions .rh-btn')
    expect(loadBtn.exists()).toBe(true)
    expect(loadBtn.attributes('disabled')).toBeDefined()
  })

  it('摘录集标签显示空状态', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[1].trigger('click')
    expect(wrapper.text()).toContain('还没有摘录')
  })

  it('回顾标签显示统计', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('笔记数')
    expect(wrapper.text()).toContain('情绪记录数')
  })

  // ------- 集成：间隔重复面板（P2 收口）-------
  it('集成渲染间隔重复面板（三选一回顾）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('reading-srs-panel-stub').exists()).toBe(true)
  })

  // ------- 集成：阅读总览仪表盘（INCR-160）-------
  it('集成渲染阅读总览仪表盘', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('reading-dashboard-panel-stub').exists()).toBe(true)
  })

  // ------- 集成：书评 · 笔记面板（INCR-239 补挂载孤儿组件）-------
  it('挂载书评笔记面板 BookReviewsPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BookReviewsPanel' }).exists()).toBe(true)
  })

  // ------- 集成：听书控制（INCR-276 补挂载孤儿组件 TtsControlPanel，reading/tts 引擎完备）-------
  it('无正文时书卷页显示来源输入，听书面板不出现', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rh-textarea').exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'TtsControlPanel' }).exists()).toBe(false)
  })

  it('载入正文后挂载听书面板并传入正文文本', async () => {
    mockStore['hf:reading_text'] = '第一段正文。第二段正文。'
    const wrapper = await getWrapper()
    const panel = wrapper.findComponent({ name: 'TtsControlPanel' })
    expect(panel.exists()).toBe(true)
    expect(panel.props('text')).toContain('第一段正文')
  })
})

// ============================================================
// 集成：书评 · 笔记面板 BookReviewsPanel（INCR-239 补挂载孤儿组件）
// 引擎 useBookReviews/useReadingNotes 模块级 refs，测试用 _resetReadingModuleState 复位
// ============================================================
describe('集成：书评 · 笔记面板', () => {
  const K_REV = 'hf:reading:reviews'
  const K_NOTE = 'hf:reading:notes'

  const REVIEW_A = {
    id: 'r1', bookId: 'book_A', bookTitle: '活着', rating: 5, title: '读后随想', content: '非常震撼',
    hasSpoiler: false, recommendationScore: 9, targetAudience: [], tags: ['小说'], readingTime: '2小时',
    timestamp: '2026-09-10T00:00:00.000Z',
  }
  const REVIEW_B = {
    id: 'r2', bookId: 'book_B', bookTitle: '平凡的世界', rating: 3, title: '还不够深', content: '现实主义',
    hasSpoiler: false, recommendationScore: 6, targetAudience: [], tags: [], readingTime: '',
    timestamp: '2026-09-09T00:00:00.000Z',
  }
  const NOTE_A = {
    id: 'n1', bookId: 'book_A', content: '看到福贵的一生，想到平凡的价值', type: 'thought',
    chapter: '第一章', page: 12, quoteId: undefined, relatedNoteIds: [], color: undefined,
    timestamp: '2026-09-10T00:00:00.000Z',
  }

  function seed(opts: { reviews?: boolean; notes?: boolean } = {}) {
    if (opts.reviews) mockStore[K_REV] = [REVIEW_A, REVIEW_B]
    if (opts.notes) mockStore[K_NOTE] = [NOTE_A]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    _resetReadingModuleState()
  })

  async function getBrvWrapper() {
    const { default: BookReviewsPanel } = await import('../../components/BookReviewsPanel.vue')
    return mount(BookReviewsPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
  }

  it('无数据时渲染书评面板骨架与双标签', async () => {
    const wrapper = await getBrvWrapper()
    expect(wrapper.find('.brv').exists()).toBe(true)
    expect(wrapper.text()).toContain('书评 · 笔记')
    expect(wrapper.text()).toContain('0 条记录')
    const tabs = wrapper.findAll('.brv-tab')
    expect(tabs.length).toBe(2)
    expect(tabs[0].text()).toContain('书评')
    expect(tabs[1].text()).toContain('笔记')
    expect(wrapper.text()).toContain('还没有书评')
  })

  it('种书评种子后展示统计、评分分布与书评列表', async () => {
    seed({ reviews: true })
    _resetReadingModuleState()
    const wrapper = await getBrvWrapper()
    expect(wrapper.text()).toContain('2 条记录')
    expect(wrapper.text()).toContain('活着')
    expect(wrapper.text()).toContain('平凡的世界')
    expect(wrapper.text()).toContain('非常震撼')
    const stats = wrapper.findAll('.brv-body')[0].findAll('.brv-stat')
    expect(stats.length).toBe(3)
    const distRows = wrapper.findAll('.brv-dist-row')
    expect(distRows.length).toBe(5)
  })

  it('展开写书评表单并发布新增书评', async () => {
    const wrapper = await getBrvWrapper()
    await wrapper.find('.brv-toggle').trigger('click')
    const inputs = wrapper.findAll('.brv-input')
    await inputs[0].setValue('百年孤独')
    await wrapper.find('.brv-textarea').setValue('魔幻现实主义的杰作')
    await wrapper.find('form.brv-form').trigger('submit')
    expect(wrapper.text()).toContain('百年孤独')
    expect(wrapper.text()).toContain('1 条记录')
  })

  it('笔记标签展示笔记统计与类型分布', async () => {
    seed({ reviews: true, notes: true })
    _resetReadingModuleState()
    const wrapper = await getBrvWrapper()
    const tabs = wrapper.findAll('.brv-tab')
    await tabs[1].trigger('click')
    expect(wrapper.text()).toContain('3 条记录')
    expect(wrapper.text()).toContain('笔记')
    expect(wrapper.find('.brv-note').exists()).toBe(true)
    expect(wrapper.text()).toContain('看到福贵的一生')
    expect(wrapper.text()).toContain('思考')
  })

  it('删除书评后从列表消失', async () => {
    seed({ reviews: true })
    _resetReadingModuleState()
    const wrapper = await getBrvWrapper()
    expect(wrapper.findAll('.brv-review').length).toBe(2)
    await wrapper.find('.brv-del').trigger('click')
    expect(wrapper.findAll('.brv-review').length).toBe(1)
  })
})