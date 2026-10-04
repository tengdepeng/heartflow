import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function crystal(overrides: Record<string, any> = {}) {
  return {
    id: `crystal_${Math.random().toString(36).slice(2, 8)}`,
    sessionId: 's1',
    color: '#a07c8c',
    intensity: 0.9,
    createdAt: '2026-08-25T08:00:00.000Z',
    shape: 'sphere',
    tags: ['阅读'],
    insight: '心流时刻',
    ...overrides,
  }
}

async function mountPanel(crystals: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals,
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../CrystalGalleryPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedCrystals(): any[] {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).crystals ?? []
}

describe('CrystalGalleryPanel 结晶画廊', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('结晶画廊')
    expect(wrapper.text()).toContain('尚无结晶')
  })

  it('展示结晶概览', async () => {
    const wrapper = await mountPanel([
      crystal({ shape: 'sphere', intensity: 0.95 }),
      crystal({ shape: 'octahedron', intensity: 0.6 }),
    ])
    expect(wrapper.text()).toContain('结晶概览')
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('均强度')
  })

  it('展示结晶列表与形状', async () => {
    const wrapper = await mountPanel([
      crystal({ shape: 'sphere' }),
      crystal({ shape: 'irregular', intensity: 0.2 }),
    ])
    expect(wrapper.text()).toContain('完美之晶')
    expect(wrapper.text()).toContain('残晶')
    expect(wrapper.text()).toContain('心流时刻')
  })

  it('展示标签与感悟', async () => {
    const wrapper = await mountPanel([
      crystal({ tags: ['阅读', '写作'], insight: '沉浸的一小时' }),
    ])
    expect(wrapper.text()).toContain('阅读')
    expect(wrapper.text()).toContain('沉浸的一小时')
  })

  it('删除结晶并持久化', async () => {
    const wrapper = await mountPanel([crystal({ id: 'c_del' })])
    const delBtn = wrapper.find('.cry-btn.danger')
    await delBtn.trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedCrystals().length).toBe(0)
    expect(wrapper.text()).toContain('尚无结晶')
  })

  it('今日结晶按本地日历日统计（东八区跨 UTC 日界）', async () => {
    // 守卫：本机须为东八区，否则「本地 00:30 / UTC 归前一天」样本对不具判别力
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(zone).toMatch(/Asia\/(Shanghai|Macau|Hong_Kong)|\+08:00/)
    process.env.TZ = 'Asia/Shanghai'
    // 钉死「现在」为本地 2026-03-15 10:00（= UTC 2026-03-15T02:00:00.000Z）
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 15, 10, 0, 0))

    // 本地 03-15 00:30 → UTC 归 03-14；缺陷写法（startsWith UTC 日期）会错算到「昨天」，
    // 修复写法（两侧都取本地键）应正确计入「今日」。
    const earlyToday = crystal({ id: 'c_early', createdAt: '2026-03-14T16:30:00.000Z' })
    // 本地 03-14 23:00 → 确属昨天，两侧写法都不计入
    const yesterday = crystal({ id: 'c_yest', createdAt: '2026-03-14T15:00:00.000Z' })

    const wrapper = await mountPanel([earlyToday, yesterday])
    const todayStat = wrapper.findAll('.cry-stat')
      .find(s => s.find('.cry-stat-label').text() === '今日')!
    expect(todayStat.find('.cry-stat-num').text()).toBe('1')

    vi.useRealTimers()
  })
})
