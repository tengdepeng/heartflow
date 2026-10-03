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
  createRule: vi.fn((
    name: string,
    type: string,
    action: string,
    target: string,
    params: Record<string, string> = {},
    priority: number = 50,
    scenes: string[] = ['*'],
  ) => ({
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    type,
    action,
    target,
    params,
    enabled: true,
    priority,
    scenes,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  })),
  addRuleToConfig: vi.fn((config: any, rule: any) => ({
    ...config,
    rules: [...config.rules, rule],
    updatedAt: new Date().toISOString(),
  })),
  removeRuleFromConfig: vi.fn((config: any, ruleId: string) => ({
    ...config,
    rules: config.rules.filter((r: any) => r.id !== ruleId),
    updatedAt: new Date().toISOString(),
  })),
  updateRule: vi.fn((rule: any, updates: any) => ({
    ...rule,
    ...updates,
    updatedAt: new Date().toISOString(),
  })),
  sortRulesByPriority: vi.fn((rules: any[]) => [...rules].sort((a, b) => b.priority - a.priority)),
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

/** 构造一个已展开、含指定规则的配置集种子数据 */
function seedConfigs(rules: any[]) {
  mockStore['hf:interaction_configs'] = [
    {
      id: 'cfg_seed',
      name: '种子配置',
      description: '用于测试',
      rules,
      settings: {
        gestureEnabled: true,
        soundEnabled: true,
        animationEnabled: true,
        hapticEnabled: false,
        animationSpeed: 1.0,
        doubleTapDelay: 300,
        longPressDuration: 500,
      },
      active: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ]
}

function makeRule(over: Record<string, any> = {}) {
  return {
    id: 'rule_a',
    name: '规则A',
    type: 'tap',
    action: 'toggle',
    target: '#a',
    params: {},
    enabled: true,
    priority: 50,
    scenes: ['*'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  }
}

/** 展开第一个配置卡片，使规则列表（InteractionConfigBody）进入渲染树 */
async function expandFirstConfig(wrapper: any) {
  await wrapper.find('.config-header').trigger('click')
  await wrapper.vm.$nextTick()
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

  it('新增规则走 addRuleToConfig 且新规则出现在列表中', async () => {
    seedConfigs([])
    const wrapper = await getWrapper()
    await expandFirstConfig(wrapper)

    // 打开「添加规则」弹窗
    const addBtn = wrapper.findAll('button').find(b => b.text().includes('添加规则'))
    expect(addBtn).toBeTruthy()
    await addBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[placeholder="规则名称…"]').setValue('新规则')
    await wrapper.find('input[placeholder="CSS选择器或元素ID…"]').setValue('#new')
    await wrapper.findAll('button').find(b => b.text() === '保存')!.trigger('click')
    await wrapper.vm.$nextTick()

    const { addRuleToConfig } = await import('../../modules/customization/interaction-engine')
    expect(addRuleToConfig).toHaveBeenCalledTimes(1)
    // 新规则确实进入了配置（引擎返回值被写回下标）
    expect(wrapper.text()).toContain('新规则')
  })

  it('编辑规则走 updateRule 且新字段生效', async () => {
    seedConfigs([makeRule({ id: 'rule_a', name: '旧名称', priority: 10 })])
    const wrapper = await getWrapper()
    await expandFirstConfig(wrapper)
    expect(wrapper.text()).toContain('旧名称')

    // 打开该规则的编辑弹窗（同一 .rule-item 内的编辑按钮）
    const editBtn = wrapper.findAll('.rule-item button').find(b => b.attributes('title') === '编辑')
    expect(editBtn).toBeTruthy()
    await editBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    await wrapper.find('input[placeholder="规则名称…"]').setValue('改名后')
    await wrapper.findAll('button').find(b => b.text() === '保存')!.trigger('click')
    await wrapper.vm.$nextTick()

    const { updateRule } = await import('../../modules/customization/interaction-engine')
    expect(updateRule).toHaveBeenCalledTimes(1)
    const [, updates] = (updateRule as any).mock.calls[0]
    expect(updates).toMatchObject({ name: '改名后' })
    // 引擎返回的新对象已写回，界面随之更新
    expect(wrapper.text()).toContain('改名后')
    expect(wrapper.text()).not.toContain('旧名称')
  })
})