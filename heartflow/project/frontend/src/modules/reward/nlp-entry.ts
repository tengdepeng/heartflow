// ============================================================
// 劳酬 · 自然语言快速记账引擎（INCR-24）
// 一段话智能解析：金额 / 收支类型 / 类别 / 账户 / 日期 / 备注 → 生成账单草稿。
// 输入金融容错：支持 ¥/￥ 前缀、元/块/万/千 单位、千分位、动词与类别词判型、
// 账户名/类型匹配、相对日期（今天/昨天/前天/周/月日）。
// 纯函数设计：parseQuickEntry 只依赖入参（合并分类表 + 账户表 + 当前日期），
// quickEntryToRecord 产出可保存记录；面板层负责交互与落库。
// ============================================================
import type { RewardRecord } from './reward-list'
import type { CustomCategory, CategoryKind } from './custom-category'
import type { Account } from './accounts'

export interface QuickEntryContext {
  /** 合并后的分类表（内置种子 + 用户自定义，来自 useCustomCategories().categories） */
  categories?: CustomCategory[]
  /** 账户表（来自 useAccounts().accounts） */
  accounts?: Account[]
  /** 当前日期（本地时区 ISO 日期 YYYY-MM-DD；测试可注入） */
  today?: string
}

export interface QuickEntryDraft {
  type: 'income' | 'expense'
  amount: number
  /** 分类键（匹配内置 + 用户自定义；未命中兜底 other-expense/other-income） */
  category: string
  /** 账户 id（匹配账户名/类型/内置键；缺省 cash） */
  account: string
  /** 记账日期（ISO 日期 YYYY-MM-DD） */
  date: string
  /** 备注（剥离金额/日期/账户/动词后的剩余语义） */
  description: string
  raw: string
  /** 0-1 解析置信度（金额必有，其余字段累计） */
  confidence: number
  /** 容错提示（如「未识别类别」「未识别账户」） */
  issues: string[]
}

// ---- 收支类型触发词 ----
const INCOME_TYPE_WORDS = [
  '收入', '入账', '进账', '收款', '收到', '领到', '赚了', '赚到', '挣了', '收红包', '领红包',
  '工资', '奖金', '返', '分红', '利息', '稿费', '退款', '报销',
]
const EXPENSE_TYPE_WORDS = [
  '支出', '花了', '花掉', '消费', '买了', '购买', '付款', '支付', '付费', '付了', '交了', '充了', '充值',
  '发红包', '随份子', '请客', '打车', '买菜', '交房租', '还款',
]

// ---- 类别关键词词典（按类别键 → 触发词）----
const INCOME_CATEGORY_KEYWORDS: Record<string, string[]> = {
  salary: ['工资', '薪资', '月薪', '薪水', '工资条'],
  freelance: ['兼职', '稿费', '外包', '接单', '设计费', '咨询费', '劳务', '项目款'],
  investment: ['利息', '分红', '理财', '股票', '基金', '股息', '收益', '中签'],
  gift: ['红包', '礼金', '压岁钱', '赠予', '收到礼物'],
}
const EXPENSE_CATEGORY_KEYWORDS: Record<string, string[]> = {
  tools: ['工具', '软件', '订阅', '会员', '设备', '电脑', '键盘', '鼠标', '耳机', '办公', '维修', '话费', '流量', '打印机'],
  learning: ['学习', '书', '课程', '培训', '报课', '知识付费', '考试', '文具', '教材'],
  health: ['健康', '药', '医院', '医生', '看病', '体检', '挂号', '保险', '健身', '疫苗'],
  social: ['聚餐', '请客', '吃饭', '奶茶', '咖啡', '约会', '人情', '份子', '打车', '礼物', '红包'],
}

/** 动词/功能词：仅作判型与剥离，不入备注 */
const STRIP_WORDS = [
  '花了', '花掉', '花费', '消费', '买了', '买', '购买', '付款', '支付', '付费', '付了', '交了', '充了', '充值',
  '入账', '进账', '收款', '收到', '领到', '赚了', '赚到', '用了', '用', '了', '的', '给', '从', '在', '和',
]

// ---- 账户内置键 → 关键词 ----
const BUILTIN_ACCOUNT_KEYWORDS: Record<string, string[]> = {
  cash: ['现金', '现金账户'],
  bank: ['银行卡', '银行', '卡'],
  alipay: ['支付宝', '花呗'],
  wechat: ['微信', '零钱'],
  savings: ['余额宝', '储蓄', '存款'],
}

// ---- 相对日期 ----
const RELATIVE_DATE: [RegExp, number][] = [
  [/大前天/, -3],
  [/今天|今日|现在/, 0],
  [/昨天|昨日/, -1],
  [/前天/, -2],
]

function stripCommas(s: string): string {
  return s.replace(/,/g, '')
}

/** 提取金额；支持 ¥ 前缀、元/块/万/千 单位、千分位与裸数字（避开日期上下文） */
export function extractAmount(text: string): { amount: number; raw: string } | null {
  const m1 = text.match(/[¥￥$]\s*([\d,]+(?:\.\d+)?)/)
  if (m1) return { amount: parseFloat(stripCommas(m1[1])), raw: m1[0] }

  const m2 = text.match(/(\d+(?:\.\d+)?)\s*万\s*(\d)?(?:千)?/)
  if (m2) {
    const main = parseFloat(m2[1]) * 10000
    const sub = m2[2] ? parseInt(m2[2], 10) * 1000 : 0
    return { amount: main + sub, raw: m2[0] }
  }

  const m3 = text.match(/(\d+(?:\.\d+)?)\s*千/)
  if (m3) return { amount: parseFloat(m3[1]) * 1000, raw: m3[0] }

  const m4 = text.match(/(\d[\d,]*(?:\.\d+)?)\s*(?:元|块钱|块|rmb|RMB|r|k|K)(?![a-zA-Z])/)
  if (m4) return { amount: parseFloat(stripCommas(m4[1])), raw: m4[0] }

  const m4b = text.match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?/)
  if (m4b) return { amount: parseFloat(stripCommas(m4b[0])), raw: m4b[0] }

  const nums = text.match(/\d+(?:\.\d+)?/g)
  if (nums) {
    for (const s of nums) {
      const v = parseFloat(s)
      if (v > 0 && !isDateContext(text, s)) return { amount: v, raw: s }
    }
  }
  return null
}

function isDateContext(text: string, s: string): boolean {
  const i = text.indexOf(s)
  const before = text[i - 1] ?? ''
  const after = text[i + s.length] ?? ''
  return (
    before === '月' || before === '年' || before === '号' || before === '日' ||
    before === '点' || before === '时' ||
    after === '月' || after === '号' || after === '日' || after === '年' ||
    after === '点' || after === '时' || after === '分'
  )
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** 本地时区今天的 ISO 日期（YYYY-MM-DD） */
export function localToday(): string {
  return toISODate(new Date())
}

/** 提取日期；支持 今天/昨天/前天/大前天、X月X日/X号、YYYY-MM-DD；缺省今天 */
export function extractDate(text: string, todayISO: string): { date: string; raw?: string } {
  const today = parseISODate(todayISO)

  for (const [re, delta] of RELATIVE_DATE) {
    const m = text.match(re)
    if (m) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + delta)
      return { date: toISODate(d), raw: m[0] }
    }
  }

  let m = text.match(/(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)/)
  if (m) {
    const mo = parseInt(m[1], 10)
    const day = parseInt(m[2], 10)
    const d = new Date(today.getFullYear(), mo - 1, day)
    if (d.getMonth() === mo - 1) return { date: toISODate(d), raw: m[0] }
  }

  m = text.match(/(\d{1,2})\s*号/)
  if (m) {
    const day = parseInt(m[1], 10)
    const d = new Date(today.getFullYear(), today.getMonth(), day)
    if (d.getMonth() === today.getMonth()) return { date: toISODate(d), raw: m[0] }
  }

  m = text.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) {
    const d = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10))
    return { date: toISODate(d), raw: m[0] }
  }

  return { date: todayISO }
}

/** 匹配账户：优先账户表名字，其次内置键关键词；缺省 cash */
export function matchAccount(
  text: string,
  accounts: Account[],
): { account: string; raw?: string; matched: boolean } {
  for (const a of accounts) {
    if (a.name && text.includes(a.name)) return { account: a.id, raw: a.name, matched: true }
  }
  for (const [id, words] of Object.entries(BUILTIN_ACCOUNT_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w)) return { account: id, raw: w, matched: true }
    }
  }
  return { account: 'cash', matched: false }
}

interface CategoryHit {
  id: string
  kind: CategoryKind
  word: string
}

/** 匹配类别：用户自定义（按名）+ 内置关键词词典 */
export function matchCategories(text: string, categories: CustomCategory[]): CategoryHit[] {
  const hits: CategoryHit[] = []
  const seen = new Set<string>()

  for (const c of categories) {
    if (c.legacy) continue
    if (c.name.length >= 2 && text.includes(c.name) && !seen.has(c.id)) {
      hits.push({ id: c.id, kind: c.kind, word: c.name })
      seen.add(c.id)
    }
  }
  for (const [id, words] of Object.entries(INCOME_CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w) && !seen.has(id)) {
        hits.push({ id, kind: 'income', word: w })
        seen.add(id)
      }
    }
  }
  for (const [id, words] of Object.entries(EXPENSE_CATEGORY_KEYWORDS)) {
    for (const w of words) {
      if (text.includes(w) && !seen.has(id)) {
        hits.push({ id, kind: 'expense', word: w })
        seen.add(id)
      }
    }
  }
  return hits
}

function countHits(text: string, words: string[]): number {
  return words.reduce((n, w) => (text.includes(w) ? n + 1 : n), 0)
}

/** 从剩余文本剥离金额/日期/账户原文与动词功能词，得到备注 */
export function cleanDescription(text: string, strips: string[]): string {
  let out = text
  for (const s of strips) {
    if (s && s.length >= 2) out = out.split(s).join('')
  }
  // 多字动词保留空格分隔；单字助词/动词直接删除，避免碎片空格（如「给宠物买粮」→「宠物粮」）
  for (const w of STRIP_WORDS) {
    out = out.split(w).join(w.length >= 2 ? ' ' : '')
  }
  return out.replace(/\s+/g, ' ').trim()
}

/** 一段话智能解析 → 账单草稿（输入金融容错） */
export function parseQuickEntry(text: string, ctx: QuickEntryContext = {}): QuickEntryDraft {
  const raw = text.trim()
  const today = ctx.today ?? toISODate(new Date())
  const categories = ctx.categories ?? []
  const accounts = ctx.accounts ?? []

  const issues: string[] = []

  const amountHit = extractAmount(raw)
  const amount = amountHit?.amount ?? 0
  if (amount <= 0) issues.push('未识别金额')

  const dateHit = extractDate(raw, today)
  const accountHit = matchAccount(raw, accounts)
  const categoryHits = matchCategories(raw, categories)

  const incomeScore = countHits(raw, INCOME_TYPE_WORDS)
  const expenseScore = countHits(raw, EXPENSE_TYPE_WORDS)
  let typeExplicit = false
  let type: 'income' | 'expense'
  if (incomeScore > 0 && incomeScore > expenseScore) {
    type = 'income'
    typeExplicit = true
  } else if (expenseScore > 0 && expenseScore >= incomeScore) {
    type = 'expense'
    typeExplicit = true
  } else if (categoryHits.length > 0) {
    type = categoryHits[0].kind
  } else {
    type = 'expense'
  }

  const kindCandidates = categoryHits.filter(h => h.kind === type)
  const picked = kindCandidates[0] ?? categoryHits[0]
  const category = picked?.id ?? (type === 'income' ? 'other-income' : 'other-expense')
  if (!picked) issues.push(`未识别类别（已归${type === 'income' ? '其他收入' : '其他支出'}）`)
  // 未指定账户时默认现金属正常兜底，不作为容错提示

  const strips: string[] = []
  if (amountHit) strips.push(amountHit.raw)
  if (dateHit.raw) strips.push(dateHit.raw)
  if (accountHit.raw) strips.push(accountHit.raw)
  let description = cleanDescription(raw, strips)
  if (!description) {
    description = type === 'income' ? '收入' : '支出'
  }

  let confidence = 0
  if (amount > 0) confidence += 0.4
  if (typeExplicit) confidence += 0.15
  if (picked) confidence += 0.2
  if (accountHit.matched) confidence += 0.15
  if (dateHit.raw) confidence += 0.1
  confidence = Math.min(1, Math.round(confidence * 100) / 100)

  return {
    type,
    amount,
    category,
    account: accountHit.account,
    date: dateHit.date,
    description,
    raw,
    confidence,
    issues,
  }
}

/** 草稿 → 可保存记录（at 采用本地 12:00 转 ISO，与既有表单一致） */
export function quickEntryToRecord(draft: QuickEntryDraft, now = new Date()): RewardRecord {
  return {
    id: now.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
    type: draft.type,
    category: draft.category,
    amount: draft.amount,
    description: draft.description,
    at: new Date(`${draft.date}T12:00:00`).toISOString(),
    account: draft.account || 'cash',
  }
}
