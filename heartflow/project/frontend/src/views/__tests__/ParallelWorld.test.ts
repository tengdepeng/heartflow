// ============================================================
// ParallelWorld 视图测试 - 平行世界
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => {
  if (String(key).includes('parallel-world:branches')) {
    console.log('DEBUG-setKV-branches:', JSON.stringify(val?.map((b: any) => b.name)))
  }
  mockStore[key] = val
})

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

// ============================================================
// 集成：知识迁移面板 KnowledgeTransferPanel（INCR-265 补挂载孤儿组件）
// 引擎 useKnowledgeTransfer 无状态（transfers 每次调用新建、无持久化），
// 薄委托化：宿主注入 branches（≥2 个才可迁移），面板交互驱动引擎当前实例
// 注意：页面存在其他同名 aria-label 的 select，一律在 .ktp 作用域内查找
// ============================================================
describe('集成：知识迁移面板', () => {
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

  function ktp(wrapper: any) {
    const el = wrapper.find('.ktp')
    expect(el.exists()).toBe(true)
    return el
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染骨架与成功率徽标', async () => {
    const wrapper = await getWrapper()
    const panel = ktp(wrapper)
    expect(panel.text()).toContain('📤 知识迁移')
    expect(panel.text()).toContain('跨分支经验传递 · 应用与沉淀')
    expect(panel.text()).toContain('成功率 0%')
  })

  it('分支不足两个时显示空态引导', async () => {
    const wrapper = await getWrapper()
    expect(ktp(wrapper).text()).toContain('至少需要两个时间分支才能迁移知识。先在「分支星图」种下分支。')
  })

  it('单个分支仍视为不足并保持空态', async () => {
    seedBranches([makeBranch('b1', '分支一')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    expect(panel.find('.ktp-form').exists()).toBe(false)
    expect(panel.text()).toContain('至少需要两个时间分支才能迁移知识。')
  })

  it('两个分支渲染迁移表单（源/目标/类型下拉）', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    const form = panel.find('.ktp-form')
    expect(form.exists()).toBe(true)
    const selects = panel.findAll('select.ktp-input')
    expect(selects.length).toBe(3)
    // 类型下拉渲染五个档位
    const typeOpts = panel.find('select[aria-label="知识类型"]').findAll('option')
    expect(typeOpts.map((o: any) => o.text())).toEqual(['教训', '技能', '洞察', '模式', '决策'])
  })

  it('创建迁移生成待处理卡片并展示路由', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    // 源/目标分支默认初始化于挂载时（branches 异步加载后为空），显式选择
    await pickSourceTarget(panel)
    const input = panel.find('input.ktp-wide')
    await input.setValue('在分支一学到的心法')
    await nextTick()
    await panel.find('.ktp-add').trigger('click')
    await nextTick()
    const card = panel.find('.ktp-card')
    expect(card.exists()).toBe(true)
    expect(card.text()).toContain('待处理')
    expect(card.text()).toContain('分支一 → 分支二')
    expect(card.text()).toContain('在分支一学到的心法')
    expect(card.text()).toContain('适用性')
  })

  it('应用迁移后状态转为已应用并提升成功率', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    await pickSourceTarget(panel)
    const input = panel.find('input.ktp-wide')
    await input.setValue('值得复用的经验')
    await nextTick()
    await panel.find('.ktp-add').trigger('click')
    await nextTick()
    await panel.find('.ktp-apply').trigger('click')
    await nextTick()
    expect(panel.find('.ktp-card').text()).toContain('已应用')
    expect(panel.text()).toContain('成功率 100%')
    expect(panel.findAll('.ktp-apply').length).toBe(0)
  })

  it('拒绝迁移后状态转为已拒绝', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    await pickSourceTarget(panel)
    const input = panel.find('input.ktp-wide')
    await input.setValue('不合适的经验')
    await nextTick()
    await panel.find('.ktp-add').trigger('click')
    await nextTick()
    await panel.find('.ktp-reject').trigger('click')
    await nextTick()
    expect(panel.find('.ktp-card').text()).toContain('已拒绝')
  })

  it('改写应用走 prompt 并更新知识内容', async () => {
    seedBranches([makeBranch('b1', '分支一'), makeBranch('b2', '分支二')])
    vi.stubGlobal('prompt', vi.fn().mockReturnValue('改写后的心法'))
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = ktp(wrapper)
    await pickSourceTarget(panel)
    const input = panel.find('input.ktp-wide')
    await input.setValue('原始经验')
    await nextTick()
    await panel.find('.ktp-add').trigger('click')
    await nextTick()
    await panel.find('.ktp-adapt').trigger('click')
    await nextTick()
    // 改写应用后的卡片状态即证明 prompt 返回了改写内容
    const card = panel.find('.ktp-card')
    expect(card.text()).toContain('改写应用')
    expect(card.text()).toContain('改写后的心法')
    expect(card.text()).not.toContain('原始经验')
  })
})

// ============================================================
// 集成：世界融合面板 WorldMergePanel（INCR-266 补挂载孤儿组件）
// 引擎 useWorldMergeEngine 无状态（mergePreviews/mergeResults/rollbackHistory 每次调用新建局部 ref、无持久化），
// 薄委托化：宿主注入 branches/checkpoints/snapshots，面板直驱引擎当前实例
// 注意：页面存在其他同名 aria-label 的 select（源分支/目标分支），一律在 .wmp 作用域内查找
// ============================================================
describe('集成：世界融合面板', () => {
  const K_BRANCHES = 'hf:parallel-world:branches'
  const K_CHECKPOINTS = 'hf:parallel-world:checkpoints'
  const K_SNAPSHOTS = 'hf:parallel-world:snapshots'

  function makeBranch(id: string, name: string, overrides: Record<string, any> = {}) {
    return {
      id, name, description: '', color: '#4A90D9',
      createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined,
      isActive: false, checkpointCount: 0, ...overrides,
    }
  }

  function makeCheckpoint(id: string, branchId: string, label: string, overrides: Record<string, any> = {}) {
    return {
      id, branchId, label, description: '',
      snapshot: { [id]: 1 }, createdAt: '2026-01-01T00:00:00.000Z',
      tags: [], ...overrides,
    }
  }

  function seedWorld(branches: any[], checkpoints: any[] = [], snapshots: any[] = []) {
    mockStore[K_BRANCHES] = branches
    mockStore[K_CHECKPOINTS] = checkpoints
    mockStore[K_SNAPSHOTS] = snapshots
  }

  function wmp(wrapper: any) {
    const el = wrapper.find('.wmp')
    expect(el.exists()).toBe(true)
    return el
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染骨架与融合统计徽标', async () => {
    const wrapper = await getWrapper()
    const panel = wmp(wrapper)
    expect(panel.text()).toContain('🧬 世界融合')
    expect(panel.text()).toContain('分支合并 · 遗产继承 · 回滚')
    expect(panel.text()).toContain('0 次融合 · 0 回滚')
  })

  it('分支不足两个时显示空态引导', async () => {
    const wrapper = await getWrapper()
    expect(wmp(wrapper).text()).toContain('至少需要两个时间分支才能融合。先在「分支星图」种下分支与检查点。')
  })

  it('单个分支仍视为不足并保持空态', async () => {
    seedWorld([makeBranch('b1', '分支一')])
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    expect(panel.find('.wmp-form').exists()).toBe(false)
    expect(panel.text()).toContain('至少需要两个时间分支才能融合。')
  })

  it('两个分支渲染合并表单与策略推荐', async () => {
    seedWorld(
      [makeBranch('b1', '分支一'), makeBranch('b2', '分支二')],
      [makeCheckpoint('cp1', 'b1', '起点')],
    )
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    // 源/目标两个下拉
    const selects = panel.findAll('select.wmp-input')
    expect(selects.length).toBe(2)
    // 两个操作按钮（预览/执行融合）
    expect(panel.findAll('.wmp-run').length).toBe(1)
    // 选好源/目标后出现策略推荐（目标分支无检查点 → 快进合并）
    await pickSourceTarget(panel)
    expect(panel.find('.wmp-reco').exists()).toBe(true)
    expect(panel.text()).toContain('快进合并')
    expect(panel.text()).toContain('目标分支无检查点，建议快进合并')
  })

  it('预览合并展示统计与冲突列表', async () => {
    seedWorld(
      [makeBranch('b1', '分支一'), makeBranch('b2', '分支二')],
      [
        makeCheckpoint('cp1', 'b1', '起点', { tags: ['重要'] }),
        makeCheckpoint('cp2', 'b2', '起点', { tags: ['重要'] }),
      ],
    )
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    await pickSourceTarget(panel)
    await panel.find('.wmp-btn').trigger('click')
    await nextTick()
    // 合并预览统计块（新增/修改/冲突）
    expect(panel.find('.wmp-preview-grid').exists()).toBe(true)
    expect(panel.text()).toContain('合并预览')
    expect(panel.text()).toContain('三方合并')
    // 同标签同标签集 → 修改 1 + 标签冲突 + 标签名冲突
    expect(panel.text()).toContain('标签冲突')
    expect(panel.text()).toContain('标签名冲突')
    expect(panel.findAll('.wmp-conflict').length).toBeGreaterThan(0)
  })

  it('自动解决非关键冲突后标记已解决', async () => {
    seedWorld(
      [makeBranch('b1', '分支一'), makeBranch('b2', '分支二')],
      [
        makeCheckpoint('cp1', 'b1', '起点', { tags: ['重要'] }),
        makeCheckpoint('cp2', 'b2', '起点', { tags: ['重要'] }),
      ],
    )
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    await pickSourceTarget(panel)
    await panel.find('.wmp-btn').trigger('click')
    await nextTick()
    expect(panel.findAll('.wmp-conflict').length).toBeGreaterThan(0)
    await panel.find('.wmp-auto').trigger('click')
    await nextTick()
    // 标签冲突(info)与标签名冲突(warning)均为非关键 → 自动解决
    expect(panel.findAll('.wmp-conflict-done').length).toBe(panel.findAll('.wmp-conflict').length)
  })

  it('执行融合成功并展示遗产与回滚历史', async () => {
    seedWorld(
      [makeBranch('b1', '分支一'), makeBranch('b2', '分支二')],
      [
        makeCheckpoint('cp1', 'b1', '起点'),
        makeCheckpoint('cp2', 'b2', '转折'),
      ],
    )
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    await pickSourceTarget(panel)
    await panel.find('.wmp-run').trigger('click')
    await nextTick()
    // 无冲突 → 三方合并成功
    const result = panel.find('.wmp-result')
    expect(result.exists()).toBe(true)
    expect(result.text()).toContain('✓ 融合成功')
    expect(result.text()).toContain('三方合并')
    // 遗产继承
    expect(panel.text()).toContain('遗产继承')
    expect(panel.text()).toContain('检查点')
    // 回滚历史
    expect(panel.text()).toContain('回滚历史')
    expect(panel.text()).toContain('合并"分支一"到"分支二"')
    // 徽标计数更新
    expect(panel.text()).toContain('1 次融合 · 1 回滚')
  })

  it('关键冲突未解决时执行无结果，手动解决后可融合成功', async () => {
    seedWorld(
      [makeBranch('b1', '分支一'), makeBranch('b2', '分支二')],
      [
        makeCheckpoint('cp1', 'b1', '起点', { snapshot: { a: 1 } }),
        makeCheckpoint('cp2', 'b2', '起点', { snapshot: { a: 2 } }),
      ],
    )
    const wrapper = await getWrapper()
    await flushPromises()
    const panel = wmp(wrapper)
    await pickSourceTarget(panel)
    await panel.find('.wmp-btn').trigger('click')
    await nextTick()
    // 同标签共享字段不一致 → 关键数据冲突（severity 类在 .wmp-conflict-sev 上）
    expect(panel.findAll('.wmp-conflict-sev.sev-critical').length).toBeGreaterThan(0)
    // 关键冲突未解决 → 引擎拒绝合并，失败结果不落 mergeResults → 面板无结果展示
    await panel.find('.wmp-run').trigger('click')
    await nextTick()
    expect(panel.find('.wmp-result').exists()).toBe(false)
    // 手动解决全部冲突（合并）→ 执行融合成功
    const mergeBtns = panel.findAll('.wmp-conflict .wmp-merge')
    expect(mergeBtns.length).toBeGreaterThan(0)
    for (const b of mergeBtns) {
      await b.trigger('click')
      await nextTick()
    }
    expect(panel.findAll('.wmp-conflict-done').length).toBe(panel.findAll('.wmp-conflict').length)
    await panel.find('.wmp-run').trigger('click')
    await nextTick()
    const result = panel.find('.wmp-result')
    expect(result.exists()).toBe(true)
    expect(result.text()).toContain('✓ 融合成功')
  })
})

async function pickSourceTarget(panel: any) {
  const sourceSel = panel.find('select[aria-label="源分支"]')
  await sourceSel.setValue('b1')
  await sourceSel.trigger('change')
  const targetSel = panel.find('select[aria-label="目标分支"]')
  await targetSel.setValue('b2')
  await targetSel.trigger('change')
  await nextTick()
}

// ============================================================
// 集成：平行世界档案面板 ParallelWorldArchivePanel（INCR-290 补挂载孤儿组件）
// 引擎 modules/parallel-world/parallel-analytics.ts 的纯函数
// （parallelOverview / altSelfSourceRows / capsuleStatusRows / parallelRhythm /
//   branchDepthLabel / parallelWorldHealth / parallelInsights；全纯函数零副作用，
//   now 可测）应用库内仅本组件消费（rg 排除 __tests__ 后仅本组件 + index.ts
//   re-export 引用）→ 应用库内唯一。薄委托化：宿主注入 4 数组 props
//   (forks=hf:decision_forks / alts=hf:parallel_alts / capsules=hf:time_capsules /
//    branches=hf:parallel-world:branches)，宿主 ParallelWorld.vue 经
//   pw.load()/loadCapsules()/parallelWorld.load() 从 storage 载入同名数组。
// 挂载于平行世界档案区段（平行自我区之后、分支管理之前）。
// 注：Fork.at(Capsule.at/openDate) 为日期字符串；分支绽开 depthLabel 与健康
//   徽章跟在有数据时恒渲染；健康 label 依 avgCapsuleWait 估算但仍稳居
//   「新芽微露」区间(种子两胶囊 wait≈33 天 → continuity≈23 → score≈27)。
// ============================================================
describe('集成：平行世界档案面板', () => {
  const KF = 'hf:decision_forks'
  const KA = 'hf:parallel_alts'
  const KC = 'hf:time_capsules'
  const KB = 'hf:parallel-world:branches'
  const DAY = 24 * 3600 * 1000
  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()

  beforeEach(() => {
    vi.clearAllMocks()
    delete mockStore[KF]
    delete mockStore[KA]
    delete mockStore[KC]
    delete mockStore[KB]
  })

  function seedFilled() {
    mockStore[KF] = [
      { id: 'f1', description: '岔路A', chosen: '选择了A', alternative: '没走的B', date: '2026-01-01', at: iso(0) },
      { id: 'f2', description: '岔路B', chosen: '选择了C', alternative: '没走的D', date: '2026-01-02', at: iso(10) },
    ]
    mockStore[KA] = [
      { id: 'a1', title: '甲', desc: '分叉映照的你', icon: '🌿', color: '#c4956a', expanded: false, originForkId: 'f1', createdAt: iso(1) },
      { id: 'a2', title: '乙', desc: '自由映照的你', icon: '🌟', color: '#6b9fc4', expanded: false, originForkId: null, createdAt: iso(2) },
    ]
    mockStore[KC] = JSON.stringify([
      { id: 'c1', message: '给未来', text: '给未来', opened: false, at: iso(5), openDate: iso(-30) },
      { id: 'c2', message: '开过的信', text: '开过的信', opened: true, at: iso(20), openDate: iso(-5) },
    ])
    mockStore[KB] = [
      { id: 'pw_b1', name: '一条枝', description: '', color: '#2E8B57', createdAt: iso(3), parentBranchId: undefined, isActive: false, checkpointCount: 2 },
    ]
  }

  it('无数据时渲染空态引导', async () => {
    const wrapper = await getWrapper()
    const pwap = wrapper.find('.pwap')
    expect(pwap.exists()).toBe(true)
    expect(pwap.find('.pwap-title').text()).toContain('平行世界档案')
    expect(pwap.text()).toContain('平行世界还是空的')
    expect(pwap.find('.pwap-stats').exists()).toBe(false)
  })

  it('概览统计反映四类数据（分叉2·自我2·胶囊2·分支1·检查点2）', async () => {
    seedFilled()
    const wrapper = await getWrapper()
    await flushPromises()
    const pwap = wrapper.find('.pwap')
    const stats = pwap.findAll('.pwap-stat').map(s => ({
      label: s.find('.pwap-stat-label').text(),
      num: s.find('.pwap-stat-num').text(),
    }))
    const v = (l: string) => stats.find(x => x.label === l)?.num
    expect(v('抉择分叉')).toBe('2')
    expect(v('平行自我')).toBe('2')
    expect(v('时间胶囊')).toBe('2')
    expect(v('时间分支')).toBe('1')
    expect(v('检查点')).toBe('2')
  })

  it('来源分布与胶囊状态行渲染', async () => {
    seedFilled()
    const wrapper = await getWrapper()
    await flushPromises()
    const pwap = wrapper.find('.pwap')
    expect(pwap.text()).toContain('平行自我来源')
    expect(pwap.text()).toContain('分叉映照')
    expect(pwap.text()).toContain('自由映照')
    expect(pwap.text()).toContain('时间胶囊状态')
    expect(pwap.text()).toContain('已开启')
    expect(pwap.text()).toContain('仍在等')
  })

  it('抉择节奏反映近7/近30天分叉且健康徽章新芽微露', async () => {
    seedFilled()
    const wrapper = await getWrapper()
    await flushPromises()
    const pwap = wrapper.find('.pwap')
    const rhythm = pwap.findAll('.pwap-rhythm-item').map(r => ({
      label: r.find('.pwap-rhythm-label').text(),
      num: r.find('.pwap-rhythm-num').text(),
    }))
    expect(rhythm.find(x => x.label === '近 7 天分叉')?.num).toBe('1')
    expect(rhythm.find(x => x.label === '近 30 天分叉')?.num).toBe('2')
    expect(pwap.find('.pwap-health-label').text()).toBe('新芽微露')
  })

  it('温和回看给出时间胶囊洞察与健康沉淀', async () => {
    seedFilled()
    const wrapper = await getWrapper()
    await flushPromises()
    const pwap = wrapper.find('.pwap')
    const ins = pwap.findAll('.pwap-insight').map(i => i.text())
    expect(ins.some(t => t.includes('时间胶囊被未来的你开启'))).toBe(true)
    expect(ins.some(t => t.includes('新芽微露'))).toBe(true)
  })
})

// ============================================================
// 集成：冲突仲裁面板（INCR-291 补挂载孤儿组件）
// 引擎 modules/parallel-world/auto-conflict-resolution.ts 的
// useAutoConflictResolution 组合式引擎（规则驱动自动解决/冲突模式分析/
// 多策略/优先级规则/解决历史；实例级 ref + storage 持久化，初始化
// loadRules/loadHistory/loadDefaultStrategy，键 hf:parallel-world:
// resolution-rules / resolution-history / default-strategy）。
// 引擎消费方核验: 排除 __tests__ 后生产消费方仅 AutoConflictPanel 与
// ConflictResolutionPanel 两个**孤儿**组件（均未挂载任何视图）；本 INCR
// 挂载 AutoConflictPanel 后引擎生产消费方唯一。ConflictResolutionPanel
// 同为冗余孤儿（直接内联 useParallelWorld 自载数据，非薄委托），独有能力
// （默认策略/解决历史/规则描述/字段规则/多冲突类型）已于 INCR-400 并入
// AutoConflictPanel 并删除该孤儿，引擎生产消费方保持唯一。薄委托化：宿主注入 branches /
// checkpoints 两数组 props（hf:parallel-world:branches / checkpoints），
// 挂载于世界对照之后、情景推演之前（与合并/对照/仲裁语义聚类）。
// 注：引擎初始化读不到规则键时自动落默认 5 规则并回写 storage；
//   冲突检测源/目标检查点同分支时 canDetect 为 false。
//   宿主最小状态：useParallelWorld.load() 空存储时自动落默认主干分支
//   （worlds.ts 空分支 → branches=[DEFAULT_TRUNK] 并 persistBranches），
//   故面板「还没有平行分支可仲裁」空态在宿主内不可达，最小为单分支引导。
// ============================================================
describe('集成：冲突仲裁面板', () => {
  const KB = 'hf:parallel-world:branches'
  const KC = 'hf:parallel-world:checkpoints'

  beforeEach(() => {
    vi.clearAllMocks()
    delete mockStore[KB]
    delete mockStore[KC]
    delete mockStore['hf:parallel-world:resolution-rules']
    delete mockStore['hf:parallel-world:resolution-history']
    delete mockStore['hf:parallel-world:default-strategy']
  })

  function twoBranches() {
    return [
      { id: 'a', name: '主世界', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 },
      { id: 'b', name: '平行世界', description: '', color: '#2E8B57', createdAt: '2026-01-02T00:00:00.000Z', parentBranchId: 'a', isActive: false, checkpointCount: 2 },
    ]
  }

  function conflictingCheckpoints() {
    return [
      { id: 'sa', branchId: 'a', label: '源', description: '', snapshot: { v: 1 }, createdAt: '2026-01-01T00:00:00.000Z', tags: ['life', 'work'] },
      { id: 'sb', branchId: 'b', label: '目标', description: '', snapshot: { v: 2 }, createdAt: '2026-02-01T00:00:00.000Z', tags: ['life'] },
    ]
  }

  it('默认主干（空存储）时渲染仲裁引导', async () => {
    const wrapper = await getWrapper()
    await flushPromises()
    const acp = wrapper.find('.acp-panel')
    expect(acp.exists()).toBe(true)
    expect(acp.text()).toContain('冲突仲裁')
    // 空存储 → useParallelWorld.load() 自动落默认主干分支并回写 storage
    // （worlds.ts load() 空分支时 branches=[DEFAULT_TRUNK] 主干），
    // 故宿主内该面板的最小状态是单分支引导而非「还没有平行分支可仲裁」。
    expect(acp.text()).toContain('至少需要两个分支才能仲裁')
    expect(acp.text()).toContain('主干')
    expect(acp.find('.acp-badge').text()).toBe('0 次解决 · 5 条规则')
  })

  it('单分支时给出至少两分支引导', async () => {
    mockStore[KB] = [{ id: 'a', name: '主世界', description: '', color: '#4A90D9', createdAt: '2026-01-01T00:00:00.000Z', parentBranchId: undefined, isActive: true, checkpointCount: 2 }]
    const wrapper = await getWrapper()
    await flushPromises()
    const acp = wrapper.find('.acp-panel')
    expect(acp.text()).toContain('至少需要两个分支才能仲裁')
    expect(acp.text()).toContain('主世界')
  })

  it('双分支：检测冲突显示冲突列表', async () => {
    mockStore[KB] = twoBranches()
    mockStore[KC] = conflictingCheckpoints()
    const wrapper = await getWrapper()
    await flushPromises()
    const acp = wrapper.find('.acp-panel')
    const selects = acp.findAll('.acp-input')
    await selects[0].setValue('sa')
    await selects[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await acp.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    expect(acp.text()).toContain('检测到 4 个冲突')
    expect(acp.text()).toContain('标签名称冲突')
    expect(acp.text()).toContain('数据字段冲突')
  })

  it('双分支：一键解决生成结果摘要并更新徽标', async () => {
    mockStore[KB] = twoBranches()
    mockStore[KC] = conflictingCheckpoints()
    const wrapper = await getWrapper()
    await flushPromises()
    const acp = wrapper.find('.acp-panel')
    const selects = acp.findAll('.acp-input')
    await selects[0].setValue('sa')
    await selects[1].setValue('sb')
    await wrapper.vm.$nextTick()
    await acp.find('.acp-detect').trigger('click')
    await wrapper.vm.$nextTick()
    await acp.find('.acp-run').trigger('click')
    await wrapper.vm.$nextTick()
    expect(acp.find('.acp-result').exists()).toBe(true)
    expect(acp.text()).toContain('✓ 全部解决')
    expect(acp.text()).toContain('共解决 4 个冲突')
    expect(acp.find('.acp-badge').text()).toContain('1 次解决')
  })

  it('规则页：默认规则列表渲染', async () => {
    mockStore[KB] = twoBranches()
    const wrapper = await getWrapper()
    await flushPromises()
    const acp = wrapper.find('.acp-panel')
    await acp.findAll('.acp-tab')[1].trigger('click')
    await wrapper.vm.$nextTick()
    expect(acp.text()).toContain('时间戳冲突取最新')
    expect(acp.text()).toContain('标签合并')
  })
})

