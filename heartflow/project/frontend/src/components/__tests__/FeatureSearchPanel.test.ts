// ============================================================
// 功能直达面板（FeatureSearchPanel）集成测试
// 覆盖：标题与推荐快捷入口 / 短查询静默 / 直达跳转 /
//       多命中建议列表 / 快捷chip跳转
// 依赖：mock vue-router(useRouter->push) 与 featureDictionary 纯函数
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { mockPush, dict } = vi.hoisted(() => {
  const mockPush = vi.fn()
  const dict = {
    getFeatureEntries: vi.fn(),
    searchFeatures: vi.fn(),
    pickDirectJump: vi.fn(),
  }
  return { mockPush, dict }
})

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

vi.mock('@/modules/advisor/featureDictionary', () => ({
  getFeatureEntries: dict.getFeatureEntries,
  searchFeatures: dict.searchFeatures,
  pickDirectJump: dict.pickDirectJump,
}))

const ENTRIES = [
  { route: '/home', name: '家', keys: ['家', 'home'] },
  { route: '/garden', name: '花园', keys: ['花园', '园'] },
]
const GARDEN_HIT = { route: '/garden', name: '花园', keys: ['花园'] }
const HOME_HIT = { route: '/home', name: '家', keys: ['家'] }

async function mountPanel(data: { entries?: any[]; search?: any; jump?: any }) {
  dict.getFeatureEntries.mockReturnValue(data.entries ?? ENTRIES)
  dict.searchFeatures.mockImplementation(data.search ?? (() => []))
  dict.pickDirectJump.mockImplementation(data.jump ?? (() => null))
  const mod = await import('../FeatureSearchPanel.vue')
  return mount(mod.default)
}

describe('FeatureSearchPanel · 功能直达', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockResolvedValue(undefined)
  })

  it('渲染标题与推荐快捷入口', async () => {
    const w = await mountPanel({})
    expect(w.find('.fs-title').text()).toContain('功能直达')
    expect(w.find('.fs-hint').text()).toContain('直达真实存在的空间')
    const chips = w.findAll('.fs-chip')
    expect(chips.length).toBe(2)
    expect(chips[0].text()).toContain('家')
    expect(chips[1].text()).toContain('花园')
    // 初始无建议/直达
    expect(w.find('.fs-direct').exists()).toBe(false)
    expect(w.find('.fs-suggest').exists()).toBe(false)
  })

  it('少于两字符的查询保持静默', async () => {
    const w = await mountPanel({})
    await w.find('.fs-input').setValue('花')
    expect(dict.searchFeatures).not.toHaveBeenCalled()
    expect(w.find('.fs-direct').exists()).toBe(false)
    expect(w.find('.fs-suggest').exists()).toBe(false)
  })

  it('命中直达时展示直达并点前往触发跳转', async () => {
    const w = await mountPanel({
      search: (q: string) => (q === '花园' ? [GARDEN_HIT] : []),
      jump: (_q: string, hits: any[]) => hits[0] ?? null,
    })
    await w.find('.fs-input').setValue('花园')
    expect(dict.searchFeatures).toHaveBeenCalledWith('花园')
    expect(w.find('.fs-direct').exists()).toBe(true)
    expect(w.find('.fs-direct-text').text()).toContain('直达：花园')
    await w.find('.fs-btn--direct').trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/garden')
  })

  it('无直达仅多命中时渲染建议列表', async () => {
    const w = await mountPanel({
      search: () => [GARDEN_HIT, HOME_HIT],
      jump: () => null,
    })
    await w.find('.fs-input').setValue('花海')
    const items = w.findAll('.fs-suggest__item')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('花园')
    expect(w.find('.fs-direct').exists()).toBe(false)
  })

  it('点击推荐chip触发路由跳转', async () => {
    const w = await mountPanel({})
    await w.findAll('.fs-chip')[1].trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/garden')
  })
})