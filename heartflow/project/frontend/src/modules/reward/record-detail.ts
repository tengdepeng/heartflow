// ============================================================
// 记账明细：v2 记录的过滤 / 排序 / 分页 纯函数
// 不复用旧版 finance-analysis.useFinanceFilter（其绑定 recordedAt/projectId
// 旧模型，且无 account/tags/archived 字段）。本模块面向 v2 RewardRecord(at)。
// ============================================================
import type { RewardRecord } from './reward-list'

export type RecordSortField = 'at' | 'amount' | 'category'
export type RecordSortOrder = 'asc' | 'desc'

export interface RecordFilterOptions {
  keyword?: string
  types?: RewardRecord['type'][]
  tag?: string
  account?: string
  category?: string
  /** 是否包含已归档（默认 true） */
  showArchived?: boolean
  sortField?: RecordSortField
  sortOrder?: RecordSortOrder
  page?: number
  pageSize?: number
}

export interface RecordFilteredResult {
  records: RewardRecord[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/** 应用 关键词/类型/标签/账户/类别/归档 过滤 + 排序 + 分页 */
export function applyRecordFilter(
  records: RewardRecord[],
  opts: RecordFilterOptions = {},
): RecordFilteredResult {
  let filtered = [...records]

  const kw = (opts.keyword ?? '').trim().toLowerCase()
  if (kw) {
    filtered = filtered.filter(
      r =>
        r.description.toLowerCase().includes(kw) ||
        r.category.toLowerCase().includes(kw) ||
        (r.tags ?? []).some(t => t.toLowerCase().includes(kw)),
    )
  }

  if (opts.types && opts.types.length > 0) {
    filtered = filtered.filter(r => opts.types!.includes(r.type))
  }
  if (opts.tag) {
    filtered = filtered.filter(r => (r.tags ?? []).includes(opts.tag!))
  }
  if (opts.account) {
    filtered = filtered.filter(r => (r.account ?? 'cash') === opts.account!)
  }
  if (opts.category) {
    filtered = filtered.filter(r => r.category === opts.category)
  }
  if (opts.showArchived === false) {
    filtered = filtered.filter(r => !r.archived)
  }

  const sortField = opts.sortField ?? 'at'
  const sortOrder = opts.sortOrder ?? 'desc'
  filtered.sort((a, b) => {
    let cmp = 0
    if (sortField === 'amount') cmp = a.amount - b.amount
    else if (sortField === 'category') cmp = a.category.localeCompare(b.category)
    else cmp = String(a.at).localeCompare(String(b.at))
    return sortOrder === 'asc' ? cmp : -cmp
  })

  const total = filtered.length
  const pageSize = opts.pageSize ?? 20
  const page = Math.max(1, opts.page ?? 1)
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const paged = filtered.slice(start, start + pageSize)

  return { records: paged, total, page: safePage, pageSize, totalPages }
}

/** 各标签出现次数（用于标签筛选 chips 展示） */
export function tagCounts(records: RewardRecord[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of records) {
    for (const t of r.tags ?? []) out[t] = (out[t] ?? 0) + 1
  }
  return out
}

/** 全部账户集合（含缺省现金） */
export function accountOptions(records: RewardRecord[]): string[] {
  const set = new Set(records.map(r => r.account ?? 'cash'))
  return Array.from(set)
}

/** 切换单条记录的归档状态，返回新列表 */
export function toggleArchived(records: RewardRecord[], id: string): RewardRecord[] {
  return records.map(r => (r.id === id ? { ...r, archived: !r.archived } : r))
}