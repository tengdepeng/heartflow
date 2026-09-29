// ============================================================
// 小组件快照组合：每日一言取词 + 系统小组件快照构建
// 供 DesktopWidgetView（桌面小组件窗）与 WidgetBox（主窗内嵌）共用，
// 输出结构与 HeartflowWidgetProvider（Android）读取字段一一对应。
// ============================================================

import type { SystemWidgetAnchor, SystemWidgetSnapshot } from './index'

/** 每日一言库（按日期轮换，离线可用） */
export const WIDGET_QUOTES = [
  { text: '心之所向，素履以往。', author: '《易传》' },
  { text: '不积跬步，无以至千里。', author: '荀子' },
  { text: '凡是过往，皆为序章。', author: '《暴风雨》' },
  { text: '知止而后有定，定而后能静。', author: '《大学》' },
  { text: '往者不可谏，来者犹可追。', author: '《论语》' },
  { text: 'tranquility is not absence of storm, but calm within.', author: 'Rumi' },
  { text: '慢慢来，比较快。', author: '心流旅人' },
  { text: '你的任务不是寻找爱，而是寻找并破除内心的一切阻碍。', author: 'Rumi' },
  { text: '种一棵树最好的时间是十年前，其次是现在。', author: '谚语' },
  { text: '万物皆有裂痕，那是光进来的地方。', author: 'Leonard Cohen' },
] as const

/** 按日期取当日一言 */
function quoteOfDay(now = Date.now()): { text: string; author: string } {
  const day = Math.floor(now / 86400000)
  return WIDGET_QUOTES[day % WIDGET_QUOTES.length]
}

/** 气象心情（季节推断，按公历二分二至近似划分）
 *  注意：春季起点必须限定 m === 3（不能写 m >= 3 && today >= 21），
 *  否则 10~12 月 21 日之后会被误判为春。 */
function seasonOf(now = new Date()): { label: string; icon: string; tip: string; range: string } {
  const m = now.getMonth() + 1
  const today = now.getDate()
  if ((m === 3 && today >= 21) || m === 4 || m === 5 || (m === 6 && today < 21)) {
    return { label: '春 · 生发', icon: '🌸', tip: '万物舒展，适合播种新的心锚', range: '3月春分 → 6月夏至' }
  }
  if (m === 6 || m === 7 || m === 8 || (m === 9 && today < 23)) {
    return { label: '夏 · 繁盛', icon: '☀️', tip: '精力旺盛，宜专注深耕', range: '6月夏至 → 9月秋分' }
  }
  if (m === 9 || m === 10 || m === 11 || (m === 12 && today < 22)) {
    return { label: '秋 · 收敛', icon: '🍂', tip: '万物归藏，适合回顾与整理', range: '9月秋分 → 12月冬至' }
  }
  return { label: '冬 · 贮藏', icon: '❄️', tip: '静以养藏，宜休憩与沉淀', range: '12月冬至 → 3月春分' }
}

/** 组合系统小组件快照（quote/season 内部取，心锚与专注状态由调用侧注入） */
function build(input: {
  anchors: SystemWidgetAnchor[]
  timer: { status: string; clock: string; progress: number }
  emotion?: { todayCount: number; lastMood: string }
  note?: string
}): SystemWidgetSnapshot {
  const quote = quoteOfDay()
  const season = seasonOf()
  const anchors = input.anchors.slice(0, 6)
  return {
    quoteText: quote.text,
    quoteAuthor: quote.author,
    seasonLabel: season.label,
    seasonIcon: season.icon,
    anchorTop: anchors.map(a => a.title).slice(0, 3),
    anchors,
    timerStatus: input.timer.status,
    timer: {
      status: input.timer.status,
      clock: input.timer.clock,
      progress: Math.max(0, Math.min(100, Math.round(input.timer.progress))),
    },
    emotion: input.emotion ?? { todayCount: 0, lastMood: '' },
    note: { text: (input.note ?? '').trim() },
    updatedAt: Date.now(),
  }
}

export const composeWidgetSnapshot = { quoteOfDay, seasonOf, build }
