// ============================================================
// 场景规划面板（ScenarioPlannerPanel）集成测试
// 覆盖：空态 / 统计总览 / 输入创建场景 / 驱动因素与因子添加 /
//       影响评估（确定性种子评分）/ 模板创建预置驱动
// 数据源：storage['hf:knowledge:scenarios'](序列化)。store 为模块级单例，
//        每例 vi.resetModules + 动态导入以隔离。
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { ScenarioPlan, ScenarioDriver, ScenarioFactor } from '../../modules/knowledge'

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

function mkDriver(over: Partial<ScenarioDriver> = {}): ScenarioDriver {
  return {
    id: 'd1', name: '驱动', description: '', currentState: '待评估',
    uncertainty: 'medium', impact: 0.5, possibleDirections: [], knowledgeNodeIds: [],
    ...over,
  }
}

function mkFactor(over: Partial<ScenarioFactor> = {}): ScenarioFactor {
  return {
    id: 'f1', name: '因子', value: '中性', probability: 0.5, impact: 0.5, trend: 'stable', driverId: undefined,
    ...over,
  }
}

function mkScenario(over: Partial<ScenarioPlan> = {}): ScenarioPlan {
  return {
    id: 's1', name: '测试场景', description: 'd', type: 'custom', timeHorizon: 'medium_term',
    narrative: '', drivers: [], factors: [], assumptions: [], earlySignals: [],
    impactAssessment: { overallScore: 0, positiveImpact: 0, negativeImpact: 0, preparedness: 0, controllability: 0, affectedAreas: [] },
    strategies: [], knowledgeNodeIds: [], tags: [],
    createdAt: 't', updatedAt: 't',
    ...over,
  }
}

async function prepare(seedFn?: (s: Record<string, any>) => void) {
  vi.resetModules()
  Object.keys(store).forEach((k) => delete store[k])
  if (seedFn) seedFn(store)
  const mod = await import('../knowledge-tower/ScenarioPlannerPanel.vue')
  return mount(mod.default)
}

const createBtn = (w: ReturnType<typeof mount>) =>
  w.findAll('.scp-btn--primary').find((b) => b.text().includes('创建'))

describe('ScenarioPlannerPanel · 场景规划', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('无场景时呈现空态且统计归零', async () => {
    const w = await prepare()
    expect(w.find('.scp-title').text()).toContain('场景规划')
    expect(w.find('.scp-empty').exists()).toBe(true)
    expect(w.find('.scp-empty p').text()).toContain('还没有场景规划')
    const stats = w.findAll('.scp-stat')
    expect(stats[0].find('b').text()).toBe('0')
    expect(stats[1].find('b').text()).toBe('0')
    expect(stats[2].find('b').text()).toBe('—')
    expect(w.find('.scp-scenario-chip').exists()).toBe(false)
  })

  it('输入名称创建场景后自动聚焦并更新统计', async () => {
    const w = await prepare()
    await w.find('.scp-input').setValue('三年后职业')
    await createBtn(w)!.trigger('click')
    const stats = w.findAll('.scp-stat')
    expect(stats[0].find('b').text()).toBe('1')
    const chips = w.findAll('.scp-scenario-chip')
    expect(chips.length).toBe(1)
    expect(chips[0].text()).toContain('三年后职业')
    // 自动成为当前场景
    expect(w.find('.scp-scenario-name').text()).toContain('三年后职业')
  })

  it('可添加驱动因素与因子，展示不确定性与概率', async () => {
    const w = await prepare()
    await w.find('.scp-input').setValue('市场推演')
    await createBtn(w)!.trigger('click')

    // 添加驱动因素
    const smallInputs = w.findAll('.scp-input--sm')
    await smallInputs[0].setValue('技术迭代')
    await w.findAll('.scp-btn').find((b) => b.text().includes('添加'))!.trigger('click')
    const driver = w.find('.scp-driver')
    expect(driver.text()).toContain('技术迭代')
    expect(driver.text()).toContain('中')          // uncertainty medium 中文标签
    expect(driver.text()).toContain('影响 0.5')    // 默认 impact 0.5

    // 添加因子（默认 中性 / P=50%）；「添加」按钮列表：驱动(0) → 因子(1)
    const afterAdd = w.findAll('.scp-input--sm')
    await afterAdd[1].setValue('市场需求')
    const addBtns = w.findAll('.scp-btn').filter((b) => b.text().includes('添加'))
    await addBtns[1].trigger('click')
    const factor = w.find('.scp-factor')
    expect(factor.text()).toContain('市场需求')
    expect(factor.text()).toContain('P=50%')

    // 统计驱动因素数 = 1
    const stats = w.findAll('.scp-stat')
    expect(stats[1].find('b').text()).toBe('1')
  })

  it('评估影响后展示综合评分与四项维度分', async () => {
    const w = await prepare(() => {
      store['hf:knowledge:scenarios'] = [
        mkScenario({
          drivers: [mkDriver({ id: 'd1', name: '政策变化', uncertainty: 'medium', impact: 0.5 })],
          factors: [mkFactor({ id: 'f1', name: '市场需求', value: '有利', probability: 0.8, impact: 0.6, trend: 'increasing' })],
        }),
      ]
    })
    await w.find('.scp-scenario-chip').trigger('click')
    const assessBtn = w.findAll('.scp-btn').find((b) => b.text().includes('评估影响'))
    await assessBtn!.trigger('click')

    expect(w.find('.scp-impact').exists()).toBe(true)
    // 种子计算：positiveImpact=5, preparedness=0, controllability=5 → overall=round(2+0+1.5)=4
    expect(w.find('.scp-impact-score').text()).toContain('4')
    const dims = w.findAll('.scp-impact-dim')
    expect(dims.length).toBe(4)
    expect(dims[0].text()).toContain('5') // 积极影响
    expect(dims[3].text()).toContain('5') // 可控度
    // 平均评分 = 4.0
    const stats = w.findAll('.scp-stat')
    expect(stats[2].find('b').text()).toBe('4.0')
  })

  it('基于模板创建场景时预置驱动因素', async () => {
    const w = await prepare()
    await w.find('.scp-input').setValue('风险推演')
    await w.findAll('.scp-select')[0].setValue('template_risk')
    await createBtn(w)!.trigger('click')

    const drivers = w.findAll('.scp-driver')
    expect(w.findAll('.scp-scenario-chip').length).toBe(1)
    expect(drivers.length).toBeGreaterThan(0)
    // 模板预置不确定度均为 medium
    expect(drivers[0].find('.scp-driver-unc').text()).toBe('中')
    const stats = w.findAll('.scp-stat')
    expect(stats[1].find('b').text()).toBe(String(drivers.length))
  })

  it('已有两个及以上场景时可生成对比矩阵', async () => {
    const w = await prepare(() => {
      store['hf:knowledge:scenarios'] = [
        mkScenario({ id: 's1', name: '乐观', drivers: [mkDriver()] }),
        mkScenario({ id: 's2', name: '悲观', drivers: [mkDriver({ id: 'd2', name: '下行', uncertainty: 'high', impact: 0.8 })] }),
      ]
    })
    const cmpBtn = w.findAll('.scp-btn--primary').find((b) => b.text().includes('对比矩阵'))
    expect(cmpBtn).toBeTruthy()
    await cmpBtn!.trigger('click')
    expect(w.find('.scp-matrix').exists()).toBe(true)
    expect(w.find('.scp-matrix-rec').exists()).toBe(true)
    // 矩阵行含两场景
    const rows = w.findAll('.scp-matrix-cell--name')
    expect(rows.length).toBe(2)
  })
})