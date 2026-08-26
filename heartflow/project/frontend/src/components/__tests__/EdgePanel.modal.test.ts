// ============================================================
// EdgePanel 模态行为测试（焦点陷阱 / Escape / body 滚动锁 / Timer 提示）
// 独立文件：与旧渲染测试隔离，避免滚动锁计数互相污染。
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount, type DOMWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import EdgePanel from '../EdgePanel.vue'

// vi.mock 工厂会被提升到文件顶部执行，被工厂引用的可变状态必须用 vi.hoisted 定义
const timerBridge = vi.hoisted(() => ({
  isFocusing: false,
  isPaused: false,
  start: vi.fn(),
}))

const navBridge = vi.hoisted(() => ({
  adjacentRooms: { value: [] as { id: string; name: string; description: string; icon: string }[] },
}))

// 模拟 vue-router
vi.mock('vue-router', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    currentRoute: { value: { path: '/' } },
  })),
  useRoute: vi.fn(() => ({
    path: '/',
  })),
}))

// 模拟 useRoomNavigation（adjacentRooms 通过 navBridge 注入）
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: () => ({
    currentRoomId: { value: 'home' },
    currentRoom: { value: null },
    adjacentRooms: navBridge.adjacentRooms,
    enterRoom: vi.fn(),
    mainPath: { value: [] },
    isOnMainPath: { value: false },
    previousOnMainPath: { value: null },
    nextOnMainPath: { value: null },
    goBack: vi.fn(),
    goHome: vi.fn(),
    goNextOnMainPath: vi.fn(),
    goPreviousOnMainPath: vi.fn(),
    getNavDirection: vi.fn(() => 'none'),
    history: { value: [] },
    lastNavigation: { value: null },
    browseMode: { value: { canGoBack: false, canGoNext: false, canGoPrev: false, isHome: true, roomCount: 0, adjacentCount: 0 } },
    returnPath: { value: [] },
    pathToHome: { value: [] },
  }),
}))

// 模拟 timer bridge（通过 timerBridge 动态改值）
vi.mock('../../resonance/bridges/timer', () => ({
  useTimer: () => timerBridge,
}))

// 模拟 style bridge
vi.mock('../../resonance/bridges/style', () => ({
  useStyle: vi.fn(() => ({
    installedPacks: [
      { id: 'default-gravity', name: '心流科技风' },
      { id: 'warm-amber', name: '暖琥珀' },
      { id: 'deep-ocean', name: '深海' },
    ],
    activeId: 'default-gravity',
    activate: vi.fn(),
  })),
}))

// 模拟 toast 模块：断言 showToast 调用，避免真实 setTimeout 遗留
vi.mock('../../modules/toast', () => ({
  showToast: vi.fn(),
  useToast: vi.fn(() => ({
    toasts: { value: [] },
    dismiss: vi.fn(),
  })),
}))

// 模拟后模块顶层的 showToast
import { showToast } from '../../modules/toast'

/**
 * 共享的 mount 选项：stub Teleport 使其内容内联渲染。
 * 必须 attachTo=document.body：happy-dom 的 element.focus() 仅在元素
 * isConnected（挂载于 document）时才会更新 document.activeElement，
 * 默认离屏挂载会导致焦点陷阱测试中的 focus() 静默失效。
 */
function mountWrapper(props: any = {}) {
  return mount(EdgePanel, {
    props,
    attachTo: document.body,
    global: {
      stubs: {
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })
}

/** 让 happy-dom 下的元素通过 getClientRects 可见性过滤，真实演练焦点陷阱 */
function makeElementsVisible() {
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value: () => [{ width: 100, height: 30, top: 0, left: 0, right: 100, bottom: 30 }],
  })
}

function restoreClientRects() {
  Object.defineProperty(HTMLElement.prototype, 'getClientRects', {
    configurable: true,
    value: () => [],
  })
}

/** 收集面板内所有可见按钮 */
function visibleButtons(wrapper: ReturnType<typeof mountWrapper>): DOMWrapper<HTMLElement>[] {
  return wrapper.findAll('button').filter((b) => b.isVisible()) as DOMWrapper<HTMLElement>[]
}

describe('EdgePanel 模态行为', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.style.overflow = ''
    navBridge.adjacentRooms.value = []
  })

  afterEach(() => {
    restoreClientRects()
    document.body.style.overflow = ''
  })

  describe('body 滚动锁', () => {
    it('打开时锁定背景滚动，关闭后还原', async () => {
      const wrapper = mountWrapper({ visible: false })
      expect(document.body.style.overflow).toBe('')

      await wrapper.setProps({ visible: true })
      expect(document.body.style.overflow).toBe('hidden')

      await wrapper.setProps({ visible: false })
      expect(document.body.style.overflow).toBe('')
      wrapper.unmount()
    })

    it('可见状态下卸载组件时兜底释放滚动锁', () => {
      const wrapper = mountWrapper({ visible: true })
      expect(document.body.style.overflow).toBe('hidden')
      wrapper.unmount()
      expect(document.body.style.overflow).toBe('')
    })
  })

  describe('Escape 关闭', () => {
    it('面板可见时按下 Escape 触发 close 事件', async () => {
      const wrapper = mountWrapper({ visible: true })
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(wrapper.emitted('close')).toBeTruthy()
      wrapper.unmount()
    })

    it('面板关闭后移除键盘监听，不再响应 Escape', async () => {
      const wrapper = mountWrapper({ visible: true })
      await wrapper.setProps({ visible: false })
      const before = wrapper.emitted('close')?.length ?? 0
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      expect(wrapper.emitted('close')?.length ?? 0).toBe(before)
      wrapper.unmount()
    })
  })

  describe('焦点陷阱', () => {
    it('打开后焦点移入面板', async () => {
      makeElementsVisible()
      const wrapper = mountWrapper({ visible: true })
      await nextTick()
      const active = document.activeElement
      const inPanel = wrapper.find('.edge-panel').element.contains(active)
      expect(inPanel).toBe(true)
      wrapper.unmount()
    })

    it('Tab：在最后一个可聚焦项上按 Tab 回绕到第一个', async () => {
      makeElementsVisible()
      const wrapper = mountWrapper({ visible: true })
      await nextTick()

      const buttons = visibleButtons(wrapper)
      expect(buttons.length).toBeGreaterThan(0)
      const first = buttons[0].element
      const last = buttons[buttons.length - 1].element
      last.focus()
      expect(document.activeElement).toBe(last)

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }))
      expect(document.activeElement).toBe(first)
      wrapper.unmount()
    })

    it('Shift+Tab：在第一个可聚焦项上回绕到最后一个', async () => {
      makeElementsVisible()
      const wrapper = mountWrapper({ visible: true })
      await nextTick()

      const buttons = visibleButtons(wrapper)
      const first = buttons[0].element
      const last = buttons[buttons.length - 1].element
      first.focus()

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true }))
      expect(document.activeElement).toBe(last)
      wrapper.unmount()
    })
  })

  describe('遮罩层 aria 语义', () => {
    it('遮罩层具有 role=dialog、aria-modal 与 aria-label', () => {
      const wrapper = mountWrapper({ visible: true })
      const root = wrapper.get('.edge-panel')
      expect(root.attributes('role')).toBe('dialog')
      expect(root.attributes('aria-modal')).toBe('true')
      expect(root.attributes('aria-label')).toBe('侧边入口')
      expect(root.attributes('tabindex')).toBe('-1')
      wrapper.unmount()
    })
  })

  describe('相邻房间数量提示', () => {
    it('相邻房间超过 6 个时渲染前 6 个并提示剩余数量', async () => {
      navBridge.adjacentRooms.value = Array.from({ length: 9 }, (_, i) => ({
        id: `r${i}`,
        name: `房间${i}`,
        description: `描述${i}`,
        icon: `🏠`,
      }))
      const wrapper = mountWrapper({ visible: true })
      await nextTick()
      expect(wrapper.findAll('.adjacent-room-btn').length).toBe(6)
      expect(wrapper.find('.adjacent-more').text()).toContain('3')
      wrapper.unmount()
    })

    it('不超过 6 个时不显示剩余提示', async () => {
      navBridge.adjacentRooms.value = Array.from({ length: 4 }, (_, i) => ({
        id: `r${i}`,
        name: `房间${i}`,
        description: `描述${i}`,
        icon: `🏙`,
      }))
      const wrapper = mountWrapper({ visible: true })
      await nextTick()
      expect(wrapper.find('.adjacent-more').exists()).toBe(false)
      wrapper.unmount()
    })
  })

  describe('专注计时按钮反馈', () => {
    it('空闲时点击：启动计时并弹成功提示', async () => {
      timerBridge.isFocusing = false
      timerBridge.isPaused = false
      const wrapper = mountWrapper({ visible: true })

      const btn = wrapper.findAll('.panel-action')[0]
      await btn.trigger('click')

      expect(timerBridge.start).toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('计时已开始'), 'success')
      wrapper.unmount()
    })

    it('正在专注时点击：不启动计时，弹 info 提示', async () => {
      timerBridge.isFocusing = true
      timerBridge.isPaused = false
      const wrapper = mountWrapper({ visible: true })

      const btn = wrapper.findAll('.panel-action')[0]
      await btn.trigger('click')

      expect(timerBridge.start).not.toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('正在进行中'), 'info')
      wrapper.unmount()
    })

    it('暂停时点击：不启动计时并弹 info 提示', async () => {
      timerBridge.isFocusing = false
      timerBridge.isPaused = true
      const wrapper = mountWrapper({ visible: true })

      const btn = wrapper.findAll('.panel-action')[0]
      await btn.trigger('click')

      expect(timerBridge.start).not.toHaveBeenCalled()
      expect(showToast).toHaveBeenCalledWith(expect.stringContaining('已暂停'), 'info')
      wrapper.unmount()
    })
  })
})