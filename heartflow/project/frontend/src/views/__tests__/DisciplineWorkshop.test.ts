// ============================================================
// DisciplineWorkshop 视图测试 - 自律工坊
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

// ---- 模拟 MeditationStudio（INCR-177） ----
vi.mock('../../components/MeditationStudio.vue', () => ({
  default: { template: '<div data-test="meditation-studio" />' },
}))

// ---- 模拟 DailyRitualPanel（INCR-441） ----
vi.mock('../../components/discipline/DailyRitualPanel.vue', () => ({
  default: { template: '<div data-test="daily-ritual-panel" />' },
}))

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 workshop-bridge 模块 ----
const mockHabits = ref<any[]>([])
const mockFailures = ref<any[]>([])
const mockGenerateSuggestions = vi.fn<() => Array<{ id: string; name: string; reason: string }>>(() => [])
const mockAdoptSuggestion = vi.fn()
const mockBundles = ref<any[]>([])
const mockCreateBundleFromPreset = vi.fn()
const mockCreateChallenge = vi.fn()
const mockStreaks = ref<any[]>([])
const mockRituals = ref<any[]>([])
const mockGetTopStreaks = vi.fn((_limit: number = 10) => mockStreaks.value)
vi.mock('../../modules/discipline/workshop-bridge', () => ({
  useDisciplineBridge: () => ({
    init: vi.fn(),
    getStats: () => ({
      activeHabits: 5,
      unlockedBadges: 3,
      totalPoints: 1280,
    }),
    getHabitHealthScore: () => 85,
    getTodayHabits: () => [],
    getActiveChallenges: () => [],
    badges: ref([]),
    HABIT_TEMPLATES: [],
    CHALLENGE_TEMPLATES: [],
    streaks: mockStreaks,
    habits: mockHabits,
    // INCR-434 连击段位与排行榜
    getTopStreaks: mockGetTopStreaks,
    failures: mockFailures,
    suggestions: mockGenerateSuggestions(),
    generateSuggestions: mockGenerateSuggestions,
    adoptSuggestion: mockAdoptSuggestion,
    bundles: mockBundles,
    BUNDLE_PRESETS: [{ name: '晨间唤醒', habitIds: [], bonusMultiplier: 1.2 }],
    createBundleFromPreset: mockCreateBundleFromPreset,
    completeHabit: vi.fn(),
    createHabitFromTemplate: vi.fn(),
    createChallengeFromTemplate: vi.fn(),
    createChallenge: mockCreateChallenge,
    // INCR-441：每日仪式上盘 + 健康度建议接入
    rituals: mockRituals,
    RITUAL_TEMPLATES: [
      { title: '晨间启动仪式', description: '用 15 分钟开启高效的一天', icon: '🌅', steps: ['喝一杯温水', '做 5 分钟拉伸'], estimatedDuration: 15, triggerTime: 'morning' },
      { title: '午间充电', description: '用 10 分钟恢复精力', icon: '☀️', steps: ['离开座位走动 5 分钟'], estimatedDuration: 10, triggerTime: 'afternoon' },
      { title: '晚间放松仪式', description: '用 20 分钟优雅结束一天', icon: '🌙', steps: ['写下感恩的事'], estimatedDuration: 20, triggerTime: 'evening' },
      { title: '周末回顾', description: '用 30 分钟回顾一周', icon: '📊', steps: ['回顾本周'], estimatedDuration: 30, triggerTime: 'anytime' },
      { title: '深度专注仪式', description: '进入深度工作前的准备', icon: '🎯', steps: ['清理桌面'], estimatedDuration: 5, triggerTime: 'anytime' },
    ],
    createRitualFromTemplate: vi.fn(),
    completeRitual: vi.fn(),
    getHabitHealthAssessment: () => ({
      score: 85,
      grade: 'excellent',
      label: '自律大师',
      suggestions: ['继续保持，你已经是自律的榜样', '可以尝试挑战更高难度的习惯'],
    }),
  }),
  getHabitTemplatesByCategory: () => [],
  getChallengeTemplatesByDifficulty: () => [],
}))

// ---- 模拟 modules/tasks（四象限看板引擎；importOriginal 保留 buildQuadrantBoard 等计算用于真实分类） ----
const mockBoardTasks = ref<any[]>([])
vi.mock('../../modules/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/tasks')>()
  return {
    ...actual,
    useTaskManager: () => ({ tasks: mockBoardTasks, load: vi.fn() }),
  }
})

async function getWrapper() {
  const { default: DisciplineWorkshop } = await import('../DisciplineWorkshop.vue')
  return mount(DisciplineWorkshop, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('DisciplineWorkshop 自律工坊', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题"自律工坊"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('自律工坊')
  })

  it('渲染标签导航', async () => {
    const wrapper = await getWrapper()
    const tabEls = wrapper.findAll('.dw-tab')
    expect(tabEls.length).toBeGreaterThanOrEqual(4)
  })

  it('标签导航包含今日打卡', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('今日打卡')
  })

  it('标签导航包含挑战赛', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('挑战赛')
  })

  it('标签导航包含挑战', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('挑战')
  })

  it('标签导航包含徽章', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('徽章')
  })

  it('显示概览卡片：活跃习惯', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('活跃习惯')
    expect(wrapper.text()).toContain('5')
  })

  it('显示概览卡片：已解锁徽章', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已解锁徽章')
    expect(wrapper.text()).toContain('3')
  })

  it('标签导航包含冥想工坊', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('冥想工坊')
  })

  it('切换至冥想工坊标签页显示 MeditationStudio', async () => {
    const wrapper = await getWrapper()
    const meditationTab = wrapper.findAll('.dw-tab').find(t => t.text().includes('冥想工坊'))
    expect(meditationTab).toBeTruthy()
    await meditationTab!.trigger('click')
    await wrapper.vm.$nextTick()
    const studio = wrapper.find('[data-test="meditation-studio"]')
    expect(studio.exists()).toBe(true)
  })
})

// =============================================================
// 集成：习惯预测档案面板（INCR-213：补挂载孤儿面板 HabitPredictArchivePanel）
// =============================================================

describe('集成：习惯预测档案面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHabits.value = []
  })

  it('无习惯时渲染空态（工坊未启）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hpap-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('✨ 习惯预测档案')
    expect(wrapper.text()).toContain('工坊未启')
  })

  it('有待启用的习惯时渲染健康度评分与连续预测', async () => {
    mockHabits.value = [
      {
        id: 'h1', title: '晨跑', icon: '🏃', enabled: true, streak: 3,
        bestStreak: 5, frequency: 'daily', createdAt: '2026-01-01',
        completedDates: ['2026-09-08', '2026-09-07', '2026-09-06'],
        targetDays: 7, autoCheckInOnFocus: false, area: 'body',
      },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.hpap-health').exists()).toBe(true)
    expect(wrapper.text()).toContain('健康度评分')
    expect(wrapper.text()).toContain('连续预测')
    expect(wrapper.text()).toContain('晨跑')
  })
})

// =============================================================
// 集成：失败分析与习惯建议面板（INCR-214：补挂载孤儿面板 HabitFailurePanel + HabitSuggestionPanel）
// =============================================================

describe('集成：失败分析与习惯建议面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHabits.value = []
    mockFailures.value = []
    mockGenerateSuggestions.mockReturnValue([])
  })

  it('无失败/建议时渲染空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hfa').exists()).toBe(true)
    expect(wrapper.text()).toContain('🙏 失败分析')
    expect(wrapper.text()).toContain('暂无失败记录')
    expect(wrapper.find('.hsp').exists()).toBe(true)
    expect(wrapper.text()).toContain('💡 习惯建议')
    expect(wrapper.text()).toContain('暂无建议')
  })

  it('有失败记录时展示中断复盘', async () => {
    mockFailures.value = [{ id: 'f1', habitName: '熬夜', reason: '深夜无意识刷手机' }]
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.hfa-item').length).toBe(1)
    expect(wrapper.text()).toContain('熬夜')
    expect(wrapper.text()).toContain('深夜无意识刷手机')
  })

  it('有推荐建议时展示并采纳', async () => {
    mockGenerateSuggestions.mockReturnValue([{ id: 's1', name: '午后运动', reason: '提振午后精力' }])
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.hsp-item').length).toBe(1)
    expect(wrapper.text()).toContain('午后运动')
    await wrapper.find('.hsp-btn').trigger('click')
    expect(mockAdoptSuggestion).toHaveBeenCalledWith('s1')
  })
})

// =============================================================
// 集成：习惯组合与健康度预测面板（INCR-215：补挂载孤儿面板 HabitBundlePanel + HabitPredictorPanel）
// =============================================================

describe('集成：习惯组合与健康度预测面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHabits.value = []
    mockBundles.value = []
  })

  it('习惯组合空态与预设速建', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hbp').exists()).toBe(true)
    expect(wrapper.text()).toContain('◈ 习惯组合')
    expect(wrapper.text()).toContain('还没有习惯组合')
    // 预设按钮渲染，点击触发速建
    const presetBtn = wrapper.find('.hbp-preset')
    expect(presetBtn.exists()).toBe(true)
    await presetBtn.trigger('click')
    expect(mockCreateBundleFromPreset).toHaveBeenCalled()
  })

  it('有组合时展示全部组合', async () => {
    mockBundles.value = [{ id: 'b1', name: '晨间唤醒', habitIds: ['h1', 'h2'], bonusMultiplier: 1.2 }]
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.hbp-item').length).toBe(1)
    expect(wrapper.text()).toContain('晨间唤醒')
    expect(wrapper.text()).toContain('2 习惯')
  })

  it('习惯健康度预测空态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hpp').exists()).toBe(true)
    expect(wrapper.text()).toContain('习惯健康度')
    expect(wrapper.text()).toContain('还没有可预测的习惯')
  })

  it('有启用习惯时渲染健康度与连续预测', async () => {
    mockHabits.value = [
      {
        id: 'h1', title: '晨跑', icon: '🏃', enabled: true, streak: 3,
        bestStreak: 5, frequency: 'daily', createdAt: '2026-01-01',
        completedDates: ['2026-09-08', '2026-09-07', '2026-09-06'],
        targetDays: 7, autoCheckInOnFocus: false, area: 'body', difficulty: 'normal',
      },
    ]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.hpp-card').length).toBe(1)
    expect(wrapper.text()).toContain('🔥 连续预测')
    expect(wrapper.text()).toContain('✅ 完成率预测')
    expect(wrapper.text()).toContain('晨跑')
  })
})

// =============================================================
// 集成：挑战顾问面板（INCR-231：补挂载孤儿面板 ChallengeAdvisorPanel）
// =============================================================

describe('集成：挑战顾问面板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHabits.value = []
  })

  async function switchToChallenges(wrapper: any) {
    const tab = wrapper.findAll('.dw-tab').find((t: any) => t.text().includes('挑战赛'))
    expect(tab).toBeTruthy()
    await tab.trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('仅在挑战赛标签页渲染面板骨架', async () => {
    const wrapper = await getWrapper()
    // 默认在今日打卡页，不应渲染
    expect(wrapper.find('.cap').exists()).toBe(false)
    await switchToChallenges(wrapper)
    expect(wrapper.find('.cap').exists()).toBe(true)
    expect(wrapper.text()).toContain('🧭 挑战顾问')
  })

  it('无习惯时渲染空白画像与推荐列表', async () => {
    const wrapper = await getWrapper()
    await switchToChallenges(wrapper)
    expect(wrapper.find('.cap-profile').exists()).toBe(true)
    expect(wrapper.find('.cap-level-sub').text()).toContain('0 个活跃习惯')
    // 推荐区始终渲染（可给出自适应候选）
    expect(wrapper.find('.cap-block').exists()).toBe(true)
  })

  it('有启用习惯时渲染画像概览与推荐卡片', async () => {
    mockHabits.value = [
      {
        id: 'h1', title: '晨跑', icon: '🏃', description: '晨间跑步', difficulty: 'medium',
        frequency: 'daily', target: 1, streak: 8, bestStreak: 12, totalCompleted: 40,
        enabled: true, createdAt: '2026-01-01', completedDates: ['2026-09-08', '2026-09-07'],
      },
      {
        id: 'h2', title: '阅读', icon: '📖', description: '每日读书', difficulty: 'easy',
        frequency: 'daily', target: 1, streak: 5, bestStreak: 7, totalCompleted: 30,
        enabled: true, createdAt: '2026-01-01', completedDates: ['2026-09-06'],
      },
    ]
    const wrapper = await getWrapper()
    await switchToChallenges(wrapper)
    expect(wrapper.find('.cap-level-sub').text()).toContain('2 个活跃习惯')
    expect(wrapper.find('.cap-profile-stats').exists()).toBe(true)
    expect(wrapper.find('.cap-diff').exists()).toBe(true)
    expect(wrapper.findAll('.cap-rec').length).toBeGreaterThan(0)
  })

  it('采纳推荐时调用 createChallenge 并传入推荐字段', async () => {
    mockHabits.value = [
      {
        id: 'h1', title: '晨跑', icon: '🏃', description: '晨间跑步', difficulty: 'medium',
        frequency: 'daily', target: 1, streak: 8, bestStreak: 12, totalCompleted: 40,
        enabled: true, createdAt: '2026-01-01', completedDates: ['2026-09-08', '2026-09-07'],
      },
    ]
    const wrapper = await getWrapper()
    await switchToChallenges(wrapper)
    const recCards = wrapper.findAll('.cap-rec')
    expect(recCards.length).toBeGreaterThan(0)
    await recCards[0].find('.cap-btn').trigger('click')
    await wrapper.vm.$nextTick()
    expect(mockCreateChallenge).toHaveBeenCalledTimes(1)
    const [title, description, duration, habitIds] = mockCreateChallenge.mock.calls[0]
    expect(typeof title).toBe('string')
    expect(typeof description).toBe('string')
    expect(typeof duration).toBe('number')
    expect(Array.isArray(habitIds)).toBe(true)
  })
})

// =============================================================
// 集成：四象限任务看板（INCR-318：补挂载孤儿面板 QuadrantBoardPanel → 任务看板 tab）
// =============================================================

describe('集成：四象限任务看板', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBoardTasks.value = []
  })

  async function switchToTasks(wrapper: any) {
    const tab = wrapper.findAll('.dw-tab').find((t: any) => t.text().includes('任务看板'))
    expect(tab).toBeTruthy()
    await tab.trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('默认页不渲染看板，切至任务看板后显示面板骨架', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.qbp-archive').exists()).toBe(false)
    await switchToTasks(wrapper)
    expect(wrapper.find('.qbp-archive').exists()).toBe(true)
    expect(wrapper.text()).toContain('🗂️ 四象限看板')
  })

  it('播种任务后按四象限分桶渲染且列统计正确', async () => {
    mockBoardTasks.value = [
      { id: 't1', title: '紧急重要', urgency: true, importance: true, status: 'todo', focusCount: 0, createdAt: '2026-01-01T00:00:00Z' },
      { id: 't2', title: '重要不紧急', urgency: false, importance: true, status: 'adjourn', focusCount: 0, createdAt: '2026-01-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    await switchToTasks(wrapper)
    expect(wrapper.findAll('.qbp-col')).toHaveLength(4)
    expect(wrapper.text()).toContain('要事紧急')
    expect(wrapper.text()).toContain('紧急重要')
    expect(wrapper.text()).toContain('要事从容')
    expect(wrapper.text()).toContain('重要不紧急')
    // 两件任务进入两格，看板总览徽章显示 2 件
    expect(wrapper.text()).toContain('2 件任务')
  })
})

describe('DisciplineWorkshop 连击段位与排行榜（INCR-434）', () => {
  async function switchToStats(wrapper: any) {
    const tab = wrapper.findAll('.dw-tab').find((t: any) => t.text().includes('统计'))
    expect(tab).toBeTruthy()
    await tab!.trigger('click')
    await wrapper.vm.$nextTick()
  }

  const mkStreak = (id: string, name: string, cur: number, longest: number, level: string, toNext: number) => ({
    habitId: id,
    habitName: name,
    currentStreak: cur,
    longestStreak: longest,
    totalCheckins: cur + 3,
    monthlyCheckins: cur,
    weeklyCheckins: 5,
    lastCheckinDate: '2026-10-02',
    streakHistory: [],
    completionRate: 0.8,
    level,
    daysToNextLevel: toNext,
  })

  it('有连击记录 → 渲染排行榜（段位标签 + 当前/最长/距下一级）', async () => {
    mockStreaks.value = [
      mkStreak('h1', '晨间阅读', 25, 40, 'gold', 41),
      mkStreak('h2', '每日站桩', 8, 12, 'silver', 13),
    ]
    const wrapper = await getWrapper()
    await switchToStats(wrapper)
    expect(wrapper.find('.dw-streak-board').exists()).toBe(true)
    expect(wrapper.findAll('.dw-streak-row')).toHaveLength(2)
    const text = wrapper.text()
    expect(text).toContain('晨间阅读')
    expect(text).toContain('黄金')
    expect(text).toContain('白银')
    expect(text).toContain('距下一级')
    // 段位阶梯 6 级全渲染
    expect(wrapper.findAll('.dw-ladder-step')).toHaveLength(6)
  })

  it('最高段位（传说）→ 显示「已达最高段位」而非距下一级', async () => {
    mockStreaks.value = [mkStreak('h3', '十年日记', 400, 400, 'legendary', 0)]
    const wrapper = await getWrapper()
    await switchToStats(wrapper)
    expect(wrapper.text()).toContain('十年日记')
    expect(wrapper.text()).toContain('传说')
    expect(wrapper.text()).toContain('已达最高段位')
  })

  it('无连击记录 → 排行榜不渲染', async () => {
    mockStreaks.value = []
    const wrapper = await getWrapper()
    await switchToStats(wrapper)
    expect(wrapper.find('.dw-streak-board').exists()).toBe(false)
  })
})

// =============================================================
// 集成：每日仪式面板（INCR-441：补挂载 DailyRitualPanel → 每日仪式 tab）+ 健康度建议接入
// =============================================================

describe('集成：每日仪式 + 健康度建议（INCR-441）', () => {
  async function switchToRituals(wrapper: any) {
    const tab = wrapper.findAll('.dw-tab').find((t: any) => t.text().includes('每日仪式'))
    expect(tab).toBeTruthy()
    await tab!.trigger('click')
    await wrapper.vm.$nextTick()
  }

  async function switchToStats(wrapper: any) {
    const tab = wrapper.findAll('.dw-tab').find((t: any) => t.text().includes('统计'))
    expect(tab).toBeTruthy()
    await tab!.trigger('click')
    await wrapper.vm.$nextTick()
  }

  it('标签导航包含每日仪式', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findAll('.dw-tab').some((t: any) => t.text().includes('每日仪式'))).toBe(true)
  })

  it('默认页不渲染面板，切至每日仪式后显示 DailyRitualPanel', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('[data-test="daily-ritual-panel"]').exists()).toBe(false)
    await switchToRituals(wrapper)
    expect(wrapper.find('[data-test="daily-ritual-panel"]').exists()).toBe(true)
  })

  it('统计页渲染健康度评估标签与建议（接入桥引擎 suggestions，替换原视图侧自算阈值）', async () => {
    const wrapper = await getWrapper()
    await switchToStats(wrapper)
    expect(wrapper.text()).toContain('自律大师')
    expect(wrapper.text()).toContain('继续保持，你已经是自律的榜样')
    expect(wrapper.find('.health-suggestions').exists()).toBe(true)
  })
})