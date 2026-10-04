// ============================================================
// 阅览殿 · 摘录多色标记（INCR-477）
// 借鉴 静读天下 / 微信读书 / Readable 的「多色划线」：
// 每条摘录附一个标记色，正文按色高亮、摘录集按色筛选与改色。
// 纯函数层：调色板 + 校验 + 不可变改色 + 分布统计 + 筛选。
// 仅存本地存储（hf:reading_excerpts），符合「本地私有」硬约束。
// ============================================================
import type { Excerpt } from './reading-content'

export interface ExcerptMarkColor {
  id: string
  label: string
  value: string
}

/** 多色标记调色板（暖色系，贴合心流「温柔」美学） */
export const EXCERPT_MARK_COLORS: ExcerptMarkColor[] = [
  { id: 'amber', label: '琥珀', value: '#e8c07a' },
  { id: 'sage', label: '苔绿', value: '#9bb08a' },
  { id: 'sky', label: '雾蓝', value: '#8aa9c9' },
  { id: 'rose', label: '绯粉', value: '#d29aa8' },
  { id: 'violet', label: '紫藤', value: '#a99ac9' },
]

/** 默认标记色（琥珀） */
export const DEFAULT_EXCERPT_MARK = EXCERPT_MARK_COLORS[0].value

/** 是否为调色板内颜色 */
export function isExcerptMarkColor(value: string | undefined | null): boolean {
  return !!value && EXCERPT_MARK_COLORS.some((c) => c.value === value)
}

/** 取摘录的有效标记色（未设或非法时回落默认色） */
export function excerptMarkColor(ex: Pick<Excerpt, 'color'>): string {
  return isExcerptMarkColor(ex.color) ? (ex.color as string) : DEFAULT_EXCERPT_MARK
}

/** 不可变改色；非法颜色原样返回 */
export function applyExcerptMark(excerpts: Excerpt[], id: string, color: string): Excerpt[] {
  if (!isExcerptMarkColor(color)) return excerpts
  return excerpts.map((ex) => (ex.id === id ? { ...ex, color } : ex))
}

/** 各色摘录数（按调色板顺序，含 0 项，供筛选栏展示） */
export function markDistribution(excerpts: Excerpt[]): { color: ExcerptMarkColor; count: number }[] {
  return EXCERPT_MARK_COLORS.map((color) => ({
    color,
    count: excerpts.filter((ex) => excerptMarkColor(ex) === color.value).length,
  }))
}

/** 按色筛选；color 为空返回全部 */
export function filterExcerptsByMark(excerpts: Excerpt[], color?: string): Excerpt[] {
  if (!color) return excerpts
  return excerpts.filter((ex) => excerptMarkColor(ex) === color)
}
