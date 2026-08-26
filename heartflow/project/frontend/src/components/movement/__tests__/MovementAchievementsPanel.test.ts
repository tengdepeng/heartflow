import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const ACHIEVEMENTS_KEY = 'hf:movement:achievements'
const RECORDS_KEY = 'hf:movement:records'
const RHYTHM_KEY = 'hf:movement:rhythm'

async function mountPanel(kv: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: kv,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../MovementAchievementsPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('MovementAchievementsPanel 运动计划与成就', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('运动计划与成就')
    expect(wrapper.text()).toContain('尚未激活计划')
  })

  it('展示预设计划列表', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('初心者步行计划')
    expect(wrapper.text()).toContain('5 公里跑步计划')
    expect(wrapper.text()).toContain('流瑜伽日常')
  })

  it('激活计划并显示进行中', async () => {
    const wrapper = await mountPanel({})
    const activateBtns = wrapper.findAll('.map2-plan .map2-btn')
    await activateBtns[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('进行中')
  })

  it('展示成就统计与锁定成就', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('成就系统')
    expect(wrapper.text()).toContain('第一步')
    expect(wrapper.text()).toContain('已解锁')
  })

  it('展示已解锁成就', async () => {
    const wrapper = await mountPanel({
      [ACHIEVEMENTS_KEY]: [{
        id: 'ach_first_step',
        name: '第一步',
        description: '完成第一次运动记录',
        icon: '👣',
        condition: { type: 'total_minutes', threshold: 1, progress: 1 },
        unlocked: true,
        unlockedAt: '2026-08-01T00:00:00.000Z',
        tier: 'bronze',
      }],
    })
    expect(wrapper.text()).toContain('第一步')
    expect(wrapper.text()).toContain('青铜')
  })

  it('展示节奏分析', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: JSON.stringify([{
        id: 'r1',
        type: 'running',
        duration: 30,
        intensity: 'moderate',
        distance: 5,
        calories: 300,
        date: '2026-08-25',
        timestamp: '2026-08-25T08:00:00.000Z',
      }]),
      [RHYTHM_KEY]: JSON.stringify({
        weeklyTarget: 150,
        weeklyCompleted: 30,
        streak: 1,
        bestStreak: 1,
        favoriteTypes: ['running'],
        bodyAwakening: 50,
      }),
    })
    expect(wrapper.text()).toContain('节奏分析')
    expect(wrapper.text()).toContain('频率')
    expect(wrapper.text()).toContain('跑步')
  })

  it('创建自定义计划', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('.map2-create .map2-input').setValue('我的计划')
    await wrapper.findAll('.map2-create .map2-btn')[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('我的计划')
  })
})
