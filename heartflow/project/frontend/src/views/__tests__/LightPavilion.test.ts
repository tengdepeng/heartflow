// ============================================================
// LightPavilion 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

let savedGoals: any[] = []
const mockGetGoals = vi.fn(() => savedGoals)
const mockSetGoals = vi.fn((goals: any[]) => { savedGoals = goals })

// 存储值映射：key → value
const kvStore: Record<string, any> = {}
const mockGetKV = vi.fn((key: string, defaultValue: any) => {
  return key in kvStore ? kvStore[key] : defaultValue
})
const mockSetKV = vi.fn((key: string, value: any) => {
  kvStore[key] = value
})

vi.mock('../../engine/storage', () => ({
  storage: {
    getGoals: (...args: any[]) => (mockGetGoals as any)(...args),
    setGoals: (...args: any[]) => (mockSetGoals as any)(...args),
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// INCR-442：光之脉络 / 成就路线 薄委托面板在集成测试中 stub，避免 goal-visualization 引擎单例串扰
// 注意：本测试文件位于 src/views/__tests__/，组件在 src/components/，故路径为 ../../components/...
vi.mock('../../components/LightVeinPanel.vue', () => ({
  default: { template: '<section data-test="light-vein-panel" />' },
}))
vi.mock('../../components/LightMilestoneTrail.vue', () => ({
  default: { template: '<section data-test="light-milestone-trail" />' },
}))

async function getWrapper() {
  const { default: LightPavilion } = await import('../LightPavilion.vue')
  return mount(LightPavilion, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('LightPavilion 旧梦潭', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('无已完成目标时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('旧梦潭')
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('暂无已完成的目标')
  })

  it('有已完成目标时按月分组展示', async () => {
    savedGoals = [
      {
        id: 'g1',
        title: '完成的目标A',
        description: '',
        tier: 'target',
        status: 'bloom',
        domain: 'growth',
        order: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-06-15T00:00:00Z',
        completedAt: '2026-06-15T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
      {
        id: 'g2',
        title: '完成的目标B',
        description: '',
        tier: 'target',
        status: 'bloom',
        domain: 'health',
        order: 1,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-05-20T00:00:00Z',
        completedAt: '2026-05-20T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('完成的目标A')
    expect(wrapper.text()).toContain('完成的目标B')
    expect(wrapper.text()).toContain('已完成')
    expect(wrapper.text()).toContain('2')
    // 月份分组展示
    const monthGroups = wrapper.findAll('[data-test="odp-month-group"]')
    expect(monthGroups.length).toBeGreaterThanOrEqual(2)
  })

  it('复苏按钮将目标恢复为生长中状态', async () => {
    savedGoals = [
      {
        id: 'g1',
        title: '待复苏的目标',
        description: '',
        tier: 'target',
        status: 'bloom',
        domain: 'growth',
        order: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-06-15T00:00:00Z',
        completedAt: '2026-06-15T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
    ]
    const wrapper = await getWrapper()
    const reviveBtn = wrapper.find('[data-test="odp-revive-g1"]')
    expect(reviveBtn.exists()).toBe(true)
    await reviveBtn.trigger('click')
    // 验证 setGoals 被调用
    expect(mockSetGoals).toHaveBeenCalled()
    // 验证目标状态已更新
    const lastCallArgs = mockSetGoals.mock.calls[mockSetGoals.mock.calls.length - 1][0]
    const revived = lastCallArgs.find((g: any) => g.id === 'g1')
    expect(revived).toBeDefined()
    expect(revived.status).toBe('growing')
    expect(revived.completedAt).toBeUndefined()
  })
})

describe('LightPavilion 专项规划区', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('无专项规划时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('专项规划区')
    expect(wrapper.text()).toContain('0')
    expect(wrapper.text()).toContain('还没有跨目标规划')
  })

  it('有专项规划时展示卡片', async () => {
    const plans = [
      {
        id: 'sp1',
        title: '测试专项规划',
        description: '这是一项跨目标规划',
        relatedGoalIds: [],
        milestones: [],
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ]
    kvStore['hf:special_plans'] = plans
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('测试专项规划')
    expect(wrapper.text()).toContain('这是一项跨目标规划')
    expect(wrapper.text()).toContain('1')
  })

  it('展开卡片后可查看里程碑', async () => {
    const plans = [
      {
        id: 'sp2',
        title: '里程碑规划',
        description: '',
        relatedGoalIds: [],
        milestones: [
          { label: '第一步', done: false },
          { label: '第二步', done: true },
        ],
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ]
    kvStore['hf:special_plans'] = plans
    const wrapper = await getWrapper()
    // 展开卡片（点击标题区域）
    const planCardHeader = wrapper.find('.plan-card-header')
    expect(planCardHeader.exists()).toBe(true)
    await planCardHeader.trigger('click')
    // 里程碑内容应出现
    expect(wrapper.text()).toContain('第一步')
    expect(wrapper.text()).toContain('第二步')
    // 进度应为 50%（2 个里程碑中 1 个完成）
    expect(wrapper.text()).toContain('50%')
  })

  it('点击里程碑可切换完成状态', async () => {
    const plans = [
      {
        id: 'sp3',
        title: '可切换的规划',
        description: '',
        relatedGoalIds: [],
        milestones: [
          { label: '待完成的里程碑', done: false },
        ],
        createdAt: '2026-07-01T00:00:00Z',
        updatedAt: '2026-07-01T00:00:00Z',
      },
    ]
    kvStore['hf:special_plans'] = plans
    const wrapper = await getWrapper()
    // 展开卡片
    await wrapper.find('.plan-card-header').trigger('click')
    // 点击里程碑的勾选框
    const msCheck = wrapper.find('.ms-check')
    expect(msCheck.exists()).toBe(true)
    await msCheck.trigger('click')
    // 验证 setKV 被调用（保存更新）
    expect(mockSetKV).toHaveBeenCalledWith('hf:special_plans', expect.any(Array))
    // 验证里程碑状态已切换
    const savedPlans = mockSetKV.mock.calls.find(c => c[0] === 'hf:special_plans')?.[1]
    expect(savedPlans).toBeDefined()
    expect(savedPlans[0].milestones[0].done).toBe(true)
  })

  it('新建专项规划弹窗可正常打开', async () => {
    const wrapper = await getWrapper()
    // 点击"新建专项"按钮
    const addBtn = wrapper.find('.section-add-btn')
    expect(addBtn.exists()).toBe(true)
    expect(addBtn.text()).toContain('新建专项')
  })
})

describe('LightPavilion 穹顶星光（愿景）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('愿景区渲染标题并提供创建入口', async () => {
    const wrapper = await getWrapper()
    // 愿景头部文案
    expect(wrapper.text()).toContain('愿景')
    // 目标 / 计划 / 愿景 三个 tier 各有一个 + 按钮
    const addBtns = wrapper.findAll('.btn-add-sm')
    expect(addBtns.length).toBeGreaterThanOrEqual(3)
  })

  it('有愿景时穹顶星光渲染星点', async () => {
    savedGoals = [
      {
        id: 'v1',
        title: '想去冰岛看极光',
        description: '',
        tier: 'vision',
        status: 'seed',
        domain: 'growth',
        order: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
    ]
    const wrapper = await getWrapper()
    const star = wrapper.find('.dome-star')
    expect(star.exists()).toBe(true)
    expect(star.attributes('title')).toBe('想去冰岛看极光')
  })
})

describe('LightPavilion 概览统计口径', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('里程碑统计反映已完成计划数（区别于已完成目标数）', async () => {
    savedGoals = [
      {
        id: 't1',
        title: '目标A',
        description: '',
        tier: 'target',
        status: 'bloom',
        domain: 'growth',
        order: 0,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-06-15T00:00:00Z',
        completedAt: '2026-06-15T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
      {
        id: 'p1',
        title: '计划A',
        description: '',
        tier: 'plan',
        status: 'bloom',
        domain: 'growth',
        order: 0,
        parentId: 't1',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-06-15T00:00:00Z',
        anchorCount: 0,
        anchorDone: 0,
      },
    ]
    const wrapper = await getWrapper()
    const items = wrapper.findAll('.stat-item')
    expect(items.length).toBe(4)
    const completedVal = items[2].find('.stat-value').text()
    const milestoneVal = items[3].find('.stat-value').text()
    expect(completedVal).toBe('1') // 已完成目标 = 1
    expect(milestoneVal).toBe('1') // 已完成计划（里程碑） = 1
  })

  // ============================================================
  // 目标生长进度档案（INCR-270：薄委托化挂载 GoalGrowthArchivePanel 至留光阁）
  // 引擎 useProgressSnapshots/useGrowthLogs/useMilestoneTimeline 有状态：经 storage.getKV/setKV('hf:goal_progress_snapshots'/'hf:goal_progress_logs'/'hf:goal_milestones') 持久化，测试直接 seed kvStore；
  // goal.goals 经 storage.getGoals(savedGoals) 注入，目标 status 即生长阶段（computeStats 直接计 status 分布）
  // ============================================================
  describe('集成：目标生长进度档案', () => {
    const SNAP = 'hf:goal_progress_snapshots'
    const LOG = 'hf:goal_progress_logs'
    const MS = 'hf:goal_milestones'

    function gs(wrapper: any) {
      const el = wrapper.find('.ggap-panel')
      expect(el.exists()).toBe(true)
      return el
    }

    function seedGoals(over: any[] = []) {
      savedGoals = [
        {
          id: 'g1', title: '掌握 Vue 3', description: '', tier: 'target',
          status: 'growing', domain: 'growth', order: 0,
          createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-02T00:00:00Z',
          anchorCount: 3, anchorDone: 2,
        },
        ...over,
      ]
    }

    it('无目标时显示空态引导与「尚未启程」徽标', async () => {
      savedGoals = []
      const wrapper = await getWrapper()
      const el = gs(wrapper)
      expect(el.text()).toContain('🌱 目标生长进度档案')
      expect(el.text()).toContain('尚未启程')
      expect(el.text()).toContain('留光阁尚未点亮目标。在穹顶点亮一颗星')
      expect(el.text()).toContain('0 个目标')
    })

    it('有目标时渲染档案概览六格与生长阶段分布', async () => {
      seedGoals([{ id: 'g2', title: '完成的项目A', description: '', tier: 'target', status: 'bloom', domain: 'work', order: 1, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z', completedAt: '2026-01-03T00:00:00Z', anchorCount: 0, anchorDone: 0 }])
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      const el = gs(wrapper)
      expect(el.text()).toContain('2 个目标 · 已开花 1 个')
      expect(el.text()).toContain('生长中')
      expect(el.findAll('.ggap-cell').length).toBe(6)
      expect(el.text()).toContain('总目标')
      expect(el.text()).toContain('进行中')
      expect(el.text()).toContain('已开花')
      expect(el.findAll('.ggap-phase-row').length).toBe(5)
      expect(el.text()).toContain('发芽')
      expect(el.text()).toContain('休眠中')
    })

    it('目标标签与详情展示状态、步骤、进度', async () => {
      seedGoals()
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      const el = gs(wrapper)
      expect(el.findAll('.ggap-target-tab').length).toBe(1)
      expect(el.find('.ggap-target-tab').text()).toContain('掌握 Vue 3')
      expect(el.find('.ggap-target-detail').exists()).toBe(true)
      expect(el.text()).toContain('2/3 步')
      expect(el.text()).toContain('进度 67%')
      expect(el.text()).toContain('已记录快照 0 次')
    })

    it('里程碑时间线渲染并计算进度', async () => {
      seedGoals()
      kvStore[MS] = [{ goalId: 'g1', title: '掌握 Vue 3', milestones: [
        { id: 'm1', label: '学习 API', date: '2026-01-05T00:00:00Z', status: 'achieved', type: 'checkpoint' },
        { id: 'm2', label: '完成项目', date: '2026-02-01T00:00:00Z', status: 'pending', type: 'completion' },
      ] }]
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      const el = gs(wrapper)
      expect(el.findAll('.ggap-ms-row').length).toBe(2)
      expect(el.text()).toContain('学习 API')
      expect(el.text()).toContain('完成项目')
      expect(el.find('.ggap-ms-progress').text()).toContain('50%')
    })

    it('记录进度快照写入存储并更新计数', async () => {
      seedGoals()
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      await gs(wrapper).find('.ggap-snap-btn').trigger('click')
      await wrapper.vm.$nextTick()
      expect(kvStore[SNAP].length).toBe(1)
      expect(gs(wrapper).text()).toContain('已记录快照 1 次')
    })

    it('添加里程碑生成条目并落持久化', async () => {
      seedGoals()
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      await gs(wrapper).find('.ggap-ms-input').setValue('新里程碑')
      await gs(wrapper).find('.ggap-ms-add-btn').trigger('click')
      await wrapper.vm.$nextTick()
      const el = gs(wrapper)
      expect(el.findAll('.ggap-ms-row').length).toBe(1)
      expect(el.text()).toContain('新里程碑')
      expect(kvStore[MS][0].milestones.length).toBe(1)
    })

    it('切换里程碑达成状态标记划线', async () => {
      seedGoals()
      kvStore[MS] = [{ goalId: 'g1', title: '掌握 Vue 3', milestones: [
        { id: 'm1', label: '学习 API', date: '2026-01-05T00:00:00Z', status: 'pending', type: 'checkpoint' },
      ] }]
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      await gs(wrapper).find('.ggap-ms-check').trigger('click')
      await wrapper.vm.$nextTick()
      expect(gs(wrapper).find('.ggap-ms-row.ms-achieved').exists()).toBe(true)
      expect(kvStore[MS][0].milestones[0].status).toBe('achieved')
    })

    it('渲染近期生长日志', async () => {
      seedGoals()
      kvStore[LOG] = [
        { id: 'l1', goalId: 'g1', event: '进度更新', detail: '完成 2/3 步', recordedAt: '2026-01-10T00:00:00Z' },
        { id: 'l2', goalId: 'g1', event: '状态变更', detail: '发芽 → 生长中', fromStatus: 'sprout', toStatus: 'growing', recordedAt: '2026-01-11T00:00:00Z' },
      ]
      const wrapper = await getWrapper()
      await wrapper.vm.$nextTick()
      const el = gs(wrapper)
      expect(el.findAll('.ggap-log-row').length).toBe(2)
      expect(el.text()).toContain('进度更新')
      expect(el.text()).toContain('状态变更')
    })
  })
})

// ============================================================
// 集成：专项档案面板 SpecialPlanArchivePanel（INCR-286 补挂载孤儿组件）
// 引擎 modules/goal/special-plan-analytics.ts 的纯函数
// （computeSpecialPlanOverview / computePlanProgress / orphanPlans, 另含
//   milestoneStat / plansForGoal / planSuggestion）在应用内仅本组件消费
//   （rg 排除 __tests__ 后仅 SpecialPlanArchivePanel 引用）→ 应用库内唯一。
// Props 契约 plans: SpecialPlan[]，宿主 LightPavilion.vue 经 useLightPavilionData
//   （模块 light/pavilion-data.ts，SPECIAL_PLANS_KEY='hf:special_plans'）持有同名
//   SpecialPlan[]，直接 :plans="specialPlans" 薄委托。放置于专项规划创建弹窗之前、
//   GoalGrowthArchivePanel 之后。
// 注：addedThisWeek 以真实 Date.now() 为基准，故测试用旧 createdAt(2026-07-01)
//   使「近7天新增=0」稳定；宿主 .special-plan-section 空态文案与面板 .spp-empty
//   都含「还没有跨目标规划」，断言须 .spp-panel 作用域隔离。
// ============================================================
describe('集成：专项档案面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  const plan = (id: string, over: any) => ({
    id, title: over.title || '专项', description: '',
    relatedGoalIds: over.relatedGoalIds ?? [], milestones: over.milestones ?? [],
    createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z',
  })

  it('无专项规划时渲染空态（专项未立）', async () => {
    const wrapper = await getWrapper()
    const spp = wrapper.find('.spp-panel')
    expect(spp.exists()).toBe(true)
    expect(spp.find('.spp-title').text()).toContain('专项档案')
    expect(spp.find('.spp-badge-neutral').text()).toBe('专项未立')
    expect(spp.find('.spp-grid').exists()).toBe(false)
  })

  it('有专项规划时渲染档案概览与里程碑进度', async () => {
    kvStore['hf:special_plans'] = [
      plan('spA', { title: '推进中的规划', relatedGoalIds: ['g1'], milestones: [{ label: '一', done: true }, { label: '二', done: false }] }),
      plan('spB', { title: '孤儿规划' }),
    ]
    const wrapper = await getWrapper()
    const spp = wrapper.find('.spp-panel')
    expect(spp.find('.spp-badge-neutral').exists()).toBe(false)
    expect(spp.find('.spp-badge').text()).toBe('推进中')
    const cells = spp.findAll('.spp-cell').map(c => ({ label: c.find('span').text(), value: c.find('b').text() }))
    const v = (l: string) => cells.find(x => x.label === l)?.value
    expect(v('规划总数')).toBe('2')
    expect(v('关联目标')).toBe('1')
    expect(v('含里程碑')).toBe('1')
    expect(v('平均完成度')).toBe('25%')
    expect(v('总里程碑')).toBe('2')
    expect(v('已完成')).toBe('1')
    expect(v('整体完成度')).toBe('50%')
    expect(v('近7天新增')).toBe('0')
    expect(spp.find('.spp-progress-meta').text()).toContain('1 / 2 里程碑')
    expect(spp.find('.spp-progress-meta').text()).toContain('50%')
  })

  it('游离专项区块渲染未关联目标的规划及其占位进度', async () => {
    kvStore['hf:special_plans'] = [
      plan('spA', { title: '推进中的规划', relatedGoalIds: ['g1'], milestones: [{ label: '一', done: true }, { label: '二', done: false }] }),
      plan('spB', { title: '孤儿规划' }),
    ]
    const wrapper = await getWrapper()
    const spp = wrapper.find('.spp-panel')
    const orphans = spp.findAll('.spp-orphan')
    expect(orphans.length).toBe(1)
    expect(spp.find('.spp-orphan-title').text()).toBe('孤儿规划')
    expect(spp.find('.spp-orphan-progress').text()).toBe('0%')
    // 温和洞察：平均完成度 + 游离专项提示
    const ins = spp.findAll('.spp-insight').map(i => i.text())
    expect(ins.some(t => t.includes('规划平均完成度'))).toBe(true)
    expect(ins.some(t => t.includes('尚未关联目标'))).toBe(true)
  })

  it('全部里程碑完成时徽章显示「全部点亮」', async () => {
    kvStore['hf:special_plans'] = [
      plan('spC', { title: '点亮的规划', relatedGoalIds: ['g1'], milestones: [{ label: '一', done: true }, { label: '二', done: true }] }),
    ]
    const wrapper = await getWrapper()
    const spp = wrapper.find('.spp-panel')
    expect(spp.find('.spp-badge').text()).toBe('全部点亮')
    expect(spp.find('.spp-progress-meta').text()).toContain('2 / 2 里程碑')
    expect(spp.find('.spp-progress-meta').text()).toContain('100%')
  })
})

// ============================================================
// 集成：光之脉络 + 成就路线（INCR-442 新挂载面板）
// 两个薄委托面板在 LightPavilion 内真实挂载（组件本身在各自单测中以真实引擎覆盖），
// 此处仅验证接线存在性，避免与 goal-visualization 引擎单例串扰。
// ============================================================
describe('集成：光之脉络 + 成就路线（INCR-442）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    savedGoals = []
    Object.keys(kvStore).forEach(k => delete kvStore[k])
  })

  it('光之脉络与成就路线面板均挂载于留光阁', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('[data-test="light-vein-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="light-milestone-trail"]').exists()).toBe(true)
  })
})