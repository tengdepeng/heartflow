import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

const WILLS_KEY = 'hf:wills'

function will(overrides: Record<string, any> = {}) {
  return {
    id: `will_${Math.random().toString(36).slice(2, 8)}`,
    name: '玉珠的遗志',
    grade: 'common',
    description: '玉珠的传承',
    insights: ['保持专注', '善待他人'],
    goalSummary: null,
    carrierSnapshot: {
      name: '玉珠',
      maxBeads: 108,
      finalBeadCount: 66,
      colors: { primary: '#a07c8c', secondary: '#e0a96d', accent: '#f0c040' },
      usageCount: 30,
    },
    sourceCarrierId: 'carrier_1',
    inheritedByCarrierId: null,
    createdAt: '2026-08-20T08:00:00.000Z',
    inheritedAt: null,
    parentWillId: null,
    ...overrides,
  }
}

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
  const mod = await import('../WillHeritagePanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('WillHeritagePanel 遗志谱系', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('遗志谱系')
    expect(wrapper.text()).toContain('尚无遗志')
  })

  it('展示遗志清单与等级', async () => {
    const wrapper = await mountPanel({
      [WILLS_KEY]: [
        will({ name: '传承之志', grade: 'heritage' }),
        will({ name: '精粹之志', grade: 'essence' }),
      ],
    })
    expect(wrapper.text()).toContain('传承之志')
    expect(wrapper.text()).toContain('精粹之志')
    expect(wrapper.text()).toContain('传承')
    expect(wrapper.text()).toContain('精粹')
  })

  it('展示谱系概览统计', async () => {
    const wrapper = await mountPanel({
      [WILLS_KEY]: [
        will({ grade: 'heritage' }),
        will({ grade: 'common', inheritedByCarrierId: 'carrier_2', inheritedAt: '2026-08-21T00:00:00.000Z' }),
      ],
    })
    expect(wrapper.text()).toContain('待继承')
    expect(wrapper.text()).toContain('已传承')
    expect(wrapper.text()).toContain('传承级')
  })

  it('展开传承链', async () => {
    const parent = will({ id: 'w_parent', name: '祖辈遗志' })
    const child = will({ id: 'w_child', name: '父辈遗志', parentWillId: 'w_parent' })
    const wrapper = await mountPanel({
      [WILLS_KEY]: [parent, child],
    })
    const buttons = wrapper.findAll('.will-btn')
    const chainBtn = buttons.find(b => b.text() === '谱系')
    await chainBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('传承链')
    expect(wrapper.text()).toContain('祖辈遗志')
  })

  it('删除遗志并持久化', async () => {
    const wrapper = await mountPanel({
      [WILLS_KEY]: [will({ id: 'w_del', name: '待删遗志' })],
    })
    const delBtn = wrapper.findAll('.will-btn.danger').find(b => b.text() === '删除')
    await delBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    const records = storedKV()[WILLS_KEY]
    expect(records.length).toBe(0)
    expect(wrapper.text()).toContain('暂无遗志记录')
  })

  it('清空全部遗志', async () => {
    const wrapper = await mountPanel({
      [WILLS_KEY]: [will(), will()],
    })
    const clearBtn = wrapper.findAll('.will-btn.danger').find(b => b.text() === '清空全部遗志')
    await clearBtn!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[WILLS_KEY]).toEqual([])
  })
})
