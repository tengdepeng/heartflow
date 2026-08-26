// ============================================================
// AdvisorAffinity 视图测试 - 幕僚好感
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
  ADVISOR_PERSONALITIES: [
    { key: 'calm', label: '沉静', colorScheme: { primary: '#7c6cf0' } },
    { key: 'warm', label: '温煦', colorScheme: { primary: '#d4a574' } },
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

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    advisors: mockAdvisors,
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
  const { default: AdvisorAffinity } = await import('../AdvisorAffinity.vue')
  return mount(AdvisorAffinity, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('AdvisorAffinity 幕僚好感', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAdvisors = []
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('好感度')
    expect(wrapper.text()).toContain('与幕僚的羁绊')
  })

  it('无幕僚时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无幕僚数据')
    expect(wrapper.text()).toContain('请在幕僚大厅创建幕僚后查看好感度')
    expect(wrapper.text()).toContain('0')
  })

  it('有幕僚时显示概览卡片', async () => {
    mockAdvisors = [
      { id: 'a1', name: '墨染', role: 'mentor', personality: 'calm', affinity: 45, totalInteractions: 30 },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('墨染')
  })

  it('显示返回按钮', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.af-btn-back')
    expect(backBtn.exists()).toBe(true)
  })

  it('点击返回按钮跳转到幕僚大厅', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.af-btn-back')
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/advisors')
  })
})