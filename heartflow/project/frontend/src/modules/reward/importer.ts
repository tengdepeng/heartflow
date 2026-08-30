// ============================================================
// 记账导入器：检测来源 → 解析 CSV → 列映射归一化 → 去重
// 支付宝/微信官方账单均为标准 CSV（首行表头）。可扩展第三 source。
// ============================================================
import type { RewardRecord } from './reward-list'
import type { ExpenseCategory, IncomeCategory } from './types'

export type ImportSource = 'alipay' | 'wechat' | 'unionpay' | 'unknown'
export type GuessedCategory = ExpenseCategory | IncomeCategory
export interface ImportRow {
  at: string
  type: 'income' | 'expense'
  amount: number
  category: string
  note: string
  bizId: string
}

const ALI_MARKERS = ['交易订单号', '商家订单号', '商品说明']
const WX_MARKERS = ['交易单号', '商户单号']
// 银联（云闪付/银行卡）对账单：含「商户名称」「交易卡号」等银行卡专属字段，可与前两者区隔
const UNIONPAY_MARKERS = ['商户名称', '交易卡号']

export function detectSource(header: string): ImportSource {
  if (ALI_MARKERS.every(m => header.includes(m))) return 'alipay'
  if (WX_MARKERS.every(m => header.includes(m))) return 'wechat'
  if (UNIONPAY_MARKERS.every(m => header.includes(m))) return 'unionpay'
  return 'unknown'
}

/** 简易 CSV 解析（处理引号包裹字段），返回对象数组（键=表头） */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '')
  if (lines.length === 0) return []
  const headers = splitLine(lines[0])
  return lines
    .slice(1)
    .map(l => {
      const cells = splitLine(l)
      const o: Record<string, string> = {}
      headers.forEach((h, i) => {
        o[h.trim()] = (cells[i] ?? '').trim()
      })
      return o
    })
    .filter(o => Object.keys(o).some(k => o[k] !== ''))
}
function splitLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (line[i + 1] === '"') {
        cur += '"'
        i++
      } else q = !q
      continue
    }
    if (c === ',' && !q) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}
function num(v: string): number {
  const n = parseFloat(String(v).replace(/[¥,\s]/g, ''))
  return isNaN(n) ? 0 : n
}
function toISODate(s: string): string {
  const m = s.match(/(\d{4}).(\d{1,2}).(\d{1,2})/)
  if (!m) return new Date().toISOString()
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}T00:00:00.000Z`
}

export function mapAlipay(r: Record<string, string>): ImportRow | null {
  if (!r['交易订单号'] && !r['金额']) return null
  const type = r['收/支']?.includes('收入') ? 'income' : 'expense'
  return {
    at: toISODate(r['交易时间']),
    type,
    amount: num(r['金额']),
    category: guessCategory(pickText(r, ['交易分类', '商品说明', '交易对方']), type),
    note: r['商品说明'] || r['交易对方'] || '',
    bizId:
      r['交易订单号'] ||
      `${toISODate(r['交易时间'])}|${num(r['金额'])}|${(r['商品说明'] ?? '').slice(0, 8)}`,
  }
}
export function mapWechat(r: Record<string, string>): ImportRow | null {
  if (!r['交易单号'] && !r['金额(元)']) return null
  const type = r['收/支']?.includes('收入') ? 'income' : 'expense'
  return {
    at: toISODate(r['交易时间']),
    type,
    amount: num(r['金额(元)'] || r['金额']),
    category: guessCategory(pickText(r, ['交易类型', '商品', '交易对方']), type),
    note: r['商品'] || r['交易对方'] || '',
    bizId:
      r['交易单号'] ||
      `${toISODate(r['交易时间'])}|${num(r['金额(元)'])}|${(r['商品'] ?? '').slice(0, 8)}`,
  }
}

/** 按顺序拼接首个非空文本字段，聚合出更丰富的分类信号 */
function pickText(r: Record<string, string>, keys: string[]): string {
  return keys.map(k => r[k] ?? '').filter(Boolean).join(' ')
}

/**
 * 银联（银行卡）账单行 → 归一化记录。
 * 银联账单常以正负金额或「收入/退款/退货」类交易类型区分收支；
 * 交易金额取绝对值，方向由类型字段判定。
 */
export function mapUnionpay(r: Record<string, string>): ImportRow | null {
  const amountRaw = r['交易金额'] || r['金额(元)'] || r['金额']
  if (!r['交易卡号'] && !amountRaw) return null
  const raw = amountRaw.replace(/[¥,\s]/g, '')
  // 金额前带「-」或字段中命中收入类关键词均视为入账
  const kindText = pickText(r, ['交易类型', '收支', '交易状态', '商户名称'])
  const isIncome =
    raw.startsWith('+') ||
    /(收入|退款|退货|利息|转入|入账|贷方|工资|红包|返现)/.test(kindText)
  const type = isIncome ? 'income' : 'expense'
  return {
    at: toISODate(r['交易日期'] || r['交易时间']),
    type,
    amount: Math.abs(num(amountRaw)),
    category: guessCategory(pickText(r, ['商户名称', '商户类型', '交易类型']), type),
    note: r['商户名称'] || r['交易类型'] || '',
    bizId:
      r['交易流水号'] ||
      r['授权号'] ||
      `${toISODate(r['交易日期'] || r['交易时间'])}|${Math.abs(num(amountRaw))}|${(r['商户名称'] ?? '').slice(0, 8)}`,
  }
}

// ---- guessCategory：关键词评分分类（按收支类型区分归类） ----
const EXPENSE_HINTS: Record<ExpenseCategory, string[]> = {
  tools: [
    '工具', '软件', '数码', '电子', '电脑', '笔记本', '手机', '耳机', '键盘', '配件', '设备',
    '硬件', '办公', '打印', '维修', '话费', '流量', '充值', '物业', '宽带',
  ],
  learning: [
    '书籍', '图书', '教材', '书店', '课程', '培训', '教育', '网课', '知识', '考试',
    '订阅', '会员', '学习',
  ],
  health: [
    '医疗', '医院', '药店', '药房', '药品', '医生', '健康', '体检', '健身', '保健',
    '诊所', '牙科', '眼科', '疫苗',
  ],
  social: [
    '餐饮', '美食', '餐厅', '餐费', '外卖', '早餐', '午餐', '晚餐', '咖啡', '奶茶', '酒',
    '饭店', '小吃', '蛋糕', '面包', '火锅', '烧烤', '娱乐', '电影', 'KTV', '游戏', '聚会',
    '门票', '旅游', '酒店', '打车', '交通', '地铁', '加油', '出行', '超市', '便利店', '商场',
    '百货', '网购', '淘宝', '日常',
  ],
  'other-expense': [],
}

const INCOME_HINTS: Record<IncomeCategory, string[]> = {
  salary: ['工资', '薪资', '薪金', '发薪', '代发'],
  freelance: ['劳务', '稿费', '稿酬', '兼职', '佣金', '设计', '咨询', '项目款', '服务费', '打款', '结算'],
  investment: ['利息', '分红', '理财', '基金', '收益', '股票', '证券', '赎回', '股息', '余额宝'],
  gift: ['红包', '礼物', '转账', '点赞', '赞赏', '零钱转入'],
  'other-income': [],
}

function bestCategory(raw: string, hints: Record<string, string[]>): string {
  const s = (raw ?? '').toLowerCase()
  let best = ''
  let bestScore = 0
  for (const [cat, kws] of Object.entries(hints)) {
    const score = kws.reduce((n, k) => (s.includes(k.toLowerCase()) ? n + 1 : n), 0)
    if (score > bestScore) {
      bestScore = score
      best = cat
    }
  }
  return bestScore > 0 ? best : ''
}

/**
 * 按收支类型二选一的类别归一（映射到标准类别键）。
 * type=income → 收入类别；type=expense → 支出类别；无命中回退 other-income / other-expense。
 */
export function guessCategory(raw: string, type: 'income' | 'expense' = 'expense'): GuessedCategory {
  if (type === 'income') {
    const c = bestCategory(raw, INCOME_HINTS)
    return (c || 'other-income') as IncomeCategory
  }
  const c = bestCategory(raw, EXPENSE_HINTS)
  return (c || 'other-expense') as ExpenseCategory
}

export function dedupe(
  existing: Pick<RewardRecord, 'bizId' | 'at' | 'type' | 'amount'>[],
  fresh: ImportRow[],
): ImportRow[] {
  const seen = new Set(existing.filter(e => e.bizId).map(e => e.bizId))
  const keySet = new Set(existing.map(e => `${e.at}|${e.type}|${e.amount}|0`))
  return fresh.filter(row => {
    if (row.bizId && seen.has(row.bizId)) return false
    return !keySet.has(`${row.at}|${row.type}|${row.amount}|0`)
  })
}