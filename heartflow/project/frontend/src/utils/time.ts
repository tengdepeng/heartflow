// ============================================================
// 时间工具函数
// ============================================================

/**
 * 将日期格式化为设备本地日历日期键（YYYY-MM-DD）。
 * 业务日期不能使用 UTC ISO 日期，以避免本地午夜附近跨日。
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** 格式化秒数为 mm:ss */
export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 格式化日期 */
export function formatDate(ts: number | string, fmt: 'short' | 'full' | 'weekday' = 'short'): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts)
  if (fmt === 'short') {
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  if (fmt === 'full') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }
  if (fmt === 'weekday') {
    return ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
  }
  return d.toLocaleDateString('zh-CN')
}

/**
 * 将时间戳（epoch ms）或 ISO 字符串格式化为 HH:mm（24 小时制时钟）。
 * 统一替代各组件内散落的 `formatTime(ts: number)` / `formatTimeShort(iso)` 本地副本。
 */
export function formatClockTime(input: number | string): string {
  const d = new Date(input)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * 将时间戳（epoch ms）或 ISO 字符串格式化为 YYYY-MM-DD HH:mm。
 * 统一替代各视图内散落的 `formatTime(iso: string)` / `formatTime(ts: number)` 本地副本。
 */
export function formatDateTime(input: number | string): string {
  const d = new Date(input)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 格式化时长为可读文本 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}分钟`
  const h = Math.floor(m / 60)
  const remain = m % 60
  return remain ? `${h}小时${remain}分钟` : `${h}小时`
}

/** 获取本周的周一~周日范围 */
export function getWeekRange(date: Date = new Date()): { monday: Date; sunday: Date } {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

/** 获取某个月的所有日期（含前后 padding） */
export function getMonthDays(year: number, month: number): { date: Date; isCurrentMonth: boolean }[] {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const days: { date: Date; isCurrentMonth: boolean }[] = []
  // pad with prev month
  const startPad = first.getDay()
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    days.push({ date: d, isCurrentMonth: false })
  }
  for (let i = 1; i <= last.getDate(); i++) {
    const d = new Date(year, month, i)
    days.push({ date: d, isCurrentMonth: true })
  }
  // pad to fill last row
  while (days.length % 7 !== 0) {
    const lastDay = days[days.length - 1].date
    const d = new Date(lastDay)
    d.setDate(d.getDate() + 1)
    days.push({ date: d, isCurrentMonth: false })
  }
  return days
}
