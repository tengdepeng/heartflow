// ============================================================
// views 今日桶 · 时区判别力测试（TZ 日键治理 INCR-466 · 日键第三批 A1）
//
// 覆盖 DisciplineWorkshop「今日打卡」判定：验证边界键「今天」已按本地日历日，
// 而非 UTC 切日。核心场景 = 本地 00:00–08:00 的记录其 UTC 日期早一天。
// 假时刻钉在本地 2026-03-15 10:00（月中，避开跨月/跨年算术）。
// ============================================================

const ORIGINAL_TZ = process.env.TZ
process.env.TZ = 'Asia/Shanghai'

import { describe, expect, it, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

vi.mock('../../components/MeditationStudio.vue', () => ({
  default: { template: '<div data-test="meditation-studio" />' },
}))
vi.mock('../../components/discipline/DailyRitualPanel.vue', () => ({
  default: { template: '<div data-test="daily-ritual-panel" />' },
}))
vi.mock('../../composables/useViewEntrance', () => ({
  useViewEntrance: () => ({ entranceRef: ref(null), entranceClass: ref('') }),
}))

const mockHabits = ref<any[]>([])
const mockFailures = ref<any[]>([])
const mockStreaks = ref<any[]>([])
const mockRituals = ref<any[]>([])

vi.mock('../../modules/discipline/workshop-bridge', () => ({
  useDisciplineBridge: () => ({
    init: vi.fn(),
    getStats: () => ({ activeHabits: 1, unlockedBadges: 0, totalPoints: 0 }),
    getHabitHealthScore: () => 85,
    getTodayHabits: () => mockHabits.value,
    getActiveChallenges: () => [],
    badges: ref([]),
    HABIT_TEMPLATES: [],
    CHALLENGE_TEMPLATES: [],
    streaks: mockStreaks,
    habits: mockHabits,
    getTopStreaks: () => mockStreaks.value,
    failures: mockFailures,
    suggestions: [],
    generateSuggestions: () => [],
    adoptSuggestion: vi.fn(),
    bundles: ref([]),
    BUNDLE_PRESETS: [],
    createBundleFromPreset: vi.fn(),
    completeHabit: vi.fn(),
    createHabitFromTemplate: vi.fn(),
    createChallengeFromTemplate: vi.fn(),
    createChallenge: vi.fn(),
    rituals: mockRituals,
    RITUAL_TEMPLATES: [],
    createRitualFromTemplate: vi.fn(),
    completeRitual: vi.fn(),
    getHabitHealthAssessment: () => ({ score: 85, grade: 'excellent', label: '自律大师', suggestions: [] }),
  }),
  getHabitTemplatesByCategory: () => [],
  getChallengeTemplatesByDifficulty: () => [],
}))

vi.mock('../../modules/tasks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../modules/tasks')>()
  return { ...actual, useTaskManager: () => ({ tasks: ref([]), load: vi.fn() }) }
})

// ---- 固定「现在」= 本地 2026-03-15 03:00（凌晨，落在缺陷窗口内）----
// ⚠️ 基准时刻必须是凌晨：本地 03:00 时 UTC 是 03-14 19:00，两种口径分属不同日期，
//    若基准设在正午（本地与 UTC 同日），两种口径同值 → 断言退化为同值比较而假绿。
const NOW = new Date(2026, 2, 15, 3, 0, 0)
const LOCAL_TODAY = '2026-03-15'
/** 此刻的 UTC 日期 = 03-14（本地 03:00 → UTC 前一天 19:00），正是缺陷窗口 */
const UTC_TODAY = '2026-03-14'
/** 本地 03-15 00:30 的 UTC ISO 串：其 UTC 日期是 03-14（早一天），正是缺陷窗口 */
const LOCAL_EARLY_ISO = new Date(2026, 2, 15, 0, 30, 0).toISOString()

function habit(completedDates: string[]) {
  return {
    id: 'h1', title: '晨跑', icon: '🏃', enabled: true, streak: 3,
    bestStreak: 5, frequency: 'daily', createdAt: '2026-01-01',
    completedDates, targetDays: 7, autoCheckInOnFocus: false, area: 'body',
  }
}

async function getWrapper() {
  const { default: DisciplineWorkshop } = await import('../DisciplineWorkshop.vue')
  return mount(DisciplineWorkshop, { global: { stubs: { Teleport: true, Transition: true } } })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  vi.clearAllMocks()
  mockHabits.value = []
  mockFailures.value = []
  mockStreaks.value = []
  mockRituals.value = []
})
afterEach(() => { vi.useRealTimers() })
afterAll(() => { process.env.TZ = ORIGINAL_TZ })

describe('views 今日桶时区判别力 · DisciplineWorkshop 今日打卡', () => {
  // ---- 前提护栏：本机为 UTC+8，且此刻本地日与 UTC 日分属不同日期（缺陷窗口） ----
  it('前提：本机为 UTC+8，本地 03:00 时 UTC 日历日已是前一天', () => {
    expect(new Date().getTimezoneOffset()).toBe(-480)
    // 此刻（本地 03-15 03:00）的 UTC 日历日 = 03-14 ⇒ 两种口径 today 分属不同日期
    expect(NOW.toISOString().slice(0, 10)).toBe(UTC_TODAY)
    expect(LOCAL_TODAY).not.toBe(UTC_TODAY)
    // 本地 00:30 的记录：UTC 日期早一天，但本地日键是今天
    expect(LOCAL_EARLY_ISO.slice(0, 10)).toBe(UTC_TODAY)
  })

  it('本地今天（2026-03-15）已打卡 → 显示「✓ 已完成」', async () => {
    mockHabits.value = [habit([LOCAL_TODAY])]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('✓ 已完成')
  })

  it('UTC 口径的当天键（此刻 UTC 日 = 03-14）不算本地今日完成 → 不显示「✓ 已完成」', async () => {
    // 此刻本地是 03-15 凌晨、UTC 是 03-14。若边界键仍用 UTC 切日，today 会取到 03-14，
    // 从而把 03-14 的记录误判为「今日完成」；迁到本地日历日后 today=03-15，不应命中。
    mockHabits.value = [habit([UTC_TODAY])]
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).not.toContain('✓ 已完成')
  })

  it('本地 00:30 产生的记录其本地日键为今天（样本前提）', () => {
    const d = new Date(LOCAL_EARLY_ISO)
    const localKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(localKey).toBe(LOCAL_TODAY)
  })
})
