// ============================================================
// 运动分析面板测试（movement · useMovementAnalytics）
// 运动统计 / 体能评估 / 恢复状态 / 运动建议
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { Move } from '../../modules/movement/movement-log'

const ANALYTICS_KEY = 'hf:movement:analytics'
const FITNESS_KEY = 'hf:movement:fitness'

function readKv() {
  return JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage')).kvStore
}

async function mountPanel(kv: Record<string, any> = {}, moves: Move[] = []) {
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
  const mod = await import('../MovementAnalyticsPanel.vue')
  const wrapper = mount(mod.default, { props: { moves } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function buttonByText(wrapper: any, text: string) {
  const el = wrapper.findAll('button').find((b: any) => b.text().trim() === text)
  expect(el, `button[${text}] 应存在`).toBeTruthy()
  return el!
}

function move(overrides: Partial<Move> = {}): Move {
  return {
    id: 'mv1', type: 'run', duration: 30, withWhom: '', location: '', note: '',
    isMoment: false, at: new Date().toISOString(),
    ...overrides,
  }
}

describe('MovementAnalyticsPanel 运动分析', () => {
  it('渲染标题与统计区块', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('运动分析')
    expect(wrapper.text()).toContain('总次数')
    expect(wrapper.text()).toContain('综合体能')
    expect(wrapper.text()).toContain('恢复状态')
  })

  it('刷新后统计并持久化为 JSON 字符串', async () => {
    const wrapper = await mountPanel({}, [
      move({ id: 'mv1', type: 'run', duration: 30 }),
      move({ id: 'mv2', type: 'swim', duration: 20 }),
    ])
    await buttonByText(wrapper, '刷新').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('跑步 30 分钟')
    const raw = readKv()[ANALYTICS_KEY]
    expect(typeof raw).toBe('string')
    const analytics = JSON.parse(raw)
    expect(analytics.totalSessions).toBe(2)
    expect(analytics.totalDuration).toBe(50)
  })

  it('评估体能并持久化评分', async () => {
    const wrapper = await mountPanel({}, [
      move({ id: 'mv1', type: 'run', duration: 30 }),
      move({ id: 'mv2', type: 'swim', duration: 20 }),
    ])
    await buttonByText(wrapper, '评估').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('综合体能')
    const raw = readKv()[FITNESS_KEY]
    expect(typeof raw).toBe('string')
    const fitness = JSON.parse(raw)
    expect(fitness.overall).toBeGreaterThan(0)
    expect(fitness.assessedAt).toBeTruthy()
  })

  it('近期运动显示需要休息', async () => {
    const wrapper = await mountPanel({}, [move({ id: 'mv1', at: new Date().toISOString() })])
    expect(wrapper.text()).toContain('恢复度')
    expect(wrapper.text()).toContain('需要休息')
  })

  it('生成运动建议（单一类型 + 频率偏低）', async () => {
    const wrapper = await mountPanel({}, [move({ id: 'mv1', type: 'run', duration: 30 })])
    await buttonByText(wrapper, '刷新').trigger('click')
    await buttonByText(wrapper, '生成建议').trigger('click')
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('运动频率偏低')
    expect(wrapper.text()).toContain('增加瑜伽')
  })
})
