// ============================================================
// 情景推演面板测试（INCR-76 · parallel-world/scenario-sim 引擎）
// 空态 · 场景管理 · 结果与推演 · 决策树 · What-If 排序
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

const K = {
  SCENARIOS: 'hf:parallel-world:scenarios',
  OUTCOMES: 'hf:parallel-world:outcomes',
  TREES: 'hf:parallel-world:decision-trees',
  SIMS: 'hf:parallel-world:simulations',
  WHATIF: 'hf:parallel-world:whatif',
}

// ---- 辅助工厂 ----
function makeScenario(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString()
  return { id: `scn${Date.now()}`, title: '若换城市发展', description: '换个城市重新开始', branchId: '', conditions: [], createdAt: now, updatedAt: now, ...overrides }
}

function makeTree(overrides: Record<string, any> = {}) {
  const now = new Date().toISOString()
  return {
    id: `dtree${Date.now()}`,
    title: '是否换工作',
    description: '',
    branchId: '',
    rootNode: { id: 'root', label: '起点', description: '是否要换工作？', question: '是否要换工作？', parentId: null, children: [{ id: 'n1', label: '试水副业', description: '', question: '先尝试副业？', parentId: 'root', children: [], depth: 1, isLeaf: true, metadata: {}, choiceLabel: '先试' }], depth: 0, isLeaf: false, metadata: {} },
    totalNodes: 2, maxDepth: 1, leafCount: 1, createdAt: now, updatedAt: now,
    ...overrides,
  }
}

function makeWhatIf(overrides: Record<string, any> = {}) {
  return {
    id: `wi${Date.now()}`,
    title: '辞职创业会如何',
    description: '',
    baseBranchId: '',
    alternatives: [
      { id: 'a1', label: '稳健副业', description: '', parameterChanges: {}, expectedOutcomes: [], pros: ['可回流'], cons: [], riskLevel: 'low', feasibilityScore: 0.8 },
      { id: 'a2', label: '全力创业', description: '', parameterChanges: {}, expectedOutcomes: [], pros: ['回报高'], cons: [], riskLevel: 'high', feasibilityScore: 0.4 },
    ],
    createdAt: new Date().toISOString(),
    ...overrides,
  }
}

async function mountPanel(kv: Record<string, any> = {}) {
  Object.keys(mockStore).forEach(k => delete mockStore[k])
  Object.assign(mockStore, kv)
  const { default: ScenarioSimulationPanel } = await import('../ScenarioSimulationPanel.vue')
  const wrapper = mount(ScenarioSimulationPanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

function tab(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find(b => b.text().trim() === label)!
}

describe('ScenarioSimulationPanel 情景推演', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  // ---- 空态 ----
  it('空态：面板 + 标题 + 徽标 + 空文案 + 四 Tab', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.find('.ssp').exists()).toBe(true)
    expect(wrapper.text()).toContain('情景推演')
    expect(wrapper.find('.ssp-badge').text()).toContain('0 场景 · 0 模拟')
    expect(wrapper.text()).toContain('还没有场景')
    expect(wrapper.findAll('.ssp-tab').length).toBe(4)
  })

  it('空态：不渲染任何场景卡片', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.findAll('.ssp-card').length).toBe(0)
  })

  // ---- 徽标统计 ----
  it('填充态：徽标展示场景与模拟计数', async () => {
    const wrapper = await mountPanel({
      [K.SCENARIOS]: [makeScenario({ id: 'scn1' }), makeScenario({ id: 'scn2' })],
      [K.SIMS]: [makeSimulation()],
    })
    expect(wrapper.find('.ssp-badge').text()).toContain('2 场景 · 1 模拟')
  })

  // ---- 场景 ----
  it('场景：渲染种子场景卡片', async () => {
    const wrapper = await mountPanel({ [K.SCENARIOS]: [makeScenario({ id: 'scn1', title: '若换城市发展', branchId: '主世界' })] })
    expect(wrapper.text()).toContain('若换城市发展')
    expect(wrapper.find('.ssp-card-branch').text()).toContain('主世界')
  })

  it('场景：通过表单创建后出现在卡片列表', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input[placeholder="场景标题"]').setValue('返乡创业')
    await wrapper.find('input[placeholder="所属分支"]').setValue('主世界')
    await tab(wrapper, '创建场景').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('返乡创业')
    expect(wrapper.find('.ssp-badge').text()).toContain('1 场景 · 0 模拟')
  })

  it('场景：空标题时创建按钮禁用', async () => {
    const wrapper = await mountPanel({})
    expect(tab(wrapper, '创建场景').attributes('disabled')).toBeDefined()
  })

  // ---- 结果与推演 ----
  it('推演：为情景添加结果后展示，运行推演渲染建议', async () => {
    const wrapper = await mountPanel({ [K.SCENARIOS]: [makeScenario({ id: 'scn1', title: '换城市' })] })
    await wrapper.find('input[placeholder="结果标签"]').setValue('平稳度过')
    await tab(wrapper, '加结果').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('平稳度过')
    // 运行推演
    await tab(wrapper, '运行推演').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ssp-sim-result').exists()).toBe(true)
    expect(wrapper.find('.ssp-sim-result').text().length).toBeGreaterThan(0)
    // 徽标更新为 1 模拟
    expect(wrapper.find('.ssp-badge').text()).toContain('1 模拟')
  })

  it('推演：无结果时运行按钮禁用', async () => {
    const wrapper = await mountPanel({ [K.SCENARIOS]: [makeScenario({ id: 'scn1', title: '换城市' })] })
    expect(tab(wrapper, '运行推演').attributes('disabled')).toBeDefined()
  })

  // ---- 决策树 ----
  it('决策树：切 Tab 渲染根问题与子节点', async () => {
    const wrapper = await mountPanel({ [K.TREES]: [makeTree({ id: 't1' })] })
    await tab(wrapper, '决策树').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('是否换工作')
    expect(wrapper.find('.ssp-tree-q').text()).toContain('是否要换工作？')
    expect(wrapper.findAll('.ssp-tree-node.child').length).toBe(1)
    expect(wrapper.text()).toContain('试水副业')
  })

  it('决策树：通过表单创建新树并渲染根问题', async () => {
    const wrapper = await mountPanel({})
    await tab(wrapper, '决策树').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('input[placeholder="决策树标题"]').setValue('择业')
    await wrapper.find('input[placeholder="根问题（起点）"]').setValue('该选哪条路？')
    await tab(wrapper, '创建决策树').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('择业')
    expect(wrapper.text()).toContain('该选哪条路？')
  })

  // ---- What-If ----
  it('What-If：切 Tab 渲染备选方案', async () => {
    const wrapper = await mountPanel({ [K.WHATIF]: [makeWhatIf({ id: 'w1', title: '辞职创业会如何' })] })
    await tab(wrapper, 'What-If').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('辞职创业会如何')
    expect(wrapper.text()).toContain('稳健副业')
    expect(wrapper.text()).toContain('全力创业')
  })

  it('What-If：添加方案并评估排序展示最优方案', async () => {
    const wrapper = await mountPanel({ [K.WHATIF]: [makeWhatIf({ id: 'w1', title: '辞职创业会如何', alternatives: [] })] })
    await tab(wrapper, 'What-If').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('input[placeholder="备选方案"]').setValue('稳中求进')
    await tab(wrapper, '加方案').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('稳中求进')
    await tab(wrapper, '评估排序').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ssp-best').exists()).toBe(true)
    expect(wrapper.text()).toContain('最佳方案')
  })
})

function makeSimulation(overrides: Record<string, any> = {}) {
  return { id: `sim${Date.now()}`, scenarioId: 'scn1', branchId: '', outcomeAssignments: {}, expectedImpact: 5.4, riskLevel: 'medium', recommendation: '中等风险：预期影响 5.4/10。', confidence: 0.72, simulatedAt: new Date().toISOString(), assumptions: [], ...overrides }
}