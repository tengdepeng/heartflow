// ============================================================
// WorkHub 视图测试 - 工作中心
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

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

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: WorkHub } = await import('../WorkHub.vue')
  return mount(WorkHub, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('WorkHub 工作中心', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工作中心')
    expect(wrapper.text()).toContain('把工作痕迹也放回自己这里')
  })

  it('显示概览卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('工痕')
    expect(wrapper.text()).toContain('劳酬')
    expect(wrapper.text()).toContain('技能')
  })

  it('显示统计概览行', async () => {
    const wrapper = await getWrapper()
    const statItems = wrapper.findAll('.stat-item')
    expect(statItems.length).toBe(4)
    expect(statItems[3].text()).toContain('业脉')
  })

  it('显示标签页', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.tab')
    expect(tabs.length).toBeGreaterThanOrEqual(2)
    expect(tabs[0].text()).toContain('工痕')
  })

  it('默认显示工痕标签', async () => {
    const wrapper = await getWrapper()
    const activeTab = wrapper.find('.tab.active')
    expect(activeTab.exists()).toBe(true)
    expect(activeTab.text()).toContain('工痕')
  })

  it('工痕标签无数据时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有身体印记')
  })

  it('显示添加工痕表单', async () => {
    const wrapper = await getWrapper()
    const inputs = wrapper.findAll('.wh-input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    const addBtn = wrapper.find('.wh-btn')
    expect(addBtn.exists()).toBe(true)
    expect(addBtn.text()).toContain('+')
  })

  it('劳酬标签显示得失统计', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.tab')
    // 点击劳酬标签
    const valueTab = tabs.find(t => t.text().includes('劳酬'))
    if (valueTab) {
      await valueTab.trigger('click')
      expect(wrapper.text()).toContain('获得')
      expect(wrapper.text()).toContain('损失')
      expect(wrapper.text()).toContain('净收益')
    }
  })
})