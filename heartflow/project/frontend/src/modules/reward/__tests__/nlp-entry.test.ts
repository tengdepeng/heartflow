// ============================================================
// INCR-24 自然语言快速记账引擎测试
// 一段话解析：金额/类型/类别/账户/日期/备注 + 输入金融容错
// ============================================================
import { describe, expect, it } from 'vitest'
import { buildMerged } from '../custom-category'
import {
  extractAmount,
  extractDate,
  matchAccount,
  matchCategories,
  cleanDescription,
  parseQuickEntry,
  quickEntryToRecord,
} from '../nlp-entry'
import type { CustomCategory } from '../custom-category'
import type { Account } from '../accounts'

const TODAY = '2026-08-29'
const seedCats = buildMerged([])

function withCustom(custom: CustomCategory[]): CustomCategory[] {
  return buildMerged(custom)
}

const mockAccounts: Account[] = [
  { id: 'alipay', name: '支付宝', type: 'alipay', initialBalance: 0 },
  { id: 'wechat', name: '微信', type: 'wechat', initialBalance: 0 },
]

describe('extractAmount 金额提取（金融容错）', () => {
  it('人民币符号前缀', () => {
    expect(extractAmount('¥25')?.amount).toBe(25)
    expect(extractAmount('￥25.5')?.amount).toBe(25.5)
  })
  it('元/块 单位后缀', () => {
    expect(extractAmount('花了25块')?.amount).toBe(25)
    expect(extractAmount('买了咖啡50元')?.amount).toBe(50)
    expect(extractAmount('花费12.5元')?.amount).toBe(12.5)
  })
  it('万/千 单位与组合', () => {
    expect(extractAmount('1万5')?.amount).toBe(15000)
    expect(extractAmount('2千')?.amount).toBe(2000)
    expect(extractAmount('1.5万')?.amount).toBe(15000)
  })
  it('千分位', () => {
    expect(extractAmount('买电脑15,000元')?.amount).toBe(15000)
    expect(extractAmount('工资 25,000')?.amount).toBe(25000)
  })
  it('裸数字（避开日期上下文）', () => {
    expect(extractAmount('工资8000')?.amount).toBe(8000)
    expect(extractAmount('8月5日买书50')?.amount).toBe(50)
  })
  it('无金额返回 null', () => {
    expect(extractAmount('买了咖啡')).toBeNull()
  })
})

describe('extractDate 日期提取', () => {
  it('相对日期', () => {
    expect(extractDate('今天买咖啡', TODAY).date).toBe('2026-08-29')
    expect(extractDate('昨天打车', TODAY).date).toBe('2026-08-28')
    expect(extractDate('前天吃饭', TODAY).date).toBe('2026-08-27')
    expect(extractDate('大前天', TODAY).date).toBe('2026-08-26')
  })
  it('X月X日 与 X号', () => {
    expect(extractDate('8月5日买书', TODAY).date).toBe('2026-08-05')
    expect(extractDate('12号交房租', TODAY).date).toBe('2026-08-12')
  })
  it('YYYY-MM-DD', () => {
    expect(extractDate('2026-09-01 工资', TODAY).date).toBe('2026-09-01')
  })
  it('缺省今天', () => {
    expect(extractDate('买咖啡', TODAY).date).toBe(TODAY)
  })
})

describe('matchAccount 账户匹配', () => {
  it('账户表名字优先', () => {
    expect(matchAccount('用支付宝买咖啡', mockAccounts).account).toBe('alipay')
  })
  it('内置键关键词', () => {
    expect(matchAccount('现金支付', []).account).toBe('cash')
    expect(matchAccount('用微信付款', []).account).toBe('wechat')
    expect(matchAccount('从银行卡转出', []).account).toBe('bank')
  })
  it('未命中默认现金', () => {
    expect(matchAccount('买咖啡', mockAccounts)).toEqual({ account: 'cash', matched: false })
  })
})

describe('matchCategories 类别匹配', () => {
  it('内置关键词', () => {
    const hits = matchCategories('买书花了50元', seedCats)
    expect(hits.some(h => h.id === 'learning')).toBe(true)
  })
  it('用户自定义分类按名匹配', () => {
    const cats = withCustom([{ id: 'pet', name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' }])
    const hits = matchCategories('给宠物买粮', cats)
    expect(hits.some(h => h.id === 'pet')).toBe(true)
  })
  it('遗留键 tool/course 不参与匹配', () => {
    const hits = matchCategories('买了工具', seedCats)
    expect(hits.some(h => h.id === 'tool')).toBe(false)
    expect(hits.some(h => h.id === 'tools')).toBe(true)
  })
})

describe('cleanDescription 备注剥离', () => {
  it('剥离金额与动词，保留语义', () => {
    expect(cleanDescription('买了咖啡花了25块', ['25块'])).toBe('咖啡')
  })
  it('剥离日期与账户', () => {
    expect(cleanDescription('昨天用支付宝打车花了40', ['40', '昨天', '支付宝'])).toBe('打车')
  })
})

describe('parseQuickEntry 一段话智能解析', () => {
  it('基本支出：金额+类别+备注', () => {
    const d = parseQuickEntry('买了咖啡花了25块', { categories: seedCats, today: TODAY })
    expect(d.type).toBe('expense')
    expect(d.amount).toBe(25)
    expect(d.category).toBe('social')
    expect(d.description).toBe('咖啡')
    expect(d.date).toBe(TODAY)
    expect(d.account).toBe('cash')
    expect(d.issues).toHaveLength(0)
  })

  it('明确收入：工资入账', () => {
    const d = parseQuickEntry('工资入账8000', { categories: seedCats, today: TODAY })
    expect(d.type).toBe('income')
    expect(d.amount).toBe(8000)
    expect(d.category).toBe('salary')
    expect(d.description).toBe('工资')
  })

  it('相对日期：昨天打车', () => {
    const d = parseQuickEntry('昨天打车花了40', { categories: seedCats, today: TODAY })
    expect(d.date).toBe('2026-08-28')
    expect(d.type).toBe('expense')
    expect(d.description).toBe('打车')
  })

  it('账户匹配：用支付宝', () => {
    const d = parseQuickEntry('用支付宝买咖啡25', { categories: seedCats, accounts: mockAccounts, today: TODAY })
    expect(d.account).toBe('alipay')
    expect(d.type).toBe('expense')
    expect(d.category).toBe('social')
  })

  it('万单位：1万5 → 15000', () => {
    const d = parseQuickEntry('买设备花了1万5', { categories: seedCats, today: TODAY })
    expect(d.amount).toBe(15000)
    expect(d.category).toBe('tools')
  })

  it('用户自定义分类：宠物', () => {
    const cats = withCustom([{ id: 'pet', name: '宠物', kind: 'expense', icon: '🐾', color: '#c46a5a' }])
    const d = parseQuickEntry('给宠物买粮50', { categories: cats, today: TODAY })
    expect(d.category).toBe('pet')
    expect(d.amount).toBe(50)
    expect(d.description).toBe('宠物粮')
  })

  it('收红包判为收入赠予', () => {
    const d = parseQuickEntry('收到红包200', { categories: seedCats, today: TODAY })
    expect(d.type).toBe('income')
    expect(d.category).toBe('gift')
    expect(d.amount).toBe(200)
  })

  it('发红包判为支出社交', () => {
    const d = parseQuickEntry('发红包200', { categories: seedCats, today: TODAY })
    expect(d.type).toBe('expense')
    expect(d.category).toBe('social')
  })

  it('具体日期 + 类别', () => {
    const d = parseQuickEntry('8月5日买书50元', { categories: seedCats, today: TODAY })
    expect(d.date).toBe('2026-08-05')
    expect(d.category).toBe('learning')
    expect(d.amount).toBe(50)
    expect(d.description).toBe('书')
  })

  it('无金额：容错提示且不可入账', () => {
    const d = parseQuickEntry('买了咖啡', { categories: seedCats, today: TODAY })
    expect(d.amount).toBe(0)
    expect(d.issues).toContain('未识别金额')
  })

  it('未识别类别兜底 other-expense', () => {
    const d = parseQuickEntry('买了个神秘东西99', { categories: seedCats, today: TODAY })
    expect(d.category).toBe('other-expense')
    expect(d.issues.some(i => i.includes('未识别类别'))).toBe(true)
  })

  it('置信度：字段越全越高', () => {
    const full = parseQuickEntry('昨天用支付宝买咖啡25', { categories: seedCats, accounts: mockAccounts, today: TODAY })
    const bare = parseQuickEntry('买咖啡25', { categories: seedCats, today: TODAY })
    expect(full.confidence).toBeGreaterThan(bare.confidence)
    expect(full.confidence).toBeLessThanOrEqual(1)
  })

  it('千分位金额', () => {
    const d = parseQuickEntry('买电脑花费15,000元', { categories: seedCats, today: TODAY })
    expect(d.amount).toBe(15000)
    expect(d.category).toBe('tools')
  })
})

describe('quickEntryToRecord 草稿落库', () => {
  it('生成可保存记录（at 本地 12:00 转 ISO）', () => {
    const d = parseQuickEntry('昨天用支付宝买咖啡25', { categories: seedCats, accounts: mockAccounts, today: TODAY })
    const rec = quickEntryToRecord(d)
    expect(rec.type).toBe('expense')
    expect(rec.category).toBe('social')
    expect(rec.amount).toBe(25)
    expect(rec.description).toBe('咖啡')
    expect(rec.account).toBe('alipay')
    expect(rec.id).toBeTruthy()
    expect(rec.at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(rec.at.slice(0, 10)).toBe('2026-08-28')
  })
})
