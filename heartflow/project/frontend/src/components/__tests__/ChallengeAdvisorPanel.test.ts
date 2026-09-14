import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function makeHabit(overrides: Record<string, any> = {}) {
  return {
    id: 'h1',
    title: '每日阅读',
    description: '',
    icon: '📚',
    difficulty: 'medium',
    frequency: 'daily',
    target: 1,
    streak: 10,
    bestStreak: 15,
    totalCompleted: 30,
    enabled: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedDates: [
      '2026-08-01', '2026-08-02', '2026-08-03', '2026-08-04', '2026-08-05',
      '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10',
    ],
    ...overrides,
  }
}

function makeHabitB(overrides: Record<string, any> = {}) {
  return makeHabit({
    id: 'h2',
    title: '晨间冥想',
    icon: '🧘',
    difficulty: 'easy',
    completedDates: [
      '2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07',
      '2026-08-08', '2026-08-09',
    ],
    ...overrides,
  })
}

async function mountPanel(habits: any[], challenges: any[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {} }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../ChallengeAdvisorPanel.vue')
  return mount(mod.default, { props: { habits, challenges } })
}

describe('ChallengeAdvisorPanel 挑战顾问', () => {
  beforeEach(() => {
    vi.resetModules()
    ;(globalThis as any).localStorage = createMockStorage()
    invalidateCache()
  })

  it('渲染标题与习惯画像', async () => {
    const wrapper = await mountPanel([makeHabit()])
    expect(wrapper.text()).toContain('挑战顾问')
    expect(wrapper.text()).toContain('完成率')
    expect(wrapper.text()).toContain('平均连续')
    expect(wrapper.text()).toContain('10')
  })

  it('展示难度评估', async () => {
    const wrapper = await mountPanel([makeHabit()])
    expect(wrapper.text()).toContain('难度评估')
    expect(wrapper.text()).toContain('简单')
    expect(wrapper.text()).toContain('中等')
  })

  it('展示智能推荐列表', async () => {
    const wrapper = await mountPanel([makeHabit(), makeHabitB()])
    // 推荐内容来自 CHALLENGE_PATTERNS 标题池
    expect(wrapper.text()).toContain('智能推荐')
    expect(wrapper.findAll('.cap-rec').length).toBeGreaterThan(0)
  })

  it('点击采纳触发 adopt 事件', async () => {
    const wrapper = await mountPanel([makeHabit(), makeHabitB()])
    const recBtn = wrapper.find('.cap-btn')
    await recBtn.trigger('click')
    expect(wrapper.emitted('adopt')).toBeTruthy()
    const payload = wrapper.emitted('adopt')![0][0] as any
    expect(payload).toHaveProperty('title')
    expect(payload).toHaveProperty('duration')
  })

  it('无活跃习惯时展示空状态', async () => {
    const wrapper = await mountPanel([makeHabit({ enabled: false })])
    expect(wrapper.text()).toContain('还没有足够数据生成推荐')
  })
})