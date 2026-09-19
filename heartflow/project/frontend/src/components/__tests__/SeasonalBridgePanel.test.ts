// ============================================================
// SeasonalBridgePanel 岁时桥面板测试（INCR-374）
// 薄委托直引 seasonal/seasonal-bridge 桥接引擎，
// 通过 mock 存储预置仪式/光茧种子驱动桥接 computed。
// 注：journalEntries 为桥接内存态（无存储背书），
// 情绪/年度回顾/季节转换区块以空态守卫断言覆盖。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟存储 ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

import type { SeasonalRitual } from '../../modules/seasonal'
import type { Cocoon } from '../../modules/seasonal/cocoon'

function makeRitual(overrides: Record<string, any> = {}): SeasonalRitual {
  return {
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '踏青',
    season: 'spring',
    description: '',
    count: 1,
    lastCompletedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeCocoon(overrides: Record<string, any> = {}): Cocoon {
  return {
    id: 'cc1',
    name: '蜕变中的我',
    stage: 'gestating',
    season: 'spring',
    stageHistory: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    note: '',
    tags: [],
    ...overrides,
  }
}

// 光茧为模块级单例（加载时快照存储），每次用例须重置模块并动态导入组件
async function mountPanel() {
  vi.resetModules()
  const { default: SeasonalBridgePanel } = await import('../SeasonalBridgePanel.vue')
  return mount(SeasonalBridgePanel, {
    global: {
      stubs: { Teleport: true, Transition: true },
    },
  })
}

describe('SeasonalBridgePanel 岁时桥（INCR-374）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('空态：仅显示季节概览与时节建议，仪式/光茧/情绪/回顾区块不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="seasonal-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('岁时桥 · 此刻')
    // 季节徽标
    const badge = wrapper.find('[data-test="sbp-season-badge"]')
    expect(badge.exists()).toBe(true)
    expect(badge.text()).toMatch(/[春夏秋冬]季/)
    // 季节进度
    expect(wrapper.find('[data-test="sbp-season-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-next-term"]').exists()).toBe(true)
    // 空态守卫：仪式/光茧/情绪/回顾均不渲染
    expect(wrapper.find('[data-test="sbp-rituals"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="sbp-cocoons"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="sbp-mood"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="sbp-review"]').exists()).toBe(false)
    // 时节建议：节气将至常驻
    expect(wrapper.find('[data-test="sbp-recommendations"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-rec-rec_solar_term"]').exists()).toBe(true)
  })

  it('有仪式时显示仪式节律统计与季节分布', async () => {
    mockStore['hf:seasonal_rituals'] = [
      makeRitual({ id: 'r1', name: '踏青', season: 'spring' }),
      makeRitual({ id: 'r2', name: '纳凉', season: 'summer', count: 0, lastCompletedAt: null }),
    ]
    const wrapper = await mountPanel()
    const rituals = wrapper.find('[data-test="sbp-rituals"]')
    expect(rituals.exists()).toBe(true)
    expect(rituals.find('[data-test="sbp-ritual-total"]').text()).toBe('2')
    expect(wrapper.text()).toContain('已启动')
    // 季节分布：spring/summer 条存在
    expect(rituals.find('[data-test="sbp-dist-spring"]').exists()).toBe(true)
    expect(rituals.find('[data-test="sbp-dist-summer"]').exists()).toBe(true)
  })

  it('有光茧时显示光茧蜕变统计与阶段分布', async () => {
    mockStore['hf:seasonal_cocoons'] = [
      makeCocoon({ id: 'cc1', stage: 'gestating' }),
      makeCocoon({ id: 'cc2', stage: 'flying' }),
    ]
    const wrapper = await mountPanel()
    const cocoons = wrapper.find('[data-test="sbp-cocoons"]')
    expect(cocoons.exists()).toBe(true)
    expect(cocoons.text()).toContain('2')
    expect(cocoons.text()).toContain('已飞翔')
    // 阶段分布：孕育中 / 飞翔中 标签
    expect(cocoons.text()).toContain('孕育中')
    expect(cocoons.text()).toContain('飞翔中')
  })

  it('仪式与光茧同时存在时两类区块并存', async () => {
    mockStore['hf:seasonal_rituals'] = [makeRitual({ id: 'r1', season: 'spring' })]
    mockStore['hf:seasonal_cocoons'] = [makeCocoon({ id: 'cc1', stage: 'cracking' })]
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="sbp-rituals"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-cocoons"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-overview"]').exists()).toBe(true)
  })

  it('时节建议包含建仪/光茧/日志等条目，优先级标签渲染', async () => {
    const wrapper = await mountPanel()
    const recs = wrapper.find('[data-test="sbp-recommendations"]')
    expect(recs.exists()).toBe(true)
    expect(recs.text()).toContain('优先')
    expect(recs.text()).toContain('建议')
    // 空态下包含：建仪式 / 建光茧 / 写日志 / 节气将至
    expect(wrapper.find('[data-test="sbp-rec-rec_new_ritual"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-rec-rec_new_cocoon"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="sbp-rec-rec_journal"]').exists()).toBe(true)
  })

  it('季节转换仪式：仅在桥接给出转换时渲染（常规日期为空态守卫）', async () => {
    const wrapper = await mountPanel()
    // 转换仅在季节边界前 14 天内产生；测试环境非窗口期 → 不渲染
    const transition = wrapper.find('[data-test="sbp-transition"]')
    expect(transition.exists()).toBe(false)
  })
})
