// ============================================================
// AdvisorWitnessLog 视图测试 - 幕僚见证
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟路由 ----
const mockPush = vi.fn()
const mockRouteId = 'a1'

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockPush }),
  useRoute: () => ({ params: { id: mockRouteId }, query: { name: '测试幕僚' } }),
}))

// ---- 模拟 advisor store ----
const mockGetWitnessLog = vi.fn((_id?: string, _limit?: number) => [] as any[])
const mockGetWitnessSummary = vi.fn((_id?: string) => ({} as Record<string, number>))

vi.mock('../../stores/advisor', () => ({
  useAdvisorStore: () => ({
    getAdvisorById: (id: string) => ({ id, name: '测试幕僚', role: 'mentor', personality: 'calm' }),
    getWitnessLog: (id: string, page: number) => mockGetWitnessLog(id, page),
    getWitnessSummary: (id: string) => mockGetWitnessSummary(id),
    clearWitnessLog: vi.fn(),
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
  mockGetWitnessLog.mockReturnValue([])
  const { default: AdvisorWitnessLog } = await import('../AdvisorWitnessLog.vue')
  return mount(AdvisorWitnessLog, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('AdvisorWitnessLog 幕僚见证', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetWitnessLog.mockReturnValue([])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('见证')
    expect(wrapper.text()).toContain('时间线')
  })

  it('无记录时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('尚无见证记录')
    expect(wrapper.text()).toContain('没有匹配的见证记录')
  })

  it('显示事件筛选按钮', async () => {
    const wrapper = await getWrapper()
    const filterBtns = wrapper.findAll('.awl-filter-btn')
    expect(filterBtns.length).toBeGreaterThan(0)
    const allBtn = filterBtns.find(b => b.text().includes('全部'))
    expect(allBtn).toBeDefined()
  })

  it('返回按钮可点击', async () => {
    const wrapper = await getWrapper()
    const backBtn = wrapper.find('.awl-back-btn')
    expect(backBtn.exists()).toBe(true)
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalled()
  })
})