// ============================================================
// JourneyArchivePanel 旅程档案面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'
import type { FootprintRecord } from '../../modules/footprint'

function rec(overrides: Record<string, any> = {}): FootprintRecord {
  return {
    id: `fp_${Math.random().toString(36).slice(2, 8)}`,
    name: '站',
    region: '杭州',
    date: '2024-04-01',
    type: 'city',
    ...overrides,
  }
}

async function mountPanel(records: FootprintRecord[] = []) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore: {}, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../JourneyArchivePanel.vue')
  const wrapper = mount(mod.default, { props: { records } })
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('JourneyArchivePanel 旅程档案面板', () => {
  it('空态呈现旅程未启引导', async () => {
    const wrapper = await mountPanel([])
    expect(wrapper.find('.jap').exists()).toBe(true)
    expect(wrapper.text()).toContain('旅程档案')
    expect(wrapper.text()).toContain('旅程未启')
    expect(wrapper.text()).toContain('足迹还空着')
  })

  it('填充态显示旅程概览四格与徽标', async () => {
    const wrapper = await mountPanel([
      rec({ date: '2024-04-01' }),
      rec({ date: '2024-04-03' }),
      rec({ date: '2024-10-01', region: '大理' }),
      rec({ date: '2024-10-02', region: '大理' }),
    ])
    expect(wrapper.find('.jap-tag').exists()).toBe(true)
    expect(wrapper.text()).toContain('2 段旅程')
    expect(wrapper.findAll('.jap-stat').length).toBe(4)
    expect(wrapper.text()).toContain('覆盖天数')
    expect(wrapper.text()).toContain('平均时长')
    expect(wrapper.text()).toContain('最长旅程')
  })

  it('旅程清单列出地区/起止/站数/跨度', async () => {
    const wrapper = await mountPanel([
      rec({ date: '2024-04-01' }),
      rec({ date: '2024-04-03' }),
    ])
    expect(wrapper.text()).toContain('旅程足迹')
    expect(wrapper.text()).toContain('杭州')
    expect(wrapper.text()).toContain('2024-04-01 → 2024-04-03')
    expect(wrapper.text()).toContain('2 站')
    expect(wrapper.text()).toContain('跨度')
  })

  it('温和洞察列表不超过 4 条', async () => {
    const wrapper = await mountPanel([
      rec({ date: '2024-04-01' }),
      rec({ date: '2024-04-03' }),
      rec({ date: '2024-10-01', region: '大理' }),
      rec({ date: '2024-10-02', region: '大理' }),
    ])
    const insights = wrapper.findAll('.jap-insights li')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights.length).toBeLessThanOrEqual(4)
  })

  it('旅程分界间隔滑块存在，调大可合并旅程（并入 JourneyPanel 独有能力）', async () => {
    const wrapper = await mountPanel([
      rec({ date: '2024-04-01' }),
      rec({ date: '2024-05-30' }),
      rec({ date: '2024-08-30' }),
    ])
    expect(wrapper.find('.jap-config-range').exists()).toBe(true)
    // 默认间隔 45：59/92 天均 >45 → 3 段
    expect(wrapper.find('.jap-config-val').text()).toContain('45')
    expect(wrapper.text()).toContain('3 段旅程')
    // 调大至 120：59/92 天均 <120 → 合并为 1 段
    await wrapper.find('input.jap-config-range').setValue(120)
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('1 段旅程')
  })
})
