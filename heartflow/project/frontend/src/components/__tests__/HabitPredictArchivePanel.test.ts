// ============================================================
// 习惯预测档案面板测试（INCR-52）
// 覆盖空态（工坊未启）与填充态（健康度评分/连续预测/中断预警/趋势预测/温和洞察）
// useDisciplineBridge 经 direct subpath mock；useHabitPredictor 真实引入（纯函数）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const mock = vi.hoisted(() => {
  const state = { habits: [] as any[] }
  return { state }
})

vi.mock('../../modules/discipline/workshop-bridge', () => ({
  useDisciplineBridge: () => ({
    habits: ref(mock.state.habits),
  }),
}))

const DAY = 24 * 60 * 60 * 1000
const NOW = new Date()
function daysAgo(d: number): string {
  return new Date(NOW.getTime() - d * DAY).toISOString().split('T')[0]
}

function habit(overrides: Record<string, any> = {}) {
  return {
    id: `h_${Math.random().toString(36).slice(2, 6)}`,
    title: '晨跑',
    description: '',
    icon: '🏃',
    difficulty: 'easy',
    frequency: 'daily',
    target: 1,
    streak: 5,
    bestStreak: 10,
    totalCompleted: 20,
    enabled: true,
    createdAt: daysAgo(30),
    completedDates: [daysAgo(4), daysAgo(3), daysAgo(2), daysAgo(1), daysAgo(0)],
    ...overrides,
  }
}

async function mountPanel() {
  const { default: HabitPredictArchivePanel } = await import('../HabitPredictArchivePanel.vue')
  const wrapper = mount(HabitPredictArchivePanel)
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  mock.state.habits = []
})

describe('HabitPredictArchivePanel 空态', () => {
  it('无习惯时显示「工坊未启」引导', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.hpap-archive').exists()).toBe(true)
    expect(wrapper.find('.hpap-badge-neutral').text()).toBe('工坊未启')
    expect(wrapper.text()).toContain('工坊还空着')
    expect(wrapper.find('.hpap-block').exists()).toBe(false)
  })
})

describe('HabitPredictArchivePanel 填充态', () => {
  beforeEach(() => {
    // 习惯A：健康（连续5天，easy）；习惯B：高危（已中断5天，hard）
    mock.state.habits = [
      habit({ title: '晨跑', icon: '🏃' }),
      habit({
        title: '夜读',
        icon: '📖',
        difficulty: 'hard',
        streak: 0,
        bestStreak: 3,
        totalCompleted: 5,
        completedDates: [daysAgo(10), daysAgo(5)],
      }),
    ]
  })

  it('渲染标题与健康徽章', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.hpap-title').text()).toBe('✨ 习惯预测档案')
    const badge = wrapper.find('.hpap-badge-gold')
    expect(badge.exists()).toBe(true)
    expect(['优秀', '良好', '一般', '待提升', '需起步']).toContain(badge.text())
  })

  it('渲染健康度评分（五维条 + 改进建议）', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.hpap-block')[0]
    expect(block.find('.hpap-block-title').text()).toBe('健康度评分')
    const bars = block.findAll('.hpap-hbar')
    expect(bars.length).toBe(5)
    expect(bars[0].find('.hpap-hbar-label').text()).toBe('连续性')
    expect(bars[1].find('.hpap-hbar-label').text()).toBe('完成率')
    expect(bars[2].find('.hpap-hbar-label').text()).toBe('多样性')
    expect(bars[3].find('.hpap-hbar-label').text()).toBe('成长性')
    expect(bars[4].find('.hpap-hbar-label').text()).toBe('韧性')
    const improves = block.findAll('.hpap-improve-item')
    expect(improves.length).toBeGreaterThan(0)
  })

  it('渲染连续预测（按连续天数排序 + 里程碑）', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.hpap-block')[1]
    expect(block.find('.hpap-block-title').text()).toBe('连续预测')
    const rows = block.findAll('.hpap-streak')
    expect(rows.length).toBe(2)
    // 晨跑 streak 5 排前
    expect(rows[0].find('.hpap-streak-name').text()).toContain('晨跑')
    const cells = rows[0].findAll('.hpap-cell-num')
    expect(cells.length).toBe(3)
    expect(cells[0].text()).toContain('5')
    expect(rows[0].text()).toContain('下一里程碑')
  })

  it('渲染中断预警（最高风险习惯 + 风险因素）', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.hpap-block')[2]
    expect(block.find('.hpap-block-title').text()).toBe('中断预警')
    // 夜读 riskScore 75 → high → 高风险
    expect(block.find('.hpap-warn-name').text()).toContain('夜读')
    const badge = block.find('.hpap-warn-badge')
    expect(badge.text()).toBe('高风险')
    const factors = block.findAll('.hpap-warn-factor')
    expect(factors.length).toBeGreaterThan(0)
    const tips = block.findAll('.hpap-tip')
    expect(tips.length).toBeGreaterThan(0)
  })

  it('渲染趋势预测（短/中/长期）', async () => {
    const wrapper = await mountPanel()
    const block = wrapper.findAll('.hpap-block')[3]
    expect(block.find('.hpap-block-title').text()).toBe('趋势预测')
    const rows = block.findAll('.hpap-trend')
    expect(rows.length).toBe(2)
    const cells = rows[0].findAll('.hpap-cell-num')
    expect(cells.length).toBe(3)
    expect(rows[0].text()).toContain('稳定性')
  })

  it('渲染温和洞察', async () => {
    const wrapper = await mountPanel()
    const insights = wrapper.findAll('.hpap-insight')
    expect(insights.length).toBeGreaterThan(0)
    expect(insights[0].text()).toContain('健康度')
  })
})
