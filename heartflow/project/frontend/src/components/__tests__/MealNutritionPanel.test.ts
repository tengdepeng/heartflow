// ============================================================
// 身体温室 · 营养分析面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { BodyLog } from '../../stores/health'

function mealLog(id: string, note: string, at: string): BodyLog {
  return { id, type: 'meal', value: { note }, at }
}

const MEALS: BodyLog[] = [
  mealLog('m1', '早餐吃鸡蛋、牛奶、全麦面包', '2026-08-20T08:30:00.000Z'),
  mealLog('m2', '午餐吃米饭、鸡胸肉、西兰花', '2026-08-20T12:30:00.000Z'),
  mealLog('m3', '晚餐吃鱼、豆腐、菠菜', '2026-08-20T18:30:00.000Z'),
]

async function mountPanel(logs: BodyLog[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: {},
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../MealNutritionPanel.vue')
  const wrapper = mount(mod.default, { props: { logs } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('MealNutritionPanel 营养分析', () => {
  it('无饮食记录时空状态', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.text()).toContain('营养分析')
    expect(wrapper.text()).toContain('还没有饮食记录')
  })

  it('有饮食记录时渲染评分', async () => {
    const wrapper = await mountPanel(MEALS)
    expect(wrapper.text()).toContain('综合评分')
    expect(wrapper.text()).toContain('膳食规律')
    expect(wrapper.text()).toContain('营养均衡')
    expect(wrapper.text()).toContain('食物多样')
    expect(wrapper.text()).toContain('热量合理')
  })

  it('渲染宏量营养素比例', async () => {
    const wrapper = await mountPanel(MEALS)
    expect(wrapper.text()).toContain('宏量营养素比例')
    expect(wrapper.text()).toContain('蛋白质')
    expect(wrapper.text()).toContain('碳水')
    expect(wrapper.text()).toContain('脂肪')
    expect(wrapper.text()).toMatch(/共 \d+ 餐/)
  })

  it('渲染食物类别覆盖与优化建议', async () => {
    const wrapper = await mountPanel(MEALS)
    expect(wrapper.text()).toContain('食物类别覆盖')
    expect(wrapper.text()).toContain('优化建议')
    const recs = wrapper.findAll('.mn-rec')
    expect(recs.length).toBeGreaterThan(0)
  })

  it('渲染本周趋势', async () => {
    const wrapper = await mountPanel(MEALS)
    expect(wrapper.text()).toContain('本周趋势')
    expect(wrapper.text()).toContain('均值')
  })
})
