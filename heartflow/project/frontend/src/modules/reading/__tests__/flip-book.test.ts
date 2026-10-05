// ============================================================
// flip-book 引擎测试（可翻阅成书 · 照片日记 #8）
// 覆盖：千分位 · 年度照片筛选 · 成书页序组装 · 翻页导航纯函数 · Markdown 导出
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import type { YearReport } from '../reading-report'
import type { ReadingNarrative } from '../reading-narrative'

const mockNarrative = vi.fn()
const mockPhotoEntries = vi.fn()
const mockPhotoLoad = vi.fn()

vi.mock('../reading-narrative', () => ({
  useReadingNarrative: () => mockNarrative(),
}))

vi.mock('../../anchor/photo-diary', () => ({
  usePhotoDiary: () => ({ entries: mockPhotoEntries(), load: mockPhotoLoad }),
}))

import {
  composeFlipBook,
  pickYearPhotos,
  clampPageIndex,
  turnPage,
  canTurn,
  spreadPair,
  pageCount,
  bookProgress,
  bookSummary,
  buildFlipBookMarkdown,
  thousands,
  useFlipBook,
  FLIP_PHOTOS_PER_PAGE,
  FLIP_PHOTOS_MAX,
} from '../flip-book'

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
    {
      id: 'Q3',
      season: '秋',
      label: '秋 · 静读',
      months: '7-9月',
      minutes: 400,
      books: 0,
      topTag: '',
      highlight: '秋天里静静读了 400 分钟',
    },
  ],
  persona: [
    { key: 'deepdiver', label: '深耕者', detail: '过半是「小说」', score: 0.8 },
    { key: 'speedster', label: '速读者', detail: '均速 420 字/分', score: 0.7 },
  ],
  highlights: ['春（1-3月）：春天里读完 3 本'],
  discovery: '春季是你的黄金时段。',
}

const EMPTY_NARRATIVE: ReadingNarrative = {
  year: 2026,
  hasData: false,
  headline: '2026 · 待启程',
  overview: '',
  eras: [],
  persona: [],
  highlights: [],
  discovery: '',
}

const REPORT_EMPTY: YearReport = {
  ...REPORT,
  totalBooks: 0,
  finishedBooks: 0,
  totalMinutes: 0,
  activeDays: 0,
  avgWpm: 0,
  totalWords: 0,
  topTags: [],
}

const PHOTOS = [
  { id: 'p1', date: '2026-03-01', thumbs: ['t1'], images: ['i1'], captions: ['春日'] },
  { id: 'p2', date: '2025-12-01', thumbs: ['t2'], images: ['i2'], captions: [] },
  { id: 'p3', date: '2026-01-05', thumbs: [''], images: ['i3'], captions: [''] },
]

function makeBook(overrides: Partial<Parameters<typeof composeFlipBook>[0]> = {}) {
  return composeFlipBook({
    year: 2026,
    report: REPORT,
    narrative: NARRATIVE,
    photos: PHOTOS,
    ...overrides,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockNarrative.mockReturnValue({
    viewYear: ref(2026),
    report: ref(REPORT),
    setYear: vi.fn(),
    narrative: ref(NARRATIVE),
  })
  mockPhotoEntries.mockReturnValue(ref(PHOTOS))
})

describe('thousands', () => {
  it('千分位分隔并取整', () => {
    expect(thousands(200_000)).toBe('200,000')
    expect(thousands(1234.6)).toBe('1,235')
    expect(thousands(0)).toBe('0')
    expect(thousands(NaN)).toBe('0')
  })
})

describe('pickYearPhotos', () => {
  it('仅取指定年份照片并按日期升序', () => {
    const picked = pickYearPhotos(PHOTOS, 2026)
    expect(picked.map(p => p.date)).toEqual(['2026-01-05', '2026-03-01'])
  })

  it('缩略图缺失时回落原图，caption 缺失时回落日期', () => {
    const picked = pickYearPhotos(PHOTOS, 2026)
    const p3 = picked.find(p => p.id === 'p3-0')!
    expect(p3.src).toBe('i3')
    expect(p3.caption).toBe('2026-01-05')
    const p1 = picked.find(p => p.id === 'p1-0')!
    expect(p1.src).toBe('t1')
    expect(p1.caption).toBe('春日')
  })

  it('超过上限时截断', () => {
    const many = Array.from({ length: FLIP_PHOTOS_MAX + 5 }, (_, i) => ({
      id: `m${i}`,
      date: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
      thumbs: [`t${i}`],
      images: [`i${i}`],
      captions: [''],
    }))
    expect(pickYearPhotos(many, 2026)).toHaveLength(FLIP_PHOTOS_MAX)
  })
})

describe('composeFlipBook', () => {
  it('按封面→概览→分季→人格→光影→发现→尾声组装', () => {
    const book = makeBook()
    expect(book.pages.map(p => p.kind)).toEqual([
      'cover', 'overview', 'era', 'era', 'persona', 'photos', 'discovery', 'closing',
    ])
    expect(book.pages[0].title).toBe('2026 · 人生之书')
    expect(book.title).toBe('2026 · 人生之书')
  })

  it('概览页带五项统计且千分位', () => {
    const overview = makeBook().pages.find(p => p.kind === 'overview')!
    expect(overview.stats?.map(s => s.label)).toEqual(['藏书', '读完', '专注分钟', '阅读天数', '均速字/分'])
    expect(overview.stats?.find(s => s.label === '藏书')?.value).toBe('12')
  })

  it('分季页各带分钟与读完统计', () => {
    const eras = makeBook().pages.filter(p => p.kind === 'era')
    expect(eras).toHaveLength(2)
    expect(eras[0].title).toBe('春 · 1-3月')
    expect(eras[0].stats?.find(s => s.label === '分钟')?.value).toBe('600')
  })

  it('照片超过每页上限时拆成多页', () => {
    const many = Array.from({ length: FLIP_PHOTOS_PER_PAGE + 2 }, (_, i) => ({
      id: `m${i}`,
      date: '2026-02-01',
      thumbs: [`t${i}`],
      images: [`i${i}`],
      captions: [''],
    }))
    const pages = makeBook({ photos: many }).pages.filter(p => p.kind === 'photos')
    expect(pages).toHaveLength(2)
    expect(pages[0].photos).toHaveLength(FLIP_PHOTOS_PER_PAGE)
    expect(pages[1].photos).toHaveLength(2)
  })

  it('无任何数据时只出封面 + 空页', () => {
    const book = makeBook({ narrative: EMPTY_NARRATIVE, report: REPORT_EMPTY, photos: [] })
    expect(book.pages.map(p => p.kind)).toEqual(['cover', 'empty'])
  })
})

describe('翻页导航', () => {
  const book = makeBook()

  it('pageCount 等于页数', () => {
    expect(pageCount(book)).toBe(8)
  })

  it('clampPageIndex 夹取边界与非数', () => {
    expect(clampPageIndex(book, -5)).toBe(0)
    expect(clampPageIndex(book, 999)).toBe(7)
    expect(clampPageIndex(book, NaN)).toBe(0)
  })

  it('turnPage 不环绕', () => {
    expect(turnPage(book, 0, -1)).toBe(0)
    expect(turnPage(book, 0, 1)).toBe(1)
    expect(turnPage(book, 7, 1)).toBe(7)
  })

  it('canTurn 反映可否翻页', () => {
    expect(canTurn(book, 0, -1)).toBe(false)
    expect(canTurn(book, 0, 1)).toBe(true)
    expect(canTurn(book, 7, 1)).toBe(false)
  })

  it('turnPage 双页模式一次翻两张并吸附左页', () => {
    expect(turnPage(book, 0, 1, true)).toBe(2)
    expect(turnPage(book, 1, 1, true)).toBe(2)
    expect(turnPage(book, 2, -1, true)).toBe(0)
  })

  it('canTurn 双页模式以展台为单位，末展台不再可翻', () => {
    expect(canTurn(book, 0, -1, true)).toBe(false)
    expect(canTurn(book, 1, -1, true)).toBe(false)
    expect(canTurn(book, 0, 1, true)).toBe(true)
    // 8 页 → 末展台为 [6,7]，其下一页仍是同一张跨页，应禁用
    expect(canTurn(book, 6, 1, true)).toBe(false)
    expect(turnPage(book, 6, 1, true)).toBe(6)
  })

  it('spreadPair 单页/双页与末页落单', () => {
    expect(spreadPair(book, 3, true)).toEqual([2, 3])
    expect(spreadPair(book, 7, true)).toEqual([6, 7])
    expect(spreadPair(book, 3, false)).toEqual([3, null])
  })

  it('bookProgress 首末页为 0 与 1', () => {
    expect(bookProgress(book, 0)).toBe(0)
    expect(bookProgress(book, 7)).toBe(1)
  })

  it('bookSummary 汇总页数与照片数', () => {
    expect(bookSummary(book)).toEqual({ pages: 8, photos: 2 })
  })
})

describe('buildFlipBookMarkdown', () => {
  it('导出含标题、分季与人格', () => {
    const md = buildFlipBookMarkdown(makeBook())
    expect(md).toContain('# 2026 · 人生之书')
    expect(md).toContain('## 春 · 1-3月')
    expect(md).toContain('深耕者')
    expect(md).toContain('## 尾声')
  })
})

describe('useFlipBook', () => {
  it('由叙事 + 照片日记组装成书', () => {
    const { book, viewYear } = useFlipBook()
    expect(viewYear.value).toBe(2026)
    expect(book.value.pages[0].kind).toBe('cover')
    expect(bookSummary(book.value).photos).toBe(2)
  })

  it('冷启动时主动载入照片日记（否则年度光影页整页缺失）', () => {
    useFlipBook()
    expect(mockPhotoLoad).toHaveBeenCalledTimes(1)
  })
})
