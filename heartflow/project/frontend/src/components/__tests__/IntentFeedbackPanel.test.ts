// ============================================================
// IntentFeedbackPanel 意图反馈学习面板测试（INCR-102）
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, ref, computed } from 'vue'

const mockFeedbacks = ref<any[]>([
  {
    input: '打开专注计时',
    parsedIntent: 'focus',
    confirmed: true,
    feedbackAt: '2026-09-03T10:00:00Z',
  },
  {
    input: '记一笔账',
    parsedIntent: 'note',
    confirmed: false,
    correctedIntent: 'finance',
    feedbackAt: '2026-09-03T09:30:00Z',
  },
])

const mockLearningModel = ref<any>({
  keywordWeights: {
    focus: { '专注': 3, '计时': 2, '开始': 1 },
    finance: { '记账': 2, '账本': 1.5 },
  },
  totalFeedback: 2,
  correctionRate: 0.5,
  lastTrainedAt: '2026-09-03T10:00:00Z',
})

const mockLearningStats = computed(() => ({
  totalFeedback: mockLearningModel.value.totalFeedback,
  correctionRate: mockLearningModel.value.correctionRate,
  intentCount: Object.keys(mockLearningModel.value.keywordWeights).length,
  lastTrainedAt: mockLearningModel.value.lastTrainedAt,
}))

const mockResetLearning = vi.fn()

vi.mock('../../modules/mirror/dialogue-persistence', () => ({
  useIntentFeedbackLearning: () => ({
    feedbacks: mockFeedbacks,
    learningModel: mockLearningModel,
    learningStats: mockLearningStats,
    resetLearning: mockResetLearning,
  }),
}))

import IntentFeedbackPanel from '../IntentFeedbackPanel.vue'

async function mountPanel() {
  const wrapper = mount(IntentFeedbackPanel)
  await nextTick()
  return wrapper
}

describe('IntentFeedbackPanel 意图反馈学习', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFeedbacks.value = [
      {
        input: '打开专注计时',
        parsedIntent: 'focus',
        confirmed: true,
        feedbackAt: '2026-09-03T10:00:00Z',
      },
      {
        input: '记一笔账',
        parsedIntent: 'note',
        confirmed: false,
        correctedIntent: 'finance',
        feedbackAt: '2026-09-03T09:30:00Z',
      },
    ]
    mockLearningModel.value = {
      keywordWeights: {
        focus: { '专注': 3, '计时': 2, '开始': 1 },
        finance: { '记账': 2, '账本': 1.5 },
      },
      totalFeedback: 2,
      correctionRate: 0.5,
      lastTrainedAt: '2026-09-03T10:00:00Z',
    }
  })

  it('渲染标题与学习统计', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.find('.ifp').exists()).toBe(true)
    expect(wrapper.text()).toContain('意图反馈学习')
    expect(wrapper.text()).toContain('学习 · 反馈 · 权重')
    const values = wrapper.findAll('.ifp-stat-value')
    expect(values[0].text()).toBe('2') // 反馈总数
    expect(values[1].text()).toBe('50%') // 修正率
    expect(values[2].text()).toBe('2') // 学习意图
  })

  it('渲染关键词权重（按权重降序取前 6）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('关键词权重')
    const weights = wrapper.findAll('.ifp-weight')
    expect(weights.length).toBe(2)
    expect(wrapper.text()).toContain('专注')
    expect(wrapper.text()).toContain('记账理财')
    // 权重标签
    const kws = wrapper.findAll('.ifp-kw')
    expect(kws.length).toBe(5)
    expect(wrapper.text()).toContain('专注')
    expect(wrapper.text()).toContain('3')
  })

  it('渲染最近反馈（最新在前，含确认/修正徽标）', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('最近反馈')
    const fbs = wrapper.findAll('.ifp-fb')
    expect(fbs.length).toBe(2)
    // 最新在前（数组反转）：记一笔账（已修正）
    expect(fbs[0].text()).toContain('记一笔账')
    expect(fbs[0].text()).toContain('已修正')
    expect(fbs[0].text()).toContain('→ 记账理财')
    // 打开专注计时（已确认）
    expect(fbs[1].text()).toContain('打开专注计时')
    expect(fbs[1].text()).toContain('已确认')
  })

  it('重置学习调用 resetLearning', async () => {
    const wrapper = await mountPanel()
    const btn = wrapper.find('.ifp-btn--danger')
    expect(btn.attributes('disabled')).toBeUndefined()
    await btn.trigger('click')
    expect(mockResetLearning).toHaveBeenCalled()
  })

  it('无数据时显示空态且重置按钮禁用', async () => {
    mockFeedbacks.value = []
    mockLearningModel.value = {
      keywordWeights: {},
      totalFeedback: 0,
      correctionRate: 0,
      lastTrainedAt: '2026-09-03T10:00:00Z',
    }
    const wrapper = await mountPanel()
    expect(wrapper.find('.ifp-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('暂无学习数据')
    expect(wrapper.find('.ifp-btn--danger').attributes('disabled')).toBeDefined()
  })
})
