// ============================================================
// SeasonalYearOverviewPanel 年度俯瞰面板测试
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

import SeasonalYearOverviewPanel from '../SeasonalYearOverviewPanel.vue'
import type { SeasonalRitual, Ritual, LifeRitual } from '../../modules/seasonal'

function makeRitual(overrides: Record<string, any> = {}): SeasonalRitual {
  return {
    id: `sr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '踏青',
    season: 'spring',
    description: '',
    count: 0,
    lastCompletedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

function makeLifeRitual(overrides: Record<string, any> = {}): LifeRitual {
  return {
    id: 'lr1',
    name: '婚礼',
    date: '2026-05-20',
    note: '',
    icon: '💒',
    type: '婚礼',
    ...overrides,
  }
}

function makePrivateRitual(overrides: Record<string, any> = {}): Ritual {
  return {
    id: 'pr1',
    name: '晨读',
    date: '2026-04-10',
    note: '',
    icon: '🕯',
    ...overrides,
  }
}

function mountPanel(props: Record<string, any> = {}) {
  return mount(SeasonalYearOverviewPanel, {
    props: {
      rituals: [],
      lifeRituals: [],
      privateRituals: [],
      ...props,
    },
  })
}

describe('SeasonalYearOverviewPanel 年度俯瞰面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:seasonal_rituals'] = []
  })

  // ------- 空态 -------
  it('空态显示引导语与岁时未启徽章', () => {
    const wrapper = mountPanel()
    expect(wrapper.find('.syo-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('年度俯瞰')
    expect(wrapper.text()).toContain('岁时未启')
    expect(wrapper.text()).toContain('还没有仪式')
  })

  // ------- 填充态概览 -------
  it('有数据时显示年度徽章、概览统计与热力图', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [makeRitual({ count: 3, lastCompletedAt: `${year}-03-15T00:00:00Z` })],
    })
    expect(wrapper.text()).toContain(`${year} 年`)
    expect(wrapper.text()).toContain('四季仪式')
    expect(wrapper.text()).toContain('覆盖月数')
    expect(wrapper.find('.syo-heatmap').exists()).toBe(true)
    expect(wrapper.findAll('.syo-heat-cell').length).toBe(12)
  })

  it('最活跃月显示峰值月份标签', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [
        makeRitual({ id: 'r1', count: 1, lastCompletedAt: `${year}-01-15T00:00:00Z` }),
        makeRitual({ id: 'r2', count: 4, lastCompletedAt: `${year}-09-10T00:00:00Z` }),
      ],
    })
    expect(wrapper.text()).toContain('九月')
  })

  // ------- 年度切换 -------
  it('多年度时显示年度切换按钮', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [
        makeRitual({ id: 'r1', createdAt: `${year - 1}-03-01T00:00:00Z` }),
        makeRitual({ id: 'r2', createdAt: `${year}-03-01T00:00:00Z` }),
      ],
    })
    expect(wrapper.findAll('.syo-year-chip').length).toBeGreaterThanOrEqual(2)
  })

  it('点击年度切换更新选中年份', async () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [
        makeRitual({ id: 'r1', name: '去年仪式', count: 2, lastCompletedAt: `${year - 1}-06-01T00:00:00Z`, createdAt: `${year - 1}-03-01T00:00:00Z` }),
        makeRitual({ id: 'r2', name: '今年仪式', count: 5, lastCompletedAt: `${year}-06-01T00:00:00Z`, createdAt: `${year}-03-01T00:00:00Z` }),
      ],
    })
    expect(wrapper.text()).toContain(`${year} 年`)
    const chips = wrapper.findAll('.syo-year-chip')
    const lastChip = chips.find(c => c.text() === String(year - 1))
    expect(lastChip).toBeTruthy()
    await lastChip!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain(`${year - 1} 年`)
  })

  // ------- 年度对比 -------
  it('两年以上数据显示年度对比', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [
        makeRitual({ id: 'r1', count: 2, lastCompletedAt: `${year - 1}-06-01T00:00:00Z`, createdAt: `${year - 1}-03-01T00:00:00Z` }),
        makeRitual({ id: 'r2', count: 5, lastCompletedAt: `${year}-06-01T00:00:00Z`, createdAt: `${year}-03-01T00:00:00Z` }),
      ],
    })
    expect(wrapper.text()).toContain('年度对比')
    expect(wrapper.findAll('.syo-cmp-row').length).toBe(2)
  })

  // ------- 温和洞察 -------
  it('显示温和洞察', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      rituals: [makeRitual({ count: 3, lastCompletedAt: `${year}-03-15T00:00:00Z` })],
    })
    const insights = wrapper.findAll('.syo-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('共完成 3 次')
  })

  // ------- 生命仪礼与私人仪式 -------
  it('生命仪礼与私人仪式计入概览', () => {
    const year = new Date().getFullYear()
    const wrapper = mountPanel({
      lifeRituals: [makeLifeRitual({ date: `${year}-05-20` })],
      privateRituals: [makePrivateRitual({ date: `${year}-04-10` })],
    })
    expect(wrapper.text()).toContain('生命仪礼')
    expect(wrapper.text()).toContain('私人仪式')
  })
})
