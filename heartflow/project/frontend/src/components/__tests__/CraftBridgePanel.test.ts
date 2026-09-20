// ============================================================
// CraftBridgePanel 匠庐·桥接驾驶舱（INCR-386）
// 薄委托组件：消费 useCraftBridge 的只读聚合
// （craftHealth / dashboard / synthesisEfficiencies / workRecommendations），
// 经直接子路径 ../modules/craft/craft-bridge 引用，
// 测试 mock 该子路径注入受控 ref（遵循 INCR-99 ref 可改写教训）。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'

// ---- 受控 bridge 状态 ----
const state = {
  health: ref<any>(null),
  dashboard: ref<any>(null),
  synth: ref<any[]>([]),
  recs: ref<any[]>([]),
}

vi.mock('../../modules/craft/craft-bridge', () => ({
  useCraftBridge: () => ({
    craftHealth: state.health,
    dashboard: state.dashboard,
    synthesisEfficiencies: state.synth,
    workRecommendations: state.recs,
  }),
}))

// ---- 种子工厂 ----
function health(overrides: Record<string, any> = {}) {
  return {
    score: 0,
    workProductivity: 0,
    completionRate: 0,
    evolutionEfficiency: 0,
    materialAbundance: 0,
    synthesisSuccessRate: 0,
    badgeCollectionRate: 0,
    habitStability: 0,
    suggestions: ['开始你的第一件作品吧，匠庐等待你的到来'],
    ...overrides,
  }
}

function dashboard(overrides: Record<string, any> = {}) {
  return {
    activeWorks: 0,
    newThisMonth: 0,
    completedThisMonth: 0,
    totalEvolution: 0,
    materialTypes: 0,
    totalMaterials: 0,
    unlockedBadges: 0,
    availableRecipes: 0,
    activeSynthesis: 0,
    pendingInspirations: 0,
    currentStreak: 0,
    ...overrides,
  }
}

function synth(overrides: Record<string, any> = {}) {
  return {
    recipeId: 'r1',
    recipeName: '木质茶盘',
    category: '木作',
    attempts: 10,
    successes: 7,
    successRate: 70,
    totalOutputs: 14,
    totalWasted: 3,
    ...overrides,
  }
}

function rec(overrides: Record<string, any> = {}) {
  return {
    type: 'continue',
    priority: 'high',
    title: '继续未完成的作品',
    description: '「瓶中稿」还是草稿状态，继续打磨它吧',
    targetWorkId: 'w1',
    expectedBenefit: '推进作品完成，提升完成率',
    ...overrides,
  }
}

async function mountPanel(): Promise<VueWrapper<any>> {
  const { default: CraftBridgePanel } = await import('../CraftBridgePanel.vue')
  return mount(CraftBridgePanel)
}

describe('CraftBridgePanel 匠庐·桥接驾驶舱（INCR-386）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.health.value = health()
    state.dashboard.value = dashboard()
    state.synth.value = []
    state.recs.value = []
  })

  it('空态：标题 + 徽标归零待启 + 七维全 0 + 空态引导, 仪表/合成/指引不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="craft-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.find('.crbp-title').text()).toContain('匠庐·桥接驾驶舱')
    expect(wrapper.find('[data-test="crbp-health"]').text()).toContain('待启')
    const dims = wrapper.findAll('[data-test="crbp-dim"]')
    expect(dims.length).toBe(7)
    expect(dims[0].text()).toContain('产出率')
    expect(dims[0].text()).toContain('0%')
    expect(wrapper.find('[data-test="crbp-dashboard"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="crbp-synth"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="crbp-recs"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="crbp-empty"]').text()).toContain('还没有创作的痕迹')
  })

  it('健康度：分数 + 徽标安稳 + 七维分布值 + 建议条渲染', async () => {
    state.health.value = health({
      score: 66,
      workProductivity: 70,
      completionRate: 40,
      evolutionEfficiency: 55,
      materialAbundance: 60,
      synthesisSuccessRate: 75,
      badgeCollectionRate: 45,
      habitStability: 80,
      suggestions: ['作品进化值较低，多花时间打磨作品质量'],
    })
    state.dashboard.value = dashboard({ activeWorks: 3 })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="crbp-health"]').text()).toContain('66')
    expect(wrapper.find('[data-test="crbp-health"]').text()).toContain('安稳')
    expect(wrapper.find('[data-test="crbp-health"]').classes()).toContain('crbp-health--stable')
    const dims = wrapper.findAll('[data-test="crbp-dim"]')
    expect(dims[1].text()).toContain('完成率')
    expect(dims[1].text()).toContain('40%')
    expect(dims[6].text()).toContain('习惯稳定')
    expect(dims[6].text()).toContain('80%')
    expect(wrapper.find('[data-test="crbp-sug"]').text()).toContain('作品进化值较低')
    expect(wrapper.find('[data-test="crbp-empty"]').exists()).toBe(false)
  })

  it('工坊仪表：11 项指标 + 有数据时渲染', async () => {
    state.dashboard.value = dashboard({
      activeWorks: 5,
      newThisMonth: 2,
      completedThisMonth: 1,
      totalEvolution: 88,
      materialTypes: 6,
      totalMaterials: 42,
      unlockedBadges: 4,
      availableRecipes: 8,
      activeSynthesis: 1,
      pendingInspirations: 3,
      currentStreak: 7,
    })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="crbp-dashboard"]').exists()).toBe(true)
    const metrics = wrapper.findAll('[data-test="crbp-metric"]')
    expect(metrics.length).toBe(11)
    expect(metrics[0].text()).toContain('活跃作品')
    expect(metrics[0].text()).toContain('5')
    expect(metrics[6].text()).toContain('已解锁徽章')
    expect(metrics[6].text()).toContain('4')
    expect(metrics[9].text()).toContain('待用灵感')
    expect(metrics[9].text()).toContain('3')
    expect(wrapper.find('[data-test="crbp-empty"]').exists()).toBe(false)
  })

  it('合成效率：仅渲染有尝试记录的配方(名称/成功率/产出/浪费)', async () => {
    state.synth.value = [synth(), synth({ recipeId: 'r2', recipeName: '青瓷茶盏', category: '瓷作', attempts: 4, successes: 2, successRate: 50, totalOutputs: 3, totalWasted: 1 })]
    const wrapper = await mountPanel()
    const rows = wrapper.findAll('[data-test="crbp-synth-item"]')
    expect(rows.length).toBe(2)
    expect(rows[0].text()).toContain('木质茶盘')
    expect(rows[0].text()).toContain('70%')
    expect(rows[0].text()).toContain('产出 14 · 浪费 3')
    expect(wrapper.find('[data-test="crbp-synth"]').exists()).toBe(true)
  })

  it('合成效率：无尝试记录(attempts=0)时整块不渲染', async () => {
    state.synth.value = [{ ...synth(), attempts: 0, successes: 0, successRate: 0 }]
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="crbp-synth"]').exists()).toBe(false)
  })

  it('作品指引：高优先(crbp-prio-high)+低优先 + 类型/标题/描述/预期', async () => {
    state.recs.value = [
      rec(),
      rec({ type: 'archive', priority: 'low', title: '整理已完成的作品', description: '「旧作集」已完成32天，考虑归档整理', expectedBenefit: '保持工坊整洁，可能解锁归档徽章' }),
    ]
    const wrapper = await mountPanel()
    const items = wrapper.findAll('[data-test="crbp-recs-item"]')
    expect(items.length).toBe(2)
    expect(items[0].classes()).toContain('crbp-prio-high')
    expect(items[0].text()).toContain('继续 · 继续未完成的作品')
    expect(items[0].text()).toContain('「瓶中稿」还是草稿状态')
    expect(items[0].text()).toContain('预期 推进作品完成')
    expect(items[1].classes()).toContain('crbp-prio-low')
    expect(items[1].text()).toContain('归档 · 整理已完成的作品')
    expect(wrapper.find('[data-test="crbp-empty"]').exists()).toBe(false)
  })

  it('非全空：健康分>0而不为0 空态引导不渲染', async () => {
    state.health.value = health({ score: 25 })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="crbp-empty"]').exists()).toBe(false)
  })
})