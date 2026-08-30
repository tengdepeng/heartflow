// ============================================================
// 劳酬 · P20-2 · 单元测试
// 预算优化器 + 财务预测 + 视图桥接层
// ============================================================

import { describe, expect, it, beforeEach } from 'vitest'
import { useBudgetOptimizer } from '../budget-optimizer'
import { useFinancialForecast } from '../financial-forecast'
import { useRewardBridge } from '../reward-bridge'
import type { RewardRecord, Budget, RewardStats } from '../types'
import type { IncomeCategory, ExpenseCategory } from '../types'

// ============================================================
// 测试辅助函数
// ============================================================

function makeRecord(overrides: Partial<RewardRecord> = {}): RewardRecord {
  return {
    id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'income',
    category: 'freelance' as IncomeCategory,
    amount: 1000,
    description: '测试',
    recordedAt: new Date().toISOString(),
    ...overrides,
  }
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000)
  return d.toISOString()
}

/** 固定到 m 个月前、同月第 day 日（避免 daysAgo 跨月碰撞，保证落在不同月份分桶） */
function monthsAgo(m: number, day: number): string {
  const d = new Date()
  d.setDate(1)
  d.setMonth(d.getMonth() - m)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return d.toISOString()
}

function makeBasicStats(overrides: Partial<RewardStats> = {}): RewardStats {
  return {
    totalIncome: 10000,
    totalExpense: 4000,
    netBalance: 6000,
    recordCount: 10,
    monthIncome: 5000,
    monthExpense: 2000,
    monthBalance: 3000,
    savingsRate: 60,
    incomeDistribution: { freelance: 6000, salary: 4000 },
    expenseDistribution: { tools: 1500, learning: 1000, health: 500, social: 500, 'other-expense': 500 },
    monthlyTrend: [
      { month: '2026-07', income: 5000, expense: 2000, balance: 3000 },
      { month: '2026-08', income: 5000, expense: 2000, balance: 3000 },
    ],
    career: {
      totalIncome: 10000,
      totalExpense: 4000,
      totalBalance: 6000,
      workingDays: 20,
      avgDailyIncome: 500,
      incomeExpenseRatio: 2.5,
    },
    ...overrides,
  }
}

// ============================================================
// 1. useBudgetOptimizer — 预算优化引擎
// ============================================================

describe('useBudgetOptimizer', () => {
  let optimizer: ReturnType<typeof useBudgetOptimizer>
  let records: RewardRecord[]

  beforeEach(() => {
    optimizer = useBudgetOptimizer()
    records = [
      makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 300 }),
      makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 200 }),
      makeRecord({ type: 'expense', category: 'learning' as ExpenseCategory, amount: 500 }),
      makeRecord({ type: 'expense', category: 'health' as ExpenseCategory, amount: 200 }),
      makeRecord({ type: 'expense', category: 'social' as ExpenseCategory, amount: 400 }),
      makeRecord({ type: 'expense', category: 'other-expense' as ExpenseCategory, amount: 100 }),
      makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 5000 }),
    ]
  })

  describe('calculateAllocations', () => {
    it('应该计算预算分配建议', () => {
      const allocations = optimizer.calculateAllocations(records, 5000)
      expect(allocations.length).toBe(5)
      expect(allocations[0].category).toBeDefined()
      expect(allocations[0].suggestedAmount).toBeGreaterThan(0)
      expect(allocations[0].percentage).toBeGreaterThan(0)
      expect(allocations[0].label).toBeTruthy()
    })

    it('应该支持指定预算模板', () => {
      const allocations = optimizer.calculateAllocations(records, 5000, 'template-frugal')
      expect(allocations.length).toBe(5)
      // 极简模板 social 占比 5%
      const social = allocations.find(a => a.category === 'social')
      expect(social).toBeDefined()
      expect(social!.percentage).toBe(5)
    })

    it('应该根据上月支出给出调整建议', () => {
      const allocations = optimizer.calculateAllocations(records, 3000)
      for (const alloc of allocations) {
        expect(['increase', 'decrease', 'maintain']).toContain(alloc.adjustment)
        expect(typeof alloc.reason).toBe('string')
      }
    })
  })

  describe('detectOverspends', () => {
    it('应该检测超支情况', () => {
      const budgets: Budget[] = [
        { id: 'b1', category: 'tools' as ExpenseCategory, monthlyLimit: 200, currentSpent: 0, month: '2026-08' },
        { id: 'b2', category: 'learning' as ExpenseCategory, monthlyLimit: 1000, currentSpent: 0, month: '2026-08' },
      ]
      const alerts = optimizer.detectOverspends(records, budgets)
      // tools 超支（500 > 200），应该触发 critical
      const toolAlert = alerts.find(a => a.category === 'tools')
      expect(toolAlert).toBeDefined()
      expect(toolAlert!.severity).toBe('critical')
    })

    it('预算充足的类别不应触发预警', () => {
      const budgets: Budget[] = [
        { id: 'b1', category: 'learning' as ExpenseCategory, monthlyLimit: 100000, currentSpent: 0, month: '2026-08' },
      ]
      const alerts = optimizer.detectOverspends(records, budgets)
      expect(alerts.length).toBe(0)
    })
  })

  describe('generateSavingsStrategy', () => {
    it('应该生成储蓄策略', () => {
      const stats = makeBasicStats()
      const strategy = optimizer.generateSavingsStrategy(records, stats)
      expect(strategy.id).toMatch(/^strategy_/)
      expect(strategy.name).toBeTruthy()
      expect(strategy.description).toBeTruthy()
      expect(strategy.steps.length).toBe(5)
      expect(strategy.monthlySavable).toBeGreaterThanOrEqual(0)
      expect(strategy.annualProjection).toBeGreaterThanOrEqual(0)
      expect(['easy', 'moderate', 'challenging']).toContain(strategy.difficulty)
    })

    it('低储蓄率应生成更具挑战性的策略', () => {
      const stats = makeBasicStats({ totalIncome: 10000, totalExpense: 9800, savingsRate: 2 })
      const strategy = optimizer.generateSavingsStrategy(records, stats)
      expect(strategy.difficulty).toBe('challenging')
    })
  })

  describe('generateReport', () => {
    it('应该生成完整的预算优化报告', () => {
      const stats = makeBasicStats()
      const budgets: Budget[] = [
        { id: 'b1', category: 'tools' as ExpenseCategory, monthlyLimit: 1000, currentSpent: 0, month: '2026-08' },
      ]
      const report = optimizer.generateReport(records, stats, budgets, 5000)
      expect(report.id).toMatch(/^opt_/)
      expect(report.totalBudget).toBe(5000)
      expect(report.allocations.length).toBe(5)
      expect(report.alerts.length).toBeGreaterThanOrEqual(0)
      expect(report.savingsStrategy).toBeDefined()
      expect(report.overallScore).toBeGreaterThanOrEqual(0)
      expect(report.overallScore).toBeLessThanOrEqual(100)
      expect(report.summary).toBeTruthy()
      expect(report.generatedAt).toBeTruthy()
    })
  })

  describe('getBudgetTemplates', () => {
    it('应该返回所有预算模板', () => {
      const templates = optimizer.getBudgetTemplates()
      expect(templates.length).toBeGreaterThanOrEqual(4)
      expect(templates[0].id).toBeTruthy()
      expect(templates[0].name).toBeTruthy()
    })
  })

  describe('getBudgetTemplateById', () => {
    it('应该根据 ID 返回模板', () => {
      const template = optimizer.getBudgetTemplateById('template-50-30-20')
      expect(template).toBeDefined()
      expect(template!.name).toBe('50/30/20 法则')
    })

    it('不存在的模板应返回 undefined', () => {
      const template = optimizer.getBudgetTemplateById('nonexistent')
      expect(template).toBeUndefined()
    })
  })
})

// ============================================================
// 2. useFinancialForecast — 财务预测引擎
// ============================================================

describe('useFinancialForecast', () => {
  let forecast: ReturnType<typeof useFinancialForecast>
  let records: RewardRecord[]

  beforeEach(() => {
    forecast = useFinancialForecast()
    records = [
      // 过去3个月的数据（固定月位，保证 3 个独立月份分桶）
      makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 4000, recordedAt: monthsAgo(2, 15) }),
      makeRecord({ type: 'income', category: 'salary' as IncomeCategory, amount: 5000, recordedAt: monthsAgo(2, 15) }),
      makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 500, recordedAt: monthsAgo(2, 15) }),
      makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 4500, recordedAt: monthsAgo(1, 15) }),
      makeRecord({ type: 'income', category: 'salary' as IncomeCategory, amount: 5000, recordedAt: monthsAgo(1, 15) }),
      makeRecord({ type: 'expense', category: 'learning' as ExpenseCategory, amount: 300, recordedAt: monthsAgo(1, 15) }),
      makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 5000, recordedAt: daysAgo(0) }),
      makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 400, recordedAt: daysAgo(0) }),
      makeRecord({ type: 'expense', category: 'health' as ExpenseCategory, amount: 200, recordedAt: daysAgo(0) }),
    ]
  })

  describe('predictFinances', () => {
    it('应该预测未来财务状况', () => {
      const result = forecast.predictFinances(records, 3)
      expect(result.period.start).toBeTruthy()
      expect(result.period.end).toBeTruthy()
      expect(result.dataPoints.length).toBe(3)
      expect(result.dataPoints[0].predictedIncome).toBeGreaterThanOrEqual(0)
      expect(result.dataPoints[0].predictedExpense).toBeGreaterThanOrEqual(0)
      expect(result.totalPredictedNet).toBeDefined()
      expect(result.avgMonthlyIncome).toBeGreaterThan(0)
      expect(['rising', 'falling', 'stable']).toContain(result.incomeTrend)
      expect(['rising', 'falling', 'stable']).toContain(result.expenseTrend)
      expect(result.overallConfidence).toBeGreaterThan(0)
    })

    it('预测数据点应包含置信区间', () => {
      const result = forecast.predictFinances(records, 2)
      for (const point of result.dataPoints) {
        expect(point.lowerBound).toBeDefined()
        expect(point.upperBound).toBeDefined()
        expect(point.upperBound).toBeGreaterThanOrEqual(point.lowerBound)
        expect(point.confidence).toBeGreaterThan(0)
      }
    })

    it('记录不足时应仍能预测', () => {
      const shortRecords = [makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 1000 })]
      const result = forecast.predictFinances(shortRecords, 1)
      expect(result.dataPoints.length).toBe(1)
    })
  })

  describe('checkFinanceHealth', () => {
    it('应该执行财务健康检查', () => {
      const stats = makeBasicStats()
      const result = forecast.checkFinanceHealth(records, stats)
      expect(result.overallScore).toBeGreaterThanOrEqual(0)
      expect(result.overallScore).toBeLessThanOrEqual(100)
      expect(result.details.length).toBe(4)
      expect(result.details[0].dimension).toBeTruthy()
      expect(result.details[0].score).toBeGreaterThanOrEqual(0)
      expect(result.details[0].weight).toBeGreaterThan(0)
      expect(['excellent', 'good', 'fair', 'poor']).toContain(result.grade)
      expect(result.findings.length).toBeGreaterThanOrEqual(0)
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0)
    })

    it('高储蓄率应获得优秀评级', () => {
      // 使用高收入低支出的记录，以获得优秀评级
      const highSaveRecords: RewardRecord[] = [
        makeRecord({ type: 'income', category: 'salary' as IncomeCategory, amount: 10000, recordedAt: daysAgo(0) }),
        makeRecord({ type: 'income', category: 'salary' as IncomeCategory, amount: 10000, recordedAt: daysAgo(30) }),
        makeRecord({ type: 'income', category: 'salary' as IncomeCategory, amount: 10000, recordedAt: daysAgo(60) }),
        makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 500, recordedAt: daysAgo(0) }),
        makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 500, recordedAt: daysAgo(30) }),
        makeRecord({ type: 'expense', category: 'tools' as ExpenseCategory, amount: 500, recordedAt: daysAgo(60) }),
      ]
      const stats = makeBasicStats({ totalIncome: 30000, totalExpense: 1500, savingsRate: 95 })
      const result = forecast.checkFinanceHealth(highSaveRecords, stats)
      expect(result.grade).toBe('excellent')
    })
  })

  describe('analyzeIncomeSources', () => {
    it('应该分析收入来源', () => {
      const result = forecast.analyzeIncomeSources(records)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0].category).toBeDefined()
      expect(result[0].totalAmount).toBeGreaterThan(0)
      expect(result[0].percentage).toBeGreaterThan(0)
      expect(result[0].stability).toBeGreaterThanOrEqual(0)
      expect(result[0].stability).toBeLessThanOrEqual(1)
      expect(['rising', 'falling', 'stable']).toContain(result[0].trend)
    })

    it('应按金额降序排列', () => {
      const result = forecast.analyzeIncomeSources(records)
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].totalAmount).toBeGreaterThanOrEqual(result[i].totalAmount)
      }
    })
  })
})

// ============================================================
// 3. useRewardBridge — 视图桥接层
// ============================================================

describe('useRewardBridge', () => {
  let bridge: ReturnType<typeof useRewardBridge>

  beforeEach(() => {
    bridge = useRewardBridge()
  })

  describe('addRecord', () => {
    it('应该创建收入记录', () => {
      const record = bridge.addRecord({
        type: 'income',
        category: 'freelance' as IncomeCategory,
        amount: 1000,
        description: '测试收入',
      })
      expect(record.type).toBe('income')
      expect(record.amount).toBe(1000)
      expect(record.id).toMatch(/^rw_/)
      expect(record.recordedAt).toBeTruthy()
    })

    it('应该创建支出记录', () => {
      const record = bridge.addRecord({
        type: 'expense',
        category: 'tools' as ExpenseCategory,
        amount: 500,
        description: '购买工具',
      })
      expect(record.type).toBe('expense')
      expect(record.amount).toBe(500)
    })

    it('应该支持关联项目和工作日志', () => {
      const record = bridge.addRecord({
        type: 'income',
        category: 'freelance' as IncomeCategory,
        amount: 1000,
        description: '关联',
        projectId: 'p1',
        worklogId: 'w1',
      })
      expect(record.projectId).toBe('p1')
      expect(record.worklogId).toBe('w1')
    })
  })

  describe('quickStats', () => {
    it('应该返回快捷统计', () => {
      const stats = bridge.quickStats.value
      expect(typeof stats.monthlyIncome).toBe('number')
      expect(typeof stats.monthlyExpense).toBe('number')
      expect(typeof stats.monthlyNet).toBe('number')
      expect(typeof stats.savingsRate).toBe('number')
      expect(typeof stats.achievedMilestones).toBe('number')
      expect(typeof stats.totalMilestones).toBe('number')
      expect(Array.isArray(stats.recentRecords)).toBe(true)
    })
  })

  describe('bridgeState', () => {
    it('应该返回完整桥接状态', () => {
      const state = bridge.bridgeState.value
      expect(Array.isArray(state.records)).toBe(true)
      expect(state.stats).toBeDefined()
      expect(Array.isArray(state.milestones)).toBe(true)
      expect(state.overspendAlerts).toBeDefined()
      expect(state.incomeAnalysis).toBeDefined()
    })
  })

  describe('initialize', () => {
    it('应该支持初始化', () => {
      const existingRecords: RewardRecord[] = [
        makeRecord({ type: 'income', category: 'freelance' as IncomeCategory, amount: 1000 }),
      ]
      // 不应抛出异常
      expect(() => bridge.initialize(existingRecords)).not.toThrow()
    })

    it('空数组初始化不应抛出异常', () => {
      expect(() => bridge.initialize([])).not.toThrow()
    })
  })

  describe('子模块访问', () => {
    it('应该暴露 milestones 子模块', () => {
      expect(bridge.milestones).toBeDefined()
      expect(typeof bridge.milestones.addRecord).toBe('function')
    })

    it('应该暴露 budgetOptimizer 子模块', () => {
      expect(bridge.budgetOptimizer).toBeDefined()
      expect(typeof bridge.budgetOptimizer.calculateAllocations).toBe('function')
    })

    it('应该暴露 forecast 子模块', () => {
      expect(bridge.forecast).toBeDefined()
      expect(typeof bridge.forecast.predictFinances).toBe('function')
    })

    it('应该暴露 financeFilter 子模块', () => {
      expect(bridge.financeFilter).toBeDefined()
      expect(typeof bridge.financeFilter.applyFilter).toBe('function')
    })

    it('应该暴露 chartData 子模块', () => {
      expect(bridge.chartData).toBeDefined()
      expect(typeof bridge.chartData.getIncomeCategoryChart).toBe('function')
    })
  })
})

// ============================================================
// 4. 常量验证
// ============================================================

describe('P20-2 常量验证', () => {
  it('预算优化器应正确导出', () => {
    const optimizer = useBudgetOptimizer()
    expect(optimizer).toBeDefined()
    expect(typeof optimizer.calculateAllocations).toBe('function')
    expect(typeof optimizer.detectOverspends).toBe('function')
    expect(typeof optimizer.generateSavingsStrategy).toBe('function')
    expect(typeof optimizer.generateReport).toBe('function')
    expect(typeof optimizer.getBudgetTemplates).toBe('function')
    expect(typeof optimizer.getBudgetTemplateById).toBe('function')
  })

  it('财务预测引擎应正确导出', () => {
    const forecast = useFinancialForecast()
    expect(forecast).toBeDefined()
    expect(typeof forecast.predictFinances).toBe('function')
    expect(typeof forecast.checkFinanceHealth).toBe('function')
    expect(typeof forecast.analyzeIncomeSources).toBe('function')
  })

  it('视图桥接层应正确导出', () => {
    const bridge = useRewardBridge()
    expect(bridge).toBeDefined()
    expect(typeof bridge.addRecord).toBe('function')
    expect(typeof bridge.initialize).toBe('function')
    expect(typeof bridge.refreshAll).toBe('function')
    expect(bridge.quickStats).toBeDefined()
    expect(bridge.bridgeState).toBeDefined()
  })
})