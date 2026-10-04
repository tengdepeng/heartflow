// ============================================================
// ImmersiveReaderPanel 组件测试
// 覆盖：主题色盘 · 翻页/滚动模式 · 分页导航 · 字号/行高调节
//       段落点击回传 · 进度回传
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Excerpt } from '../../modules/reading/reading-content'
import type { ParagraphAnnotation } from '../../modules/reading/annotation-layer'

const store: Record<string, unknown> = {}
const mockGetKV = vi.fn((key: string, fallback: unknown) =>
  key in store ? store[key] : fallback,
)
const mockSetKV = vi.fn((key: string, value: unknown) => {
  store[key] = value
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: unknown[]) => mockGetKV(...(args as [string, unknown])),
    setKV: (...args: unknown[]) => mockSetKV(...(args as [string, unknown])),
  },
}))

const PARA = 'a'.repeat(200)

async function getWrapper(paragraphs: string[] = [PARA, PARA, PARA, PARA]) {
  const { default: ImmersiveReaderPanel } = await import('../ImmersiveReaderPanel.vue')
  return mount(ImmersiveReaderPanel, { props: { paragraphs, title: '测试书' } })
}

function btnByText(wrapper: ReturnType<typeof mount>, text: string) {
  return wrapper.findAll('button').find((b) => b.text() === text)!
}

describe('ImmersiveReaderPanel', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((key: string, fallback: unknown) =>
      key in store ? store[key] : fallback,
    )
  })

  it('渲染标题与四色主题盘', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ird-title').text()).toBe('测试书')
    expect(wrapper.findAll('.ird-theme-swatch')).toHaveLength(4)
  })

  it('默认滚动模式渲染全部段落', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ird-surface').classes()).toContain('mode-scroll')
    expect(wrapper.findAll('.ird-paragraph')).toHaveLength(4)
  })

  it('切到翻页模式仅渲染当前页并显示翻页按钮', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '翻页').trigger('click')
    expect(wrapper.find('.ird-surface').classes()).toContain('mode-paged')
    expect(wrapper.findAll('.ird-paragraph')).toHaveLength(2)
    expect(wrapper.find('.ird-indicator').text()).toBe('1 / 2')
    expect(btnByText(wrapper, '下一页').attributes('disabled')).toBeUndefined()
  })

  it('翻到下一页更新页码并回传进度', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '翻页').trigger('click')
    await btnByText(wrapper, '下一页').trigger('click')
    expect(wrapper.find('.ird-indicator').text()).toBe('2 / 2')
    expect(wrapper.emitted('progress')).toBeTruthy()
  })

  it('字号加号增大字号并持久化', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, 'A+').trigger('click')
    expect(wrapper.find('.ird-step-val').text()).toBe('18px')
    expect(mockSetKV).toHaveBeenCalledWith(
      'hf:reading:reader_prefs',
      expect.objectContaining({ fontSize: 18 }),
    )
  })

  it('切换主题色盘写入 themeId', async () => {
    const wrapper = await getWrapper()
    const swatches = wrapper.findAll('.ird-theme-swatch')
    await swatches[1].trigger('click')
    expect(swatches[1].classes()).toContain('active')
    expect(mockSetKV).toHaveBeenCalledWith(
      'hf:reading:reader_prefs',
      expect.objectContaining({ themeId: 'sepia' }),
    )
  })

  it('点击段落回传段落下标与文本', async () => {
    const wrapper = await getWrapper()
    await wrapper.findAll('.ird-paragraph')[0].trigger('click')
    const emitted = wrapper.emitted('paragraph-click')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([0, PARA])
  })

  it('已摘录段落渲染高亮标记', async () => {
    const { default: ImmersiveReaderPanel } = await import('../ImmersiveReaderPanel.vue')
    const wrapper = mount(ImmersiveReaderPanel, {
      props: { paragraphs: [PARA, PARA], marks: new Map([[1, '#c46a5a']]) },
    })
    const paras = wrapper.findAll('.ird-paragraph')
    expect(paras[0].classes()).not.toContain('highlighted')
    expect(paras[1].classes()).toContain('highlighted')
  })

  it('翻页模式渲染左右点击热区，滚动模式不渲染', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.ird-hotzone')).toHaveLength(0)
    await btnByText(wrapper, '翻页').trigger('click')
    expect(wrapper.findAll('.ird-hotzone')).toHaveLength(2)
  })

  it('点击右侧热区翻到下一页并带正向动画类', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '翻页').trigger('click')
    await wrapper.find('.ird-hotzone-next').trigger('click')
    expect(wrapper.find('.ird-indicator').text()).toBe('2 / 2')
    expect(wrapper.find('.ird-page').classes()).toContain('ird-turn-next')
  })

  it('回退一页带反向动画类', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '翻页').trigger('click')
    await btnByText(wrapper, '下一页').trigger('click')
    await btnByText(wrapper, '上一页').trigger('click')
    expect(wrapper.find('.ird-indicator').text()).toBe('1 / 2')
    expect(wrapper.find('.ird-page').classes()).toContain('ird-turn-prev')
  })

  it('翻页模式键盘 → / ← 翻页', async () => {
    const wrapper = await getWrapper()
    await btnByText(wrapper, '翻页').trigger('click')
    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('.ird-indicator').text()).toBe('2 / 2')
    await wrapper.trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.find('.ird-indicator').text()).toBe('1 / 2')
  })

  it('键盘 + / - 调字号并持久化', async () => {
    const wrapper = await getWrapper()
    await wrapper.trigger('keydown', { key: '=' })
    expect(wrapper.find('.ird-step-val').text()).toBe('18px')
    await wrapper.trigger('keydown', { key: '-' })
    expect(wrapper.find('.ird-step-val').text()).toBe('17px')
    expect(mockSetKV).toHaveBeenCalledWith(
      'hf:reading:reader_prefs',
      expect.objectContaining({ fontSize: 17 }),
    )
  })

  it('常驻时钟显示 HH:MM，电量 API 缺失时静默降级', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ird-clock').text()).toMatch(/^\d{2}:\d{2}$/)
    expect(wrapper.find('.ird-battery').exists()).toBe(false)
  })

  it('字号缩小致页数收缩时夹取页码，不落空白页', async () => {
    const wrapper = await getWrapper(Array.from({ length: 6 }, () => PARA))
    await btnByText(wrapper, '翻页').trigger('click')
    await btnByText(wrapper, '下一页').trigger('click')
    await btnByText(wrapper, '下一页').trigger('click')
    expect(wrapper.find('.ird-indicator').text()).toBe('3 / 3')
    for (let i = 0; i < 3; i++) await btnByText(wrapper, 'A−').trigger('click')
    expect(wrapper.find('.ird-step-val').text()).toBe('14px')
    expect(wrapper.find('.ird-indicator').text()).toBe('2 / 2')
    expect(wrapper.findAll('.ird-paragraph').length).toBeGreaterThan(0)
  })
})

// ============================================================
// 段落批注（划线 / 想法，INCR-523）
// ============================================================
describe('ImmersiveReaderPanel · 段落批注', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    for (const k of Object.keys(store)) delete store[k]
    mockGetKV.mockImplementation((key: string, fallback: unknown) =>
      key in store ? store[key] : fallback,
    )
  })

  function excerpt(id: string, note = ''): Excerpt {
    return { id, source: '测试书', text: `划线-${id}`, note, createdAt: '2026-10-05T00:00:00.000Z' }
  }

  function layerAt(index: number, noteTexts: string[]): Map<number, ParagraphAnnotation> {
    const highlights = [excerpt('base'), ...noteTexts.map((n, i) => excerpt(`t${i}`, n))]
    const thoughts = highlights.filter((h) => h.note.trim().length > 0)
    return new Map([[index, { index, highlights, thoughts, count: highlights.length }]])
  }

  async function getAnnotWrapper(annotations: Map<number, ParagraphAnnotation>) {
    const { default: ImmersiveReaderPanel } = await import('../ImmersiveReaderPanel.vue')
    return mount(ImmersiveReaderPanel, {
      props: { paragraphs: [PARA, PARA, PARA], title: '测试书', annotations },
    })
  }

  it('渲染段末批注角标与边距想法气泡', async () => {
    const wrapper = await getAnnotWrapper(layerAt(1, ['记一笔想法']))
    const badge = wrapper.find('.ird-annot-badge')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toBe('2 条划线 · 1 条想法')
    expect(badge.classes()).toContain('has-thoughts')
    expect(wrapper.find('.ird-thought-bubble').text()).toBe('记一笔想法')
  })

  it('无想法时仅渲染划线角标，不渲染气泡', async () => {
    const wrapper = await getAnnotWrapper(layerAt(0, []))
    expect(wrapper.find('.ird-annot-badge').text()).toBe('1 条划线')
    expect(wrapper.find('.ird-thought-bubble').exists()).toBe(false)
  })

  it('点击角标展开批注弹层，再次点击收起', async () => {
    const wrapper = await getAnnotWrapper(layerAt(1, ['记一笔想法']))
    expect(wrapper.find('.ird-annot-pop').exists()).toBe(false)
    await wrapper.find('.ird-annot-badge').trigger('click')
    const pop = wrapper.find('.ird-annot-pop')
    expect(pop.exists()).toBe(true)
    expect(pop.findAll('.ird-annot-quote')).toHaveLength(2)
    expect(pop.text()).toContain('记一笔想法')
    await wrapper.find('.ird-annot-badge').trigger('click')
    expect(wrapper.find('.ird-annot-pop').exists()).toBe(false)
  })

  it('有批注时显示导出按钮并 emit export-annotations', async () => {
    const wrapper = await getAnnotWrapper(layerAt(0, ['想法']))
    const btn = wrapper.find('.ird-export-btn')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(wrapper.emitted('export-annotations')).toBeTruthy()
  })

  it('无批注时不渲染角标与导出按钮', async () => {
    const wrapper = await getAnnotWrapper(new Map())
    expect(wrapper.findAll('.ird-annot-badge')).toHaveLength(0)
    expect(wrapper.find('.ird-export-btn').exists()).toBe(false)
  })
})
