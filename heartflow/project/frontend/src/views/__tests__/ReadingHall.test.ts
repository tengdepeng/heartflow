// ============================================================
// ReadingHall 视图测试 - 阅览殿
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { _resetReadingModuleState } from '../../modules/reading/challenges'
import {
  emitRoomSignal,
  clearRoomSignals,
  getSignals,
  ROOM_LABELS,
} from '../../modules/room-resonance'

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
        // ⚠️ shallow 模式下桩组件默认「不渲染插槽」，而阅览殿全部正文都挂在
        // RoomLayout 内 → 不显式透传插槽时 wrapper.text() 恒为空串（会让本文件
        // 15/20 用例静默红灯）。这里给出会渲染 title/kicker props + meta +
        // 默认插槽的手写桩，既修复红灯也保住「标题经 props 下传」这一契约断言。
        RoomLayout: {
          props: ['title', 'kicker'],
          template: '<div><i class="stub-room-title">{{ title }}</i><i class="stub-room-kicker">{{ kicker }}</i><slot name="meta" /><slot /></div>',
        },
      },
    },
  })
}

describe('ReadingHall 阅览殿', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    clearRoomSignals()
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

  it('显示十二个标签页（书卷/摘录集/回顾/待读箱/人生之书/书架/日历/金句/报告/叙事/读书便签/速度·洞察）', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs.length).toBe(12)
    expect(tabs[0].text()).toContain('书卷')
    expect(tabs[1].text()).toContain('摘录集')
    expect(tabs[2].text()).toContain('回顾')
    expect(tabs[3].text()).toContain('待读箱')
    expect(tabs[4].text()).toContain('人生之书')
    expect(tabs[5].text()).toContain('书架')
    expect(tabs[6].text()).toContain('日历')
    expect(tabs[7].text()).toContain('金句')
    expect(tabs[8].text()).toContain('报告')
    expect(tabs[9].text()).toContain('叙事')
    expect(tabs[10].text()).toContain('读书便签')
    expect(tabs[11].text()).toContain('速度·洞察')
  })

  it('挂载读书便签面板 ReadingMemoPanel', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[10].trigger('click') // 读书便签
    await wrapper.vm.$nextTick()
    expect(wrapper.find('reading-memo-panel-stub').exists()).toBe(true)
  })

  it('挂载年度叙事面板 ReadingNarrativePanel', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[9].trigger('click') // 叙事
    await wrapper.vm.$nextTick()
    expect(wrapper.find('reading-narrative-panel-stub').exists()).toBe(true)
  })

  it('挂载待读箱面板 ReadingInboxPanel', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[3].trigger('click') // 待读箱
    await wrapper.vm.$nextTick()
    expect(wrapper.find('reading-inbox-panel-stub').exists()).toBe(true)
  })

  it('挂载人生之书面板 LifeBookPanel', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[4].trigger('click') // 人生之书
    await wrapper.vm.$nextTick()
    expect(wrapper.find('life-book-panel-stub').exists()).toBe(true)
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
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
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

// ============================================================
// 集成：跨房间共鸣（阅览殿纳入 RoomKey='reading'）
// ============================================================
describe('ReadingHall 跨房间共鸣', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    clearRoomSignals()
    _resetReadingModuleState()
  })

  it('阅览殿加入房间标签表', () => {
    expect(ROOM_LABELS['reading']).toBe('阅览殿')
  })

  it('挂载后发射本房「阅读」信号（空书架）', async () => {
    await getWrapper()
    const mine = getSignals('reading')
    expect(mine.length).toBeGreaterThan(0)
    const last = mine[mine.length - 1]
    expect(last.room).toBe('reading')
    expect(last.kind).toBe('reading')
    expect(last.label).toBe('书架还空着')
  })

  it('呈现其他房间的光痕并过滤本房回声', async () => {
    emitRoomSignal({ room: 'study', kind: 'note', label: '3 篇思绪在架上', ts: Date.now() })
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('跨房间共鸣态势')
    expect(text).toContain('思绪书房')
    expect(text).toContain('3 篇思绪在架上')
    // 本房回声不复现
    const items = wrapper.findAll('.climate-item')
    expect(items).toHaveLength(1)
    expect(items[0].text()).not.toContain('阅览殿')
  })

  it('无其他房间信号时展示静默文案', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'EmptyState' }).exists()).toBe(true)
    expect(wrapper.findAll('.climate-item')).toHaveLength(0)
  })

  // ⚠️ 本用例必须放在最后：它用 vi.resetModules() 重置模块表以让 hall 引擎的
  // 模块级 books/sessions 快照吃到种子数据，此后本文件顶部的静态 import 绑定
  // 指向旧单例，故它之后不得再有依赖 store 的用例。
  it('有藏书 / 阅读会话时信号带藏书、在读与今日分钟', async () => {
    const today = new Date().toISOString().split('T')[0]
    mockStore['hf:reading:books'] = JSON.stringify([
      { id: 'b1', title: '活着', author: '余华', totalPages: 200, currentPage: 40, status: 'reading', tags: [], quotes: [], totalReadingTime: 25 },
      { id: 'b2', title: '平凡的世界', author: '路遥', totalPages: 300, currentPage: 300, status: 'finished', tags: [], quotes: [], totalReadingTime: 90 },
    ])
    mockStore['hf:reading:sessions'] = JSON.stringify([
      { id: 's1', bookId: 'b1', startPage: 0, endPage: 40, duration: 25, date: today, timestamp: new Date().toISOString() },
    ])

    vi.resetModules()
    const { useReadingHall } = await import('../../modules/reading/hall')
    const { getSignals: freshSignals } = await import('../../modules/room-resonance')
    expect(useReadingHall().books.value).toHaveLength(2)

    await getWrapper()
    const last = freshSignals('reading').pop()!
    expect(last.label).toContain('藏书 2 本')
    expect(last.label).toContain('在读 1')
    expect(last.label).toContain('今日 25 分')
    expect(last.detail).toBe('已读完 1 本')
  })
})