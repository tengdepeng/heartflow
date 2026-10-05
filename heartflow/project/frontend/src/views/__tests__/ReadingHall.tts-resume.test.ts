// ============================================================
// ReadingHall · INCR-526 读↔听续接 集成
// 阅读器续读位置（lastPosition）→ 听书起读段落 → 朗读推进回写续读位置
// 整链路覆盖 parent(props) → child(TTS 引擎) → parent(handler) → 存储
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage（与 ReadingHall.openbook.test.ts 同模式）----
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

vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

// ---- Mock TTS 环境 ----
const spoken: string[] = []
let endHandlers: (() => void)[] = []
class MockUtterance {
  text: string
  rate = 1
  lang = ''
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(text: string) { this.text = text }
}
function setupTts() {
  ;(globalThis as Record<string, unknown>).SpeechSynthesisUtterance = MockUtterance
  ;(globalThis as Record<string, unknown>).window = globalThis
  ;(globalThis as Record<string, unknown>).speechSynthesis = {
    speak(u: any) { spoken.push(u.text); if (u.onend) endHandlers.push(u.onend) },
    pause: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
  }
}

const SEED_BOOK = {
  id: 'b-tts', title: '续接测试书', author: '', totalPages: 3, currentPage: 0,
  status: 'reading', tags: [], quotes: [], totalReadingTime: 0, lastPosition: 1,
}

async function getWrapper() {
  const { default: ReadingHall } = await import('../ReadingHall.vue')
  return mount(ReadingHall, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        RoomLayout: {
          props: ['title', 'kicker'],
          template: '<div><i class="stub-room-title">{{ title }}</i><slot name="meta" /><slot /></div>',
        },
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

// 切到书架 → 打开有正文的书 → 进入书卷 tab 的沉浸阅读器 + 听书面板
async function openSeededBook(wrapper: any) {
  const tabs = wrapper.findAll('.rh-tab')
  await tabs[5].trigger('click')
  await wrapper.vm.$nextTick()
  await wrapper.find('.bsf-read').trigger('click')
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('ReadingHall · 读↔听续接（INCR-526）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    spoken.length = 0
    endHandlers = []
    Object.keys(mockStore).forEach(k => delete mockStore[k])
    mockStore['hf:reading:books'] = JSON.stringify([SEED_BOOK])
    mockStore['hf:reading:content:b-tts'] = '第一段\n第二段\n第三段'
    setupTts()
  })

  it('打开书后点朗读 → 从续读段落（lastPosition=1）起读', async () => {
    vi.resetModules()
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)

    expect(wrapper.find('.ttp-btn-primary').exists()).toBe(true)
    await wrapper.find('.ttp-btn-primary').trigger('click')
    // 段 1 = 「第二段」，而非从头读「第一段」
    expect(spoken).toEqual(['第二段'])
  })

  it('朗读推进 → 回写续读位置到书架存储（听→读续接）', async () => {
    vi.resetModules()
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)
    await wrapper.find('.ttp-btn-primary').trigger('click')

    // 推进到第三块（段 2）
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()

    const saved = JSON.parse(mockStore['hf:reading:books'])
    expect(saved[0].lastPosition).toBe(2)
    expect(saved[0].lastChunkOffset).toBe(0)
  })

  it('句块级续接：从 lastChunkOffset 起读段内第 N 句', async () => {
    vi.resetModules()
    mockStore['hf:reading:books'] = JSON.stringify([{ ...SEED_BOOK, lastPosition: 0, lastChunkOffset: 1 }])
    mockStore['hf:reading:content:b-tts'] = '甲一。甲二。\n乙一。'
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)

    await wrapper.find('.ttp-btn-primary').trigger('click')
    // 段 0 段内第 2 句 = 「甲二。」，而非段首「甲一。」
    expect(spoken).toEqual(['甲二。'])
  })

  it('句块级续接：朗读推进回写段内偏移 lastChunkOffset', async () => {
    vi.resetModules()
    mockStore['hf:reading:books'] = JSON.stringify([{ ...SEED_BOOK, lastPosition: 0, lastChunkOffset: 0 }])
    mockStore['hf:reading:content:b-tts'] = '甲一。甲二。\n乙一。'
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)

    await wrapper.find('.ttp-btn-primary').trigger('click')
    // 段 0 第 1 句读完 → 推进到段 0 第 2 句（段内偏移 1）
    endHandlers.shift()?.()
    await wrapper.vm.$nextTick()

    const saved = JSON.parse(mockStore['hf:reading:books'])
    expect(saved[0].lastPosition).toBe(0)
    expect(saved[0].lastChunkOffset).toBe(1)
  })

  // 长正文：确保翻页模式分多页，页码导航可用
  const LONG_TEXT = Array.from({ length: 40 }, (_, i) => `第${i}段` + '字'.repeat(200)).join('\n')
  // 切到翻页模式并翻到下一页（触发阅读器 progress 回声）
  async function turnReaderPage(wrapper: any) {
    await wrapper.findAll('.ird-mode')[0].trigger('click')
    await wrapper.vm.$nextTick()
    const navs = wrapper.findAll('.ird-nav')
    await navs[navs.length - 1].trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('跟读开启时忽略阅读器回声，句块偏移不被抹平为段首', async () => {
    vi.resetModules()
    mockStore['hf:reading:books'] = JSON.stringify([{ ...SEED_BOOK, lastPosition: 0, lastChunkOffset: 1 }])
    mockStore['hf:reading:content:b-tts'] = LONG_TEXT
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)

    await wrapper.find('.ttp-follow-btn').trigger('click')
    await wrapper.vm.$nextTick()
    await turnReaderPage(wrapper)

    const saved = JSON.parse(mockStore['hf:reading:books'])
    expect(saved[0].lastPosition).toBe(0)
    expect(saved[0].lastChunkOffset).toBe(1)
  })

  it('跟读关闭时阅读器翻页正常回写续读位置（换段归零）', async () => {
    vi.resetModules()
    mockStore['hf:reading:books'] = JSON.stringify([{ ...SEED_BOOK, lastPosition: 0, lastChunkOffset: 1 }])
    mockStore['hf:reading:content:b-tts'] = LONG_TEXT
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await openSeededBook(wrapper)

    await turnReaderPage(wrapper)

    const saved = JSON.parse(mockStore['hf:reading:books'])
    expect(saved[0].lastPosition).toBeGreaterThan(0)
    expect(saved[0].lastChunkOffset).toBe(0)
  })
})