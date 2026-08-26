// ============================================================
// 劳酬 · 财务分析与高级筛选
// 蓝图要求：分类筛选分页 + 周期性收支 + 图表数据接口
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { RewardRecord, RewardType, IncomeCategory, ExpenseCategory } from './types'

// ---- 筛选类型 ----

export type SortField = 'amount' | 'recordedAt' | 'category'
export type SortOrder = 'asc' | 'desc'

export interface FinanceFilter {
  /** 关键词搜索 */
  keyword: string
  /** 收支类型 */
  types: RewardType[]
  /** 收入类别 */
  incomeCategories: IncomeCategory[]
  /** 支出类别 */
  expenseCategories: ExpenseCategory[]
  /** 金额范围 */
  amountRange: { min: number; max: number } | null
  /** 日期范围 */
  dateRange: { start: string; end: string } | null
  /** 关联项目 */
  projectId: string | null
  /** 关联工作日志 */
  worklogId: string | null
}

export interface PaginationConfig {
  page: number
  pageSize: number
  sortField: SortField
  sortOrder: SortOrder
}

export interface FilteredResult {
  records: RewardRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

// ---- 周期性收支类型 ----

export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface PeriodicRecord {
  period: string
  income: number
  expense: number
  balance: number
  recordCount: number
  incomeCategories: Record<string, number>
  expenseCategories: Record<string, number>
}

export interface PeriodicAnalysis {
  periods: PeriodicRecord[]
  totalIncome: number
  totalExpense: number
  totalBalance: number
  averageIncome: number
  averageExpense: number
  bestPeriod: PeriodicRecord | null
  worstPeriod: PeriodicRecord | null
  trend: 'up' | 'down' | 'stable'
}

// ---- 图表数据接口 ----

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  secondaryValue?: number
}

export interface CategoryChartData {
  categories: ChartDataPoint[]
  total: number
}

export interface TrendChartData {
  series: {
    name: string
    data: ChartDataPoint[]
  }[]
  xLabels: string[]
}

export interface BudgetChartData {
  categories: {
    name: string
    label: string
    budget: number
    spent: number
    remaining: number
    percentage: number
    color: string
  }[]
  totalBudget: number
  totalSpent: number
  totalRemaining: number
}

// ---- 默认配置 ----

export const DEFAULT_FILTER: FinanceFilter = {
  keyword: '',
  types: [],
  incomeCategories: [],
  expenseCategories: [],
  amountRange: null,
  dateRange: null,
  projectId: null,
  worklogId: null,
}

export const DEFAULT_PAGINATION: PaginationConfig = {
  page: 1,
  pageSize: 20,
  sortField: 'recordedAt',
  sortOrder: 'desc',
}

// ---- 存储键 ----

const FILTER_PRESETS_KEY = 'hf:reward_filter_presets'

export interface FilterPreset {
  id: string
  name: string
  filter: FinanceFilter
  createdAt: string
}

// ============================================================
// 高级筛选与分页
// ============================================================

export function useFinanceFilter(getRecords: () => RewardRecord[]) {
  const filter = ref<FinanceFilter>({ ...DEFAULT_FILTER })
  const pagination = ref<PaginationConfig>({ ...DEFAULT_PAGINATION })
  const presets = ref<FilterPreset[]>(loadPresets())

  function loadPresets(): FilterPreset[] {
    return storage.getKV<FilterPreset[]>(FILTER_PRESETS_KEY, [])
  }

  function savePresets() {
    storage.setKV(FILTER_PRESETS_KEY, presets.value)
  }

  /** 应用过滤条件 */
  function applyFilter(): FilteredResult {
    const records = getRecords()
    let filtered = [...records]

    const f = filter.value

    // 关键词搜索
    if (f.keyword.trim()) {
      const kw = f.keyword.toLowerCase()
      filtered = filtered.filter(r =>
        r.description.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw),
      )
    }

    // 收支类型过滤
    if (f.types.length > 0) {
      filtered = filtered.filter(r => f.types.includes(r.type))
    }

    // 收入类别过滤
    if (f.incomeCategories.length > 0) {
      filtered = filtered.filter(r =>
        r.type === 'income' && f.incomeCategories.includes(r.category as IncomeCategory),
      )
    }

    // 支出类别过滤
    if (f.expenseCategories.length > 0) {
      filtered = filtered.filter(r =>
        r.type === 'expense' && f.expenseCategories.includes(r.category as ExpenseCategory),
      )
    }

    // 金额范围
    if (f.amountRange) {
      filtered = filtered.filter(r =>
        r.amount >= f.amountRange!.min && r.amount <= f.amountRange!.max,
      )
    }

    // 日期范围
    if (f.dateRange) {
      const start = new Date(f.dateRange.start).getTime()
      const end = new Date(f.dateRange.end).getTime() + 86400000
      filtered = filtered.filter(r => {
        const t = new Date(r.recordedAt).getTime()
        return t >= start && t < end
      })
    }

    // 项目过滤
    if (f.projectId) {
      filtered = filtered.filter(r => r.projectId === f.projectId)
    }

    // 工作日志过滤
    if (f.worklogId) {
      filtered = filtered.filter(r => r.worklogId === f.worklogId)
    }

    // 排序
    const { sortField, sortOrder } = pagination.value
    filtered.sort((a, b) => {
      let cmp = 0
      if (sortField === 'amount') {
        cmp = a.amount - b.amount
      } else if (sortField === 'category') {
        cmp = a.category.localeCompare(b.category)
      } else {
        cmp = new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

    // 分页
    const total = filtered.length
    const { page, pageSize } = pagination.value
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    const start = (page - 1) * pageSize
    const paged = filtered.slice(start, start + pageSize)

    return {
      records: paged,
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    }
  }

  /** 重置过滤 */
  function resetFilter(): void {
    filter.value = { ...DEFAULT_FILTER }
    pagination.value = { ...DEFAULT_PAGINATION }
  }

  /** 保存过滤预设 */
  function savePreset(name: string): FilterPreset {
    const preset: FilterPreset = {
      id: `preset_${Date.now()}`,
      name,
      filter: { ...filter.value },
      createdAt: new Date().toISOString(),
    }
    presets.value.push(preset)
    savePresets()
    return preset
  }

  /** 应用预设 */
  function applyPreset(presetId: string): boolean {
    const preset = presets.value.find(p => p.id === presetId)
    if (!preset) return false
    filter.value = { ...preset.filter }
    return true
  }

  /** 删除预设 */
  function deletePreset(presetId: string): void {
    presets.value = presets.value.filter(p => p.id !== presetId)
    savePresets()
  }

  return {
    filter,
    pagination,
    presets,
    applyFilter,
    resetFilter,
    savePreset,
    applyPreset,
    deletePreset,
  }
}

// ============================================================
// 周期性收支分析
// ============================================================

export function usePeriodicAnalysis(getRecords: () => RewardRecord[]) {
  const periodType = ref<PeriodType>('monthly')
  const analysis = ref<PeriodicAnalysis | null>(null)

  /** 获取周期的 key */
  function getPeriodKey(date: Date, type: PeriodType): string {
    const iso = date.toISOString()
    switch (type) {
      case 'daily': return iso.slice(0, 10)
      case 'weekly': {
        const d = new Date(date)
        const day = d.getDay()
        const diff = d.getDate() - day + (day === 0 ? -6 : 1)
        const monday = new Date(d.setDate(diff))
        return monday.toISOString().slice(0, 10)
      }
      case 'monthly': return iso.slice(0, 7)
      case 'quarterly': {
        const q = Math.floor(date.getMonth() / 3) + 1
        return `${date.getFullYear()}-Q${q}`
      }
      case 'yearly': return `${date.getFullYear()}`
    }
  }

  /** 计算周期性分析 */
  function computeAnalysis(type: PeriodType = 'monthly'): PeriodicAnalysis {
    const records = getRecords()
    periodType.value = type

    const periodMap = new Map<string, { income: number; expense: number; count: number; incomeCats: Record<string, number>; expenseCats: Record<string, number> }>()

    for (const record of records) {
      const key = getPeriodKey(new Date(record.recordedAt), type)
      if (!periodMap.has(key)) {
        periodMap.set(key, { income: 0, expense: 0, count: 0, incomeCats: {}, expenseCats: {} })
      }
      const p = periodMap.get(key)!

      if (record.type === 'income') {
        p.income += record.amount
        p.incomeCats[record.category] = (p.incomeCats[record.category] || 0) + record.amount
      } else {
        p.expense += record.amount
        p.expenseCats[record.category] = (p.expenseCats[record.category] || 0) + record.amount
      }
      p.count++
    }

    const periods: PeriodicRecord[] = []
    let totalIncome = 0
    let totalExpense = 0

    for (const [period, data] of periodMap) {
      periods.push({
        period,
        income: data.income,
        expense: data.expense,
        balance: data.income - data.expense,
        recordCount: data.count,
        incomeCategories: data.incomeCats,
        expenseCategories: data.expenseCats,
      })
      totalIncome += data.income
      totalExpense += data.expense
    }

    periods.sort((a, b) => a.period.localeCompare(b.period))

    // 趋势判断
    let trend: 'up' | 'down' | 'stable' = 'stable'
    if (periods.length >= 2) {
      const firstHalf = periods.slice(0, Math.floor(periods.length / 2))
      const secondHalf = periods.slice(Math.floor(periods.length / 2))
      const firstAvg = firstHalf.reduce((s, p) => s + p.balance, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, p) => s + p.balance, 0) / secondHalf.length
      const change = secondAvg - firstAvg
      const threshold = Math.abs(firstAvg) * 0.1
      if (change > threshold) trend = 'up'
      else if (change < -threshold) trend = 'down'
    }

    let bestPeriod: PeriodicRecord | null = null
    let worstPeriod: PeriodicRecord | null = null
    let maxBalance = -Infinity
    let minBalance = Infinity

    for (const p of periods) {
      if (p.balance > maxBalance) {
        maxBalance = p.balance
        bestPeriod = p
      }
      if (p.balance < minBalance) {
        minBalance = p.balance
        worstPeriod = p
      }
    }

    const result: PeriodicAnalysis = {
      periods,
      totalIncome,
      totalExpense,
      totalBalance: totalIncome - totalExpense,
      averageIncome: periods.length > 0 ? totalIncome / periods.length : 0,
      averageExpense: periods.length > 0 ? totalExpense / periods.length : 0,
      bestPeriod,
      worstPeriod,
      trend,
    }

    analysis.value = result
    return result
  }

  return {
    periodType,
    analysis,
    computeAnalysis,
  }
}

// ============================================================
// 图表数据接口
// ============================================================

/** 收入类别颜色 */
const INCOME_COLORS: Record<string, string> = {
  salary: '#8a9a7a',
  freelance: '#6b9fc4',
  investment: '#f0c040',
  gift: '#d98c7a',
  'other-income': '#94a3b8',
}

/** 支出类别颜色 */
const EXPENSE_COLORS: Record<string, string> = {
  tools: '#e0a96d',
  learning: '#6b9fc4',
  health: '#8a9a7a',
  social: '#d98c7a',
  'other-expense': '#94a3b8',
}

export function useChartData(getRecords: () => RewardRecord[]) {
  /**
   * 获取收入类别分布（饼图/环形图数据）
   */
  function getIncomeCategoryChart(): CategoryChartData {
    const records = getRecords().filter(r => r.type === 'income')
    const categories: Record<string, number> = {}
    let total = 0

    for (const r of records) {
      categories[r.category] = (categories[r.category] || 0) + r.amount
      total += r.amount
    }

    const data: ChartDataPoint[] = Object.entries(categories)
      .map(([cat, value]) => ({
        label: cat,
        value,
        color: INCOME_COLORS[cat] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value)

    return { categories: data, total }
  }

  /**
   * 获取支出类别分布（饼图/环形图数据）
   */
  function getExpenseCategoryChart(): CategoryChartData {
    const records = getRecords().filter(r => r.type === 'expense')
    const categories: Record<string, number> = {}
    let total = 0

    for (const r of records) {
      categories[r.category] = (categories[r.category] || 0) + r.amount
      total += r.amount
    }

    const data: ChartDataPoint[] = Object.entries(categories)
      .map(([cat, value]) => ({
        label: cat,
        value,
        color: EXPENSE_COLORS[cat] || '#94a3b8',
      }))
      .sort((a, b) => b.value - a.value)

    return { categories: data, total }
  }

  /**
   * 获取月度收支趋势（折线图/柱状图数据）
   */
  function getMonthlyTrendChart(months: number = 12): TrendChartData {
    const records = getRecords()
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1)

    const filtered = records.filter(r => {
      const d = new Date(r.recordedAt)
      return d >= startDate
    })

    const monthMap = new Map<string, { income: number; expense: number }>()

    // 生成所有月份
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, { income: 0, expense: 0 })
    }

    for (const r of filtered) {
      const key = r.recordedAt.slice(0, 7)
      const existing = monthMap.get(key)
      if (existing) {
        if (r.type === 'income') existing.income += r.amount
        else existing.expense += r.amount
      }
    }

    const sortedKeys = [...monthMap.keys()].sort()
    const incomeData: ChartDataPoint[] = []
    const expenseData: ChartDataPoint[] = []

    for (const key of sortedKeys) {
      const data = monthMap.get(key)!
      const [_year, month] = key.split('-')
      const label = `${parseInt(month)}月`
      incomeData.push({ label, value: data.income, color: '#8a9a7a' })
      expenseData.push({ label, value: data.expense, color: '#d98c7a' })
    }

    return {
      series: [
        { name: '收入', data: incomeData },
        { name: '支出', data: expenseData },
      ],
      xLabels: sortedKeys.map(k => {
        const [, m] = k.split('-')
        return `${parseInt(m)}月`
      }),
    }
  }

  /**
   * 获取预算执行情况（进度条/仪表盘数据）
   */
  function getBudgetChart(): BudgetChartData {
    const records = getRecords()
    const now = new Date()
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // 默认预算
    const defaultBudgets: Record<string, number> = {
      tools: 500,
      learning: 1000,
      health: 800,
      social: 600,
      'other-expense': 400,
    }

    const spent: Record<string, number> = {}

    for (const r of records) {
      if (r.type === 'expense' && r.recordedAt.startsWith(currentMonth)) {
        spent[r.category] = (spent[r.category] || 0) + r.amount
      }
    }

    const categories = Object.entries(defaultBudgets).map(([cat, budget]) => {
      const spentAmount = spent[cat] || 0
      const remaining = budget - spentAmount
      const percentage = Math.min(100, Math.round((spentAmount / budget) * 100))

      return {
        name: cat,
        label: cat,
        budget,
        spent: spentAmount,
        remaining,
        percentage,
        color: EXPENSE_COLORS[cat] || '#94a3b8',
      }
    })

    const totalBudget = categories.reduce((s, c) => s + c.budget, 0)
    const totalSpent = categories.reduce((s, c) => s + c.spent, 0)

    return {
      categories,
      totalBudget,
      totalSpent,
      totalRemaining: totalBudget - totalSpent,
    }
  }

  /**
   * 获取收支对比（对比图数据）
   */
  function getIncomeExpenseComparison(): {
    income: number
    expense: number
    ratio: number
    balance: number
  } {
    const records = getRecords()
    let income = 0
    let expense = 0

    for (const r of records) {
      if (r.type === 'income') income += r.amount
      else expense += r.amount
    }

    return {
      income,
      expense,
      ratio: expense > 0 ? Math.round((income / expense) * 100) / 100 : 0,
      balance: income - expense,
    }
  }

  return {
    getIncomeCategoryChart,
    getExpenseCategoryChart,
    getMonthlyTrendChart,
    getBudgetChart,
    getIncomeExpenseComparison,
  }
}

// ---- 存储键 ----

export const FINANCE_ANALYSIS_STORAGE_KEYS = {
  FILTER_PRESETS: 'hf:reward_filter_presets',
  PERIODIC_CACHE: 'hf:reward_periodic_cache',
} as const