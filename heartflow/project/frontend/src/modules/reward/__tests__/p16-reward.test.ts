// ============================================================
// 劳酬 · P16-9 · 单元测试
// 里程碑系统 + 预算管理 + 财务目标 + 投资追踪 + 财务分析 + 工作日志桥接
// ============================================================

import { describe, expect, it, beforeEach, vi } from 'vitest'

// ---- Mock storage 模块 ----
const storageData = new Map<string, any>()

vi.mock('@/engine/storage', () => ({
  storage: {
    getKV: vi.fn(<T>(key: string, defaultValue: T): T => {
      const val = storageData.get(key)
      return val !== undefined ? val : defaultValue
    }),
    setKV: vi.fn((key: string, value: any): void => {
      storageData.set(key, value)
    }),
  },
}))

import { useRewardMilestones } from '../milestones'
import { useFinanceGoals, useInvestmentTracker, useFinanceHealth, useFinanceTimeline } from '../finance-goals'
import { useFinanceFilter, usePeriodicAnalysis, useChartData, DEFAULT_FILTER, DEFAULT_PAGINATION } from '../finance-analysis'
import { useWorklogRewardBridge, DEFAULT_BRIDGE_CONFIG, LOG_TYPE_TO_INCOME, MOOD_MULTIPLIER } from '../worklog-bridge'
import type { RewardRecord, RewardMilestone, IncomeCategory } from '../types'
import type { LogEntry, LogEntryType, MoodTone } from '../../worklog/types'
import type { FinanceGoal, FinanceGoalType, GoalTerm } from '../finance-goals'

// ============================================================
// 测试辅助函数
// ============================================================

function createTestRecord(overrides: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: 'rec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'income',
    category: 'freelance' as IncomeCategory,
    amount: 1000,
    description: '测试收入',
    recordedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createTestLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    id: 'log_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    type: 'journal',
    title: '测试日志',
    content: '这是一条测试工作日志，内容足够长以便触发收入计算。' + 'x'.repeat(50),
    mood: 'calm',
    tags: ['test', 'work'],
    sessionIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }
}

function createTestGoal(overrides: Partial<FinanceGoal> = {}): FinanceGoal {
  return {
    id: 'goal_' + Date.now().toString(36),
    type: 'savings' as FinanceGoalType,
    name: '测试目标',
    description: '测试描述',
    targetAmount: 10000,
    currentAmount: 0,
    term: 'short' as GoalTerm,
    targetDate: new Date(Date.now() + 180 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    achieved: false,
    priority: 5,
    monthlyContribution: 500,
    ...overrides,
  }
}

// ============================================================
// 1. useRewardMilestones — 里程碑系统 + 预算管理
// ============================================================

describe('useRewardMilestones', () => {
  let milestones: ReturnType<typeof useRewardMilestones>

  beforeEach(() => {
    storageData.clear()
    milestones = useRewardMilestones()
    // Reset milestones to known state
    milestones.milestones.value = [
      {
        id: 'ms-1', title: '第一桶金', description: '累计收入达到 10,000',
        triggerType: 'income-total', threshold: 10000, achieved: false, reward: '解锁称号',
      },
      {
        id: 'ms-2', title: '储蓄达人', description: '月度储蓄率 50%',
        triggerType: 'savings-rate', threshold: 50, achieved: false, reward: '解锁水晶',
      },
      {
        id: 'ms-3', title: '稳定收入', description: '连续 3 个月',
        triggerType: 'streak', threshold: 3, achieved: false, reward: '解锁光效',
      },
      {
        id: 'ms-4', title: '大单降临', description: '单笔 5000+',
        triggerType: 'income-single', threshold: 5000, achieved: false, reward: '解锁粒子',
      },
      {
        id: 'ms-5', title: '多源收入', description: '3 种来源',
        triggerType: 'project-count', threshold: 3, achieved: false, reward: '解锁主题',
      },
    ]
  })

  describe('addRecord', () => {
    it('应正确添加收入记录', async () => {
      const record = await milestones.addRecord('income', 'freelance', 1000, '测试收入')
      expect(record.type).toBe('income')
      expect(record.amount).toBe(1000)
      expect(record.description).toBe('测试收入')
      expect(milestones.records.value.length).toBe(1)
    })

    it('应正确添加支出记录', async () => {
      const record = await milestones.addRecord('expense', 'tools', 200, '购买工具')
      expect(record.type).toBe('expense')
      expect(record.amount).toBe(200)
      expect(milestones.records.value.length).toBe(1)
    })

    it('应支持关联项目和工作日志', async () => {
      const record = await milestones.addRecord('income', 'freelance', 1000, '关联测试', 'proj-1', 'log-1')
      expect(record.projectId).toBe('proj-1')
      expect(record.worklogId).toBe('log-1')
    })

    it('应自动生成唯一 ID', async () => {
      const r1 = await milestones.addRecord('income', 'freelance', 100, 'r1')
      const r2 = await milestones.addRecord('income', 'freelance', 200, 'r2')
      expect(r1.id).not.toBe(r2.id)
    })
  })

  describe('checkMilestones', () => {
    it('收入总额达到阈值应触发里程碑', async () => {
      await milestones.addRecord('income', 'freelance', 6000, '收入1')
      await milestones.addRecord('income', 'salary', 5000, '收入2')
      // addRecord already calls checkMilestones internally
      const ms1 = milestones.milestones.value.find(m => m.id === 'ms-1')
      expect(ms1).toBeDefined()
      expect(ms1!.achieved).toBe(true)
    })

    it('单笔大额收入应触发 income-single 里程碑', async () => {
      await milestones.addRecord('income', 'freelance', 100, '小收入')
      await milestones.addRecord('income', 'freelance', 6000, '大收入')
      const ms4 = milestones.milestones.value.find(m => m.id === 'ms-4')
      expect(ms4).toBeDefined()
      expect(ms4!.achieved).toBe(true)
    })

    it('多类别收入应触发 project-count 里程碑', async () => {
      await milestones.addRecord('income', 'freelance', 100, 'f')
      await milestones.addRecord('income', 'salary', 100, 's')
      await milestones.addRecord('income', 'investment', 100, 'i')
      const ms5 = milestones.milestones.value.find(m => m.id === 'ms-5')
      expect(ms5).toBeDefined()
      expect(ms5!.achieved).toBe(true)
    })

    it('已达成里程碑不应重复触发', async () => {
      await milestones.addRecord('income', 'freelance', 6000, 'r1')
      await milestones.addRecord('income', 'salary', 5000, 'r2')
      const ms1 = milestones.milestones.value.find(m => m.id === 'ms-1')!
      const achievedAt = ms1.achievedAt

      await milestones.addRecord('income', 'gift', 100, 'r3')
      expect(ms1.achievedAt).toBe(achievedAt)
    })
  })

  describe('预算管理', () => {
    it('应正确设置预算', async () => {
      const budget = await milestones.setBudget('tools', 1000)
      expect(budget.category).toBe('tools')
      expect(budget.monthlyLimit).toBe(1000)
      expect(budget.currentSpent).toBe(0)
    })

    it('支出应更新预算使用量', async () => {
      await milestones.setBudget('tools', 1000)
      await milestones.addRecord('expense', 'tools', 300, '工具')
      await milestones.addRecord('expense', 'tools', 200, '工具2')

      const alerts = milestones.getBudgetAlerts()
      const toolAlert = alerts.find(a => a.category === 'tools')
      expect(toolAlert).toBeDefined()
      expect(toolAlert!.spent).toBe(500)
      expect(toolAlert!.percentage).toBe(50)
    })

    it('预算超 80% 应触发警告', async () => {
      await milestones.setBudget('tools', 1000)
      await milestones.addRecord('expense', 'tools', 850, '大量支出')
      const alerts = milestones.getBudgetAlerts()
      const toolAlert = alerts.find(a => a.category === 'tools')
      expect(toolAlert!.level).toBe('warning')
    })

    it('预算超 100% 应触发危险', async () => {
      await milestones.setBudget('tools', 1000)
      await milestones.addRecord('expense', 'tools', 1200, '超支')
      const alerts = milestones.getBudgetAlerts()
      const toolAlert = alerts.find(a => a.category === 'tools')
      expect(toolAlert!.level).toBe('danger')
    })
  })

  describe('getStats', () => {
    it('应正确计算收支统计', async () => {
      await milestones.addRecord('income', 'freelance', 5000, '收入')
      await milestones.addRecord('income', 'salary', 3000, '工资')
      await milestones.addRecord('expense', 'tools', 1000, '工具')
      await milestones.addRecord('expense', 'learning', 500, '学习')

      const stats = milestones.getStats()
      expect(stats.totalIncome).toBe(8000)
      expect(stats.totalExpense).toBe(1500)
      expect(stats.netBalance).toBe(6500)
      expect(stats.recordCount).toBe(4)
    })

    it('应正确计算储蓄率', async () => {
      await milestones.addRecord('income', 'freelance', 10000, '收入')
      await milestones.addRecord('expense', 'tools', 3000, '支出')

      const stats = milestones.getStats()
      expect(stats.savingsRate).toBe(70)
    })

    it('应正确计算月度趋势', async () => {
      await milestones.addRecord('income', 'freelance', 1000, '本月收入')
      const stats = milestones.getStats()
      expect(stats.monthlyTrend.length).toBe(12)
    })
  })

  describe('removeRecord', () => {
    it('应正确删除记录', async () => {
      const r = await milestones.addRecord('income', 'freelance', 1000, '测试')
      expect(milestones.records.value.length).toBe(1)
      await milestones.removeRecord(r.id)
      expect(milestones.records.value.length).toBe(0)
    })
  })
})

// ============================================================
// 2. useFinanceGoals — 财务目标管理
// ============================================================

describe('useFinanceGoals', () => {
  let goals: ReturnType<typeof useFinanceGoals>

  beforeEach(() => {
    storageData.clear()
    goals = useFinanceGoals()
    goals.goals.value = []
  })

  it('应正确创建财务目标', () => {
    const goal = goals.createGoal('savings', '买房首付', '攒钱买房', 500000, 'long', 8, 5000)
    expect(goal.name).toBe('买房首付')
    expect(goal.targetAmount).toBe(500000)
    expect(goal.term).toBe('long')
    expect(goal.priority).toBe(8)
    expect(goal.monthlyContribution).toBe(5000)
    expect(goals.goals.value.length).toBe(1)
  })

  it('应正确更新目标进度', () => {
    const goal = goals.createGoal('savings', '应急基金', '', 10000, 'short', 5, 1000)
    goals.updateGoalProgress(goal.id, 5000)
    expect(goal.currentAmount).toBe(5000)
    expect(goals.getGoalProgress(goal)).toBe(50)
  })

  it('目标达到 100% 应自动标记完成', () => {
    const goal = goals.createGoal('savings', '应急基金', '', 10000, 'short', 5, 0)
    goals.updateGoalProgress(goal.id, 10000)
    expect(goal.achieved).toBe(true)
    expect(goal.achievedAt).toBeDefined()
  })

  it('应正确添加月度贡献', () => {
    const goal = goals.createGoal('savings', '月度储蓄', '', 12000, 'medium', 5, 1000)
    goals.addMonthlyContribution(goal.id)
    expect(goal.currentAmount).toBe(1000)
  })

  it('goalStats 应正确统计', () => {
    goals.createGoal('savings', 'G1', '', 1000, 'short', 5, 0)
    goals.createGoal('investment', 'G2', '', 2000, 'medium', 5, 0)
    goals.createGoal('expense-control', 'G3', '', 3000, 'long', 5, 0)

    const stats = goals.goalStats.value
    expect(stats.total).toBe(3)
    expect(stats.inProgress).toBe(3)
    expect(stats.achieved).toBe(0)
  })
})

// ============================================================
// 3. useInvestmentTracker — 投资追踪
// ============================================================

describe('useInvestmentTracker', () => {
  let tracker: ReturnType<typeof useInvestmentTracker>

  beforeEach(() => {
    storageData.clear()
    tracker = useInvestmentTracker()
    tracker.investments.value = []
  })

  it('应正确添加投资记录', () => {
    const inv = tracker.addInvestment('stock', '测试股票', 10000, 12000, 4, '测试')
    expect(inv.name).toBe('测试股票')
    expect(inv.principal).toBe(10000)
    expect(inv.currentValue).toBe(12000)
    expect(inv.returnRate).toBe(20)
    expect(inv.riskLevel).toBe(4)
  })

  it('应正确更新投资市值', () => {
    const inv = tracker.addInvestment('fund', '测试基金', 10000, 10000)
    tracker.updateInvestmentValue(inv.id, 11500)
    expect(inv.currentValue).toBe(11500)
    expect(inv.returnRate).toBe(15)
  })

  it('应正确计算年化收益率', () => {
    const inv = tracker.addInvestment('stock', '测试', 10000, 10000)
    const oldDate = new Date()
    oldDate.setFullYear(oldDate.getFullYear() - 1)
    inv.purchasedAt = oldDate.toISOString()
    tracker.updateInvestmentValue(inv.id, 12100)
    expect(inv.annualizedReturn).toBe(21)
  })

  it('portfolioOverview 应正确汇总', () => {
    tracker.addInvestment('stock', 'S1', 5000, 6000)
    tracker.addInvestment('fund', 'F1', 3000, 3300)
    tracker.addInvestment('bond', 'B1', 2000, 2100)

    const overview = tracker.portfolioOverview.value
    expect(overview.totalPrincipal).toBe(10000)
    expect(overview.totalValue).toBe(11400)
    expect(overview.investmentCount).toBe(3)
  })
})

// ============================================================
// 4. useFinanceHealth — 财务健康评分
// ============================================================

describe('useFinanceHealth', () => {
  let health: ReturnType<typeof useFinanceHealth>

  beforeEach(() => {
    storageData.clear()
    health = useFinanceHealth()
    health.healthScores.value = []
  })

  it('应正确计算财务健康评分', () => {
    const records: RewardRecord[] = [
      createTestRecord({ type: 'income', category: 'salary', amount: 5000 }),
      createTestRecord({ type: 'income', category: 'freelance', amount: 3000 }),
      createTestRecord({ type: 'income', category: 'investment', amount: 2000 }),
      createTestRecord({ type: 'expense', category: 'tools', amount: 500 }),
      createTestRecord({ type: 'expense', category: 'learning', amount: 300 }),
    ]

    const score = health.calculateHealthScore(records, 10000, 50000, 0, 3000)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(125) // 5 dimensions × 25 max each
    expect(score.grade).toBeDefined()
    expect(score.dimensions['savings-rate']).toBeGreaterThan(0)
    expect(score.dimensions['income-diversity']).toBeGreaterThan(0)
  })

  it('无负债时负债率评分应为满分', () => {
    const records: RewardRecord[] = [
      createTestRecord({ type: 'income', category: 'salary', amount: 5000 }),
    ]
    const score = health.calculateHealthScore(records, 5000, 30000, 0, 3000)
    expect(score.dimensions['debt-ratio']).toBe(25)
  })

  it('应生成改进建议', () => {
    const records: RewardRecord[] = []
    const score = health.calculateHealthScore(records, 0, 0, 0, 0)
    expect(score.suggestions.length).toBeGreaterThan(0)
  })

  it('latestScore 应返回最新评分', () => {
    health.calculateHealthScore([], 1000, 1000, 0, 500)
    health.calculateHealthScore([], 2000, 2000, 0, 500)
    expect(health.latestScore.value).toBeDefined()
    expect(health.latestScore.value!.total).toBeGreaterThanOrEqual(0)
  })
})

// ============================================================
// 5. useFinanceTimeline — 财务时间线
// ============================================================

describe('useFinanceTimeline', () => {
  it('应正确构建时间线', () => {
    const timeline = useFinanceTimeline()
    const records: RewardRecord[] = [
      createTestRecord({ type: 'income', category: 'freelance', amount: 1000, description: '最新收入' }),
    ]
    const milestones: RewardMilestone[] = [
      {
        id: 'ms-1', title: '达成', description: '测试', triggerType: 'income-total',
        threshold: 100, achieved: true, achievedAt: new Date().toISOString(), reward: '奖励',
      },
    ]
    const goals: FinanceGoal[] = [
      createTestGoal({ achieved: true, achievedAt: new Date().toISOString(), targetAmount: 5000 }),
    ]

    const events = timeline.buildTimeline(records, milestones, goals)
    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events.some(e => e.type === 'milestone')).toBe(true)
    expect(events.some(e => e.type === 'goal-achieved')).toBe(true)
    expect(events.some(e => e.type === 'income-change')).toBe(true)
  })

  it('应按时间倒序排列', () => {
    const timeline = useFinanceTimeline()
    const records: RewardRecord[] = [
      createTestRecord({ type: 'income', category: 'freelance', amount: 1000 }),
    ]
    const ms: RewardMilestone[] = [
      {
        id: 'ms-1', title: '旧', description: '', triggerType: 'income-total',
        threshold: 100, achieved: true, achievedAt: '2025-01-01T00:00:00.000Z', reward: '',
      },
      {
        id: 'ms-2', title: '新', description: '', triggerType: 'income-total',
        threshold: 100, achieved: true, achievedAt: '2026-01-01T00:00:00.000Z', reward: '',
      },
    ]

    const events = timeline.buildTimeline(records, ms, [])
    const dates = events.map(e => new Date(e.date).getTime())
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1]).toBeGreaterThanOrEqual(dates[i])
    }
  })
})

// ============================================================
// 6. useFinanceFilter — 高级筛选与分页
// ============================================================

describe('useFinanceFilter', () => {
  let records: RewardRecord[]
  let filter: ReturnType<typeof useFinanceFilter>

  beforeEach(() => {
    records = [
      createTestRecord({ id: 'r1', type: 'income', category: 'freelance', amount: 5000, description: '自由职业项目A' }),
      createTestRecord({ id: 'r2', type: 'income', category: 'salary', amount: 10000, description: '月薪' }),
      createTestRecord({ id: 'r3', type: 'expense', category: 'tools', amount: 500, description: '购买软件' }),
      createTestRecord({ id: 'r4', type: 'expense', category: 'learning', amount: 300, description: '在线课程' }),
      createTestRecord({ id: 'r5', type: 'income', category: 'investment', amount: 2000, description: '股票收益' }),
    ]
    filter = useFinanceFilter(() => records)
  })

  it('关键词搜索应正确过滤', () => {
    filter.filter.value = { ...DEFAULT_FILTER, keyword: '自由职业' }
    const result = filter.applyFilter()
    expect(result.total).toBe(1)
    expect(result.records[0].id).toBe('r1')
  })

  it('收支类型过滤', () => {
    filter.filter.value = { ...DEFAULT_FILTER, types: ['income'] }
    const result = filter.applyFilter()
    expect(result.total).toBe(3)
    result.records.forEach(r => expect(r.type).toBe('income'))
  })

  it('金额范围过滤', () => {
    filter.filter.value = { ...DEFAULT_FILTER, amountRange: { min: 1000, max: 5000 } }
    const result = filter.applyFilter()
    expect(result.records.every(r => r.amount >= 1000 && r.amount <= 5000)).toBe(true)
  })

  it('分页应正确工作', () => {
    filter.pagination.value = { ...DEFAULT_PAGINATION, page: 1, pageSize: 2 }
    const result = filter.applyFilter()
    expect(result.records.length).toBeLessThanOrEqual(2)
    expect(result.totalPages).toBeGreaterThanOrEqual(1)
    expect(result.hasMore).toBe(true)
  })

  it('排序应正确工作', () => {
    filter.pagination.value = { ...DEFAULT_PAGINATION, sortField: 'amount', sortOrder: 'asc' }
    const result = filter.applyFilter()
    for (let i = 1; i < result.records.length; i++) {
      expect(result.records[i - 1].amount).toBeLessThanOrEqual(result.records[i].amount)
    }
  })

  it('应支持保存和应用预设', () => {
    filter.filter.value = { ...DEFAULT_FILTER, keyword: 'test' }
    const preset = filter.savePreset('测试预设')
    filter.resetFilter()
    expect(filter.filter.value.keyword).toBe('')

    filter.applyPreset(preset.id)
    expect(filter.filter.value.keyword).toBe('test')
  })

  it('应支持删除预设', () => {
    const preset = filter.savePreset('待删除')
    filter.deletePreset(preset.id)
    expect(filter.presets.value.find(p => p.id === preset.id)).toBeUndefined()
  })
})

// ============================================================
// 7. usePeriodicAnalysis — 周期性收支分析
// ============================================================

describe('usePeriodicAnalysis', () => {
  let records: RewardRecord[]

  beforeEach(() => {
    records = [
      createTestRecord({ type: 'income', category: 'freelance', amount: 3000, recordedAt: '2026-07-01T10:00:00.000Z' }),
      createTestRecord({ type: 'income', category: 'salary', amount: 5000, recordedAt: '2026-07-15T10:00:00.000Z' }),
      createTestRecord({ type: 'expense', category: 'tools', amount: 500, recordedAt: '2026-07-10T10:00:00.000Z' }),
      createTestRecord({ type: 'income', category: 'freelance', amount: 4000, recordedAt: '2026-08-01T10:00:00.000Z' }),
      createTestRecord({ type: 'expense', category: 'learning', amount: 300, recordedAt: '2026-08-05T10:00:00.000Z' }),
    ]
  })

  it('应正确计算月度分析', () => {
    const analysis = usePeriodicAnalysis(() => records)
    const result = analysis.computeAnalysis('monthly')
    expect(result.periods.length).toBeGreaterThanOrEqual(1)
    expect(result.totalIncome).toBe(12000)
    expect(result.totalExpense).toBe(800)
  })

  it('应正确判断趋势', () => {
    const analysis = usePeriodicAnalysis(() => records)
    const result = analysis.computeAnalysis('monthly')
    expect(['up', 'down', 'stable']).toContain(result.trend)
  })

  it('应正确计算最佳/最差周期', () => {
    const analysis = usePeriodicAnalysis(() => records)
    const result = analysis.computeAnalysis('monthly')
    expect(result.bestPeriod).toBeDefined()
    expect(result.worstPeriod).toBeDefined()
  })

  it('应支持季度分析', () => {
    const analysis = usePeriodicAnalysis(() => records)
    const result = analysis.computeAnalysis('quarterly')
    expect(result.periods.length).toBeGreaterThanOrEqual(1)
  })
})

// ============================================================
// 8. useChartData — 图表数据接口
// ============================================================

describe('useChartData', () => {
  let records: RewardRecord[]

  beforeEach(() => {
    records = [
      createTestRecord({ type: 'income', category: 'freelance', amount: 5000 }),
      createTestRecord({ type: 'income', category: 'salary', amount: 10000 }),
      createTestRecord({ type: 'income', category: 'investment', amount: 2000 }),
      createTestRecord({ type: 'expense', category: 'tools', amount: 800 }),
      createTestRecord({ type: 'expense', category: 'learning', amount: 500 }),
      createTestRecord({ type: 'expense', category: 'health', amount: 300 }),
    ]
  })

  it('getIncomeCategoryChart 应正确生成收入类别分布', () => {
    const chart = useChartData(() => records)
    const result = chart.getIncomeCategoryChart()
    expect(result.total).toBe(17000)
    expect(result.categories.length).toBe(3)
    expect(result.categories.every(c => c.color)).toBe(true)
  })

  it('getExpenseCategoryChart 应正确生成支出类别分布', () => {
    const chart = useChartData(() => records)
    const result = chart.getExpenseCategoryChart()
    expect(result.total).toBe(1600)
    expect(result.categories.length).toBe(3)
  })

  it('getMonthlyTrendChart 应正确生成月度趋势', () => {
    const chart = useChartData(() => records)
    const result = chart.getMonthlyTrendChart(12)
    expect(result.series.length).toBe(2)
    expect(result.series[0].name).toBe('收入')
    expect(result.series[1].name).toBe('支出')
    expect(result.xLabels.length).toBe(12)
  })

  it('getBudgetChart 应正确生成预算执行情况', () => {
    const chart = useChartData(() => records)
    const result = chart.getBudgetChart()
    expect(result.categories.length).toBeGreaterThan(0)
    expect(result.totalBudget).toBeGreaterThan(0)
  })

  it('getIncomeExpenseComparison 应正确计算收支对比', () => {
    const chart = useChartData(() => records)
    const result = chart.getIncomeExpenseComparison()
    expect(result.income).toBe(17000)
    expect(result.expense).toBe(1600)
    expect(result.balance).toBe(15400)
    expect(result.ratio).toBeGreaterThan(0)
  })
})

// ============================================================
// 9. useWorklogRewardBridge — 工作日志联动桥接
// ============================================================

describe('useWorklogRewardBridge', () => {
  let entries: LogEntry[]
  let rewardRecords: RewardRecord[]
  let bridge: ReturnType<typeof useWorklogRewardBridge>

  beforeEach(() => {
    entries = []
    rewardRecords = []
    bridge = useWorklogRewardBridge(
      () => entries,
      async (type, category, amount, description, projectId, worklogId) => {
        const record: RewardRecord = {
          id: 'br_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          type,
          category,
          amount,
          description,
          recordedAt: new Date().toISOString(),
          projectId,
          worklogId,
        }
        rewardRecords.push(record)
        return record
      },
      () => rewardRecords,
    )
    bridge.mappings.value = []
    bridge.resetConfig()
  })

  describe('calculateEntryIncome', () => {
    it('应根据日志类型计算基础收入', () => {
      const entry = createTestLogEntry({ type: 'milestone' })
      const income = bridge.calculateEntryIncome(entry)
      expect(income).toBeGreaterThanOrEqual(200)
    })

    it('应应用情绪加成', () => {
      const entryEnergetic = createTestLogEntry({ type: 'journal', mood: 'energetic' })
      const entryTired = createTestLogEntry({ type: 'journal', mood: 'tired' })
      const incEnergetic = bridge.calculateEntryIncome(entryEnergetic)
      const incTired = bridge.calculateEntryIncome(entryTired)
      expect(incEnergetic).toBeGreaterThan(incTired)
    })

    it('应应用内容长度加成', () => {
      const shortEntry = createTestLogEntry({ content: '短内容' })
      const longEntry = createTestLogEntry({
        content: '长内容'.repeat(100)
      })
      const shortIncome = bridge.calculateEntryIncome(shortEntry)
      const longIncome = bridge.calculateEntryIncome(longEntry)
      expect(longIncome).toBeGreaterThan(shortIncome)
    })

    it('内容过短应返回 0', () => {
      bridge.config.value.minContentLength = 100
      const shortEntry = createTestLogEntry({ content: '短' })
      expect(bridge.calculateEntryIncome(shortEntry)).toBe(0)
    })

    it('应应用标签加成', () => {
      const entryNoTags = createTestLogEntry({ tags: [] })
      const entryWithTags = createTestLogEntry({ tags: ['a', 'b', 'c', 'd'] })
      const noTagIncome = bridge.calculateEntryIncome(entryNoTags)
      const withTagIncome = bridge.calculateEntryIncome(entryWithTags)
      expect(withTagIncome).toBeGreaterThan(noTagIncome)
    })
  })

  describe('bridgeEntry', () => {
    it('应正确创建桥接映射', async () => {
      const entry = createTestLogEntry({ type: 'milestone', title: '重要里程碑' })
      entries.push(entry)

      const mapping = await bridge.bridgeEntry(entry)
      expect(mapping).not.toBeNull()
      expect(mapping!.worklogId).toBe(entry.id)
      expect(mapping!.amount).toBeGreaterThan(0)
      expect(rewardRecords.length).toBe(1)
      expect(rewardRecords[0].worklogId).toBe(entry.id)
    })

    it('禁用时不应桥接', async () => {
      bridge.config.value.enabled = false
      const entry = createTestLogEntry()
      entries.push(entry)

      const mapping = await bridge.bridgeEntry(entry)
      expect(mapping).toBeNull()
      expect(rewardRecords.length).toBe(0)
    })

    it('重复桥接应返回已有映射', async () => {
      const entry = createTestLogEntry()
      entries.push(entry)

      const m1 = await bridge.bridgeEntry(entry)
      const m2 = await bridge.bridgeEntry(entry)
      expect(m1).not.toBeNull()
      expect(m2).toStrictEqual(m1)
      expect(rewardRecords.length).toBe(1)
    })

    it('超过每日上限应跳过', async () => {
      bridge.config.value.dailyIncomeCap = 100
      const entry = createTestLogEntry({ type: 'milestone' })
      entries.push(entry)

      const mapping = await bridge.bridgeEntry(entry)
      expect(mapping).toBeNull()
    })
  })

  describe('bridgeAllUnmapped', () => {
    it('应批量桥接所有未映射日志', async () => {
      const e1 = createTestLogEntry({ type: 'journal' })
      const e2 = createTestLogEntry({ type: 'insight' })
      const e3 = createTestLogEntry({ type: 'review' })
      entries.push(e1, e2, e3)

      const result = await bridge.bridgeAllUnmapped()
      expect(result.bridged.length).toBeGreaterThanOrEqual(1)
      expect(rewardRecords.length).toBeGreaterThanOrEqual(1)
    })

    it('应跳过已映射日志', async () => {
      const e1 = createTestLogEntry({ type: 'journal' })
      entries.push(e1)

      await bridge.bridgeEntry(e1)
      const result = await bridge.bridgeAllUnmapped()
      expect(result.bridged.length).toBe(0)
    })
  })

  describe('isMapped / getMapping', () => {
    it('应正确检查映射状态', async () => {
      const entry = createTestLogEntry()
      entries.push(entry)

      expect(bridge.isMapped(entry.id)).toBe(false)
      await bridge.bridgeEntry(entry)
      expect(bridge.isMapped(entry.id)).toBe(true)
    })

    it('应正确获取映射记录', async () => {
      const entry = createTestLogEntry()
      entries.push(entry)
      await bridge.bridgeEntry(entry)

      const mapping = bridge.getMapping(entry.id)
      expect(mapping).toBeDefined()
      expect(mapping!.worklogId).toBe(entry.id)
    })
  })

  describe('unbridgeEntry', () => {
    it('应正确撤销桥接', async () => {
      const entry = createTestLogEntry()
      entries.push(entry)
      await bridge.bridgeEntry(entry)
      expect(bridge.isMapped(entry.id)).toBe(true)

      const result = await bridge.unbridgeEntry(entry.id)
      expect(result).toBe(true)
      expect(bridge.isMapped(entry.id)).toBe(false)
    })

    it('撤销不存在的映射应返回 false', async () => {
      const result = await bridge.unbridgeEntry('nonexistent')
      expect(result).toBe(false)
    })
  })

  describe('estimateEntryIncome', () => {
    it('应正确预估收入而不创建记录', () => {
      const entry = createTestLogEntry({ type: 'milestone', mood: 'energetic' })
      const estimate = bridge.estimateEntryIncome(entry)
      expect(estimate).not.toBeNull()
      expect(estimate!.breakdown.baseRate).toBe(200)
      expect(estimate!.breakdown.moodMultiplier).toBe(1.5)
      expect(estimate!.category).toBe('freelance')
      expect(rewardRecords.length).toBe(0)
    })
  })

  describe('estimateBatchIncome', () => {
    it('应正确预估批量收入', () => {
      const e1 = createTestLogEntry({ type: 'milestone', id: 'e1' })
      const e2 = createTestLogEntry({ type: 'insight', id: 'e2' })
      const e3 = createTestLogEntry({ type: 'journal', id: 'e3' })

      const result = bridge.estimateBatchIncome([e1, e2, e3])
      expect(result.count).toBe(3)
      expect(result.total).toBeGreaterThan(0)
      expect(result.details.length).toBe(3)
      expect(result.details[0].worklogId).toBe('e1')
    })
  })

  describe('bridgeStats', () => {
    it('应正确统计桥接数据', async () => {
      const entry = createTestLogEntry({ type: 'milestone' })
      entries.push(entry)
      await bridge.bridgeEntry(entry)

      const stats = bridge.bridgeStats.value
      expect(stats.totalMappings).toBe(1)
      expect(stats.totalIncome).toBeGreaterThan(0)
      expect(stats.todayMappings).toBe(1)
    })
  })

  describe('配置管理', () => {
    it('应正确更新配置', () => {
      bridge.updateConfig({ dailyIncomeCap: 500, minContentLength: 50 })
      expect(bridge.config.value.dailyIncomeCap).toBe(500)
      expect(bridge.config.value.minContentLength).toBe(50)
      expect(bridge.config.value.enabled).toBe(DEFAULT_BRIDGE_CONFIG.enabled)
    })

    it('应正确重置配置', () => {
      bridge.updateConfig({ dailyIncomeCap: 9999 })
      bridge.resetConfig()
      expect(bridge.config.value.dailyIncomeCap).toBe(DEFAULT_BRIDGE_CONFIG.dailyIncomeCap)
    })
  })
})

// ============================================================
// 10. 常量验证
// ============================================================

describe('常量验证', () => {
  it('LOG_TYPE_TO_INCOME 应覆盖所有日志类型', () => {
    const logTypes: LogEntryType[] = ['reflection', 'plan', 'journal', 'insight', 'review', 'milestone']
    for (const type of logTypes) {
      expect(LOG_TYPE_TO_INCOME[type]).toBeDefined()
    }
  })

  it('MOOD_MULTIPLIER 应覆盖所有情绪', () => {
    const moods: MoodTone[] = ['energetic', 'calm', 'neutral', 'tired', 'frustrated', 'excited']
    for (const mood of moods) {
      expect(MOOD_MULTIPLIER[mood]).toBeDefined()
    }
  })

  it('DEFAULT_BRIDGE_CONFIG 应有合理默认值', () => {
    expect(DEFAULT_BRIDGE_CONFIG.enabled).toBe(true)
    expect(DEFAULT_BRIDGE_CONFIG.minContentLength).toBeGreaterThan(0)
    expect(DEFAULT_BRIDGE_CONFIG.dailyIncomeCap).toBeGreaterThan(0)
    expect(DEFAULT_BRIDGE_CONFIG.lengthBonusRate).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_BRIDGE_CONFIG.tagBonusRate).toBeGreaterThanOrEqual(0)
  })
})