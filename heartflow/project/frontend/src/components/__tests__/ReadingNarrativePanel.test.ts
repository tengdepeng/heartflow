// ============================================================
// ReadingNarrativePanel 组件测试
// 验证「年度叙事」面板：空态 / 封面+人格+分季渲染 / 复制导出 / 年份切换
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 模拟 storage（hall / reading-insights / reading-speed 均经此读写）
const store: Record<string, unknown> = {}
const mockGetKV = vi.fn((key: string, fallback: unknown) => (key in store ? (store[key] as unknown) : fallback))
const mockSetKV = vi.fn((key: string, value: unknown) => {
  store[key] = value
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: unknown[]) => mockGetKV(...(args as [string, unknown])),
    setKV: (...args: unknown[]) => mockSetKV(...(args as [string, unknown])),
  },
}))

const Y = new Date().getFullYear()

async function getWrapper() {
  const { default: ReadingNarrativePanel } = await import('../ReadingNarrativePanel.vue')
  return mount(ReadingNarrativePanel)
}

function seedYearData() {
  store['hf:reading:books'] = JSON.stringify([
    {
      id: 'b1', title: '测试书', author: '作者', totalPages: 300, currentPage: 300,
      status: 'finished', tags: ['小说'], quotes: [], totalReadingTime: 120,
      finishDate: `${Y}-03-10`,
    },
  ])
  store['hf:reading:sessions'] = JSON.stringify([
    {
      id: 's1', bookId: 'b1', startPage: 0, endPage: 100, duration: 120,
      date: `${Y}-01-15`, timestamp: `${Y}-01-15T00:00:00.000Z`,
    },
  ])
}

describe('ReadingNarrativePanel', () => {
  beforeEach(() => {
    vi.resetModules() // 重置模块缓存：hall 的 books/sessions 是模块级 ref，需按当前 store 重新初始化
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((key: string, fallback: unknown) =>
      key in store ? store[key] : fallback,
    )
  })

  it('无数据时显示空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rdn-empty').exists()).toBe(true)
    expect(wrapper.find('.rdn-empty').text()).toContain('还没有阅读记录')
    expect(wrapper.find('.rdn-cover').exists()).toBe(false)
  })

  it('有年度数据时渲染封面/人格/分季/叙事', async () => {
    seedYearData()
    const wrapper = await getWrapper()
    expect(wrapper.find('.rdn-empty').exists()).toBe(false)
    expect(wrapper.find('.rdn-cover').exists()).toBe(true)
    expect(wrapper.find('.rdn-cover-headline').text()).toContain(String(Y))
    expect(wrapper.findAll('.rdn-persona-chip').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.rdn-era').length).toBeGreaterThan(0)
    expect(wrapper.find('.rdn-discovery').exists()).toBe(true)
  })

  it('点击「复制叙事」写入剪贴板并提示已复制', async () => {
    seedYearData()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = await getWrapper()
    await wrapper.find('.rdn-btn').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledTimes(1)
    expect(String(writeText.mock.calls[0][0])).toContain(String(Y))
    expect(wrapper.find('.rdn-copied').exists()).toBe(true)
  })

  it('年份切换按钮切换查看年份', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.rdn-year-val').text()).toBe(String(Y))
    await wrapper.find('.rdn-year-btn').trigger('click') // ‹ 上一年
    expect(wrapper.find('.rdn-year-val').text()).toBe(String(Y - 1))
  })
})
