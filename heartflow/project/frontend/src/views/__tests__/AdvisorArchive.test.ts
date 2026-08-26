// ============================================================
// AdvisorArchive 视图测试 - 幕僚档案
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟路由 ----
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// ---- 模拟 types ----
vi.mock('../../types', () => ({
  ADVISOR_ROLES: [
    { key: 'mentor', icon: '🧘', label: '导师' },
    { key: 'companion', icon: '🤝', label: '同伴' },
  ],
  AFFINITY_TIERS: [
    { threshold: 0, title: '陌路', minInteractions: 0 },
    { threshold: 20, title: '相识', minInteractions: 5 },
    { threshold: 40, title: '熟稔', minInteractions: 20 },
    { threshold: 60, title: '信赖', minInteractions: 50 },
    { threshold: 80, title: '知己', minInteractions: 100 },
    { threshold: 95, title: '羁绊', minInteractions: 200 },
  ],
}))

// ---- 模拟 advisor store (Pinia 自动解包 ref) ----
let mockAdvisors: any[] = []
const mockUnretireAdvisor = vi.fn()

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    advisors: mockAdvisors,
    unretireAdvisor: (id: string) => mockUnretireAdvisor(id),
    $reset: () => {},
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => {
    const result: Record<string, any> = {}
    for (const key of Object.keys(store)) {
      if (key.startsWith('$')) continue
      result[key] = store[key]
    }
    return result
  },
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: AdvisorArchive } = await import('../AdvisorArchive.vue')
  return mount(AdvisorArchive, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('AdvisorArchive 幕僚档案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('荣休录')
    expect(wrapper.text()).toContain('退役幕僚')
  })

  it('无退役幕僚时显示空状态', async () => {
    mockAdvisors = [
      { id: 'a1', name: '在位幕僚', role: 'mentor', retired: false, affinity: 30, totalInteractions: 10 },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无退役幕僚')
    expect(wrapper.text()).toContain('在位幕僚可在幕僚大厅中选择「沉睡」后退役')
  })

  it('显示概览统计', async () => {
    mockAdvisors = [
      { id: 'a1', name: '退役幕僚', role: 'mentor', retired: true, affinity: 60, totalInteractions: 50, createdAt: '2026-01-01T00:00:00Z', retiredAt: '2026-06-15T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已退役')
    expect(wrapper.text()).toContain('在位')
    expect(wrapper.text()).toContain('1')
  })

  it('退役幕僚显示唤醒按钮', async () => {
    mockAdvisors = [
      { id: 'a1', name: '可唤醒的幕僚', role: 'mentor', retired: true, affinity: 60, totalInteractions: 50, createdAt: '2026-01-01T00:00:00Z', retiredAt: '2026-06-15T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    const unretireBtn = wrapper.find('.aar-btn-unretire')
    expect(unretireBtn.exists()).toBe(true)
    expect(unretireBtn.text()).toContain('唤醒')
  })

  it('返回按钮可点击', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.aar-back-btn')
    expect(backBtn.exists()).toBe(true)
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/advisors')
  })
})