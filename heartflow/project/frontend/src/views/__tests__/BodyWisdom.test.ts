// ============================================================
// BodyWisdom 视图测试 - 藏象阁
// ============================================================
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

// ---- 模拟 health store ----
const mockBodyLogs = ref<any[]>([])
const mockMeridianLogs = ref<any[]>([])
const mockWisdomLogs = ref<any[]>([])
const mockReadingLogs = ref<any[]>([])
const mockBodyNotes = ref<string[]>([])
const mockSenseNotes = ref<string[]>([])
const mockSutraNotes = ref<string[]>([])

const mockGetMeridianFeeling = vi.fn((_hour: number) => undefined)
const mockRecordMeridianFeeling = vi.fn()
const mockAddWisdomLog = vi.fn()
const mockAddReadingLog = vi.fn()
const mockPersistReadingLogs = vi.fn()
const mockAddBodyNote = vi.fn()
const mockAddSenseNote = vi.fn()
const mockAddSutraNote = vi.fn()

vi.mock('../../stores/health', () => ({
  useHealthStore: () => ({
    bodyLogs: mockBodyLogs,
    meridianLogs: mockMeridianLogs,
    wisdomLogs: mockWisdomLogs,
    readingLogs: mockReadingLogs,
    bodyNotes: mockBodyNotes,
    senseNotes: mockSenseNotes,
    sutraNotes: mockSutraNotes,
    getMeridianFeeling: (h: number) => mockGetMeridianFeeling(h),
    recordMeridianFeeling: (...args: any[]) => mockRecordMeridianFeeling(...args),
    addWisdomLog: (...args: any[]) => mockAddWisdomLog(...args),
    addReadingLog: (...args: any[]) => mockAddReadingLog(...args),
    persistReadingLogs: () => mockPersistReadingLogs(),
    addBodyNote: (n: string) => mockAddBodyNote(n),
    addSenseNote: (n: string) => mockAddSenseNote(n),
    addSutraNote: (n: string) => mockAddSutraNote(n),
  }),
}))

// ---- 模拟 pinia storeToRefs ----
vi.mock('pinia', () => {
  const actual = vi.importActual('pinia')
  return {
    ...actual,
    storeToRefs: (store: any) => {
      const result: Record<string, any> = {}
      for (const key of Object.keys(store)) {
        const val = store[key]
        if (val && typeof val === 'object' && 'value' in val) {
          result[key] = val
        }
      }
      return result
    },
  }
})

// ConstitutionPanel 依赖 storage（hf:body_wisdom_constitution），补 mock 隔离（INCR-208）
vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: vi.fn((key: string, fallback?: any) => {
      const store: Record<string, any> = {
        'hf:body_wisdom_constitution': null,
        'hf:body_wisdom_meridians': [],
        'hf:body_wisdom_moods': [],
      }
      return store[key] ?? fallback
    }),
    setKV: vi.fn(),
    getConfig: () => ({
      display: { trendNoteCount: 20, titleTruncateLength: 8, excerptTruncateLength: 80, tagDisplayCount: 2, statsWindowDays: 30, searchResultLimit: 10, dreamStorageLimit: 100, cleanupThresholdDays: 30, moveTrajectoryCount: 20, healthRecentSleepCount: 14, healthRecentExerciseCount: 30, healthRecentMealCount: 5, noteMaxLength: 100, uploadImageMaxBytes: 5242880, uploadVideoMaxBytes: 104857600 },
      health: { exerciseTarget: 150, sleepTarget: 7, sleepMinThreshold: 6, sleepCriticalThreshold: 5, sleepExcellentThreshold: 7.5 },
      worklog: { overtimeRate: 1.5, nightRate: 1.3, defaultStart: '09:00', defaultEnd: '18:00', trendDays: 30, trendMonths: 6, recentShiftLimit: 15 },
    }),
    setConfig: vi.fn(),
  },
}))

async function getWrapper() {
  const { default: BodyWisdom } = await import('../BodyWisdom.vue')
  return mount(BodyWisdom, {
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
      },
    },
  })
}

describe('BodyWisdom 藏象阁', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs.value = []
    mockMeridianLogs.value = []
    mockWisdomLogs.value = []
    mockReadingLogs.value = []
    mockBodyNotes.value = []
    mockSenseNotes.value = []
    mockSutraNotes.value = []
    mockGetMeridianFeeling.mockReturnValue(undefined)
  })

  it('渲染标题', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('藏象阁')
    expect(wrapper.text()).toContain('身体是智慧的殿堂')
  })

  it('显示概览统计', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('经络记录')
    expect(wrapper.text()).toContain('心境记录')
    expect(wrapper.text()).toContain('阅读记录')
  })

  it('显示三个标签页', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.bw-tab')
    expect(tabs.length).toBe(3)
    expect(tabs[0].text()).toContain('身体层')
    expect(tabs[1].text()).toContain('感知层')
    expect(tabs[2].text()).toContain('护持层')
  })

  it('默认显示身体层标签', async () => {
    const wrapper = await getWrapper()
    const firstTab = wrapper.find('.bw-tab.active')
    expect(firstTab.exists()).toBe(true)
    expect(firstTab.text()).toContain('身体层')
  })

  it('身体层显示子午流注钟与被动意象', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('子午流注钟')
    expect(wrapper.text()).toContain('被动意象')
  })

  it('点击标签可切换内容', async () => {
    const wrapper = await getWrapper()
    const tabs = wrapper.findAll('.bw-tab')
    await tabs[1].trigger('click')
    expect(wrapper.text()).toContain('问境角落')
    await tabs[2].trigger('click')
    expect(wrapper.text()).toContain('藏经角落')
  })

  it('身体层显示经络记录概览为 0', async () => {
    const wrapper = await getWrapper()
    const nums = wrapper.findAll('.bw-overview-num')
    expect(nums[0].text()).toBe('0')
  })

  it('有经络记录时显示概览数字', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockMeridianLogs.value = [
      { hour: 1, feeling: 'good', at: '2026-09-01T06:00:00.000Z', date: today },
      { hour: 3, feeling: 'ok', at: '2026-09-01T08:00:00.000Z', date: today },
    ]
    const wrapper = await getWrapper()
    const nums = wrapper.findAll('.bw-overview-num')
    expect(nums[0].text()).toBe('2')
  })

  it('身体层渲染经络自检面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.meridian-check').exists()).toBe(true)
    expect(wrapper.text()).toContain('经络自检')
    expect(wrapper.text()).toContain('藏象体检')
  })

  it('经络自检面板展示记录数量与自检按钮', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockMeridianLogs.value = [
      { hour: 1, feeling: 'bad', at: '2026-09-01T06:00:00.000Z', date: today },
      { hour: 3, feeling: 'good', at: '2026-09-01T08:00:00.000Z', date: today },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已积累 2 条经络感受记录')
    const btn = wrapper.find('.mc-btn')
    expect(btn.exists()).toBe(true)
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('身体层渲染经络可视化面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.mvp').exists()).toBe(true)
    expect(wrapper.text()).toContain('经络可视化')
  })

  it('身体层渲染健康分析体检单面板', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.health-analysis').exists()).toBe(true)
    expect(wrapper.text()).toContain('健康分析 · 藏象体检单')
  })

  it('健康分析面板展示已采集数据统计', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockMeridianLogs.value = [
      { hour: 1, feeling: 'bad', at: '2026-09-01T06:00:00.000Z', date: today },
      { hour: 3, feeling: 'good', at: '2026-09-01T08:00:00.000Z', date: today },
    ]
    mockWisdomLogs.value = [
      { id: 'w1', content: '今日心绪', at: '2026-09-01T09:00:00.000Z', mood: 'calm', insight: '平稳' },
      { id: 'w2', content: '有点焦虑', at: '2026-09-02T09:00:00.000Z', mood: 'anxious' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('已采集')
    expect(wrapper.text()).toContain('经络 2')
    expect(wrapper.text()).toContain('情绪 2')
  })

  it('经络可视化面板展示概览统计', async () => {
    const today = new Date().toISOString().slice(0, 10)
    mockMeridianLogs.value = [
      { hour: 1, feeling: 'good', at: '2026-09-01T06:00:00.000Z', date: today },
      { hour: 3, feeling: 'ok', at: '2026-09-01T08:00:00.000Z', date: today },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('经络健康概览')
    expect(wrapper.text()).toContain('2')
    expect(wrapper.text()).toContain('良好率')
  })
})

// ============================================================
// 集成：体质画像问卷面板（INCR-208：补挂载孤儿面板 ConstitutionPanel）
// ============================================================

describe('集成：体质画像问卷面板', () => {
  it('渲染问卷模式含九组体质问题与进度', async () => {
    const wrapper = await getWrapper()
    const panel = wrapper.find('.cp')
    expect(panel.exists()).toBe(true)
    expect(wrapper.text()).toContain('体质画像')
    // 9 组体质问题
    expect(wrapper.findAll('.cp-group').length).toBe(9)
    expect(wrapper.text()).toContain('平和质')
    // 进度 + 提交按钮
    expect(wrapper.text()).toContain('已完成')
    const submitBtn = wrapper.find('.cp-submit')
    expect(submitBtn.exists()).toBe(true)
    expect(submitBtn.attributes('disabled')).toBeDefined()
  })

  it('全部作答后提交生成体质画像结果', async () => {
    const wrapper = await getWrapper()
    // 每题选第一个选项
    const opts = wrapper.findAll('.cp-opt')
    expect(opts.length).toBeGreaterThan(0)
    for (const opt of opts) {
      await opt.trigger('click')
    }
    // 进度满 + 提交按钮可用
    const submitBtn = wrapper.find('.cp-submit')
    expect(submitBtn.attributes('disabled')).toBeUndefined()
    await submitBtn.trigger('click')
    // 结果模式：雷达图 + 主体质
    expect(wrapper.find('.cp-radar').exists()).toBe(true)
    expect(wrapper.find('.cp-primary').exists()).toBe(true)
    expect(wrapper.text()).toContain('主体质')
  })
})

// =============================================================
// 集成：经络穴位典籍（INCR-217：补挂载孤儿面板 TcmPanel）
// =============================================================

describe('集成：经络穴位典籍', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs.value = []
    mockMeridianLogs.value = []
    mockWisdomLogs.value = []
    mockReadingLogs.value = []
  })

  it('渲染经络穴位典籍面板（零 props 自包含直读 tcm 引擎）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.tcp-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('经络穴位典籍')
    expect(wrapper.text()).toContain('子午流注')
  })

  it('展示子午流注钟、温和洞察与经络列表', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.tcp-clock').exists()).toBe(true)
    expect(wrapper.find('.tcp-insights').exists()).toBe(true)
    expect(wrapper.findAll('.tcp-meridian').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('经络（')
  })

  it('穴位检索筛选并可点选查看详情', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.tcp-input').setValue('太冲')
    // 期望命中至少一个穴位
    const results = wrapper.findAll('.tcp-result')
    expect(results.length).toBeGreaterThan(0)
    await results[0].trigger('click')
    expect(wrapper.find('.tcp-detail').exists()).toBe(true)
    expect(wrapper.find('.tcp-detail-name').exists()).toBe(true)
  })

  it('无匹配穴位时展示空态提示', async () => {
    const wrapper = await getWrapper()
    await wrapper.find('.tcp-input').setValue('zzzzzz')
    expect(wrapper.text()).toContain('没有匹配的穴位')
  })

  it('可收藏穴位并计入「我的收藏」', async () => {
    const wrapper = await getWrapper()
    // 先点选一个穴位打开详情（收藏按钮在详情区）
    const firstResult = wrapper.find('.tcp-result')
    expect(firstResult.exists()).toBe(true)
    await firstResult.trigger('click')
    expect(wrapper.find('.tcp-fav').exists()).toBe(true)
    // 详情收藏按钮默认未收藏 → 点击收藏
    expect(wrapper.find('.tcp-fav').text()).toContain('♡ 收藏')
    await wrapper.find('.tcp-fav').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.tcp-favs').text()).toContain('我的收藏（1）')
  })
})

// =============================================================
// 集成：指标趋势档案（INCR-219：补挂载孤儿面板 MetricTrendsPanel）
// =============================================================

describe('集成：指标趋势档案', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs.value = []
    mockMeridianLogs.value = []
    mockWisdomLogs.value = []
    mockReadingLogs.value = []
  })

  function seedLogs() {
    mockBodyLogs.value = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      mockBodyLogs.value.push({ id: `s_${i}`, type: 'sleep', value: { hours: 7.5 }, at: `${dateStr}T22:00:00` })
      mockBodyLogs.value.push({ id: `e_${i}`, type: 'exercise', value: { minutes: 30 }, at: `${dateStr}T08:00:00` })
    }
  }

  it('渲染指标趋势档案面板（薄委托化 props 直传 health.bodyLogs）', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.find('.mtp').exists()).toBe(true)
    expect(wrapper.text()).toContain('指标趋势档案')
    expect(wrapper.text()).toContain('趋势还没生成')
  })

  it('有足够健康记录时渲染整体评估与趋势卡片', async () => {
    seedLogs()
    const wrapper = await getWrapper()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.mtp-assessment').exists()).toBe(true)
    const labels = wrapper.findAll('.mtp-trend-label').map((t) => t.text())
    expect(labels.some((t) => t.includes('睡眠'))).toBe(true)
    expect(labels.some((t) => t.includes('运动'))).toBe(true)
  })
})

// =============================================================
// 集成：经书注解（INCR-249：补挂载孤儿面板 SutraAnnotationPanel）
// 引擎 useSutraAnnotations 为 storage 读取/保存的本地 ref，每次 use 独立实例、
// 无模块级污染；storage.getKV 对注解键回退空数组，故渲染用例互不干扰，走 UI 交互流
// =============================================================

describe('集成：经书注解', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBodyLogs.value = []
    mockMeridianLogs.value = []
    mockWisdomLogs.value = []
    mockReadingLogs.value = []
  })

  async function openSutraTab() {
    const wrapper = await getWrapper()
    await wrapper.findAll('.bw-tab')[2].trigger('click')
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('切到护持层渲染经书注解面板骨架、标题与统计', async () => {
    const wrapper = await openSutraTab()
    expect(wrapper.find('.sap-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('经书注解')
    expect(wrapper.text()).toContain('注解统计')
    expect(wrapper.text()).toContain('冥想引导')
    expect(wrapper.find('.sap-save').exists()).toBe(true)
  })

  it('空态显示暂无注解', async () => {
    const wrapper = await openSutraTab()
    expect(wrapper.find('.sap-empty').text()).toContain('暂无注解')
  })

  it('添加注解后出现注解卡片、统计更新并可消化', async () => {
    const wrapper = await openSutraTab()
    await wrapper.find('.sap-input[aria-label="注解位置"]').setValue('第一章·第二段')
    const textarea = wrapper.find('.sap-textarea')
    await textarea.setValue('学而时习之，不亦说乎。')
    await wrapper.find('.sap-save').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.sap-ann').length).toBe(1)
    expect(wrapper.text()).toContain('学而时习之，不亦说乎。')
    expect(wrapper.text()).toContain('第一章·第二段')
    // 统计更新：总注解 1
    expect(wrapper.find('.sap-cell b').text()).toBe('1')
  })

  it('消化注解后可标记已消化', async () => {
    const wrapper = await openSutraTab()
    await wrapper.find('.sap-textarea').setValue('温故而知新。')
    await wrapper.find('.sap-save').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sap-digest').exists()).toBe(true)
    await wrapper.find('.sap-digest').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sap-ann--digested').exists()).toBe(true)
    expect(wrapper.text()).toContain('已消化')
  })

  it('创建冥想引导后展示引导卡片与步骤', async () => {
    const wrapper = await openSutraTab()
    // 引导区块内的输入
    const guides = wrapper.findAll('.sap-block')
    const guideBlock = guides[guides.length - 1]
    await guideBlock.find('.sap-input--wide').setValue('静坐观息引导')
    // 默认已有 1 步，给默认步骤填指令
    await guideBlock.find('.sap-step .sap-input--wide').setValue('自然呼吸，观照鼻端')
    await guideBlock.find('.sap-save').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.sap-guide').length).toBe(1)
    expect(wrapper.text()).toContain('静坐观息引导')
  })
})