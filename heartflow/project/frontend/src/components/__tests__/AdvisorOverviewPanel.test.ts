// ============================================================
// AdvisorOverviewPanel 幕僚总览桥接面板（INCR-383）组件测试
// mock 直接子路径注入受控 ref（遵循 INCR-99 ref 可改写教训）
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { ref } from 'vue'

const network = ref<any>({
  totalRelations: 0,
  totalInteractions: 0,
  averageCloseness: 0,
  mostConnectedAdvisor: '',
  strongestBond: null,
  closenessDistribution: { intimate: 0, close: 0, moderate: 0, distant: 0 },
})
const scene = ref<any[]>([])
const ritual = ref<any>({
  todayCelebrations: 0,
  upcomingCelebrations: 0,
  activeRetirements: 0,
  completedRetirements: 0,
  totalLegacies: 0,
})
const witness = ref<any>({
  totalWitnessed: 0,
  unviewedCount: 0,
  eventTypeBreakdown: [],
  recentWitnesses: [],
})

vi.mock('../../modules/advisor/advisor-bridge', () => ({
  useAdvisorBridge: () => ({
    relationNetwork: network,
    sceneStats: scene,
    ritualSummary: ritual,
    witnessLogSummary: witness,
  }),
}))

import AdvisorOverviewPanel from '../AdvisorOverviewPanel.vue'

async function mountPanel(): Promise<VueWrapper> {
  return mount(AdvisorOverviewPanel)
}

describe('AdvisorOverviewPanel 幕僚总览桥接面板（INCR-383）', () => {
  beforeEach(() => {
    network.value = {
      totalRelations: 0,
      totalInteractions: 0,
      averageCloseness: 0,
      mostConnectedAdvisor: '',
      strongestBond: null,
      closenessDistribution: { intimate: 0, close: 0, moderate: 0, distant: 0 },
    }
    scene.value = []
    ritual.value = { todayCelebrations: 0, upcomingCelebrations: 0, activeRetirements: 0, completedRetirements: 0, totalLegacies: 0 }
    witness.value = { totalWitnessed: 0, unviewedCount: 0, eventTypeBreakdown: [], recentWitnesses: [] }
  })

  it('空态：标题 + 四面区不渲染 + 全局空态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="advisor-overview-panel"]').exists()).toBe(true)
    expect(wrapper.find('.aop-title').text()).toContain('幕僚总览')
    expect(wrapper.find('[data-test="aop-network-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="aop-scene"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aop-ritual"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aop-witness"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="aop-empty"]').text()).toContain('幕僚体系尚未启动')
  })

  it('关系网络：指标四卡 + 最强羁绊 + 亲密度分级条', async () => {
    network.value = {
      totalRelations: 4,
      totalInteractions: 12,
      averageCloseness: 55,
      mostConnectedAdvisor: '清澜',
      strongestBond: { a: '清澜', b: '砚台', closeness: 88 },
      closenessDistribution: { intimate: 1, close: 2, moderate: 1, distant: 0 },
    }
    const wrapper = await mountPanel()
    const net = wrapper.find('[data-test="aop-network"]')
    expect(net.text()).toContain('4')
    expect(net.text()).toContain('12')
    expect(net.text()).toContain('55')
    expect(net.text()).toContain('清澜')
    expect(wrapper.find('[data-test="aop-bond"]').text()).toContain('清澜 × 砚台')
    expect(wrapper.find('[data-test="aop-bond"]').text()).toContain('88')
    const tiers = wrapper.find('[data-test="aop-tiers"]')
    expect(tiers.text()).toContain('密友')
    expect(tiers.text()).toContain('亲近')
    expect(tiers.find('b.aop-tier-count')!.text()).toBe('1')
    expect(wrapper.find('[data-test="aop-network-empty"]').exists()).toBe(false)
  })

  it('场景统计：渲染场景名 + 占用条', async () => {
    scene.value = [
      { sceneId: 'chamber', name: '幕僚阁', occupancy: 3, maxCapacity: 5 },
      { sceneId: 'garden', name: '芳园', occupancy: 1, maxCapacity: 4 },
    ]
    const wrapper = await mountPanel()
    const sc = wrapper.find('[data-test="aop-scene"]')
    expect(sc.text()).toContain('幕僚阁')
    expect(sc.text()).toContain('3/5')
    expect(sc.text()).toContain('芳园')
    expect(sc.find('.aop-scene-fill').attributes('style')).toContain('60%')
  })

  it('仪式摘要：五计数渲染, 全零不渲染', async () => {
    ritual.value = { todayCelebrations: 2, upcomingCelebrations: 3, activeRetirements: 1, completedRetirements: 4, totalLegacies: 7 }
    const wrapper = await mountPanel()
    const r = wrapper.find('[data-test="aop-ritual"]')
    expect(r.exists()).toBe(true)
    expect(r.text()).toContain('今日庆祝')
    expect(r.text()).toContain('2')
    expect(r.text()).toContain('即将庆祝')
    expect(r.text()).toContain('3')
    expect(r.text()).toContain('已退休')
    expect(r.text()).toContain('4')
    expect(r.text()).toContain('遗留物')
    expect(r.text()).toContain('7')
  })

  it('见证日志：总量 + 未读徽标 + 类型 chips + 最近见证列表', async () => {
    witness.value = {
      totalWitnessed: 5,
      unviewedCount: 2,
      eventTypeBreakdown: [
        { type: 'first-focus', label: '首次专注', icon: '🎯', count: 3 },
        { type: 'streak-record', label: '连击记录', icon: '🔥', count: 2 },
      ],
      recentWitnesses: [
        { id: 'w1', eventType: 'first-focus', title: '首度心流', viewed: false },
        { id: 'w2', eventType: 'streak-record', title: '七日连击', viewed: true },
      ],
    }
    const wrapper = await mountPanel()
    const w = wrapper.find('[data-test="aop-witness"]')
    expect(w.exists()).toBe(true)
    expect(w.text()).toContain('累计见证 5 次')
    expect(wrapper.find('[data-test="aop-witness-unviewed"]').text()).toContain('2')
    expect(wrapper.find('[data-test="aop-witness-types"]').text()).toContain('首次专注 3')
    expect(wrapper.find('[data-test="aop-witness-list"]').text()).toContain('首度心流')
    expect(wrapper.find('[data-test="aop-witness-list"]').text()).toContain('七日连击')
  })

  it('见证无未读时不渲染未读徽标', async () => {
    witness.value = {
      totalWitnessed: 1,
      unviewedCount: 0,
      eventTypeBreakdown: [{ type: 'first-focus', label: '首次专注', icon: '🎯', count: 1 }],
      recentWitnesses: [],
    }
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="aop-witness"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="aop-witness-unviewed"]').exists()).toBe(false)
  })
})