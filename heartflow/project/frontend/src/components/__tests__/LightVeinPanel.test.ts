// ============================================================
// 留光阁 · 光之脉络面板测试（INCR-442）
// 复用 goal-visualization 引擎 buildRadialLayout/getDomainProgress/getTierStats
// 真实引擎 + mock localStorage 种子（与 GoalVisualizationPanel.test 同法），
// 顺便验证此前从未被任何视图消费的 buildRadialLayout 产出正确径向数据。
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function goal(overrides: Record<string, any> = {}) {
  return {
    id: `goal_${Math.random().toString(36).slice(2, 8)}`,
    title: '读完十本书',
    description: '',
    tier: 'target',
    status: 'growing',
    domain: 'growth',
    order: 0,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-20T08:00:00.000Z',
    anchorCount: 4,
    anchorDone: 2,
    ...overrides,
  }
}

async function mountPanel(goals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../LightVeinPanel.vue')
  const wrapper = mount(mod.default, { props: { goals } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('LightVeinPanel 光之脉络', () => {
  it('无目标时显示空态引导', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('.lvp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('光之脉络')
    expect(wrapper.text()).toContain('留光阁尚未点亮目标')
  })

  it('有目标时渲染径向节点与中心总进度', async () => {
    const wrapper = await mountPanel([
      goal({ title: '读完十本书', status: 'bloom', anchorCount: 0, anchorDone: 0 }),
      goal({ title: '跑步健身', status: 'seed' }),
    ])
    // 两个目标 → 两个径向节点
    expect(wrapper.findAll('.lvp-node').length).toBe(2)
    // 中心总进度 = 1/2 = 50
    expect(wrapper.find('.lvp-center-num').text()).toContain('50')
    // 脉络连线数量 = 节点数
    expect(wrapper.findAll('.lvp-vein').length).toBe(2)
  })

  it('领域脉络渲染中文领域标签与完成计数', async () => {
    const wrapper = await mountPanel([
      goal({ title: '读完十本书', domain: 'growth', status: 'bloom' }),
      goal({ title: '跑步健身', domain: 'growth', status: 'seed' }),
    ])
    const row = wrapper.find('.lvp-domain-row')
    expect(row.exists()).toBe(true)
    expect(row.text()).toContain('成长') // DOMAIN_LABELS 转中文
    expect(row.text()).toContain('1/2')
  })

  it('层级统计渲染愿景/目标/计划三段', async () => {
    const wrapper = await mountPanel([
      goal({ id: 'v1', tier: 'vision', title: '想去冰岛', status: 'seed' }),
      goal({ id: 't1', tier: 'target', title: '读完十本书', status: 'bloom' }),
      goal({ id: 'p1', tier: 'plan', title: '每日阅读', status: 'bloom', parentId: 't1' }),
    ])
    const chips = wrapper.findAll('.lvp-tier-chip')
    expect(chips.length).toBe(3)
    // 目标：1/1 → 100%
    const targetChip = chips.find(c => c.text().includes('目标'))
    expect(targetChip!.text()).toContain('1/1')
    expect(targetChip!.text()).toContain('100%')
  })

  it('嵌套目标（vision→target）按深度分布在两层环上', async () => {
    const wrapper = await mountPanel([
      goal({ id: 'v1', tier: 'vision', title: '长期愿景', status: 'seed' }),
      goal({ id: 't1', tier: 'target', title: '中期目标', status: 'growing', parentId: 'v1' }),
    ])
    // buildRadialLayout 按深度分组：环0=愿景，环1=目标 → 共 2 节点
    expect(wrapper.findAll('.lvp-node').length).toBe(2)
  })
})
