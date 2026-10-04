// ============================================================
// 沉浸阅读器引擎 · 测试
// 覆盖：字号/行高夹取 · 每屏字数推导 · 分页 · 页码定位 · 进度
//       剩余时间估算与文案 · 偏好归一化与持久化
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'

// 模拟 storage：引擎在 import 时即 load()，须在动态 import 前重置模块缓存
const store: Record<string, unknown> = {}
const mockGetKV = vi.fn((key: string, fallback: unknown) =>
  key in store ? store[key] : fallback,
)
const mockSetKV = vi.fn((key: string, value: unknown) => {
  store[key] = value
})

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: unknown[]) => mockGetKV(...(args as [string, unknown])),
    setKV: (...args: unknown[]) => mockSetKV(...(args as [string, unknown])),
  },
}))

async function loadEngine() {
  return import('../immersive-reader')
}

describe('clampFontSize / clampLineHeight', () => {
  it('字号夹取在 14~26 并取整', async () => {
    const m = await loadEngine()
    expect(m.clampFontSize(10)).toBe(14)
    expect(m.clampFontSize(40)).toBe(26)
    expect(m.clampFontSize(17.4)).toBe(17)
    expect(m.clampFontSize(Number.NaN)).toBe(m.DEFAULT_READER_PREFS.fontSize)
  })

  it('行高夹取在 1.4~2.4 并保留一位小数', async () => {
    const m = await loadEngine()
    expect(m.clampLineHeight(1.0)).toBe(1.4)
    expect(m.clampLineHeight(3)).toBe(2.4)
    expect(m.clampLineHeight(1.83)).toBe(1.8)
    expect(m.clampLineHeight(Number.NaN)).toBe(m.DEFAULT_READER_PREFS.lineHeight)
  })
})

describe('charsPerPageFor', () => {
  it('字号越大每屏字数越少，且落在上下限内', async () => {
    const m = await loadEngine()
    const small = m.charsPerPageFor(m.FONT_SIZE_MIN)
    const base = m.charsPerPageFor(17)
    const large = m.charsPerPageFor(m.FONT_SIZE_MAX)
    expect(small).toBeGreaterThan(base)
    expect(base).toBeGreaterThan(large)
    expect(small).toBeLessThanOrEqual(m.CHARS_PER_PAGE_MAX)
    expect(large).toBeGreaterThanOrEqual(m.CHARS_PER_PAGE_MIN)
  })

  it('字号 17px 时即基准字数', async () => {
    const m = await loadEngine()
    expect(m.charsPerPageFor(17)).toBe(m.BASE_CHARS_PER_PAGE)
  })
})

describe('countChars', () => {
  it('忽略空白字符', async () => {
    const m = await loadEngine()
    expect(m.countChars('一 二\t三\n四')).toBe(4)
  })
})

describe('paginateParagraphs', () => {
  it('空输入返回空页', async () => {
    const m = await loadEngine()
    expect(m.paginateParagraphs([], 420)).toEqual([])
  })

  it('以段落为最小单位，长段独占一页', async () => {
    const m = await loadEngine()
    const long = 'a'.repeat(100)
    const pages = m.paginateParagraphs([long, long], 120)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ index: 0, paraStart: 0, paraEnd: 1, charCount: 100 })
    expect(pages[1]).toMatchObject({ index: 1, paraStart: 1, paraEnd: 2, charCount: 100 })
  })

  it('累计不超上限时合并同页', async () => {
    const m = await loadEngine()
    const p = 'a'.repeat(40)
    const pages = m.paginateParagraphs([p, p, p, p], 120)
    expect(pages).toHaveLength(2)
    expect(pages[0]).toMatchObject({ paraStart: 0, paraEnd: 3, charCount: 120 })
    expect(pages[1]).toMatchObject({ paraStart: 3, paraEnd: 4, charCount: 40 })
  })

  it('页区间连续且覆盖全部段落', async () => {
    const m = await loadEngine()
    const paras = ['x'.repeat(30), 'y'.repeat(200), 'z'.repeat(50), 'w'.repeat(80)]
    const pages = m.paginateParagraphs(paras, 150)
    expect(pages[0].paraStart).toBe(0)
    expect(pages[pages.length - 1].paraEnd).toBe(paras.length)
    for (let i = 1; i < pages.length; i++) {
      expect(pages[i].paraStart).toBe(pages[i - 1].paraEnd)
      expect(pages[i].index).toBe(i)
    }
  })
})

describe('pageForParagraph', () => {
  it('按段落下标定位所在页，越界回落到末页', async () => {
    const m = await loadEngine()
    const pages = [
      { index: 0, paraStart: 0, paraEnd: 3, charCount: 10 },
      { index: 1, paraStart: 3, paraEnd: 5, charCount: 10 },
    ]
    expect(m.pageForParagraph(pages, 0)).toBe(0)
    expect(m.pageForParagraph(pages, 2)).toBe(0)
    expect(m.pageForParagraph(pages, 3)).toBe(1)
    expect(m.pageForParagraph(pages, 99)).toBe(1)
  })

  it('无页时返回 0', async () => {
    const m = await loadEngine()
    expect(m.pageForParagraph([], 5)).toBe(0)
  })
})

describe('pageProgress', () => {
  it('按页计算进度', async () => {
    const m = await loadEngine()
    expect(m.pageProgress(0, 0)).toBe(0)
    expect(m.pageProgress(0, 4)).toBeCloseTo(0.25)
    expect(m.pageProgress(3, 4)).toBe(1)
    expect(m.pageProgress(9, 4)).toBe(1)
  })
})

describe('estimateRemainingMinutes / formatRemaining', () => {
  it('剩余 0 字返回 0，非正速度回落默认', async () => {
    const m = await loadEngine()
    expect(m.estimateRemainingMinutes(0, 400)).toBe(0)
    expect(m.estimateRemainingMinutes(-5, 400)).toBe(0)
    expect(m.estimateRemainingMinutes(800, 0)).toBe(2)
  })

  it('向上取整', async () => {
    const m = await loadEngine()
    expect(m.estimateRemainingMinutes(401, 400)).toBe(2)
  })

  it('文案随分钟数变化', async () => {
    const m = await loadEngine()
    expect(m.formatRemaining(0)).toBe('即将读完')
    expect(m.formatRemaining(30)).toBe('剩余约 30 分钟')
    expect(m.formatRemaining(60)).toBe('剩余约 1 小时')
    expect(m.formatRemaining(95)).toBe('剩余约 1 小时 35 分')
  })
})

describe('useImmersiveReader 偏好读写', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((key: string, fallback: unknown) =>
      key in store ? store[key] : fallback,
    )
  })

  it('无存储时返回默认偏好', async () => {
    const m = await loadEngine()
    const { prefs } = m.useImmersiveReader()
    expect(prefs.value).toEqual(m.DEFAULT_READER_PREFS)
  })

  it('setPref 更新并持久化到 hf:reading:reader_prefs', async () => {
    const m = await loadEngine()
    const { prefs, setPref } = m.useImmersiveReader()
    setPref('fontSize', 22)
    expect(prefs.value.fontSize).toBe(22)
    expect(mockSetKV).toHaveBeenCalledWith(m.READER_PREFS_KEY, expect.objectContaining({ fontSize: 22 }))
  })

  it('themeById 未知主题回落首个', async () => {
    const m = await loadEngine()
    expect(m.themeById('nope').id).toBe(m.READER_THEMES[0].id)
  })

  it('存储中的非法值被归一化', async () => {
    store['hf:reading:reader_prefs'] = {
      mode: 'weird',
      fontSize: 99,
      lineHeight: 9,
      themeId: 'ghost',
      charsPerMinute: -3,
    }
    const m = await loadEngine()
    const { prefs } = m.useImmersiveReader()
    expect(prefs.value.mode).toBe(m.DEFAULT_READER_PREFS.mode)
    expect(prefs.value.fontSize).toBe(m.FONT_SIZE_MAX)
    expect(prefs.value.lineHeight).toBe(m.LINE_HEIGHT_MAX)
    expect(prefs.value.themeId).toBe(m.DEFAULT_READER_THEME_ID)
    expect(prefs.value.charsPerMinute).toBe(m.DEFAULT_CHARS_PER_MINUTE)
  })

  it('reset 恢复默认并持久化', async () => {
    const m = await loadEngine()
    const { prefs, setPref, reset } = m.useImmersiveReader()
    setPref('fontSize', 24)
    reset()
    expect(prefs.value).toEqual(m.DEFAULT_READER_PREFS)
    expect(mockSetKV).toHaveBeenLastCalledWith(m.READER_PREFS_KEY, m.DEFAULT_READER_PREFS)
  })
})
