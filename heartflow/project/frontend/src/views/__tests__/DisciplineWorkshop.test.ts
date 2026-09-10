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

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 workshop-bridge 模块 ----
const mockHabits = ref<any[]>([])
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
    streaks: ref([]),
    habits: mockHabits,
    completeHabit: vi.fn(),
    createHabitFromTemplate: vi.fn(),
    createChallengeFromTemplate: vi.fn(),
  }),
  getHabitTemplatesByCategory: () => [],
  getChallengeTemplatesByDifficulty: () => [],
}))

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