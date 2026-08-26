import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HOUSES_KEY = 'hf:self_mirror_houses'

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
  const mod = await import('../TwelveHousesGrid.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

function storedKV(): Record<string, any> {
  const raw = (globalThis as any).localStorage.getItem('heartflow:storage')
  return JSON.parse(raw).kvStore ?? {}
}

describe('TwelveHousesGrid 十二宫格', () => {
  it('展示十二宫格', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('十二宫格')
    expect(wrapper.text()).toContain('自我认知')
    expect(wrapper.text()).toContain('未来方向')
    expect(wrapper.text()).toContain('已评 0/12')
  })

  it('点按评分并持久化', async () => {
    const wrapper = await mountPanel({})
    const stars = wrapper.findAll('.sm-star')
    await stars[0].trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已评 1/12')
    const houses = storedKV()[HOUSES_KEY]
    expect(houses.length).toBe(12)
    expect(houses[0].rating).toBe(1)
  })

  it('再次点按取消评分', async () => {
    const wrapper = await mountPanel({})
    const stars = wrapper.findAll('.sm-star')
    await stars[0].trigger('click')
    await wrapper.vm.$nextTick()
    await stars[0].trigger('click')
    await wrapper.vm.$nextTick()
    const houses = storedKV()[HOUSES_KEY]
    expect(houses[0].rating).toBe(0)
  })

  it('展示既有评分', async () => {
    const ids = ['self', 'emotion', 'body', 'mind', 'work', 'wealth', 'family', 'social', 'love', 'hobby', 'spirit', 'future']
    const houses = ids.map((id, i) => ({
      id,
      label: `维度${i}`,
      icon: '•',
      description: `描述${i}`,
      rating: i === 0 ? 4 : 0,
      note: '',
    }))
    const wrapper = await mountPanel({ [HOUSES_KEY]: houses })
    expect(wrapper.text()).toContain('已评 1/12')
  })
})
