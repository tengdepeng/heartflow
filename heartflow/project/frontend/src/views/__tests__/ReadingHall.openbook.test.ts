// ============================================================
// ReadingHall · 乙-1b 集成：从书架「打开阅读」→ 进入逐书阅读器 + 续读定位
// 整链路覆盖 child(emit) → parent(handler) → 阅读器渲染
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage（与 ReadingHall.test.ts 同模式）----
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

// ---- 模拟 pinia（子面板桩化，仅防未然）----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

const SEED_BOOK = {
  id: 'b-open', title: '测试书', author: '', totalPages: 3, currentPage: 0,
  status: 'reading', tags: [], quotes: [], totalReadingTime: 0, lastPosition: 1,
}

async function getWrapper() {
  const { default: ReadingHall } = await import('../ReadingHall.vue')
  return mount(ReadingHall, {
    // 非 shallow：让 BookShelfPanel 真实渲染（否则拿不到 .bsf-read 按钮）
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        // 渲染 title/kicker props + meta + 默认插槽，其他重面板桩化避免开销
        RoomLayout: {
          props: ['title', 'kicker'],
          template: '<div><i class="stub-room-title">{{ title }}</i><slot name="meta" /><slot /></div>',
        },
        TtsControlPanel: true,
        ReadingSrsPanel: true,
        ClassicalVerticalPanel: true,
        ReadingHabitsPanel: true,
        ReadingDashboardPanel: true,
        BookRecommendationsPanel: true,
        ReadingChallengesPanel: true,
        BookReviewsPanel: true,
      },
    },
  })
}

describe('ReadingHall · 书架打开阅读（乙-1b）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    // books 走 JSON.parse(getKV)，正文 getBookContent 不解析 → 存原始文本
    mockStore['hf:reading:books'] = JSON.stringify([SEED_BOOK])
    mockStore['hf:reading:content:b-open'] = '第一段\n第二段\n第三段'
  })

  it('书架点「打开阅读」→ 进入逐书阅读器并加载正文 + 显示书名', async () => {
    vi.resetModules()
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()

    // 切到书架 tab（顺序：书卷/摘录集/回顾/待读箱/人生之书/书架/读书便签；memo 追加末位不占位移）
    const tabs = wrapper.findAll('.rh-tab')
    expect(tabs.length).toBe(7)
    await tabs[5].trigger('click')
    await wrapper.vm.$nextTick()

    // 已导入正文的书籍出现「打开阅读」按钮
    const openBtn = wrapper.find('.bsf-read')
    expect(openBtn.exists()).toBe(true)
    expect(openBtn.text()).toContain('打开阅读')

    // 点击 → 触发父组件 openBookForReading
    await openBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // textarea 来源输入消失，阅读器渲染出 3 个段落
    expect(wrapper.find('.rh-textarea').exists()).toBe(false)
    const paras = wrapper.findAll('.rh-paragraph')
    expect(paras.length).toBe(3)
    expect(paras[0].text()).toContain('第一段')

    // 工具栏显示当前在读书名（可视化「在哪本书」）
    expect(wrapper.text()).toContain('测试书')
  })

  it('无正文的书籍不出现「打开阅读」入口', async () => {
    // 仅元数据、无 content 的书
    mockStore['hf:reading:books'] = JSON.stringify([
      { ...SEED_BOOK, id: 'b-no-content', title: '无正文书', status: 'want_to_read' },
    ])
    vi.resetModules()
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    const tabs = wrapper.findAll('.rh-tab')
    await tabs[3].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.bsf-read').exists()).toBe(false)
  })
})
