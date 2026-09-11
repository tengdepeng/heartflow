// ============================================================
// BodyGreenhouse 视图测试
// 身体温室：记录睡眠、运动、饮食，支持搜索和周趋势
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref, computed } from 'vue'
import { invalidateCache } from '../../engine/storage/core'
import { storage } from '../../engine/storage'

interface BodyLog { id: string; type: string; value: Record<string, any>; at: string }

const mockLogs: BodyLog[] = [
  { id: 'l1', type: 'sleep', value: { hours: 7 }, at: '2026-07-20T06:00:00.000Z' },
  { id: 'l2', type: 'exercise', value: { minutes: 30, type: '跑步' }, at: '2026-07-21T08:00:00.000Z' },
  { id: 'l3', type: 'meal', value: { note: '沙拉鸡胸肉' }, at: '2026-07-21T12:00:00.000Z' },
  { id: 'l4', type: 'sleep', value: { hours: 6.5 }, at: '2026-07-21T23:00:00.000Z' },
  { id: 'l5', type: 'meal', value: { note: '奶茶' }, at: '2026-07-22T15:00:00.000Z' },
]

function calcExerciseMinutes(logs: BodyLog[]): number {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return logs
    .filter(l => l.type === 'exercise' && new Date(l.at) >= weekStart)
    .reduce((sum, l) => sum + (l.value.minutes || 0), 0)
}

function calcSleepAvg(logs: BodyLog[]): number {
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  const sleepLogs = logs.filter(l => l.type === 'sleep' && new Date(l.at) >= weekStart)
  if (sleepLogs.length === 0) return 0
  return sleepLogs.reduce((sum, l) => sum + (l.value.hours || 0), 0) / sleepLogs.length
}

// ---- 模拟 health store (Pinia 自动解包 ref，返回普通值) ----
let mockBodyLogs: BodyLog[] = [...mockLogs]
const mockCycleData = { lastStart: '', lastDuration: 5, history: [] }
const mockAddBodyLog = vi.fn()
const mockLogCycle = vi.fn()

vi.mock('../../stores/health', () => ({
  useHealthStore: () => ({
    bodyLogs: mockBodyLogs,
    cycleData: mockCycleData,
    addBodyLog: (...args: any[]) => mockAddBodyLog(...args),
    logCycle: (...args: any[]) => mockLogCycle(...args),
    thisWeekExerciseMinutes: calcExerciseMinutes(mockBodyLogs),
    thisWeekSleepAvg: calcSleepAvg(mockBodyLogs),
    persistBodyLogs: vi.fn(),
    persistCycle: vi.fn(),
    $reset: () => {},
  }),
}))

// ---- 模拟 perception store ----
const mockPerceptionEnv = ref({
  hour: 12,
  timeOfDay: 'afternoon' as const,
  isDark: false,
  isOnline: true,
  batteryLevel: 0.85,
  isCharging: false,
  deviceIdleMs: 0,
  isUserIdle: false,
  isLowPower: false,
  activeApp: null,
  activeWindowTitle: null,
  isFocusing: false,
  ambientLight: 500,
  isScreenAwake: true,
  systemTheme: null,
  systemVolume: null,
  healthSummary: null,
  source: 'web' as const,
  lastUpdated: Date.now(),
})

vi.mock('../../stores/perception', () => ({
  usePerceptionStore: () => ({
    environment: mockPerceptionEnv,
    isDark: computed(() => mockPerceptionEnv.value.isDark),
    isLowPower: computed(() => mockPerceptionEnv.value.isLowPower),
    timeOfDay: computed(() => mockPerceptionEnv.value.timeOfDay),
    setEnvironment: vi.fn(),
    patchEnvironment: vi.fn(),
    $reset: () => {},
  }),
}))

// ---- 模拟 pinia ----
vi.mock('pinia', () => ({
  storeToRefs: (store: any) => {
    const result: Record<string, any> = {}
    for (const key of Object.keys(store)) {
      if (key.startsWith('$')) continue
      result[key] = ref(store[key])
    }
    return result
  },
  defineStore: () => () => ({}),
  setActivePinia: () => {},
  createPinia: () => ({}),
}))

async function getWrapper() {
  const { default: BodyGreenhouse } = await import('../BodyGreenhouse.vue')
  return mount(BodyGreenhouse, {
    global: {
      stubs: {
        ChronotypeAnalysisPanel: true,
        HealthGoalsPanel: true,
        HealthRemindersPanel: true,
        HealthReportPanel: { template: '<div class="hrp-stub" />' },
      },
    },
  })
}

// ---- 可控的健康仪表盘（仅覆写 useHealthDashboard，保留 rings 等真实导出供 BodyRingsPanel） ----
const { mockDashboard, mockRouter } = vi.hoisted(() => ({
  mockDashboard: { value: { overallScore: 0, achievementRate: 0, greenhouseHealth: 0, streak: 0, activeGoals: [] as any[] } },
  mockRouter: { push: vi.fn() },
}))
vi.mock('../../modules/body', async () => {
  const actual = await vi.importActual<typeof import('../../modules/body')>('../../modules/body')
  return {
    ...actual,
    useHealthDashboard: () => ({ dashboard: mockDashboard }),
  }
})
vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
  useRoute: () => ({ path: '/body-greenhouse' }),
  RouterLink: { template: '<a><slot/></a>' },
}))

describe('BodyGreenhouse 视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs = [...mockLogs]
    // 默认设为健康状态（联动卡片隐藏）
    mockDashboard.value = { overallScore: 85, achievementRate: 1, greenhouseHealth: 80, streak: 5, activeGoals: [{}] }
    mockRouter.push.mockClear()
  })

  // ---- 渲染 ----

  it('渲染标题"身体温室"', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('身体温室')
  })

  it('渲染统计概览', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('总记录数')
    expect(wrapper.text()).toContain('本周运动')
    expect(wrapper.text()).toContain('平均睡眠')
    expect(wrapper.text()).toContain('饮食记录')
  })

  it('渲染植物卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('睡眠树')
    expect(wrapper.text()).toContain('运动藤')
    expect(wrapper.text()).toContain('饮食园')
    expect(wrapper.text()).toContain('周期花')
  })

  it('有记录时显示近期记录', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('近期记录')
    expect(wrapper.text()).toContain('沙拉鸡胸肉')
  })

  it('无记录时显示空状态', async () => {
    mockBodyLogs = []
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('温室还是空的')
  })

  // ---- 搜索 ----

  it('存在搜索输入框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.gh-search-input').exists()).toBe(true)
  })

  it('搜索过滤记录', async () => {
    const wrapper = await getWrapper()
    const input = wrapper.find('.gh-search-input')
    await input.setValue('沙拉')
    const recentLogs = wrapper.find('.recent-logs')
    expect(recentLogs.text()).toContain('沙拉鸡胸肉')
    expect(recentLogs.text()).not.toContain('跑步')
  })

  // ---- 类型筛选 ----

  it('存在类型筛选下拉框', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.gh-filter-select').exists()).toBe(true)
  })

  it('类型筛选"睡眠"只显示睡眠记录', async () => {
    const wrapper = await getWrapper()
    const select = wrapper.find('.gh-filter-select')
    await select.setValue('sleep')
    const recentLogs = wrapper.find('.recent-logs')
    expect(recentLogs.text()).toContain('睡眠')
    expect(recentLogs.text()).not.toContain('沙拉鸡胸肉')
  })

  // ---- 周趋势图 ----

  it('有记录时显示周趋势图', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('周趋势总览')
  })

  it('周趋势图包含图例', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('睡眠(h)')
    expect(wrapper.text()).toContain('运动(分)')
    expect(wrapper.text()).toContain('饮食(次)')
  })

  // ---- 身体↔情绪 互指（蓝图13:1106） ----
  it('身体疲惫（温室健康<60）时显示互指联动卡片', async () => {
    mockDashboard.value = { overallScore: 50, achievementRate: 0.5, greenhouseHealth: 40, streak: 3, activeGoals: [] }
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.body-emotion-link').exists()).toBe(true)
    expect(wrapper.text()).toContain('去情绪花房')
  })

  it('互指卡片点击导航到 /garden（非侵入、不评判）', async () => {
    mockDashboard.value = { overallScore: 50, achievementRate: 0.5, greenhouseHealth: 40, streak: 3, activeGoals: [] }
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    await wrapper.find('.bel-btn').trigger('click')
    expect(mockRouter.push).toHaveBeenCalledWith('/garden')
  })

  it('身体状态健康时不显示互指卡片', async () => {
    mockDashboard.value = { overallScore: 88, achievementRate: 1, greenhouseHealth: 85, streak: 6, activeGoals: [{}] }
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.body-emotion-link').exists()).toBe(false)
  })

  // ---- 批量收口：作息时段/健康目标/健康提醒面板（INCR-175）----
  it('挂载作息时段分析面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'ChronotypeAnalysisPanel' }).exists()).toBe(true)
  })

  it('挂载健康目标管理面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'HealthGoalsPanel' }).exists()).toBe(true)
  })

  it('挂载健康提醒管理面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.findComponent({ name: 'HealthRemindersPanel' }).exists()).toBe(true)
  })

  it('挂载健康报告档案面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.hrp-stub').exists()).toBe(true)
  })
})

// ============================================================
// WellnessPlanPanel 体质调理方案 · 孤儿组件集成（INCR-257）
// 消费 useWellnessPlan（纯内存引擎）+ setup 顶层读体质画像（hf:body_wisdom_constitution）。
// ============================================================
describe('WellnessPlanPanel 体质调理方案集成', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs = [...mockLogs]
    mockDashboard.value = { overallScore: 85, achievementRate: 1, greenhouseHealth: 80, streak: 5, activeGoals: [{}] }
    // 真实 storage 走 localStorage，清空并失效缓存保证隔离
    localStorage.clear()
    invalidateCache()
  })

  it('渲染体质调理方案面板骨架', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('体质调理方案')
    expect(text).toContain('依体质选一方养法')
    expect(wrapper.findAll('.wp-chip').length).toBe(9)
  })

  it('默认按平和质生成方案，渲染六大建议卡片', async () => {
    const wrapper = await getWrapper()
    const text = wrapper.text()
    expect(text).toContain('饮食建议')
    expect(text).toContain('运动建议')
    expect(text).toContain('作息建议')
    expect(text).toContain('穴位按摩')
    expect(text).toContain('推荐茶饮')
    expect(text).toContain('四季调整')
    expect(text).toContain('保持均衡饮食')
    expect(text).toContain('足三里')
    expect(text).toContain('绿茶')
  })

  it('点击气虚质 chip 切换为对应调理方案', async () => {
    const wrapper = await getWrapper()
    const qiChip = wrapper.findAll('.wp-chip').find(c => c.text().includes('气虚质'))
    expect(qiChip).toBeTruthy()
    await qiChip!.trigger('click')
    await wrapper.vm.$nextTick()
    expect(qiChip!.classes()).toContain('wp-chip-on')
    expect(wrapper.text()).toContain('多食补气食物')
    expect(wrapper.text()).toContain('黄芪茶')
  })

  it('存储已有体质画像时显示预选提示并默认选中', async () => {
    storage.setKV('hf:body_wisdom_constitution', {
      type: 'qi-deficiency',
      label: '气虚质',
      scores: {},
      characteristics: [],
      recommendations: [],
      analyzedAt: new Date().toISOString(),
    })
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已根据你的体质画像，为你预选「气虚质」')
    expect(wrapper.findAll('.wp-chip').find(c => c.classes().includes('wp-chip-on'))!.text()).toContain('气虚质')
  })

  it('体质画像为阴虛质时默认生成滋阴方案', async () => {
    storage.setKV('hf:body_wisdom_constitution', {
      type: 'yin-deficiency',
      label: '阴虚质',
      scores: {},
      characteristics: [],
      recommendations: [],
      analyzedAt: new Date().toISOString(),
    })
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('已根据你的体质画像，为你预选「阴虚质」')
    expect(wrapper.text()).toContain('多食滋阴食物')
    expect(wrapper.text()).toContain('枸杞菊花茶')
  })
})