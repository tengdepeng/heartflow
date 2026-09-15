// ============================================================
// MirrorSelf 组件测试
// ============================================================
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

// 模拟 vue-router
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ params: {}, query: {}, name: '', path: '', meta: {} }),
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
    advisors: [],
  }),
}))

const mountedWrappers: ReturnType<typeof mount>[] = []

async function getWrapper(options?: Parameters<typeof mount>[1]) {
  const { default: MirrorSelf } = await import('../MirrorSelf.vue')
  const w = mount(MirrorSelf, options)
  mountedWrappers.push(w)
  return w
}

// 流星径向菜单 Teleport 到 body：点珠展开后，用原生元素驱动流星项点击
async function clickMeteor(index: number) {
  const el = document.querySelectorAll('.ms-meteor')[index] as HTMLElement | undefined
  if (!el) throw new Error('流星项不存在 index=' + index)
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  await new Promise((r) => setTimeout(r, 20))
}

describe('MirrorSelf', () => {
  setActivePinia(createPinia())

  beforeEach(() => {
    vi.clearAllMocks()
    mockCurrentBubble.mockReturnValue(null)
  })

  afterEach(() => {
    for (const w of mountedWrappers) w.unmount()
    mountedWrappers.length = 0
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

  it('点击珠体唤起流星径向菜单', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    expect(document.querySelector('.ms-meteor-layer')).toBeTruthy()
    // onTap 仅在点「对话」流星时触发，点珠体本身不触发
    expect(mockOnTap).not.toHaveBeenCalled()
  })

  it('精简标签：只有名称，无时段标签', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.ms-name').exists()).toBe(true)
    expect(wrapper.find('.ms-time-badge').exists()).toBe(false)
  })

  it('净透琉璃层齐备：aura / glow / caustic / spec / sheen / rim', async () => {
    const wrapper = await getWrapper()
    for (const sel of ['.ms-aura', '.ms-glow', '.ms-caustic', '.ms-spec', '.ms-orb-sheen', '.ms-rim']) {
      expect(wrapper.find(`.ms-orb ${sel}`).exists()).toBe(true)
    }
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

  it('点流星「状态」显示状态面板（ms-tooltip）', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    await clickMeteor(1) // status
    expect(wrapper.find('.ms-tooltip').exists()).toBe(true)
  })

  it('状态面板显示定音锤进度条', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    await clickMeteor(1) // status
    expect(wrapper.find('.ms-progress-bar').exists()).toBe(true)
  })

  it('流星菜单含定音锤四幕入口（专注/情绪/笔记/回响）', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    const names = [...document.querySelectorAll('.ms-mlabel')].map((el) => el.textContent?.trim() ?? '')
    for (const n of ['专注', '情绪', '笔记', '回响']) {
      expect(names).toContain(n)
    }
  })

  it('状态面板显示今日专注时段时间轴', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    await clickMeteor(1) // status
    expect(wrapper.find('.ms-timeline').exists()).toBe(true)
    expect(wrapper.find('.ms-timeline-title').text()).toContain('今日专注时段')
  })

  it('状态面板房间切换按钮 emit update:activeRoomId', async () => {
    const wrapper = await getWrapper({ props: { activeRoomId: 'study' } })
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    await clickMeteor(1) // status
    const btns = wrapper.findAll('.ms-room-switch-btn')
    expect(btns.length).toBe(2)
    await btns[1].trigger('click') // 切换到下一间
    expect(wrapper.emitted('update:activeRoomId')).toBeTruthy()
  })

  it('点流星「对话」唤出对话面板', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('update:activeRoomId')).toBeFalsy()
    await clickMeteor(0) // dialogue
    expect(wrapper.find('.mirror-self--active').exists()).toBe(true)
  })

  it('有房间上下文时状态面板显示键盘可切换的房间按钮', async () => {
    const wrapper = await getWrapper({ props: { activeRoomId: 'study' } })
    await wrapper.find('button.mirror-self').trigger('click')
    await wrapper.vm.$nextTick()
    await clickMeteor(1) // status
    const btns = wrapper.findAll('.ms-room-switch-btn')
    expect(btns.length).toBe(2)
  })
})