import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref, type Ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Book } from '../../modules/reading/types'

const activeChallenges: Ref<{ id: string; name: string; type: string; target: number; progress: number; completed: boolean }[]> = ref([])
const books: Ref<Book[]> = ref([])

const summary: Ref<any> = ref({
  totalBooks: 0,
  finishedBooks: 0,
  readingBooks: 0,
  totalPages: 0,
  totalTimeMinutes: 0,
  todayMinutes: 0,
  goalProgress: null,
  activeChallenges: 0,
  completedChallenges: 0,
  totalReviews: 0,
  averageRating: 0,
  totalNotes: 0,
})
const challengeSummary: Ref<any> = ref({
  total: 0,
  active: 0,
  completed: 0,
  byType: {},
  topProgress: [],
})
const noteSummary: Ref<any> = ref({ total: 0, typeDistribution: {}, notesWithConnections: 0 })

let mockStats: any = {
  totalBooks: 0,
  yearlyBooks: 0,
  totalPages: 0,
  totalReadingMinutes: 0,
  averageRating: 0,
  readingSpeed: 0,
  statusDistribution: { want_to_read: 0, reading: 0, finished: 0, abandoned: 0, rereading: 0 },
  favoriteAuthors: [],
  favoriteTags: [],
  monthlyTrend: [],
  preferredReadingTime: '',
  activeChallenges: [],
}

const computeReadingStats = vi.fn(() => ({ ...mockStats }))
const initialize = vi.fn(async () => {})

vi.mock('../../modules/reading/reading-bridge', () => {
  return {
    useReadingBridge: () => ({
      summary,
      challengeSummary,
      noteSummary,
      books,
      dashboard: {
        computeReadingStats,
      },
      challenges: {
        getActiveChallenges: vi.fn(() => activeChallenges.value),
      },
      initialize,
    }),
  }
})

import ReadingDashboardPanel from '../ReadingDashboardPanel.vue'

beforeEach(() => {
  vi.clearAllMocks()
  books.value = []
  activeChallenges.value = []
  summary.value = {
    totalBooks: 0,
    finishedBooks: 0,
    readingBooks: 0,
    totalPages: 0,
    totalTimeMinutes: 0,
    todayMinutes: 0,
    goalProgress: null,
    activeChallenges: 0,
    completedChallenges: 0,
    totalReviews: 0,
    averageRating: 0,
    totalNotes: 0,
  }
  challengeSummary.value = { total: 0, active: 0, completed: 0, byType: {}, topProgress: [] }
  noteSummary.value = { total: 0, typeDistribution: {}, notesWithConnections: 0 }
  mockStats = {
    totalBooks: 0,
    yearlyBooks: 0,
    totalPages: 0,
    totalReadingMinutes: 0,
    averageRating: 0,
    readingSpeed: 0,
    statusDistribution: { want_to_read: 0, reading: 0, finished: 0, abandoned: 0, rereading: 0 },
    favoriteAuthors: [],
    favoriteTags: [],
    monthlyTrend: [],
    preferredReadingTime: '',
    activeChallenges: [],
  }
})

describe('ReadingDashboardPanel · 阅读总览仪表盘', () => {
  it('空态渲染标题、各区块与空态提示，并触发 initialize', () => {
    const wrapper = mount(ReadingDashboardPanel)
    expect(wrapper.find('.rdp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('📊 阅读总览')
    expect(wrapper.text()).toContain('藏书 · 进度 · 成就 · 洞察')
    expect(wrapper.text()).toContain('藏书概览')
    expect(wrapper.text()).toContain('年度目标')
    expect(wrapper.text()).toContain('阅读洞察')
    expect(wrapper.text()).toContain('成就与记录')
    expect(wrapper.text()).toContain('暂无目标，先去设定年度阅读目标。')
    expect(wrapper.text()).toContain('尚未创建阅读挑战。')
    expect(initialize).toHaveBeenCalled()
  })

  it('藏书概览渲染总数、在读、已读、页数、时长与今日', () => {
    summary.value = {
      totalBooks: 12,
      finishedBooks: 4,
      readingBooks: 3,
      totalPages: 300,
      totalTimeMinutes: 100,
      todayMinutes: 25,
      goalProgress: null,
      activeChallenges: 0,
      completedChallenges: 0,
      totalReviews: 0,
      averageRating: 0,
      totalNotes: 0,
    }
    const wrapper = mount(ReadingDashboardPanel)
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('300')
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('25')
    expect(wrapper.text()).toContain('总藏书')
    expect(wrapper.text()).toContain('在读')
    expect(wrapper.text()).toContain('已读完')
    expect(wrapper.text()).toContain('今日(分)')
  })

  it('年度目标渲染达成百分比、每日时长与连续天数', () => {
    summary.value = {
      ...summary.value,
      goalProgress: { yearlyProgress: 45.6, dailyProgress: 30, streak: 5 },
    }
    const wrapper = mount(ReadingDashboardPanel)
    expect(wrapper.text()).toContain('年度达成 46%')
    expect(wrapper.text()).toContain('每日 30 分')
    expect(wrapper.text()).toContain('连续 5 天')
    expect(wrapper.text()).not.toContain('暂无目标')
  })

  it('阅读洞察基于书籍与活跃挑战计算并渲染统计值', () => {
    books.value = [{ id: 'b1', title: '书', author: '作者', totalPages: 100, currentPage: 50, status: 'finished', tags: [], quotes: [], totalReadingTime: 10 }]
    activeChallenges.value = [{ id: 'c1', name: '年度', type: 'book_count', target: 10, progress: 2, completed: false }]
    mockStats = {
      totalBooks: 1,
      yearlyBooks: 2,
      totalPages: 100,
      totalReadingMinutes: 120,
      averageRating: 4.2,
      readingSpeed: 1.5,
      statusDistribution: { want_to_read: 0, reading: 1, finished: 1, abandoned: 0, rereading: 0 },
      favoriteAuthors: [{ author: '作者', count: 2 }],
      favoriteTags: [{ tag: '小说', count: 3 }],
      monthlyTrend: [{ month: '2026-08', books: 1, pages: 100 }],
      preferredReadingTime: '晚间',
      activeChallenges: [],
    }
    const wrapper = mount(ReadingDashboardPanel)
    expect(computeReadingStats).toHaveBeenCalledWith(books.value, activeChallenges.value)
    expect(wrapper.text()).toContain('今年已读')
    expect(wrapper.text()).toContain('平均评分')
    expect(wrapper.text()).toContain('作者 ×2')
    expect(wrapper.text()).toContain('小说 ×3')
  })

  it('状态分布渲染五类状态的标签与数量', () => {
    mockStats = {
      ...mockStats,
      statusDistribution: { want_to_read: 2, reading: 1, finished: 5, abandoned: 0, rereading: 1 },
    }
    const wrapper = mount(ReadingDashboardPanel)
    const dist = wrapper.find('.rdp-dist')
    expect(dist.text()).toContain('📌 想读 2')
    expect(dist.text()).toContain('📖 在读 1')
    expect(dist.text()).toContain('✅ 已读 5')
    expect(dist.text()).toContain('📚 搁置 0')
    expect(dist.text()).toContain('🔄 重读 1')
  })

  it('月度趋势渲染各月份柱体与页数提示', () => {
    mockStats = {
      ...mockStats,
      monthlyTrend: [
        { month: '2025-12', books: 1, pages: 50 },
        { month: '2026-01', books: 2, pages: 200 },
      ],
    }
    const wrapper = mount(ReadingDashboardPanel)
    const cols = wrapper.findAll('.rdp-trend-col')
    expect(cols.length).toBe(2)
    expect(cols[0].attributes('title')).toContain('2025-12')
    expect(cols[0].attributes('title')).toContain('50 页')
    expect(cols[1].attributes('title')).toContain('2026-01')
    expect(cols[1].attributes('title')).toContain('2 本')
  })

  it('成就与记录渲染挑战、书评、笔记摘要与挑战进度前五', () => {
    challengeSummary.value = {
      total: 3,
      active: 2,
      completed: 1,
      byType: {},
      topProgress: [
        { id: 'c1', name: '年度计划', type: 'book_count', target: 10, progress: 5, completed: false },
        { id: 'c2', name: '连续阅读', type: 'daily_streak', target: 30, progress: 10, completed: false },
      ],
    }
    summary.value = { ...summary.value, totalReviews: 4, averageRating: 4.0, totalNotes: 7 }
    noteSummary.value = { total: 7, typeDistribution: {}, notesWithConnections: 2 }
    const wrapper = mount(ReadingDashboardPanel)
    expect(wrapper.text()).toContain('总挑战')
    expect(wrapper.text()).toContain('书评')
    expect(wrapper.text()).toContain('阅读笔记')
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('4')
    expect(wrapper.text()).toContain('7')
    expect(wrapper.text()).toContain('挑战进度前五')
    expect(wrapper.text()).toContain('📚 年度计划')
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.text()).toContain('🔥 连续阅读')
  })
})