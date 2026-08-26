import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

const HOUSES_KEY = 'hf:self_mirror_houses'

function ratedHouses() {
  const ids = ['self', 'emotion', 'body', 'mind', 'work', 'wealth', 'family', 'social', 'love', 'hobby', 'spirit', 'future']
  return ids.map((id, i) => ({
    id,
    label: `维度${i}`,
    icon: '•',
    description: `描述${i}`,
    rating: i < 6 ? 4 : 0,
    note: '',
  }))
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
  const mod = await import('../SelfAstrolabeChart.vue')
  const wrapper = mount(mod.default)
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('SelfAstrolabeChart 自体星盘', () => {
  it('展示星盘标题与覆盖度', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.text()).toContain('自体星盘')
    expect(wrapper.text()).toContain('覆盖')
  })

  it('渲染 SVG 星盘', async () => {
    const wrapper = await mountPanel({})
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('polygon').exists()).toBe(true)
  })

  it('展示图例', async () => {
    const wrapper = await mountPanel({ [HOUSES_KEY]: ratedHouses() })
    expect(wrapper.text()).toContain('维度0')
    expect(wrapper.text()).toContain('4/5')
  })

  it('展示覆盖百分比', async () => {
    const wrapper = await mountPanel({ [HOUSES_KEY]: ratedHouses() })
    expect(wrapper.text()).toContain('%')
  })
})
