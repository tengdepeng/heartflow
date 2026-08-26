// ============================================================
// InteractionConfig 视图测试 - 交互配置
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

// ---- 模拟 vue-router ----
const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/' }),
}))

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
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

// ---- 模拟 interaction-engine 模块 ----
const INTERACTION_LABELS: Record<string, string> = {
  tap: '点击', swipe: '滑动', longpress: '长按', drag: '拖拽', hover: '悬停',
}
const ACTION_LABELS: Record<string, string> = {
  toggle: '切换', navigate: '导航', open: '打开', close: '关闭', trigger: '触发',
}

vi.mock('../../modules/customization/interaction-engine', () => ({
  createConfig: vi.fn((name: string, description?: string) => ({
    id: `cfg_${Date.now()}`,
    name,
    description: description || '',
    rules: [],
    active: false,
    settings: {
      gestureEnabled: true,
      soundEnabled: true,
      animationEnabled: true,
      hapticEnabled: false,
      animationSpeed: 1.0,
      doubleTapDelay: 300,
      longPressDuration: 500,
    },
  })),
  createRule: vi.fn((name: string, target: string, type: string, action: string) => ({
    id: `rule_${Date.now()}`,
    name,
    target,
    type,
    action,
    enabled: true,
    priority: 50,
    scenes: ['*'],
  })),
  detectConflicts: vi.fn(() => []),
  exportConfig: vi.fn(() => '{}'),
  importConfig: vi.fn(() => null),
  INTERACTION_LABELS,
  ACTION_LABELS,
}))

async function getWrapper() {
  const { default: InteractionConfig } = await import('../InteractionConfig.vue')
  return mount(InteractionConfig, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('InteractionConfig 交互配置', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockStore).forEach(k => delete mockStore[k])
  })

  it('渲染标题"交互配置"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('交互配置')
  })

  it('显示概览卡片区域', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.overview-card')
    expect(overviewCards.length).toBeGreaterThanOrEqual(4)
  })

  it('概览卡片显示配置集', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('配置集')
  })

  it('概览卡片显示规则', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('规则')
  })

  it('概览卡片显示活跃', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('活跃')
  })

  it('概览卡片显示冲突', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('冲突')
  })

  it('显示新建配置按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('新建配置')
  })

  it('显示空状态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('暂无')
  })
})