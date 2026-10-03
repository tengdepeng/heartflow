// ============================================================
// InteractionConfigBody 组件测试 - 规则列表优先级排序 + 规则删除
// 本测试刻意不 mock interaction-engine：要验证真实 sortRulesByPriority
// 被正确消费并影响 DOM 顺序，mock 掉引擎会让排序断言失去意义。
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'
import type { InteractionConfig, InteractionRule } from '../../../modules/customization/interaction-engine'

const CONFIGS_KEY = 'hf:interaction_configs'

function makeRule(over: Partial<InteractionRule> = {}): InteractionRule {
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

function makeConfig(rules: InteractionRule[]): InteractionConfig {
  return {
    id: 'cfg_body',
    name: '子组件配置',
    description: '用于测试',
    rules,
    settings: {
      gestureEnabled: true,
      soundEnabled: true,
      animationEnabled: true,
      animationSpeed: 1.0,
      hapticEnabled: false,
      doubleTapDelay: 300,
      longPressDuration: 800,
    },
    active: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

/**
 * 把配置集写入 mock localStorage 并驱动 store 载入。
 *
 * 用一个内联父组件来渲染被测子组件，等价于真实运行时的结构
 * （InteractionConfig.vue 里 `v-for="config in configs"` → `:config="config"`）：
 * 父组件从 store 数组读取并把元素作为 prop 下传。
 * 这样 removeRule 把新对象写回数组时，父组件会重新渲染并把新对象传下来，
 * 与真实行为一致；若直接 mount 子组件并传静态对象，prop 永远不会更新。
 */
async function mountBody(rules: InteractionRule[]) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore: { [CONFIGS_KEY]: [makeConfig(rules)] },
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()

  // 载入 store 单例，保证 configs.value 内含被测 config（removeRule 依赖下标查找）
  const { useInteractionConfigs } = await import('../../../modules/interaction')
  const store = useInteractionConfigs()
  store.load()

  const mod = await import('../InteractionConfigBody.vue')
  const Child = mod.default

  const wrapper = mount({
    components: { InteractionConfigBody: Child },
    // 父组件模板：从 store 数组取第一个元素作为 prop 下传（模拟真实父组件）
    template: `<InteractionConfigBody v-if="store.configs.value[0]" :config="store.configs.value[0]" />`,
    setup() {
      return { store }
    },
  })
  await wrapper.vm.$nextTick()
  return { wrapper, store, config: store.configs.value[0] }
}

/** 读取当前渲染出的规则名顺序（DOM 顺序） */
function renderedRuleNames(wrapper: any): string[] {
  return wrapper.findAll('.rule-item .rule-name').map((n: any) => n.text())
}

describe('InteractionConfigBody 规则列表', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('按 priority 降序渲染规则（10/90/50 → 90/50/10），且不改动存储顺序', async () => {
    // 故意用「添加顺序 = 10, 90, 50」，与优先级顺序不同，确保断言能证伪
    const rules = [
      makeRule({ id: 'r10', name: '低优先级', priority: 10 }),
      makeRule({ id: 'r90', name: '高优先级', priority: 90 }),
      makeRule({ id: 'r50', name: '中优先级', priority: 50 }),
    ]
    const { wrapper, config } = await mountBody(rules)

    // DOM 顺序必须按优先级降序
    expect(renderedRuleNames(wrapper)).toEqual(['高优先级', '中优先级', '低优先级'])

    // 存储顺序保持用户添加序（排序只影响展示，不落盘）
    expect(config.rules.map(r => r.id)).toEqual(['r10', 'r90', 'r50'])
  })

  it('删除规则后该规则从列表移除，且 store 中的 config 同步减少', async () => {
    const rules = [
      makeRule({ id: 'r1', name: '待删除' }),
      makeRule({ id: 'r2', name: '保留' }),
    ]
    const { wrapper, store } = await mountBody(rules)
    expect(renderedRuleNames(wrapper)).toEqual(['待删除', '保留'])

    // 第一条规则项的删除按钮（×）
    const delBtn = wrapper.findAll('.rule-item button').find(
      b => b.classes().includes('rule-btn-del'),
    )
    expect(delBtn).toBeTruthy()
    await delBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(renderedRuleNames(wrapper)).toEqual(['保留'])
    // 落盘对象（store 数组元素）也必须已被移除，而不只是 UI 局部状态
    expect(store.configs.value[0].rules.map(r => r.id)).toEqual(['r2'])
  })

  it('toggleRule 仍能翻转 enabled 并触发落盘', async () => {
    const rules = [makeRule({ id: 'r1', name: '可开关', enabled: true })]
    const { wrapper, store } = await mountBody(rules)

    // save 是 useInteractionConfigs() 每次返回的新对象里的闭包，无法 spy；
    // 因此直接断言落盘对象（store 数组元素）被改写。
    const toggleBtn = wrapper.findAll('.rule-item button').find(b => b.classes().includes('rule-toggle'))
    expect(toggleBtn).toBeTruthy()
    expect(toggleBtn!.classes()).toContain('on')

    await toggleBtn!.trigger('click')
    await wrapper.vm.$nextTick()

    expect(store.configs.value[0].rules[0].enabled).toBe(false)
    expect(wrapper.find('.rule-item').classes()).toContain('disabled')
  })
})
