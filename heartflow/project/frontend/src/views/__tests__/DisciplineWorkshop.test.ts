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

// ---- 模拟 useViewEntrance ----
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({
    entranceRef: ref(null),
    entranceClass: ref(''),
  }),
}))

// ---- 模拟 workshop-bridge 模块 ----
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
})