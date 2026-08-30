import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

interface HabitFixture {
  id: string
  text: string
  streak: number
  streakPct: number
  ticks: string[]
}

function habit(overrides: Partial<HabitFixture>): HabitFixture {
  return { id: `h${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text: '晨读', streak: 0, streakPct: 0, ticks: [], ...overrides }
}

async function mountPanel(habits: HabitFixture[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  const kv: Record<string, unknown> = {
    'hf:habits': habits,
    'hf:seeds': [],
    'hf:compass': [],
    'hf:goals': [],
    'hf:cocoons': [],
  }
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: kv, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../HabitReviewPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('HabitReviewPanel 习惯打卡档案面板', () => {
  it('无习惯时渲染标题与零统计', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('习惯打卡档案')
    expect(wrapper.text()).toContain('习惯')
    expect(wrapper.find('.hr-stats').exists()).toBe(true)
  })

  it('有打卡记录时渲染统计速览（今日/本周/累计）', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`
    const wrapper = await mountPanel([
      habit({ text: '晨读', streak: 5, streakPct: 16, ticks: [todayStr] }),
      habit({ text: '夜跑', streak: 0, streakPct: 0, ticks: [] }),
    ])
    expect(wrapper.text()).toContain('今日打卡')
    expect(wrapper.text()).toContain('本周人次')
    expect(wrapper.text()).toContain('晨读')
  })

  it('渲染打卡热图与坚持中清单', async () => {
    const wrapper = await mountPanel([
      habit({ text: '晨读', streak: 3, streakPct: 10, ticks: ['2026-08-26', '2026-08-27', '2026-08-28'] }),
      habit({ text: '冥想', streak: 1, streakPct: 3, ticks: ['2026-08-28'] }),
    ])
    expect(wrapper.find('.hr-heat-grid').exists()).toBe(true)
    expect(wrapper.text()).toContain('坚持中')
    expect(wrapper.text()).toContain('晨读')
  })

  it('易中断习惯进入停滞清单', async () => {
    const wrapper = await mountPanel([
      habit({ text: '日记', streak: 1, streakPct: 3, ticks: ['2026-08-27'] }),
    ])
    expect(wrapper.text()).toContain('易中断')
    expect(wrapper.text()).toContain('日记')
  })
})
