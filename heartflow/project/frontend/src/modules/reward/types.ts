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
  /** 支出类别 id（INCR-23：可为内置键或用户自定义分类键） */
  category: string
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
  /* 记账 v2：多账户与转账 ledger */
  ACCOUNTS: 'hf:reward_accounts',
  TRANSFERS: 'hf:reward_transfers',
  /* INCR-22：周期/重复记账规则 */
  RECURRING: 'hf:reward_recurring',
  /* INCR-23：自定义分类（仅存用户新增/覆盖，内置种子隐式） */
  CUSTOM_CATEGORIES: 'hf:reward_custom_categories',
  /* INCR-25：借贷/往来记录（借出借入 + 还款/收债） */
  LOANS: 'hf:reward_loans',
  /* INCR-26：信用卡/负债账户（额度 + 已用/可用 + 还款计划 + 到期提醒） */
  CREDIT_CARDS: 'hf:reward_credit_cards',
  /* INCR-28：预算进阶（总/年度预算 + 日均动态 + 滚动结余 rollover 结转） */
  BUDGET_ADVANCE: 'hf:reward_budget_advance',
  /* INCR-30：存钱计划（攒钱 / 52周 / 心愿）+ 每笔存款明细 */
  SAVING_PLANS: 'hf:reward_saving_plans',
  /* INCR-30：每日记账提醒（开关 + 时间）*/
  DAILY_REMINDER: 'hf:reward_daily_reminder',
  /* INCR-31：隐私锁（主密码指纹，仅存哈希+盐） */
  PRIVACY_LOCK: 'hf:reward_privacy_lock',
  /* INCR-31：数据加密（加密账本备份快照） */
  ENCRYPTED_BACKUP: 'hf:reward_encrypted_backup',
  /* INCR-31：多币种/汇率配置（基准币种 + 汇率表） */
  CURRENCY_CONFIG: 'hf:reward_currency_config',
  /* INCR-31：投资持仓（股票/基金/加密/其他） */
  HOLDINGS: 'hf:reward_holdings',
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