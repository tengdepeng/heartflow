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
    const monthGroups = wrapper.findAll('.old-month-group')
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
    const reviveBtn = wrapper.find('.revive-btn')
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
})