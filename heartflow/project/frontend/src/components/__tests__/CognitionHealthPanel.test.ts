// ============================================================
// CognitionHealthPanel 冥想健康驾驶舱（INCR-382）
// 薄委托组件：消费 useCognitionBridge 的只读聚合
// （meditationHealth / streakSummary / insightSummary / moodCorrelations），
// 经直接子路径 ../modules/cognition/cognition-bridge 引用，
// 测试 mock 该子路径注入受控 ref（遵循 INCR-99 ref 可改写教训）。
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'

// ---- 受控 bridge 状态 ----
const state = {
  health: ref<any>(null),
  streak: ref<any>(null),
  insight: ref<any>(null),
  mood: ref<any[]>([]),
}

vi.mock('../../modules/cognition/cognition-bridge', () => ({
  useCognitionBridge: () => ({
    meditationHealth: state.health,
    streakSummary: state.streak,
    insightSummary: state.insight,
    moodCorrelations: state.mood,
  }),
}))

// ---- 种子工厂 ----
function health(overrides: Record<string, any> = {}) {
  return {
    score: 0,
    totalSessions: 0,
    totalDuration: 0,
    averageDuration: 0,
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
    moodImprovementRate: 0,
    averageMoodImprovement: 0,
    weeklyFrequency: 0,
    level: { label: '待开启', color: '#95a5a6' },
    suggestions: ['开始你的第一次冥想，探索内在世界'],
    ...overrides,
  }
}

function streak(overrides: Record<string, any> = {}) {
  return {
    currentStreak: 0,
    longestStreak: 0,
    isStreakActive: false,
    streakStartDate: null,
    lastMeditationDate: null,
    daysToRecord: 0,
    streakHistory: [],
    streaksThisYear: 0,
    averageStreakLength: 0,
    ...overrides,
  }
}

function insight(overrides: Record<string, any> = {}) {
  return {
    totalInsights: 0,
    byType: [],
    highPriority: [],
    milestones: [],
    latest: [],
    ...overrides,
  }
}

async function mountPanel(): Promise<VueWrapper<any>> {
  const { default: CognitionHealthPanel } = await import('../CognitionHealthPanel.vue')
  return mount(CognitionHealthPanel)
}

describe('CognitionHealthPanel 冥想健康驾驶舱（INCR-382）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.health.value = health()
    state.streak.value = streak()
    state.insight.value = insight()
    state.mood.value = []
  })

  it('空态：健康度归零 + 待开启徽标 + 空态提示，连续/洞察/情绪区不渲染', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="cognition-health-panel"]').exists()).toBe(true)
    expect(wrapper.find('.chp-title').text()).toContain('冥想健康驾驶舱')
    expect(wrapper.find('[data-test="chp-level"]').text()).toBe('待开启')
    expect(wrapper.find('[data-test="chp-health"]').text()).toContain('0')
    expect(wrapper.find('[data-test="chp-sug"]').text()).toContain('开始你的第一次冥想')
    expect(wrapper.find('[data-test="chp-empty"]').text()).toContain('还没有冥想记录')
    expect(wrapper.find('[data-test="chp-streak"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="chp-insight"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="chp-mood"]').exists()).toBe(false)
  })

  it('健康度：分数 + 卓越徽标 + 完成率/总次数 + 进度条', async () => {
    state.health.value = health({
      score: 88,
      totalSessions: 12,
      totalDuration: 360,
      averageDuration: 30,
      weeklyFrequency: 3,
      completionRate: 85,
      moodImprovementRate: 60,
      currentStreak: 5,
      longestStreak: 12,
      level: { label: '卓越', color: '#27ae60' },
      suggestions: ['做得很好，继续保持当前的冥想节奏'],
    })
    state.streak.value = streak({ currentStreak: 5, longestStreak: 12 })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="chp-level"]').text()).toBe('卓越')
    expect(wrapper.find('[data-test="chp-level"]').classes()).toContain('chp-level--excellence')
    const healthEl = wrapper.find('[data-test="chp-health"]')
    expect(healthEl.text()).toContain('88')
    expect(healthEl.text()).toContain('总次数')
    expect(healthEl.text()).toContain('12')
    expect(healthEl.text()).toContain('完成率')
    expect(healthEl.text()).toContain('85%')
    expect(healthEl.text()).toContain('做得很好')
    expect(healthEl.find('.chp-bar-fill').attributes('style')).toContain('88%')
    expect(wrapper.find('[data-test="chp-empty"]').exists()).toBe(false)
  })

  it('健康度等级分支：发展中 label 映射 growing', async () => {
    state.health.value = health({ score: 45, level: { label: '发展中', color: '#f0b03a' } })
    state.streak.value = streak({ currentStreak: 2, longestStreak: 6 })
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="chp-level"]').text()).toBe('发展中')
    expect(wrapper.find('[data-test="chp-level"]').classes()).toContain('chp-level--growing')
  })

  it('连续追踪：当前/最长/距破纪录/今年段/平均长 五卡', async () => {
    state.health.value = health({ totalSessions: 8 })
    state.streak.value = streak({
      currentStreak: 3,
      longestStreak: 10,
      daysToRecord: 7,
      streaksThisYear: 4,
      averageStreakLength: 6,
    })
    const wrapper = await mountPanel()
    const s = wrapper.find('[data-test="chp-streak"]')
    expect(s.exists()).toBe(true)
    expect(s.text()).toContain('当前连续')
    expect(s.text()).toContain('3')
    expect(s.text()).toContain('最长连续')
    expect(s.text()).toContain('10')
    expect(s.text()).toContain('距破纪录')
    expect(s.text()).toContain('今年连续段')
    expect(s.text()).toContain('平均连续长')
  })

  it('洞察摘要：类型 chips + 需关注 + 里程碑', async () => {
    state.health.value = health({ totalSessions: 6 })
    state.insight.value = insight({
      totalInsights: 3,
      byType: [
        { type: 'pattern', label: '模式', count: 2 },
        { type: 'warning', label: '警告', count: 1 },
      ],
      highPriority: [
        { id: 'w1', title: '冥想中断率偏高', description: '你的冥想中断率为 50%', type: 'warning', priority: 'high', generatedAt: '' },
      ],
      milestones: [
        { id: 'm1', title: '一周修行', description: '连续冥想 7 天', type: 'milestone', priority: 'high', generatedAt: '' },
      ],
    })
    const wrapper = await mountPanel()
    const ins = wrapper.find('[data-test="chp-insight"]')
    expect(ins.exists()).toBe(true)
    expect(ins.text()).toContain('模式 2')
    expect(ins.text()).toContain('警告 1')
    expect(wrapper.find('[data-test="chp-insight-high"]').text()).toContain('冥想中断率偏高')
    expect(wrapper.find('[data-test="chp-insight-milestone"]').text()).toContain('一周修行')
  })

  it('情绪关联：mood 卡片渲染最有效冥想类型中文 + 次数', async () => {
    state.health.value = health({ totalSessions: 9 })
    state.mood.value = [
      {
        mood: 'anxious',
        typeDistribution: [
          { type: 'breath', count: 4 },
          { type: 'body_scan', count: 1 },
        ],
        mostEffectiveType: 'breath',
        totalSessions: 5,
      },
      {
        mood: 'calm',
        typeDistribution: [{ type: 'silent', count: 3 }],
        mostEffectiveType: 'silent',
        totalSessions: 3,
      },
    ]
    const wrapper = await mountPanel()
    const mood = wrapper.find('[data-test="chp-mood"]')
    expect(mood.exists()).toBe(true)
    const cards = wrapper.findAll('[data-test="chp-mood-card"]')
    expect(cards.length).toBe(2)
    expect(cards[0].text()).toContain('焦虑')
    expect(cards[0].text()).toContain('呼吸冥想')
    expect(cards[0].text()).toContain('5 次')
    expect(cards[1].text()).toContain('宁静')
    expect(cards[1].text()).toContain('静坐冥想')
  })

  it('情绪关联空数组：不渲染 mood 区块', async () => {
    state.health.value = health({ totalSessions: 3 })
    state.mood.value = []
    const wrapper = await mountPanel()
    expect(wrapper.find('[data-test="chp-mood"]').exists()).toBe(false)
  })
})