// ============================================================
// 劳酬 · 月结单：月度收支汇总 + Markdown/CSV 导出字符串
// ============================================================
import type { RewardRecord } from './reward-list'

export interface MonthStatement {
  month: string
  income: number
  expense: number
  balance: number
  count: number
  categoryTop: { category: string; amount: number }[]
  incomeByType: Record<string, number>
  expenseByType: Record<string, number>
}

/** 汇总指定月的收支：金额、笔数、类别分布、支出 TOP */
export function monthStatement(records: RewardRecord[], month: string): MonthStatement {
  let income = 0
  let expense = 0
  let count = 0
  const incomeByType: Record<string, number> = {}
  const expenseByType: Record<string, number> = {}
  for (const r of records) {
    if (r.at.slice(0, 7) !== month) continue
    count++
    if (r.type === 'income') {
      income += r.amount
      incomeByType[r.category] = (incomeByType[r.category] ?? 0) + r.amount
    } else {
      expense += r.amount
      expenseByType[r.category] = (expenseByType[r.category] ?? 0) + r.amount
    }
  }
  const categoryTop = Object.entries(expenseByType)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
  return { month, income, expense, balance: income - expense, count, categoryTop, incomeByType, expenseByType }
}

/** 渲染为 Markdown 月结单文本 */
export function toMarkdown(s: MonthStatement): string {
  const lines = [
    `# ${s.month} 记账月结单`,
    '',
    `- 收入：¥${s.income.toLocaleString()}`,
    `- 支出：¥${s.expense.toLocaleString()}`,
    `- 净结余：¥${s.balance.toLocaleString()}`,
    `- 笔数：${s.count}`,
    '',
    '## 支出类别 TOP',
    '',
  ]
  if (s.categoryTop.length === 0) lines.push('- （本月无支出）')
  for (const c of s.categoryTop) lines.push(`- ${c.category}：¥${c.amount.toLocaleString()}`)
  return lines.join('\n')
}

/** 渲染为 CSV（首行表头 field,label,amount） */
export function toCsv(s: MonthStatement): string {
  const channels: [string, string, number][] = [
    ['income', '收入', s.income],
    ['expense', '支出', s.expense],
    ['balance', '净结余', s.balance],
  ]
  const head = 'field,label,amount'
  const rows = channels.map(([field, label, amount]) => `${field},${label},${amount}`)
  return [head, ...rows, '', `count,笔数,${s.count}`, `month,月份,${s.month}`].join('\n')
}