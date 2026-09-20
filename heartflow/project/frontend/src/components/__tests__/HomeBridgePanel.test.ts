// ============================================================
// HomeBridgePanel 家·桥接总览（INCR-385）
// 薄委托组件：消费 useHomeBridge 的只读聚合
// （homeHealth / roomHeatmap / activityTimeline /
//   decorationUsageRanking / roomRecommendations），
// 经直接子路径 ../modules/home/home-bridge 引用，
// 测试 mock 该子路径注入受控 ref（遵循 INCR-99 ref 可改写教训）。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'

// ---- 受控 bridge 状态（ref 可改写）----
const state = {
  health: ref<any>(null),
  heatmap: ref<any[]>([]),
  timeline: ref<any[]>([]),
  deco: ref<any[]>([]),
  recs: ref<any[]>([]),
}

vi.mock('../../modules/home/home-bridge', () => ({
  useHomeBridge: () => ({
    homeHealth: state.health,
    roomHeatmap: state.heatmap,
    activityTimeline: state.timeline,
    decorationUsageRanking: state.deco,
    roomRecommendations: state.recs,
  }),
}))

// ---- 种子工厂 ----
function health(overrides: Record<string, any> = {}) {
  return {
    score: 0,
    roomCoverage: 0,
    decorationRate: 0,
    interactionActivity: 0,
    atmosphereDiversity: 0,
    moodHealth: 0,
    suggestions: ['还有很多房间等待探索，去玄关开始你的旅程吧'],
    ...overrides,
  }
}

async function mountPanel(): Promise<VueWrapper<any>> {
  const { default: HomeBridgePanel } = await import('../HomeBridgePanel.vue')
  return mount(HomeBridgePanel)
}

describe('HomeBridgePanel 家·桥接总览（INCR-385）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.health.value = health()
    state.heatmap.value = []
    state.timeline.value = []
    state.deco.value = []
    state.recs.value = []
  })

  it('空态：标题 + 健康徽标归零待启 + 五维全 0 + 空态引导, 热力/时间线/装饰/推荐不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="home-bridge-panel"]').exists()).toBe(true)
    expect(wrapper.find('.hbp-title').text()).toContain('家·桥接总览')
    expect(wrapper.find('[data-test="hbp-health"]').text()).toContain('待启')
    const dims = wrapper.findAll('[data-test="hbp-dim"]')
    expect(dims.length).toBe(5)
    expect(dims[0].text()).toContain('房间覆盖')
    expect(dims[0].text()).toContain('0%')
    expect(wrapper.find('[data-test="hbp-heatmap"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hbp-timeline"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hbp-deco"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hbp-recs"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hbp-empty"]').text()).toContain('还没有痕迹')
  })

  it('家健康度：分数 + 徽标等级(安稳) + 五维分布值 + 建议条渲染', async () => {
    state.health.value = health({
      score: 68,
      roomCoverage: 70,
      decorationRate: 40,
      interactionActivity: 55,
      atmosphereDiversity: 60,
      moodHealth: 75,
      suggestions: ['在房间里多停留一会儿', '尝试切换不同的氛围预设'],
    })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="hbp-health"]').text()).toContain('68')
    expect(wrapper.find('[data-test="hbp-health"]').text()).toContain('安稳')
    expect(wrapper.find('[data-test="hbp-health"]').classes()).toContain('hbp-health--stable')
    const dims = wrapper.findAll('[data-test="hbp-dim"]')
    expect(dims[2].text()).toContain('交互活跃')
    expect(dims[2].text()).toContain('55%')
    expect(dims[4].text()).toContain('情绪健康')
    expect(dims[4].text()).toContain('75%')
    expect(wrapper.find('[data-test="hbp-sug"]').text()).toContain('在房间里多停留一会儿')
    expect(wrapper.find('[data-test="hbp-empty"]').exists()).toBe(false)
  })

  it('房间热力图：房间卡渲染 到访/活力/情绪 指标', async () => {
    state.health.value = health({ score: 55, roomCoverage: 50 })
    state.heatmap.value = [
      { roomId: 'living-room', roomName: '客厅', visitCount: 12, activityScore: 66, moodScore: 8, color: '#8a9a7a' },
      { roomId: 'study', roomName: '书房', visitCount: 5, activityScore: 40, moodScore: 6, color: '#6b9fc4' },
    ]
    const wrapper = await mountPanel()
    const heats = wrapper.findAll('[data-test="hbp-heat"]')
    expect(heats.length).toBe(2)
    expect(heats[0].text()).toContain('客厅')
    expect(heats[0].text()).toContain('到访 12')
    expect(heats[0].text()).toContain('活力 66')
    expect(heats[0].text()).toContain('情绪 8')
    expect(heats[1].text()).toContain('书房')
  })

  it('活动时间线：14 天记录渲染 日期+次数', async () => {
    state.health.value = health({ score: 40, interactionActivity: 30 })
    state.timeline.value = [
      { date: '2026-09-07', count: 0, rooms: [], types: [] },
      { date: '2026-09-08', count: 4, rooms: ['living-room'], types: ['enter'] },
      { date: '2026-09-09', count: 2, rooms: ['study'], types: ['decorate'] },
    ]
    const wrapper = await mountPanel()
    const rows = wrapper.findAll('[data-test="hbp-tl"]')
    expect(rows.length).toBe(3)
    expect(rows[0].text()).toContain('09-07')
    expect(rows[1].text()).toContain('09-08')
    expect(rows[1].text()).toContain('4')
    expect(rows[2].text()).toContain('09-09')
    expect(rows[2].text()).toContain('2')
  })

  it('装饰使用排行：装饰物 图标+名+类型+计数 渲染', async () => {
    state.health.value = health({ score: 30, decorationRate: 20 })
    state.deco.value = [
      { name: '落地灯', icon: '💡', type: 'light', count: 3 },
      { name: '绿萝', icon: '🪴', type: 'plant', count: 2 },
    ]
    const wrapper = await mountPanel()
    const items = wrapper.findAll('[data-test="hbp-deco-item"]')
    expect(items.length).toBe(2)
    expect(items[0].text()).toContain('💡')
    expect(items[0].text()).toContain('落地灯')
    expect(items[0].text()).toContain('光')
    expect(items[0].text()).toContain('3')
    expect(items[1].text()).toContain('绿萝')
    expect(items[1].text()).toContain('植')
  })

  it('归家指引：推荐按优先级渲染 标签+理由+建议活动+时长', async () => {
    state.health.value = health({ score: 25 })
    state.recs.value = [
      { roomId: 'study', roomName: '书房', roomIcon: '📖', reason: '还没有探索过这个空间', priority: 'high', suggestedActivity: '进入房间', estimatedDuration: 15 },
      { roomId: 'balcony', roomName: '阳台', roomIcon: '🌿', reason: '最近来过，偶尔回来看看就好', priority: 'low', suggestedActivity: '快速浏览', estimatedDuration: 5 },
    ]
    const wrapper = await mountPanel()
    const items = wrapper.findAll('[data-test="hbp-recs-item"]')
    expect(items.length).toBe(2)
    expect(wrapper.find('[data-test="hbp-recs-item"]').classes()).toContain('hbp-prio-high')
    expect(items[0].text()).toContain('高')
    expect(items[0].text()).toContain('📖')
    expect(items[0].text()).toContain('书房')
    expect(items[0].text()).toContain('还没有探索过这个空间')
    expect(items[0].text()).toContain('15 分钟')
    expect(items[1].text()).toContain('低')
  })

  it('非全空：空态引导不渲染（任一区有数据即不显示全局空态）', async () => {
    state.health.value = health({ score: 10, roomCoverage: 10, suggestions: [] })
    state.recs.value = [
      { roomId: 'living-room', roomName: '客厅', roomIcon: '🛋️', reason: '还没有探索过这个空间', priority: 'high', suggestedActivity: '进入房间', estimatedDuration: 15 },
    ]
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="hbp-empty"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="hbp-recs"]').exists()).toBe(true)
  })
})