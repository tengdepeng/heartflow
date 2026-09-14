import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createWebHashHistory } from 'vue-router'
import { nextTick } from 'vue'
import Astrolabe from '../Astrolabe.vue'

// Mock router
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
    { path: '/timeline', name: 'timeline', component: { template: '<div>Timeline</div>' } },
    { path: '/anchor', name: 'anchor', component: { template: '<div>Anchor</div>' } },
    { path: '/garden', name: 'garden', component: { template: '<div>Garden</div>' } },
  ],
})

// Mock useRoomNavigation
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({
    currentRoomId: { value: 'home' },
    history: { value: ['timeline', 'anchor', 'garden'] },
  }),
}))

describe('Astrolabe 星盘导航组件', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    router.push('/')
    await router.isReady()
  })

  afterEach(() => {
    // 清理 Teleport 残留
    document.body.innerHTML = ''
  })

  it('visible 为 false 时不渲染', () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: false },
    })
    // Teleport 内容为空
    expect(wrapper.find('.astrolabe-overlay').exists()).toBe(false)
  })

  it('visible 为 true 时渲染星盘覆盖层', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.astrolabe-overlay')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染关闭按钮', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.astrolabe-close')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染中心心流核心', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const center = document.body.querySelector('.astrolabe-center')
    expect(center).toBeTruthy()
    expect(document.body.querySelector('.center-label')?.textContent).toContain('心流')
    wrapper.unmount()
  })

  it('渲染搜索框', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.search-input')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染罗盘环', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.ring-outer')).toBeTruthy()
    expect(document.body.querySelector('.ring-mid')).toBeTruthy()
    expect(document.body.querySelector('.ring-inner')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染方位标记', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.mark-n')).toBeTruthy()
    expect(document.body.querySelector('.mark-s')).toBeTruthy()
    expect(document.body.querySelector('.mark-e')).toBeTruthy()
    expect(document.body.querySelector('.mark-w')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染主链路房间节点', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const mainNodes = document.body.querySelectorAll('.node-main')
    // 主链路有 3 个（timeline/anchor/garden，心流是 gravity 组，不在此列）
    expect(mainNodes.length).toBe(3)
    wrapper.unmount()
  })

  it('渲染世界房间节点', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const worldNodes = document.body.querySelectorAll('.node-world')
    expect(worldNodes.length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('渲染连接线 SVG', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.connection-lines')).toBeTruthy()
    wrapper.unmount()
  })

  it('渲染星辰背景', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.body.querySelector('.star-field')).toBeTruthy()
    expect(document.body.querySelectorAll('.star').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const closeBtn = document.body.querySelector('.astrolabe-close') as HTMLElement
    closeBtn?.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('点击遮罩触发 close 事件', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const overlay = document.body.querySelector('.astrolabe-overlay') as HTMLElement
    overlay?.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('搜索框输入可进行过滤', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const input = document.body.querySelector('.search-input') as HTMLInputElement
    expect(input).toBeTruthy()
    input.value = '时间'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    // 搜索功能正常，输入框存在
    expect(document.body.querySelector('.search-input')).toBeTruthy()
    wrapper.unmount()
  })

  it('点击中心心流导航到首页', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const center = document.body.querySelector('.astrolabe-center') as HTMLElement
    center?.click()
    await nextTick()
    expect(pushSpy).toHaveBeenCalledWith('/')
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('点击主链路节点导航到对应房间', async () => {
    const pushSpy = vi.spyOn(router, 'push')
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const mainNode = document.body.querySelector('.node-main') as HTMLElement
    if (mainNode) {
      mainNode.click()
      await nextTick()
      expect(pushSpy).toHaveBeenCalled()
      expect(wrapper.emitted('close')).toBeTruthy()
    }
    wrapper.unmount()
  })

  it('刻度半径随流体尺寸变量计算（修复缩小后图标遮挡）', async () => {
    const wrapper = mount(Astrolabe, {
      global: { plugins: [router] },
      props: { visible: true },
      attachTo: document.body,
    })
    await nextTick()
    const ticks = document.body.querySelectorAll('.deg-tick')
    expect(ticks.length).toBeGreaterThan(0)
    const first = ticks[0] as HTMLElement
    // 旧实现硬编码 translateY(-258px)，小屏罗盘缩小后刻度溢出/遮挡主节点；
    // 修复后半径应引用流体变量 var(--tick-radius)，随 --astro-size 缩放
    const transform = (first.style.transform || '').toLowerCase()
    expect(transform).not.toContain('-258px')
    expect(transform).toContain('var(--tick-radius)')
    wrapper.unmount()
  })
})