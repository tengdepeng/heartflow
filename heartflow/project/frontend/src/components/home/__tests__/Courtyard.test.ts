import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function baseStorage(overrides: Record<string, any> = {}) {
  return {
    version: 10,
    kvStore: {},
    sessions: [],
    emotions: [],
    notes: [],
    crystals: [],
    goals: [],
    ...overrides,
  }
}

async function mountCourtyard(storageObj: any) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify(storageObj))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../Courtyard.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function completedTodayValue(wrapper: any): string {
  const row = wrapper
    .findAll('.preview-row')
    .find((r: any) => r.find('.preview-label').text() === '今日完成')!
  return row.find('.preview-value').text()
}

describe('Courtyard 庭院·今日口径', () => {
  afterEach(() => vi.useRealTimers())

  it('守卫：本机须为东八区', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
  })

  it('习惯树「今日完成」按本地日历日统计（东八区跨 UTC 日界）', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 钉死「现在」为本地 2026-03-15 10:00（= UTC 2026-03-15 02:00），本地与 UTC 同日
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    // 本地 03-15 00:30（UTC 归 03-14）→ 缺陷写法（UTC 切片）会错算到「昨天」，修复后算「今日」
    const doneEarly = {
      id: 'g1', title: '早起', status: 'completed',
      updatedAt: '2026-03-14T16:30:00.000Z',
    }
    // 本地 03-14 23:00 → 确属昨天，两侧写法都不计入
    const doneYesterday = {
      id: 'g2', title: '旧习惯', status: 'completed',
      updatedAt: '2026-03-14T15:00:00.000Z',
    }
    // 进行中，不应计入「今日完成」
    const active = { id: 'g3', title: '坚持', status: 'active' }
    const wrapper = await mountCourtyard(
      baseStorage({ goals: [doneEarly, doneYesterday, active] }),
    )
    // 修复后今日完成=1；缺陷后=0
    expect(completedTodayValue(wrapper)).toBe('1')
  })
})
