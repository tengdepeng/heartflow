// ============================================================
// ParallelWorld 视图测试 - 平行世界
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: ParallelWorld } = await import('../ParallelWorld.vue')
  return mount(ParallelWorld, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('ParallelWorld 平行世界', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('平行世界')
    expect(wrapper.text()).toContain('平行世界中的你，也在闪闪发光')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('平行自我')
    expect(wrapper.text()).toContain('时间胶囊')
    expect(wrapper.text()).toContain('抉择分叉')
  })

  it('显示可能性自我区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('可能性自我')
    expect(wrapper.text()).toContain('映照另一个你')
  })

  it('显示时间胶囊区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('时间胶囊')
    expect(wrapper.text()).toContain('给未来的自己写一段话')
  })

  it('显示抉择分叉区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('抉择分叉')
  })

  it('时间胶囊封存按钮初始禁用', async () => {
    const wrapper = await getWrapper()
    const capsuleBtn = wrapper.find('.pw-add-row .pw-btn')
    expect(capsuleBtn.exists()).toBe(true)
    expect(capsuleBtn.attributes('disabled')).toBeDefined()
  })

  // ============================================================
  // 批量收口：分支管理面板（INCR-176）
  // ============================================================

  it('集成渲染分支管理面板 BranchManagementPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchManagementPanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支回放面板（INCR-176）
  // ============================================================

  it('集成渲染分支回放面板 BranchReplayPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchReplayPanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支时间线面板（INCR-176）
  // ============================================================

  it('集成渲染分支时间线面板 BranchTimelinePanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'BranchTimelinePanel' }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：分支可视化面板（INCR-176）
  // ============================================================

  it('集成渲染分支可视化面板 BranchVisualizationPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({
      name: 'BranchVisualizationPanel'
    }).exists()).toBe(true)
  })

  // ============================================================
  // 批量收口：场景同步面板（INCR-222 薄委托化）
  // ============================================================

  it('集成渲染场景同步面板 SceneSyncPanel', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'SceneSyncPanel' }).exists()).toBe(true)
  })

  it('场景同步面板：默认仅主干分支时展示空态提示', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    expect(panel.text()).toContain('场景同步')
    expect(panel.text()).toContain('至少需要两个时间分支才能同步')
  })

  it('场景同步面板：多分支时展示同步表单与差异预览', async () => {
    mockStore['hf:parallel-world:branches'] = [
      { id: 'pw_trunk', name: '主干', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
      { id: 'pw_b', name: '抉择分支', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'pw_trunk', isActive: false, checkpointCount: 1 },
    ]
    mockStore['hf:parallel-world:checkpoints'] = [
      { id: 'cp1', branchId: 'pw_trunk', label: '起点', description: '', snapshot: { a: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['重要'] },
      { id: 'cp2', branchId: 'pw_trunk', label: '转折', description: '', snapshot: { b: 2 }, createdAt: '2026-01-02T00:00:00.000Z', tags: [] },
      { id: 'cp3', branchId: 'pw_b', label: '另一种人生', description: '', snapshot: { c: 3 }, createdAt: '2026-01-03T00:00:00.000Z', tags: [] },
    ]
    mockStore['hf:parallel-world:snapshots'] = []

    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    // 两个分支 → 源/目标两个下拉
    expect(panel.findAll('.ssy-input').length).toBe(2)
    // 默认选中不同分支 → 按钮可用
    const pushBtn = panel.findAll('button').find(b => b.text().includes('推送'))
    expect(pushBtn?.attributes('disabled')).toBeUndefined()
    // 差异预览
    expect(panel.text()).toContain('差异预览')
    expect(panel.text()).toContain('独有')
  })

  it('场景同步面板：推送同步经宿主回调持久化检查点', async () => {
    mockStore['hf:parallel-world:branches'] = [
      { id: 'pw_trunk', name: '主干', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
      { id: 'pw_b', name: '抉择分支', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'pw_trunk', isActive: false, checkpointCount: 1 },
    ]
    mockStore['hf:parallel-world:checkpoints'] = [
      { id: 'cp1', branchId: 'pw_trunk', label: '起点', description: '', snapshot: { a: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['重要'] },
      { id: 'cp2', branchId: 'pw_trunk', label: '转折', description: '', snapshot: { b: 2 }, createdAt: '2026-01-02T00:00:00.000Z', tags: [] },
      { id: 'cp3', branchId: 'pw_b', label: '另一种人生', description: '', snapshot: { c: 3 }, createdAt: '2026-01-03T00:00:00.000Z', tags: [] },
    ]
    mockStore['hf:parallel-world:snapshots'] = []

    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wrapper.findComponent({ name: 'SceneSyncPanel' })
    const pushBtn = panel.findAll('button').find(b => b.text().includes('推送'))!
    await pushBtn.trigger('click')
    await flushPromises()
    // 宿主回调持久化：主干 2 个独有检查点推送到目标分支 → 3 + 2 = 5
    expect(mockStore['hf:parallel-world:checkpoints'].length).toBe(5)
    expect(mockStore['hf:parallel-world:checkpoints'].some((c: any) => c.branchId === 'pw_b' && c.label === '起点')).toBe(true)
    // 面板展示最近同步记录
    expect(panel.text()).toContain('最近同步')
    expect(panel.text()).toContain('完成')
  })

  // ============================================================
  // 批量收口：世界对照面板（INCR-228 薄委托化）
  // ============================================================

  const twoBranches = () => [
    { id: 'pw_trunk', name: '主干', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
    { id: 'pw_b', name: '抉择分支', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'pw_trunk', isActive: false, checkpointCount: 1 },
  ]
  const twoCheckpoints = () => [
    { id: 'cp1', branchId: 'pw_trunk', label: '起点', description: '', snapshot: { a: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['重要'] },
    { id: 'cp2', branchId: 'pw_b', label: '另一种人生', description: '', snapshot: { c: 3 }, createdAt: '2026-01-03T00:00:00.000Z', tags: [] },
  ]

  it('集成渲染世界对照面板 WorldComparisonPanel', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'WorldComparisonPanel' }).exists()).toBe(true)
  })

  it('世界对照面板：空 props 时展示空态引导', async () => {
    const { default: WorldComparisonPanel } = await import('../../components/WorldComparisonPanel.vue')
    const panel = mount(WorldComparisonPanel, {
      props: { branches: [], checkpoints: [] },
      attachTo: document.body,
    })
    await flushPromises()
    expect(panel.text()).toContain('世界对照')
    expect(panel.text()).toContain('至少需要两个时间分支才能对照')
    panel.unmount()
  })

  it('世界对照面板：两个分支可对照并展示相似度', async () => {
    const { default: WorldComparisonPanel } = await import('../../components/WorldComparisonPanel.vue')
    const panel = mount(WorldComparisonPanel, {
      props: { branches: twoBranches(), checkpoints: twoCheckpoints() },
      attachTo: document.body,
    })
    await flushPromises()
    // 两个下拉默认选中不同分支 → 对照按钮可用
    expect(panel.findAll('select').length).toBe(2)
    const compareBtn = panel.findAll('button').find(b => b.text().includes('对照'))
    expect(compareBtn?.attributes('disabled')).toBeUndefined()

    await compareBtn!.trigger('click')
    await flushPromises()
    expect(panel.text()).toContain('相似度')
    panel.unmount()
  })

  it('世界对照面板：生成报告列出最相似与最分歧分支', async () => {
    const { default: WorldComparisonPanel } = await import('../../components/WorldComparisonPanel.vue')
    const panel = mount(WorldComparisonPanel, {
      props: { branches: twoBranches(), checkpoints: twoCheckpoints() },
      attachTo: document.body,
    })
    await flushPromises()
    const reportBtn = panel.findAll('button').find(b => b.text().includes('生成报告'))
    await reportBtn!.trigger('click')
    await flushPromises()
    expect(panel.text()).toContain('次对比')
    expect(panel.text()).toContain('最相似')
    expect(panel.text()).toContain('最分歧')
    panel.unmount()
  })
})

// ============================================================
// 集成：情景推演面板 ScenarioSimulationPanel（INCR-240 补挂载孤儿组件）
// 引擎 useScenarioSimulation 内 refs 按调用创建 + loadAll 自 storage 读，清存储即复位
// ============================================================
describe('集成：情景推演面板', () => {
  const K_SCN = 'hf:parallel-world:scenarios'
  const K_OUT = 'hf:parallel-world:outcomes'
  const K_TREE = 'hf:parallel-world:decision-trees'
  const K_SIM = 'hf:parallel-world:simulations'

  const SCENARIO = {
    id: 'scn-1', title: '如果选择去远方', description: '离开家乡独自闯荡', branchId: '主干',
    conditions: [], createdAt: '2026-09-10T00:00:00.000Z', updatedAt: '2026-09-10T00:00:00.000Z',
  }
  const OUTCOME = {
    id: 'out-1', scenarioId: 'scn-1', label: '事业腾飞', description: '', probability: 0.7,
    impact: 'high', impactScore: 7, resultDescription: '事业腾飞', tags: [],
  }
  const TREE = {
    id: 'tree-1', title: '是否辞去工作', branchId: '主干', totalNodes: 3, leafCount: 2,
    rootNode: {
      id: 'n0', question: '该不该辞职？', children: [
        { id: 'n1', choiceLabel: '辞职', label: '自由' },
        { id: 'n2', choiceLabel: '留下', label: '稳定' },
      ],
    },
  }

  function seed(opts: { scenario?: boolean; outcome?: boolean; tree?: boolean } = {}) {
    if (opts.scenario) mockStore[K_SCN] = [SCENARIO]
    if (opts.outcome) mockStore[K_OUT] = [OUTCOME]
    if (opts.tree) mockStore[K_TREE] = [TREE]
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('集成渲染情景推演面板 ScenarioSimulationPanel', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'ScenarioSimulationPanel' }).exists()).toBe(true)
  })

  it('无数据时渲染情景推演骨架与四标签', async () => {
    const { default: ScenarioSimulationPanel } = await import('../../components/ScenarioSimulationPanel.vue')
    const panel = mount(ScenarioSimulationPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
    await flushPromises()
    expect(panel.find('.ssp').exists()).toBe(true)
    expect(panel.text()).toContain('情景推演')
    expect(panel.text()).toContain('0 场景 · 0 模拟')
    const tabs = panel.findAll('.ssp-tab')
    expect(tabs.length).toBe(4)
    expect(tabs[0].text()).toContain('场景')
    expect(tabs[1].text()).toContain('决策树')
    expect(tabs[2].text()).toContain('What-If')
    expect(tabs[3].text()).toContain('统计')
    expect(panel.text()).toContain('还没有场景')
  })

  it('种场景种子后展示场景卡片', async () => {
    seed({ scenario: true })
    const { default: ScenarioSimulationPanel } = await import('../../components/ScenarioSimulationPanel.vue')
    const panel = mount(ScenarioSimulationPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
    await flushPromises()
    expect(panel.text()).toContain('1 场景 · 0 模拟')
    expect(panel.text()).toContain('如果选择去远方')
    expect(panel.text()).toContain('离开家乡独自闯荡')
    expect(panel.findAll('.ssp-card').length).toBe(1)
  })

  it('种子场景含结果时可运行推演并持久化模拟', async () => {
    seed({ scenario: true, outcome: true })
    const { default: ScenarioSimulationPanel } = await import('../../components/ScenarioSimulationPanel.vue')
    const panel = mount(ScenarioSimulationPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
    await flushPromises()
    // 场景结果展示
    expect(panel.text()).toContain('事业腾飞')
    const runBtn = panel.find('.ssp-run')
    expect(runBtn.attributes('disabled')).toBeUndefined()
    await runBtn.trigger('click')
    await flushPromises()
    expect(mockStore[K_SIM].length).toBe(1)
    expect(panel.text()).not.toContain('暂无结果数据')
    expect(panel.find('.ssp-sim-result').exists()).toBe(true)
  })

  it('决策树标签展示树与根问题', async () => {
    seed({ tree: true })
    const { default: ScenarioSimulationPanel } = await import('../../components/ScenarioSimulationPanel.vue')
    const panel = mount(ScenarioSimulationPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
    await flushPromises()
    const tabs = panel.findAll('.ssp-tab')
    await tabs[1].trigger('click')
    expect(panel.text()).toContain('是否辞去工作')
    expect(panel.text()).toContain('该不该辞职？')
    expect(panel.text()).toContain('辞职')
    expect(panel.text()).toContain('留下')
  })

  it('统计标签展示平均置信与风险分布', async () => {
    seed({ scenario: true, outcome: true })
    const { default: ScenarioSimulationPanel } = await import('../../components/ScenarioSimulationPanel.vue')
    const panel = mount(ScenarioSimulationPanel, {
      global: { stubs: { Teleport: true, Transition: true } },
    })
    await flushPromises()
    await panel.find('.ssp-run').trigger('click')
    await flushPromises()
    const tabs = panel.findAll('.ssp-tab')
    await tabs[3].trigger('click')
    expect(panel.text()).toContain('平均置信')
    expect(panel.text()).toContain('风险分布')
    expect(panel.text()).toContain('模拟')
  })
})

// ============================================================
// 集成：分支权重面板 BranchWeightsPanel（INCR-264 补挂载孤儿组件）
// 引擎 useBranchWeights 无状态（weightConfigs 每次调用新建、无持久化），
// 薄委托化：宿主注入 branches，面板交互驱动引擎当前实例
// ============================================================
describe('集成：分支权重面板', () => {
  const K_BRANCHES = 'hf:parallel-world:branches'

  function makeBranch(id: string, name: string, overrides: Record<string, any> = {}) {
    return {
      id, name, description: '', color: '#4A90D9',
      createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined,
      isActive: false, checkpointCount: 0, ...overrides,
    }
  }

  function seedBranches(branches: any[]) {
    mockStore[K_BRANCHES] = branches
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染骨架与需关注徽标', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.bwp').exists()).toBe(true)
    expect(wrapper.text()).toContain('⚖️ 分支权重')
    expect(wrapper.text()).toContain('关注度分配 · 优先级排序')
    expect(wrapper.text()).toContain('0 需关注')
  })

  it('空分支时显示空态引导', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有时间分支。先在「分支星图」种下分支，再为每个世界分配关注权重。')
  })

  it('分支渲染权重配置行（默认权重与未设置优先级）', async () => {
    seedBranches([makeBranch('b1', '分支一')])
    const wrapper = await getWrapper()
    await flushPromises()
    const rows = wrapper.findAll('.bwp-row')
    expect(rows.length).toBe(1)
    expect(wrapper.text()).toContain('分支一')
    expect(wrapper.text()).toContain('未设置')
    expect(wrapper.text()).toContain('50%')
    // 优先级下拉渲染五个档位（默认选中态由交互用例覆盖）
    const opts = wrapper.findAll('.bwp-select option')
    expect(opts.map(o => o.text())).toEqual(['关键', '高', '中', '低', '归档'])
  })

  it('调整滑块触发权重设置并展示综合权重', async () => {
    seedBranches([makeBranch('b1', '分支一')])
    const wrapper = await getWrapper()
    await flushPromises()
    const slider = wrapper.find('.bwp-slider')
    await slider.setValue('0.8')
    await slider.trigger('change')
    await nextTick()
    expect(wrapper.text()).toContain('80%')
    // composite = 0.8*0.6 + 0.5*0.4 = 0.68 → 综合权重 68%、关注度 68
    expect(wrapper.text()).toContain('综合权重 68%')
    expect(wrapper.text()).toContain('关注度 68')
  })

  it('设为关键优先级后进入需关注列表', async () => {
    seedBranches([makeBranch('b1', '分支一')])
    const wrapper = await getWrapper()
    await flushPromises()
    const sel = wrapper.find('.bwp-select')
    await sel.setValue('critical')
    await sel.trigger('change')
    await nextTick()
    expect(wrapper.text()).toContain('关键')
    expect(wrapper.text()).toContain('1 需关注')
    const attention = wrapper.find('.bwp-attention')
    expect(attention.exists()).toBe(true)
    expect(attention.text()).toContain('分支一')
    // composite = 0.5*0.6 + 0.5*0.4 = 0.5 → attention = 0.5*1.5 = 0.75 → 75 分
    expect(attention.text()).toContain('75 分')
  })

  it('需关注列表展示高优先级分支', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    const wrapper = await getWrapper()
    await flushPromises()
    // 分支一设为高优先级
    const rows = wrapper.findAll('.bwp-row')
    const sliderA = rows[0].find('.bwp-slider')
    await sliderA.setValue('0.6')
    await sliderA.trigger('change')
    const selA = rows[0].find('.bwp-select')
    await selA.setValue('high')
    await selA.trigger('change')
    await nextTick()
    const attention = wrapper.find('.bwp-attention')
    expect(attention.exists()).toBe(true)
    expect(attention.text()).toContain('分支一')
    expect(attention.text()).toContain('高')
    // composite = 0.6*0.6 + 0.5*0.4 = 0.56 → attention = 0.56*1.2 = 0.672 → 67 分
    expect(attention.text()).toContain('67 分')
    // 分支二未设置不进入需关注
    expect(wrapper.findAll('.bwp-attention').length).toBe(1)
  })
})