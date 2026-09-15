// ============================================================
// DecorationWorkshop 视图测试 - 殿堂装修工坊
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

// ---- 模拟 useScenes ----
vi.mock('../../modules/scene', () => ({
  useScenes: () => ({
    scenes: ref([]),
    load: vi.fn(),
    save: vi.fn(),
  }),
}))

// ---- 模拟 useCarrier ----
vi.mock('../../modules/carrier', () => ({
  useCarrier: () => ({
    carriers: ref([]),
    load: vi.fn(),
  }),
}))

// ---- 模拟 useInteractionConfigs ----
vi.mock('../../modules/interaction', () => ({
  useInteractionConfigs: () => ({
    configs: ref([]),
    load: vi.fn(),
  }),
}))

// ---- 模拟 useDecorationHistory ----
vi.mock('../../modules/decoration-history', () => ({
  useDecorationHistory: () => ({
    historyItems: ref([]),
    load: vi.fn(),
  }),
  recordDecorationHistory: vi.fn(),
}))

// ---- 模拟 storage (间接依赖) ----
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn(() => []),
    setKV: vi.fn(),
  },
}))

async function getWrapper() {
  const { default: DecorationWorkshop } = await import('../DecorationWorkshop.vue')
  return mount(DecorationWorkshop, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('DecorationWorkshop 殿堂装修工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题"殿堂装修工坊"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('殿堂装修工坊')
  })

  it('渲染装修工具集', async () => {
    const wrapper = await getWrapper()
    const toolEls = wrapper.findAll('.tool-card')
    expect(toolEls.length).toBeGreaterThanOrEqual(1)
  })

  it('显示概览卡片区域', async () => {
    const wrapper = await getWrapper()
    const overviewCards = wrapper.findAll('.overview-card')
    expect(overviewCards.length).toBeGreaterThanOrEqual(4)
  })

  it('概览卡片显示装修工具', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('装修工具')
  })

  it('概览卡片显示场景预设', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('场景预设')
  })

  it('概览卡片显示交互规则', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('交互规则')
  })

  it('概览卡片显示载体', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('载体')
  })

  it('渲染内容区域', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.decoration-workshop').exists()).toBe(true)
  })
})

describe('DecorationWorkshop 场景编排面板集成 (INCR-223)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('集成渲染场景序列面板 SceneSequencePanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'SceneSequencePanel' }).exists()).toBe(true)
    expect(wrapper.text()).toContain('场景编排')
  })

  it('集成渲染环境模板面板 EnvironmentTemplatePanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'EnvironmentTemplatePanel' }).exists()).toBe(true)
  })

  it('场景序列面板展示内置序列(空存储回落内置数据)', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('✦ 场景序列')
    expect(wrapper.text()).toContain('一日循环')
  })

  it('环境模板面板展示内置模板(空存储回落内置数据)', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('◈ 环境模板')
    expect(wrapper.text()).toContain('暖琥珀')
  })
})