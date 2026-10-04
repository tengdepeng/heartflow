import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const MOOD_KEY = 'hf:home:entrance:todayMood'

function baseStorage(overrides: Record<string, any> = {}) {
  return {
    version: 10,
    kvStore: {},
    sessions: [],
    emotions: [],
    notes: [],
    crystals: [],
    ...overrides,
  }
}

async function mountHall(storageObj: any) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify(storageObj))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../EntranceHall.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function emotionGlimpse(wrapper: any): string {
  const card = wrapper
    .findAll('.glimpse-card')
    .find((c: any) => c.text().includes('今日心绪'))!
  return card.find('.glimpse-value').text()
}

describe('EntranceHall 玄关·今日口径', () => {
  afterEach(() => vi.useRealTimers())

  it('守卫：本机须为东八区', () => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
  })

  it('今日一瞥按本地日历日统计（东八区跨 UTC 日界）', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 钉死「现在」为本地 2026-03-15 10:00（= UTC 2026-03-15 02:00），本地与 UTC 同日
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))
    // 本地 03-15 00:30 → UTC 归 03-14；缺陷写法（startsWith/slice UTC 日期）会错算到「昨天」
    const earlyToday = { id: 'e1', type: 'happy', note: '', createdAt: '2026-03-14T16:30:00.000Z' }
    // 本地 03-14 23:00 → 确属昨天，两侧写法都不计入
    const yesterday = { id: 'e2', type: 'calm', note: '', createdAt: '2026-03-14T15:00:00.000Z' }
    const wrapper = await mountHall(baseStorage({ emotions: [earlyToday, yesterday] }))
    expect(emotionGlimpse(wrapper)).toBe('1')
  })

  it('今日心情按本地日历日读取（东八区跨 UTC 日界）', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 本地 03-15 03:00（= UTC 03-14 19:00）：本地日 != UTC 日，刻意制造两者分裂
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
    const wrapper = await mountHall(
      baseStorage({ kvStore: { [MOOD_KEY]: { type: 'happy', date: '2026-03-15' } } }),
    )
    // 修复后：存的是本地键 '2026-03-15'，与本地今天一致 → 显示「已记录」
    // 缺陷后：与 UTC 切片 '2026-03-14' 不一致 → 不显示
    expect(wrapper.find('.today-mood-status').exists()).toBe(true)
  })

  it('记录心情写入本地日历日键（东八区跨 UTC 日界）', async () => {
    process.env.TZ = 'Asia/Shanghai'
    vi.useFakeTimers()
    // 本地 03-15 03:00（= UTC 03-14 19:00）：本地日 != UTC 日
    vi.setSystemTime(new Date(2026, 2, 15, 3, 0, 0))
    const wrapper = await mountHall(baseStorage())
    const btn = wrapper.find('.mood-btn')
    await btn.trigger('click')
    await wrapper.vm.$nextTick()
    const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
    const stored = JSON.parse(raw)
    // 修复后写入本地键 '2026-03-15'；缺陷后写入 UTC 切片 '2026-03-14'
    expect(stored.kvStore[MOOD_KEY].date).toBe('2026-03-15')
  })
})
