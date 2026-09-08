// ============================================================
// 世界生命视图测试
// 冒烟：标题/副题/当前状态/昼夜/天气/传承 空态与有数据渲染
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

// 模拟 useRoomNavigation 避免路由依赖
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({ enterRoom: vi.fn() }),
}))

function generation(overrides: Record<string, any> = {}) {
  return {
    id: 'gen_1',
    number: 1,
    startedAt: '2026-01-01T00:00:00.000Z',
    endedAt: null,
    carrierId: 'c1',
    carrierName: '测试载体',
    carrierStage: 'active',
    inheritedFromCarrierId: null,
    inheritedSeedCount: 0,
    inheritedWillCount: 0,
    willIds: [],
    seedCount: 5,
    focusMinutes: 120,
    flowerCount: 3,
    ...overrides,
  }
}

async function mountView(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../WorldLife.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('WorldLife 世界生命视图', () => {
  it('空态：标题/副题/三区域/空传承文案', async () => {
    const wrapper = await mountView()
    expect(wrapper.text()).toContain('世界生命')
    expect(wrapper.text()).toContain('让世界呼吸')
    // 三个区域
    expect(wrapper.text()).toContain('昼夜循环')
    expect(wrapper.text()).toContain('天气系统')
    expect(wrapper.text()).toContain('世界传承')
    // 当前状态
    expect(wrapper.text()).toContain('昼夜')
    expect(wrapper.text()).toContain('天气')
    expect(wrapper.text()).toContain('世代')
    // 空传承
    expect(wrapper.text()).toContain('尚未开启传承')
  })

  it('有数据：昼夜覆盖/天气/世代渲染', async () => {
    const wrapper = await mountView({
      'hf:world_life:day_night_enabled': true,
      'hf:world_life:day_night_override': 'day',
      'hf:world_life:weather': 'clear',
      'hf:world_life:weather_intensity': 0.8,
      'hf:world_life:weather_auto': true,
      'hf:world_life:generations': [generation()],
    })
    // 昼夜：手动覆盖标记
    expect(wrapper.text()).toContain('手动覆盖')
    // 天气：强度
    expect(wrapper.text()).toContain('80%')
    // 传承：世代信息
    expect(wrapper.text()).toContain('第1代')
    expect(wrapper.text()).toContain('测试载体')
    expect(wrapper.text()).toContain('5 种子')
    expect(wrapper.text()).toContain('120 分钟')
    expect(wrapper.text()).toContain('3 花')
  })
})