// ============================================================
// FlipBookPanel 组件测试（可翻阅成书 · 照片日记 #8）
// 覆盖：封面/页序渲染 · 双页与单页 · 翻页导航 · 圆点跳页 · 照片页 · 复制导出
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import type { YearReport } from '../../modules/reading/reading-report'
import type { ReadingNarrative } from '../../modules/reading/reading-narrative'

const mockNarrative = vi.fn()
const mockPhotoEntries = vi.fn()
const mockWriteText = vi.fn((_text: string) => Promise.resolve())

vi.mock('../../modules/reading/reading-narrative', () => ({
  useReadingNarrative: () => mockNarrative(),
}))

vi.mock('../../modules/anchor/photo-diary', () => ({
  usePhotoDiary: () => ({ entries: mockPhotoEntries(), load: vi.fn() }),
}))

const REPORT: YearReport = {
  year: 2026,
  totalBooks: 12,
  finishedBooks: 8,
  totalMinutes: 3000,
  activeDays: 120,
  bestDay: null,
  avgWpm: 420,
  totalWords: 200_000,
  topTags: [{ tag: '小说', count: 6 }],
  monthly: [],
}

const NARRATIVE: ReadingNarrative = {
  year: 2026,
  hasData: true,
  headline: '2026 · 你是一位深耕者',
  overview: '这一年，你在 120 天里翻开书页，累计 3000 分钟，读完 8 本。',
  eras: [
    {
      id: 'Q1',
      season: '春',
      label: '春 · 小说',
      months: '1-3月',
      minutes: 600,
      books: 3,
      topTag: '小说',
      highlight: '春天里读完 3 本、投入 600 分钟，偏爱「小说」',
    },
  ],
  persona: [{ key: 'deepdiver', label: '深耕者', detail: '过半是「小说」', score: 0.8 }],
  highlights: ['春（1-3月）：春天里读完 3 本'],
  discovery: '春季是你的黄金时段。',
}

const PHOTOS = [
  { id: 'p1', date: '2026-03-01', thumbs: ['data:image/png;base64,AAA'], images: ['i1'], captions: ['春日'] },
]

function emptyNarrative(): ReadingNarrative {
  return {
    year: 2026,
    hasData: false,
    headline: '2026 · 待启程',
    overview: '',
    eras: [],
    persona: [],
    highlights: [],
    discovery: '',
  }
}

async function getWrapper() {
  const { default: FlipBookPanel } = await import('../FlipBookPanel.vue')
  return mount(FlipBookPanel)
}

function btnByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find(b => b.text() === text)!
}

describe('FlipBookPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockNarrative.mockReturnValue({
      viewYear: ref(2026),
      report: ref(REPORT),
      setYear: vi.fn(),
      narrative: ref(NARRATIVE),
    })
    mockPhotoEntries.mockReturnValue(ref(PHOTOS))
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    })
  })

  it('渲染标题与年份', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.fbk-title').text()).toContain('成书')
    expect(wrapper.find('.fbk-year-val').text()).toBe('2026')
  })

  it('默认双页渲染两张页且首张为封面', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.fbk-page')).toHaveLength(2)
    expect(wrapper.find('.fbk-page.kind-cover').exists()).toBe(true)
    expect(wrapper.find('.fbk-cover-title').text()).toBe('2026 · 人生之书')
  })

  it('页码指示与上一页在首页禁用', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.fbk-indicator').text()).toBe('第 1-2 / 7 页')
    expect(btnByText(wrapper, '‹ 上一页').attributes('disabled')).toBeDefined()
    expect(btnByText(wrapper, '下一页 ›').attributes('disabled')).toBeUndefined()
  })

  it('双页模式下一页整张跨页前进（而非只 +1 页码而画面不动）', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '下一页 ›').trigger('click')
    expect(wrapper.find('.fbk-indicator').text()).toBe('第 3-4 / 7 页')
    const folios = wrapper.findAll('.fbk-page .fbk-folio').map(e => e.text())
    expect(folios).toEqual(['3', '4'])
  })

  it('单页模式下一页一次一页', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '单页').trigger('click')
    await btnByText(wrapper, '下一页 ›').trigger('click')
    expect(wrapper.find('.fbk-indicator').text()).toBe('第 2 / 7 页')
  })

  it('切到单页只渲染一张页', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '单页').trigger('click')
    expect(wrapper.findAll('.fbk-page')).toHaveLength(1)
  })

  it('点圆点跳到对应页', async () => {
    const wrapper = await getWrapper()
    const dots = wrapper.findAll('.fbk-dot')
    expect(dots).toHaveLength(7)
    await dots[5].trigger('click')
    expect(wrapper.find('.fbk-indicator').text()).toBe('第 5-6 / 7 页')
  })

  it('翻到照片页渲染 PhotoTile', async () => {
    const wrapper = await getWrapper()
    // 封面/概览/分季/人格 后为照片页（索引 4，双页展开落在 4-5 展台）
    const dots = wrapper.findAll('.fbk-dot')
    await dots[4].trigger('click')
    expect(wrapper.find('.fbk-page.kind-photos').exists()).toBe(true)
    expect(wrapper.find('.fbk-page.kind-photos .hf-photo').exists()).toBe(true)
  })

  it('复制成书写入剪贴板 Markdown', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '复制成书').trigger('click')
    expect(mockWriteText).toHaveBeenCalled()
    const md = mockWriteText.mock.calls[0][0]
    expect(md).toContain('# 2026 · 人生之书')
    expect(wrapper.find('.fbk-copied').exists()).toBe(true)
  })

  it('无数据时渲染空页', async () => {
    mockNarrative.mockReturnValue({
      viewYear: ref(2026),
      report: ref({ ...REPORT, totalBooks: 0, finishedBooks: 0, totalMinutes: 0, activeDays: 0, avgWpm: 0, totalWords: 0, topTags: [] }),
      setYear: vi.fn(),
      narrative: ref(emptyNarrative()),
    })
    mockPhotoEntries.mockReturnValue(ref([]))
    const wrapper = await getWrapper()
    expect(wrapper.find('.fbk-page.kind-empty').exists()).toBe(true)
    expect(wrapper.find('.fbk-indicator').text()).toBe('第 1-2 / 2 页')
  })
})
