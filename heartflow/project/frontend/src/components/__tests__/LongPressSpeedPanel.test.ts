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

import LongPressSpeedPanel from '../LongPressSpeedPanel.vue'
import { useLongPressSpeed, DEFAULT_LONG_PRESS_SPEED } from '../../modules/long-press-speed'

describe('LongPressSpeedPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useLongPressSpeed().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染标题与基准倍速', () => {
    const w = mount(LongPressSpeedPanel)
    expect(w.text()).toContain('长按变速')
    expect(w.find('.lps-badge').text()).toBe('1.0x')
    expect(w.find('.lps-target').classes()).not.toContain('holding')
    w.unmount()
  })

  it('按住后倍速爬升至按住倍速', async () => {
    const w = mount(LongPressSpeedPanel)
    await w.find('.lps-target').trigger('pointerdown')
    expect(w.find('.lps-target').classes()).toContain('holding')
    vi.advanceTimersByTime(600)
    await w.vm.$nextTick()
    expect(w.find('.lps-badge').text()).toBe('2.0x')
    w.unmount()
  })

  it('松手回落至基准', async () => {
    const w = mount(LongPressSpeedPanel)
    await w.find('.lps-target').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await w.vm.$nextTick()
    await w.find('.lps-target').trigger('pointerup')
    expect(w.find('.lps-badge').text()).toBe('1.0x')
    expect(w.find('.lps-target').classes()).not.toContain('holding')
    w.unmount()
  })

  it('禁用后长按不加速', async () => {
    const w = mount(LongPressSpeedPanel)
    await w.find('.lps-check input').setValue(false)
    await w.find('.lps-target').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await w.vm.$nextTick()
    expect(w.find('.lps-target').classes()).not.toContain('holding')
    expect(w.find('.lps-badge').text()).toBe('1.0x')
    w.unmount()
  })

  it('调整按住倍速', async () => {
    const w = mount(LongPressSpeedPanel)
    const ranges = w.findAll('.lps-range')
    await ranges[1].setValue('3')
    expect(useLongPressSpeed().holdSpeed.value).toBe(3)
    w.unmount()
  })

  it('恢复默认', async () => {
    const w = mount(LongPressSpeedPanel)
    await w.findAll('.lps-range')[1].setValue('3')
    await w.find('.lps-reset').trigger('click')
    expect(useLongPressSpeed().holdSpeed.value).toBe(DEFAULT_LONG_PRESS_SPEED.holdSpeed)
    w.unmount()
  })
})
