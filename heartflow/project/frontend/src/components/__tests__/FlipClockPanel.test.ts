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

import FlipClockPanel from '../FlipClockPanel.vue'
import { useFlipClock } from '../../modules/flip-clock'

describe('FlipClockPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useFlipClock().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染标题、三组数字卡片与日期', () => {
    const w = mount(FlipClockPanel)
    expect(w.text()).toContain('翻页数字时钟')
    expect(w.findAll('.fcl-card').length).toBe(3)
    expect(w.find('.fcl-digits').text()).toMatch(/\d{2}/)
    expect(w.find('.fcl-date').exists()).toBe(true)
    w.unmount()
  })

  it('切换 12 时制显示上下午', async () => {
    const w = mount(FlipClockPanel)
    const btns = w.findAll('.fcl-seg button')
    await btns[1].trigger('click')
    expect(btns[1].classes()).toContain('active')
    expect(w.find('.fcl-meridiem').exists()).toBe(true)
    w.unmount()
  })

  it('关闭秒与日期', async () => {
    const w = mount(FlipClockPanel)
    const checks = w.findAll('.fcl-check input')
    await checks[0].setValue(false)
    expect(w.findAll('.fcl-card').length).toBe(2)
    await checks[1].setValue(false)
    expect(w.find('.fcl-date').exists()).toBe(false)
    w.unmount()
  })

  it('恢复默认', async () => {
    const w = mount(FlipClockPanel)
    await w.findAll('.fcl-check input')[0].setValue(false)
    expect(w.findAll('.fcl-card').length).toBe(2)
    await w.find('.fcl-reset').trigger('click')
    expect(w.findAll('.fcl-card').length).toBe(3)
    w.unmount()
  })
})
