// ============================================================
// 决策树面板（DecisionTreePanel）集成测试
// 覆盖：空态 / 统计总览(期望值) / 树芯片 / 节点渲染(类型·值·概率) /
//       统计运行(最佳路径/期望值) / 新建空白树
// 数据源：storage['hf:knowledge:decision_trees'](序列化)。store 为模块级单例，
//        每例 vi.resetModules + 动态导入以隔离。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { DecisionTreeNode } from '../../modules/knowledge/decision-tree'

const { store, mockGetKV, mockSetKV } = vi.hoisted(() => {
  const store: Record<string, any> = {}
  const clone = (v: any) => (v === undefined ? v : JSON.parse(JSON.stringify(v)))
  const mockGetKV = vi.fn((k: string, d: any) => (k in store ? clone(store[k]) : d))
  const mockSetKV = vi.fn((k: string, v: any) => { store[k] = clone(v) })
  return { store, mockGetKV, mockSetKV }
})

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: (...a: any[]) => (mockGetKV as any)(...a),
    setKV: (...a: any[]) => (mockSetKV as any)(...a),
  },
}))

function nd(id: string, label: string, type: DecisionTreeNode['type'], extra: Partial<DecisionTreeNode> = {}): DecisionTreeNode {
  return {
    id, label, type, parentId: null, childrenIds: [], description: '',
    value: 0, probability: 0, tags: [], collapsed: false, createdAt: '',
    ...extra,
  }
}

function seedTree() {
  const nodes: Record<string, DecisionTreeNode> = {
    n1: nd('n1', '决策', 'decision', { childrenIds: ['n2'] }),
    n2: nd('n2', '市场', 'chance', { parentId: 'n1', childrenIds: ['n3', 'n4'] }),
    n3: nd('n3', '上涨', 'outcome', { parentId: 'n2', value: 100, probability: 0.6 }),
    n4: nd('n4', '下跌', 'outcome', { parentId: 'n2', value: 20, probability: 0.4 }),
  }
  store['hf:knowledge:decision_trees'] = [
    { id: 't1', name: '是否投资', description: '', rootId: 'n1', nodes, createdAt: '', updatedAt: '' },
  ]
}

async function prepare(seedFn?: () => void) {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  if (seedFn) seedFn()
  const mod = await import('../knowledge-tower/DecisionTreePanel.vue')
  return mount(mod.default)
}

describe('DecisionTreePanel · 决策树', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无决策树时呈现空态且统计归零', async () => {
    const w = await prepare()
    expect(w.find('.dtp-title').text()).toContain('决策树')
    expect(w.find('.dtp-empty').exists()).toBe(true)
    expect(w.find('.dtp-empty p').text()).toContain('还没有决策树')
    expect(w.find('.dtp-stat').find('b').text()).toBe('0')
  })

  it('统计总览反映树数、节点数与最高期望值', async () => {
    const w = await prepare(() => seedTree())
    const stats = w.findAll('.dtp-stat')
    expect(stats[0].find('b').text()).toBe('1')
    expect(stats[1].find('b').text()).toBe('4')
    expect(stats[2].find('b').text()).toBe('68')
  })

  it('树芯片展示名称与节点数，点击后渲染节点带类型值与概率', async () => {
    const w = await prepare(() => seedTree())
    const chip = w.find('.dtp-tree-chip')
    expect(chip.text()).toContain('是否投资')
    expect(chip.find('.dtp-tree-count').text()).toContain('4')
    await chip.trigger('click')
    const rows = w.findAll('.dtp-node')
    expect(rows.length).toBe(4)
    expect(rows[2].find('.dtp-node-label').text()).toContain('上涨')
    expect(rows[2].find('.dtp-node-val').text()).toContain('值 100')
    expect(rows[2].find('.dtp-node-prob').text()).toContain('P=60%')
    expect(w.find('.dtp-node--chance').exists()).toBe(true)
  })

  it('运行统计后展示期望值与最佳路径', async () => {
    const w = await prepare(() => seedTree())
    await w.find('.dtp-tree-chip').trigger('click')
    const btnStat = w.findAll('.dtp-btn').find((b) => b.text().includes('📊 统计'))
    expect(btnStat).toBeTruthy()
    await (btnStat as any).trigger('click')
    expect(w.find('.dtp-stat-cell--hot b').exists()).toBe(true)
    expect(w.find('.dtp-stat-cell--hot b').text()).toContain('68')
    expect(w.find('.dtp-path').exists()).toBe(true)
    expect(w.find('.dtp-bar-path').exists() || w.find('.dtp-path-text').exists()).toBe(true)
  })

  it('输入主题并创建空白树后自动聚焦', async () => {
    const w = await prepare()
    await w.find('.dtp-input').setValue('是否跳槽')
    await w.find('.dtp-btn--primary').trigger('click')
    const chips = w.findAll('.dtp-tree-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].text()).toContain('是否跳槽')
    expect(chips[0].classes()).toContain('active')
    // 聚焦后根决策点可直接编辑
    expect(w.find('.dtp-node').exists()).toBe(true)
    expect(w.find('.dtp-node-label').text()).toContain('是否跳槽')
  })
})