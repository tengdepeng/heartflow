// ============================================================
// 守护室 · 守护档案分析引擎（guard-analytics）
// 从访问、权限光点、隐私守护、应急准备与崩溃恢复里读出"守护的气象"：
// 守护概览、守护节奏、护伞健康度、温和洞察。
// 全纯函数、本地计算、零网络出口（守宪法第 1 条）。
// ============================================================

import type {
  GuardVisitLog,
  GuardSessionActivity,
  GuardPermissionLight,
  GuardContact,
  GuardCrashLog,
} from './useGuard'

const DAY = 86_400_000

function dayKey(ts: number): string {
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function tsAt(v: string | undefined | null): number {
  if (!v) return 0
  const t = new Date(v).getTime()
  return isFinite(t) ? t : 0
}

/** 隐私守护的当前姿态（读自 useGuard 单例去包后的普通对象） */
export interface GuardPrivacyPosture {
  /** 匿名模式 */
  anonymousMode: boolean
  /** 数据回流（开=内联自动化，与本引擎的"不外发"守护语义相反） */
  dataReflux: boolean
  /** 外部链接控制 */
  externalLinkControl: boolean
}

// ---- 守护概览 ----

export interface ShieldOverview {
  /** 总造访次数 */
  totalVisits: number
  /** 发生过造访的天数 */
  activeDays: number
  /** 会话活动记录数 */
  totalSessions: number
  /** 权限光点总数 */
  permissionCount: number
  /** 已受理（授权/撤销，非"未授权"）的光点数 */
  handledCount: number
  /** 待受理（未授权）光点数 */
  pendingCount: number
  /** 已受理率 0-100 */
  handledRate: number
  /** 开启的隐私守护项数 0-3 */
  privacyActive: number
  /** 紧急联系人总数 */
  contactCount: number
  /** 是否留有主（primary）联系人 */
  hasPrimaryContact: boolean
}

export function shieldOverview(
  visits: GuardVisitLog[],
  sessions: GuardSessionActivity[],
  perms: GuardPermissionLight[],
  privacy: GuardPrivacyPosture,
  contacts: GuardContact[],
): ShieldOverview {
  const daySet = new Set<string>()
  for (const v of visits) {
    const t = tsAt(v.at)
    if (t) daySet.add(dayKey(t))
  }
  const handledCount = perms.filter(p => p.status !== 'unauthorized').length
  const pendingCount = perms.filter(p => p.status === 'unauthorized').length
  const total = perms.length || 0

  let privacyActive = 0
  if (privacy.anonymousMode) privacyActive++
  if (!privacy.dataReflux) privacyActive++
  if (privacy.externalLinkControl) privacyActive++

  return {
    totalVisits: visits.length,
    activeDays: daySet.size,
    totalSessions: sessions.length,
    permissionCount: total,
    handledCount,
    pendingCount,
    handledRate: total > 0 ? Math.round((handledCount / total) * 100) : 0,
    privacyActive,
    contactCount: contacts.length,
    hasPrimaryContact: contacts.some(c => c.priority === 'primary'),
  }
}

// ---- 守护节奏 ----

export interface GuardRhythm {
  /** 近 7 天造访次数 */
  weeklyVisits: number
  /** 已连续造访的天数（今日有则从今日，今日无则昨日回溯） */
  consecutiveDays: number
  /** 造访时段偏好（0-23 众数） */
  preferredHour: number | null
  /** 最近一次造访时刻 */
  lastVisit: string | null
}

export function guardRhythm(visits: GuardVisitLog[], now: Date = new Date()): GuardRhythm {
  const nowT = now.getTime()
  const weekAgo = nowT - 7 * DAY
  const daySet = new Set<string>()
  const hourHist = new Map<number, number>()
  let weekly = 0
  let lastVisit: string | null = null

  for (const v of visits) {
    const t = tsAt(v.at)
    if (!t) continue
    daySet.add(dayKey(t))
    hourHist.set(new Date(t).getHours(), (hourHist.get(new Date(t).getHours()) || 0) + 1)
    if (t >= weekAgo) weekly++
    if (lastVisit === null || t > tsAt(lastVisit)) lastVisit = v.at
  }

  const anchorDay = daySet.has(dayKey(nowT)) ? startOfDay(nowT) : startOfDay(nowT) - DAY
  let consecutive = 0
  let cursor = anchorDay
  while (daySet.has(dayKey(cursor))) {
    consecutive++
    cursor -= DAY
  }

  let preferredHour: number | null = null
  let max = 0
  for (const [h, c] of hourHist) if (c > max) { max = c; preferredHour = h }

  return { weeklyVisits: weekly, consecutiveDays: consecutive, preferredHour, lastVisit }
}

// ---- 护伞健康度（0-100）----

export interface ShieldHealth {
  score: number
  /** 权限完备 0-40 */
  permission: number
  /** 隐私守护 0-30 */
  privacy: number
  /** 应急准备 0-30 */
  readiness: number
  label: string
}

export function shieldHealth(
  visits: GuardVisitLog[],
  perms: GuardPermissionLight[],
  privacy: GuardPrivacyPosture,
  contacts: GuardContact[],
  _now: Date = new Date(),
): ShieldHealth {
  const ov = shieldOverview(visits, [], perms, privacy, contacts)

  // 权限完备：已受理率 100% 得满分 40
  const permission = Math.min(40, Math.round((ov.handledRate / 100) * 40))

  // 隐私守护：3 项守护项满 30
  const privacyScore = Math.min(30, Math.round((ov.privacyActive / 3) * 30))

  // 应急准备：主联系人 +5、每名联系人 +5，各配 10 底，封顶 30；无联系人给最低提示分
  const readiness = ov.contactCount === 0
    ? 3
    : Math.min(30, 10 + ov.contactCount * 5 + (ov.hasPrimaryContact ? 5 : 0))

  const score = Math.round(permission + privacyScore + readiness)
  const label = score >= 80 ? '铜墙铁壁' : score >= 60 ? '戒备有素' : score >= 40 ? '尚可布防' : '亟待加固'
  return { score, permission, privacy: privacyScore, readiness, label }
}

// ---- 温和洞察（只呈现，不催促） ----

export function guardInsights(
  visits: GuardVisitLog[],
  sessions: GuardSessionActivity[],
  perms: GuardPermissionLight[],
  privacy: GuardPrivacyPosture,
  contacts: GuardContact[],
  crashes: GuardCrashLog[],
  now: Date = new Date(),
  limit = 4,
): string[] {
  const out: string[] = []
  const ov = shieldOverview(visits, sessions, perms, privacy, contacts)
  const rh = guardRhythm(visits, now)
  const health = shieldHealth(visits, perms, privacy, contacts, now)

  if (health.score > 0) out.push(`这间守护室的整体防线是「${health.label}」。`)

  if (ov.pendingCount > 0) {
    out.push(`还有 ${ov.pendingCount} 枚权限光点尚未受理，去治理台点亮其一。`)
  }
  if (ov.hasPrimaryContact) {
    out.push(`主联系人已就位${ov.contactCount > 1 ? `，另备 ${ov.contactCount - 1} 位` : ''}，应急有人接应。`)
  } else if (ov.contactCount > 0) {
    out.push('几位联系人虽在，但还缺一位「主联系人」。')
  } else {
    out.push('还没有紧急联系人——留一位，应急时心里有底。')
  }
  if (ov.privacyActive === 0) {
    out.push('隐私守护尚未开启任何开关，宪法第 1 条的本地私有可以由你亲手加固。')
  }
  if (rh.weeklyVisits >= 5) {
    out.push(`这周回到守护室 ${rh.weeklyVisits} 次，守护的习惯正沉淀。`)
  }
  const hardCrashes = crashes.filter(c => c.level !== 'recovered').length
  if (hardCrashes > 0) {
    out.push(`近期有 ${hardCrashes} 次异常已被系统兜底恢复。`)
  } else if (crashes.length > 0) {
    out.push('历次异常都已平稳恢复，系统在自我修复。')
  }

  return out.slice(0, limit)
}