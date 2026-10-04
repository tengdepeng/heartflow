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

import DynamicIslandPanel from '../DynamicIslandPanel.vue'
import { useDynamicIsland } from '../../modules/dynamic-island'

describe('DynamicIslandPanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useDynamicIsland().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染标题、五个模式与时钟胶囊', () => {
    const w = mount(DynamicIslandPanel)
    expect(w.text()).toContain('动态岛 · 状态胶囊')
    expect(w.findAll('.dyl-mode').length).toBe(5)
    expect(w.find('.dyl-island').classes()).toContain('is-clock')
    expect(w.find('.dyl-island-main').text()).toMatch(/\d{2}:\d{2}:\d{2}/)
    w.unmount()
  })

  it('点击模式按钮切换胶囊状态', async () => {
    const w = mount(DynamicIslandPanel)
    await w.findAll('.dyl-mode')[1].trigger('click')
    expect(w.find('.dyl-island').classes()).toContain('is-focus')
    expect(w.find('.dyl-island-main').text()).toContain('专注中')
    w.unmount()
  })

  it('自动轮播开关可切换', async () => {
    const w = mount(DynamicIslandPanel)
    const btn = w.find('.dyl-cycle')
    expect(btn.text()).toContain('自动轮播 · 开')
    await btn.trigger('click')
    expect(btn.text()).toContain('自动轮播 · 关')
    expect(btn.attributes('aria-pressed')).toBe('false')
    w.unmount()
  })

  it('自动轮播到时切换到下一状态', async () => {
    const w = mount(DynamicIslandPanel)
    vi.advanceTimersByTime(4000)
    await w.vm.$nextTick()
    expect(w.find('.dyl-island').classes()).toContain('is-focus')
    w.unmount()
  })

  it('复位恢复默认状态', async () => {
    const w = mount(DynamicIslandPanel)
    await w.findAll('.dyl-mode')[4].trigger('click')
    expect(w.find('.dyl-island').classes()).toContain('is-music')
    await w.find('.dyl-reset').trigger('click')
    expect(w.find('.dyl-island').classes()).toContain('is-clock')
    w.unmount()
  })
})
