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

import DecisionWheelPanel from '../DecisionWheelPanel.vue'
import { useDecisionWheel } from '../../modules/decision-wheel'

describe('DecisionWheelPanel', () => {
  beforeEach(() => {
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    const w = useDecisionWheel()
    w.resetOptions()
    w.clearHistory()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders title, options and empty history', () => {
    const w = mount(DecisionWheelPanel)
    expect(w.text()).toContain('决定转盘')
    expect(w.findAll('.dw-option').length).toBe(6)
    expect(w.text()).toContain('还没有转过')
    expect(w.findAll('.dw-sector-label').length).toBe(6)
  })

  it('spins, animates then reveals the result', async () => {
    vi.useFakeTimers()
    const w = mount(DecisionWheelPanel)
    await w.find('.dw-spin').trigger('click')
    expect(w.find('.dw-result').exists()).toBe(false)

    vi.advanceTimersByTime(4200)
    await w.vm.$nextTick()
    expect(w.find('.dw-result').exists()).toBe(true)
    expect(w.findAll('.dw-history-item').length).toBe(1)
  })

  it('adds an option via the input', async () => {
    const w = mount(DecisionWheelPanel)
    await w.find('.dw-input').setValue('去散步')
    await w.find('.dw-add-btn').trigger('click')
    expect(w.findAll('.dw-option').length).toBe(7)
    expect(w.text()).toContain('去散步')
  })

  it('removes an option', async () => {
    const w = mount(DecisionWheelPanel)
    await w.findAll('.dw-option-del')[0].trigger('click')
    expect(w.findAll('.dw-option').length).toBe(5)
  })

  it('disables spinning when fewer than two options', async () => {
    const w = mount(DecisionWheelPanel)
    const engine = useDecisionWheel()
    while (engine.options.value.length > 1) engine.removeOption(engine.options.value[0].id)
    await w.vm.$nextTick()
    expect(w.find('.dw-spin').attributes('disabled')).toBeDefined()
    expect(w.find('.dw-need').exists()).toBe(true)
  })
})
