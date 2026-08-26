import { describe, it, expect } from 'vitest'
import { capsuleStatus, countdownText, capsuleVault, CAPSULE_STATUS_META } from '../capsule-vault'
import type { TimeCapsule } from '../index'

function mk(overrides: Partial<TimeCapsule> = {}): TimeCapsule {
  return {
    id: 'c1',
    title: '测试胶囊',
    items: [],
    createdAt: new Date('2026-01-01').toISOString(),
    openDate: '2026-01-01',
    openedAt: null,
    ...overrides,
  }
}

function iso(daysFromNow: number, base: Date): string {
  const d = new Date(base.getTime() + daysFromNow * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const NOW = new Date('2026-06-15T12:00:00')

describe('capsuleStatus', () => {
  it('已开启 → open', () => {
    expect(capsuleStatus(mk({ openedAt: '2026-06-01T00:00:00' }), NOW)).toBe('open')
  })
  it('未到日 → sealed', () => {
    expect(capsuleStatus(mk({ openDate: iso(10, NOW) }), NOW)).toBe('sealed')
  })
  it('今日 → openable', () => {
    expect(capsuleStatus(mk({ openDate: iso(0, NOW) }), NOW)).toBe('openable')
  })
  it('已过日未启封 → overdue', () => {
    expect(capsuleStatus(mk({ openDate: iso(-3, NOW) }), NOW)).toBe('overdue')
  })
})

describe('countdownText', () => {
  it('给出对应文案', () => {
    expect(countdownText(mk({ openDate: iso(5, NOW) }), NOW)).toBe('还有 5 天开启')
    expect(countdownText(mk({ openDate: iso(0, NOW) }), NOW)).toContain('今日可开启')
    expect(countdownText(mk({ openDate: iso(-2, NOW) }), NOW)).toBe('已逾 2 天，启封吧')
    expect(countdownText(mk({ openedAt: 'x' }), NOW)).toBe('已开启')
  })
})

describe('capsuleVault', () => {
  it('统计各状态与催启/即将开启清单', () => {
    const capsules = [
      mk({ id: 'a', openDate: iso(30, NOW) }),
      mk({ id: 'b', openDate: iso(0, NOW) }),
      mk({ id: 'c', openDate: iso(-5, NOW) }),
      mk({ id: 'd', openDate: iso(-5, NOW), openedAt: '2026-06-01T00:00:00' }),
    ]
    const v = capsuleVault(capsules, NOW)
    expect(v.total).toBe(4)
    expect(v.sealed).toBe(1)
    expect(v.openable).toBe(1)
    expect(v.overdue).toBe(1)
    expect(v.open).toBe(1)
    expect(v.overdueList.map((c) => c.id)).toContain('c')
    // 未开启按紧迫升序：逾末(-5) < 今日(0) < 未来(30) → 下一封为 c
    expect(v.nextToOpen?.id).toBe('c')
  })

  it('imminent 前五与 recentlyOpened 按时间排', () => {
    const opened = mk({ id: 'x', openDate: '2026-05-01', openedAt: '2026-06-10T00:00:00' })
    const v = capsuleVault([mk({ id: 'a', openDate: iso(1, NOW) }), opened], NOW)
    expect(v.imminent[0].id).toBe('a')
    expect(v.recentlyOpened[0].id).toBe('x')
  })

  it('空库全零不崩溃', () => {
    const v = capsuleVault([], NOW)
    expect(v.total).toBe(0)
    expect(v.nextToOpen).toBeNull()
    expect(v.imminent).toHaveLength(0)
  })

  it('存在全部状态元数据', () => {
    for (const s of Object.keys(CAPSULE_STATUS_META)) expect(CAPSULE_STATUS_META[s as keyof typeof CAPSULE_STATUS_META].label).toBeTruthy()
  })
})