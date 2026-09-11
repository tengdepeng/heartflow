// ============================================================
// 心流 Home 视图测试
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => store,
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

const mockPush = vi.fn()

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useRoute: () => ({ path: '/' }),
}))

// ---- 模拟 constitution bridge ----
vi.mock('../../resonance/bridges/constitution', () => ({
  useConstitution: () => ({
    getRandomMantra: () => ({ text: '测试箴言', source: '测试' }),
  }),
}))

// ---- 模拟 config bridge (返回 reactive 风格，config 已自动解包) ----
const mockConfigValue = {
  background: { type: 'none' as const, image: '', video: '', overlayEnabled: true, overlayMode: 'minimal' as const, blur: 0, brightness: 100 },
  gestures: { enabled: false, bindings: {} as Record<string, string>, sampleInterval: 50, longPressThreshold: 1500, minMoveDistance: 10 },
  display: { uploadImageMaxBytes: 2 * 1024 * 1024, uploadVideoMaxBytes: 4 * 1024 * 1024, trendNoteCount: 20, titleTruncateLength: 8, excerptTruncateLength: 80, tagDisplayCount: 2, statsWindowDays: 30, searchResultLimit: 10, dreamStorageLimit: 100, cleanupThresholdDays: 30, moveTrajectoryCount: 20, healthRecentSleepCount: 14, healthRecentExerciseCount: 30, healthRecentMealCount: 5, noteMaxLength: 100 },
  tags: { categories: [] },
  notifications: { native: true, focusComplete: true, advisorGreet: true },
  touchpoints: {
    lockScreenGlow: { enabled: false, color: '#d4a574', intensity: 50 },
    greetingFloating: { enabled: false, size: 'medium' as const, position: 'bottom-right' as const },
    overlay: { mode: 'minimal' as const },
  },
  complianceOverride: {
    forbiddenPatterns: false,
    notificationBlocked: true,
    advisorEnabled: false,
    comparativePhrases: false,
    personification: false,
    autoStartOverwrite: false,
    hapticFeedbackOverwrite: false,
    dataDriven: false,
  },
}

vi.mock('../../resonance/bridges/config', () => ({
  useConfig: () => ({
    config: mockConfigValue,
    updateGestureBinding: vi.fn(),
  }),
}))

// ---- 模拟 timer bridge ----
const mockTimer = {
  session: ref({ plannedDuration: 0, startedAt: '', elapsed: 0, status: 'idle' as const }),
  elapsed: ref(0),
  isRunning: ref(false),
  progress: ref(0),
  display: ref('00:00'),
  isFocusing: ref(false),
  isPaused: ref(false),
  todayCompletedCount: 0,
  isCompleted: ref(false),
  isIdle: ref(true),
  remainingSeconds: ref(0),
  start: vi.fn(),
  pause: vi.fn(),
  reset: vi.fn(),
  finish: vi.fn(),
  setMode: vi.fn(),
}

vi.mock('../../resonance/bridges/timer', () => ({
  useTimer: () => mockTimer,
}))

// ---- 模拟 advisor bridge ----
vi.mock('../../resonance/bridges/advisor', () => ({
  useAdvisor: () => ({
    onFocusComplete: vi.fn(),
    resetDaily: vi.fn(),
    checkReturn: vi.fn(),
    onVisit: vi.fn(),
  }),
}))

// ---- 模拟 runtime bridge ----
vi.mock('../../resonance/bridges/runtime', () => ({
  useRuntimeState: () => ({
    isSanctuaryActive: ref(false),
    enterSanctuary: vi.fn(),
    exitSanctuary: vi.fn(),
  }),
}))

// ---- 模拟 emotion bridge ----
vi.mock('../../resonance/bridges/emotion', () => ({
  useEmotion: () => ({
    records: ref([]),
    load: vi.fn(),
  }),
}))

// ---- 模拟 anchor bridge ----
vi.mock('../../resonance/bridges/anchor', () => ({
  useAnchorBridge: () => ({
    todayAnchors: ref([]),
    load: vi.fn(),
  }),
}))

// ---- 模拟 composables ----
vi.mock('../../composables/useGesture', () => ({
  useGesture: () => ({ attach: vi.fn(), detach: vi.fn() }),
}))

vi.mock('../../modules/gesture/dispatcher', () => ({
  createGestureDispatcher: () => vi.fn(),
}))

vi.mock('../../modules/gesture/actionMap', () => ({
  createCoreGestureActionMap: () => ({}),
}))

// ---- 模拟 storage ----
vi.mock('../../engine/storage', () => ({
  storage: {
    getSessions: () => [],
    getAnchors: () => [],
    getNotes: () => [],
    getEmotions: () => [],
    getPluginRegistry: () => ({}),
    getConstitution: () => null,
    getCrystals: () => [],
    getCarriers: () => [],
    getConfig: () => ({
      background: { type: 'none' as const, image: '', video: '', overlayEnabled: true, overlayMode: 'minimal' as const, blur: 0, brightness: 100 },
      gestures: { enabled: false, bindings: {} as Record<string, string> },
      tags: { categories: [] },
      notifications: { native: true, focusComplete: true, advisorGreet: true },
      touchpoints: {
        lockScreenGlow: { enabled: false, color: '#d4a574', intensity: 50 },
        greetingFloating: { enabled: false, size: 'medium' as const, position: 'bottom-right' as const },
        overlay: { mode: 'minimal' as const },
      },
      complianceOverride: {
        forbiddenPatterns: false,
        advisorEnabled: false,
        comparativePhrases: false,
        personification: false,
        autoStartOverwrite: false,
        hapticFeedbackOverwrite: false,
        dataDriven: false,
      },
    }),
  },
}))

// 静态组件 mock
vi.mock('../../components/CanvasParticles.vue', () => ({
  default: { template: '<div class="mock-particles" />' },
}))
vi.mock('../../modules/canvas/CanvasRoom.vue', () => ({
  default: { template: '<div class="mock-canvas-room" />' },
}))
vi.mock('../../components/FocusStats.vue', () => ({
  default: {
    name: 'FocusStats',
    props: { sessions: Number, currentDuration: Number, progress: Number },
    template: '<div class="mock-focus-stats" />',
  },
}))
vi.mock('../../components/JadeBead.vue', () => ({
  default: { template: '<div class="mock-jade-bead" />' },
}))
vi.mock('../../components/TimerControls.vue', () => ({
  default: { template: '<div class="mock-timer-controls" />' },
}))
vi.mock('../../components/MirrorSelf.vue', () => ({
  default: { template: '<div class="mock-mirror-self" />' },
}))
vi.mock('../../components/HomeBackgroundMedia.vue', () => ({
  default: { template: '<div class="mock-background-media" />' },
}))

async function createWrapper() {
  const { default: Home } = await import('../Home.vue')
  const wrapper = mount(Home, {
    global: {},
  })
  await flushPromises()
  await wrapper.vm.$nextTick()
  return wrapper
}

describe('Home 心流视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染心流标题', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('引力场')
    expect(wrapper.text()).toContain('让今天先安静落下来')
  })

  // 极简契约：Home 首屏不再渲染房间卡片网格（房间导航唯一入口已下沉到侧栏，
  // home-rail 于 2026-08-22 删除）。此断言锁定该设计，防止把房间网格重新加回首屏。
  it('首屏保持极简：不渲染房间卡片网格', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.find('.room-card').exists()).toBe(false)
  })

  it('渲染统计卡片区域', async () => {
    const wrapper = await createWrapper()
    const stats = wrapper.findAll('.hero-stat-card')
    expect(stats.length).toBe(3)
  })

  it('统计卡片显示今日专注', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('今日专注')
  })

  it('统计卡片显示逐日心锚', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('逐日心锚')
  })

  it('统计卡片显示花房记录', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('花房记录')
  })


  it('渲染宪法箴言', async () => {
    const wrapper = await createWrapper()
    expect(wrapper.text()).toContain('测试箴言')
  })

  it('渲染计时器区域', async () => {
    const wrapper = await createWrapper()
    const timer = wrapper.findAll('.focus-orb')
    expect(timer.length).toBeGreaterThan(0)
  })

  // ==========================================================
  // 集成：专注小结胶囊 FocusStats（INCR-233 补挂载孤儿组件）
  // ==========================================================
  describe('集成：专注小结胶囊 FocusStats', () => {
    // 拉取 mockTimer 并设值：todayCompletedCount 为非响应式 number，progress/remainingSeconds 为 ref
    it('挂载 FocusStats 胶囊，接收今日沉淀/本轮流动/脉动进度 props', async () => {
      const { useTimer } = await import('../../resonance/bridges/timer')
      const mockT: any = useTimer()
      mockT.todayCompletedCount = 7
      mockT.progress.value = 0.5
      mockT.session.value = { plannedDuration: 25 * 60 * 1000, startedAt: '', elapsed: 0, status: 'running' as const }
      mockT.remainingSeconds.value = 15 * 60 + 12 // 已过 9 分 48 秒

      const wrapper = await createWrapper()
      const fs = wrapper.findComponent({ name: 'FocusStats' })
      expect(fs.exists()).toBe(true)
      expect(fs.props('sessions')).toBe(7)
      // 1500 - 912 = 588s → 09:48
      expect(fs.props('currentDuration')).toBe(9 * 60 + 48)
      expect(fs.props('progress')).toBeCloseTo(0.5, 5)
    })

    it('本轮流动秒数 = 总时长 - 剩余（plannedDuration/1000 - remainingSeconds）', async () => {
      const { useTimer } = await import('../../resonance/bridges/timer')
      const mockT: any = useTimer()
      mockT.session.value = { plannedDuration: 60 * 60 * 1000, startedAt: '', elapsed: 0, status: 'running' as const }
      mockT.remainingSeconds.value = 1000

      const wrapper = await createWrapper()
      const fs = wrapper.findComponent({ name: 'FocusStats' })
      // 3600 - 1000 = 2600s
      expect(fs.props('currentDuration')).toBe(2600)
    })

    it('剩余未超总时长时本轮流动不为负（idle 兜底为 0）', async () => {
      const { useTimer } = await import('../../resonance/bridges/timer')
      const mockT: any = useTimer()
      mockT.todayCompletedCount = 0
      mockT.progress.value = 0
      mockT.session.value = { plannedDuration: 0, startedAt: '', elapsed: 0, status: 'idle' as const }
      mockT.remainingSeconds.value = 0

      const wrapper = await createWrapper()
      const fs = wrapper.findComponent({ name: 'FocusStats' })
      expect(fs.props('sessions')).toBe(0)
      expect(fs.props('currentDuration')).toBe(0)
      expect(fs.props('progress')).toBe(0)
    })
  })
})