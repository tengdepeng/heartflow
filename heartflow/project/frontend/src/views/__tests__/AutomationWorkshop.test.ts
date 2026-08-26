// ============================================================
// AutomationWorkshop 视图测试 - 自律工坊
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ---- 模拟 storage ----
const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => {
  // 默认返回空数组，避免测试报错
  if (_key === 'hf:automation_flows') return []
  return mockStore[_key] ?? def
})
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

// ---- 模拟 automation engine ----
const mockGetHistory = vi.fn(() => [])

vi.mock('../../engine/automation', () => ({
  automationEngine: {
    execute: vi.fn(() => Promise.resolve({ id: 'rec1', flowName: '测试流程', status: 'ok', at: '2026-07-01T00:00:00Z' })),
    getHistory: () => mockGetHistory(),
  },
  getFlowTemplates: () => [],
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: AutomationWorkshop } = await import('../AutomationWorkshop.vue')
  return mount(AutomationWorkshop, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('AutomationWorkshop 自律工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('自动化工坊')
    expect(wrapper.text()).toContain('自动化工作流编排')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已保存流程')
    expect(wrapper.text()).toContain('执行记录')
    expect(wrapper.text()).toContain('预置模板')
    // 默认值应该为 0
    const overviewValues = wrapper.findAll('.ov-value')
    expect(overviewValues.length).toBeGreaterThan(0)
  })

  it('显示编排画布区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('编排画布')
    expect(wrapper.text()).toContain('触发条件')
    expect(wrapper.text()).toContain('逻辑节点')
    expect(wrapper.text()).toContain('原子操作')
  })

  it('画布初始为空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('将触发、条件、操作拖到这里')
  })

  it('无保存流程时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有保存的流程')
  })

  it('无执行历史时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有执行记录')
  })
})