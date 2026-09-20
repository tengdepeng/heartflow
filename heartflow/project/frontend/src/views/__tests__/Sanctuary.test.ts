// ============================================================
// Sanctuary 视图测试 - 安全岛
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'

// ---- 模拟路由 ----
const mockPush = vi.fn()
const mockBack = vi.fn()
const mockReplace = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}))

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 runtime store ----
const mockExitSanctuary = vi.fn()

vi.mock('../../resonance/bridges/runtime', () => ({
  useRuntimeState: () => ({
    enterSanctuary: () => {},
    exitSanctuary: () => mockExitSanctuary(),
    isSanctuaryActive: ref(false),
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: Sanctuary } = await import('../Sanctuary.vue')
  return mount(Sanctuary, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('Sanctuary 安全岛', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    // 安全岛没有大标题，但有统计概览
    expect(wrapper.text()).toContain('总访问')
    expect(wrapper.text()).toContain('本周访问')
    expect(wrapper.text()).toContain('总停留')
    expect(wrapper.text()).toContain('释放便签')
  })

  it('显示统计概览', async () => {
    const wrapper = await getWrapper()
    const statItems = wrapper.findAll('.stat-item')
    expect(statItems.length).toBe(4)
  })

  it('显示呼吸引导区域', async () => {
    const wrapper = await getWrapper()
    const breathOrb = wrapper.find('.breath-orb')
    expect(breathOrb.exists()).toBe(true)
  })

  it('显示退出按钮', async () => {
    const wrapper = await getWrapper()
    const exitBtn = wrapper.find('.exit-btn')
    expect(exitBtn.exists()).toBe(true)
    expect(exitBtn.text()).toContain('退出')
  })

  it('显示便签触发按钮', async () => {
    const wrapper = await getWrapper()
    const noteTrigger = wrapper.find('.note-trigger')
    expect(noteTrigger.exists()).toBe(true)
  })

  it('中枢总览面板：真实桥渲染 + 待触发空态（INCR-389）', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('[data-test="sanctuary-bridge-panel"]')
    expect(panel.exists()).toBe(true)
    expect(panel.find('.snb-title').text()).toContain('安全岛·中枢总览')
    expect(panel.find('[data-test="snb-status"]').classes()).toContain('idle')
    expect(panel.text()).toContain('待触发')
    expect(panel.find('[data-test="snb-empty"]').text()).toContain('中枢尚在待命')
  })
})