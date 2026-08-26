// ============================================================
// 守护档案分析引擎测试
// ============================================================
import { describe, expect, it } from 'vitest'
import type {
  GuardVisitLog,
  GuardSessionActivity,
  GuardPermissionLight,
  GuardContact,
  GuardCrashLog,
} from '../useGuard'
import {
  shieldOverview,
  guardRhythm,
  shieldHealth,
  guardInsights,
  type GuardPrivacyPosture,
} from '../guard-analytics'

// 固定基准 2026-08-22 12:00（本地时区）
const NOW = new Date(2026, 7, 22, 12, 0, 0)

function iso(daysAgo: number, hour = 10): string {
  const d = new Date(NOW)
  d.setDate(d.getDate() - daysAgo)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

function visit(daysAgo: number, hour = 10): GuardVisitLog {
  return { id: `v${daysAgo}-${hour}`, at: iso(daysAgo, hour), action: '访问守护室' }
}

function session(daysAgo: number): GuardSessionActivity {
  return { id: `s${daysAgo}`, at: iso(daysAgo), action: '活跃' }
}

function crash(daysAgo: number, level: GuardCrashLog['level']): GuardCrashLog {
  return { id: `c${daysAgo}`, at: iso(daysAgo), level, message: '' }
}

const DEFAULT_PERMS: GuardPermissionLight[] = [
  { key: 'data-security', label: '数据安全', status: 'authorized', statusText: '已授权' },
  { key: 'property-security', label: '财产安全', status: 'authorized', statusText: '已授权' },
  { key: 'personal-safety', label: '人身安全', status: 'unauthorized', statusText: '未授权' },
  { key: 'psychological-safety', label: '心理安全', status: 'authorized', statusText: '已授权' },
]

const DEFAULT_PRIVACY: GuardPrivacyPosture = {
  anonymousMode: false,
  dataReflux: false,
  externalLinkControl: true,
}

function contact(name: string, priority: GuardContact['priority']): GuardContact {
  return { id: name, name, phone: '138', priority }
}

describe('shieldOverview', () => {
  it('空状态下各项为零、无主联系人', () => {
    const ov = shieldOverview([], [], [], DEFAULT_PRIVACY, [])
    expect(ov.totalVisits).toBe(0)
    expect(ov.activeDays).toBe(0)
    expect(ov.totalSessions).toBe(0)
    expect(ov.contactCount).toBe(0)
    expect(ov.hasPrimaryContact).toBe(false)
    expect(ov.handledRate).toBe(0)
  })

  it('统计造访次数、活跃天数与会话', () => {
    const visits = [visit(0), visit(1), visit(1, 18), visit(5)]
    const ov = shieldOverview(visits, [session(0), session(2)], DEFAULT_PERMS, DEFAULT_PRIVACY, [])
    expect(ov.totalVisits).toBe(4)
    expect(ov.activeDays).toBe(3)
    expect(ov.totalSessions).toBe(2)
  })

  it('权限已受理率按非"未授权"计算', () => {
    const ov = shieldOverview([], [], DEFAULT_PERMS, DEFAULT_PRIVACY, [])
    expect(ov.permissionCount).toBe(4)
    expect(ov.handledCount).toBe(3)
    expect(ov.pendingCount).toBe(1)
    expect(ov.handledRate).toBe(75)
  })

  it('隐私守护项：匿名开、回流关、外链控 = 3', () => {
    const ov = shieldOverview([], [], DEFAULT_PERMS, {
      anonymousMode: true,
      dataReflux: false,
      externalLinkControl: true,
    }, [])
    expect(ov.privacyActive).toBe(3)
  })

  it('隐私守护项：全部关 = 0', () => {
    const ov = shieldOverview([], [], DEFAULT_PERMS, {
      anonymousMode: false,
      dataReflux: true,
      externalLinkControl: false,
    }, [])
    expect(ov.privacyActive).toBe(0)
  })

  it('主联系人识别', () => {
    const ov = shieldOverview([], [], DEFAULT_PERMS, DEFAULT_PRIVACY, [contact('a', 'secondary'), contact('b', 'primary')])
    expect(ov.contactCount).toBe(2)
    expect(ov.hasPrimaryContact).toBe(true)
  })
})

describe('guardRhythm', () => {
  it('空日志无节奏', () => {
    const rh = guardRhythm([], NOW)
    expect(rh.weeklyVisits).toBe(0)
    expect(rh.consecutiveDays).toBe(0)
    expect(rh.preferredHour).toBeNull()
    expect(rh.lastVisit).toBeNull()
  })

  it('连续造访天数（今日有从今日倒推）', () => {
    const visits = [visit(0), visit(1), visit(2)]
    const rh = guardRhythm(visits, NOW)
    expect(rh.consecutiveDays).toBe(3)
  })

  it('今日无则从昨日回溯', () => {
    const visits = [visit(1), visit(2)]
    const rh = guardRhythm(visits, NOW)
    expect(rh.consecutiveDays).toBe(2)
  })

  it('近 7 天造访计数', () => {
    const visits = [visit(0), visit(3), visit(6), visit(8)]
    const rh = guardRhythm(visits, NOW)
    expect(rh.weeklyVisits).toBe(3)
  })

  it('时段偏好取众数', () => {
    const visits = [visit(7), visit(6, 20), visit(5, 20)]
    const rh = guardRhythm(visits, NOW)
    expect(rh.preferredHour).toBe(20)
  })

  it('最近一次造访为最新时间', () => {
    const visits = [visit(5), visit(1), visit(3)]
    const rh = guardRhythm(visits, NOW)
    expect(rh.lastVisit).toBe(visits[1].at)
  })
})

describe('shieldHealth', () => {
  it('满配防线接近满分', () => {
    const allAuthorized: GuardPermissionLight[] = DEFAULT_PERMS.map(p => ({ ...p, status: 'authorized' as const }))
    const health = shieldHealth(
      [visit(0), visit(1), visit(2), visit(3), visit(4)],
      allAuthorized,
      { anonymousMode: true, dataReflux: false, externalLinkControl: true },
      [contact('a', 'primary'), contact('b', 'secondary'), contact('c', 'secondary')],
      NOW,
    )
    expect(health.permission).toBe(40)
    expect(health.privacy).toBe(30)
    expect(health.readiness).toBe(30)
    expect(health.score).toBe(100)
    expect(health.label).toBe('铜墙铁壁')
  })

  it('无联系人给最低应急分', () => {
    const health = shieldHealth([], DEFAULT_PERMS, DEFAULT_PRIVACY, [], NOW)
    expect(health.readiness).toBe(3)
  })

  it('主联系人显著抬升应急准备', () => {
    const withPrimary = shieldHealth([], DEFAULT_PERMS, DEFAULT_PRIVACY, [contact('a', 'primary')], NOW)
    const without = shieldHealth([], DEFAULT_PERMS, DEFAULT_PRIVACY, [contact('a', 'secondary')], NOW)
    expect(withPrimary.readiness).toBeGreaterThan(without.readiness)
  })

  it('标签随分数变化', () => {
    const empty = shieldHealth([], [], { anonymousMode: false, dataReflux: true, externalLinkControl: false }, [], NOW)
    expect(empty.label).toBe('亟待加固')
    const good = shieldHealth([], DEFAULT_PERMS, DEFAULT_PRIVACY, [contact('a', 'primary')], NOW)
    expect(['戒备有素', '尚可布防']).toContain(good.label)
  })
})

describe('guardInsights', () => {
  it('空状态给出一条温和提示', () => {
    const ins = guardInsights([], [], [], DEFAULT_PRIVACY, [], [], NOW, 10)
    expect(ins.length).toBeGreaterThan(0)
    expect(ins.some(s => s.includes('还没'))).toBe(true)
  })

  it('待受理光点与异常被点名', () => {
    const ins = guardInsights([], [], DEFAULT_PERMS, DEFAULT_PRIVACY, [contact('a', 'primary')], [crash(1, 'error')], NOW, 10)
    expect(ins.some(s => s.includes('1 枚权限光点'))).toBe(true)
    expect(ins.some(s => s.includes('异常'))).toBe(true)
  })

  it('limit 截断生效', () => {
    const quietPrivacy = { anonymousMode: false, dataReflux: true, externalLinkControl: false }
    const visits = [visit(0), visit(1), visit(2), visit(3), visit(4)]
    const all = guardInsights(visits, [], DEFAULT_PERMS, quietPrivacy, [], [crash(1, 'error')], NOW, 10)
    expect(all.length).toBeGreaterThan(4)
    const cut = guardInsights(visits, [], DEFAULT_PERMS, quietPrivacy, [], [crash(1, 'error')], NOW, 2)
    expect(cut.length).toBe(2)
  })

  it('高频回访与隐私全关提示', () => {
    const weekly = guardInsights([visit(0), visit(1), visit(2), visit(3), visit(4)], [], DEFAULT_PERMS, { anonymousMode: false, dataReflux: true, externalLinkControl: false }, [], [], NOW, 10)
    expect(weekly.some(s => s.includes('这周回到'))).toBe(true)
    expect(weekly.some(s => s.includes('本地私有'))).toBe(true)
  })
})