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