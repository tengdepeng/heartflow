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

import VerticalMarqueePanel from '../VerticalMarqueePanel.vue'
import { useVerticalMarquee, DEFAULT_MARQUEE_ITEMS } from '../../modules/vertical-marquee'

describe('VerticalMarqueePanel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    Object.keys(mockStore).forEach((k) => delete mockStore[k])
    useVerticalMarquee().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('渲染标题、条目与播放态', () => {
    const w = mount(VerticalMarqueePanel)
    expect(w.text()).toContain('垂直跑马灯')
    expect(w.findAll('.vmq-row').length).toBe(DEFAULT_MARQUEE_ITEMS.length)
    expect(w.find('.vmq-row').classes()).toContain('is-active')
    expect(w.find('.vmq-pause').text()).toContain('播放中')
    w.unmount()
  })

  it('到时切换到下一条', async () => {
    const w = mount(VerticalMarqueePanel)
    vi.advanceTimersByTime(3000)
    await w.vm.$nextTick()
    expect(w.findAll('.vmq-row')[1].classes()).toContain('is-active')
    w.unmount()
  })

  it('暂停后不再切换', async () => {
    const w = mount(VerticalMarqueePanel)
    await w.find('.vmq-pause').trigger('click')
    expect(w.find('.vmq-pause').text()).toContain('已暂停')
    vi.advanceTimersByTime(9000)
    await w.vm.$nextTick()
    expect(w.findAll('.vmq-row')[0].classes()).toContain('is-active')
    w.unmount()
  })

  it('添加与移除条目', async () => {
    const w = mount(VerticalMarqueePanel)
    await w.find('.vmq-input').setValue('新公告')
    await w.find('.vmq-add-btn').trigger('click')
    expect(w.text()).toContain('新公告')
    const before = w.findAll('.vmq-row').length
    await w.find('.vmq-del').trigger('click')
    expect(w.findAll('.vmq-row').length).toBe(before - 1)
    w.unmount()
  })

  it('切换方向', async () => {
    const w = mount(VerticalMarqueePanel)
    const btns = w.findAll('.vmq-seg button')
    await btns[1].trigger('click')
    expect(btns[1].classes()).toContain('active')
    w.unmount()
  })

  it('恢复默认', async () => {
    const w = mount(VerticalMarqueePanel)
    await w.find('.vmq-input').setValue('临时')
    await w.find('.vmq-add-btn').trigger('click')
    expect(w.findAll('.vmq-row').length).toBe(DEFAULT_MARQUEE_ITEMS.length + 1)
    await w.find('.vmq-reset').trigger('click')
    expect(w.findAll('.vmq-row').length).toBe(DEFAULT_MARQUEE_ITEMS.length)
    w.unmount()
  })
})
