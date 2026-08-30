import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type {
  GuardVisitLog,
  GuardSessionActivity,
  GuardPermissionLight,
  GuardContact,
  GuardCrashLog,
} from '../../modules/guard/useGuard'

function visit(overrides: Record<string, any> = {}): GuardVisitLog {
  return { id: `v${Math.random().toString(36).slice(2, 8)}`, at: '2026-08-27T08:00:00.000Z', action: '访问守护室', ...overrides }
}

/** 本地时区某时刻的 ISO 串，避免测试随 TZ 漂移 */
function atLocal(y: number, m: number, d: number, hour: number): string {
  return new Date(y, m - 1, d, hour).toISOString()
}

function session(overrides: Record<string, any> = {}): GuardSessionActivity {
  return { id: `s${Math.random().toString(36).slice(2, 8)}`, at: '2026-08-27T08:00:00.000Z', action: '会话活动', ...overrides }
}

function perm(key: string, status: GuardPermissionLight['status'] = 'authorized'): GuardPermissionLight {
  const statusText = status === 'authorized' ? '已授权' : status === 'unauthorized' ? '未授权' : '已撤销'
  return { key, label: key, status, statusText }
}

function contact(name: string, priority: GuardContact['priority'] = 'secondary'): GuardContact {
  return { id: `c${Math.random().toString(36).slice(2, 8)}`, name, phone: '000', priority }
}

function crash(level: GuardCrashLog['level'] = 'recovered'): GuardCrashLog {
  return { id: `cr${Math.random().toString(36).slice(2, 8)}`, at: '2026-08-27T08:00:00.000Z', level, message: level }
}

interface GuardProps {
  visits?: GuardVisitLog[]
  sessions?: GuardSessionActivity[]
  perms?: GuardPermissionLight[]
  anonymousMode?: boolean
  dataReflux?: boolean
  externalLinkControl?: boolean
  contacts?: GuardContact[]
  crashes?: GuardCrashLog[]
}

function baseProps(overrides: GuardProps = {}) {
  return {
    visits: [],
    sessions: [],
    perms: [],
    anonymousMode: false,
    dataReflux: false,
    externalLinkControl: true,
    contacts: [],
    crashes: [],
    ...overrides,
  }
}

async function mountPanel(overrides: GuardProps = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../GuardArchivePanel.vue')
  const wrapper = mount(mod.default, { props: baseProps(overrides) })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('guard-analytics · 守护档案引擎', () => {
  const NOW = new Date('2026-08-27T12:00:00')

  it('概览统计造访/天数/权限/待受理', async () => {
    const { shieldOverview } = await import('../../modules/guard/guard-analytics')
    const ov = shieldOverview(
      [visit({ at: '2026-08-27T08:00:00Z' }), visit({ at: '2026-08-26T08:00:00Z' }), visit({ at: '2026-08-26T09:00:00Z' })],
      [session()],
      [perm('a', 'authorized'), perm('b', 'unauthorized')],
      { anonymousMode: true, dataReflux: false, externalLinkControl: true },
      [contact('甲', 'primary')],
    )
    expect(ov.totalVisits).toBe(3)
    expect(ov.activeDays).toBe(2)
    expect(ov.totalSessions).toBe(1)
    expect(ov.permissionCount).toBe(2)
    expect(ov.pendingCount).toBe(1)
    expect(ov.handledRate).toBe(50)
    expect(ov.privacyActive).toBe(3)
    expect(ov.hasPrimaryContact).toBe(true)
  })

  it('节奏统计周频与连续天数', async () => {
    const { guardRhythm } = await import('../../modules/guard/guard-analytics')
    const rhy = guardRhythm([
      visit({ at: atLocal(2026, 8, 27, 8) }),
      visit({ at: atLocal(2026, 8, 26, 8) }),
      visit({ at: atLocal(2026, 8, 25, 8) }),
    ], NOW)
    expect(rhy.consecutiveDays).toBe(3)
    expect(rhy.weeklyVisits).toBe(3)
    expect(rhy.preferredHour).toBe(8)
  })

  it('无联系人给最低应急准备分', async () => {
    const { shieldHealth } = await import('../../modules/guard/guard-analytics')
    const health = shieldHealth([], [], { anonymousMode: false, dataReflux: true, externalLinkControl: true }, [], NOW)
    expect(health.readiness).toBe(3)
    expect(health.score).toBeLessThanOrEqual(100)
  })

  it('有主联系人与隐私守护分提升', async () => {
    const { shieldHealth } = await import('../../modules/guard/guard-analytics')
    const h = shieldHealth(
      [],
      [perm('a', 'authorized'), perm('b', 'authorized'), perm('c', 'authorized'), perm('d', 'authorized')],
      { anonymousMode: true, dataReflux: false, externalLinkControl: true },
      [contact('甲', 'primary'), contact('乙')],
      NOW,
    )
    expect(h.readiness).toBe(25)
    expect(h.permission).toBe(40)
    expect(h.score).toBeGreaterThan(50)
  })

  it('未受理光点与世界异常进洞察', async () => {
    const { guardInsights } = await import('../../modules/guard/guard-analytics')
    const ins = guardInsights(
      [visit()],
      [],
      [perm('a', 'unauthorized')],
      { anonymousMode: false, dataReflux: true, externalLinkControl: true },
      [],
      [crash('error')],
      NOW,
    )
    expect(ins.some(s => s.includes('权限光点尚未受理'))).toBe(true)
    expect(ins.some(s => s.includes('异常'))).toBe(true)
  })
})

describe('GuardArchivePanel 守护档案面板', () => {
  it('空状态呈现守候文案', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('守护档案')
    expect(wrapper.text()).toContain('拢成一册安放')
  })

  it('展示概览指标与权限光点状态', async () => {
    const wrapper = await mountPanel({
      visits: [visit()],
      perms: [perm('数据安全', 'authorized'), perm('人身安全', 'unauthorized')],
    })
    expect(wrapper.text()).toContain('造访次数')
    expect(wrapper.text()).toContain('权限光点')
    expect(wrapper.text()).toContain('待受理')
    expect(wrapper.text()).toContain('数据安全')
    expect(wrapper.text()).toContain('未授权')
  })

  it('已到访时展示节律摘要', async () => {
    const wrapper = await mountPanel({
      visits: [visit({ at: atLocal(2026, 8, 27, 8) }), visit({ at: atLocal(2026, 8, 26, 9) })],
    })
    expect(wrapper.text()).toMatch(/近 7 天回到这里/)
    expect(wrapper.text()).toMatch(/常于 8 点来访/)
  })
})