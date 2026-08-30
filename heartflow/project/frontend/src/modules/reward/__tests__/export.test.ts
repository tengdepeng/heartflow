// ============================================================
// 数据导出引擎测试（INCR-30）
// ============================================================
import { describe, it, expect } from 'vitest'
import { buildExportRows, toCsv, toExcelXls } from '../export'
import type { RewardRecord } from '../reward-list'

function rec(o: Partial<RewardRecord>): RewardRecord {
  return {
    id: o.id ?? 'r1',
    type: o.type ?? 'expense',
    category: o.category ?? 'learning',
    amount: o.amount ?? 100,
    description: o.description ?? '',
    at: o.at ?? '2026-08-05T12:00:00.000Z',
    account: o.account,
    tags: o.tags,
  }
}

describe('buildExportRows', () => {
  const records = [
    rec({ id: '1', type: 'income', category: 'salary', amount: 8000, description: '工资', at: '2026-08-01T00:00:00Z' }),
    rec({ id: '2', type: 'expense', category: 'learning', amount: 300, description: '课程', at: '2026-08-10T00:00:00Z', account: 'alipay', tags: ['技能'] }),
    rec({ id: '3', type: 'expense', category: 'social', amount: 50, at: '2026-07-20T00:00:00Z' }),
  ]

  it('默认导出全部并按日期升序', () => {
    const rows = buildExportRows(records)
    expect(rows.length).toBe(3)
    expect(rows[0].日期).toBe('2026-07-20')
    expect(rows[1].日期).toBe('2026-08-01')
  })

  it('scope=month 只取该月', () => {
    const rows = buildExportRows(records, { scope: 'month', month: '2026-08' })
    expect(rows.length).toBe(2)
  })

  it('scope=range 按起止日期（含）过滤', () => {
    const rows = buildExportRows(records, { scope: 'range', from: '2026-08-01', to: '2026-08-10' })
    expect(rows.length).toBe(2)
  })

  it('支出金额为负、收入为正', () => {
    const rows = buildExportRows(records, { scope: 'range', from: '2026-08-01', to: '2026-08-10' })
    const income = rows.find(r => r.类型 === '收入')!
    const expense = rows.find(r => r.类型 === '支出')!
    expect(income.金额).toBe(8000)
    expect(expense.金额).toBe(-300)
  })

  it('类别/账户走解析函数', () => {
    const rows = buildExportRows([rec({ category: 'custom' })], {
      categoryLabel: k => `【${k}】`,
      accountName: () => '现金',
    })
    expect(rows[0].类别).toBe('【custom】')
    expect(rows[0].账户).toBe('现金')
  })

  it('标签拼接、备注、账户默认', () => {
    const row = buildExportRows([records[1]])[0]
    expect(row.标签).toBe('技能')
    expect(row.备注).toBe('课程')
    expect(row.账户).toBe('alipay')
  })
})

describe('toCsv', () => {
  it('含 BOM、表头、逐行数据', () => {
    const csv = toCsv(buildExportRows([
      rec({ id: '1', type: 'income', category: 'salary', amount: 8000, description: '含,逗号', at: '2026-08-01T00:00:00Z' }),
    ]))
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('日期,类型,类别,备注,金额,账户,标签')
    expect(csv).toContain('含,逗号') // 引号包裹未被破坏
  })
})

describe('toExcelXls', () => {
  it('产出 SpreadsheetML XML 文本', () => {
    const xls = toExcelXls(buildExportRows([rec({ id: '1', type: 'income', amount: 8000, at: '2026-08-01T00:00:00Z' })]))
    expect(xls.startsWith('\uFEFF<?xml')).toBe(true)
    expect(xls).toContain('mso-application progid="Excel.Sheet"')
    expect(xls).toContain('<Worksheet ss:Name="收支明细">')
    expect(xls).toContain('ss:Type="Number">8000')
  })

  it('转义特殊字符避免 XSS/格式破坏', () => {
    const xls = toExcelXls([{
      日期: '2026-08-01', 类型: '支出', 类别: '工具', 备注: 'a<b&c', 金额: -1, 账户: '现金', 标签: '',
    }])
    expect(xls).toContain('a&lt;b&amp;c')
    expect(xls).not.toContain('<b&')
  })
})