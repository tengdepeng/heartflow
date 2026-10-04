import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (k: string, def: any) => (k in mockStore ? mockStore[k] : def),
    setKV: (k: string, val: any) => {
      mockStore[k] = val
    },
  },
}))

import MeritWoodenFishPanel from '../MeritWoodenFishPanel.vue'

describe('MeritWoodenFishPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
  })

  it('renders title and initial empty guidance', () => {
    const w = mount(MeritWoodenFishPanel)
    expect(w.text()).toContain('电子木鱼')
    expect(w.text()).toContain('累计功德')
    expect(w.text()).toContain('轻点木鱼，静心积福')
  })

  it('increments merit and today on knock', async () => {
    const w = mount(MeritWoodenFishPanel)
    const fish = w.find('.mwf-fish')
    expect(fish.exists()).toBe(true)
    await fish.trigger('click')
    expect(w.text()).toContain('1')
    await fish.trigger('click')
    expect(w.text()).toContain('2')
    // 首次敲击后引导语消失
    expect(w.find('.mwf-guide').exists()).toBe(false)
  })

  it('toggles sound and persists', async () => {
    const w = mount(MeritWoodenFishPanel)
    const btn = w.find('.mwf-sound')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    expect(mockStore['hf:merit_wooden_fish'].soundEnabled).toBe(false)
    expect(w.find('.mwf-sound.is-off').exists()).toBe(true)
  })
})
