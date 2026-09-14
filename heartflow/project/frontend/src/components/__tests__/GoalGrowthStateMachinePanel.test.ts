import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import type { Goal } from '../../modules/goal/types'
import type { GoalHealth, StateTransition, TransitionContext } from '../../modules/goal/goal-state-machine'
import GoalGrowthStateMachinePanel from '../GoalGrowthStateMachinePanel.vue'

// ---- 受控 store（仅 mock barrel 里的 useGoal，状态机引擎保持真实）----
const goals = ref<Goal[]>([])
const targets = ref<Goal[]>([])
const plans = ref<Goal[]>([])
const unhealthy = ref<{ goal: Goal; health: GoalHealth }[]>([])
const getHealth = vi.fn()
const getTransitions = vi.fn()
const getContext = vi.fn()
const load = vi.fn()

vi.mock('../../modules/goal', () => ({
  useGoal: () => ({
    goals, plans, targets,
    unhealthyGoals: unhealthy,
    load,
    getContext,
    getTransitions,
    getHealth,
  }),
}))

function makeGoal(partial: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: '测试目标',
    description: '',
    tier: 'target',
    status: 'seed',
    domain: 'growth',
    order: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-09-01T00:00:00Z',
    anchorCount: 0,
    anchorDone: 0,
    ...partial,
  }
}

function health(partial: Partial<GoalHealth> = {}): GoalHealth {
  return {
    score: 0.9, level: 'healthy', suggestions: [], luminance: 0.93,
    ...partial,
  }
}

const DT = (v: Partial<TransitionContext> = {}): TransitionContext => ({
  childCount: 0, totalAnchors: 0, doneAnchors: 0, daysSinceUpdate: 0,
  daysSinceCreated: 0, consecutiveDrifts: 0, ...v,
})

function mountPanel() {
  return mount(GoalGrowthStateMachinePanel)
}

describe('GoalGrowthStateMachinePanel 目标·成长状态机', () => {
  beforeEach(() => {
    goals.value = []
    targets.value = []
    plans.value = []
    unhealthy.value = []
    getHealth.mockReset()
    getTransitions.mockReset()
    getContext.mockReset()
    load.mockReset()
  })

  it('标题与副题渲染', async () => {
    targets.value = [makeGoal()]
    const wrapper = mountPanel()
    await nextTick()
    expect(wrapper.text()).toContain('目标 · 成长状态机')
    expect(wrapper.text()).toContain('种子 · 发芽 · 生长 · 开花')
  })

  it('空态：无目标 → 引导文案', async () => {
    const wrapper = mountPanel()
    await nextTick()
    expect(wrapper.text()).toContain('暂无目标可检视')
  })

  it('生命周期导览渲染主干四阶段与休眠提示', async () => {
    targets.value = [makeGoal({ status: 'growing' })]
    const wrapper = mountPanel()
    await nextTick()
    const t = wrapper.text()
    expect(t).toContain('种子')
    expect(t).toContain('发芽')
    expect(t).toContain('生长中')
    expect(t).toContain('已开花')
    expect(t).toContain('旧梦潭')
    expect(t).toContain('休眠')
  })

  it('点击目标：显示状态徽标、健康度建议与自动推进预告', async () => {
    const g = makeGoal({ id: 'g2', title: '学琴', status: 'sprout', domain: 'play', anchorCount: 3, anchorDone: 1 })
    goals.value = [g]
    targets.value = [g]
    unhealthy.value = []
    getContext.mockReturnValue(DT({ doneAnchors: 1, childCount: 1 }))
    getHealth.mockReturnValue(health({ score: 0.55, level: 'warning', suggestions: ['目标已两周没有进展'] }))
    getTransitions.mockReturnValue([])

    const wrapper = mountPanel()
    await nextTick()
    await wrapper.find('.gsm-pick-btn').trigger('click')
    await nextTick()

    const t = wrapper.text()
    expect(t).toContain('学琴')
    expect(t).toContain('发芽')
    // 健康度
    expect(t).toContain('需留意')
    expect(t).toContain('55%')
    expect(t).toContain('目标已两周没有进展')
    // 自动推进（真实状态机：sprout 且有已完锚点 → growing）
    expect(t).toContain('自动推进')
    expect(t).toContain('生长中')
  })

  it('显示可用转换（from → to 转换名与描述）', async () => {
    const g = makeGoal({ id: 'g3', title: '健跑', status: 'growing', domain: 'health' })
    goals.value = [g]
    targets.value = [g]
    getContext.mockReturnValue(DT({}))
    getHealth.mockReturnValue(health())
    const transition: StateTransition = {
      from: 'growing', to: 'bloom', label: '开花结果',
      description: '所有计划锚点完成，目标开花结果',
    }
    getTransitions.mockReturnValue([transition])

    const wrapper = mountPanel()
    await nextTick()
    await wrapper.find('.gsm-pick-btn').trigger('click')
    await nextTick()

    const t = wrapper.text()
    expect(t).toContain('生长中')
    expect(t).toContain('开花结果')
    expect(t).toContain('所有计划锚点完成，目标开花结果')
  })

  it('需要关注清单渲染并可点击跳转检视', async () => {
    const g = makeGoal({ id: 'g4', title: '停滞目标', status: 'seed', domain: 'work' })
    goals.value = [g]
    targets.value = [g]
    unhealthy.value = [{ goal: g, health: health({ score: 0.3, level: 'critical', suggestions: ['目标已超过30天'] }) }]
    getContext.mockReturnValue(DT({}))
    getHealth.mockReturnValue(health({ score: 0.3, level: 'critical' }))
    getTransitions.mockReturnValue([])

    const wrapper = mountPanel()
    await nextTick()

    expect(wrapper.text()).toContain('需要关注（1）')
    expect(wrapper.text()).toContain('停滞目标')

    // 点击需关注条目 → 选中并进入检视
    await wrapper.find('.gsm-focus-item').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('告急')
    expect(wrapper.text()).toContain('30%')
  })
})