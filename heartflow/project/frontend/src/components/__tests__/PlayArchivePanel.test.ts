// ============================================================
// 逸趣档案面板测试（INCR-47）
// 覆盖空态（逸趣未启）与填充态（概览/品类/种子/节律/健康/洞察）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { computed } from 'vue'

const mock = vi.hoisted(() => {
  const state = {
    games: [] as any[],
    toys: [] as any[],
    models: [] as any[],
    others: [] as any[],
    seeds: [] as any[],
  }
  return { state }
})

vi.mock('../../modules/play', () => ({
  usePlayGallery: () => ({
    games: computed(() => mock.state.games),
    toys: computed(() => mock.state.toys),
    models: computed(() => mock.state.models),
    others: computed(() => mock.state.others),
  }),
}))

vi.mock('../../modules/play/seeds', () => ({
  usePlaySeeds: () => ({
    seeds: computed(() => mock.state.seeds),
    load: () => {},
    save: () => {},
  }),
}))

const NOW = new Date()
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * 24 * 60 * 60 * 1000).toISOString()
}

function game(overrides: Record<string, any> = {}) {
  return { id: `gm_${Math.random().toString(36).slice(2, 6)}`, name: '游戏', platform: 'PC', hours: 10, at: daysAgo(0), ...overrides }
}
function toy(overrides: Record<string, any> = {}) {
  return { id: `ty_${Math.random().toString(36).slice(2, 6)}`, name: '玩具', note: '', value: 'mint', at: daysAgo(0), ...overrides }
}
function model(overrides: Record<string, any> = {}) {
  return { id: `md_${Math.random().toString(36).slice(2, 6)}`, name: '模型', series: 'S', status: 'sealed', at: daysAgo(0), ...overrides }
}
function other(overrides: Record<string, any> = {}) {
  return { id: `ot_${Math.random().toString(36).slice(2, 6)}`, name: '其他', cat: '', at: daysAgo(0), ...overrides }
}
function seed(overrides: Record<string, any> = {}) {
  return { id: `sd_${Math.random().toString(36).slice(2, 6)}`, mood: 'happy', waterCount: 0, createdAt: daysAgo(0), ...overrides }
}

async function mountPanel() {
  const { default: PlayArchivePanel } = await import('../PlayArchivePanel.vue')
  const wrapper = mount(PlayArchivePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.games = []
  mock.state.toys = []
  mock.state.models = []
  mock.state.others = []
  mock.state.seeds = []
})

describe('PlayArchivePanel 空态', () => {
  it('无藏品也无种子时显示「逸趣未启」', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pap-archive').exists()).toBe(true)
    expect(wrapper.find('.pap-badge-neutral').text()).toBe('逸趣未启')
    expect(wrapper.text()).toContain('还没有可供陈列的逸趣记录')
    expect(wrapper.find('.pap-block').exists()).toBe(false)
  })
})

describe('PlayArchivePanel 填充态', () => {
  beforeEach(() => {
    mock.state.games = [
      game({ id: 'g1', name: '游戏A', hours: 20, platform: 'PC' }),
      game({ id: 'g2', name: '游戏B', hours: 5, platform: 'Switch' }),
    ]
    mock.state.toys = [toy({ id: 't1' })]
    mock.state.models = [model({ id: 'm1', series: 'S' })]
    mock.state.others = [other({ id: 'o1' })]
    mock.state.seeds = [
      seed({ id: 's1', mood: 'happy', waterCount: 2, createdAt: daysAgo(10) }),
      seed({ id: 's2', mood: 'calm', waterCount: 0, createdAt: daysAgo(0) }),
    ]
  })

  it('渲染标题与逸趣徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.pap-title').text()).toBe('✨ 逸趣档案')
    const badge = wrapper.find('.pap-badge')
    expect(badge.exists()).toBe(true)
    expect(['心意丰盈', '兴致盎然', '拾趣渐进', '萌芽初探']).toContain(badge.text())
  })

  it('渲染逸趣库概览八格', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('逸趣库')
    expect(wrapper.text()).toContain('总藏品')
    expect(wrapper.text()).toContain('游戏数')
    expect(wrapper.text()).toContain('总时长')
    expect(wrapper.text()).toContain('平台数')
    expect(wrapper.text()).toContain('系列数')
    expect(wrapper.text()).toContain('种子数')
    expect(wrapper.text()).toContain('已照料')
    expect(wrapper.text()).toContain('已开花')
    expect(wrapper.find('.pap-hint').exists()).toBe(true)
  })

  it('渲染品类分布四行', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('品类分布')
    const rows = wrapper.findAll('.pap-row')
    expect(rows.length).toBe(4)
    expect(wrapper.text()).toContain('游戏')
    expect(wrapper.text()).toContain('玩具')
    expect(wrapper.text()).toContain('模型')
    expect(wrapper.text()).toContain('其他')
  })

  it('渲染心情种子成长与心情分布', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('心情种子成长')
    expect(wrapper.text()).toContain('种子')
    expect(wrapper.text()).toContain('开花')
    expect(wrapper.find('.pap-mood-chip').exists()).toBe(true)
    expect(wrapper.text()).toContain('浇水')
  })

  it('渲染收藏节律五格', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('收藏节律')
    expect(wrapper.text()).toContain('活跃天数')
    expect(wrapper.text()).toContain('跨度')
    expect(wrapper.text()).toContain('本月新增')
    expect(wrapper.text()).toContain('本月时长')
    expect(wrapper.text()).toContain('覆盖月份')
  })

  it('渲染收藏健康大字评分与三进度条', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('收藏健康')
    expect(wrapper.find('.pap-health-num').exists()).toBe(true)
    expect(wrapper.text()).toContain('广度')
    expect(wrapper.text()).toContain('深度')
    expect(wrapper.text()).toContain('延续')
    expect(wrapper.findAll('.pap-hbar').length).toBe(3)
  })

  it('渲染温和洞察且有界', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.pap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })
})