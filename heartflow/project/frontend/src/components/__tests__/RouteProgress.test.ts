import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import RouteProgress from '../RouteProgress.vue'

describe('RouteProgress（接线孤儿 · 路由顶部加载条）', () => {
  it('初始隐藏', () => {
    const wrapper = mount(RouteProgress)
    expect(wrapper.find('.rp--active').exists()).toBe(false)
  })

  it('start() 后显示进度条', async () => {
    const wrapper = mount(RouteProgress)
    ;(wrapper.vm as unknown as { start: () => void }).start()
    await flushPromises()
    expect(wrapper.find('.rp--active').exists()).toBe(true)
  })

  it('finish() 后淡出隐藏', async () => {
    const wrapper = mount(RouteProgress)
    const vm = wrapper.vm as unknown as { start: () => void; finish: () => void }
    vm.start()
    await flushPromises()
    expect(wrapper.find('.rp--active').exists()).toBe(true)
    vm.finish()
    // finish 内部：宽度缓动到满(0.3s) → 整体淡出(setTimeout 300ms 收束显隐)
    await new Promise((r) => setTimeout(r, 360))
    await flushPromises()
    expect(wrapper.find('.rp--active').exists()).toBe(false)
  })
})
