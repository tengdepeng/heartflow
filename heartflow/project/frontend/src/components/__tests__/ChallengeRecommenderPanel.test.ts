import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import ChallengeRecommenderPanel from '../ChallengeRecommenderPanel.vue'
import { HABIT_DIFFICULTY_META } from '../../modules/discipline/types'

const h = vi.hoisted(() => {
  const recs: any[] = [
    {
      id: 'rec_1',
      title: '连续打卡王',
      description: '连续完成指定习惯',
      reason: '你的平均连续 10 天，适合挑战更长连续记录',
      score: 85,
      difficulty: 'medium',
      duration: 20,
      suggestedHabits: ['h1'],
      suggestedReward: '获得订制称号',
      priority: 'high',
      adopted: false,
      createdAt: 'now',
    },
  ]
  const adaptive: any = {
    id: 'adaptive_1',
    title: '自适应挑战',
    description: '为期 14 天的 medium 难度挑战',
    reason: '基于当前水平',
    score: 85,
    difficulty: 'medium',
    duration: 14,
    suggestedHabits: [],
    suggestedReward: '获得额外积分奖励',
    priority: 'high',
    adopted: false,
    createdAt: 'now',
  }
  const profile: any = {
    activeHabits: 3,
    totalCompletions: 120,
    avgStreak: 10,
    maxStreak: 15,
    completionRate: 0.8,
    diversityScore: 0.6,
    challengeCompletionRate: 0.5,
    level: 3,
    levelLabel: '进阶',
  }
  const assessment: any = {
    currentLevel: 'medium',
    recommendedLevel: 'hard',
    readyForUpgrade: true,
    upgradeConditions: ['完成率 >= 70%', '平均连续 >= 7 天', '活跃习惯 >= 3 个'],
    metConditions: ['完成率 >= 70%', '平均连续 >= 7 天', '活跃习惯 >= 3 个'],
    unmetConditions: [],
    suggestion: '已完成评估',
  }
  const buildProfile = vi.fn(() => profile)
  const assessDifficulty = vi.fn(() => assessment)
  const recommend = vi.fn(() => recs.map((r) => ({ ...r })))
  const generateAdaptiveChallenge = vi.fn(() => ({ ...adaptive }))
  const adoptRecommendation = vi.fn((rec: any, create: any) => { void create; rec.adopted = true })
  return { profile, assessment, recs, adaptive, buildProfile, assessDifficulty, recommend, generateAdaptiveChallenge, adoptRecommendation }
})

vi.mock('../../modules/discipline/challenge-recommender', () => ({
  useChallengeRecommender: () => ({
    buildProfile: h.buildProfile,
    assessDifficulty: h.assessDifficulty,
    recommend: h.recommend,
    generateAdaptiveChallenge: h.generateAdaptiveChallenge,
    adoptRecommendation: h.adoptRecommendation,
  }),
}))

const habits = [
  {
    id: 'h1', title: '晨跑', icon: '🏃', enabled: true, streak: 12, bestStreak: 15,
    totalCompleted: 60, completedDates: [], difficulty: 'medium', frequency: 'daily', autoCheckInOnFocus: false,
  },
] as any[]

const challenges: any[] = []

function makeWrapper() {
  const onCreateChallenge = vi.fn(
    (title: string, description: string, duration: number, habs: string[], reward?: string) => {
      const startToday = 'T'
      return {
        id: 'new_ch',
        title,
        description,
        duration,
        habits: habs,
        startDate: startToday,
        endDate: startToday,
        currentDay: 1,
        completed: false,
        reward,
      }
    },
  )
  return mount(ChallengeRecommenderPanel, {
    props: { habits, challenges, onCreateChallenge },
  })
}

describe('ChallengeRecommenderPanel', () => {
  beforeEach(() => {
    h.buildProfile.mockClear()
    h.assessDifficulty.mockClear()
    h.recommend.mockClear()
    h.generateAdaptiveChallenge.mockClear()
    h.adoptRecommendation.mockClear()
    h.recs[0].adopted = false
    h.adaptive.adopted = false
  })

  it('渲染画像标签与指标', () => {
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('Lv.3')
    expect(wrapper.text()).toContain('进阶')
    expect(wrapper.text()).toContain('活跃习惯')
  })

  it('渲染难度评估：可升级徽章', () => {
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('可升级')
    expect(wrapper.text()).toContain('已完成评估')
  })

  it('渲染难度评估（有未满足条件）：显示保持徽章与条件列表', () => {
    h.assessDifficulty.mockReturnValueOnce({
      ...h.assessment,
      readyForUpgrade: false,
      metConditions: ['完成率 >= 70%'],
      unmetConditions: ['平均连续 >= 7 天', '活跃习惯 >= 3 个'],
      suggestion: '还需要满足 2 个条件才能升级',
    })
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('保持')
    expect(wrapper.text()).toContain('还需要满足 2 个条件才能升级')
    expect(wrapper.findAll('.crp-cond.met').length).toBe(1)
    expect(wrapper.findAll('.crp-cond').length).toBe(3)
  })

  it('渲染推荐列表：标题、得分、难度、天数、理由', () => {
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('连续打卡王')
    expect(wrapper.text()).toContain('85')
    expect(wrapper.text()).toContain(HABIT_DIFFICULTY_META.medium.label)
    expect(wrapper.text()).toContain('20 天')
    expect(wrapper.text()).toContain('适合挑战更长连续记录')
  })

  it('采纳推荐挑战：调用 adoptRecommendation 并标记已采纳', async () => {
    const wrapper = makeWrapper()
    const adoptBtn = wrapper.find('.crp-recs .crp-adopt')
    await adoptBtn.trigger('click')
    expect(h.adoptRecommendation).toHaveBeenCalledTimes(1)
    const adapter = h.adoptRecommendation.mock.calls[0]
    expect(adapter[0].title).toBe('连续打卡王')
    expect(typeof adapter[1]).toBe('function')
    // adopt mock 修改已采纳标记后应显示 已采纳
    expect(wrapper.find('.crp-recs .crp-adopt').text()).toContain('已采纳')
  })

  it('重新生成：再次调用 recommend 与 generateAdaptiveChallenge', async () => {
    const wrapper = makeWrapper()
    wrapper.find('.crp-refresh').trigger('click')
    expect(h.recommend).toHaveBeenCalledTimes(2)
    expect(h.generateAdaptiveChallenge).toHaveBeenCalledTimes(2)
  })

  it('空画像：展示占位引导', () => {
    h.buildProfile.mockReturnValueOnce({
      ...h.profile, activeHabits: 0, levelLabel: '新手', level: 1,
    })
    const wrapper = makeWrapper()
    expect(wrapper.text()).toContain('尚无活跃习惯')
  })
})