// ============================================================
// EdgePanel 边缘面板组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import EdgePanel from '../EdgePanel.vue'

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

// 模拟 useRoomNavigation
vi.mock('../../composables/useRoomNavigation', () => ({
  useRoomNavigation: vi.fn(() => ({
    currentRoomId: { value: 'home' },
    currentRoom: { value: null },
    adjacentRooms: { value: [] },
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
  })),
}))

// 模拟 timer bridge
vi.mock('../../resonance/bridges/timer', () => ({
  useTimer: vi.fn(() => ({
    isFocusing: false,
    isPaused: false,
    start: vi.fn(),
  })),
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

/** 共享的 mount 选项：stub Teleport 使其内容内联渲染 */
function mountEdgePanel(props: any = {}) {
  return mount(EdgePanel, {
    props,
    global: {
      stubs: {
        Teleport: { template: '<div><slot /></div>' },
      },
    },
  })
}

describe('EdgePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('visible 为 true 时渲染面板', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.find('.edge-panel').exists()).toBe(true)
  })

  it('visible 为 false 时不渲染面板', () => {
    const wrapper = mountEdgePanel({ visible: false })
    expect(wrapper.find('.edge-panel').exists()).toBe(false)
  })

  it('渲染面板标题', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.find('.panel-title').text()).toBe('侧边入口')
  })

  it('渲染关闭按钮', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.find('.panel-close').exists()).toBe(true)
  })

  it('点击关闭按钮触发 close 事件', async () => {
    const wrapper = mountEdgePanel({ visible: true })
    await wrapper.find('.panel-close').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('点击遮罩层（非面板区域）触发 close 事件', async () => {
    const wrapper = mountEdgePanel({ visible: true })
    await wrapper.find('.edge-panel').trigger('click')
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('渲染所有操作按钮（5个）', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.findAll('.panel-action').length).toBe(5)
  })

  it('渲染操作按钮的图标和标签', () => {
    const wrapper = mountEdgePanel({ visible: true })
    const actions = wrapper.findAll('.panel-action')
    expect(actions[0].text()).toContain('专注计时')
    expect(actions[1].text()).toContain('思绪书房')
  })

  it('渲染风格切换区域', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.find('.style-list').exists()).toBe(true)
  })

  it('渲染所有风格包选项', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.findAll('.style-chip').length).toBe(3)
  })

  it('当前激活的风格包有 active 类', () => {
    const wrapper = mountEdgePanel({ visible: true })
    const chips = wrapper.findAll('.style-chip')
    const activeChip = chips.find(c => c.classes().includes('active'))
    expect(activeChip).toBeTruthy()
    expect(activeChip!.text()).toBe('心流科技风')
  })

  it('渲染操作按钮的描述文字', () => {
    const wrapper = mountEdgePanel({ visible: true })
    expect(wrapper.text()).toContain('让这一段慢慢开始')
  })
})