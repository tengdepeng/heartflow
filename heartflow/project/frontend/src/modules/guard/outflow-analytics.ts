// ============================================================
// 守护室 · 数据流出档案引擎（外流气象）
// 借鉴「输出管理 / 快贴 / 互传 / 剪贴板管理 / 文件管理器」的
// 去向透明化理念，把每一次数据离开本设备的记录，
// 汇聚为一张「外流态势图」——通过哪些渠道、多频繁、最近有无。
// 仅统计元数据（渠道 / 时间），绝不触碰任何数据载荷。
// 不写外部、不入网，全部本地计算。
// 守宪法第1条本地私有、第3条可持续。
// ============================================================

import type { GuardOutflowLog, OutflowChannel } from '../../engine/data-outflow'

export interface OutflowChannelMeta {
  channel: OutflowChannel
  label: string
  icon: string
  color: string
}

export const OUTFLOW_CHANNELS: OutflowChannelMeta[] = [
  { channel: 'export', label: '导出', icon: '📤', color: '#7a8a9a' },
  { channel: 'sync', label: '同步', icon: '🔄', color: '#8a7a6a' },
  { channel: 'external-ai', label: '外部AI', icon: '🤖', color: '#c4a0b8' },
  { channel: 'share', label: '分享', icon: '🔗', color: '#a08ac4' },
  { channel: 'backup', label: '备份', icon: '💾', color: '#6a8a7a' },
]

export const OUTFLOW_META: Record<OutflowChannel, OutflowChannelMeta> =
  Object.fromEntries(OUTFLOW_CHANNELS.map(c => [c.channel, c])) as Record<OutflowChannel, OutflowChannelMeta>

// ---- 概览 ----

export interface OutflowOverview {
  total: number
  coveredChannels: number
  todayCount: number
  last7Count: number
  topChannel: OutflowChannel | null
  topChannelCount: number
  latestAt: string | null
}

const DAY = 86_400_000

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function outflowOverview(logs: GuardOutflowLog[], now: Date = new Date()): OutflowOverview {
  const nowTs = now.getTime()
  const todayStart = startOfDay(nowTs)
  const weekStart = nowTs - 7 * DAY

  const todayCount = logs.filter(l => new Date(l.at).getTime() >= todayStart).length
  const last7Count = logs.filter(l => new Date(l.at).getTime() >= weekStart).length

  const counts = new Map<OutflowChannel, number>()
  logs.forEach(l => counts.set(l.channel, (counts.get(l.channel) || 0) + 1))
  let topChannel: OutflowChannel | null = null
  let topChannelCount = 0
  counts.forEach((c, ch) => {
    if (c > topChannelCount) {
      topChannelCount = c
      topChannel = ch
    }
  })

  return {
    total: logs.length,
    coveredChannels: counts.size,
    todayCount,
    last7Count,
    topChannel,
    topChannelCount,
    latestAt: logs[0]?.at ?? null, // logs.unshift 最新在前
  }
}

// ---- 渠道分布 ----

export interface OutflowChannelRow {
  channel: OutflowChannel
  label: string
  icon: string
  color: string
  count: number
  pct: number
}

export function channelDistribution(logs: GuardOutflowLog[]): OutflowChannelRow[] {
  const total = logs.length || 1
  return OUTFLOW_CHANNELS.map((meta) => {
    const count = logs.filter(l => l.channel === meta.channel).length
    return { ...meta, count, pct: Math.round((count / total) * 100) }
  }).filter(r => r.count > 0)
}

// ---- 近 7 天节奏 ----

export interface OutflowDailyRow {
  /** 本地日期 YYYY-MM-DD */
  date: string
  label: string
  count: number
}

export function outflowRhythm(logs: GuardOutflowLog[], now: Date = new Date()): OutflowDailyRow[] {
  const days: OutflowDailyRow[] = []
  for (let i = 6; i >= 0; i--) {
    const ts = startOfDay(now.getTime()) - i * DAY
    const key = new Date(ts)
    const date = `${key.getFullYear()}-${String(key.getMonth() + 1).padStart(2, '0')}-${String(key.getDate()).padStart(2, '0')}`
    days.push({ date, label: i === 0 ? '今天' : `${key.getMonth() + 1}/${key.getDate()}`, count: 0 })
  }

  // 预建索引
  const index = new Map<string, number>()
  days.forEach((d, i) => index.set(d.date, i))

  logs.forEach(l => {
    const d = new Date(l.at)
    if (Number.isNaN(d.getTime())) return
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const idx = index.get(date)
    if (idx !== undefined) days[idx].count++
  })

  return days
}

// ---- 温和洞察 ----

export function outflowInsights(
  logs: GuardOutflowLog[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const insights: string[] = []
  const ov = outflowOverview(logs, now)

  if (logs.length === 0) {
    return ['还没有数据离开本设备，这本身就是件值得欣慰的事。']
  }

  const dist = channelDistribution(logs)
  if (ov.topChannel) {
    const meta = OUTFLOW_META[ov.topChannel]
    insights.push(`${meta.icon} 最常通过「${meta.label}」流出，共 ${ov.topChannelCount} 次。`)
  }

  if (ov.coveredChannels >= 4) {
    insights.push(`涉及 ${ov.coveredChannels} 种渠道：${dist.map(d => `${d.icon}${d.label}`).join('、')}，去向较为多元。`)
  }

  if (ov.total >= 30 || ov.coveredChannels >= 4) {
    insights.push('数据频繁离开设备时，记得只发送必要信息、对去向保持觉察。')
  }

  if (ov.todayCount > 0) {
    insights.push(`今天已有 ${ov.todayCount} 次数据流出，注意随身数据的去向。`)
  } else if (ov.last7Count === 0 && logs.length > 0) {
    insights.push('近 7 天没有新的流出记录，数据相当安稳。')
  }

  const recent = outflowRhythm(logs, now)
  const activeDay = recent.reduce((best, d) => (d.count > best.count ? d : best), recent[0])
  if (activeDay && activeDay.count > 3) {
    insights.push(`近一周最活跃的一天是 ${activeDay.label}，当天流出 ${activeDay.count} 次。`)
  }

  const backupCount = logs.filter(l => l.channel === 'backup').length
  if (backupCount > 0) {
    insights.push(`你进行过 ${backupCount} 次备份，这是守护数据的好习惯。`)
  }

  return insights.slice(0, limit)
}