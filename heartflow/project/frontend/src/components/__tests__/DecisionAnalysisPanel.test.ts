// ============================================================
// 经略阁 · 决策分析面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const STRATEGIES_KEY = 'hf:knowledge:strategies'
const NODES_KEY = 'hf:knowledge_nodes'

function node(overrides: Record<string, any> = {}) {
  return {
    id: `nd_${Math.random().toString(36).slice(2, 8)}`,
    title: '复利思维',
    desc: '长期积累的指数增长',
    cat: 'insight',
    tags: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

function strategy(overrides: Record<string, any> = {}) {
  return {
    id: `st_${Math.random().toString(36).slice(2, 8)}`,
    name: '深耕主业',
    description: '把核心能力做到极致',
    knowledgeNodeIds: [],
    scores: {
      feasibility: 9,
      impact: 9,
      cost: 9,
      risk: 9,
      timeline: 9,
      sustainability: 9,
      alignment: 9,
    },
    notes: {},
    tags: [],
    createdAt: '2026-08-20T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../DecisionAnalysisPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

describe('DecisionAnalysisPanel 决策分析', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('决策分析')
    expect(wrapper.text()).toContain('策略总览')
    expect(wrapper.text()).toContain('新建策略')
  })

  it('展示已有策略', async () => {
    const wrapper = await mountPanel({
      [STRATEGIES_KEY]: [strategy({ name: '深耕主业' })],
    })
    expect(wrapper.text()).toContain('深耕主业')
    expect(wrapper.text()).toContain('策略列表')
  })

  it('创建策略并持久化', async () => {
    const wrapper = await mountPanel({})
    const inputs = wrapper.findAll('input.da-input')
    await inputs[0].setValue('副业探索')
    await inputs[1].setValue('利用业余时间尝试新方向')
    await wrapper.find('button.da-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('副业探索')
    const kv = readKv()
    expect(kv[STRATEGIES_KEY]).toHaveLength(1)
    expect(kv[STRATEGIES_KEY][0].name).toBe('副业探索')
  })

  it('删除策略', async () => {
    const wrapper = await mountPanel({
      [STRATEGIES_KEY]: [strategy({ name: '待删策略' })],
    })
    expect(wrapper.text()).toContain('待删策略')
    await wrapper.find('button.da-strategy-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('待删策略')
  })

  it('SWOT 展开', async () => {
    const wrapper = await mountPanel({
      [STRATEGIES_KEY]: [strategy()],
    })
    expect(wrapper.text()).not.toContain('优势')
    await wrapper.find('button.da-btn-sm').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('优势')
    expect(wrapper.text()).toContain('劣势')
    expect(wrapper.text()).toContain('机会')
    expect(wrapper.text()).toContain('威胁')
  })

  it('推荐排序展示 A 级策略', async () => {
    const wrapper = await mountPanel({
      [STRATEGIES_KEY]: [strategy({ name: '高评分策略' })],
    })
    expect(wrapper.text()).toContain('推荐排序')
    expect(wrapper.text()).toContain('A')
    expect(wrapper.text()).toContain('高评分策略')
  })

  it('对比推荐展示排行与优势矩阵（并入 StrategyEvaluatorPanel 能力）', async () => {
    const wrapper = await mountPanel({
      [STRATEGIES_KEY]: [
        strategy({ name: '方案甲', scores: { feasibility: 9, impact: 9, cost: 9, risk: 9, timeline: 9, sustainability: 9, alignment: 9 } }),
        strategy({ name: '方案乙', scores: { feasibility: 3, impact: 3, cost: 3, risk: 3, timeline: 3, sustainability: 3, alignment: 3 } }),
      ],
    })
    expect(wrapper.text()).toContain('对比推荐')
    await wrapper.find('button.da-compare-btn').trigger('click')
    await wrapper.vm.$nextTick()
    const rows = wrapper.findAll('.da-rank-row')
    expect(rows.length).toBe(2)
    expect(wrapper.find('.da-rank-row').text()).toContain('方案甲')
    expect(wrapper.text()).toContain('优势矩阵')
  })

  it('SWOT 关联知识节点补充洞察（并入 StrategyEvaluatorPanel 能力）', async () => {
    const nd = node()
    const wrapper = await mountPanel({
      [NODES_KEY]: [nd],
      [STRATEGIES_KEY]: [strategy({ knowledgeNodeIds: [nd.id] })],
    })
    await wrapper.find('button.da-btn-sm').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('优势')
    expect(wrapper.text()).toContain(`洞察: ${nd.title}`)
  })
})
