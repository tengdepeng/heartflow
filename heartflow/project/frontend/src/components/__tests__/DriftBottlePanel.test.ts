import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

import DriftBottlePanel from '../DriftBottlePanel.vue'
import { useDriftBottle } from '../../modules/drift-bottle'

describe('DriftBottlePanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useDriftBottle().clearAll()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders title and empty sea guidance', () => {
    const w = mount(DriftBottlePanel)
    expect(w.text()).toContain('漂流瓶')
    expect(w.text()).toContain('海面空荡')
    expect(w.findAll('.db-bottle').length).toBe(0)
  })

  it('disables the throw button until text is entered', async () => {
    const w = mount(DriftBottlePanel)
    expect(w.find('.db-btn--throw').attributes('disabled')).toBeDefined()
    await w.find('.db-textarea').setValue('今天有点想念')
    expect(w.find('.db-btn--throw').attributes('disabled')).toBeUndefined()
  })

  it('throws a bottle into the sea', async () => {
    const w = mount(DriftBottlePanel)
    await w.find('.db-textarea').setValue('给未来的自己')
    await w.find('.db-mood').trigger('click')
    await w.find('.db-btn--throw').trigger('click')
    expect(w.findAll('.db-bottle').length).toBe(1)
    expect(w.find('.db-empty').exists()).toBe(false)
    const stats = w.findAll('.db-stat-num').map((n) => n.text())
    expect(stats[0]).toBe('1')
    expect(stats[1]).toBe('0')
  })

  it('picks a bottle and reveals the collected card', async () => {
    vi.useFakeTimers()
    const w = mount(DriftBottlePanel)
    await w.find('.db-textarea').setValue('藏在瓶里的话')
    await w.find('.db-btn--throw').trigger('click')
    await w.find('.db-btn--pick').trigger('click')

    vi.advanceTimersByTime(700)
    await w.vm.$nextTick()
    expect(w.find('.db-picked').exists()).toBe(true)
    expect(w.find('.db-picked-text').text()).toContain('藏在瓶里的话')
    expect(w.findAll('.db-archive-item').length).toBe(1)
  })

  it('disables picking when nothing is drifting', () => {
    const w = mount(DriftBottlePanel)
    expect(w.find('.db-btn--pick').attributes('disabled')).toBeDefined()
  })
})
