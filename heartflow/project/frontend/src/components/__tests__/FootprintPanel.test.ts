import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const RECORDS_KEY = 'hf:footprint_records'

function rec(overrides: Record<string, any> = {}) {
  return {
    id: `fp_${Math.random().toString(36).slice(2, 8)}`,
    name: '地点',
    region: '地区',
    date: '2026-05-01',
    type: 'sight',
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
  const mod = await import('../FootprintPanel.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('FootprintPanel 足迹志', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('足迹志')
    expect(wrapper.text()).toContain('暂无足迹记录')
  })

  it('展示足迹清单与统计', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [
        rec({ name: '西湖', region: '杭州', date: '2026-05-01', type: 'sight' }),
        rec({ name: '黄山', region: '安徽', date: '2026-04-10', type: 'nature' }),
      ],
    })
    expect(wrapper.text()).toContain('西湖')
    expect(wrapper.text()).toContain('黄山')
    expect(wrapper.text()).toContain('2026')
  })

  it('记录新足迹并持久化', async () => {
    const wrapper = await mountPanel({})
    await wrapper.find('input[placeholder="地点名称"]').setValue('鼓浪屿')
    await wrapper.find('input[placeholder="地区（省/城市/国家）"]').setValue('厦门')
    await wrapper.find('input[type="date"]').setValue('2026-08-01')
    await wrapper.find('button.fp-btn-primary').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('鼓浪屿')
    const records = storedKV()[RECORDS_KEY]
    expect(records.length).toBe(1)
    expect(records[0].name).toBe('鼓浪屿')
    expect(records[0].region).toBe('厦门')
  })

  it('按类型筛选', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [
        rec({ id: 'f1', name: '西湖', region: '杭州', date: '2026-05-01', type: 'sight' }),
        rec({ id: 'f2', name: '黄山', region: '安徽', date: '2026-04-10', type: 'nature' }),
      ],
    })
    const selects = wrapper.findAll('select.fp-select')
    await selects[1].setValue('nature')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('黄山')
    expect(wrapper.text()).not.toContain('西湖')
  })

  it('按关键字搜索', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [
        rec({ id: 'f1', name: '西湖', region: '杭州', date: '2026-05-01', type: 'sight', mood: '惬意' }),
        rec({ id: 'f2', name: '黄山', region: '安徽', date: '2026-04-10', type: 'nature' }),
      ],
    })
    await wrapper.find('input[placeholder="搜索名称/地区/心情/同行…"]').setValue('惬意')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('西湖')
    expect(wrapper.text()).not.toContain('黄山')
  })

  it('删除足迹并持久化', async () => {
    const wrapper = await mountPanel({
      [RECORDS_KEY]: [rec({ id: 'f_del', name: '待删', region: '某地', date: '2026-01-01', type: 'city' })],
    })
    await wrapper.find('button.fp-del').trigger('click')
    await wrapper.vm.$nextTick()
    expect(storedKV()[RECORDS_KEY].length).toBe(0)
    expect(wrapper.text()).toContain('暂无足迹记录')
  })
})
