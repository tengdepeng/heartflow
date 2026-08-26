// ============================================================
// MirrorSelf 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// 模拟 vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// 模拟 advisor bridge
const mockOnTap = vi.fn()
const mockCurrentBubble = vi.fn()
const mockGetQuickStats = vi.fn(() => ({ focusCount: 0, pendingAnchors: 0, emotionCount: 0, noteCount: 0 }))
const mockGetAllDingyinProgress = vi.fn(() => ({
  focus_complete: { current: 0, next: 5, progress: 0 },
  emotion_logged: { current: 0, next: 10, progress: 0 },
  note_created: { current: 0, next: 5, progress: 0 },
}))

vi.mock('../../resonance/bridges/advisor', () => ({
  useAdvisor: () => ({
    onTap: mockOnTap,
    currentBubble: mockCurrentBubble(),
    getQuickStats: mockGetQuickStats,
    getAllDingyinProgress: mockGetAllDingyinProgress,
  }),
}))

async function getWrapper(options?: Parameters<typeof mount>[1]) {
  const { default: MirrorSelf } = await import('../MirrorSelf.vue')
  return mount(MirrorSelf, options)
}

describe('MirrorSelf', () => {
  setActivePinia(createPinia())

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentBubble.mockReturnValue(null)
  })

  it('渲染组件根容器', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.mirror-self-wrapper').exists()).toBe(true)
  })

  it('渲染按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('button.mirror-self').exists()).toBe(true)
  })

  it('无气泡时不显示气泡', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-bubble').exists()).toBe(false)
  })

  it('有气泡时显示气泡文字', async () => {
    mockCurrentBubble.mockReturnValue('你好，今天状态不错')
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-bubble').exists()).toBe(true)
    expect(wrapper.text()).toContain('你好，今天状态不错')
  })

  it('点击按钮触发 onTap', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    expect(mockOnTap).toHaveBeenCalledTimes(1)
  })

  it('显示时段标签', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-time-badge').exists()).toBe(true)
  })

  it('有气泡时 orb 添加 active 类', async () => {
    mockCurrentBubble.mockReturnValue('测试')
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-orb').classes()).toContain('active')
  })

  it('无气泡时 orb 无 active 类', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-orb').classes()).not.toContain('active')
  })

  it('长按后显示 tooltip', async () => {
    vi.useFakeTimers()
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ms-tooltip').exists()).toBe(true)
    vi.useRealTimers()
  })

  it('tooltip 显示定音锤进度条', async () => {
    vi.useFakeTimers()
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ms-progress-bar').exists()).toBe(true)
    vi.useRealTimers()
  })

  it('渲染定音锤四幕入口按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.dingyin-entry-btn').exists()).toBe(true)
  })

  it('长按面板显示今日专注时段时间轴', async () => {
    vi.useFakeTimers()
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ms-timeline').exists()).toBe(true)
    expect(wrapper.find('.ms-timeline-title').text()).toContain('今日专注时段')
    vi.useRealTimers()
  })

  it('左滑切房间 emit update:activeRoomId', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('button.mirror-self')
    await btn.trigger('pointerdown', { clientX: 0, clientY: 0 })
    await btn.trigger('pointerup', { clientX: -120, clientY: 0 })
    expect(wrapper.emitted('update:activeRoomId')).toBeTruthy()
  })

  it('右滑唤对话 emit 且展开对话面板', async () => {
    const wrapper = await getWrapper()
    const btn = wrapper.find('button.mirror-self')
    await btn.trigger('pointerdown', { clientX: 0, clientY: 0 })
    await btn.trigger('pointerup', { clientX: 120, clientY: 0 })
    expect(wrapper.emitted('update:activeRoomId')).toBeFalsy()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.mirror-self--active').exists()).toBe(true)
  })

  it('有房间上下文时长按面板显示键盘可切换的房间按钮', async () => {
    vi.useFakeTimers()
    const wrapper = await getWrapper({ props: { activeRoomId: 'study' } })
    await wrapper.find('button.mirror-self').trigger('pointerdown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()
    const btns = wrapper.findAll('.ms-room-switch-btn')
    expect(btns.length).toBe(2)
    await btns[1].trigger('click') // 下一间
    expect(wrapper.emitted('update:activeRoomId')).toBeTruthy()
    vi.useRealTimers()
  })
})