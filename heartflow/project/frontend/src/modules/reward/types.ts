// ============================================================
// 劳酬 · 类型定义
// 酬劳里程碑 + 收支分析 + 预算管理
// ============================================================

/** 收支类型 */
export type RewardType = 'income' | 'expense'

/** 收入类别 */
export type IncomeCategory = 'salary' | 'freelance' | 'investment' | 'gift' | 'other-income'

/** 支出类别 */
export type ExpenseCategory = 'tools' | 'learning' | 'health' | 'social' | 'other-expense'

/** 记录条目 */
export interface RewardRecord {
  id: string
  type: RewardType
  category: IncomeCategory | ExpenseCategory
  amount: number
  description: string
  recordedAt: string
  /** 关联项目 */
  projectId?: string
  /** 关联工作日志 */
  worklogId?: string
}

/** 里程碑 */
export interface RewardMilestone {
  id: string
  title: string
  description: string
  /** 触发条件类型 */
  triggerType: 'income-total' | 'income-single' | 'savings-rate' | 'streak' | 'project-count'
  /** 触发阈值 */
  threshold: number
  /** 是否已达成 */
  achieved: boolean
  /** 达成时间 */
  achievedAt?: string
  /** 奖励描述 */
  reward: string
}

/** 预算 */
export interface Budget {
  id: string
  category: ExpenseCategory
  /** 月度预算金额 */
  monthlyLimit: number
  /** 当前月已用 */
  currentSpent: number
  /** 预算月份 */
  month: string
}

/** 收支统计 */
export interface RewardStats {
  totalIncome: number
  totalExpense: number
  netBalance: number
  recordCount: number
  /** 本月收入 */
  monthIncome: number
  /** 本月支出 */
  monthExpense: number
  /** 本月净结余 */
  monthBalance: number
  /** 储蓄率 */
  savingsRate: number
  /** 各收入类别分布 */
  incomeDistribution: Record<string, number>
  /** 各支出类别分布 */
  expenseDistribution: Record<string, number>
  /** 月度趋势 */
  monthlyTrend: { month: string; income: number; expense: number; balance: number }[]
  /** 生涯统计 */
  career: {
    totalIncome: number
    totalExpense: number
    totalBalance: number
    workingDays: number
    avgDailyIncome: number
    incomeExpenseRatio: number
  }
}

/** 存储键 */
export const REWARD_STORAGE_KEYS = {
  RECORDS: 'rewards',
  MILESTONES: 'hf:reward_milestones',
  BUDGETS: 'hf:reward_budgets',
} as const

/** 收入类别元数据 */
export const INCOME_CATEGORY_META: Record<IncomeCategory, { label: string; icon: string; color: string }> = {
  salary: { label: '薪资', icon: '💰', color: '#8a9a7a' },
  freelance: { label: '自由职业', icon: '✍️', color: '#6b9fc4' },
  investment: { label: '投资收益', icon: '📈', color: '#f0c040' },
  gift: { label: '赠予', icon: '🎁', color: '#d98c7a' },
  'other-income': { label: '其他', icon: '📋', color: '#94a3b8' },
}

/** 支出类别元数据 */
export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string }> = {
  tools: { label: '工具', icon: '🔧', color: '#e0a96d' },
  learning: { label: '学习', icon: '📚', color: '#6b9fc4' },
  health: { label: '健康', icon: '💊', color: '#8a9a7a' },
  social: { label: '社交', icon: '🤝', color: '#d98c7a' },
  'other-expense': { label: '其他', icon: '📋', color: '#94a3b8' },
}

/** 预设里程碑 */
export const DEFAULT_MILESTONES: RewardMilestone[] = [
  {
    id: 'ms-1',
    title: '第一桶金',
    description: '累计收入达到 10,000',
    triggerType: 'income-total',
    threshold: 10000,
    achieved: false,
    reward: '解锁"金匠"称号',
  },
  {
    id: 'ms-2',
    title: '储蓄达人',
    description: '月度储蓄率达到 50%',
    triggerType: 'savings-rate',
    threshold: 50,
    achieved: false,
    reward: '解锁"守财"水晶',
  },
  {
    id: 'ms-3',
    title: '稳定收入',
    description: '连续 3 个月有收入记录',
    triggerType: 'streak',
    threshold: 3,
    achieved: false,
    reward: '解锁"恒流"光效',
  },
  {
    id: 'ms-4',
    title: '大单降临',
    description: '单笔收入超过 5,000',
    triggerType: 'income-single',
    threshold: 5000,
    achieved: false,
    reward: '解锁"星落"粒子效果',
  },
  {
    id: 'ms-5',
    title: '多源收入',
    description: '同时有 3 种以上收入来源',
    triggerType: 'project-count',
    threshold: 3,
    achieved: false,
    reward: '解锁"百花"背景主题',
  },
]